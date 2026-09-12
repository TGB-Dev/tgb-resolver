package auth

import (
	"context"
	"encoding/json"
	"errors"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/coder/websocket"
)

func allowKnown(tokens map[string]string) func(string) (string, error) {
	return func(token string) (string, error) {
		if sid, ok := tokens[token]; ok {
			return sid, nil
		}
		return "", errors.New("bad token")
	}
}

func TestPresenceHub_RejectsMissingToken(t *testing.T) {
	hub := NewHub(allowKnown(map[string]string{"good": "s1"}))
	server := httptest.NewServer(hub)
	defer server.Close()
	url := "ws" + strings.TrimPrefix(server.URL, "http")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if _, _, err := websocket.Dial(ctx, url, nil); err == nil {
		t.Fatal("dial without token must fail")
	}
	c, _, err := websocket.Dial(ctx, url+"?token=good", nil)
	if err != nil {
		t.Fatalf("dial with token: %v", err)
	}
	c.CloseNow()
}

func TestPresenceHub_BroadcastReachesClients(t *testing.T) {
	hub := NewHub(allowKnown(map[string]string{"tok": "s1"}))
	server := httptest.NewServer(hub)
	defer server.Close()
	url := "ws" + strings.TrimPrefix(server.URL, "http")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	c, _, err := websocket.Dial(ctx, url+"?token=tok", nil)
	if err != nil {
		t.Fatal(err)
	}
	defer c.CloseNow()
	if got := hub.Online(); !got["s1"] {
		t.Fatal("session must be online while connected")
	}
	hub.JoinCodeChanged()
	_, raw, err := c.Read(ctx)
	if err != nil {
		t.Fatalf("read: %v", err)
	}
	var msg hubMessage
	if err := json.Unmarshal(raw, &msg); err != nil {
		t.Fatal(err)
	}
	if msg.Type != HubMsgJoinCodeChanged {
		t.Fatalf("want %q got %q", HubMsgJoinCodeChanged, msg.Type)
	}
	hub.CloseSession("s1")
	if _, _, err := c.Read(ctx); err == nil {
		t.Fatal("kicked conn must close")
	} else if ce := websocket.CloseStatus(err); ce != 4401 {
		t.Fatalf("want close 4401, got %v", ce)
	}
	if got := hub.Online(); got["s1"] {
		t.Fatal("session must be offline after kick")
	}
}
