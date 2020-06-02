package chartrepo

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"regexp"

	"github.com/artifacthub/hub/internal/hub"
	"github.com/satori/uuid"
)

var (
	// chartRepositoryNameRE is a regexp used to validate a repository name.
	chartRepositoryNameRE = regexp.MustCompile(`^[a-z][a-z0-9-]*$`)

	// ErrInvalidInput indicates that the input provided is not valid.
	ErrInvalidInput = errors.New("invalid input")
)

// Manager provides an API to manage chart repositories.
type Manager struct {
	db hub.DB
	il hub.ChartRepositoryIndexLoader
}

// NewManager creates a new Manager instance.
func NewManager(db hub.DB, opts ...func(m *Manager)) *Manager {
	m := &Manager{
		db: db,
		il: &IndexLoader{},
	}
	for _, o := range opts {
		o(m)
	}
	return m
}

// WithIndexLoader allows providing a specific IndexLoader implementation for
// a Manager instance.
func WithIndexLoader(l hub.ChartRepositoryIndexLoader) func(m *Manager) {
	return func(m *Manager) {
		m.il = l
	}
}

// Add adds the provided chart repository to the database.
func (m *Manager) Add(ctx context.Context, orgName string, r *hub.ChartRepository) error {
	userID := ctx.Value(hub.UserIDKey).(string)

	// Validate input
	if r.Name == "" {
		return fmt.Errorf("%w: %s", ErrInvalidInput, "name not provided")
	}
	if r.URL == "" {
		return fmt.Errorf("%w: %s", ErrInvalidInput, "url not provided")
	}
	if !chartRepositoryNameRE.MatchString(r.Name) {
		return fmt.Errorf("%w: %s", ErrInvalidInput, "invalid name")
	}
	if _, err := m.il.LoadIndex(r); err != nil {
		return fmt.Errorf("%w: %s", ErrInvalidInput, "invalid url")
	}

	// Add chart repository to the database
	query := "select add_chart_repository($1::uuid, $2::text, $3::jsonb)"
	rJSON, _ := json.Marshal(r)
	_, err := m.db.Exec(ctx, query, userID, orgName, rJSON)
	return err
}

// CheckAvailability checks the availability of a given value for the provided
// resource kind.
func (m *Manager) CheckAvailability(ctx context.Context, resourceKind, value string) (bool, error) {
	var available bool

	// Validate input
	validResourceKinds := []string{
		"chartRepositoryName",
		"chartRepositoryURL",
	}
	isResourceKindValid := func(resourceKind string) bool {
		for _, k := range validResourceKinds {
			if resourceKind == k {
				return true
			}
		}
		return false
	}
	if !isResourceKindValid(resourceKind) {
		return available, fmt.Errorf("%w: %s", ErrInvalidInput, "invalid resource kind")
	}
	if value == "" {
		return available, fmt.Errorf("%w: %s", ErrInvalidInput, "invalid value")
	}

	// Check availability in database
	var query string
	switch resourceKind {
	case "chartRepositoryName":
		query = `select chart_repository_id from chart_repository where name = $1`
	case "chartRepositoryURL":
		query = `select chart_repository_id from chart_repository where url = $1`
	}
	query = fmt.Sprintf("select not exists (%s)", query)
	err := m.db.QueryRow(ctx, query, value).Scan(&available)
	return available, err
}

// Delete deletes the provided chart repository from the database.
func (m *Manager) Delete(ctx context.Context, name string) error {
	userID := ctx.Value(hub.UserIDKey).(string)

	// Validate input
	if name == "" {
		return fmt.Errorf("%w: %s", ErrInvalidInput, "name not provided")
	}

	// Delete chart repository from database
	query := "select delete_chart_repository($1::uuid, $2::text)"
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
	// Validate input
	if name == "" {
		return nil, fmt.Errorf("%w: %s", ErrInvalidInput, "name not provided")
	}

	// Get chart repository from database
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
	// Validate input
	if _, err := uuid.FromString(chartRepositoryID); err != nil {
		return nil, fmt.Errorf("%w: %s", ErrInvalidInput, "invalid chart repository id")
	}

	// Get chart repository packages digest from database
	pd := make(map[string]string)
	query := "select get_chart_repository_packages_digest($1::uuid)"
	err := m.dbQueryUnmarshal(ctx, &pd, query, chartRepositoryID)
	return pd, err
}

// GetOwnedByOrgJSON returns all chart repositories that belong to the
// organization provided.
func (m *Manager) GetOwnedByOrgJSON(ctx context.Context, orgName string) ([]byte, error) {
	userID := ctx.Value(hub.UserIDKey).(string)

	// Validate input
	if orgName == "" {
		return nil, fmt.Errorf("%w: %s", ErrInvalidInput, "organization name not provided")
	}

	// Delete org chart repositories from database
	query := "select get_org_chart_repositories($1::uuid, $2::text)"
	return m.dbQueryJSON(ctx, query, userID, orgName)
}

// GetOwnedByUserJSON returns all chart repositories that belong to the user
// making the request.
func (m *Manager) GetOwnedByUserJSON(ctx context.Context) ([]byte, error) {
	userID := ctx.Value(hub.UserIDKey).(string)
	query := "select get_user_chart_repositories($1::uuid)"
	return m.dbQueryJSON(ctx, query, userID)
}

// SetLastTrackingResults updates the timestamp and errors of the last tracking
// of the provided repository in the database.
func (m *Manager) SetLastTrackingResults(ctx context.Context, chartRepositoryID, errs string) error {
	// Validate input
	if _, err := uuid.FromString(chartRepositoryID); err != nil {
		return fmt.Errorf("%w: %s", ErrInvalidInput, "invalid chart repository id")
	}

	// Update last tracking results in database
	query := `
	update chart_repository set
		last_tracking_ts = current_timestamp,
		last_tracking_errors = nullif($2, '')
	where chart_repository_id = $1`
	_, err := m.db.Exec(ctx, query, chartRepositoryID, errs)
	return err
}

// Transfer transfers the provided chart repository to a different owner. A user
// owned repo can be transferred to an organization the requesting user belongs
// to. An org owned repo can be transfer to the requesting user, provided the
// user belongs to the owning org, or to a different organization the user
// belongs to.
func (m *Manager) Transfer(ctx context.Context, repoName, orgName string) error {
	var orgNameP *string
	if orgName != "" {
		orgNameP = &orgName
	}
	var userIDP *string
	userID := ctx.Value(hub.UserIDKey).(string)
	if userID != "" {
		userIDP = &userID
	}

	// Validate input
	if repoName == "" {
		return fmt.Errorf("%w: %s", ErrInvalidInput, "chart repository name not provided")
	}

	// Update chart repository in database
	query := "select transfer_chart_repository($1::text, $2::uuid, $3::text)"
	_, err := m.db.Exec(ctx, query, repoName, userIDP, orgNameP)
	return err
}

// Update updates the provided chart repository in the database.
func (m *Manager) Update(ctx context.Context, r *hub.ChartRepository) error {
	userID := ctx.Value(hub.UserIDKey).(string)

	// Validate input
	if r.Name == "" {
		return fmt.Errorf("%w: %s", ErrInvalidInput, "name not provided")
	}
	if r.URL == "" {
		return fmt.Errorf("%w: %s", ErrInvalidInput, "url not provided")
	}
	if _, err := m.il.LoadIndex(r); err != nil {
		return fmt.Errorf("%w: %s", ErrInvalidInput, "invalid url")
	}

	// Update chart repository in database
	query := "select update_chart_repository($1::uuid, $2::jsonb)"
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
