package tekton

import (
	"errors"
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
	"github.com/hashicorp/go-multierror"
	"github.com/tektoncd/pipeline/pkg/apis/pipeline/v1beta1"
)

const (
	// PipelinesMinVersionKey represents the key used in the package's data
	// field that contains the minimum pipelines version supported.
	PipelinesMinVersionKey = "pipelines.minVersion"

	// RawManifestKey represents the key used in the package's data field that
	// contains the raw manifest.
	RawManifestKey = "manifestRaw"

	// TasksKey represents the key used in the package's data field that
	// contains a list with the pipeline's tasks.
	TasksKey = "tasks"

	changesAnnotation         = "artifacthub.io/changes"
	licenseAnnotation         = "artifacthub.io/license"
	linksAnnotation           = "artifacthub.io/links"
	maintainersAnnotation     = "artifacthub.io/maintainers"
	providerAnnotation        = "artifacthub.io/provider"
	recommendationsAnnotation = "artifacthub.io/recommendations"
	screenshotsAnnotation     = "artifacthub.io/screenshots"

	versionLabelKey = "app.kubernetes.io/version"
)

var (
	// errInvalidAnnotation indicates that the annotation provided is not valid.
	errInvalidAnnotation = errors.New("invalid annotation")
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
		manifest, manifestRaw, err := GetManifest(s.i.Repository.Kind, pkgPath)
		if err != nil {
			s.warn(fmt.Errorf("error getting package manifest (path: %s): %w", pkgPath, err))
			return nil
		}
		if manifest == nil {
			// Package manifest not found, not a package path
			return nil
		}
		var name, version string
		switch m := manifest.(type) {
		case *v1beta1.Task:
			name = m.Name
			version = m.Labels[versionLabelKey]
		case *v1beta1.Pipeline:
			name = m.Name
			version = m.Labels[versionLabelKey]
		}

		// Prepare and store package version
		p, err := PreparePackage(s.i.Repository, manifest, manifestRaw, s.i.BasePath, pkgPath)
		if err != nil {
			s.warn(fmt.Errorf("error preparing package %s version %s: %w", name, version, err))
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

// warn is a helper that sends the error provided to the errors collector and
// logs it as a warning.
func (s *TrackerSource) warn(err error) {
	s.i.Svc.Logger.Warn().Err(err).Send()
	s.i.Svc.Ec.Append(s.i.Repository.RepositoryID, err.Error())
}

// GetManifest reads and parses the package manifest, which can be a Tekton
// task or a pipeline manifest.
func GetManifest(kind hub.RepositoryKind, pkgPath string) (interface{}, []byte, error) {
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
		var manifest interface{}
		switch kind {
		case hub.TektonTask:
			manifest = &v1beta1.Task{}
		case hub.TektonPipeline:
			manifest = &v1beta1.Pipeline{}
		}
		if err := yaml.Unmarshal(manifestData, &manifest); err != nil {
			continue
		}
		switch m := manifest.(type) {
		case *v1beta1.Task:
			if m.Kind != "Task" && m.Kind != "ClusterTask" {
				continue
			}
		case *v1beta1.Pipeline:
			if m.Kind != "Pipeline" {
				continue
			}
		}
		if err := validateManifest(manifest); err != nil {
			return nil, nil, fmt.Errorf("error validating manifest: %w", err)
		}
		return manifest, manifestData, nil
	}

	return nil, nil, nil
}

// validateManifest checks if the Tekton manifest provided is valid.
func validateManifest(manifest interface{}) error {
	var errs *multierror.Error

	// Extract some information from package manifest
	var name, version, description string
	switch m := manifest.(type) {
	case *v1beta1.Task:
		name = m.Name
		version = m.Labels[versionLabelKey]
		description = m.Spec.Description
	case *v1beta1.Pipeline:
		name = m.Name
		version = m.Labels[versionLabelKey]
		description = m.Spec.Description
	}

	// Validate manifest data
	if name == "" {
		errs = multierror.Append(errs, errors.New("name not provided"))
	}
	if version == "" {
		errs = multierror.Append(errs, errors.New("version not provided"))
	} else if _, err := semver.NewVersion(version); err != nil {
		errs = multierror.Append(errs, fmt.Errorf("invalid version (semver expected): %w", err))
	}
	if description == "" {
		errs = multierror.Append(errs, errors.New("description not provided"))
	}

	return errs.ErrorOrNil()
}

// PreparePackage prepares a package version using the package manifest and the
// files in the path provided.
func PreparePackage(
	r *hub.Repository,
	manifest interface{},
	manifestRaw []byte,
	basePath string,
	pkgPath string,
) (*hub.Package, error) {
	// Extract some information from package manifest
	var name, version, description, tektonKind string
	var annotations map[string]string
	var tasks []map[string]interface{}
	switch m := manifest.(type) {
	case *v1beta1.Task:
		tektonKind = "task"
		name = m.Name
		version = m.Labels[versionLabelKey]
		description = m.Spec.Description
		annotations = m.Annotations
	case *v1beta1.Pipeline:
		tektonKind = "pipeline"
		name = m.Name
		version = m.Labels[versionLabelKey]
		description = m.Spec.Description
		annotations = m.Annotations
		for _, task := range m.Spec.Tasks {
			tasks = append(tasks, map[string]interface{}{
				"name":      task.TaskRef.Name,
				"run_after": task.RunAfter,
			})
		}
	}

	// Parse version (previously validated)
	sv, _ := semver.NewVersion(version)
	version = sv.String()

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
	pkgVersionPath := strings.TrimPrefix(pkgPath, basePath)
	contentURL := fmt.Sprintf("%s/%s/%s/%s%s/%s.yaml",
		repoBaseURL, rawPath, branch, pkgsPath, pkgVersionPath, name)
	sourceURL := fmt.Sprintf("%s/%s/%s/%s%s/%s.yaml",
		repoBaseURL, blobPath, branch, pkgsPath, pkgVersionPath, name)

	// Prepare keywords
	keywords := []string{
		"tekton",
		tektonKind,
	}
	tags := strings.Split(annotations["tekton.dev/tags"], ",")
	for _, tag := range tags {
		keywords = append(keywords, strings.TrimSpace(tag))
	}

	// Prepare package from manifest
	p := &hub.Package{
		Name:        name,
		Version:     version,
		DisplayName: annotations["tekton.dev/displayName"],
		Description: description,
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
			PipelinesMinVersionKey: annotations["tekton.dev/pipelines.minVersion"],
			RawManifestKey:         string(manifestRaw),
			TasksKey:               tasks,
		},
	}

	// Include readme file if available
	readme, err := ioutil.ReadFile(filepath.Join(pkgPath, "README.md"))
	if err == nil {
		p.Readme = string(readme)
	}

	// Enrich package with information from annotations
	if err := enrichPackageFromAnnotations(p, annotations); err != nil {
		return nil, fmt.Errorf("error enriching package %s version %s: %w", name, version, err)
	}

	return p, nil
}

// enrichPackageFromAnnotations adds some extra information to the package from
// the provided annotations.
func enrichPackageFromAnnotations(p *hub.Package, annotations map[string]string) error {
	var errs *multierror.Error

	// Changes
	if v, ok := annotations[changesAnnotation]; ok {
		changes, err := source.ParseChangesAnnotation(v)
		if err != nil {
			errs = multierror.Append(errs, err)
		} else {
			p.Changes = changes
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
			p.Links = append(p.Links, links...)
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
