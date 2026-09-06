package realtime

import (
	"context"
	"net/http"
	"sync"
	"time"

	"github.com/coder/websocket"
	"github.com/rs/zerolog/log"
	"google.golang.org/protobuf/proto"

	showv1 "tgb-resolver/server/proto/gen/show/v1"
)

const broadcastWriteTimeout = 5 * time.Second

type Hub struct {
	mu    sync.Mutex
	conns map[*websocket.Conn]bool
	clock *Clock
}

func NewHub(clock *Clock) *Hub {
	return &Hub{conns: map[*websocket.Conn]bool{}, clock: clock}
}

func (h *Hub) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	log.Debug().Str("remote", r.RemoteAddr).Msg("Hub ServeHTTP start")
	c, err := websocket.Accept(w, r, &websocket.AcceptOptions{
		OriginPatterns: []string{"*"},
	})
	if err != nil {
		log.Error().Err(err).Msg("websocket accept failed")
		return
	}
	defer c.CloseNow()
	h.mu.Lock()
	h.conns[c] = true
	conns := len(h.conns)
	h.mu.Unlock()
	log.Info().Str("remote", r.RemoteAddr).Int("conns", conns).Msg("Hub client connected")
	defer func() {
		h.mu.Lock()
		delete(h.conns, c)
		remaining := len(h.conns)
		h.mu.Unlock()
		log.Info().Str("remote", r.RemoteAddr).Int("conns", remaining).Msg("Hub client disconnected")
	}()

	for {
		_, data, err := c.Read(r.Context())
		if err != nil {
			log.Debug().Err(err).Str("remote", r.RemoteAddr).Msg("Hub read closed")
			return
		}
		var req showv1.ClockSyncRequest
		if err := proto.Unmarshal(data, &req); err != nil {
			log.Warn().Err(err).Msg("Hub unmarshal ClockSyncRequest failed")
			continue
		}
		resp := h.HandleSyncClock(req.ClientTimeUnixMs)
		out, err := proto.Marshal(resp)
		if err != nil {
			log.Error().Err(err).Msg("Hub marshal ClockSyncResponse failed")
			continue
		}
		if err := c.Write(r.Context(), websocket.MessageBinary, out); err != nil {
			log.Debug().Err(err).Msg("Hub write ClockSyncResponse failed")
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
	log.Debug().Str("type", env.Type).Msg("Hub Broadcast start")
	data, err := proto.Marshal(env)
	if err != nil {
		log.Error().Err(err).Str("type", env.Type).Msg("marshal broadcast envelope")
		return
	}
	h.mu.Lock()
	defer h.mu.Unlock()
	if len(h.conns) == 0 {
		log.Debug().Str("type", env.Type).Msg("Hub Broadcast no conns")
		return
	}
	failed := 0
	for c := range h.conns {
		ctx, cancel := context.WithTimeout(context.Background(), broadcastWriteTimeout)
		err := c.Write(ctx, websocket.MessageBinary, data)
		cancel()
		if err != nil {
			failed++
			delete(h.conns, c)
			_ = c.Close(websocket.StatusGoingAway, "broadcast failed")
		}
	}
	if failed > 0 {
		log.Warn().Str("type", env.Type).Int("failed", failed).Int("remaining", len(h.conns)).Msg("Hub Broadcast partial failure")
	} else {
		log.Debug().Str("type", env.Type).Int("conns", len(h.conns)).Msg("Hub Broadcast succeeded")
	}
}
