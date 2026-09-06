package show

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"math"
	"sort"
	"strings"
	"time"

	"github.com/zeebo/xxh3"

	"tgb-resolver/server/features/assets"
	"tgb-resolver/server/features/importing"
	"tgb-resolver/server/features/realtime"
	"tgb-resolver/server/features/shared/domain"
	showv1 "tgb-resolver/server/proto/gen/show/v1"
)

type BlobStore interface {
	Save(id string, data []byte) error
	Read(id string) ([]byte, error)
	Delete(id string) error
}

type Service struct {
	store        *Store
	hub          *realtime.Hub
	clock        *realtime.Clock
	blobs        BlobStore
	orchestrator *realtime.Orchestrator
}

func NewService(store *Store, hub *realtime.Hub, clock *realtime.Clock, blobs BlobStore) *Service {
	s := &Service{store: store, hub: hub, clock: clock, blobs: blobs}
	s.orchestrator = realtime.NewOrchestrator(clock, func() {
		if _, err := s.Advance(context.Background()); err != nil {
			_ = s.RescheduleAdvance(context.Background())
		}
	})
	return s
}

func ensureWritable(st domain.ShowState) error {
	if st.TimelineMode == domain.TimelineRo {
		return fmt.Errorf("timeline is read-only")
	}
	return nil
}

func ensureFiniteOrNull(v *float64, name string) error {
	if v != nil && (math.IsNaN(*v) || math.IsInf(*v, 0)) {
		return fmt.Errorf("%s must be a finite number", name)
	}
	return nil
}

func ordered(timeline []domain.TimelineEvent) []domain.TimelineEvent {
	out := append([]domain.TimelineEvent{}, timeline...)
	sort.Slice(out, func(i, j int) bool { return out[i].Position < out[j].Position })
	return out
}

func indexOf(ord []domain.TimelineEvent, id int) int {
	for i, e := range ord {
		if e.ID == id {
			return i
		}
	}
	return -1
}

func computeActiveEventIDs(ord []domain.TimelineEvent, currentIndex int) []int {
	if currentIndex < 0 || currentIndex >= len(ord) {
		return []int{}
	}
	parent := currentIndex
	for parent > 0 && ord[parent].TriggerOffsetSeconds != nil {
		parent--
	}
	ids := []int{}
	for i := parent; i <= currentIndex; i++ {
		ids = append(ids, ord[i].ID)
	}
	for i := currentIndex + 1; i < len(ord); i++ {
		if ord[i].TriggerOffsetSeconds == nil || *ord[i].TriggerOffsetSeconds != 0 {
			break
		}
		ids = append(ids, ord[i].ID)
	}
	return ids
}

func newID() string {
	var b [16]byte
	_, _ = rand.Read(b[:])
	return hex.EncodeToString(b[:])
}

func xxh3Hex(data []byte) string {
	return fmt.Sprintf("%016X", xxh3.Hash(data))
}

func (s *Service) Snapshot(ctx context.Context) (domain.ShowState, error) {
	return s.store.GetState(ctx)
}

func (s *Service) Clear(ctx context.Context, showVersion int) (domain.ShowState, error) {
	updated, err := s.store.MutateShow(ctx, showVersion, func(st domain.ShowState) domain.ShowState {
		return CreateEmptyShow(st.ShowVersion, domain.ShowSourceManual)
	})
	if err != nil {
		return domain.ShowState{}, err
	}
	s.orchestrator.CancelAdvance()
	s.broadcastReplaced(updated)
	return updated, nil
}

func (s *Service) Optimize(ctx context.Context, showVersion int) (domain.ShowState, error) {
	updated, err := s.store.MutateShow(ctx, showVersion, func(st domain.ShowState) domain.ShowState {
		kept := make([]domain.TimelineEvent, 0, len(st.Timeline))
		for _, e := range st.Timeline {
			if e.Type == domain.TimelineRes || e.Type == domain.TimelinePre || e.Custom != nil {
				kept = append(kept, e)
			}
		}
		for i := range kept {
			kept[i].Position = i + 1
		}
		st.Timeline = kept
		return st
	})
	if err != nil {
		return domain.ShowState{}, err
	}
	s.rearmAdvance(updated)
	s.broadcastReordered(updated)
	return updated, nil
}

func (s *Service) ImportXML(ctx context.Context, xml string, excluded []string) (domain.ShowState, error) {
	cur, err := s.store.GetState(ctx)
	if err != nil {
		return domain.ShowState{}, err
	}
	if err := ensureWritable(cur); err != nil {
		return domain.ShowState{}, err
	}
	next := BuildShowFromXML([]byte(xml), excluded, cur.ShowVersion+1)
	updated, err := s.store.Replace(ctx, next)
	if err != nil {
		return domain.ShowState{}, err
	}
	s.broadcastReplaced(updated)
	return updated, nil
}

func (s *Service) ImportBundle(ctx context.Context, b64 string) (domain.ShowState, error) {
	raw, err := base64.StdEncoding.DecodeString(b64)
	if err != nil {
		return domain.ShowState{}, fmt.Errorf("invalid bundle bytes: %w", err)
	}
	imported, err := assets.Unpack(raw, s.blobs)
	if err != nil {
		return domain.ShowState{}, err
	}
	cur, err := s.store.GetState(ctx)
	if err != nil {
		return domain.ShowState{}, err
	}
	imported.ShowVersion = cur.ShowVersion + 1
	imported.Meta.Source = domain.ShowSourceBundle
	updated, err := s.store.Replace(ctx, imported)
	if err != nil {
		return domain.ShowState{}, err
	}
	s.broadcastReplaced(updated)
	return updated, nil
}

func (s *Service) ExportBundle(ctx context.Context) ([]byte, error) {
	state, err := s.store.GetState(ctx)
	if err != nil {
		return nil, err
	}
	return assets.Pack(state, s.blobs)
}

func (s *Service) ImportXMLUsers(ctx context.Context, xml string) ([]importing.Team, error) {
	contest, err := importing.Parse([]byte(xml))
	if err != nil {
		return nil, err
	}
	teams := append([]importing.Team{}, contest.Teams...)
	sort.Slice(teams, func(i, j int) bool { return teams[i].ID < teams[j].ID })
	return teams, nil
}

