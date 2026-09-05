package logging

import (
	"os"

	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
)

func Setup(debug bool) {
	if debug {
		log.Logger = log.Output(zerolog.ConsoleWriter{Out: os.Stderr})
		zerolog.SetGlobalLevel(zerolog.DebugLevel)
	} else {
		zerolog.SetGlobalLevel(zerolog.InfoLevel)
	}
}
