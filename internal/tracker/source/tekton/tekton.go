package tekton

import (
	"errors"
	"fmt"
	"os"
	"path"
	"path/filepath"
	"strings"

	"github.com/Masterminds/semver/v3"
	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/pkg"
	"github.com/artifacthub/hub/internal/repo"
	"github.com/artifacthub/hub/internal/tracker/source"
	"github.com/artifacthub/hub/internal/tracker/source/generic"
	"github.com/ghodss/yaml"
	"github.com/hashicorp/go-multierror"
	"github.com/tektoncd/pipeline/pkg/apis/pipeline/v1beta1"
)

const (
	// Keys used in labels and annotations in the Tekton's manifest file.

	// displayNameTKey defines the package's display name.
	displayNameTKey = "tekton.dev/displayName"

	// pipelinesMinVersionTKey defines the minimum pipelines version supported.
	pipelinesMinVersionTKey = "tekton.dev/pipelines.minVersion"

	// platformsTKey define the package supported plaatforms.
	platformsTKey = "tekton.dev/platforms"

	// tagsTKey define the package tags.
	tagsTKey = "tekton.dev/tags"

	// versionLabelTKey defines the package version.
	versionLabelTKey = "app.kubernetes.io/version"

	// Keys used in Artifact Hub package's data field.

	// ExamplesKey defines the package examples.
	ExamplesKey = "examples"

	// PipelinesMinVersionKey defines the minimum pipelines version supported.
	PipelinesMinVersionKey = "pipelines.minVersion"

	// PlatformsKey define the package supported plaatforms.
	PlatformsKey = "platforms"

	// RawManifestKey defines the raw manifest.
	RawManifestKey = "manifestRaw"

	// TasksKey defines a list with the pipeline's tasks.
	TasksKey = "tasks"

	// Keys used for Artifact Hub specific annotations.
	changesAnnotation         = "artifacthub.io/changes"
	licenseAnnotation         = "artifacthub.io/license"
	linksAnnotation           = "artifacthub.io/links"
	maintainersAnnotation     = "artifacthub.io/maintainers"
	providerAnnotation        = "artifacthub.io/provider"
	recommendationsAnnotation = "artifacthub.io/recommendations"
	screenshotsAnnotation     = "artifacthub.io/screenshots"

	// examplesPath defines the location of the examples in the package's path.
	examplesPath = "samples"
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

	// Read catalog path to get available packages
	packages, err := os.ReadDir(s.i.BasePath)
	if err != nil {
		return nil, fmt.Errorf("error reading catalog directory: %w", err)
	}
	for _, p := range packages {
		// Return ASAP if context is cancelled
		select {
		case <-s.i.Svc.Ctx.Done():
			return nil, s.i.Svc.Ctx.Err()
		default:
		}

		// If the path is not a directory, we skip it
		if !p.IsDir() {
			continue
		}

		// Read package versions
		pkgName := p.Name()
		pkgBasePath := path.Join(s.i.BasePath, pkgName)
		versions, err := os.ReadDir(pkgBasePath)
		if err != nil {
			s.warn(fmt.Errorf("error reading package %s versions: %w", pkgName, err))
			continue
		}
		for _, v := range versions {
			// If the path is not a directory or a ~valid semver version, we skip it
			if !p.IsDir() {
				continue
			}
			if _, err := semver.NewVersion(v.Name()); err != nil {
				continue
			}

			// Get package manifest
			pkgPath := path.Join(pkgBasePath, v.Name())
			manifest, manifestRaw, err := GetManifest(s.i.Repository.Kind, pkgName, pkgPath)
			if err != nil {
				s.warn(fmt.Errorf("error getting package manifest (path: %s): %w", pkgPath, err))
				continue
			}

			// Prepare and store package version
			p, err := PreparePackage(s.i.Repository, manifest, manifestRaw, s.i.BasePath, pkgPath)
			if err != nil {
				s.warn(fmt.Errorf("error preparing package %s version %s: %w", pkgName, v.Name(), err))
				continue
			}
			packagesAvailable[pkg.BuildKey(p)] = p
		}
	}

	return packagesAvailable, nil
}

// warn is a helper that sends the error provided to the errors collector and
// logs it as a warning.
func (s *TrackerSource) warn(err error) {
	s.i.Svc.Logger.Warn().Err(err).Send()
	s.i.Svc.Ec.Append(s.i.Repository.RepositoryID, err.Error())
}

// GetManifest reads, parses and validates the package manifest, which can be a
// Tekton task or a pipeline manifest.
func GetManifest(kind hub.RepositoryKind, pkgName, pkgPath string) (interface{}, []byte, error) {
	manifestPath := path.Join(pkgPath, pkgName+".yaml")
	manifestData, err := os.ReadFile(manifestPath)
	if err != nil {
		return nil, nil, err
	}
	var manifest interface{}
	switch kind {
	case hub.TektonTask:
		manifest = &v1beta1.Task{}
	case hub.TektonPipeline:
		manifest = &v1beta1.Pipeline{}
	}
	if err := yaml.Unmarshal(manifestData, &manifest); err != nil {
		return nil, nil, err
	}
	if err := validateManifest(manifest); err != nil {
		return nil, nil, fmt.Errorf("error validating manifest: %w", err)
	}
	return manifest, manifestData, nil
}

