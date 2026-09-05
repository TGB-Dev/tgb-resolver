package realtime

import (
	"context"
	"net/http"
	"sync"

	"github.com/coder/websocket"
	"github.com/rs/zerolog/log"
	"google.golang.org/protobuf/proto"

	showv1 "tgb-resolver/server-go/proto/gen/show/v1"
)

type Hub struct {
	mu    sync.Mutex
	conns map[*websocket.Conn]bool
	clock *Clock
}

func NewHub(clock *Clock) *Hub {
	return &Hub{conns: map[*websocket.Conn]bool{}, clock: clock}
}

func (h *Hub) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	c, err := websocket.Accept(w, r, nil)
	if err != nil {
		return
	}
	defer c.CloseNow()
	h.mu.Lock()
	h.conns[c] = true
	h.mu.Unlock()
	defer func() {
		h.mu.Lock()
		delete(h.conns, c)
		h.mu.Unlock()
	}()

	for {
		_, data, err := c.Read(r.Context())
		if err != nil {
			return
		}
		var req showv1.ClockSyncRequest
		if err := proto.Unmarshal(data, &req); err != nil {
			continue
		}
		resp := h.HandleSyncClock(req.ClientTimeUnixMs)
		out, err := proto.Marshal(resp)
		if err != nil {
			continue
		}
		if err := c.Write(r.Context(), websocket.MessageBinary, out); err != nil {
			return
		}
	}
}

func (h *Hub) HandleSyncClock(clientTimeUnixMs int64) *showv1.ClockSyncResponse {
	now := h.clock.Now().UnixMilli()
	return &showv1.ClockSyncResponse{
		ClientTimeUnixMs: clientTimeUnixMs,
		ReceivedAtUnixMs: now, TransmittedAtUnixMs: h.clock.Now().UnixMilli(),
	}
}

func (h *Hub) Broadcast(env *showv1.Envelope) {
	data, err := proto.Marshal(env)
	if err != nil {
		log.Error().Err(err).Msg("marshal broadcast envelope")
		return
	}
	h.mu.Lock()
	conns := make([]*websocket.Conn, 0, len(h.conns))
	for c := range h.conns {
		conns = append(conns, c)
	}
	h.mu.Unlock()
	for _, c := range conns {
		if err := c.Write(context.Background(), websocket.MessageBinary, data); err != nil {
			h.mu.Lock()
			delete(h.conns, c)
			h.mu.Unlock()
		}
	}
}
