package show

import (
	"context"
	"encoding/base64"
	"fmt"
	"sort"

	"tgb-resolver/server/features/assets"
	"tgb-resolver/server/features/importing"
	"tgb-resolver/server/features/shared/domain"
)

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