type RenameResolveInput struct {
	ShowVersion int
	CustomName  *string
}

func (s *Service) RenameResolveEvent(ctx context.Context, eventID int, in RenameResolveInput) (domain.ShowState, error) {
	updated, err := s.store.MutateShow(ctx, in.ShowVersion, func(st domain.ShowState) domain.ShowState {
		for i, e := range st.Timeline {
			if e.ID == eventID && e.Type == domain.TimelineRes {
				e.CustomName = in.CustomName
				st.Timeline[i] = e
			}
		}
		return st
	})
	if err != nil {
		return domain.ShowState{}, err
	}
	s.broadcastUpdated(updated, eventID)
	return updated, nil
}

type NonResolvePatch struct {
	ShowVersion              int
	TriggerOffsetSeconds     *float64
	RequireManualInteraction *bool
	CustomName               *string
	Custom                   *domain.CustomEventPayload
}

func (s *Service) PatchNonResolveEvent(ctx context.Context, eventID int, in NonResolvePatch) (domain.ShowState, error) {
	if err := ensureFiniteOrNull(in.TriggerOffsetSeconds, "triggerOffsetSeconds"); err != nil {
		return domain.ShowState{}, err
	}
	updated, err := s.store.MutateShow(ctx, in.ShowVersion, func(st domain.ShowState) domain.ShowState {
		for i, e := range st.Timeline {
			if e.ID != eventID || e.Type == domain.TimelineRes {
				continue
			}
			if in.TriggerOffsetSeconds != nil {
				e.TriggerOffsetSeconds = in.TriggerOffsetSeconds
			}
			if in.RequireManualInteraction != nil {
				e.RequireManualInteraction = in.RequireManualInteraction
			}
			if in.CustomName != nil {
				e.CustomName = in.CustomName
			}
			if e.Type == domain.TimelineCus && in.Custom != nil {
				e.Custom = in.Custom
			}
			st.Timeline[i] = e
		}
		return st
	})
	if err != nil {
		return domain.ShowState{}, err
	}
	s.rearmAdvance(updated)
	s.broadcastUpdated(updated, eventID)
	return updated, nil
}

type CreateEventInput struct {
	ShowVersion              int
	RelativeToEventID        int
	Before                   bool
	DurationSeconds          *float64
	TriggerOffsetSeconds     *float64
	RequireManualInteraction *bool
	CustomName               *string
	Custom                   *domain.CustomEventPayload
}

func (s *Service) CreateEvent(ctx context.Context, in CreateEventInput) (domain.ShowState, error) {
	if err := ensureFiniteOrNull(in.DurationSeconds, "durationSeconds"); err != nil {
		return domain.ShowState{}, err
	}
	if err := ensureFiniteOrNull(in.TriggerOffsetSeconds, "triggerOffsetSeconds"); err != nil {
		return domain.ShowState{}, err
	}
	createdID := 0
	updated, err := s.store.MutateShow(ctx, in.ShowVersion, func(st domain.ShowState) domain.ShowState {
		targetIdx := -1
		for i, e := range st.Timeline {
			if e.ID == in.RelativeToEventID {
				targetIdx = i
				break
			}
		}
		position := 1
		if targetIdx >= 0 {
			target := st.Timeline[targetIdx]
			position = target.Position
			if !in.Before {
				position++
			}
		} else {
			position = len(st.Timeline) + 1
		}
		nextID := 1
		for _, e := range st.Timeline {
			if e.ID >= nextID {
				nextID = e.ID + 1
			}
		}
		manual := false
		if in.RequireManualInteraction != nil {
			manual = *in.RequireManualInteraction
		}
		created := domain.TimelineEvent{
			ID: nextID, Position: position, Type: domain.TimelineCus,
			DurationSeconds: in.DurationSeconds, TriggerOffsetSeconds: in.TriggerOffsetSeconds,
			RequireManualInteraction: &manual, CustomName: in.CustomName, Custom: in.Custom,
		}
		createdID = nextID
		out := make([]domain.TimelineEvent, 0, len(st.Timeline)+1)
		for _, e := range st.Timeline {
			if e.Position >= position {
				e.Position++
			}
			out = append(out, e)
		}
		out = append(out, created)
		sort.Slice(out, func(i, j int) bool { return out[i].Position < out[j].Position })
		st.Timeline = out
		return st
	})
	if err != nil {
		return domain.ShowState{}, err
	}
	s.rearmAdvance(updated)
	s.broadcastAdded(updated, createdID)
	return updated, nil
}

type PatchEventInput struct {
	ShowVersion              int
	DurationSeconds          *float64
	UseDefaultDuration       bool
	CustomName               *string
	TriggerOffsetSeconds     *float64
	ClearTriggerOffset       bool
	RequireManualInteraction *bool
	Custom                   *domain.CustomEventPayload
}

func (s *Service) PatchEvent(ctx context.Context, eventID int, in PatchEventInput) (domain.ShowState, error) {
	if err := ensureFiniteOrNull(in.DurationSeconds, "durationSeconds"); err != nil {
		return domain.ShowState{}, err
	}
	if err := ensureFiniteOrNull(in.TriggerOffsetSeconds, "triggerOffsetSeconds"); err != nil {
		return domain.ShowState{}, err
	}
	updated, err := s.store.MutateShow(ctx, in.ShowVersion, func(st domain.ShowState) domain.ShowState {
		for i, e := range st.Timeline {
			if e.ID != eventID {
				continue
			}
			applyPresentationPatch(&e, in)
			if e.Type != domain.TimelineRes {
				if e.Type == domain.TimelineCus {
					if in.Custom != nil {
						e.Custom = in.Custom
					}
				} else {
					e.Custom = nil
				}
			}
			st.Timeline[i] = e
		}
		return st
	})
	if err != nil {
		return domain.ShowState{}, err
	}
	s.rearmAdvance(updated)
	s.broadcastUpdated(updated, eventID)
	return updated, nil
}

