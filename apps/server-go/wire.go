//go:build wireinject

package main

import (
	"github.com/google/wire"
	"tgb-resolver/server-go/features/shared/config"
)

func initApp() (*App, error) {
	panic(wire.Build(config.Load, NewApp))
}
