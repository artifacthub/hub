package pkg

import (
	"context"
	"encoding/json"
	"fmt"
	"net/url"
	"strings"

	"github.com/Masterminds/semver/v3"
	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/util"
	"github.com/satori/uuid"
)

const (
	// Database queries
	getHarborReplicationDumpDBQ     = `select get_harbor_replication_dump()`
	getPkgDBQ                       = `select get_package($1::jsonb)`
	getPkgChangeLogDBQ              = `select get_package_changelog($1::uuid)`
	getPkgStarsDBQ                  = `select get_package_stars($1::uuid, $2::uuid)`
	getPkgSummaryDBQ                = `select get_package_summary($1::jsonb)`
	getPkgsStarredByUserDBQ         = `select get_packages_starred_by_user($1::uuid)`
	getPkgsStatsDBQ                 = `select get_packages_stats()`
	getSnapshotSecurityReportDBQ    = `select security_report from snapshot where package_id = $1 and version = $2`
	getSnapshotsToScanDBQ           = `select get_snapshots_to_scan()`
	getRandomPkgsDBQ                = `select get_random_packages()`
	getValuesSchemaDBQ              = `select values_schema from snapshot where package_id = $1 and version = $2`
	registerPkgDBQ                  = `select register_package($1::jsonb)`
	searchPkgsDBQ                   = `select * from search_packages($1::jsonb)`
	searchPkgsMonocularDBQ          = `select search_packages_monocular($1::text, $2::text)`
	togglePkgStarDBQ                = `select toggle_star($1::uuid, $2::uuid)`
	updateSnapshotSecurityReportDBQ = `select update_snapshot_security_report($1::jsonb)`
	unregisterPkgDBQ                = `select unregister_package($1::jsonb)`
)

var (
	validCapabilities = []string{
		"basic install",
		"seamless upgrades",
		"full lifecycle",
		"deep insights",
		"auto pilot",
	}
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

// GetChangeLogJSON returns the changelog for the package identified by the id
// provided.
func (m *Manager) GetChangeLogJSON(ctx context.Context, pkgID string) ([]byte, error) {
	return util.DBQueryJSON(ctx, m.db, getPkgChangeLogDBQ, pkgID)
}

// GetHarborReplicationDumpJSON returns a json list with all packages versions
// of kind Helm available so that they can be synchronized in Harbor.
func (m *Manager) GetHarborReplicationDumpJSON(ctx context.Context) ([]byte, error) {
	return util.DBQueryJSON(ctx, m.db, getHarborReplicationDumpDBQ)
}

// GetJSON returns the package identified by the input provided as a json
// object. The json object is built by the database.
func (m *Manager) GetJSON(ctx context.Context, input *hub.GetPackageInput) ([]byte, error) {
	// Validate input
	if input.PackageID == "" && (input.PackageName == "" || input.RepositoryName == "") {
		return nil, fmt.Errorf("%w: %s", hub.ErrInvalidInput, "package name not provided")
	}

	// Get package from database
	inputJSON, _ := json.Marshal(input)
	return util.DBQueryJSON(ctx, m.db, getPkgDBQ, inputJSON)
}

// GetRandomJSON returns a json object with some random packages. The json
// object is built by the database.
func (m *Manager) GetRandomJSON(ctx context.Context) ([]byte, error) {
	return util.DBQueryJSON(ctx, m.db, getRandomPkgsDBQ)
}

// GetSnapshotSecurityReportJSON returns the security report of the package's
// snapshot identified by the package id and version provided.
func (m *Manager) GetSnapshotSecurityReportJSON(ctx context.Context, pkgID, version string) ([]byte, error) {
	return util.DBQueryJSON(ctx, m.db, getSnapshotSecurityReportDBQ, pkgID, version)
}

// GetSnapshotsToScan returns the packages' snapshots that need to be scanned
// for security vulnerabilities.
func (m *Manager) GetSnapshotsToScan(ctx context.Context) ([]*hub.SnapshotToScan, error) {
	var s []*hub.SnapshotToScan
	err := util.DBQueryUnmarshal(ctx, m.db, &s, getSnapshotsToScanDBQ)
	return s, err
}

// GetStarredByUserJSON returns a json object with packages starred by the user
// doing the request. The json object is built by the database.
func (m *Manager) GetStarredByUserJSON(ctx context.Context) ([]byte, error) {
	userID := ctx.Value(hub.UserIDKey).(string)
	return util.DBQueryJSON(ctx, m.db, getPkgsStarredByUserDBQ, userID)
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
	userID := getUserID(ctx)
	return util.DBQueryJSON(ctx, m.db, getPkgStarsDBQ, userID, packageID)
}

// GetStatsJSON returns a json object describing the number of packages and
// releases available in the database. The json object is built by the database.
func (m *Manager) GetStatsJSON(ctx context.Context) ([]byte, error) {
	return util.DBQueryJSON(ctx, m.db, getPkgsStatsDBQ)
}

// GetSummaryJSON returns a summary of the package identified by the input
// provided as a json object. The json object is built by the database.
func (m *Manager) GetSummaryJSON(ctx context.Context, input *hub.GetPackageInput) ([]byte, error) {
	// Validate input
	if input.PackageID == "" && (input.PackageName == "" || input.RepositoryName == "") {
		return nil, fmt.Errorf("%w: %s", hub.ErrInvalidInput, "package name not provided")
	}

	// Get package from database
	inputJSON, _ := json.Marshal(input)
	return util.DBQueryJSON(ctx, m.db, getPkgSummaryDBQ, inputJSON)
}

// GetValuesSchemaJSON returns the values schema of the package's snapshot
// identified by the package id and version provided.
func (m *Manager) GetValuesSchemaJSON(ctx context.Context, pkgID, version string) ([]byte, error) {
	return util.DBQueryJSON(ctx, m.db, getValuesSchemaDBQ, pkgID, version)
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
	validMaintainers := make([]*hub.Maintainer, 0, len(pkg.Maintainers))
	for _, m := range pkg.Maintainers {
		if m.Email == "" {
			continue
		}
		if m.Name == "" {
			m.Name = m.Email
		}
		validMaintainers = append(validMaintainers, m)
	}
	pkg.Maintainers = validMaintainers
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
	if pkg.Capabilities != "" {
		pkg.Capabilities = strings.ToLower(pkg.Capabilities)
		if !areValidCapabilities(pkg.Capabilities) {
			return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "invalid capabilities")
		}
	}

	// Register package in database
	pkgJSON, err := json.Marshal(pkg)
	if err != nil {
		return err
	}
	_, err = m.db.Exec(ctx, registerPkgDBQ, pkgJSON)
	return err
}

