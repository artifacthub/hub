package repo

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io/ioutil"
	"net/http"
	"net/url"
	"os"
	"path"
	"path/filepath"
	"regexp"
	"time"

	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/util"
	"github.com/satori/uuid"
	"github.com/spf13/viper"
	"gopkg.in/yaml.v2"
)

const (
	// Database queries
	addRepoDBQ                = `select add_repository($1::uuid, $2::text, $3::jsonb)`
	checkRepoNameAvailDBQ     = `select repository_id from repository where name = $1`
	checkRepoURLAvailDBQ      = `select repository_id from repository where url = $1`
	deleteRepoDBQ             = `select delete_repository($1::uuid, $2::text)`
	getAllReposDBQ            = `select get_all_repositories($1::boolean)`
	getOrgReposDBQ            = `select get_org_repositories($1::uuid, $2::text, $3::boolean)`
	getRepoByIDDBQ            = `select get_repository_by_id($1::uuid, $2::boolean)`
	getRepoByNameDBQ          = `select get_repository_by_name($1::text, $2::boolean)`
	getRepoPkgsDigestDBQ      = `select get_repository_packages_digest($1::uuid)`
	getReposByKindDBQ         = `select get_repositories_by_kind($1::int, $2::boolean)`
	getUserReposDBQ           = `select get_user_repositories($1::uuid, $2::boolean)`
	getUserEmailDBQ           = `select email from "user" where user_id = $1`
	setLastTrackingResultsDBQ = `select set_last_tracking_results($1::uuid, $2::text, $3::boolean)`
	setVerifiedPublisherDBQ   = `select set_verified_publisher($1::uuid, $2::boolean)`
	transferRepoDBQ           = `select transfer_repository($1::text, $2::uuid, $3::text, $4::boolean)`
	updateRepoDBQ             = `select update_repository($1::uuid, $2::jsonb)`
)

var (
	// repositoryNameRE is a regexp used to validate a repository name.
	repositoryNameRE = regexp.MustCompile(`^[a-z][a-z0-9-]*$`)

	// ErrInvalidMetadata indicates that the repository metadata is not valid.
	ErrInvalidMetadata = errors.New("invalid metadata")

	// GitRepoURLRE is a regexp used to validate and parse a git based
	// repository URL.
	GitRepoURLRE = regexp.MustCompile(`^(https:\/\/(github|gitlab)\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)\/?(.*)$`)
)

// HTTPGetter defines the methods an HTTPGetter implementation must provide.
type HTTPGetter interface {
	Get(url string) (*http.Response, error)
}

// Manager provides an API to manage repositories.
type Manager struct {
	cfg             *viper.Viper
	db              hub.DB
	hg              HTTPGetter
	rc              hub.RepositoryCloner
	helmIndexLoader hub.HelmIndexLoader
	az              hub.Authorizer
}

// NewManager creates a new Manager instance.
func NewManager(cfg *viper.Viper, db hub.DB, az hub.Authorizer, opts ...func(m *Manager)) *Manager {
	m := &Manager{
		cfg:             cfg,
		db:              db,
		helmIndexLoader: &HelmIndexLoader{},
		az:              az,
	}
	for _, o := range opts {
		o(m)
	}
	if m.hg == nil {
		m.hg = &http.Client{Timeout: 10 * time.Second}
	}
	if m.rc == nil {
		m.rc = &Cloner{}
	}
	return m
}

// WithHelmIndexLoader allows providing a specific HelmIndexLoader
// implementation for a Manager instance.
func WithHelmIndexLoader(l hub.HelmIndexLoader) func(m *Manager) {
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
	u, err := url.Parse(r.URL)
	if err != nil {
		return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "invalid url")
	}
	if u.User != nil {
		return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "urls with credentials not allowed")
	}
	allowPrivateRepos := m.cfg.GetBool("server.allowPrivateRepositories")
	if !allowPrivateRepos && (r.AuthUser != "" || r.AuthPass != "") {
		return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "private repositories not allowed")
	}
	if allowPrivateRepos && (r.AuthUser != "" || r.AuthPass != "") && r.Kind != hub.Helm {
		return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "only helm private repositories are allowed")
	}
	if r.Kind == hub.Falco || r.Kind == hub.OLM {
		if !GitRepoURLRE.MatchString(r.URL) {
			return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "invalid url")
		}
	}
	if r.Kind == hub.Helm {
		if _, err := m.helmIndexLoader.LoadIndex(r); err != nil {
			return fmt.Errorf("%w: %s: %s", hub.ErrInvalidInput, "invalid url", err.Error())
		}
	}

	// Authorize action if the repository will be added to an organization
	if orgName != "" {
		if err := m.az.Authorize(ctx, &hub.AuthorizeInput{
			OrganizationName: orgName,
			UserID:           userID,
			Action:           hub.AddOrganizationRepository,
		}); err != nil {
			return err
		}
	}

	// Add repository to the database
	rJSON, _ := json.Marshal(r)
	_, err = m.db.Exec(ctx, addRepoDBQ, userID, orgName, rJSON)
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
		query = checkRepoNameAvailDBQ
	case "repositoryURL":
		query = checkRepoURLAvailDBQ
	}
	query = fmt.Sprintf("select not exists (%s)", query)
	err := m.db.QueryRow(ctx, query, value).Scan(&available)
	return available, err
}

