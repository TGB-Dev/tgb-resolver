package auth

import (
	"context"
	"net/http"
	"sync"
	"time"

	"github.com/coder/websocket"
	"github.com/rs/zerolog"
	"google.golang.org/protobuf/proto"

	"tgb-resolver/server/features/shared/logging"
	authv1 "tgb-resolver/server/proto/gen/auth/v1"
)

const hubWriteTimeout = 5 * time.Second

type Hub struct {
	mu     sync.Mutex
	conns  map[*websocket.Conn]string
	verify func(token string) (string, error)
	log    *zerolog.Logger
}

func NewHub(verify func(token string) (string, error), logger *zerolog.Logger) *Hub {
	if logger == nil {
		logger = logging.Discard()
	}
	return &Hub{conns: map[*websocket.Conn]string{}, verify: verify, log: logger}
}

func (h *Hub) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	verify := h.verify
	if verify == nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	sessionID, err := verify(r.URL.Query().Get("token"))
	if err != nil {
		h.log.Debug().Str("remote", r.RemoteAddr).Msg("presence hub rejected connection")
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

func (h *Hub) broadcast(update *authv1.AuthUpdate) {
	raw, err := proto.Marshal(update)
	if err != nil {
		return
	}
	h.mu.Lock()
	conns := make([]*websocket.Conn, 0, len(h.conns))
	for c := range h.conns {
		conns = append(conns, c)
	}
	h.mu.Unlock()
	var failed []*websocket.Conn
	for _, c := range conns {
		ctx, cancel := context.WithTimeout(context.Background(), hubWriteTimeout)
		err := c.Write(ctx, websocket.MessageBinary, raw)
		cancel()
		if err != nil {
			failed = append(failed, c)
		}
	}
	if len(failed) > 0 {
		h.mu.Lock()
		for _, c := range failed {
			if _, ok := h.conns[c]; ok {
				delete(h.conns, c)
				_ = c.Close(websocket.StatusGoingAway, "broadcast failed")
			}
		}
		h.mu.Unlock()
	}
}

func (h *Hub) SessionsChanged() {
	h.broadcast(&authv1.AuthUpdate{
		Update: &authv1.AuthUpdate_SessionsChanged{SessionsChanged: &authv1.SessionsChanged{}},
	})
}

func (h *Hub) JoinCodeChanged() {
	h.broadcast(&authv1.AuthUpdate{
		Update: &authv1.AuthUpdate_JoinCodeChanged{JoinCodeChanged: &authv1.JoinCodeChanged{}},
	})
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
