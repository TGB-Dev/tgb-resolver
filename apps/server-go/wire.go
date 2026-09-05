//go:build wireinject

package main

import (
	"github.com/google/wire"

	"tgb-resolver/server-go/features/assets"
	"tgb-resolver/server-go/features/realtime"
	"tgb-resolver/server-go/features/shared/config"
	"tgb-resolver/server-go/features/show"
)

func initApp(cfg *config.Config) (*App, func(), error) {
	panic(wire.Build(
		provideDB,
		show.NewStore,
		provideClock,
		provideBlobs,
		wire.Bind(new(show.BlobStore), new(*assets.FileStore)),
		realtime.NewHub,
		show.NewService,
		NewApp,
	))
}
