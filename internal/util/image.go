package util

import (
	"errors"

	"github.com/artifacthub/hub/internal/img"
	"github.com/artifacthub/hub/internal/img/pg"
	"github.com/spf13/viper"
	"golang.org/x/time/rate"
)

// SetupImageStore creates a new image store based on the configuration provided.
func SetupImageStore(
	cfg *viper.Viper,
	db pg.DB,
	hc img.HTTPClient,
	githubRL *rate.Limiter,
) (img.Store, error) {
	imageStore := cfg.GetString("tracker.imageStore")
	switch imageStore {
	case "pg":
		return pg.NewImageStore(cfg, db, hc, githubRL), nil
	default:
		return nil, errors.New("invalid image store")
	}
}
