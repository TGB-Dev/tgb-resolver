package realtime

import (
	"sync"
	"time"

	"github.com/rs/zerolog/log"
)

type Orchestrator struct {
	mu      sync.Mutex
	clock   *Clock
	tickets map[int64]bool
	advance func()
}

func NewOrchestrator(clock *Clock, advance func()) *Orchestrator {
	return &Orchestrator{clock: clock, tickets: map[int64]bool{}, advance: advance}
}

func (o *Orchestrator) ScheduleAdvance(delay time.Duration) {
	log.Debug().Dur("delay", delay).Msg("Orchestrator ScheduleAdvance start")
	ticket := o.clock.ScheduleIn(delay, func() { o.advance() })
	o.mu.Lock()
	defer o.mu.Unlock()
	o.tickets[ticket] = true
	log.Info().Int64("ticket", ticket).Dur("delay", delay).Int("pending", len(o.tickets)).Msg("Orchestrator ScheduleAdvance scheduled")
}

func (o *Orchestrator) CancelAdvance() {
	o.mu.Lock()
	defer o.mu.Unlock()
	if len(o.tickets) == 0 {
		log.Debug().Msg("Orchestrator CancelAdvance no tickets")
		return
	}
	count := len(o.tickets)
	for ticket := range o.tickets {
		o.clock.Cancel(ticket)
	}
	o.tickets = map[int64]bool{}
	log.Info().Int("cancelled", count).Msg("Orchestrator CancelAdvance cancelled")
}