func applyPresentationPatch(e *domain.TimelineEvent, in PatchEventInput) {
	if in.CustomName != nil {
		e.CustomName = in.CustomName
	}
	if in.UseDefaultDuration {
		e.DurationSeconds = nil
	} else if in.DurationSeconds != nil {
		e.DurationSeconds = in.DurationSeconds
	}
	if in.ClearTriggerOffset {
		e.TriggerOffsetSeconds = nil
	} else if in.TriggerOffsetSeconds != nil {
		e.TriggerOffsetSeconds = in.TriggerOffsetSeconds
	}
	if in.RequireManualInteraction != nil {
		e.RequireManualInteraction = in.RequireManualInteraction
	}
}

type MoveEventInput struct {
	ShowVersion       int
	RelativeToEventID int
	Before            bool
}

func (s *Service) MoveEvent(ctx context.Context, eventID int, in MoveEventInput) (domain.ShowState, error) {
	updated, err := s.store.MutateShowChecked(ctx, in.ShowVersion, func(st domain.ShowState) (domain.ShowState, error) {
		if err := ensureWritable(st); err != nil {
			return st, err
		}
		idx, targetIdx := -1, -1
		for i, e := range st.Timeline {
			if e.ID == eventID {
				idx = i
			}
			if e.ID == in.RelativeToEventID {
				targetIdx = i
			}
		}
		if idx < 0 || targetIdx < 0 {
			return st, fmt.Errorf("timeline event does not exist")
		}
		if st.Timeline[idx].Type == domain.TimelineRes || st.Timeline[idx].Type == domain.TimelinePre {
			return st, fmt.Errorf("resolve and pre-resolve events cannot be reordered")
		}
		ord := ordered(st.Timeline)
		movingPos := -1
		for i, e := range ord {
			if e.ID == eventID {
				movingPos = i
				break
			}
		}
		without := append([]domain.TimelineEvent{}, ord[:movingPos]...)
		without = append(without, ord[movingPos+1:]...)
		at := 0
		for i, e := range without {
			if e.ID == in.RelativeToEventID {
				at = i
				break
			}
		}
		if !in.Before {
			at++
		}
		var moving domain.TimelineEvent
		for _, e := range ord {
			if e.ID == eventID {
				moving = e
				break
			}
		}
		out := append([]domain.TimelineEvent{}, without[:at]...)
		out = append(out, moving)
		out = append(out, without[at:]...)
		for i := range out {
			out[i].Position = i + 1
		}
		st.Timeline = out
		return st, nil
	})
	if err != nil {
		return domain.ShowState{}, err
	}
	s.rearmAdvance(updated)
	s.broadcastReordered(updated)
	return updated, nil
}

func (s *Service) DeleteEvent(ctx context.Context, showVersion, id int) (domain.ShowState, error) {
	updated, err := s.store.MutateShowChecked(ctx, showVersion, func(st domain.ShowState) (domain.ShowState, error) {
		if err := ensureWritable(st); err != nil {
			return st, err
		}
		found := false
		for _, e := range st.Timeline {
			if e.ID == id {
				found = true
				if e.Type == domain.TimelineRes || e.Type == domain.TimelinePre {
					return st, fmt.Errorf("resolve and pre-resolve events cannot be deleted")
				}
			}
		}
		if !found {
			return st, fmt.Errorf("timeline event %d does not exist", id)
		}
		kept := make([]domain.TimelineEvent, 0, len(st.Timeline))
		for _, e := range st.Timeline {
			if e.ID != id {
				kept = append(kept, e)
			}
		}
		for i := range kept {
			kept[i].Position = i + 1
		}
		st.Timeline = kept
		return st, nil
	})
	if err != nil {
		return domain.ShowState{}, err
	}
	s.rearmAdvance(updated)
	s.hub.Broadcast(&showv1.Envelope{Type: "TimelineEventRemoved",
		Payload: &showv1.Envelope_TimelineEventRemoved{TimelineEventRemoved: &showv1.TimelineEventRemoved{
			ShowVersion: int32(updated.ShowVersion), EventId: int32(id)}}})
	return updated, nil
}

func (s *Service) SetTimelineMode(ctx context.Context, showVersion int, mode domain.TimelineMode) (domain.ShowState, error) {
	if mode != domain.TimelineRw && mode != domain.TimelineRo {
		return domain.ShowState{}, fmt.Errorf("unknown timeline mode %q", mode)
	}
	updated, err := s.store.MutateShow(ctx, showVersion, func(st domain.ShowState) domain.ShowState {
		st.TimelineMode = mode
		return st
	})
	if err != nil {
		return domain.ShowState{}, err
	}
	s.broadcastReplaced(updated)
	return updated, nil
}

func (s *Service) UpsertAsset(ctx context.Context, assetID, fileName, contentType string, raw []byte, folderID *string, showVersion int) (domain.ShowState, error) {
	if err := s.blobs.Save(assetID, raw); err != nil {
		return domain.ShowState{}, err
	}
	updated, err := s.store.MutateShow(ctx, showVersion, func(st domain.ShowState) domain.ShowState {
		asset := domain.ShowAsset{
			ID: assetID, FileName: fileName, OriginalName: fileName,
			ContentType: contentType, SizeBytes: int64(len(raw)), Xxh3: xxh3Hex(raw),
			FolderID: folderID,
		}
		items := make([]domain.ShowAsset, 0, len(st.Assets.Items)+1)
		for _, a := range st.Assets.Items {
			if a.ID != assetID {
				items = append(items, a)
			}
		}
		items = append(items, asset)
		st.Assets.Items = items
		return st
	})
	if err != nil {
		_ = s.blobs.Delete(assetID)
		return domain.ShowState{}, err
	}
	s.broadcastReplaced(updated)
	return updated, nil
}

