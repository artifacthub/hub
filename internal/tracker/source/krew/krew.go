package krew

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"sort"

	"github.com/Masterminds/semver/v3"
	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/pkg"
	"github.com/artifacthub/hub/internal/tracker/source"
	"github.com/hashicorp/go-multierror"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"sigs.k8s.io/krew/pkg/index"
	"sigs.k8s.io/yaml"
)

const (
	// Annotations
	categoryAnnotation        = "artifacthub.io/category"
	changesAnnotation         = "artifacthub.io/changes"
	displayNameAnnotation     = "artifacthub.io/displayName"
	keywordsAnnotation        = "artifacthub.io/keywords"
	licenseAnnotation         = "artifacthub.io/license"
	linksAnnotation           = "artifacthub.io/links"
	maintainersAnnotation     = "artifacthub.io/maintainers"
	providerAnnotation        = "artifacthub.io/provider"
	readmeAnnotation          = "artifacthub.io/readme"
	recommendationsAnnotation = "artifacthub.io/recommendations"
	screenshotsAnnotation     = "artifacthub.io/screenshots"

	// Platform keys
	osKey   = "os"
	archKey = "arch"
)

const (
	// PlatformsKey represents the key used in the package's data field that
	// contains the supported platforms.
	PlatformsKey = "platforms"

	// RawManifestKey represents the key used in the package's data field that
	// contains the raw manifest.
	RawManifestKey = "manifestRaw"
)

var (
	// errInvalidAnnotation indicates that the annotation provided is not valid.
	errInvalidAnnotation = errors.New("invalid annotation")
)

// TrackerSource is a hub.TrackerSource implementation for Krew plugins
// repositories.
type TrackerSource struct {
	i *hub.TrackerSourceInput
}

// NewTrackerSource creates a new TrackerSource instance.
func NewTrackerSource(i *hub.TrackerSourceInput) *TrackerSource {
	return &TrackerSource{i}
}

// GetPackagesAvailable implements the TrackerSource interface.
func (s *TrackerSource) GetPackagesAvailable() (map[string]*hub.Package, error) {
	packagesAvailable := make(map[string]*hub.Package)

	// Iterate over the path provided looking for available packages
	pluginsPath := filepath.Join(s.i.BasePath, "plugins")
	pluginManifestFiles, err := os.ReadDir(pluginsPath)
	if err != nil {
		return nil, fmt.Errorf("error reading plugins directory: %w", err)
	}
	for _, file := range pluginManifestFiles {
		// Return ASAP if context is cancelled
		select {
		case <-s.i.Svc.Ctx.Done():
			return nil, s.i.Svc.Ctx.Err()
		default:
		}

		// Only process plugins files
		if !file.Type().IsRegular() || filepath.Ext(file.Name()) != ".yaml" {
			continue
		}

		// Get package manifest
		pluginManifestPath := filepath.Join(pluginsPath, file.Name())
		manifest, manifestRaw, err := GetManifest(pluginManifestPath)
		if err != nil {
			s.warn(fmt.Errorf("error getting package manifest (path: %s): %w", pluginManifestPath, err))
			continue
		}

		// Prepare and store package version
		p, err := PreparePackage(s.i.Repository, manifest, manifestRaw)
		if err != nil {
			s.warn(fmt.Errorf("error preparing package %s version %s: %w",
				manifest.ObjectMeta.Name,
				manifest.Spec.Version,
				err,
			))
			continue
		}
		packagesAvailable[pkg.BuildKey(p)] = p
	}

	return packagesAvailable, nil
}

// warn is a helper that sends the error provided to the errors collector and
// logs it as a warning.
func (s *TrackerSource) warn(err error) {
	s.i.Svc.Logger.Warn().Err(err).Send()
	s.i.Svc.Ec.Append(s.i.Repository.RepositoryID, err.Error())
}

// GetManifest reads and parses the plugin manifest.
func GetManifest(pluginManifestPath string) (*index.Plugin, []byte, error) {
	manifestRaw, err := os.ReadFile(pluginManifestPath)
	if err != nil {
		return nil, nil, fmt.Errorf("error reading plugin manifest file: %w", err)
	}
	var manifest *index.Plugin
	if err = yaml.Unmarshal(manifestRaw, &manifest); err != nil || manifest == nil {
		return nil, nil, fmt.Errorf("error unmarshaling plugin manifest file: %w", err)
	}
	if err := validateManifest(manifest); err != nil {
		return nil, nil, fmt.Errorf("error validating plugin manifest: %w", err)
	}
	return manifest, manifestRaw, nil
}

// validateManifest checks if the plugin manifest provided is valid.
func validateManifest(manifest *index.Plugin) error {
	var errs *multierror.Error

	if manifest.ObjectMeta.Name == "" {
		errs = multierror.Append(errs, errors.New("name not provided"))
	}
	if manifest.Spec.Version == "" {
		errs = multierror.Append(errs, errors.New("version not provided"))
	} else if _, err := semver.NewVersion(manifest.Spec.Version); err != nil {
		errs = multierror.Append(errs, fmt.Errorf("invalid version (semver expected): %w", err))
	}
	if manifest.Spec.ShortDescription == "" {
		errs = multierror.Append(errs, errors.New("description not provided"))
	}

	return errs.ErrorOrNil()
}

