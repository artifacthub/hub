package util

import (
	"errors"

	"github.com/cncf/hub/internal/img"
	"github.com/cncf/hub/internal/img/pg"
	"github.com/spf13/viper"
)

// SetupImageStore creates a new image store based on the configuration provided.
func SetupImageStore(cfg *viper.Viper, db pg.DB) (img.Store, error) {
	imageStore := cfg.GetString("tracker.imageStore")
	switch imageStore {
	case "pg":
		return pg.NewImageStore(db), nil
	default:
		return nil, errors.New("invalid image store")
	}
}
