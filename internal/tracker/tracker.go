package tracker

import (
	"fmt"
	"net/url"
	"os"
	"path"
	"path/filepath"
	"strings"

	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/pkg"
	"github.com/artifacthub/hub/internal/repo"
	"github.com/rs/zerolog"
)

// Tracker is in charge of tracking the packages available in the repository
// provided, registering and unregistering them as needed.
type Tracker struct {
	svc                *hub.TrackerServices
	r                  *hub.Repository
	md                 *hub.RepositoryMetadata
	packagesRegistered map[string]string
	basePath           string
	logger             zerolog.Logger
}

// New creates a new Tracker instance.
func New(svc *hub.TrackerServices, r *hub.Repository, logger zerolog.Logger) *Tracker {
	return &Tracker{
		svc:    svc,
		r:      r,
		logger: logger,
	}
}

// Run initializes the tracking of the repository provided.
func (t *Tracker) Run() error {
	// Check if repository has been updated since last time it was processed
	remoteDigest, err := t.svc.Rm.GetRemoteDigest(t.svc.Ctx, t.r)
	if err != nil {
		return fmt.Errorf("error getting repository remote digest: %w", err)
	}
	bypassDigestCheck := t.svc.Cfg.GetBool("tracker.bypassDigestCheck")
	if remoteDigest != "" && t.r.Digest == remoteDigest && !bypassDigestCheck {
		return nil
	}

	// Initialize logs for this repository in the errors collector
	t.logger.Debug().Msg("tracking repository")
	t.svc.Ec.Init(t.r.RepositoryID)

	// Clone repository when applicable and get its metadata
	tmpDir, packagesPath, err := t.cloneRepository()
	if err != nil {
		return fmt.Errorf("error cloning repository: %w", err)
	}
	if tmpDir != "" {
		defer os.RemoveAll(tmpDir)
	}
	t.basePath = filepath.Join(tmpDir, packagesPath)
	t.md = t.getRepositoryMetadata()

	// Load packages already registered from this repository
	t.packagesRegistered, err = t.svc.Rm.GetPackagesDigest(t.svc.Ctx, t.r.RepositoryID)
	if err != nil {
		return fmt.Errorf("error getting packages registered: %w", err)
	}

	// Get packages available in repository
	packagesAvailable, err := t.getPackagesAvailable()
	if err != nil {
		return fmt.Errorf("error getting packages available: %w", err)
	}

	// Register available packages when needed
	for _, p := range packagesAvailable {
		// Return ASAP if context is cancelled
		select {
		case <-t.svc.Ctx.Done():
			return t.svc.Ctx.Err()
		default:
		}

		// Check if this package version is already registered
		digest, ok := t.packagesRegistered[pkg.BuildKey(p)]
		if ok && p.Digest == digest && !bypassDigestCheck {
			continue
		}

		// Check if this package should be ignored
		if shouldIgnorePackage(t.md, p.Name, p.Version) {
			continue
		}

		// Register package
		t.logger.Debug().Str("name", p.Name).Str("v", p.Version).Msg("registering package")
		if err := t.svc.Pm.Register(t.svc.Ctx, p); err != nil {
			t.warn(fmt.Errorf("error registering package %s version %s: %w", p.Name, p.Version, err))
		}
	}

	// Unregister packages not available anymore
	if len(packagesAvailable) > 0 {
		for key := range t.packagesRegistered {
			// Return ASAP if context is cancelled
			select {
			case <-t.svc.Ctx.Done():
				return t.svc.Ctx.Err()
			default:
			}

			// Unregister pkg if it's not available anymore or if it's ignored
			name, version := pkg.ParseKey(key)
			_, ok := packagesAvailable[key]
			if !ok || shouldIgnorePackage(t.md, name, version) {
				t.logger.Debug().Str("name", name).Str("v", version).Msg("unregistering package")
				p := &hub.Package{
					Name:       name,
					Version:    version,
					Repository: t.r,
				}
				if err := t.svc.Pm.Unregister(t.svc.Ctx, p); err != nil {
					t.warn(fmt.Errorf("error unregistering package %s version %s: %w", name, version, err))
				}
			}
		}
	}

	// Set verified publisher flag if needed
	if err := setVerifiedPublisherFlag(t.svc.Ctx, t.svc.Rm, t.r, t.md); err != nil {
		t.warn(fmt.Errorf("error setting verified publisher flag: %w", err))
	}

	// Update repository digest if needed
	if remoteDigest != "" && remoteDigest != t.r.Digest {
		if err := t.svc.Rm.UpdateDigest(t.svc.Ctx, t.r.RepositoryID, remoteDigest); err != nil {
			t.logger.Warn().Err(fmt.Errorf("error updating repository digest: %w", err)).Send()
		}
	}

	return nil
}