func (s *Service) DeleteEntry(ctx context.Context, id string, isDirectory bool, showVersion int) (domain.ShowState, error) {
	if !isDirectory {
		if err := s.blobs.Delete(id); err != nil {
			return domain.ShowState{}, err
		}
	}
	updated, err := s.store.MutateShow(ctx, showVersion, func(st domain.ShowState) domain.ShowState {
		if isDirectory {
			clearIDs := collectDescendantIDs(st.Assets.Folders, id)
			st.Assets.Folders = removeFolderNode(st.Assets.Folders, id)
			for i, a := range st.Assets.Items {
				if a.FolderID != nil && clearIDs[*a.FolderID] {
					st.Assets.Items[i].FolderID = nil
				}
			}
			return st
		}
		items := make([]domain.ShowAsset, 0, len(st.Assets.Items))
		for _, a := range st.Assets.Items {
			if a.ID != id {
				items = append(items, a)
			}
		}
		st.Assets.Items = items
		return st
	})
	if err != nil {
		return domain.ShowState{}, err
	}
	s.broadcastReplaced(updated)
	return updated, nil
}

func (s *Service) RenameEntry(ctx context.Context, id string, isDirectory bool, newName string, showVersion int) (domain.ShowState, error) {
	updated, err := s.store.MutateShow(ctx, showVersion, func(st domain.ShowState) domain.ShowState {
		if isDirectory {
			st.Assets.Folders = renameFolderNode(st.Assets.Folders, id, newName)
			return st
		}
		for i, a := range st.Assets.Items {
			if a.ID == id {
				st.Assets.Items[i].FileName = newName
			}
		}
		return st
	})
	if err != nil {
		return domain.ShowState{}, err
	}
	s.broadcastReplaced(updated)
	return updated, nil
}

func (s *Service) CreateFolder(ctx context.Context, name, parentFolderID string, showVersion int) (domain.ShowState, error) {
	updated, err := s.store.MutateShowChecked(ctx, showVersion, func(st domain.ShowState) (domain.ShowState, error) {
		if err := ensureWritable(st); err != nil {
			return st, err
		}
		folder := domain.FolderNode{ID: newID(), Name: name, Children: []domain.FolderNode{}}
		if parentFolderID == "" {
			st.Assets.Folders = append(st.Assets.Folders, folder)
			return st, nil
		}
		nodes, changed := insertFolderNode(st.Assets.Folders, parentFolderID, folder)
		if !changed {
			return st, fmt.Errorf("parent folder does not exist")
		}
		st.Assets.Folders = nodes
		return st, nil
	})
	if err != nil {
		return domain.ShowState{}, err
	}
	s.broadcastReplaced(updated)
	return updated, nil
}

func (s *Service) MoveAsset(ctx context.Context, assetID, targetFolderID string, showVersion int) (domain.ShowState, error) {
	updated, err := s.store.MutateShowChecked(ctx, showVersion, func(st domain.ShowState) (domain.ShowState, error) {
		if err := ensureWritable(st); err != nil {
			return st, err
		}
		target := normalizeFolderID(targetFolderID)
		if target != nil && findFolderNode(st.Assets.Folders, *target) == nil {
			return st, fmt.Errorf("target folder does not exist")
		}
		idx := -1
		for i, a := range st.Assets.Items {
			if a.ID == assetID {
				idx = i
				break
			}
		}
		if idx < 0 {
			return st, fmt.Errorf("asset '%s' does not exist", assetID)
		}
		if equalFolderID(st.Assets.Items[idx].FolderID, target) {
			return st, fmt.Errorf("asset is already in the target folder")
		}
		st.Assets.Items[idx].FolderID = target
		return st, nil
	})
	if err != nil {
		return domain.ShowState{}, err
	}
	s.broadcastReplaced(updated)
	return updated, nil
}

func (s *Service) TransferEntry(ctx context.Context, id string, in assets.TransferInput) (domain.ShowState, error) {
	if in.IsDirectory {
		if in.Copy {
			return s.copyFolder(ctx, id, in)
		}
		return s.moveFolder(ctx, id, in)
	}
	if in.Copy {
		return s.copyAsset(ctx, id, in)
	}
	target := ""
	if in.TargetFolderID != nil {
		target = *in.TargetFolderID
	}
	return s.MoveAsset(ctx, id, target, in.ShowVersion)
}

func (s *Service) copyAsset(ctx context.Context, id string, in assets.TransferInput) (domain.ShowState, error) {
	cur, err := s.store.GetState(ctx)
	if err != nil {
		return domain.ShowState{}, err
	}
	if err := ensureWritable(cur); err != nil {
		return domain.ShowState{}, err
	}
	target := normalizeFolderID(ptrStr(in.TargetFolderID))
	if target != nil && findFolderNode(cur.Assets.Folders, *target) == nil {
		return domain.ShowState{}, fmt.Errorf("target folder does not exist")
	}
	var source domain.ShowAsset
	found := false
	for _, a := range cur.Assets.Items {
		if a.ID == id {
			source = a
			found = true
		}
	}
	if !found {
		return domain.ShowState{}, fmt.Errorf("asset '%s' does not exist", id)
	}
	raw, err := s.blobs.Read(source.ID)
	if err != nil {
		return domain.ShowState{}, err
	}
	clonedID := newID()
	if err := s.blobs.Save(clonedID, raw); err != nil {
		return domain.ShowState{}, err
	}
	updated, err := s.store.MutateShowChecked(ctx, in.ShowVersion, func(st domain.ShowState) (domain.ShowState, error) {
		if err := ensureWritable(st); err != nil {
			return st, err
		}
		targetNow := normalizeFolderID(ptrStr(in.TargetFolderID))
		if targetNow != nil && findFolderNode(st.Assets.Folders, *targetNow) == nil {
			return st, fmt.Errorf("target folder does not exist")
		}
		stillThere := false
		for _, a := range st.Assets.Items {
			if a.ID == id {
				stillThere = true
			}
		}
		if !stillThere {
			return st, fmt.Errorf("asset '%s' no longer exists", id)
		}
		clone := source
		clone.ID = clonedID
		clone.FolderID = targetNow
		st.Assets.Items = append(st.Assets.Items, clone)
		return st, nil
	})
	if err != nil {
		_ = s.blobs.Delete(clonedID)
		return domain.ShowState{}, err
	}
	s.broadcastReplaced(updated)
	return updated, nil
}

