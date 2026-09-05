package realtime

import (
	"container/heap"
	"fmt"
	"sync"
	"time"
)

var AllowedTickRates = []float64{1, 10, 20, 30, 60}

const defaultTickRate = 30.0

type scheduledOp struct {
	id int64
	at time.Time
	fn func()
}

type opHeap []*scheduledOp

func (h opHeap) Len() int           { return len(h) }
func (h opHeap) Less(i, j int) bool { return h[i].at.Before(h[j].at) }
func (h opHeap) Swap(i, j int)      { h[i], h[j] = h[j], h[i] }
func (h *opHeap) Push(x any)        { *h = append(*h, x.(*scheduledOp)) }
func (h *opHeap) Pop() any {
	old := *h
	n := len(old)
	op := old[n-1]
	*h = old[:n-1]
	return op
}

type Clock struct {
	mu     sync.Mutex
	rate   float64
	pq     opHeap
	now    func() time.Time
	ticker *time.Ticker
	stop   chan struct{}
	nextID int64
	cancel map[int64]bool
}

func NewClock(now func() time.Time) *Clock {
	if now == nil {
		now = time.Now
	}
	return &Clock{rate: defaultTickRate, now: now, cancel: map[int64]bool{}}
}

func (c *Clock) TickRate() float64 {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.rate
}

func (c *Clock) Period() time.Duration {
	return time.Duration(float64(time.Second) / c.TickRate())
}

func (c *Clock) Now() time.Time {
	return c.now()
}

func (c *Clock) ScheduleIn(d time.Duration, fn func()) int64 {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.nextID++
	heap.Push(&c.pq, &scheduledOp{id: c.nextID, at: c.now().Add(d), fn: fn})
	return c.nextID
}

func (c *Clock) Cancel(ticket int64) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.cancel[ticket] = true
}

func (c *Clock) SetTickRate(rate float64) error {
	allowed := false
	for _, r := range AllowedTickRates {
		if r == rate {
			allowed = true
			break
		}
	}
	if !allowed {
		return fmt.Errorf("tick rate %v not in allowed set", rate)
	}
	c.mu.Lock()
	defer c.mu.Unlock()
	c.rate = rate
	if c.ticker != nil {
		c.ticker.Reset(time.Duration(float64(time.Second) / rate))
	}
	return nil
}

func (c *Clock) ProcessDue() {
	for {
		var op *scheduledOp
		func() {
			c.mu.Lock()
			defer c.mu.Unlock()
			if c.pq.Len() == 0 || c.pq[0].at.After(c.now()) {
				return
			}
			candidate := heap.Pop(&c.pq).(*scheduledOp)
			if c.cancel[candidate.id] {
				delete(c.cancel, candidate.id)
				return
			}
			op = candidate
		}()
		if op == nil {
			return
		}
		func() {
			defer func() { _ = recover() }()
			op.fn()
		}()
	}
}

func (c *Clock) Start() {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.ticker != nil {
		return
	}
	c.ticker = time.NewTicker(time.Duration(float64(time.Second) / c.rate))
	c.stop = make(chan struct{})
	go func() {
		for {
			select {
			case <-c.stop:
				return
			case <-c.ticker.C:
				c.ProcessDue()
			}
		}
	}()
}

func (c *Clock) Stop() {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.ticker == nil {
		return
	}
	c.ticker.Stop()
	close(c.stop)
	c.ticker = nil
}
