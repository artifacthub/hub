package util

import (
	"io"
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestSetupConfig(t *testing.T) {
	t.Parallel()

	// Check config file must exist for test cmd
	cfg, err := SetupConfig("test")
	require.Error(t, err)
	require.Nil(t, cfg)

	// Create config file for test cmd in $HOME/.cfg
	dir := filepath.Join(os.Getenv("HOME"), ".cfg")
	name := filepath.Join(dir, "test.yaml")
	err = os.MkdirAll(dir, 0755)
	require.NoError(t, err)
	f, err := os.Create(name)
	require.NoError(t, err)
	defer os.Remove(name)
	_, err = io.WriteString(f, `key1: value1`)
	require.NoError(t, err)

	// Check SetupConfig now succeeds
	cfg, err = SetupConfig("test")
	require.NoError(t, err)
	require.NotNil(t, cfg)
	assert.Equal(t, "value1", cfg.GetString("key1"))

	// Check environment variables are also available in the config
	os.Setenv("TEST_KEY2", "value2")
	os.Setenv("TEST_KEY3_EXTRA", "value3")
	os.Setenv("TEST_KEY4_EXTRA", "value4")
	cfg, err = SetupConfig("test")
	require.NoError(t, err)
	assert.Equal(t, "value1", cfg.GetString("key1"))
	assert.Equal(t, "value2", cfg.GetString("key2"))
	assert.Equal(t, "value3", cfg.GetString("key3.extra"))
	assert.Equal(t, "value4", cfg.GetString("key4-extra"))
}