func (s *Service) moveFolder(ctx context.Context, id string, in assets.TransferInput) (domain.ShowState, error) {
	updated, err := s.store.MutateShowChecked(ctx, in.ShowVersion, func(st domain.ShowState) (domain.ShowState, error) {
		if err := ensureWritable(st); err != nil {
			return st, err
		}
		target := normalizeFolderID(ptrStr(in.TargetFolderID))
		if target != nil && findFolderNode(st.Assets.Folders, *target) == nil {
			return st, fmt.Errorf("target folder does not exist")
		}
		without, source, found := extractFolderNode(st.Assets.Folders, id)
		if !found || source == nil {
			return st, fmt.Errorf("folder '%s' does not exist", id)
		}
		if target != nil && *target == id {
			return st, fmt.Errorf("folder cannot be moved into itself")
		}
		if target != nil && isDescendant(st.Assets.Folders, id, *target) {
			return st, fmt.Errorf("folder cannot be moved into one of its descendants")
		}
		if findParentFolderID(st.Assets.Folders, id) == ptrStrVal(target) && (target != nil) == (findParentFolderID(st.Assets.Folders, id) != "") {
			return st, fmt.Errorf("folder is already in the target folder")
		}
		if target == nil {
			st.Assets.Folders = append(without, *source)
		} else {
			nodes, _ := insertFolderNode(without, *target, *source)
			st.Assets.Folders = nodes
		}
		return st, nil
	})
	if err != nil {
		return domain.ShowState{}, err
	}
	s.broadcastReplaced(updated)
	return updated, nil
}

func (s *Service) copyFolder(ctx context.Context, id string, in assets.TransferInput) (domain.ShowState, error) {
	cur, err := s.store.GetState(ctx)
	if err != nil {
		return domain.ShowState{}, err
	}
	if err := ensureWritable(cur); err != nil {
		return domain.ShowState{}, err
	}
	target := normalizeFolderID(ptrStr(in.TargetFolderID))
	if target != nil && *target == id {
		return domain.ShowState{}, fmt.Errorf("folder cannot be copied into itself")
	}
	if target != nil && isDescendant(cur.Assets.Folders, id, *target) {
		return domain.ShowState{}, fmt.Errorf("folder cannot be copied into one of its descendants")
	}
	source := findFolderNode(cur.Assets.Folders, id)
	if source == nil {
		return domain.ShowState{}, fmt.Errorf("folder '%s' does not exist", id)
	}
	idMap := map[string]string{}
	cloned := cloneFolderTree(*source, idMap)
	sourceIDs := map[string]bool{}
	collectAllIDs(*source, sourceIDs)
	type assetCopy struct {
		meta domain.ShowAsset
		raw  []byte
	}
	copies := []assetCopy{}
	for _, a := range cur.Assets.Items {
		if a.FolderID != nil && sourceIDs[*a.FolderID] {
			raw, err := s.blobs.Read(a.ID)
			if err != nil {
				for _, c := range copies {
					_ = s.blobs.Delete(c.meta.ID)
				}
				return domain.ShowState{}, err
			}
			clonedID := newID()
			if err := s.blobs.Save(clonedID, raw); err != nil {
				for _, c := range copies {
					_ = s.blobs.Delete(c.meta.ID)
				}
				return domain.ShowState{}, err
			}
			meta := a
			meta.ID = clonedID
			if a.FolderID != nil {
				mapped := idMap[*a.FolderID]
				meta.FolderID = &mapped
			}
			copies = append(copies, assetCopy{meta: meta})
		}
	}
	updated, err := s.store.MutateShowChecked(ctx, in.ShowVersion, func(st domain.ShowState) (domain.ShowState, error) {
		if err := ensureWritable(st); err != nil {
			return st, err
		}
		if target != nil && findFolderNode(st.Assets.Folders, *target) == nil {
			return st, fmt.Errorf("target folder does not exist")
		}
		if target == nil {
			st.Assets.Folders = append(st.Assets.Folders, cloned)
		} else {
			nodes, _ := insertFolderNode(st.Assets.Folders, *target, cloned)
			st.Assets.Folders = nodes
		}
		for _, c := range copies {
			st.Assets.Items = append(st.Assets.Items, c.meta)
		}
		return st, nil
	})
	if err != nil {
		for _, c := range copies {
			_ = s.blobs.Delete(c.meta.ID)
		}
		return domain.ShowState{}, err
	}
	s.broadcastReplaced(updated)
	return updated, nil
}

func (s *Service) SetLive(ctx context.Context, live bool) (domain.ShowState, error) {
	updated, err := s.store.MutateShowUnchecked(ctx, func(st domain.ShowState) domain.ShowState {
		if live {
			st.Mode = domain.ShowModeLive
		} else {
			st.Mode = domain.ShowModeEditing
		}
		st.Playback = domain.PlaybackState{Status: domain.PlaybackIdle, ActiveEventIDs: []int{}}
		return st
	})
	if err != nil {
		return domain.ShowState{}, err
	}
	mode := "Editing"
	if live {
		mode = "Live"
	}
	s.hub.Broadcast(&showv1.Envelope{Type: "LiveModeChanged",
		Payload: &showv1.Envelope_LiveModeChanged{LiveModeChanged: &showv1.LiveModeChanged{
			ShowVersion: int32(updated.ShowVersion), Mode: mode}}})
	s.broadcastPlayback(updated)
	s.orchestrator.CancelAdvance()
	return updated, nil
}

func (s *Service) Start(ctx context.Context, showVersion int) (domain.ShowState, error) {
	updated, err := s.store.MutatePlaybackChecked(ctx, showVersion, func(st domain.ShowState) (domain.ShowState, error) {
		switch st.Playback.Status {
		case domain.PlaybackRunning:
			st.Playback.Status = domain.PlaybackPaused
			return st, nil
		case domain.PlaybackPaused:
			st.Playback.Status = domain.PlaybackRunning
			return st, nil
		}
		ord := ordered(st.Timeline)
		if len(ord) == 0 {
			return st, nil
		}
		now := s.clock.Now().UnixMilli()
		st.Playback.Status = domain.PlaybackRunning
		id := ord[0].ID
		st.Playback.CurrentEventID = &id
		st.Playback.ActiveEventIDs = computeActiveEventIDs(ord, 0)
		st.Playback.StartedAt = &now
		return st, nil
	})
	if err != nil {
		return domain.ShowState{}, err
	}
	s.broadcastPlayback(updated)
	if updated.Playback.Status == domain.PlaybackRunning {
		s.scheduleNext(updated)
	} else {
		s.orchestrator.CancelAdvance()
	}
	return updated, nil
}

