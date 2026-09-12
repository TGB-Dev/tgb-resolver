package realtime

import (
	"context"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"tgb-resolver/server/features/shared/logging"
	"time"

	"github.com/coder/websocket"
	"google.golang.org/protobuf/proto"

	showv1 "tgb-resolver/server/proto/gen/show/v1"
)

func TestBroadcast_ConcurrentWritesReachAllClients(t *testing.T) {
	hub := NewHub(NewClock(nil), func(token string) (string, error) { return token, nil }, logging.Discard())
	server := httptest.NewServer(hub)
	defer server.Close()

	url := "ws" + strings.TrimPrefix(server.URL, "http")
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	const clients = 2
	const messages = 20

	conns := make([]*websocket.Conn, 0, clients)
	for i := 0; i < clients; i++ {
		c, _, err := websocket.Dial(ctx, url+"/hubs/show", nil)
		if err != nil {
			t.Fatalf("dial client %d: %v", i, err)
		}
		defer c.CloseNow()
		conns = append(conns, c)
	}

	var wg sync.WaitGroup
	for i := range messages {
		wg.Add(1)
		go func(version int32) {
			defer wg.Done()
			hub.Broadcast(&showv1.Envelope{
				Type: "ShowReplaced",
				Payload: &showv1.Envelope_ShowReplaced{
					ShowReplaced: &showv1.ShowReplaced{ShowVersion: version},
				},
			})
		}(int32(i + 1))
	}
	wg.Wait()

	for i, c := range conns {
		seen := map[int32]bool{}
		for j := 0; j < messages; j++ {
			_, data, err := c.Read(ctx)
			if err != nil {
				t.Fatalf("client %d read %d: %v", i, j, err)
			}
			var env showv1.Envelope
			if err := proto.Unmarshal(data, &env); err != nil {
				t.Fatalf("client %d unmarshal %d: %v", i, j, err)
			}
			payload, ok := env.Payload.(*showv1.Envelope_ShowReplaced)
			if !ok {
				t.Fatalf("client %d message %d wrong payload %T", i, j, env.Payload)
			}
			seen[payload.ShowReplaced.ShowVersion] = true
		}
		if len(seen) != messages {
			t.Fatalf("client %d got %d/%d distinct versions", i, len(seen), messages)
		}
	}
}
