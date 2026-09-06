package show

import (
	"context"
	"errors"
	"fmt"
	"sort"

	"github.com/rs/zerolog/log"

	"tgb-resolver/server/features/shared/domain"
	showv1 "tgb-resolver/server/proto/gen/show/v1"
)

type RenameResolveInput struct {
	ShowVersion int
	CustomName  *string
}

func (s *Service) RenameResolveEvent(ctx context.Context, eventID int, in RenameResolveInput) (domain.ShowState, error) {
	log.Debug().Int("eventID", eventID).Int("showVersion", in.ShowVersion).Msg("RenameResolveEvent start")
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
		if errors.Is(err, domain.ErrVersionDrift) {
			log.Warn().Err(err).Int("eventID", eventID).Int("showVersion", in.ShowVersion).Msg("RenameResolveEvent version drift")
		} else {
			log.Error().Err(err).Int("eventID", eventID).Int("showVersion", in.ShowVersion).Msg("RenameResolveEvent failed")
		}
		return domain.ShowState{}, err
	}
	s.broadcastUpdated(updated, eventID)
	log.Info().Int("eventID", eventID).Int("showVersion", updated.ShowVersion).Msg("RenameResolveEvent succeeded")
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
	log.Debug().Int("eventID", eventID).Int("showVersion", in.ShowVersion).Msg("PatchNonResolveEvent start")
	if err := ensureFiniteOrNull(in.TriggerOffsetSeconds, "triggerOffsetSeconds"); err != nil {
		log.Warn().Err(err).Int("eventID", eventID).Msg("PatchNonResolveEvent invalid triggerOffsetSeconds")
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
		if errors.Is(err, domain.ErrVersionDrift) {
			log.Warn().Err(err).Int("eventID", eventID).Int("showVersion", in.ShowVersion).Msg("PatchNonResolveEvent version drift")
		} else {
			log.Error().Err(err).Int("eventID", eventID).Int("showVersion", in.ShowVersion).Msg("PatchNonResolveEvent failed")
		}
		return domain.ShowState{}, err
	}
	s.rearmAdvance(updated)
	s.broadcastUpdated(updated, eventID)
	log.Info().Int("eventID", eventID).Int("showVersion", updated.ShowVersion).Msg("PatchNonResolveEvent succeeded")
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
	log.Debug().Int("showVersion", in.ShowVersion).Int("relativeToEventID", in.RelativeToEventID).Msg("CreateEvent start")
	if err := ensureFiniteOrNull(in.DurationSeconds, "durationSeconds"); err != nil {
		log.Warn().Err(err).Msg("CreateEvent invalid durationSeconds")
		return domain.ShowState{}, err
	}
	if err := ensureFiniteOrNull(in.TriggerOffsetSeconds, "triggerOffsetSeconds"); err != nil {
		log.Warn().Err(err).Msg("CreateEvent invalid triggerOffsetSeconds")
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
		if errors.Is(err, domain.ErrVersionDrift) {
			log.Warn().Err(err).Int("showVersion", in.ShowVersion).Msg("CreateEvent version drift")
		} else {
			log.Error().Err(err).Int("showVersion", in.ShowVersion).Msg("CreateEvent failed")
		}
		return domain.ShowState{}, err
	}
	s.rearmAdvance(updated)
	s.broadcastAdded(updated, createdID)
	log.Info().Int("createdID", createdID).Int("showVersion", updated.ShowVersion).Msg("CreateEvent succeeded")
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
	log.Debug().Int("eventID", eventID).Int("showVersion", in.ShowVersion).Msg("PatchEvent start")
	if err := ensureFiniteOrNull(in.DurationSeconds, "durationSeconds"); err != nil {
		log.Warn().Err(err).Int("eventID", eventID).Msg("PatchEvent invalid durationSeconds")
		return domain.ShowState{}, err
	}
	if err := ensureFiniteOrNull(in.TriggerOffsetSeconds, "triggerOffsetSeconds"); err != nil {
		log.Warn().Err(err).Int("eventID", eventID).Msg("PatchEvent invalid triggerOffsetSeconds")
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
		if errors.Is(err, domain.ErrVersionDrift) {
			log.Warn().Err(err).Int("eventID", eventID).Int("showVersion", in.ShowVersion).Msg("PatchEvent version drift")
		} else {
			log.Error().Err(err).Int("eventID", eventID).Int("showVersion", in.ShowVersion).Msg("PatchEvent failed")
		}
		return domain.ShowState{}, err
	}
	s.rearmAdvance(updated)
	s.broadcastUpdated(updated, eventID)
	log.Info().Int("eventID", eventID).Int("showVersion", updated.ShowVersion).Msg("PatchEvent succeeded")
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
	log.Debug().Int("eventID", eventID).Int("relativeToEventID", in.RelativeToEventID).Bool("before", in.Before).Int("showVersion", in.ShowVersion).Msg("MoveEvent start")
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
		if errors.Is(err, domain.ErrVersionDrift) {
			log.Warn().Err(err).Int("eventID", eventID).Int("showVersion", in.ShowVersion).Msg("MoveEvent version drift")
		} else {
			log.Warn().Err(err).Int("eventID", eventID).Int("showVersion", in.ShowVersion).Msg("MoveEvent failed")
		}
		return domain.ShowState{}, err
	}
	s.rearmAdvance(updated)
	s.broadcastReordered(updated)
	log.Info().Int("eventID", eventID).Int("showVersion", updated.ShowVersion).Msg("MoveEvent succeeded")
	return updated, nil
}

func (s *Service) DeleteEvent(ctx context.Context, showVersion, id int) (domain.ShowState, error) {
	log.Debug().Int("id", id).Int("showVersion", showVersion).Msg("DeleteEvent start")
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
		if errors.Is(err, domain.ErrVersionDrift) {
			log.Warn().Err(err).Int("id", id).Int("showVersion", showVersion).Msg("DeleteEvent version drift")
		} else {
			log.Warn().Err(err).Int("id", id).Int("showVersion", showVersion).Msg("DeleteEvent failed")
		}
		return domain.ShowState{}, err
	}
	s.rearmAdvance(updated)
	s.hub.Broadcast(&showv1.Envelope{Type: "TimelineEventRemoved",
		Payload: &showv1.Envelope_TimelineEventRemoved{TimelineEventRemoved: &showv1.TimelineEventRemoved{
			ShowVersion: int32(updated.ShowVersion), EventId: int32(id)}}})
	log.Info().Int("id", id).Int("showVersion", updated.ShowVersion).Msg("DeleteEvent succeeded")
	return updated, nil
}
