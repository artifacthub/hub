package main

import (
	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/tracker"
	"github.com/artifacthub/hub/internal/tracker/opa"
	"github.com/rs/zerolog/log"
)

func main() {
	if err := tracker.Run(opa.NewTracker, "opa-tracker", hub.OPA); err != nil {
		log.Fatal().Err(err).Send()
	}
}
