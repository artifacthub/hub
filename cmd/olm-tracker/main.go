package main

import (
	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/tracker"
	"github.com/artifacthub/hub/internal/tracker/olm"
	"github.com/rs/zerolog/log"
)

func main() {
	if err := tracker.Run(olm.NewTracker, "olm-tracker", hub.OLM); err != nil {
		log.Fatal().Err(err).Send()
	}
}