// PreparePackage prepares a package version using the plugin manifest provided.
func PreparePackage(r *hub.Repository, manifest *index.Plugin, manifestRaw []byte) (*hub.Package, error) {
	// Validate plugin manifest
	name := manifest.ObjectMeta.Name
	if err := validateManifest(manifest); err != nil {
		return nil, fmt.Errorf("invalid manifest for plugin (%s) version (%s): %w", name, manifest.Spec.Version, err)
	}
	sv, _ := semver.NewVersion(manifest.Spec.Version)
	version := sv.String()

	// Prepare supported platforms
	var platforms []string
	for _, platform := range manifest.Spec.Platforms {
		l := platform.Selector.MatchLabels
		switch {
		case l[osKey] != "" && l[archKey] != "":
			platforms = append(platforms, fmt.Sprintf("%s/%s", l[osKey], l[archKey]))
		case l[osKey] != "":
			platforms = append(platforms, l[osKey])
		}
		for _, e := range platform.Selector.MatchExpressions {
			if e.Operator == metav1.LabelSelectorOpIn {
				if e.Key == osKey {
					platforms = append(platforms, e.Values...)
				}
			}
		}
	}
	sort.Strings(platforms)

	// Prepare package from manifest
	p := &hub.Package{
		Name:        name,
		Version:     version,
		Description: manifest.Spec.ShortDescription,
		HomeURL:     manifest.Spec.Homepage,
		Readme:      manifest.Spec.Description,
		Repository:  r,
		Data: map[string]interface{}{
			RawManifestKey: string(manifestRaw),
			PlatformsKey:   platforms,
		},
	}

	// Enrich package with information from annotations
	if err := enrichPackageFromAnnotations(p, manifest.Annotations); err != nil {
		return nil, fmt.Errorf("error enriching package %s version %s from annotations: %w", name, version, err)
	}

	return p, nil
}

// enrichPackageFromAnnotations adds some extra information to the package from
// the provided annotations.
func enrichPackageFromAnnotations(p *hub.Package, annotations map[string]string) error {
	var errs *multierror.Error

	// Category
	if v, ok := annotations[categoryAnnotation]; ok {
		category, err := hub.PackageCategoryFromName(v)
		if err != nil {
			errs = multierror.Append(errs, err)
		} else {
			p.Category = category
		}
	}

	// Changes
	if v, ok := annotations[changesAnnotation]; ok {
		changes, err := source.ParseChangesAnnotation(v)
		if err != nil {
			errs = multierror.Append(errs, err)
		} else {
			p.Changes = changes
		}
	}

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
			errs = multierror.Append(errs, fmt.Errorf("%w: invalid keywords value", errInvalidAnnotation))
		} else {
			p.Keywords = append(p.Keywords, extraKeywords...)
		}
	}

	// License
	p.License = annotations[licenseAnnotation]

	// Links
	if v, ok := annotations[linksAnnotation]; ok {
		var links []*hub.Link
		if err := yaml.Unmarshal([]byte(v), &links); err != nil {
			errs = multierror.Append(errs, fmt.Errorf("%w: invalid links value", errInvalidAnnotation))
		} else {
			p.Links = links
		}
	}

	// Maintainers
	if v, ok := annotations[maintainersAnnotation]; ok {
		var maintainers []*hub.Maintainer
		if err := yaml.Unmarshal([]byte(v), &maintainers); err != nil {
			errs = multierror.Append(errs, fmt.Errorf("%w: invalid maintainers value", errInvalidAnnotation))
		} else {
			var invalidMaintainersFound bool
			for _, maintainer := range maintainers {
				if maintainer.Email == "" {
					invalidMaintainersFound = true
					errs = multierror.Append(errs, fmt.Errorf("%w: maintainer email not provided", errInvalidAnnotation))
				}
			}
			if !invalidMaintainersFound {
				p.Maintainers = maintainers
			}
		}
	}

	// Provider
	p.Provider = annotations[providerAnnotation]

	// Readme
	if v, ok := annotations[readmeAnnotation]; ok && v != "" {
		p.Readme = v
	}

	// Recommendations
	if v, ok := annotations[recommendationsAnnotation]; ok {
		var recommendations []*hub.Recommendation
		if err := yaml.Unmarshal([]byte(v), &recommendations); err != nil {
			errs = multierror.Append(errs, fmt.Errorf("%w: invalid recommendations value", errInvalidAnnotation))
		} else {
			p.Recommendations = recommendations
		}
	}

	// Screenshots
	if v, ok := annotations[screenshotsAnnotation]; ok {
		var screenshots []*hub.Screenshot
		if err := yaml.Unmarshal([]byte(v), &screenshots); err != nil {
			errs = multierror.Append(errs, fmt.Errorf("%w: invalid screenshots value", errInvalidAnnotation))
		} else {
			p.Screenshots = screenshots
		}
	}

	return errs.ErrorOrNil()
}
