package util

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/url"
	"time"

	"github.com/artifacthub/hub/internal/hub"
	"github.com/jackc/pgx/v4"
	"github.com/jackc/pgx/v4/log/zerologadapter"
	"github.com/jackc/pgx/v4/pgxpool"
	"github.com/rs/zerolog/log"
	"github.com/spf13/viper"
)

const (
	// DBLockKeyUpdatePackagesViews represents the lock key used when updating
	// the packages views counters in the database.
	DBLockKeyUpdatePackagesViews = 1
)

var (
	// ErrDBInsufficientPrivilege indicates that the user does not have the
	// required privilege to perform the operation.
	ErrDBInsufficientPrivilege = errors.New("ERROR: insufficient_privilege (SQLSTATE 42501)")
)

// SetupDB creates a database connection pool using the configuration provided.
func SetupDB(cfg *viper.Viper) (*pgxpool.Pool, error) {
	// Setup pool config
	url := fmt.Sprintf("postgres://%s:%s@%s:%s/%s",
		url.QueryEscape(cfg.GetString("db.user")),
		url.QueryEscape(cfg.GetString("db.password")),
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
	poolConfig.ConnConfig.LogLevel = pgx.LogLevelWarn

	// Create pool
	pool, err := pgxpool.ConnectConfig(context.Background(), poolConfig)
	if err != nil {
		return nil, err
	}

	return pool, nil
}

// DBTransact is a helper function that wraps some database transactions taking
// care of committing and rolling back when needed.
func DBTransact(ctx context.Context, db hub.DB, txFunc func(pgx.Tx) error) (err error) {
	tx, err := db.Begin(ctx)
	if err != nil {
		return
	}
	defer func() {
		p := recover()
		switch {
		case p != nil:
			_ = tx.Rollback(ctx)
			panic(p)
		case err != nil:
			_ = tx.Rollback(ctx)
		default:
			err = tx.Commit(ctx)
		}
	}()
	err = txFunc(tx)
	return err
}

// DBQueryJSON is a helper that executes the query provided and returns a bytes
// slice containing the json data returned from the database.
func DBQueryJSON(ctx context.Context, db hub.DB, query string, args ...interface{}) ([]byte, error) {
	var dataJSON []byte
	if err := db.QueryRow(ctx, query, args...).Scan(&dataJSON); err != nil {
		if err.Error() == ErrDBInsufficientPrivilege.Error() {
			return nil, hub.ErrInsufficientPrivilege
		}
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, hub.ErrNotFound
		}
		return nil, err
	}
	return dataJSON, nil
}

// DBQueryJSONWithPagination is a helper that executes the query provided and
// returns a JSONQueryResult instance containing the json data returned from
// the database.
func DBQueryJSONWithPagination(
	ctx context.Context,
	db hub.DB,
	query string,
	args ...interface{},
) (*hub.JSONQueryResult, error) {
	var dataJSON []byte
	var totalCount int
	if err := db.QueryRow(ctx, query, args...).Scan(&dataJSON, &totalCount); err != nil {
		if err.Error() == ErrDBInsufficientPrivilege.Error() {
			return nil, hub.ErrInsufficientPrivilege
		}
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, hub.ErrNotFound
		}
		return nil, err
	}
	return &hub.JSONQueryResult{
		Data:       dataJSON,
		TotalCount: totalCount,
	}, nil
}

// DBQueryUnmarshal is a helper that executes the query provided and unmarshals
// the json data returned from the database into the value (v) provided.
func DBQueryUnmarshal(ctx context.Context, db hub.DB, v interface{}, query string, args ...interface{}) error {
	dataJSON, err := DBQueryJSON(ctx, db, query, args...)
	if err != nil {
		return err
	}
	return json.Unmarshal(dataJSON, &v)
}
