package repo

import (
	"context"
	"encoding/json"
	"fmt"
	"regexp"

	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/util"
	"github.com/satori/uuid"
)

var (
	// repositoryNameRE is a regexp used to validate a repository name.
	repositoryNameRE = regexp.MustCompile(`^[a-z][a-z0-9-]*$`)

	// GitRepoURLRE is a regexp used to validate and parse a git based
	// repository URL.
	GitRepoURLRE = regexp.MustCompile(`^(https:\/\/(github|gitlab)\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)\/?(.*)$`)
)

// Manager provides an API to manage repositories.
type Manager struct {
	db              hub.DB
	helmIndexLoader hub.HelmIndexLoader
}

// NewManager creates a new Manager instance.
func NewManager(db hub.DB, opts ...func(m *Manager)) *Manager {
	m := &Manager{
		db:              db,
		helmIndexLoader: &HelmIndexLoader{},
	}
	for _, o := range opts {
		o(m)
	}
	return m
}

// WithHelmIndexLoader allows providing a specific HelmIndexLoader
// implementation for a Manager instance.
func WithIndexLoader(l hub.HelmIndexLoader) func(m *Manager) {
	return func(m *Manager) {
		m.helmIndexLoader = l
	}
}

// Add adds the provided repository to the database.
func (m *Manager) Add(ctx context.Context, orgName string, r *hub.Repository) error {
	userID := ctx.Value(hub.UserIDKey).(string)

	// Validate input
	if !isValidKind(r.Kind) {
		return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "invalid kind")
	}
	if r.Name == "" {
		return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "name not provided")
	}
	if !repositoryNameRE.MatchString(r.Name) {
		return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "invalid name")
	}
	if r.URL == "" {
		return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "url not provided")
	}
	if r.Kind == hub.Falco || r.Kind == hub.OLM {
		if !GitRepoURLRE.MatchString(r.URL) {
			return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "invalid url")
		}
	}
	if r.Kind == hub.Helm {
		if _, err := m.helmIndexLoader.LoadIndex(r); err != nil {
			return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "invalid url")
		}
	}

	// Add repository to the database
	query := "select add_repository($1::uuid, $2::text, $3::jsonb)"
	rJSON, _ := json.Marshal(r)
	_, err := m.db.Exec(ctx, query, userID, orgName, rJSON)
	if err != nil && err.Error() == util.ErrDBInsufficientPrivilege.Error() {
		return hub.ErrInsufficientPrivilege
	}
	return err
}

// CheckAvailability checks the availability of a given value for the provided
// resource kind.
func (m *Manager) CheckAvailability(ctx context.Context, resourceKind, value string) (bool, error) {
	var available bool

	// Validate input
	validResourceKinds := []string{
		"repositoryName",
		"repositoryURL",
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
		return available, fmt.Errorf("%w: %s", hub.ErrInvalidInput, "invalid resource kind")
	}
	if value == "" {
		return available, fmt.Errorf("%w: %s", hub.ErrInvalidInput, "invalid value")
	}

	// Check availability in database
	var query string
	switch resourceKind {
	case "repositoryName":
		query = `select repository_id from repository where name = $1`
	case "repositoryURL":
		query = `select repository_id from repository where url = $1`
	}
	query = fmt.Sprintf("select not exists (%s)", query)
	err := m.db.QueryRow(ctx, query, value).Scan(&available)
	return available, err
}

// Delete deletes the provided repository from the database.
func (m *Manager) Delete(ctx context.Context, name string) error {
	userID := ctx.Value(hub.UserIDKey).(string)

	// Validate input
	if name == "" {
		return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "name not provided")
	}

	// Delete repository from database
	query := "select delete_repository($1::uuid, $2::text)"
	_, err := m.db.Exec(ctx, query, userID, name)
	if err != nil && err.Error() == util.ErrDBInsufficientPrivilege.Error() {
		return hub.ErrInsufficientPrivilege
	}
	return err
}

// GetByKind returns all available repositories of the provided kind.
func (m *Manager) GetByKind(ctx context.Context, kind hub.RepositoryKind) ([]*hub.Repository, error) {
	var r []*hub.Repository
	err := m.dbQueryUnmarshal(ctx, &r, "select get_repositories_by_kind($1::int)", kind)
	return r, err
}

