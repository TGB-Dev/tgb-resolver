package realtime

import (
	"testing"
	"time"
)

func TestHandleSyncClockEchoesClientTime(t *testing.T) {
	fixed := time.UnixMilli(1782734400050)
	c := NewClock(func() time.Time { return fixed })
	hub := NewHub(c)
	resp := hub.HandleSyncClock(1782734400000)
	if resp.ClientTimeUnixMs != 1782734400000 {
		t.Fatalf("want client time echoed got %d", resp.ClientTimeUnixMs)
	}
	if resp.ReceivedAtUnixMs != 1782734400050 || resp.TransmittedAtUnixMs != 1782734400050 {
		t.Fatalf("want server times from clock got %+v", resp)
	}
}
