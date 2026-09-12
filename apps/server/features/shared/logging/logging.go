package logging

import (
	"io"
	"os"
	"time"

	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
)

func Setup(debug bool) {
	zerolog.TimeFieldFormat = time.RFC3339
	log.Logger = log.Output(zerolog.ConsoleWriter{Out: os.Stderr, TimeFormat: time.RFC3339})
	if debug {
		zerolog.SetGlobalLevel(zerolog.DebugLevel)
	} else {
		zerolog.SetGlobalLevel(zerolog.InfoLevel)
	}
}

func For(domain string) *zerolog.Logger {
	logger := log.With().Str("component", domain).Logger()
	return &logger
}

type Domains struct {
	Auth *zerolog.Logger
	Hub  *zerolog.Logger
}

func ProvideDomains() *Domains {
	return &Domains{Auth: For("auth"), Hub: For("hub")}
}

func Discard() *zerolog.Logger {
	logger := zerolog.New(io.Discard)
	return &logger
}
