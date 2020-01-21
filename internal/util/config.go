package util

import (
	"strings"

	"github.com/spf13/viper"
)

func SetupConfig(cmd string) (*viper.Viper, error) {
	cfg := viper.New()
	cfg.Set("cmd", cmd)

	// Config file
	cfg.SetConfigName(cmd)
	cfg.AddConfigPath("$HOME/.cfg")
	if err := cfg.ReadInConfig(); err != nil {
		return nil, err
	}

	// Environment variables
	cfg.SetEnvPrefix(cmd)
	cfg.SetEnvKeyReplacer(strings.NewReplacer("-", "_", ".", "_"))
	cfg.AutomaticEnv()

	return cfg, nil
}
