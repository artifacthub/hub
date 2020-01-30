package util

import (
	"os"

	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
	"github.com/spf13/viper"
)

// SetupLogger configures the global logger using the configuration provided.
func SetupLogger(cfg *viper.Viper, fields map[string]interface{}) error {
	// Add some context to global logger
	log.Logger = log.With().Fields(fields).Logger()

	// Set log level
	level, err := zerolog.ParseLevel(cfg.GetString("log.level"))
	if err != nil {
		return err
	}
	zerolog.SetGlobalLevel(level)

	// Enable pretty logging (not JSON) if requested
	if cfg.GetBool("log.pretty") {
		log.Logger = log.Output(zerolog.ConsoleWriter{Out: os.Stderr})
	}

	return nil
}
