package main

import (
	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/tracker"
	"github.com/artifacthub/hub/internal/tracker/helm"
	"github.com/rs/zerolog/log"
)

func main() {
	if err := tracker.Run(helm.NewTracker, "helm-tracker", hub.Helm); err != nil {
		log.Fatal().Err(err).Send()
	}
}
