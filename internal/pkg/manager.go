package pkg

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/Masterminds/semver/v3"
	"github.com/artifacthub/hub/internal/hub"
	"github.com/jackc/pgx/v4"
	"github.com/satori/uuid"
)

var (
	// ErrInvalidInput indicates that the input provided is not valid.
	ErrInvalidInput = errors.New("invalid input")

	// ErrNotFound indicates that the package requested was not found.
	ErrNotFound = errors.New("package not found")
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

// GetJSON returns the package identified by the input provided as a json
// object. The json object is built by the database.
func (m *Manager) GetJSON(ctx context.Context, input *hub.GetPackageInput) ([]byte, error) {
	// Validate input
	if input.PackageName == "" {
		return nil, fmt.Errorf("%w: %s", ErrInvalidInput, "package name not provided")
	}

	// Get package from database
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
	// Validate input
	if !isValidKind(pkg.Kind) {
		return fmt.Errorf("%w: %s", ErrInvalidInput, "invalid kind")
	}
	if pkg.Name == "" {
		return fmt.Errorf("%w: %s", ErrInvalidInput, "name not provided")
	}
	if pkg.Version == "" {
		return fmt.Errorf("%w: %s", ErrInvalidInput, "version not provided")
	}
	if _, err := semver.StrictNewVersion(pkg.Version); err != nil {
		return fmt.Errorf("%w: %s", ErrInvalidInput, "invalid version (semantic version expected)")
	}
	if pkg.Kind == hub.Chart {
		if pkg.ChartRepository == nil {
			return fmt.Errorf("%w: %s", ErrInvalidInput, "chart repository not provided")
		}
		if pkg.ChartRepository.ChartRepositoryID == "" {
			return fmt.Errorf("%w: %s", ErrInvalidInput, "chart repository id not provided")
		}
		if _, err := uuid.FromString(pkg.ChartRepository.ChartRepositoryID); err != nil {
			return fmt.Errorf("%w: %s", ErrInvalidInput, "invalid chart repository id")
		}
		if pkg.UserID != "" {
			return fmt.Errorf("%w: %s", ErrInvalidInput, "unexpected user id provided")
		}
		if pkg.OrganizationID != "" {
			return fmt.Errorf("%w: %s", ErrInvalidInput, "unexpected organization id provided")
		}
	} else {
		if pkg.UserID == "" && pkg.OrganizationID == "" {
			return fmt.Errorf("%w: %s", ErrInvalidInput, "user id or organization id not provided")
		}
		if pkg.UserID != "" && pkg.OrganizationID != "" {
			return fmt.Errorf("%w: %s", ErrInvalidInput, "both user id and organization id provided")
		}
		if pkg.UserID != "" {
			if _, err := uuid.FromString(pkg.UserID); err != nil {
				return fmt.Errorf("%w: %s", ErrInvalidInput, "invalid user id")
			}
		}
		if pkg.OrganizationID != "" {
			if _, err := uuid.FromString(pkg.OrganizationID); err != nil {
				return fmt.Errorf("%w: %s", ErrInvalidInput, "invalid organization id")
			}
		}
		if pkg.ChartRepository != nil {
			return fmt.Errorf("%w: %s", ErrInvalidInput, "unexpected chart repository provided")
		}
	}
	for _, m := range pkg.Maintainers {
		if m.Name == "" {
			return fmt.Errorf("%w: %s", ErrInvalidInput, "maintainer name not provided")
		}
		if m.Email == "" {
			return fmt.Errorf("%w: %s", ErrInvalidInput, "maintainer email not provided")
		}
	}

	// Register package in database
	pkgJSON, _ := json.Marshal(pkg)
	_, err := m.db.Exec(ctx, "select register_package($1::jsonb)", pkgJSON)
	return err
}

// SearchJSON returns a json object with the search results produced by the
// input provided. The json object is built by the database.
func (m *Manager) SearchJSON(ctx context.Context, input *hub.SearchPackageInput) ([]byte, error) {
	// Validate input
	if input.Limit <= 0 || input.Limit > 50 {
		return nil, fmt.Errorf("%w: %s", ErrInvalidInput, "invalid limit (0 < l <= 50)")
	}
	if input.Offset < 0 {
		return nil, fmt.Errorf("%w: %s", ErrInvalidInput, "invalid offset (o >= 0)")
	}
	for _, alias := range input.Users {
		if alias == "" {
			return nil, fmt.Errorf("%w: %s", ErrInvalidInput, "invalid user alias")
		}
	}
	for _, name := range input.Orgs {
		if name == "" {
			return nil, fmt.Errorf("%w: %s", ErrInvalidInput, "invalid organization name")
		}
	}
	for _, name := range input.ChartRepositories {
		if name == "" {
			return nil, fmt.Errorf("%w: %s", ErrInvalidInput, "invalid chart repository name")
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
		return fmt.Errorf("%w: %s", ErrInvalidInput, "package id not provided")
	}
	if _, err := uuid.FromString(packageID); err != nil {
		return fmt.Errorf("%w: %s", ErrInvalidInput, "invalid package id")
	}

	// Toggle star in database
	_, err := m.db.Exec(ctx, "select toggle_star($1::uuid, $2::uuid)", userID, packageID)
	return err
}

// Unregister unregisters the package provided from the database.
func (m *Manager) Unregister(ctx context.Context, pkg *hub.Package) error {
	// Validate input
	if !isValidKind(pkg.Kind) {
		return fmt.Errorf("%w: %s", ErrInvalidInput, "invalid kind")
	}
	if pkg.Name == "" {
		return fmt.Errorf("%w: %s", ErrInvalidInput, "name not provided")
	}
	if pkg.Version == "" {
		return fmt.Errorf("%w: %s", ErrInvalidInput, "version not provided")
	}
	if _, err := semver.StrictNewVersion(pkg.Version); err != nil {
		return fmt.Errorf("%w: %s", ErrInvalidInput, "invalid version (semantic version expected)")
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

// isValidKind checks if the provided package kind is valid.
func isValidKind(kind hub.PackageKind) bool {
	for _, validKind := range []hub.PackageKind{hub.Chart, hub.Falco, hub.OPA} {
		if kind == validKind {
			return true
		}
	}
	return false
}