func (s *Service) Reset(ctx context.Context, showVersion int) (domain.ShowState, error) {
	updated, err := s.store.MutatePlaybackChecked(ctx, showVersion, func(st domain.ShowState) (domain.ShowState, error) {
		st.Playback = domain.PlaybackState{Status: domain.PlaybackIdle, ActiveEventIDs: []int{}}
		return st, nil
	})
	if err != nil {
		return domain.ShowState{}, err
	}
	s.broadcastPlayback(updated)
	s.orchestrator.CancelAdvance()
	return updated, nil
}

func (s *Service) Seek(ctx context.Context, showVersion, eventID int) (domain.ShowState, error) {
	updated, err := s.store.MutatePlaybackChecked(ctx, showVersion, func(st domain.ShowState) (domain.ShowState, error) {
		ord := ordered(st.Timeline)
		targetIndex := indexOf(ord, eventID)
		if targetIndex < 0 {
			return st, fmt.Errorf("timeline event %d does not exist", eventID)
		}
		status := st.Playback.Status
		if status == domain.PlaybackPaused {
			status = domain.PlaybackRunning
		}
		id := eventID
		st.Playback.Status = status
		st.Playback.CurrentEventID = &id
		st.Playback.ActiveEventIDs = computeActiveEventIDs(ord, targetIndex)
		return st, nil
	})
	if err != nil {
		return domain.ShowState{}, err
	}
	s.broadcastPlayback(updated)
	s.orchestrator.CancelAdvance()
	if updated.Playback.Status == domain.PlaybackRunning {
		s.scheduleNext(updated)
	}
	return updated, nil
}

func (s *Service) Advance(ctx context.Context) (domain.ShowState, error) {
	state, err := s.store.GetState(ctx)
	if err != nil {
		return domain.ShowState{}, err
	}
	if state.Playback.Status != domain.PlaybackRunning {
		return state, nil
	}
	ord := ordered(state.Timeline)
	if state.Playback.CurrentEventID == nil {
		if len(ord) == 0 {
			return state, nil
		}
		now := s.clock.Now().UnixMilli()
		updated, err := s.store.MutatePlayback(ctx, func(st domain.ShowState) domain.ShowState {
			id := ord[0].ID
			st.Playback.Status = domain.PlaybackRunning
			st.Playback.CurrentEventID = &id
			st.Playback.ActiveEventIDs = computeActiveEventIDs(ord, 0)
			st.Playback.StartedAt = &now
			return st
		})
		if err != nil {
			return domain.ShowState{}, err
		}
		s.broadcastPlayback(updated)
		s.scheduleNext(updated)
		return updated, nil
	}
	currentIndex := indexOf(ord, *state.Playback.CurrentEventID)
	if currentIndex < 0 {
		return state, nil
	}
	if currentIndex >= len(ord)-1 {
		return s.stopPlayback(ctx)
	}
	next := ord[currentIndex+1]
	startedAt := state.Playback.StartedAt
	updated, err := s.store.MutatePlayback(ctx, func(st domain.ShowState) domain.ShowState {
		id := next.ID
		st.Playback.Status = domain.PlaybackRunning
		st.Playback.CurrentEventID = &id
		st.Playback.ActiveEventIDs = computeActiveEventIDs(ord, currentIndex+1)
		st.Playback.StartedAt = startedAt
		return st
	})
	if err != nil {
		return domain.ShowState{}, err
	}
	s.broadcastPlayback(updated)
	s.scheduleNext(updated)
	return updated, nil
}

func (s *Service) stopPlayback(ctx context.Context) (domain.ShowState, error) {
	updated, err := s.store.MutatePlayback(ctx, func(st domain.ShowState) domain.ShowState {
		st.Playback = domain.PlaybackState{Status: domain.PlaybackIdle, ActiveEventIDs: []int{}}
		return st
	})
	if err != nil {
		return domain.ShowState{}, err
	}
	s.broadcastPlayback(updated)
	s.orchestrator.CancelAdvance()
	return updated, nil
}

func (s *Service) RescheduleAdvance(ctx context.Context) error {
	cur, err := s.store.GetState(ctx)
	if err != nil {
		return err
	}
	if cur.Playback.Status == domain.PlaybackRunning {
		s.scheduleNext(cur)
	}
	return nil
}

// rearmAdvance recomputes the pending auto-advance after a timeline edit.
// Edits can change the next event's offset, duration, manual flag, or order,
// invalidating any ticket scheduled before the edit.
func (s *Service) rearmAdvance(updated domain.ShowState) {
	if updated.Playback.Status != domain.PlaybackRunning {
		return
	}
	s.orchestrator.CancelAdvance()
	s.scheduleNext(updated)
}

func (s *Service) scheduleNext(st domain.ShowState) {
	if st.Playback.Status != domain.PlaybackRunning || st.Playback.CurrentEventID == nil {
		return
	}
	ord := ordered(st.Timeline)
	currentIndex := indexOf(ord, *st.Playback.CurrentEventID)
	if currentIndex < 0 || currentIndex >= len(ord)-1 {
		return
	}
	next := ord[currentIndex+1]
	if next.TriggerOffsetSeconds != nil {
		ms := int64(*next.TriggerOffsetSeconds * 1000)
		if ms < 0 {
			ms = 0
		}
		s.orchestrator.ScheduleAdvance(time.Duration(ms) * time.Millisecond)
		return
	}
	if !st.Automation.FullAutoEnabled && !st.Automation.AutoResolveEnabled {
		return
	}
	if !st.Automation.FullAutoEnabled && ord[currentIndex+1].RequireManualInteraction != nil && *ord[currentIndex+1].RequireManualInteraction {
		return
	}
	current := ord[currentIndex]
	delaySec := float64(st.Automation.AutoResolveSpeedMs) / 1000
	if current.DurationSeconds != nil {
		delaySec = *current.DurationSeconds
	}
	s.orchestrator.ScheduleAdvance(time.Duration(delaySec * float64(time.Second)))
}

