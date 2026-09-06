package show

import (
	"context"
	"fmt"

	"tgb-resolver/server/features/shared/domain"
	showv1 "tgb-resolver/server/proto/gen/show/v1"
)

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
