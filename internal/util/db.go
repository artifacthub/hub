package util

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v4"
	"github.com/jackc/pgx/v4/log/zerologadapter"
	"github.com/jackc/pgx/v4/pgxpool"
	"github.com/rs/zerolog/log"
	"github.com/spf13/viper"
)

// SetupDB creates a database connection pool using the configuration provided.
func SetupDB(cfg *viper.Viper) (*pgxpool.Pool, error) {
	// Setup pool config
	url := fmt.Sprintf("postgres://%s:%s@%s:%s/%s",
		cfg.GetString("db.user"),
		cfg.GetString("db.password"),
		cfg.GetString("db.host"),
		cfg.GetString("db.port"),
		cfg.GetString("db.database"),
	)
	poolConfig, err := pgxpool.ParseConfig(url)
	if err != nil {
		return nil, err
	}
	poolConfig.MaxConns = 50
	poolConfig.MaxConnLifetime = 30 * time.Minute
	poolConfig.HealthCheckPeriod = 30 * time.Second
	poolConfig.ConnConfig.Logger = zerologadapter.NewLogger(log.Logger)
	if cfg.GetString("env") == "dev" {
		poolConfig.ConnConfig.LogLevel = pgx.LogLevelDebug
	}

	// Create pool
	pool, err := pgxpool.ConnectConfig(context.Background(), poolConfig)
	if err != nil {
		return nil, err
	}

	return pool, nil
}
