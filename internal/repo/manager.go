package repo

import (
	"context"
	"crypto/sha256"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"path"
	"path/filepath"
	"regexp"
	"strings"
	"time"

	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/oci"
	"github.com/artifacthub/hub/internal/util"
	"github.com/go-git/go-git/v5"
	"github.com/go-git/go-git/v5/config"
	githttp "github.com/go-git/go-git/v5/plumbing/transport/http"
	"github.com/go-git/go-git/v5/storage/memory"
	"github.com/google/go-containerregistry/pkg/name"
	"github.com/google/go-containerregistry/pkg/v1/remote"
	"github.com/rs/zerolog/log"
	"github.com/satori/uuid"
	"github.com/spf13/viper"
	"gopkg.in/yaml.v2"
)

const (
	// Database queries
	addRepoDBQ                = `select add_repository($1::uuid, $2::text, $3::jsonb)`
	checkRepoNameAvailDBQ     = `select repository_id from repository where name = $1`
	checkRepoURLAvailDBQ      = `select repository_id from repository where trim(trailing '/' from url) = $1`
	deleteRepoDBQ             = `select delete_repository($1::uuid, $2::text)`
	getRepoByIDDBQ            = `select get_repository_by_id($1::uuid, $2::boolean)`
	getRepoByNameDBQ          = `select get_repository_by_name($1::text, $2::boolean)`
	getRepoPkgsDigestDBQ      = `select get_repository_packages_digest($1::uuid)`
	getUserEmailDBQ           = `select email from "user" where user_id = $1`
	searchRepositoriesDBQ     = `select * from search_repositories($1::jsonb)`
	setLastScanningResultsDBQ = `select set_last_scanning_results($1::uuid, $2::text, $3::boolean)`
	setLastTrackingResultsDBQ = `select set_last_tracking_results($1::uuid, $2::text, $3::boolean)`
	setVerifiedPublisherDBQ   = `select set_verified_publisher($1::uuid, $2::boolean)`
	transferRepoDBQ           = `select transfer_repository($1::text, $2::uuid, $3::text, $4::boolean)`
	updateRepoDBQ             = `select update_repository($1::uuid, $2::jsonb)`
	updateRepoDigestDBQ       = `update repository set digest = $2 where repository_id = $1`
)

const (
	// MetadataLayerMediaType represents the media type used for the layer that
	// contains the repository metadata in an OCI image.
	MetadataLayerMediaType = "application/vnd.cncf.artifacthub.repository-metadata.layer.v1.yaml"

	artifacthubTag        = "artifacthub.io"
	maxContainerImageTags = 10
)

var (
	// repositoryNameRE is a regexp used to validate a repository name.
	repositoryNameRE = regexp.MustCompile(`^[a-z][a-z0-9-]*$`)

	// ErrInvalidMetadata indicates that the repository metadata is not valid.
	ErrInvalidMetadata = errors.New("invalid metadata")

	// ErrMetadataNotFound indicates that the repository metadata was not found.
	ErrMetadataNotFound = errors.New("metadata not found")

	// ErrSchemeNotSupported error indicates that the scheme used in the
	// repository url is not supported.
	ErrSchemeNotSupported = errors.New("scheme not supported")

	// GitRepoURLRE is a regexp used to validate and parse an http based git
	// repository URL.
	GitRepoURLRE = regexp.MustCompile(`^(https:\/\/([A-Za-z0-9_.-]+)\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)\/?(.*)$`)

	// validRepositoryKinds contains the repository kinds supported.
	validRepositoryKinds = []hub.RepositoryKind{
		hub.ArgoTemplate,
		hub.Backstage,
		hub.Container,
		hub.CoreDNS,
		hub.Falco,
		hub.Gatekeeper,
		hub.Headlamp,
		hub.Helm,
		hub.HelmPlugin,
		hub.InspektorGadget,
		hub.KCL,
		hub.KedaScaler,
		hub.Keptn,
		hub.KnativeClientPlugin,
		hub.Krew,
		hub.KubeArmor,
		hub.Kubewarden,
		hub.Kyverno,
		hub.Meshery,
		hub.OLM,
		hub.OPA,
		hub.OpenCost,
		hub.Radius,
		hub.TBAction,
		hub.TektonPipeline,
		hub.TektonTask,
		hub.TektonStepAction,
	}
)

