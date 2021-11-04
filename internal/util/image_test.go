package util

import (
	"testing"

	"github.com/spf13/viper"
	"github.com/stretchr/testify/require"
)

func TestSetupImageStore(t *testing.T) {
	t.Parallel()

	// Check a valid image store provider must be provided
	cfg := viper.New()
	cfg.Set("images.store", "invalid")
	imageStore, err := SetupImageStore(cfg, nil, nil)
	require.Error(t, err)
	require.Nil(t, imageStore)

	// Check image store was setup successfully
	cfg = viper.New()
	cfg.Set("images.store", "pg")
	imageStore, err = SetupImageStore(cfg, nil, nil)
	require.NoError(t, err)
	require.NotNil(t, imageStore)
}
