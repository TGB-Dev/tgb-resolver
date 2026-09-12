package realtime

import (
	"context"
	"errors"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/coder/websocket"
)

func TestHandleSyncClockEchoesClientTime(t *testing.T) {
	fixed := time.UnixMilli(1782734400050)
	c := NewClock(func() time.Time { return fixed })
	hub := NewHub(c, nil)
	resp := hub.HandleSyncClock(1782734400000)
	if resp.ClientTimeUnixMs != 1782734400000 {
		t.Fatalf("want client time echoed got %d", resp.ClientTimeUnixMs)
	}
	if resp.ReceivedAtUnixMs != 1782734400050 || resp.TransmittedAtUnixMs != 1782734400050 {
		t.Fatalf("want server times from clock got %+v", resp)
	}
}

func allowKnown(tokens map[string]string) func(string) (string, error) {
	return func(token string) (string, error) {
		if sid, ok := tokens[token]; ok {
			return sid, nil
		}
		return "", errors.New("bad token")
	}
}

func TestServeHTTP_RejectsMissingToken(t *testing.T) {
	hub := NewHub(NewClock(nil), allowKnown(map[string]string{"good": "s1"}))
	server := httptest.NewServer(hub)
	defer server.Close()
	url := "ws" + strings.TrimPrefix(server.URL, "http")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if _, _, err := websocket.Dial(ctx, url, nil); err == nil {
		t.Fatal("dial without token must fail")
	}
	if _, _, err := websocket.Dial(ctx, url+"?token=bad", nil); err == nil {
		t.Fatal("dial with bad token must fail")
	}
	c, _, err := websocket.Dial(ctx, url+"?token=good", nil)
	if err != nil {
		t.Fatalf("dial with token: %v", err)
	}
	c.CloseNow()
}

func TestCloseSession_KicksOnlyTarget(t *testing.T) {
	hub := NewHub(NewClock(nil), allowKnown(map[string]string{"tok-a": "a", "tok-b": "b"}))
	server := httptest.NewServer(hub)
	defer server.Close()
	url := "ws" + strings.TrimPrefix(server.URL, "http")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	ca, _, err := websocket.Dial(ctx, url+"?token=tok-a", nil)
	if err != nil {
		t.Fatal(err)
	}
	defer ca.CloseNow()
	cb, _, err := websocket.Dial(ctx, url+"?token=tok-b", nil)
	if err != nil {
		t.Fatal(err)
	}
	defer cb.CloseNow()

	hub.CloseSession("a")
	if _, _, err := ca.Read(ctx); err == nil {
		t.Fatal("kicked conn must close")
	} else if ce := websocket.CloseStatus(err); ce != 4401 {
		t.Fatalf("want close 4401, got %v", ce)
	}
	if err := cb.Write(ctx, websocket.MessageBinary, []byte{1}); err != nil {
		t.Fatalf("survivor write: %v", err)
	}
}