// Manager provides an API to manage repositories.
type Manager struct {
	cfg *viper.Viper
	db  hub.DB
	hc  hub.HTTPClient
	rc  hub.RepositoryCloner
	il  hub.HelmIndexLoader
	tg  hub.OCITagsGetter
	op  hub.OCIPuller
	az  hub.Authorizer
}

// NewManager creates a new Manager instance.
func NewManager(
	cfg *viper.Viper,
	db hub.DB,
	az hub.Authorizer,
	hc hub.HTTPClient,
	opts ...func(m *Manager),
) *Manager {
	// Setup manager
	m := &Manager{
		cfg: cfg,
		db:  db,
		il:  &HelmIndexLoader{},
		tg:  oci.NewTagsGetter(cfg),
		op:  oci.NewPuller(cfg),
		az:  az,
		hc:  hc,
	}
	for _, o := range opts {
		o(m)
	}

	// Setup repository cloner
	if m.rc == nil {
		m.rc = &Cloner{}
	}

	return m
}

// WithHelmIndexLoader allows providing a specific HelmIndexLoader
// implementation for a Manager instance.
func WithHelmIndexLoader(l hub.HelmIndexLoader) func(m *Manager) {
	return func(m *Manager) {
		m.il = l
	}
}

// WithOCITagsGetter allows providing a specific OCITagsGetter implementation
// for a Manager instance.
func WithOCITagsGetter(tg hub.OCITagsGetter) func(m *Manager) {
	return func(m *Manager) {
		m.tg = tg
	}
}

