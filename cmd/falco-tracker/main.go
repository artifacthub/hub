package main

import (
	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/tracker"
	"github.com/artifacthub/hub/internal/tracker/falco"
	"github.com/rs/zerolog/log"
)

func main() {
	if err := tracker.Run(falco.NewTracker, "falco-tracker", hub.Falco); err != nil {
		log.Fatal().Err(err).Send()
	}
}