type AutomationPatch struct {
	ShowVersion        int
	AutoResolveEnabled *bool
	AutoResolveSpeedMs *int
	FullAutoEnabled    *bool
}

func (s *Service) SetAutomation(ctx context.Context, in AutomationPatch) (domain.ShowState, error) {
	updated, err := s.store.MutateShow(ctx, in.ShowVersion, func(st domain.ShowState) domain.ShowState {
		if in.AutoResolveEnabled != nil {
			st.Automation.AutoResolveEnabled = *in.AutoResolveEnabled
		}
		if in.AutoResolveSpeedMs != nil {
			st.Automation.AutoResolveSpeedMs = *in.AutoResolveSpeedMs
		}
		if in.FullAutoEnabled != nil {
			st.Automation.FullAutoEnabled = *in.FullAutoEnabled
		}
		return st
	})
	if err != nil {
		return domain.ShowState{}, err
	}
	if updated.Playback.Status == domain.PlaybackRunning {
		s.orchestrator.CancelAdvance()
		s.scheduleNext(updated)
	}
	s.broadcastReplaced(updated)
	return updated, nil
}

func (s *Service) SetSettings(ctx context.Context, showVersion int, tickRate *float64) (domain.ShowState, error) {
	updated, err := s.store.MutateShow(ctx, showVersion, func(st domain.ShowState) domain.ShowState {
		st.TickRate = tickRate
		return st
	})
	if err != nil {
		return domain.ShowState{}, err
	}
	if err := s.SetTickRate(tickRate); err != nil {
		return domain.ShowState{}, err
	}
	s.broadcastReplaced(updated)
	return updated, nil
}

func (s *Service) SetTickRate(tickRate *float64) error {
	rate := realtime.DefaultTickRateValue()
	if tickRate != nil {
		rate = *tickRate
	}
	return s.clock.SetTickRate(rate)
}

func toResolvePayload(p *domain.ResolveEventPayload) *showv1.ResolvePayload {
	if p == nil {
		return nil
	}
	return &showv1.ResolvePayload{
		UserId: int32(p.UserID), ProblemId: int32(p.ProblemID),
		NewTotalScore: p.NewTotalScore, NewTotalPenalty: p.NewTotalPenalty,
		NewRank: int32(p.NewRank), NewProblemScore: p.NewProblemScore,
		Verdict: string(p.Verdict), TimeSinceStart: p.TimeSinceStart,
	}
}

func toCustomPayload(p *domain.CustomEventPayload) *showv1.CustomPayload {
	if p == nil {
		return nil
	}
	out := &showv1.CustomPayload{ExtId: p.ExtID}
	if p.ExtPayload != nil {
		if raw, err := json.Marshal(p.ExtPayload); err == nil {
			out.ExtPayloadJson = raw
		}
	}
	return out
}

func toEventSnapshot(e domain.TimelineEvent) *showv1.TimelineEventSnapshot {
	return &showv1.TimelineEventSnapshot{
		Id: int32(e.ID), Position: int32(e.Position), Type: string(e.Type),
		DurationSeconds:          e.DurationSeconds,
		TriggerOffsetSeconds:     e.TriggerOffsetSeconds,
		RequireManualInteraction: e.RequireManualInteraction,
		CustomName:               e.CustomName,
		Resolve:                  toResolvePayload(e.Resolve), Pre: toResolvePayload(e.Pre),
		Custom: toCustomPayload(e.Custom),
	}
}

func (s *Service) broadcastPlayback(st domain.ShowState) {
	pb := &showv1.PlaybackSnapshot{Status: string(st.Playback.Status)}
	if st.Playback.CurrentEventID != nil {
		id := int32(*st.Playback.CurrentEventID)
		pb.CurrentEventId = &id
	}
	for _, id := range st.Playback.ActiveEventIDs {
		pb.ActiveEventIds = append(pb.ActiveEventIds, int32(id))
	}
	pb.StartedAtUnixMs = st.Playback.StartedAt
	s.hub.Broadcast(&showv1.Envelope{Type: "PlaybackStateChanged",
		Payload: &showv1.Envelope_PlaybackStateChanged{PlaybackStateChanged: &showv1.PlaybackStateChanged{
			ShowVersion: int32(st.ShowVersion), Playback: pb,
			ServerTimeUnixMs: s.clock.Now().UnixMilli()}}})
}

func (s *Service) broadcastAdded(updated domain.ShowState, eventID int) {
	for _, e := range updated.Timeline {
		if e.ID != eventID {
			continue
		}
		s.hub.Broadcast(&showv1.Envelope{Type: "TimelineEventAdded",
			Payload: &showv1.Envelope_TimelineEventAdded{TimelineEventAdded: &showv1.TimelineEventAdded{
				ShowVersion: int32(updated.ShowVersion), Event: toEventSnapshot(e)}}})
	}
}

func (s *Service) broadcastUpdated(updated domain.ShowState, eventID int) {
	for _, e := range updated.Timeline {
		if e.ID != eventID {
			continue
		}
		s.hub.Broadcast(&showv1.Envelope{Type: "TimelineEventUpdated",
			Payload: &showv1.Envelope_TimelineEventUpdated{TimelineEventUpdated: &showv1.TimelineEventUpdated{
				ShowVersion: int32(updated.ShowVersion), Event: toEventSnapshot(e)}}})
	}
}

func (s *Service) broadcastReordered(updated domain.ShowState) {
	ids := make([]int32, 0, len(updated.Timeline))
	for _, e := range ordered(updated.Timeline) {
		ids = append(ids, int32(e.ID))
	}
	s.hub.Broadcast(&showv1.Envelope{Type: "TimelineReordered",
		Payload: &showv1.Envelope_TimelineReordered{TimelineReordered: &showv1.TimelineReordered{
			ShowVersion: int32(updated.ShowVersion), OrderedEventIds: ids}}})
}

func (s *Service) broadcastReplaced(updated domain.ShowState) {
	s.hub.Broadcast(&showv1.Envelope{Type: "ShowReplaced",
		Payload: &showv1.Envelope_ShowReplaced{ShowReplaced: &showv1.ShowReplaced{
			ShowVersion: int32(updated.ShowVersion)}}})
}