// cloneRepository creates a local cope of the repository provided to the
// tracker instance when applicable to the repository kind.
func (t *Tracker) cloneRepository() (string, string, error) {
	var tmpDir, packagesPath string
	var err error

	switch t.r.Kind {
	case hub.Helm:
		// Helm repositories are not cloned
	case hub.OLM:
		if strings.HasPrefix(t.r.URL, hub.RepositoryOCIPrefix) {
			tmpDir, err = t.svc.Oe.ExportRepository(t.svc.Ctx, t.r)
		} else {
			tmpDir, packagesPath, err = t.svc.Rc.CloneRepository(t.svc.Ctx, t.r)
		}
	case
		hub.Falco,
		hub.HelmPlugin,
		hub.Krew,
		hub.OPA,
		hub.TBAction,
		hub.TektonTask,
		hub.KedaScaler,
		hub.CoreDNS:
		tmpDir, packagesPath, err = t.svc.Rc.CloneRepository(t.svc.Ctx, t.r)
	}

	return tmpDir, packagesPath, err
}

// getRepositoryMetadata returns the repository's metadata when available.
func (t *Tracker) getRepositoryMetadata() *hub.RepositoryMetadata {
	var md *hub.RepositoryMetadata

	u, _ := url.Parse(t.r.URL)
	switch t.r.Kind {
	case hub.Helm:
		if repo.SchemeIsHTTP(u) {
			u.Path = path.Join(u.Path, hub.RepositoryMetadataFile)
			md, _ = t.svc.Rm.GetMetadata(u.String())
		}
	case
		hub.Falco,
		hub.HelmPlugin,
		hub.Krew,
		hub.OLM,
		hub.OPA,
		hub.TBAction,
		hub.TektonTask,
		hub.KedaScaler,
		hub.CoreDNS:
		md, _ = t.svc.Rm.GetMetadata(filepath.Join(t.basePath, hub.RepositoryMetadataFile))
	}

	return md
}

// getPackagesAvailable returns the packages available in the repository. The
// tracker source used to get the packages will depend on the kind of the repo
// being tracked.
func (t *Tracker) getPackagesAvailable() (map[string]*hub.Package, error) {
	i := &hub.TrackerSourceInput{
		Repository:         t.r,
		PackagesRegistered: t.packagesRegistered,
		BasePath:           t.basePath,
		Svc: &hub.TrackerSourceServices{
			Ctx:      t.svc.Ctx,
			Cfg:      t.svc.Cfg,
			Ec:       t.svc.Ec,
			Hc:       t.svc.Hc,
			Is:       t.svc.Is,
			Logger:   t.logger,
			GithubRL: t.svc.GithubRL,
		},
	}
	source := t.svc.SetupTrackerSource(i)
	return source.GetPackagesAvailable()
}

// warn is a helper that sends the error provided to the errors collector and
// logs it as a warning.
func (t *Tracker) warn(err error) {
	t.logger.Warn().Err(err).Send()
	t.svc.Ec.Append(t.r.RepositoryID, err.Error())
}
