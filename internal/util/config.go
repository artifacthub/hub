package util

import (
	"strings"

	"github.com/spf13/viper"
)

// SetupConfig creates a new Viper instance to handle the configuration for a
// particular cmd. Configuration can be provided in a config file or using env
// variables. See configs folder for some examples.
func SetupConfig(cmd string) (*viper.Viper, error) {
	cfg := viper.New()
	cfg.Set("cmd", cmd)

	// Config file
	cfg.SetConfigName(cmd)
	cfg.AddConfigPath("$HOME/.cfg")
	cfg.AddConfigPath("/artifacthub/.cfg")
	if err := cfg.ReadInConfig(); err != nil {
		return nil, err
	}

	// Environment variables
	cfg.SetEnvPrefix(cmd)
	cfg.SetEnvKeyReplacer(strings.NewReplacer("-", "_", ".", "_"))
	cfg.AutomaticEnv()

	return cfg, nil
}
