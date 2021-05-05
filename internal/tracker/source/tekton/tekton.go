package tekton

import (
	"fmt"
	"io/ioutil"
	"os"
	"path/filepath"
	"strings"

	"github.com/Masterminds/semver/v3"
	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/pkg"
	"github.com/artifacthub/hub/internal/repo"
	"github.com/artifacthub/hub/internal/tracker/source"
	"github.com/ghodss/yaml"
	"github.com/tektoncd/pipeline/pkg/apis/pipeline/v1beta1"
)

const (
	changesAnnotation         = "artifacthub.io/changes"
	licenseAnnotation         = "artifacthub.io/license"
	linksAnnotation           = "artifacthub.io/links"
	maintainersAnnotation     = "artifacthub.io/maintainers"
	providerAnnotation        = "artifacthub.io/provider"
	recommendationsAnnotation = "artifacthub.io/recommendations"
)

// TrackerSource is a hub.TrackerSource implementation for Tekton repositories.
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

	// Walk the path provided looking for available packages
	err := filepath.Walk(s.i.BasePath, func(pkgPath string, info os.FileInfo, err error) error {
		// Return ASAP if context is cancelled
		select {
		case <-s.i.Svc.Ctx.Done():
			return s.i.Svc.Ctx.Err()
		default:
		}

		// If an error is raised while visiting a path or the path is not a
		// directory, we skip it
		if err != nil || !info.IsDir() {
			return nil
		}

		// Get package manifest
		manifest, manifestRaw, err := getManifest(pkgPath)
		if err != nil {
			s.warn(fmt.Errorf("error getting package manifest: %w", err))
			return nil
		}
		if manifest == nil {
			// Package manifest not found, not a package path
			return nil
		}

		// Parse and validate version
		versionLabel := manifest.Labels["app.kubernetes.io/version"]
		sv, err := semver.NewVersion(versionLabel)
		if err != nil {
			s.warn(fmt.Errorf("invalid package (%s) version (%s): %w", manifest.Name, versionLabel, err))
			return nil
		}

		// Prepare and store package version
		p, err := s.preparePackage(s.i.Repository, manifest, manifestRaw, pkgPath, sv.String())
		if err != nil {
			s.warn(fmt.Errorf("error preparing package: %w", err))
			return nil
		}
		packagesAvailable[pkg.BuildKey(p)] = p

		return nil
	})
	if err != nil {
		return nil, err
	}

	return packagesAvailable, nil
}

// preparePackage prepares a package version using the package manifest and the
// files in the path provided.
func (s *TrackerSource) preparePackage(
	r *hub.Repository,
	manifest *v1beta1.Task,
	manifestRaw []byte,
	pkgPath,
	version string,
) (*hub.Package, error) {
	// Prepare content and source urls
	var repoBaseURL, pkgsPath, provider string
	matches := repo.GitRepoURLRE.FindStringSubmatch(r.URL)
	if len(matches) >= 3 {
		repoBaseURL = matches[1]
		provider = matches[2]
	}
	if len(matches) == 4 {
		pkgsPath = strings.TrimSuffix(matches[3], "/")
	}
	var blobPath, rawPath string
	switch provider {
	case "github":
		blobPath = "blob"
		rawPath = "raw"
	case "gitlab":
		blobPath = "-/blob"
		rawPath = "-/raw"
	}
	branch := repo.GetBranch(r)
	pkgVersionPath := strings.TrimPrefix(pkgPath, s.i.BasePath)
	contentURL := fmt.Sprintf("%s/%s/%s/%s%s/%s.yaml",
		repoBaseURL, rawPath, branch, pkgsPath, pkgVersionPath, manifest.Name)
	sourceURL := fmt.Sprintf("%s/%s/%s/%s%s/%s.yaml",
		repoBaseURL, blobPath, branch, pkgsPath, pkgVersionPath, manifest.Name)

	// Prepare keywords
	keywords := []string{
		"tekton",
		"task",
	}
	tags := strings.Split(manifest.Annotations["tekton.dev/tags"], ",")
	for _, tag := range tags {
		keywords = append(keywords, strings.TrimSpace(tag))
	}

	// Prepare package from manifest
	p := &hub.Package{
		Name:        manifest.Name,
		Version:     version,
		DisplayName: manifest.Annotations["tekton.dev/displayName"],
		Description: manifest.Spec.Description,
		Keywords:    keywords,
		ContentURL:  contentURL,
		Repository:  r,
		Links: []*hub.Link{
			{
				Name: "source",
				URL:  sourceURL,
			},
		},
		Data: map[string]interface{}{
			"manifestRaw":          string(manifestRaw),
			"pipelines.minVersion": manifest.Annotations["tekton.dev/pipelines.minVersion"],
		},
	}

	// Include readme file if available
	readme, err := ioutil.ReadFile(filepath.Join(pkgPath, "README.md"))
	if err == nil {
		p.Readme = string(readme)
	}

	// Enrich package with information from annotations
	if err := enrichPackageFromAnnotations(p, manifest.Annotations); err != nil {
		return nil, fmt.Errorf("error enriching package %s version %s: %w", manifest.Name, version, err)
	}

	return p, nil
}

// warn is a helper that sends the error provided to the errors collector and
// logs it as a warning.
func (s *TrackerSource) warn(err error) {
	s.i.Svc.Logger.Warn().Err(err).Send()
	s.i.Svc.Ec.Append(s.i.Repository.RepositoryID, err.Error())
}

// getManifest reads and parses the package manifest.
func getManifest(pkgPath string) (*v1beta1.Task, []byte, error) {
	// Locate manifest file
	matches, err := filepath.Glob(filepath.Join(pkgPath, "*.yaml"))
	if err != nil {
		return nil, nil, fmt.Errorf("error locating manifest file: %w", err)
	}
	if len(matches) != 1 {
		return nil, nil, nil
	}

	// Process matches, returning the first valid resource manifest found
	for _, match := range matches {
		// Read and parse manifest file
		manifestData, err := ioutil.ReadFile(match)
		if err != nil {
			continue
		}
		manifest := &v1beta1.Task{}
		if err = yaml.Unmarshal(manifestData, &manifest); err != nil {
			continue
		}
		if manifest.Kind != "Task" && manifest.Kind != "ClusterTask" {
			continue
		}
		return manifest, manifestData, nil
	}

	return nil, nil, nil
}

// enrichPackageFromAnnotations adds some extra information to the package from
// the provided annotations.
func enrichPackageFromAnnotations(p *hub.Package, annotations map[string]string) error {
	// Changes
	if v, ok := annotations[changesAnnotation]; ok {
		changes, err := source.ParseChangesAnnotation(v)
		if err != nil {
			return err
		}
		p.Changes = changes
	}

	// License
	p.License = annotations[licenseAnnotation]

	// Links
	if v, ok := annotations[linksAnnotation]; ok {
		var links []*hub.Link
		if err := yaml.Unmarshal([]byte(v), &links); err != nil {
			return fmt.Errorf("invalid links value: %s", v)
		}
		p.Links = append(p.Links, links...)
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
