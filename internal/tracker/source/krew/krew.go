package krew

import (
	"fmt"
	"io/ioutil"
	"path/filepath"
	"sort"

	"github.com/Masterminds/semver/v3"
	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/pkg"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"sigs.k8s.io/krew/pkg/index"
	"sigs.k8s.io/yaml"
)

const (
	// Annotations
	displayNameAnnotation     = "artifacthub.io/displayName"
	keywordsAnnotation        = "artifacthub.io/keywords"
	licenseAnnotation         = "artifacthub.io/license"
	linksAnnotation           = "artifacthub.io/links"
	maintainersAnnotation     = "artifacthub.io/maintainers"
	providerAnnotation        = "artifacthub.io/provider"
	readmeAnnotation          = "artifacthub.io/readme"
	recommendationsAnnotation = "artifacthub.io/recommendations"

	// Platform keys
	os   = "os"
	arch = "arch"
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
	pluginManifestFiles, err := ioutil.ReadDir(pluginsPath)
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
		if !file.Mode().IsRegular() || filepath.Ext(file.Name()) != ".yaml" {
			continue
		}

		// Read and parse plugin manifest file
		manifestRaw, err := ioutil.ReadFile(filepath.Join(pluginsPath, file.Name()))
		if err != nil {
			s.warn(fmt.Errorf("error reading plugin manifest file: %w", err))
			continue
		}
		var manifest *index.Plugin
		if err = yaml.Unmarshal(manifestRaw, &manifest); err != nil || manifest == nil {
			s.warn(fmt.Errorf("error unmarshaling plugin manifest file: %w", err))
			continue
		}

		// Prepare and store package version
		p, err := preparePackage(s.i.Repository, manifest, manifestRaw)
		if err != nil {
			s.warn(fmt.Errorf("error preparing package: %w", err))
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

// preparePackage prepares a package version using the plugin manifest provided.
func preparePackage(r *hub.Repository, manifest *index.Plugin, manifestRaw []byte) (*hub.Package, error) {
	// Extract package name and version from manifest
	name := manifest.ObjectMeta.Name
	sv, err := semver.NewVersion(manifest.Spec.Version)
	if err != nil {
		return nil, fmt.Errorf("invalid package (%s) version (%s): %w", name, manifest.Spec.Version, err)
	}
	version := sv.String()

	// Prepare supported platforms
	var platforms []string
	for _, platform := range manifest.Spec.Platforms {
		l := platform.Selector.MatchLabels
		switch {
		case l[os] != "" && l[arch] != "":
			platforms = append(platforms, fmt.Sprintf("%s/%s", l[os], l[arch]))
		case l[os] != "":
			platforms = append(platforms, l[os])
		}
		for _, e := range platform.Selector.MatchExpressions {
			if e.Operator == metav1.LabelSelectorOpIn {
				if e.Key == os {
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
			"manifestRaw": string(manifestRaw),
			"platforms":   platforms,
		},
	}

	// Enrich package with information from annotations
	if err := enrichPackageFromAnnotations(p, manifest.Annotations); err != nil {
		return nil, fmt.Errorf("error enriching package %s version %s: %w", name, version, err)
	}

	return p, nil
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

	// Recommendations
	if v, ok := annotations[recommendationsAnnotation]; ok {
		var recommendations []*hub.Recommendation
		if err := yaml.Unmarshal([]byte(v), &recommendations); err != nil {
			return fmt.Errorf("invalid recommendations value: %s", v)
		}
		p.Recommendations = recommendations
	}

	return nil
}
