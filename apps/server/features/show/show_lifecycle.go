package show

import (
	"context"
	"encoding/base64"
	"errors"
	"fmt"
	"sort"

	"github.com/rs/zerolog/log"

	"tgb-resolver/server/features/assets"
	"tgb-resolver/server/features/importing"
	"tgb-resolver/server/features/shared/domain"
)

func (s *Service) Snapshot(ctx context.Context) (domain.ShowState, error) {
	st, err := s.store.GetState(ctx)
	if err != nil {
		log.Error().Err(err).Msg("Snapshot failed")
		return domain.ShowState{}, err
	}
	log.Debug().Int("showVersion", st.ShowVersion).Msg("Snapshot succeeded")
	return st, nil
}

func (s *Service) Clear(ctx context.Context, showVersion int) (domain.ShowState, error) {
	log.Debug().Int("showVersion", showVersion).Msg("Clear start")
	updated, err := s.store.MutateShow(ctx, showVersion, func(st domain.ShowState) domain.ShowState {
		return CreateEmptyShow(st.ShowVersion, domain.ShowSourceManual)
	})
	if err != nil {
		if errors.Is(err, domain.ErrVersionDrift) {
			log.Warn().Err(err).Int("showVersion", showVersion).Msg("Clear version drift")
		} else {
			log.Error().Err(err).Int("showVersion", showVersion).Msg("Clear failed")
		}
		return domain.ShowState{}, err
	}
	s.orchestrator.CancelAdvance()
	s.broadcastReplaced(updated)
	log.Info().Int("showVersion", updated.ShowVersion).Msg("Clear succeeded")
	return updated, nil
}

func (s *Service) Optimize(ctx context.Context, showVersion int) (domain.ShowState, error) {
	log.Debug().Int("showVersion", showVersion).Msg("Optimize start")
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
		if errors.Is(err, domain.ErrVersionDrift) {
			log.Warn().Err(err).Int("showVersion", showVersion).Msg("Optimize version drift")
		} else {
			log.Error().Err(err).Int("showVersion", showVersion).Msg("Optimize failed")
		}
		return domain.ShowState{}, err
	}
	s.rearmAdvance(updated)
	s.broadcastReordered(updated)
	log.Info().Int("showVersion", updated.ShowVersion).Int("timelineLen", len(updated.Timeline)).Msg("Optimize succeeded")
	return updated, nil
}

func (s *Service) ImportXML(ctx context.Context, xml string, excluded []string) (domain.ShowState, error) {
	log.Debug().Int("xmlLen", len(xml)).Int("excludedCount", len(excluded)).Msg("ImportXML start")
	cur, err := s.store.GetState(ctx)
	if err != nil {
		log.Error().Err(err).Msg("ImportXML get state failed")
		return domain.ShowState{}, err
	}
	if err := ensureWritable(cur); err != nil {
		log.Warn().Err(err).Msg("ImportXML show not writable")
		return domain.ShowState{}, err
	}
	next := BuildShowFromXML([]byte(xml), excluded, cur.ShowVersion+1)
	updated, err := s.store.Replace(ctx, next)
	if err != nil {
		log.Error().Err(err).Msg("ImportXML replace failed")
		return domain.ShowState{}, err
	}
	s.broadcastReplaced(updated)
	log.Info().Int("showVersion", updated.ShowVersion).Int("events", len(updated.Timeline)).Msg("ImportXML succeeded")
	return updated, nil
}

