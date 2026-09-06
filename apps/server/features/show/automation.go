package show

import (
	"context"
	"errors"

	"github.com/rs/zerolog/log"

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
	log.Debug().Int("showVersion", in.ShowVersion).Msg("SetAutomation start")
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
		if errors.Is(err, domain.ErrVersionDrift) {
			log.Warn().Err(err).Int("showVersion", in.ShowVersion).Msg("SetAutomation version drift")
		} else {
			log.Error().Err(err).Int("showVersion", in.ShowVersion).Msg("SetAutomation failed")
		}
		return domain.ShowState{}, err
	}
	if updated.Playback.Status == domain.PlaybackRunning {
		s.orchestrator.CancelAdvance()
		s.scheduleNext(updated)
	}
	s.broadcastReplaced(updated)
	log.Info().Int("showVersion", updated.ShowVersion).Msg("SetAutomation succeeded")
	return updated, nil
}

func (s *Service) SetSettings(ctx context.Context, showVersion int, tickRate *float64) (domain.ShowState, error) {
	log.Debug().Int("showVersion", showVersion).Msg("SetSettings start")
	updated, err := s.store.MutateShow(ctx, showVersion, func(st domain.ShowState) domain.ShowState {
		st.TickRate = tickRate
		return st
	})
	if err != nil {
		if errors.Is(err, domain.ErrVersionDrift) {
			log.Warn().Err(err).Int("showVersion", showVersion).Msg("SetSettings version drift")
		} else {
			log.Error().Err(err).Int("showVersion", showVersion).Msg("SetSettings failed")
		}
		return domain.ShowState{}, err
	}
	if err := s.SetTickRate(tickRate); err != nil {
		log.Error().Err(err).Msg("SetSettings SetTickRate failed")
		return domain.ShowState{}, err
	}
	s.broadcastReplaced(updated)
	log.Info().Int("showVersion", updated.ShowVersion).Msg("SetSettings succeeded")
	return updated, nil
}

func (s *Service) SetTickRate(tickRate *float64) error {
	log.Debug().Msg("SetTickRate start")
	rate := realtime.DefaultTickRateValue()
	if tickRate != nil {
		rate = *tickRate
	}
	if err := s.clock.SetTickRate(rate); err != nil {
		log.Error().Err(err).Float64("tickRate", rate).Msg("SetTickRate failed")
		return err
	}
	log.Info().Float64("tickRate", rate).Msg("SetTickRate succeeded")
	return nil
}
