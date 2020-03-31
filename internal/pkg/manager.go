package pkg

import (
	"context"
	"encoding/json"
	"errors"

	"github.com/artifacthub/hub/internal/hub"
	"github.com/jackc/pgx/v4"
)

// ErrNotFound indicates that the package requested was not found.
var ErrNotFound = errors.New("package not found")

// Manager provides an API to manage packages.
type Manager struct {
	db hub.DB
}

// NewManager creates a new Manager instance.
func NewManager(db hub.DB) *Manager {
	return &Manager{
		db: db,
	}
}

// GetJSON returns the package identified by the input provided as a json
// object. The json object is built by the database.
func (m *Manager) GetJSON(ctx context.Context, input *GetInput) ([]byte, error) {
	inputJSON, _ := json.Marshal(input)
	dataJSON, err := m.dbQueryJSON(ctx, "select get_package($1::jsonb)", inputJSON)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return dataJSON, nil
}

// GetStatsJSON returns a json object describing the number of packages and
// releases available in the database. The json object is built by the database.
func (m *Manager) GetStatsJSON(ctx context.Context) ([]byte, error) {
	return m.dbQueryJSON(ctx, "select get_packages_stats()")
}

// GetUpdatesJSON returns a json object with the latest packages added as well
// as those which have been updated more recently. The json object is built by
// the database.
func (m *Manager) GetUpdatesJSON(ctx context.Context) ([]byte, error) {
	return m.dbQueryJSON(ctx, "select get_packages_updates()")
}

// Register registers the package provided in the database.
func (m *Manager) Register(ctx context.Context, pkg *hub.Package) error {
	return m.dbExec(ctx, "select register_package($1::jsonb)", pkg)
}

// SearchJSON returns a json object with the search results produced by the
// input provided. The json object is built by the database.
func (m *Manager) SearchJSON(ctx context.Context, input *SearchInput) ([]byte, error) {
	inputJSON, _ := json.Marshal(input)
	return m.dbQueryJSON(ctx, "select search_packages($1::jsonb)", inputJSON)
}

// dbQueryJSON is a helper that executes the query provided and returns a bytes
// slice containing the json data returned from the database.
func (m *Manager) dbQueryJSON(ctx context.Context, query string, args ...interface{}) ([]byte, error) {
	var jsonData []byte
	if err := m.db.QueryRow(ctx, query, args...).Scan(&jsonData); err != nil {
		return nil, err
	}
	return jsonData, nil
}

// dbExec is a helper that executes the query provided encoding the argument as
// json.
func (m *Manager) dbExec(ctx context.Context, query string, arg interface{}) error {
	jsonArg, err := json.Marshal(arg)
	if err != nil {
		return err
	}
	_, err = m.db.Exec(ctx, query, jsonArg)
	return err
}

// GetInput represents the input used to get a specific package.
type GetInput struct {
	ChartRepositoryName string `json:"chart_repository_name"`
	PackageName         string `json:"package_name"`
	Version             string `json:"version"`
}

// SearchInput represents the query input when searching for packages.
type SearchInput struct {
	Limit             int               `json:"limit,omitempty"`
	Offset            int               `json:"offset,omitempty"`
	Facets            bool              `json:"facets"`
	Text              string            `json:"text"`
	PackageKinds      []hub.PackageKind `json:"package_kinds,omitempty"`
	ChartRepositories []string          `json:"chart_repositories,omitempty"`
	Deprecated        bool              `json:"deprecated"`
}
