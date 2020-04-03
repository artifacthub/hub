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
	query := "select get_package($1::uuid, $2::jsonb)"
	userID := getUserID(ctx)
	inputJSON, _ := json.Marshal(input)
	dataJSON, err := m.dbQueryJSON(ctx, query, userID, inputJSON)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return dataJSON, nil
}

// GetStarredByUserJSON returns a json object with packages starred by the user
// doing the request. The json object is built by the database.
func (m *Manager) GetStarredByUserJSON(ctx context.Context) ([]byte, error) {
	userID := ctx.Value(hub.UserIDKey).(string)
	return m.dbQueryJSON(ctx, "select get_packages_starred_by_user($1::uuid)", userID)
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
	pkgJSON, _ := json.Marshal(pkg)
	_, err := m.db.Exec(ctx, "select register_package($1::jsonb)", pkgJSON)
	return err
}

// SearchJSON returns a json object with the search results produced by the
// input provided. The json object is built by the database.
func (m *Manager) SearchJSON(ctx context.Context, input *SearchInput) ([]byte, error) {
	inputJSON, _ := json.Marshal(input)
	return m.dbQueryJSON(ctx, "select search_packages($1::jsonb)", inputJSON)
}

// ToggleStar stars on unstars a given package for the provided user.
func (m *Manager) ToggleStar(ctx context.Context, packageID string) error {
	userID := ctx.Value(hub.UserIDKey).(string)
	_, err := m.db.Exec(ctx, "select toggle_star($1::uuid, $2::uuid)", userID, packageID)
	return err
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
	Users             []string          `json:"users,omitempty"`
	Orgs              []string          `json:"orgs,omitempty"`
	ChartRepositories []string          `json:"chart_repositories,omitempty"`
	Deprecated        bool              `json:"deprecated"`
}

// getUserID returns the user id from the context provided when available.
func getUserID(ctx context.Context) *string {
	var userID *string
	v, _ := ctx.Value(hub.UserIDKey).(string)
	if v != "" {
		userID = &v
	}
	return userID
}
