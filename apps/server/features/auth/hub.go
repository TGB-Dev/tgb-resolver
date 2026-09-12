package auth

import (
	"context"
	"encoding/json"
	"net/http"
	"sync"
	"time"

	"github.com/coder/websocket"

	"tgb-resolver/server/features/shared/logging"
)

const (
	HubMsgSessionsChanged = "sessions-changed"
	HubMsgJoinCodeChanged = "join-code-changed"
)

const hubWriteTimeout = 5 * time.Second

type hubMessage struct {
	Type string `json:"type"`
}

type Hub struct {
	mu     sync.Mutex
	conns  map[*websocket.Conn]string
	verify func(token string) (string, error)
}

func NewHub(verify func(token string) (string, error)) *Hub {
	return &Hub{conns: map[*websocket.Conn]string{}, verify: verify}
}

func (h *Hub) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	verify := h.verify
	if verify == nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	sessionID, err := verify(r.URL.Query().Get("token"))
	if err != nil {
		logging.For("auth").Debug().Str("remote", r.RemoteAddr).Msg("presence hub rejected connection")
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	c, err := websocket.Accept(w, r, &websocket.AcceptOptions{
		OriginPatterns: []string{"*"},
	})
	if err != nil {
		return
	}
	defer c.CloseNow()
	h.mu.Lock()
	h.conns[c] = sessionID
	h.mu.Unlock()
	defer func() {
		h.mu.Lock()
		delete(h.conns, c)
		h.mu.Unlock()
	}()
	for {
		if _, _, err := c.Read(r.Context()); err != nil {
			return
		}
	}
}

func (h *Hub) broadcast(msgType string) {
	raw, err := json.Marshal(hubMessage{Type: msgType})
	if err != nil {
		return
	}
	h.mu.Lock()
	defer h.mu.Unlock()
	for c := range h.conns {
		ctx, cancel := context.WithTimeout(context.Background(), hubWriteTimeout)
		err := c.Write(ctx, websocket.MessageText, raw)
		cancel()
		if err != nil {
			delete(h.conns, c)
			_ = c.Close(websocket.StatusGoingAway, "broadcast failed")
		}
	}
}

func (h *Hub) SessionsChanged() {
	h.broadcast(HubMsgSessionsChanged)
}

func (h *Hub) JoinCodeChanged() {
	h.broadcast(HubMsgJoinCodeChanged)
}

func (h *Hub) Online() map[string]bool {
	h.mu.Lock()
	defer h.mu.Unlock()
	online := make(map[string]bool, len(h.conns))
	for _, sid := range h.conns {
		online[sid] = true
	}
	return online
}

func (h *Hub) CloseSession(sessionID string) {
	h.mu.Lock()
	defer h.mu.Unlock()
	for c, sid := range h.conns {
		if sid == sessionID {
			delete(h.conns, c)
			_ = c.Close(4401, "session revoked")
		}
	}
}