// SearchJSON returns a json object with the search results produced by the
// input provided. The json object is built by the database.
func (m *Manager) SearchJSON(ctx context.Context, input *hub.SearchPackageInput) (*hub.JSONQueryResult, error) {
	// Validate input
	if input.Limit <= 0 || input.Limit > 60 {
		return nil, fmt.Errorf("%w: %s", hub.ErrInvalidInput, "invalid limit (0 < l <= 60)")
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
	return util.DBQueryJSONWithPagination(ctx, m.db, searchPkgsDBQ, inputJSON)
}

// SearchMonocularJSON returns a json object with the search results produced
// by the input provided that is compatible with the Monocular search API. The
// json object is built by the database.
func (m *Manager) SearchMonocularJSON(ctx context.Context, baseURL, tsQueryWeb string) ([]byte, error) {
	return util.DBQueryJSON(ctx, m.db, searchPkgsMonocularDBQ, baseURL, tsQueryWeb)
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
	_, err := m.db.Exec(ctx, togglePkgStarDBQ, userID, packageID)
	return err
}

// UpdateSnapshotSecurityReport updates the security report for the snapshot
// provided.
func (m *Manager) UpdateSnapshotSecurityReport(ctx context.Context, r *hub.SnapshotSecurityReport) error {
	rJSON, _ := json.Marshal(r)
	_, err := m.db.Exec(ctx, updateSnapshotSecurityReportDBQ, rJSON)
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
	_, err := m.db.Exec(ctx, unregisterPkgDBQ, pkgJSON)
	return err
}

// BuildKey returns a key that identifies a concrete package version.
func BuildKey(p *hub.Package) string {
	return p.Name + "@" + p.Version
}

// ParseKey parses a key identifying a package version and returns its name and
// version.
func ParseKey(key string) (string, string) {
	p := strings.Split(key, "@")
	return p[0], p[1]
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

// areValidCapabilities checks if the provided capabilities are valid.
func areValidCapabilities(capabilities string) bool {
	for _, validOption := range validCapabilities {
		if capabilities == validOption {
			return true
		}
	}
	return false
}
