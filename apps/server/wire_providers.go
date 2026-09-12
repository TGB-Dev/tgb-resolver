package main

import (
	"path/filepath"
	"time"

	"github.com/rs/zerolog"
	"github.com/uptrace/bun"

	"tgb-resolver/server/features/assets"
	"tgb-resolver/server/features/auth"
	"tgb-resolver/server/features/realtime"
	"tgb-resolver/server/features/shared/config"
	"tgb-resolver/server/features/shared/logging"
	"tgb-resolver/server/features/show"
)

func provideDB(cfg *config.Config) (*bun.DB, func(), error) {
	db, err := show.Open(filepath.Join(cfg.DataDir, "resolver.db"))
	if err != nil {
		return nil, nil, err
	}
	return db, func() { _ = db.Close() }, nil
}

func provideClock() *realtime.Clock {
	return realtime.NewClock(nil)
}

func provideBlobs(cfg *config.Config) *assets.FileStore {
	return assets.NewFileStore(cfg.DataDir)
}

func provideHubVerifier() func(token string) (string, error) {
	return nil
}

func provideHubLogger(domains *logging.Domains) *zerolog.Logger {
	return domains.Hub
}

func provideAuth(db *bun.DB, cfg *config.Config) *auth.Service {
	ttl := time.Duration(cfg.SessionTTLHours) * time.Hour
	if ttl <= 0 {
		ttl = 30 * time.Hour
	}
	return auth.NewService(db, cfg.JoinCode, ttl, time.Now)
}
