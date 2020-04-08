package chartrepo

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/artifacthub/hub/internal/hub"
)

// Manager provides an API to manage chart repositories.
type Manager struct {
	db hub.DB
}

// NewManager creates a new Manager instance.
func NewManager(db hub.DB) *Manager {
	return &Manager{
		db: db,
	}
}

// Add adds the provided chart repository to the database.
func (m *Manager) Add(ctx context.Context, orgName string, r *hub.ChartRepository) error {
	query := "select add_chart_repository($1::uuid, $2::text, $3::jsonb)"
	userID := ctx.Value(hub.UserIDKey).(string)
	rJSON, _ := json.Marshal(r)
	_, err := m.db.Exec(ctx, query, userID, orgName, rJSON)
	return err
}

// CheckAvailability checks the availability of a given value for the provided
// resource kind.
// TODO (sergio): only chart repositories checks here, add method to other packages
func (m *Manager) CheckAvailability(ctx context.Context, resourceKind, value string) (bool, error) {
	var available bool
	var query string

	switch resourceKind {
	case "chartRepositoryName":
		query = `select chart_repository_id from chart_repository where name = $1`
	case "chartRepositoryURL":
		query = `select chart_repository_id from chart_repository where url = $1`
	case "organizationName":
		query = `select organization_id from organization where name = $1`
	case "userAlias":
		query = `select user_id from "user" where alias = $1`
	default:
		return false, errors.New("resource kind not supported")
	}

	query = fmt.Sprintf("select not exists (%s)", query)
	err := m.db.QueryRow(ctx, query, value).Scan(&available)
	return available, err
}

// Delete deletes the provided chart repository from the database.
func (m *Manager) Delete(ctx context.Context, name string) error {
	query := "select delete_chart_repository($1::uuid, $2::text)"
	userID := ctx.Value(hub.UserIDKey).(string)
	_, err := m.db.Exec(ctx, query, userID, name)
	return err
}

// GetAll returns all available chart repositories.
func (m *Manager) GetAll(ctx context.Context) ([]*hub.ChartRepository, error) {
	var r []*hub.ChartRepository
	err := m.dbQueryUnmarshal(ctx, &r, "select get_chart_repositories()")
	return r, err
}

// GetByName returns the chart repository identified by the name provided.
func (m *Manager) GetByName(ctx context.Context, name string) (*hub.ChartRepository, error) {
	var r *hub.ChartRepository
	err := m.dbQueryUnmarshal(ctx, &r, "select get_chart_repository_by_name($1::text)", name)
	return r, err
}

// GetPackagesDigest returns the digests for all packages in the repository
// identified by the id provided.
func (m *Manager) GetPackagesDigest(
	ctx context.Context,
	chartRepositoryID string,
) (map[string]string, error) {
	pd := make(map[string]string)
	query := "select get_chart_repository_packages_digest($1::uuid)"
	err := m.dbQueryUnmarshal(ctx, &pd, query, chartRepositoryID)
	return pd, err
}

// GetOwnedByOrgJSON returns all chart repositories that belong to the
// organization provided.
func (m *Manager) GetOwnedByOrgJSON(ctx context.Context, orgName string) ([]byte, error) {
	query := "select get_org_chart_repositories($1::uuid, $2::text)"
	userID := ctx.Value(hub.UserIDKey).(string)
	return m.dbQueryJSON(ctx, query, userID, orgName)
}

// GetOwnedByUserJSON returns all chart repositories that belong to the user
// making the request.
func (m *Manager) GetOwnedByUserJSON(ctx context.Context) ([]byte, error) {
	query := "select get_user_chart_repositories($1::uuid)"
	userID := ctx.Value(hub.UserIDKey).(string)
	return m.dbQueryJSON(ctx, query, userID)
}

// SetLastTrackingResults updates the timestamp and errors of the last tracking
// of the provided repository in the database.
func (m *Manager) SetLastTrackingResults(ctx context.Context, chartRepositoryID, errs string) error {
	query := `
	update chart_repository set
		last_tracking_ts = current_timestamp,
		last_tracking_errors = nullif($2, '')
	where chart_repository_id = $1`
	_, err := m.db.Exec(ctx, query, chartRepositoryID, errs)
	return err
}

// Update updates the provided chart repository in the database.
func (m *Manager) Update(ctx context.Context, r *hub.ChartRepository) error {
	query := "select update_chart_repository($1::uuid, $2::jsonb)"
	userID := ctx.Value(hub.UserIDKey).(string)
	rJSON, _ := json.Marshal(r)
	_, err := m.db.Exec(ctx, query, userID, rJSON)
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

// dbQueryUnmarshal is a helper that executes the query provided and unmarshals
// the json data returned from the database into the value (v) provided.
func (m *Manager) dbQueryUnmarshal(ctx context.Context, v interface{}, query string, args ...interface{}) error {
	dataJSON, err := m.dbQueryJSON(ctx, query, args...)
	if err != nil {
		return err
	}
	if err := json.Unmarshal(dataJSON, &v); err != nil {
		return err
	}
	return nil
}
