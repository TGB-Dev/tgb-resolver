package realtime

import (
	"sync"
	"time"
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
	ticket := o.clock.ScheduleIn(delay, func() { o.advance() })
	o.mu.Lock()
	defer o.mu.Unlock()
	o.tickets[ticket] = true
}

func (o *Orchestrator) CancelAdvance() {
	o.mu.Lock()
	defer o.mu.Unlock()
	for ticket := range o.tickets {
		o.clock.Cancel(ticket)
	}
	o.tickets = map[int64]bool{}
}