// GetByName returns the repository identified by the name provided.
func (m *Manager) GetByName(ctx context.Context, name string) (*hub.Repository, error) {
	// Validate input
	if name == "" {
		return nil, fmt.Errorf("%w: %s", hub.ErrInvalidInput, "name not provided")
	}

	// Get repository from database
	var r *hub.Repository
	err := m.dbQueryUnmarshal(ctx, &r, "select get_repository_by_name($1::text)", name)
	return r, err
}

// GetPackagesDigest returns the digests for all packages in the repository
// identified by the id provided.
func (m *Manager) GetPackagesDigest(
	ctx context.Context,
	repositoryID string,
) (map[string]string, error) {
	// Validate input
	if _, err := uuid.FromString(repositoryID); err != nil {
		return nil, fmt.Errorf("%w: %s", hub.ErrInvalidInput, "invalid repository id")
	}

	// Get repository packages digest from database
	pd := make(map[string]string)
	query := "select get_repository_packages_digest($1::uuid)"
	err := m.dbQueryUnmarshal(ctx, &pd, query, repositoryID)
	return pd, err
}

// GetOwnedByOrgJSON returns all repositories that belong to the organization
// provided.
func (m *Manager) GetOwnedByOrgJSON(ctx context.Context, orgName string) ([]byte, error) {
	userID := ctx.Value(hub.UserIDKey).(string)

	// Validate input
	if orgName == "" {
		return nil, fmt.Errorf("%w: %s", hub.ErrInvalidInput, "organization name not provided")
	}

	// Delete org repositories from database
	query := "select get_org_repositories($1::uuid, $2::text)"
	return m.dbQueryJSON(ctx, query, userID, orgName)
}

// GetOwnedByUserJSON returns all repositories that belong to the user making
// the request.
func (m *Manager) GetOwnedByUserJSON(ctx context.Context) ([]byte, error) {
	userID := ctx.Value(hub.UserIDKey).(string)
	query := "select get_user_repositories($1::uuid)"
	return m.dbQueryJSON(ctx, query, userID)
}

// SetLastTrackingResults updates the timestamp and errors of the last tracking
// of the provided repository in the database.
func (m *Manager) SetLastTrackingResults(ctx context.Context, repositoryID, errs string) error {
	// Validate input
	if _, err := uuid.FromString(repositoryID); err != nil {
		return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "invalid repository id")
	}

	// Update last tracking results in database
	query := `
	update repository set
		last_tracking_ts = current_timestamp,
		last_tracking_errors = nullif($2, '')
	where repository_id = $1`
	_, err := m.db.Exec(ctx, query, repositoryID, errs)
	return err
}

// Transfer transfers the provided repository to a different owner. A user
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
		return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "repository name not provided")
	}

	// Update repository owner in database
	query := "select transfer_repository($1::text, $2::uuid, $3::text)"
	_, err := m.db.Exec(ctx, query, repoName, userIDP, orgNameP)
	if err != nil && err.Error() == util.ErrDBInsufficientPrivilege.Error() {
		return hub.ErrInsufficientPrivilege
	}
	return err
}

// Update updates the provided repository in the database.
func (m *Manager) Update(ctx context.Context, r *hub.Repository) error {
	userID := ctx.Value(hub.UserIDKey).(string)

	// Validate input
	if r.Name == "" {
		return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "name not provided")
	}
	if r.URL == "" {
		return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "url not provided")
	}
	if r.Kind == hub.Falco || r.Kind == hub.OLM {
		if !GitRepoURLRE.MatchString(r.URL) {
			return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "invalid url")
		}
	}
	if r.Kind == hub.Helm {
		if _, err := m.helmIndexLoader.LoadIndex(r); err != nil {
			return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "invalid url")
		}
	}

	// Update repository in database
	query := "select update_repository($1::uuid, $2::jsonb)"
	rJSON, _ := json.Marshal(r)
	_, err := m.db.Exec(ctx, query, userID, rJSON)
	if err != nil && err.Error() == util.ErrDBInsufficientPrivilege.Error() {
		return hub.ErrInsufficientPrivilege
	}
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

// isValidKind checks if the provided repository kind is valid.
func isValidKind(kind hub.RepositoryKind) bool {
	for _, validKind := range []hub.RepositoryKind{
		hub.Falco,
		hub.Helm,
		hub.OLM,
		hub.OPA,
	} {
		if kind == validKind {
			return true
		}
	}
	return false
}
