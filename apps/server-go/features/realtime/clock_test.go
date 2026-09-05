package realtime

import (
	"sync/atomic"
	"testing"
	"time"
)

func TestSetTickRateRejectsBadRate(t *testing.T) {
	c := NewClock(nil)
	if err := c.SetTickRate(12345); err == nil {
		t.Fatal("want error for bad tick rate")
	}
}

func TestScheduleInFiresAfterDelay(t *testing.T) {
	now := time.Now()
	c := NewClock(func() time.Time { return now })
	var fired atomic.Int32
	c.ScheduleIn(10*time.Millisecond, func() { fired.Add(1) })
	now = now.Add(20 * time.Millisecond)
	c.ProcessDue()
	if fired.Load() != 1 {
		t.Fatalf("want 1 fire got %d", fired.Load())
	}
}

func TestCancelSuppressesFire(t *testing.T) {
	now := time.Now()
	c := NewClock(func() time.Time { return now })
	var fired atomic.Int32
	ticket := c.ScheduleIn(10*time.Millisecond, func() { fired.Add(1) })
	c.Cancel(ticket)
	now = now.Add(20 * time.Millisecond)
	c.ProcessDue()
	if fired.Load() != 0 {
		t.Fatalf("want 0 fires got %d", fired.Load())
	}
}
