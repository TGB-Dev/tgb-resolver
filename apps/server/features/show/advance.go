package show

import (
	"context"
	"time"

	"github.com/rs/zerolog/log"

	"tgb-resolver/server/features/shared/domain"
)

func (s *Service) RescheduleAdvance(ctx context.Context) error {
	log.Debug().Msg("RescheduleAdvance start")
	cur, err := s.store.GetState(ctx)
	if err != nil {
		log.Error().Err(err).Msg("RescheduleAdvance get state failed")
		return err
	}
	if cur.Playback.Status == domain.PlaybackRunning {
		s.scheduleNext(cur)
	}
	log.Debug().Str("status", string(cur.Playback.Status)).Msg("RescheduleAdvance done")
	return nil
}

func (s *Service) rearmAdvance(updated domain.ShowState) {
	if updated.Playback.Status != domain.PlaybackRunning {
		log.Debug().Str("status", string(updated.Playback.Status)).Msg("rearmAdvance skipped not running")
		return
	}
	log.Debug().Int("showVersion", updated.ShowVersion).Msg("rearmAdvance")
	s.orchestrator.CancelAdvance()
	s.scheduleNext(updated)
}

func (s *Service) scheduleNext(st domain.ShowState) {
	if st.Playback.Status != domain.PlaybackRunning || st.Playback.CurrentEventID == nil {
		log.Debug().Str("status", string(st.Playback.Status)).Msg("scheduleNext skipped")
		return
	}
	ord := ordered(st.Timeline)
	currentIndex := indexOf(ord, *st.Playback.CurrentEventID)
	if currentIndex < 0 || currentIndex >= len(ord)-1 {
		log.Debug().Int("currentEventID", *st.Playback.CurrentEventID).Msg("scheduleNext no next event")
		return
	}
	next := ord[currentIndex+1]
	if next.TriggerOffsetSeconds != nil {
		ms := int64(*next.TriggerOffsetSeconds * 1000)
		if ms < 0 {
			ms = 0
		}
		log.Debug().Int("nextEventID", next.ID).Int64("delayMs", ms).Msg("scheduleNext with trigger offset")
		s.orchestrator.ScheduleAdvance(time.Duration(ms) * time.Millisecond)
		return
	}
	if !st.Automation.FullAutoEnabled && !st.Automation.AutoResolveEnabled {
		log.Debug().Msg("scheduleNext auto disabled")
		return
	}
	if !st.Automation.FullAutoEnabled && ord[currentIndex+1].RequireManualInteraction != nil && *ord[currentIndex+1].RequireManualInteraction {
		log.Debug().Int("nextEventID", next.ID).Msg("scheduleNext manual interaction required")
		return
	}
	current := ord[currentIndex]
	delaySec := float64(st.Automation.AutoResolveSpeedMs) / 1000
	if current.DurationSeconds != nil {
		delaySec = *current.DurationSeconds
	}
	log.Debug().Int("currentEventID", current.ID).Int("nextEventID", next.ID).Float64("delaySec", delaySec).Msg("scheduleNext scheduled")
	s.orchestrator.ScheduleAdvance(time.Duration(delaySec * float64(time.Second)))
}
