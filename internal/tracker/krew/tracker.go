package krew

import (
	"fmt"
	"io/ioutil"
	"os"
	"path/filepath"
	"strings"

	"github.com/Masterminds/semver/v3"
	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/repo"
	"github.com/artifacthub/hub/internal/tracker"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
	"sigs.k8s.io/krew/pkg/index"
	"sigs.k8s.io/yaml"
)

const (
	displayNameAnnotation = "artifacthub.io/displayName"
	keywordsAnnotation    = "artifacthub.io/keywords"
	licenseAnnotation     = "artifacthub.io/license"
	linksAnnotation       = "artifacthub.io/links"
	maintainersAnnotation = "artifacthub.io/maintainers"
	providerAnnotation    = "artifacthub.io/provider"
	readmeAnnotation      = "artifacthub.io/readme"
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

	// Get repository metadata
	var rmd *hub.RepositoryMetadata
	rmd, _ = t.svc.Rm.GetMetadata(filepath.Join(tmpDir, hub.RepositoryMetadataFile))

	// Load packages already registered from this repository
	packagesRegistered, err := t.svc.Rm.GetPackagesDigest(t.svc.Ctx, t.r.RepositoryID)
	if err != nil {
		return fmt.Errorf("error getting registered packages: %w", err)
	}

	// Register available packages when needed
	bypassDigestCheck := t.svc.Cfg.GetBool("tracker.bypassDigestCheck")
	packagesAvailable := make(map[string]struct{})
	pluginsPath := filepath.Join(tmpDir, packagesPath, "plugins")
	pluginManifestFiles, err := ioutil.ReadDir(pluginsPath)
	if err != nil {
		return fmt.Errorf("error reading plugins directory: %w", err)
	}
	for _, file := range pluginManifestFiles {
		// Return ASAP if context is cancelled
		select {
		case <-t.svc.Ctx.Done():
			return nil
		default:
		}

		// Only process plugins files
		if !file.Mode().IsRegular() || filepath.Ext(file.Name()) != ".yaml" {
			continue
		}

		// Read and parse package manifest
		data, err := ioutil.ReadFile(filepath.Join(pluginsPath, file.Name()))
		if err != nil {
			t.warn(fmt.Errorf("error reading package manifest file: %w", err))
			continue
		}
		var manifest *index.Plugin
		if err = yaml.Unmarshal(data, &manifest); err != nil || manifest == nil {
			t.warn(fmt.Errorf("error unmarshaling package manifest file: %w", err))
			continue
		}

		// Extract package name and version from manifest
		name := manifest.ObjectMeta.Name
		sv, err := semver.NewVersion(manifest.Spec.Version)
		if err != nil {
			t.warn(fmt.Errorf("invalid package (%s) version (%s): %w", name, manifest.Spec.Version, err))
			continue
		}
		version := sv.String()

		// Check if this package version is already registered
		key := fmt.Sprintf("%s@%s", name, version)
		packagesAvailable[key] = struct{}{}
		if _, ok := packagesRegistered[key]; ok && !bypassDigestCheck {
			continue
		}

		// Check if this package should be ignored
		if tracker.ShouldIgnorePackage(rmd, name, version) {
			continue
		}

		// Register package version
		t.logger.Debug().Str("name", name).Str("v", version).Msg("registering package")
		err = t.registerPackage(name, version, manifest)
		if err != nil {
			t.warn(fmt.Errorf("error registering package %s version %s: %w", name, version, err))
		}
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

// registerPackage registers a package version using the package manifest
// provided.
func (t *Tracker) registerPackage(name, version string, manifest *index.Plugin) error {
	// Prepare package to be registered
	p := &hub.Package{
		Name:        name,
		Version:     version,
		Description: manifest.Spec.ShortDescription,
		HomeURL:     manifest.Spec.Homepage,
		Readme:      manifest.Spec.Description,
		Repository:  t.r,
	}

	// Enrich package with information from annotations
	if err := enrichPackageFromAnnotations(p, manifest.Annotations); err != nil {
		return fmt.Errorf("error enriching package %s version %s: %w", name, version, err)
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

// enrichPackageFromAnnotations adds some extra information to the package from
// the provided annotations.
func enrichPackageFromAnnotations(p *hub.Package, annotations map[string]string) error {
	// Display name
	p.DisplayName = annotations[displayNameAnnotation]

	// Keywords
	p.Keywords = []string{
		"kubernetes",
		"kubectl",
		"plugin",
	}
	if v, ok := annotations[keywordsAnnotation]; ok {
		var extraKeywords []string
		if err := yaml.Unmarshal([]byte(v), &extraKeywords); err != nil {
			return fmt.Errorf("invalid keywords value: %s", v)
		}
		p.Keywords = append(p.Keywords, extraKeywords...)
	}

	// License
	p.License = annotations[licenseAnnotation]

	// Links
	if v, ok := annotations[linksAnnotation]; ok {
		var links []*hub.Link
		if err := yaml.Unmarshal([]byte(v), &links); err != nil {
			return fmt.Errorf("invalid links value: %s", v)
		}
		p.Links = links
	}

	// Maintainers
	if v, ok := annotations[maintainersAnnotation]; ok {
		var maintainers []*hub.Maintainer
		if err := yaml.Unmarshal([]byte(v), &maintainers); err != nil {
			return fmt.Errorf("invalid maintainers value: %s", v)
		}
		p.Maintainers = maintainers
	}

	// Provider
	p.Provider = annotations[providerAnnotation]

	// Readme
	if v, ok := annotations[readmeAnnotation]; ok && v != "" {
		p.Readme = v
	}

	return nil
}
