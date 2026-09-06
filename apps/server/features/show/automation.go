package show

import (
	"context"

	"tgb-resolver/server/features/realtime"
	"tgb-resolver/server/features/shared/domain"
)

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
