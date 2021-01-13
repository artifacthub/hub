package helmplugin

import (
	"fmt"
	"io/ioutil"
	"os"
	"path/filepath"
	"regexp"
	"strings"

	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/license"
	"github.com/artifacthub/hub/internal/repo"
	"github.com/artifacthub/hub/internal/tracker"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
	"helm.sh/helm/v3/pkg/plugin"
	"sigs.k8s.io/yaml"
)

var (
	// licenseRE is a regular expression used to locate a license file in the
	// repository.
	licenseRE = regexp.MustCompile(`(?i)license.*`)
)

// Tracker is in charge of tracking the packages available in repository,
// registering and unregistering them as needed.
type Tracker struct {
	svc    *tracker.Services
	r      *hub.Repository
	logger zerolog.Logger
}

// NewTracker creates a new Tracker instance.
func NewTracker(
	svc *tracker.Services,
	r *hub.Repository,
	opts ...func(t tracker.Tracker),
) tracker.Tracker {
	t := &Tracker{
		svc:    svc,
		r:      r,
		logger: log.With().Str("repo", r.Name).Str("kind", hub.GetKindName(r.Kind)).Logger(),
	}
	for _, o := range opts {
		o(t)
	}
	if t.svc.Rc == nil {
		t.svc.Rc = &repo.Cloner{}
	}
	return t
}

// Track registers or unregisters the packages available as needed.
func (t *Tracker) Track() error {
	// Clone repository
	t.logger.Debug().Msg("cloning repository")
	tmpDir, packagesPath, err := t.svc.Rc.CloneRepository(t.svc.Ctx, t.r)
	if err != nil {
		return fmt.Errorf("error cloning repository: %w", err)
	}
	defer os.RemoveAll(tmpDir)
	basePath := filepath.Join(tmpDir, packagesPath)

	// Get repository metadata
	var rmd *hub.RepositoryMetadata
	rmd, _ = t.svc.Rm.GetMetadata(filepath.Join(basePath, hub.RepositoryMetadataFile))

	// Load packages already registered from this repository
	packagesRegistered, err := t.svc.Rm.GetPackagesDigest(t.svc.Ctx, t.r.RepositoryID)
	if err != nil {
		return fmt.Errorf("error getting registered packages: %w", err)
	}

	// Register available packages when needed
	bypassDigestCheck := t.svc.Cfg.GetBool("tracker.bypassDigestCheck")
	packagesAvailable := make(map[string]struct{})
	err = filepath.Walk(basePath, func(pkgPath string, info os.FileInfo, err error) error {
		if err != nil {
			return fmt.Errorf("error reading packages: %w", err)
		}
		if !info.IsDir() {
			return nil
		}

		// Return ASAP if context is cancelled
		select {
		case <-t.svc.Ctx.Done():
			return nil
		default:
		}

		// Read and parse package metadata file
		data, err := ioutil.ReadFile(filepath.Join(pkgPath, plugin.PluginFileName))
		if err != nil {
			return nil
		}
		var pmd *plugin.Metadata
		if err = yaml.Unmarshal(data, &pmd); err != nil || pmd == nil {
			t.warn(fmt.Errorf("error unmarshaling package metadata file: %w", err))
			return nil
		}

		// Check if this package version is already registered
		key := fmt.Sprintf("%s@%s", pmd.Name, pmd.Version)
		packagesAvailable[key] = struct{}{}
		if _, ok := packagesRegistered[key]; ok && !bypassDigestCheck {
			return nil
		}

		// Check if this package should be ignored
		if tracker.ShouldIgnorePackage(rmd, pmd.Name, pmd.Version) {
			return nil
		}

		// Register package version
		t.logger.Debug().Str("name", pmd.Name).Str("v", pmd.Version).Msg("registering package")
		err = t.registerPackage(pkgPath, pmd)
		if err != nil {
			t.warn(fmt.Errorf("error registering package %s version %s: %w", pmd.Name, pmd.Version, err))
		}

		return nil
	})
	if err != nil {
		return err
	}

	// Unregister packages not available anymore
	if len(packagesAvailable) > 0 {
		for key := range packagesRegistered {
			// Return ASAP if context is cancelled
			select {
			case <-t.svc.Ctx.Done():
				return nil
			default:
			}

			// Extract package name and version from key
			p := strings.Split(key, "@")
			name := p[0]
			version := p[1]

			// Unregister pkg if it's not available anymore or if it's ignored
			_, ok := packagesAvailable[key]
			if !ok || tracker.ShouldIgnorePackage(rmd, name, version) {
				t.logger.Debug().Str("name", name).Str("v", version).Msg("unregistering package")
				if err := t.unregisterPackage(name, version); err != nil {
					t.warn(fmt.Errorf("error unregistering package %s version %s: %w", name, version, err))
				}
			}
		}
	}

	// Set verified publisher flag
	if err := tracker.SetVerifiedPublisherFlag(t.svc.Ctx, t.svc.Rm, t.r, rmd); err != nil {
		t.warn(fmt.Errorf("error setting verified publisher flag: %w", err))
	}

	return nil
}

// registerPackage registers a package version using the package metadata
// provided.
func (t *Tracker) registerPackage(pkgPath string, md *plugin.Metadata) error {
	// Prepare package from metadata
	p := &hub.Package{
		Name:        md.Name,
		Version:     md.Version,
		Description: md.Description,
		Keywords: []string{
			"helm",
			"helm-plugin",
		},
		Links: []*hub.Link{
			{
				Name: "Source",
				URL:  t.r.URL,
			},
		},
		Repository: t.r,
	}

	// Include readme file if available
	readme, err := ioutil.ReadFile(filepath.Join(pkgPath, "README.md"))
	if err == nil {
		p.Readme = string(readme)
	}

	// Process and include license if available
	files, err := ioutil.ReadDir(pkgPath)
	if err != nil {
		return err
	}
	for _, file := range files {
		if licenseRE.Match([]byte(file.Name())) {
			licenseFile, err := ioutil.ReadFile(filepath.Join(pkgPath, file.Name()))
			if err == nil {
				p.License = license.Detect(licenseFile)
				break
			}
		}
	}

	// Register package
	return t.svc.Pm.Register(t.svc.Ctx, p)
}

// unregisterPackage unregisters the package version provided.
func (t *Tracker) unregisterPackage(name, version string) error {
	p := &hub.Package{
		Name:       name,
		Version:    version,
		Repository: t.r,
	}
	return t.svc.Pm.Unregister(t.svc.Ctx, p)
}

// warn is a helper that sends the error provided to the errors collector and
// logs it as a warning.
func (t *Tracker) warn(err error) {
	t.svc.Ec.Append(t.r.RepositoryID, err)
	t.logger.Warn().Err(err).Send()
}