// ClaimOwnership allows a user to claim the ownership of a given repository.
// The repository will be transferred to the destination entity requested if
// the user is listed as one of the owners in the repository metadata file.
func (m *Manager) ClaimOwnership(ctx context.Context, repoName, orgName string) error {
	userID := ctx.Value(hub.UserIDKey).(string)

	// Validate input
	if repoName == "" {
		return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "repository name not provided")
	}

	// Get repository metadata
	r, err := m.GetByName(ctx, repoName, false)
	if err != nil {
		return err
	}
	var mdFile string
	switch r.Kind {
	case hub.Helm:
		u, _ := url.Parse(r.URL)
		u.Path = path.Join(u.Path, hub.RepositoryMetadataFile)
		mdFile = u.String()
	case hub.Falco, hub.OLM, hub.OPA:
		tmpDir, packagesPath, err := m.rc.CloneRepository(ctx, r)
		if err != nil {
			return err
		}
		defer os.RemoveAll(tmpDir)
		mdFile = filepath.Join(tmpDir, packagesPath, hub.RepositoryMetadataFile)
	}
	md, err := m.GetMetadata(mdFile)
	if err != nil {
		return fmt.Errorf("%w: error getting repository metadata: %v", hub.ErrInsufficientPrivilege, err)
	}

	// Get requesting user email
	var userEmail string
	if err := m.db.QueryRow(ctx, getUserEmailDBQ, userID).Scan(&userEmail); err != nil {
		return err
	}

	// Transfer repository if the requesting user is listed as one of the
	// repository owners in the metadata file
	for _, owner := range md.Owners {
		if owner.Email == userEmail {
			return m.Transfer(ctx, repoName, orgName, true)
		}
	}
	return hub.ErrInsufficientPrivilege
}

// Delete deletes the provided repository from the database.
func (m *Manager) Delete(ctx context.Context, name string) error {
	userID := ctx.Value(hub.UserIDKey).(string)

	// Validate input
	if name == "" {
		return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "name not provided")
	}

	// Authorize action if the repository is owned by an organization
	r, err := m.GetByName(ctx, name, false)
	if err != nil {
		return err
	}
	if r.OrganizationName != "" {
		if err := m.az.Authorize(ctx, &hub.AuthorizeInput{
			OrganizationName: r.OrganizationName,
			UserID:           userID,
			Action:           hub.DeleteOrganizationRepository,
		}); err != nil {
			return err
		}
	}

	// Delete repository from database
	_, err = m.db.Exec(ctx, deleteRepoDBQ, userID, name)
	if err != nil && err.Error() == util.ErrDBInsufficientPrivilege.Error() {
		return hub.ErrInsufficientPrivilege
	}
	return err
}

// GetAll returns all available repositories.
func (m *Manager) GetAll(ctx context.Context, includeCredentials bool) ([]*hub.Repository, error) {
	var r []*hub.Repository
	err := util.DBQueryUnmarshal(ctx, m.db, &r, getAllReposDBQ, includeCredentials)
	return r, err
}

// GetAllJSON returns all available repositories as a json array, which is
// built by the database.
func (m *Manager) GetAllJSON(ctx context.Context, includeCredentials bool) ([]byte, error) {
	return util.DBQueryJSON(ctx, m.db, getAllReposDBQ, includeCredentials)
}

