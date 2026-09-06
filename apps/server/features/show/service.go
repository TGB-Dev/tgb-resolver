package show

import (
	"context"

	"tgb-resolver/server/features/realtime"
)

type BlobStore interface {
	Save(id string, data []byte) error
	Read(id string) ([]byte, error)
	Delete(id string) error
}

type Service struct {
	store        *Store
	hub          *realtime.Hub
	clock        *realtime.Clock
	blobs        BlobStore
	orchestrator *realtime.Orchestrator
}

func NewService(store *Store, hub *realtime.Hub, clock *realtime.Clock, blobs BlobStore) *Service {
	s := &Service{store: store, hub: hub, clock: clock, blobs: blobs}
	s.orchestrator = realtime.NewOrchestrator(clock, func() {
		if _, err := s.Advance(context.Background()); err != nil {
			_ = s.RescheduleAdvance(context.Background())
		}
	})
	return s
}
