//go:build wireinject

package main

import (
	"github.com/google/wire"

	"tgb-resolver/server/features/assets"
	"tgb-resolver/server/features/realtime"
	"tgb-resolver/server/features/shared/config"
	"tgb-resolver/server/features/show"
)

func initApp(cfg *config.Config) (*App, func(), error) {
	panic(wire.Build(
		provideDB,
		show.NewStore,
		provideClock,
		provideBlobs,
		wire.Bind(new(show.BlobStore), new(*assets.FileStore)),
		provideHubVerifier,
		realtime.NewHub,
		show.NewService,
		provideAuth,
		NewApp,
	))
}
