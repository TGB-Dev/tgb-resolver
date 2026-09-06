package realtime

import (
	"testing"

	showv1 "tgb-resolver/server/proto/gen/show/v1"
)

func TestEnvelopeRoundTrip(t *testing.T) {
	env := &showv1.Envelope{Type: "PlaybackStateChanged"}
	if env.GetType() != "PlaybackStateChanged" {
		t.Fatalf("bad type %s", env.GetType())
	}
}
