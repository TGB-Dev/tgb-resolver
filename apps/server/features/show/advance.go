package show

import (
	"context"
	"time"

	"tgb-resolver/server/features/shared/domain"
)

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