func (s *Service) ImportBundle(ctx context.Context, b64 string) (domain.ShowState, error) {
	log.Debug().Int("bundleLen", len(b64)).Msg("ImportBundle start")
	raw, err := base64.StdEncoding.DecodeString(b64)
	if err != nil {
		log.Warn().Err(err).Msg("ImportBundle invalid base64")
		return domain.ShowState{}, fmt.Errorf("invalid bundle bytes: %w", err)
	}
	imported, err := assets.Unpack(raw, s.blobs)
	if err != nil {
		log.Warn().Err(err).Msg("ImportBundle unpack failed")
		return domain.ShowState{}, err
	}
	cur, err := s.store.GetState(ctx)
	if err != nil {
		log.Error().Err(err).Msg("ImportBundle get state failed")
		return domain.ShowState{}, err
	}
	imported.ShowVersion = cur.ShowVersion + 1
	imported.Meta.Source = domain.ShowSourceBundle
	updated, err := s.store.Replace(ctx, imported)
	if err != nil {
		log.Error().Err(err).Msg("ImportBundle replace failed")
		return domain.ShowState{}, err
	}
	s.broadcastReplaced(updated)
	log.Info().Int("showVersion", updated.ShowVersion).Msg("ImportBundle succeeded")
	return updated, nil
}

func (s *Service) ExportBundle(ctx context.Context) ([]byte, error) {
	log.Debug().Msg("ExportBundle start")
	state, err := s.store.GetState(ctx)
	if err != nil {
		log.Error().Err(err).Msg("ExportBundle get state failed")
		return nil, err
	}
	data, err := assets.Pack(state, s.blobs)
	if err != nil {
		log.Error().Err(err).Msg("ExportBundle pack failed")
		return nil, err
	}
	log.Info().Int("bytes", len(data)).Msg("ExportBundle succeeded")
	return data, nil
}

func (s *Service) ImportXMLUsers(ctx context.Context, xml string) ([]importing.Team, error) {
	log.Debug().Int("xmlLen", len(xml)).Msg("ImportXMLUsers start")
	contest, err := importing.Parse([]byte(xml))
	if err != nil {
		log.Warn().Err(err).Msg("ImportXMLUsers parse failed")
		return nil, err
	}
	teams := append([]importing.Team{}, contest.Teams...)
	sort.Slice(teams, func(i, j int) bool { return teams[i].ID < teams[j].ID })
	log.Info().Int("teamCount", len(teams)).Msg("ImportXMLUsers succeeded")
	return teams, nil
}

func (s *Service) SetTimelineMode(ctx context.Context, showVersion int, mode domain.TimelineMode) (domain.ShowState, error) {
	log.Debug().Int("showVersion", showVersion).Str("mode", string(mode)).Msg("SetTimelineMode start")
	if mode != domain.TimelineRw && mode != domain.TimelineRo {
		log.Warn().Str("mode", string(mode)).Msg("SetTimelineMode unknown mode")
		return domain.ShowState{}, fmt.Errorf("unknown timeline mode %q", mode)
	}
	updated, err := s.store.MutateShow(ctx, showVersion, func(st domain.ShowState) domain.ShowState {
		st.TimelineMode = mode
		return st
	})
	if err != nil {
		if errors.Is(err, domain.ErrVersionDrift) {
			log.Warn().Err(err).Int("showVersion", showVersion).Msg("SetTimelineMode version drift")
		} else {
			log.Error().Err(err).Int("showVersion", showVersion).Str("mode", string(mode)).Msg("SetTimelineMode failed")
		}
		return domain.ShowState{}, err
	}
	s.broadcastReplaced(updated)
	log.Info().Str("mode", string(mode)).Int("showVersion", updated.ShowVersion).Msg("SetTimelineMode succeeded")
	return updated, nil
}

func BuildShowFromXML(xml []byte, excluded []string, showVersion int) domain.ShowState {
	log.Debug().Int("xmlLen", len(xml)).Int("showVersion", showVersion).Msg("BuildShowFromXML start")
	resolution, err := importing.Convert(xml, excluded)
	if err != nil {
		log.Warn().Err(err).Msg("BuildShowFromXML convert failed using empty show")
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
	log.Info().Int("showVersion", showVersion).Int("events", len(events)).Msg("BuildShowFromXML succeeded")
	return state
}