// validateManifest checks if the Tekton manifest provided is valid.
func validateManifest(manifest interface{}) error {
	var errs *multierror.Error

	// Extract some information from package manifest
	var name, version, description string
	switch m := manifest.(type) {
	case *v1beta1.Task:
		name = m.Name
		version = m.Labels[versionLabelTKey]
		description = m.Spec.Description
	case *v1beta1.Pipeline:
		name = m.Name
		version = m.Labels[versionLabelTKey]
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
		version = m.Labels[versionLabelTKey]
		description = m.Spec.Description
		annotations = m.Annotations
	case *v1beta1.Pipeline:
		tektonKind = "pipeline"
		name = m.Name
		version = m.Labels[versionLabelTKey]
		description = m.Spec.Description
		annotations = m.Annotations
		for _, task := range m.Spec.Tasks {
			tasks = append(tasks, map[string]interface{}{
				"name":      task.TaskRef.Name,
				"run_after": task.RunAfter,
			})
		}
	}

	// Prepare version
	sv, err := semver.NewVersion(version)
	if err != nil {
		return nil, fmt.Errorf("invalid semver version (%s): %w", version, err)
	}
	version = sv.String()

	// Prepare keywords
	keywords := []string{
		"tekton",
		tektonKind,
	}
	tags := strings.Split(annotations[tagsTKey], ",")
	for _, tag := range tags {
		keywords = append(keywords, strings.TrimSpace(tag))
	}

	// Prepare package from manifest information
	p := &hub.Package{
		Name:        name,
		Version:     version,
		DisplayName: annotations[displayNameTKey],
		Description: description,
		Keywords:    keywords,
		Repository:  r,
		Data: map[string]interface{}{
			PipelinesMinVersionKey: annotations[pipelinesMinVersionTKey],
			RawManifestKey:         string(manifestRaw),
			TasksKey:               tasks,
		},
	}

	// Include content and source links
	contentURL, sourceURL := prepareContentAndSourceLinks(r, basePath, pkgPath, name)
	p.ContentURL = contentURL
	if sourceURL != "" {
		p.Links = append(p.Links, &hub.Link{
			Name: "source",
			URL:  sourceURL,
		})
	}

	// Include supported platforms
	if annotations[platformsTKey] != "" {
		tmp := strings.Split(annotations[platformsTKey], ",")
		platforms := make([]string, 0, len(tmp))
		for _, platform := range tmp {
			platforms = append(platforms, strings.TrimSpace(platform))
		}
		p.Data[PlatformsKey] = platforms
	}

	// Include readme file
	readme, err := os.ReadFile(filepath.Join(pkgPath, "README.md"))
	if err == nil {
		p.Readme = string(readme)
	}

	// Include examples files
	examples, err := generic.GetFilesWithSuffix(".yaml", path.Join(pkgPath, examplesPath), nil)
	if err != nil {
		if !errors.Is(err, os.ErrNotExist) {
			return nil, fmt.Errorf("error getting examples files: %w", err)
		}
	} else {
		if len(examples) > 0 {
			p.Data[ExamplesKey] = examples
		}
	}

	// Enrich package with information from annotations
	if err := enrichPackageFromAnnotations(p, annotations); err != nil {
		return nil, fmt.Errorf("error enriching package %s version %s: %w", name, version, err)
	}

	return p, nil
}

// prepareContentAndSourceLinks prepares the content and source urls for the
// git provider identified from the host part in the repository url.
func prepareContentAndSourceLinks(
	r *hub.Repository,
	basePath string,
	pkgPath string,
	pkgName string,
) (string, string) {
	// Parse repository url
	var repoBaseURL, host, pkgsPath string
	matches := repo.GitRepoURLRE.FindStringSubmatch(r.URL)
	if len(matches) >= 3 {
		repoBaseURL = matches[1]
		host = matches[2]
	}
	if len(matches) == 4 {
		pkgsPath = strings.TrimSuffix(matches[3], "/")
	}

	// Generate content and source url for the corresponding git provider
	var contentURL, sourceURL string
	branch := repo.GetBranch(r)
	pkgRelativePath := strings.TrimPrefix(pkgPath, basePath)
	switch host {
	case "bitbucket.org":
		contentURL = fmt.Sprintf("%s/raw/%s/%s%s/%s.yaml", repoBaseURL, branch, pkgsPath, pkgRelativePath, pkgName)
		sourceURL = fmt.Sprintf("%s/src/%s/%s%s/%s.yaml", repoBaseURL, branch, pkgsPath, pkgRelativePath, pkgName)
	case "github.com":
		contentURL = fmt.Sprintf("%s/raw/%s/%s%s/%s.yaml", repoBaseURL, branch, pkgsPath, pkgRelativePath, pkgName)
		sourceURL = fmt.Sprintf("%s/blob/%s/%s%s/%s.yaml", repoBaseURL, branch, pkgsPath, pkgRelativePath, pkgName)
	case "gitlab.com":
		contentURL = fmt.Sprintf("%s/-/raw/%s/%s%s/%s.yaml", repoBaseURL, branch, pkgsPath, pkgRelativePath, pkgName)
		sourceURL = fmt.Sprintf("%s/-/blob/%s/%s%s/%s.yaml", repoBaseURL, branch, pkgsPath, pkgRelativePath, pkgName)
	}

	return contentURL, sourceURL
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