// GetByID returns the repository identified by the id provided.
func (m *Manager) GetByID(
	ctx context.Context,
	repositoryID string,
	includeCredentials bool,
) (*hub.Repository, error) {
	// Validate input
	if repositoryID == "" {
		return nil, fmt.Errorf("%w: %s", hub.ErrInvalidInput, "repository id not provided")
	}
	if _, err := uuid.FromString(repositoryID); err != nil {
		return nil, fmt.Errorf("%w: %s", hub.ErrInvalidInput, "invalid repository id")
	}

	// Get repository from database
	var r *hub.Repository
	err := util.DBQueryUnmarshal(ctx, m.db, &r, getRepoByIDDBQ, repositoryID, includeCredentials)
	return r, err
}

// GetByKind returns all available repositories of the provided kind.
func (m *Manager) GetByKind(
	ctx context.Context,
	kind hub.RepositoryKind,
	includeCredentials bool,
) ([]*hub.Repository, error) {
	var r []*hub.Repository
	err := util.DBQueryUnmarshal(ctx, m.db, &r, getReposByKindDBQ, kind, includeCredentials)
	return r, err
}

// GetByKindJSON returns all available repositories of the provided kind as a
// json array, which is built by the database.
func (m *Manager) GetByKindJSON(
	ctx context.Context,
	kind hub.RepositoryKind,
	includeCredentials bool,
) ([]byte, error) {
	return util.DBQueryJSON(ctx, m.db, getReposByKindDBQ, kind, includeCredentials)
}

// GetByName returns the repository identified by the name provided.
func (m *Manager) GetByName(
	ctx context.Context,
	name string,
	includeCredentials bool,
) (*hub.Repository, error) {
	// Validate input
	if name == "" {
		return nil, fmt.Errorf("%w: %s", hub.ErrInvalidInput, "name not provided")
	}

	// Get repository from database
	var r *hub.Repository
	err := util.DBQueryUnmarshal(ctx, m.db, &r, getRepoByNameDBQ, name, includeCredentials)
	return r, err
}

// GetMetadata reads and parses the repository metadata file provided, which
// can be a remote URL or a local file path. The .yml and .yaml extensions will
// be implicitly appended to the given path.
func (m *Manager) GetMetadata(mdFile string) (*hub.RepositoryMetadata, error) {
	var data []byte
	var err error

	for _, extension := range []string{".yml", ".yaml"} {
		data, err = m.readMetadataFile(mdFile + extension)
		if err == nil {
			break
		}
	}
	if err != nil {
		return nil, err
	}

	var md *hub.RepositoryMetadata
	if err = yaml.Unmarshal(data, &md); err != nil || md == nil {
		return nil, fmt.Errorf("error unmarshaling repository metadata file: %w", err)
	}
	if md.RepositoryID != "" {
		if _, err := uuid.FromString(md.RepositoryID); err != nil {
			return nil, fmt.Errorf("%w: %s", ErrInvalidMetadata, "invalid repository id")
		}
	}

	return md, nil
}

func (m *Manager) readMetadataFile(mdFile string) ([]byte, error) {
	var data []byte
	u, err := url.Parse(mdFile)
	if err != nil || u.Scheme == "" || u.Host == "" {
		data, err = ioutil.ReadFile(mdFile)
		if err != nil {
			return nil, fmt.Errorf("error reading repository metadata file: %w", err)
		}
	} else {
		resp, err := m.hg.Get(mdFile)
		if err != nil {
			return nil, fmt.Errorf("error downloading repository metadata file: %w", err)
		}
		defer resp.Body.Close()
		if resp.StatusCode != http.StatusOK {
			return nil, fmt.Errorf("unexpected status code received: %d", resp.StatusCode)
		}
		data, err = ioutil.ReadAll(resp.Body)
		if err != nil {
			return nil, fmt.Errorf("error reading repository metadata file: %w", err)
		}
	}
	return data, nil
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
	err := util.DBQueryUnmarshal(ctx, m.db, &pd, getRepoPkgsDigestDBQ, repositoryID)
	return pd, err
}

// GetOwnedByOrgJSON returns all repositories that belong to the organization
// provided.
func (m *Manager) GetOwnedByOrgJSON(
	ctx context.Context,
	orgName string,
	includeCredentials bool,
) ([]byte, error) {
	userID := ctx.Value(hub.UserIDKey).(string)

	// Validate input
	if orgName == "" {
		return nil, fmt.Errorf("%w: %s", hub.ErrInvalidInput, "organization name not provided")
	}

	// Get org repositories from database
	return util.DBQueryJSON(ctx, m.db, getOrgReposDBQ, userID, orgName, includeCredentials)
}