func BuildShowFromXML(xml []byte, excluded []string, showVersion int) domain.ShowState {
	resolution, err := importing.Convert(xml, excluded)
	if err != nil {
		return CreateEmptyShow(showVersion, domain.ShowSourceXml)
	}
	events := make([]domain.TimelineEvent, 0, len(resolution.ResolveEvents)*2)
	id := 1
	noInteract := false
	for _, resolve := range resolution.ResolveEvents {
		payload := &domain.ResolveEventPayload{
			UserID: resolve.UserID, ProblemID: resolve.ProblemID,
			NewTotalScore: resolve.NewTotalScore, NewTotalPenalty: resolve.NewTotalPenalty,
			NewRank: resolve.NewRank, NewProblemScore: resolve.NewProblemScore,
			Verdict: resolve.Verdict, TimeSinceStart: resolve.TimeSinceStart,
		}
		if resolve.IsFinalize {
			events = append(events, domain.TimelineEvent{ID: id, Position: id,
				Type: domain.TimelineRes, RequireManualInteraction: &noInteract, Resolve: payload})
			id++
			continue
		}
		events = append(events, domain.TimelineEvent{ID: id, Position: id,
			Type: domain.TimelinePre, RequireManualInteraction: &noInteract, Pre: payload})
		id++
		events = append(events, domain.TimelineEvent{ID: id, Position: id,
			Type: domain.TimelineRes, RequireManualInteraction: &noInteract, Resolve: payload})
		id++
	}
	state := CreateEmptyShow(showVersion, domain.ShowSourceXml)
	state.Meta = domain.ShowMeta{Title: resolution.Title, ContestID: &resolution.ContestID, Source: domain.ShowSourceXml}
	state.Contest = domain.ContestState{
		DurationSeconds:       resolution.DurationSeconds,
		FreezeDurationSeconds: resolution.FreezeDurationSeconds,
		Problems:              resolution.Problems, Users: resolution.Users,
		PreFreezeSnapshot: resolution.PreFreezeSnapshot,
	}
	state.Timeline = events
	return state
}

func normalizeFolderID(id string) *string {
	if strings.TrimSpace(id) == "" {
		return nil
	}
	return &id
}

func ptrStr(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

func ptrStrVal(s *string) string { return ptrStr(s) }

func equalFolderID(a, b *string) bool {
	if a == nil || b == nil {
		return a == b
	}
	return *a == *b
}

func findFolderNode(nodes []domain.FolderNode, id string) *domain.FolderNode {
	for i := range nodes {
		if nodes[i].ID == id {
			return &nodes[i]
		}
		if found := findFolderNode(nodes[i].Children, id); found != nil {
			return found
		}
	}
	return nil
}

func findParentFolderID(nodes []domain.FolderNode, id string) string {
	for i := range nodes {
		for _, c := range nodes[i].Children {
			if c.ID == id {
				return nodes[i].ID
			}
		}
		if parent := findParentFolderID(nodes[i].Children, id); parent != "" {
			return parent
		}
	}
	return ""
}

func insertFolderNode(nodes []domain.FolderNode, parentID string, folder domain.FolderNode) ([]domain.FolderNode, bool) {
	out := append([]domain.FolderNode{}, nodes...)
	for i := range out {
		if out[i].ID == parentID {
			out[i].Children = append(out[i].Children, folder)
			return out, true
		}
		children, changed := insertFolderNode(out[i].Children, parentID, folder)
		if changed {
			out[i].Children = children
			return out, true
		}
	}
	return nodes, false
}

func extractFolderNode(nodes []domain.FolderNode, id string) ([]domain.FolderNode, *domain.FolderNode, bool) {
	out := append([]domain.FolderNode{}, nodes...)
	for i := range out {
		if out[i].ID == id {
			node := out[i]
			return append(out[:i], out[i+1:]...), &node, true
		}
		children, extracted, found := extractFolderNode(out[i].Children, id)
		if found {
			out[i].Children = children
			return out, extracted, true
		}
	}
	return nodes, nil, false
}

func renameFolderNode(nodes []domain.FolderNode, id, newName string) []domain.FolderNode {
	out := append([]domain.FolderNode{}, nodes...)
	for i := range out {
		if out[i].ID == id {
			out[i].Name = newName
			return out
		}
		out[i].Children = renameFolderNode(out[i].Children, id, newName)
	}
	return out
}

func removeFolderNode(nodes []domain.FolderNode, id string) []domain.FolderNode {
	out := make([]domain.FolderNode, 0, len(nodes))
	for _, n := range nodes {
		if n.ID == id {
			continue
		}
		n.Children = removeFolderNode(n.Children, id)
		out = append(out, n)
	}
	return out
}

func collectAllIDs(node domain.FolderNode, ids map[string]bool) {
	ids[node.ID] = true
	for _, c := range node.Children {
		collectAllIDs(c, ids)
	}
}

func collectDescendantIDs(nodes []domain.FolderNode, id string) map[string]bool {
	result := map[string]bool{id: true}
	var walk func([]domain.FolderNode)
	walk = func(ns []domain.FolderNode) {
		for _, n := range ns {
			if n.ID == id {
				collectAllIDs(n, result)
			} else {
				walk(n.Children)
			}
		}
	}
	walk(nodes)
	return result
}

func isDescendant(nodes []domain.FolderNode, sourceID, maybeDescendantID string) bool {
	source := findFolderNode(nodes, sourceID)
	if source == nil {
		return false
	}
	ids := map[string]bool{}
	collectAllIDs(*source, ids)
	return ids[maybeDescendantID]
}

func cloneFolderTree(source domain.FolderNode, idMap map[string]string) domain.FolderNode {
	clonedID := newID()
	idMap[source.ID] = clonedID
	children := make([]domain.FolderNode, 0, len(source.Children))
	for _, c := range source.Children {
		children = append(children, cloneFolderTree(c, idMap))
	}
	return domain.FolderNode{ID: clonedID, Name: source.Name, Children: children}
}
