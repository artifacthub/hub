package util

import (
	"testing"

	"github.com/rs/zerolog"
	"github.com/spf13/viper"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestSetupLogger(t *testing.T) {
	t.Parallel()

	// Check a valid log level must be provided
	cfg := viper.New()
	cfg.Set("log.level", "invalid")
	err := SetupLogger(cfg, nil)
	require.Error(t, err)

	// Check global logger was configured successfully
	cfg = viper.New()
	cfg.Set("log.level", "debug")
	cfg.Set("log.pretty", true)
	fields := map[string]interface{}{
		"key1": "value1",
		"key2": "value2",
	}
	err = SetupLogger(cfg, fields)
	require.NoError(t, err)
	assert.Equal(t, zerolog.DebugLevel, zerolog.GlobalLevel())
}
