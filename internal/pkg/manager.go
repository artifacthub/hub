package pkg

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/url"

	"github.com/Masterminds/semver/v3"
	"github.com/artifacthub/hub/internal/hub"
	"github.com/jackc/pgx/v4"
	"github.com/satori/uuid"
)

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

// Get returns the package identified by the input provided.
func (m *Manager) Get(ctx context.Context, input *hub.GetPackageInput) (*hub.Package, error) {
	dataJSON, err := m.GetJSON(ctx, input)
	if err != nil {
		return nil, err
	}
	p := &hub.Package{}
	if err := json.Unmarshal(dataJSON, &p); err != nil {
		return nil, err
	}
	return p, nil
}

// GetJSON returns the package identified by the input provided as a json
// object. The json object is built by the database.
func (m *Manager) GetJSON(ctx context.Context, input *hub.GetPackageInput) ([]byte, error) {
	// Validate input
	if input.PackageID == "" && input.PackageName == "" {
		return nil, fmt.Errorf("%w: %s", hub.ErrInvalidInput, "package name not provided")
	}

	// Get package from database
	query := "select get_package($1::jsonb)"
	inputJSON, _ := json.Marshal(input)
	dataJSON, err := m.dbQueryJSON(ctx, query, inputJSON)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, hub.ErrNotFound
		}
		return nil, err
	}
	return dataJSON, nil
}

// GetRandomJSON returns a json object with some random packages. The json
// object is built by the database.
func (m *Manager) GetRandomJSON(ctx context.Context) ([]byte, error) {
	return m.dbQueryJSON(ctx, "select get_random_packages()")
}

// GetStarredByUserJSON returns a json object with packages starred by the user
// doing the request. The json object is built by the database.
func (m *Manager) GetStarredByUserJSON(ctx context.Context) ([]byte, error) {
	userID := ctx.Value(hub.UserIDKey).(string)
	return m.dbQueryJSON(ctx, "select get_packages_starred_by_user($1::uuid)", userID)
}

// GetStarsJSON returns the number of stars of the given package, indicating as
// well if the user doing the request has starred it.
func (m *Manager) GetStarsJSON(ctx context.Context, packageID string) ([]byte, error) {
	// Validate input
	if packageID == "" {
		return nil, fmt.Errorf("%w: %s", hub.ErrInvalidInput, "package id not provided")
	}
	if _, err := uuid.FromString(packageID); err != nil {
		return nil, fmt.Errorf("%w: %s", hub.ErrInvalidInput, "invalid package id")
	}

	// Get package stars from database
	query := "select get_package_stars($1::uuid, $2::uuid)"
	userID := getUserID(ctx)
	return m.dbQueryJSON(ctx, query, userID, packageID)
}

// GetStatsJSON returns a json object describing the number of packages and
// releases available in the database. The json object is built by the database.
func (m *Manager) GetStatsJSON(ctx context.Context) ([]byte, error) {
	return m.dbQueryJSON(ctx, "select get_packages_stats()")
}

// Register registers the package provided in the database.
func (m *Manager) Register(ctx context.Context, pkg *hub.Package) error {
	// Validate input
	if pkg.Name == "" {
		return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "name not provided")
	}
	if pkg.Version == "" {
		return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "version not provided")
	}
	sv, err := semver.NewVersion(pkg.Version)
	if err != nil {
		return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "invalid version (semver expected)")
	}
	pkg.Version = sv.String()
	if pkg.ContentURL != "" {
		u, err := url.Parse(pkg.ContentURL)
		if err != nil || u.Scheme == "" || u.Host == "" {
			return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "invalid content url")
		}
	}
	if pkg.Repository == nil {
		return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "repository not provided")
	}
	if pkg.Repository.RepositoryID == "" {
		return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "repository id not provided")
	}
	if _, err := uuid.FromString(pkg.Repository.RepositoryID); err != nil {
		return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "invalid repository id")
	}
	for _, m := range pkg.Maintainers {
		if m.Email == "" {
			return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "maintainer email not provided")
		}
		if m.Name == "" {
			m.Name = m.Email
		}
	}
	for _, c := range pkg.Channels {
		if c.Name == "" {
			return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "channel name not provided")
		}
		if c.Version == "" {
			return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "channel version not provided")
		}
		if _, err := semver.NewVersion(c.Version); err != nil {
			return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "invalid channel version (semver expected)")
		}
	}

	// Register package in database
	pkgJSON, _ := json.Marshal(pkg)
	_, err = m.db.Exec(ctx, "select register_package($1::jsonb)", pkgJSON)
	return err
}

// SearchJSON returns a json object with the search results produced by the
// input provided. The json object is built by the database.
func (m *Manager) SearchJSON(ctx context.Context, input *hub.SearchPackageInput) ([]byte, error) {
	// Validate input
	if input.Limit <= 0 || input.Limit > 50 {
		return nil, fmt.Errorf("%w: %s", hub.ErrInvalidInput, "invalid limit (0 < l <= 50)")
	}
	if input.Offset < 0 {
		return nil, fmt.Errorf("%w: %s", hub.ErrInvalidInput, "invalid offset (o >= 0)")
	}
	for _, alias := range input.Users {
		if alias == "" {
			return nil, fmt.Errorf("%w: %s", hub.ErrInvalidInput, "invalid user alias")
		}
	}
	for _, name := range input.Orgs {
		if name == "" {
			return nil, fmt.Errorf("%w: %s", hub.ErrInvalidInput, "invalid organization name")
		}
	}
	for _, name := range input.Repositories {
		if name == "" {
			return nil, fmt.Errorf("%w: %s", hub.ErrInvalidInput, "invalid repository name")
		}
	}

	// Search packages in database
	inputJSON, _ := json.Marshal(input)
	return m.dbQueryJSON(ctx, "select search_packages($1::jsonb)", inputJSON)
}

// ToggleStar stars or unstars a given package for the provided user.
func (m *Manager) ToggleStar(ctx context.Context, packageID string) error {
	userID := ctx.Value(hub.UserIDKey).(string)

	// Validate input
	if packageID == "" {
		return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "package id not provided")
	}
	if _, err := uuid.FromString(packageID); err != nil {
		return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "invalid package id")
	}

	// Toggle star in database
	_, err := m.db.Exec(ctx, "select toggle_star($1::uuid, $2::uuid)", userID, packageID)
	return err
}

// Unregister unregisters the package provided from the database.
func (m *Manager) Unregister(ctx context.Context, pkg *hub.Package) error {
	// Validate input
	if pkg.Name == "" {
		return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "name not provided")
	}
	if pkg.Version == "" {
		return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "version not provided")
	}
	if _, err := semver.StrictNewVersion(pkg.Version); err != nil {
		return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "invalid version (semantic version expected)")
	}

	// Unregister package from database
	pkgJSON, _ := json.Marshal(pkg)
	_, err := m.db.Exec(ctx, "select unregister_package($1::jsonb)", pkgJSON)
	return err
}

// dbQueryJSON is a helper that executes the query provided and returns a bytes
// slice containing the json data returned from the database.
func (m *Manager) dbQueryJSON(ctx context.Context, query string, args ...interface{}) ([]byte, error) {
	var dataJSON []byte
	if err := m.db.QueryRow(ctx, query, args...).Scan(&dataJSON); err != nil {
		return nil, err
	}
	return dataJSON, nil
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