// GetOwnedByUserJSON returns all repositories that belong to the user making
// the request.
func (m *Manager) GetOwnedByUserJSON(ctx context.Context, includeCredentials bool) ([]byte, error) {
	userID := ctx.Value(hub.UserIDKey).(string)
	return util.DBQueryJSON(ctx, m.db, getUserReposDBQ, userID, includeCredentials)
}

// SetLastTrackingResults updates the timestamp and errors of the last tracking
// of the provided repository in the database.
func (m *Manager) SetLastTrackingResults(ctx context.Context, repositoryID, errs string) error {
	// Validate input
	if _, err := uuid.FromString(repositoryID); err != nil {
		return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "invalid repository id")
	}

	// Update last tracking results in database
	trackingErrorsEventsEnabled := m.cfg.GetBool("tracker.events.trackingErrors")
	_, err := m.db.Exec(ctx, setLastTrackingResultsDBQ, repositoryID, errs, trackingErrorsEventsEnabled)
	return err
}

// SetVerifiedPublisher updates the verified publisher flag of the provided
// repository in the database.
func (m *Manager) SetVerifiedPublisher(ctx context.Context, repositoryID string, verified bool) error {
	// Validate input
	if _, err := uuid.FromString(repositoryID); err != nil {
		return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "invalid repository id")
	}

	// Update verified publisher status in database
	_, err := m.db.Exec(ctx, setVerifiedPublisherDBQ, repositoryID, verified)
	return err
}

// Transfer transfers the provided repository to a different owner. A user
// owned repo can be transferred to an organization the requesting user belongs
// to. An org owned repo can be transfer to the requesting user, provided the
// user belongs to the owning org, or to a different organization the user
// belongs to.
func (m *Manager) Transfer(ctx context.Context, repoName, orgName string, ownershipClaim bool) error {
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

	// Authorize action if this is not an ownership claim operation and the
	// repository is owned by an organization
	if !ownershipClaim {
		r, err := m.GetByName(ctx, repoName, false)
		if err != nil {
			return err
		}
		if r.OrganizationName != "" {
			if err := m.az.Authorize(ctx, &hub.AuthorizeInput{
				OrganizationName: r.OrganizationName,
				UserID:           userID,
				Action:           hub.TransferOrganizationRepository,
			}); err != nil {
				return err
			}
		}
	}

	// Update repository owner in database
	_, err := m.db.Exec(ctx, transferRepoDBQ, repoName, userIDP, orgNameP, ownershipClaim)
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
	u, err := url.Parse(r.URL)
	if err != nil {
		return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "invalid url")
	}
	if u.User != nil {
		return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "urls with credentials not allowed")
	}
	allowPrivateRepos := m.cfg.GetBool("server.allowPrivateRepositories")
	if !allowPrivateRepos && (r.AuthUser != "" || r.AuthPass != "") {
		return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "private repositories not allowed")
	}
	if allowPrivateRepos && (r.AuthUser != "" || r.AuthPass != "") && r.Kind != hub.Helm {
		return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "only helm private repositories are allowed")
	}
	if r.Kind == hub.Falco || r.Kind == hub.OLM {
		if !GitRepoURLRE.MatchString(r.URL) {
			return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "invalid url")
		}
	}
	if r.Kind == hub.Helm {
		if _, err := m.helmIndexLoader.LoadIndex(r); err != nil {
			return fmt.Errorf("%w: %s: %s", hub.ErrInvalidInput, "invalid url", err.Error())
		}
	}

	// Authorize action if the repository is owned by an organization
	rBefore, err := m.GetByName(ctx, r.Name, false)
	if err != nil {
		return err
	}
	if rBefore.OrganizationName != "" {
		if err := m.az.Authorize(ctx, &hub.AuthorizeInput{
			OrganizationName: rBefore.OrganizationName,
			UserID:           userID,
			Action:           hub.UpdateOrganizationRepository,
		}); err != nil {
			return err
		}
	}

	// Update repository in database
	rJSON, _ := json.Marshal(r)
	_, err = m.db.Exec(ctx, updateRepoDBQ, userID, rJSON)
	if err != nil && err.Error() == util.ErrDBInsufficientPrivilege.Error() {
		return hub.ErrInsufficientPrivilege
	}
	return err
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