// WithOCIPuller allows providing a specific OCIPuller implementation for a
// Manager instance.
func WithOCIPuller(p hub.OCIPuller) func(m *Manager) {
	return func(m *Manager) {
		m.op = p
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
	if err := m.validateURL(r); err != nil {
		return fmt.Errorf("%w: %w", hub.ErrInvalidInput, err)
	}
	if err := m.validateCredentials(r); err != nil {
		return fmt.Errorf("%w: %w", hub.ErrInvalidInput, err)
	}
	if err := validateData(r); err != nil {
		return fmt.Errorf("%w: %w", hub.ErrInvalidInput, err)
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
	_, err := m.db.Exec(ctx, addRepoDBQ, userID, orgName, rJSON)
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
	value = strings.TrimSuffix(value, "/")
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

	// Get repository information
	r, err := m.GetByName(ctx, repoName, true)
	if err != nil {
		return err
	}

	// Some extra validation
	u, _ := url.Parse(r.URL)
	if r.Kind == hub.OLM && SchemeIsOCI(u) {
		return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "ownership claim not available for this repo kind")
	}

	// Get repository metadata
	var basePath string
	switch r.Kind {
	case
		hub.ArgoTemplate,
		hub.Backstage,
		hub.CoreDNS,
		hub.Falco,
		hub.Gatekeeper,
		hub.Headlamp,
		hub.HelmPlugin,
		hub.InspektorGadget,
		hub.KCL,
		hub.KedaScaler,
		hub.Keptn,
		hub.KnativeClientPlugin,
		hub.Krew,
		hub.KubeArmor,
		hub.Kubewarden,
		hub.Kyverno,
		hub.Meshery,
		hub.OLM,
		hub.OPA,
		hub.OpenCost,
		hub.Radius,
		hub.TBAction,
		hub.TektonPipeline,
		hub.TektonTask,
		hub.TektonStepAction:
		tmpDir, packagesPath, err := m.rc.CloneRepository(ctx, r)
		if err != nil {
			return err
		}
		defer os.RemoveAll(tmpDir)
		basePath = filepath.Join(tmpDir, packagesPath)
	}
	md, err := m.GetMetadata(r, basePath)
	if err != nil {
		return fmt.Errorf("%w: error getting repository metadata: %w", hub.ErrInsufficientPrivilege, err)
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

// GetMetadata reads and parses the metadata file of the repository provided.
// When needed, the repository must be previously cloned and the path pointing
// to the location of the packages must be provided (basePath).
func (m *Manager) GetMetadata(r *hub.Repository, basePath string) (*hub.RepositoryMetadata, error) {
	var data []byte
	var err error

	// Get metadata
	mdFile := m.locateMetadataFile(r, basePath)
	if strings.HasPrefix(mdFile, hub.RepositoryOCIPrefix) {
		// OCI image
		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()
		ref := fmt.Sprintf("%s:%s", strings.TrimPrefix(mdFile, hub.RepositoryOCIPrefix), artifacthubTag)
		_, data, err = m.op.PullLayer(ctx, ref, MetadataLayerMediaType, r.AuthUser, r.AuthPass)
		if errors.Is(err, oci.ErrArtifactNotFound) || errors.Is(err, oci.ErrLayerNotFound) {
			err = ErrMetadataNotFound
		}
	} else {
		// Remote HTTP url / local file path
		for _, extension := range []string{".yml", ".yaml"} {
			data, err = m.readMetadataFile(mdFile+extension, r.AuthUser, r.AuthPass)
			if err == nil {
				break
			}
		}
	}
	if err != nil {
		return nil, err
	}

	// Parse and validate metadata
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

// locateMetadataFile returns the location of the metadata file for the
// repository provided.
func (m *Manager) locateMetadataFile(r *hub.Repository, basePath string) string {
	var mdFile string
	u, _ := url.Parse(r.URL)
	switch r.Kind {
	case hub.Container:
		mdFile = r.URL
	case hub.Helm:
		switch u.Scheme {
		case "http", "https":
			u.Path = path.Join(u.Path, hub.RepositoryMetadataFile)
			mdFile = u.String()
		case "oci":
			mdFile = r.URL
		}
	case
		hub.ArgoTemplate,
		hub.Backstage,
		hub.CoreDNS,
		hub.Falco,
		hub.Gatekeeper,
		hub.Headlamp,
		hub.HelmPlugin,
		hub.InspektorGadget,
		hub.KCL,
		hub.KedaScaler,
		hub.Keptn,
		hub.KnativeClientPlugin,
		hub.Krew,
		hub.KubeArmor,
		hub.Kubewarden,
		hub.Kyverno,
		hub.Meshery,
		hub.OLM,
		hub.OPA,
		hub.OpenCost,
		hub.Radius,
		hub.TBAction,
		hub.TektonPipeline,
		hub.TektonTask,
		hub.TektonStepAction:
		mdFile = filepath.Join(basePath, hub.RepositoryMetadataFile)
	}
	return mdFile
}

// readMetadataFile reads the repository metadata from the provided file.
func (m *Manager) readMetadataFile(mdFile, username, password string) ([]byte, error) {
	var data []byte
	u, err := url.Parse(mdFile)
	if err != nil || u.Scheme == "" || u.Host == "" {
		if _, err := os.Stat(mdFile); os.IsNotExist(err) {
			return nil, ErrMetadataNotFound
		}
		data, err = os.ReadFile(mdFile)
		if err != nil {
			return nil, fmt.Errorf("error reading repository metadata file: %w", err)
		}
	} else {
		req, _ := http.NewRequest("GET", mdFile, nil)
		if username != "" || password != "" {
			req.SetBasicAuth(username, password)
		}
		resp, err := m.hc.Do(req)
		if err != nil {
			return nil, fmt.Errorf("error downloading repository metadata file: %w", err)
		}
		defer resp.Body.Close()
		switch resp.StatusCode {
		case http.StatusOK:
		case http.StatusNotFound:
			return nil, ErrMetadataNotFound
		default:
			return nil, fmt.Errorf("unexpected status code received: %d", resp.StatusCode)
		}
		data, err = io.ReadAll(resp.Body)
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

// GetRemoteDigest gets the repository's digest available in the remote.
func (m *Manager) GetRemoteDigest(ctx context.Context, r *hub.Repository) (string, error) {
	var digest string
	u, _ := url.Parse(r.URL)

	switch {
	case r.Kind == hub.Helm:
		switch {
		case SchemeIsHTTP(u):
			// Digest is obtained by hashing the repository index.yaml file
			var err error
			_, digest, err = m.il.LoadIndex(r)
			if err != nil {
				return "", err
			}
		case SchemeIsOCI(u):
			// Digest is obtained by hashing the list of versions available
			versions, err := m.tg.Tags(ctx, r, true, true)
			if err != nil {
				return digest, err
			}
			digest = fmt.Sprintf("%x", sha256.Sum256([]byte(strings.Join(versions, ","))))
		}

	case r.Kind == hub.OLM && SchemeIsOCI(u):
		// Digest is obtained from the index image digest
		refName := strings.TrimPrefix(r.URL, hub.RepositoryOCIPrefix)
		ref, err := name.ParseReference(refName)
		if err != nil {
			return digest, err
		}
		desc, err := remote.Head(ref)
		if err != nil {
			return digest, err
		}
		digest = desc.Digest.String()

	case GitRepoURLRE.MatchString(r.URL):
		// Do not track repo's digest for Tekton repos using git based versioning
		if (r.Kind == hub.TektonTask || r.Kind == hub.TektonPipeline || r.Kind == hub.TektonStepAction) && r.Data != nil {
			var data *hub.TektonData
			if err := json.Unmarshal(r.Data, &data); err != nil {
				return "", fmt.Errorf("invalid tekton repository data: %w", err)
			}
			if data.Versioning == hub.TektonGitBasedVersioning {
				return "", nil
			}
		}

		// Digest is obtained from the last commit in the repository
		matches := GitRepoURLRE.FindStringSubmatch(r.URL)
		repoBaseURL := matches[1]
		remote := git.NewRemote(memory.NewStorage(), &config.RemoteConfig{
			URLs: []string{repoBaseURL},
		})
		listOptions := &git.ListOptions{}
		if r.AuthPass != "" {
			listOptions.Auth = &githttp.BasicAuth{
				Username: "artifact-hub",
				Password: r.AuthPass,
			}
		}
		refs, err := remote.List(listOptions)
		if err != nil {
			return digest, err
		}
		branch := GetBranch(r)
		for _, ref := range refs {
			if ref.Name().IsBranch() && ref.Name().Short() == branch {
				digest = ref.Hash().String()
			}
		}
	}

	return digest, nil
}

// Search searches for repositories in the database that the criteria defined
// in the input provided.
func (m *Manager) Search(
	ctx context.Context,
	input *hub.SearchRepositoryInput,
) (*hub.SearchRepositoryResult, error) {
	// Validate input
	if err := validateSearchInput(input); err != nil {
		return nil, err
	}

	// Search repositories in database
	inputJSON, _ := json.Marshal(input)
	result, err := util.DBQueryJSONWithPagination(ctx, m.db, searchRepositoriesDBQ, inputJSON)
	if err != nil {
		return nil, err
	}
	var repositories []*hub.Repository
	if err := json.Unmarshal(result.Data, &repositories); err != nil {
		return nil, err
	}

	return &hub.SearchRepositoryResult{
		Repositories: repositories,
		TotalCount:   result.TotalCount,
	}, nil
}

// SearchJSON returns a json object with the search results produced by the
// input provided. The json object is built by the database.
func (m *Manager) SearchJSON(
	ctx context.Context,
	input *hub.SearchRepositoryInput,
) (*hub.JSONQueryResult, error) {
	// Validate input
	if err := validateSearchInput(input); err != nil {
		return nil, err
	}

	// Search repositories in database
	inputJSON, _ := json.Marshal(input)
	return util.DBQueryJSONWithPagination(ctx, m.db, searchRepositoriesDBQ, inputJSON)
}

// SetLastScanningResults updates the timestamp and errors of the last scanning
// of the provided repository in the database.
func (m *Manager) SetLastScanningResults(ctx context.Context, repositoryID, errs string) error {
	// Validate input
	if _, err := uuid.FromString(repositoryID); err != nil {
		return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "invalid repository id")
	}

	// Update last scanning results in database
	scanningErrorsEventsEnabled := m.cfg.GetBool("events.scanningErrors")
	_, err := m.db.Exec(ctx, setLastScanningResultsDBQ, repositoryID, errs, scanningErrorsEventsEnabled)
	return err
}

// SetLastTrackingResults updates the timestamp and errors of the last tracking
// of the provided repository in the database.
func (m *Manager) SetLastTrackingResults(ctx context.Context, repositoryID, errs string) error {
	// Validate input
	if _, err := uuid.FromString(repositoryID); err != nil {
		return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "invalid repository id")
	}

	// Update last tracking results in database
	trackingErrorsEventsEnabled := m.cfg.GetBool("events.trackingErrors")
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
	if err := m.validateURL(r); err != nil {
		return fmt.Errorf("%w: %w", hub.ErrInvalidInput, err)
	}
	if err := m.validateCredentials(r); err != nil {
		return fmt.Errorf("%w: %w", hub.ErrInvalidInput, err)
	}
	if err := validateData(r); err != nil {
		return fmt.Errorf("%w: %w", hub.ErrInvalidInput, err)
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

// UpdateDigest updates the digest of the provided repository in the database.
func (m *Manager) UpdateDigest(ctx context.Context, repositoryID, digest string) error {
	_, err := m.db.Exec(ctx, updateRepoDigestDBQ, repositoryID, digest)
	return err
}

// validateURL validates the url of the repository provided.
func (m *Manager) validateURL(r *hub.Repository) error {
	if r.URL == "" {
		return errors.New("url not provided")
	}
	u, err := url.Parse(r.URL)
	if err != nil {
		return err
	}
	if !isSchemeSupported(u) {
		return ErrSchemeNotSupported
	}
	if u.User != nil {
		return errors.New("urls with credentials not allowed")
	}
	switch r.Kind {
	case hub.Container:
		if !SchemeIsOCI(u) {
			return errors.New("invalid url format")
		}
	case hub.Helm:
		if SchemeIsHTTP(u) {
			if _, _, err := m.il.LoadIndex(r); err != nil {
				log.Error().Err(err).Str("url", r.URL).Msg("error loading index")
				return errors.New("the url provided does not point to a valid Helm repository")
			}
		}
	case
		hub.ArgoTemplate,
		hub.Backstage,
		hub.CoreDNS,
		hub.Falco,
		hub.Gatekeeper,
		hub.Headlamp,
		hub.HelmPlugin,
		hub.InspektorGadget,
		hub.KCL,
		hub.KedaScaler,
		hub.Keptn,
		hub.KnativeClientPlugin,
		hub.Krew,
		hub.KubeArmor,
		hub.Kubewarden,
		hub.Kyverno,
		hub.Meshery,
		hub.OLM,
		hub.OPA,
		hub.OpenCost,
		hub.Radius,
		hub.TBAction,
		hub.TektonPipeline,
		hub.TektonTask,
		hub.TektonStepAction:
		if SchemeIsHTTP(u) && !GitRepoURLRE.MatchString(r.URL) {
			return errors.New("invalid url format")
		}
	}
	return nil
}

// validateCredentials validates the credentials of the repository provided.
func (m *Manager) validateCredentials(r *hub.Repository) error {
	allowPrivateRepos := m.cfg.GetBool("server.allowPrivateRepositories")
	if !allowPrivateRepos && (r.AuthUser != "" || r.AuthPass != "") {
		return errors.New("private repositories not allowed")
	}
	return nil
}

// validateData checks the kind specific data provided.
func validateData(r *hub.Repository) error {
	switch r.Kind {
	case hub.Container:
		if r.Data != nil {
			var data *hub.ContainerImageData
			if err := json.Unmarshal(r.Data, &data); err != nil {
				return fmt.Errorf("invalid container image data: %w", err)
			}
			if len(data.Tags) > maxContainerImageTags {
				return fmt.Errorf("too many tags (max allowed: %d)", maxContainerImageTags)
			}
		}
		return nil
	default:
		return nil
	}
}

// validateSearchInput validates the search input provided, returning an error
// in case it's invalid.
func validateSearchInput(input *hub.SearchRepositoryInput) error {
	for _, alias := range input.Users {
		if alias == "" {
			return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "invalid user alias")
		}
	}
	for _, name := range input.Orgs {
		if name == "" {
			return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "invalid organization name")
		}
	}
	return nil
}

// SchemeIsHTTP is a helper that checks if the scheme of the url provided is
// http or https.
func SchemeIsHTTP(u *url.URL) bool {
	return u.Scheme == "http" || u.Scheme == "https"
}

// SchemeIsOCI is a helper that checks if the scheme of the url provided is oci.
func SchemeIsOCI(u *url.URL) bool {
	return u.Scheme == "oci"
}

// isSchemeSupported is a helper that checks if the scheme of the url provided
// is supported.
func isSchemeSupported(u *url.URL) bool {
	return SchemeIsHTTP(u) || SchemeIsOCI(u)
}

// isValidKind checks if the provided repository kind is valid.
func isValidKind(kind hub.RepositoryKind) bool {
	for _, validKind := range validRepositoryKinds {
		if kind == validKind {
			return true
		}
	}
	return false
}
