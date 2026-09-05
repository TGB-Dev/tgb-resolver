package main

import (
	"path/filepath"

	"github.com/uptrace/bun"

	"tgb-resolver/server-go/features/assets"
	"tgb-resolver/server-go/features/realtime"
	"tgb-resolver/server-go/features/shared/config"
	"tgb-resolver/server-go/features/show"
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
