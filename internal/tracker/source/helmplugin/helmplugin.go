package helmplugin

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"regexp"

	"github.com/Masterminds/semver/v3"
	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/license"
	"github.com/artifacthub/hub/internal/pkg"
	"github.com/artifacthub/hub/internal/util"
	"github.com/hashicorp/go-multierror"
	"helm.sh/helm/v3/pkg/plugin"
	"sigs.k8s.io/yaml"
)

var (
	// licenseRE is a regular expression used to locate a license file in the
	// repository.
	licenseRE = regexp.MustCompile(`(?i)license.*`)
)

// TrackerSource is a hub.TrackerSource implementation for Helm plugins
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

		// Get plugin metadata
		pluginMetadataPath := filepath.Join(pkgPath, plugin.PluginFileName)
		md, err := GetMetadata(pluginMetadataPath)
		if err != nil {
			if !errors.Is(err, os.ErrNotExist) {
				s.warn(fmt.Errorf("error getting plugin metadata (path: %s): %w", pluginMetadataPath, err))
			}
			return nil
		}

		// Prepare and store package version
		p, err := PreparePackage(s.i.Repository, md, pkgPath)
		if err != nil {
			s.warn(fmt.Errorf("error preparing package %s version %s: %w", md.Name, md.Version, err))
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

// GetManifest reads and parses the plugin metadata file.
func GetMetadata(pkgPath string) (*plugin.Metadata, error) {
	data, err := os.ReadFile(pkgPath)
	if err != nil {
		return nil, fmt.Errorf("error reading plugin metadata file: %w", err)
	}
	var md *plugin.Metadata
	if err = yaml.Unmarshal(data, &md); err != nil || md == nil {
		return nil, fmt.Errorf("error unmarshaling plugin metadata file: %w", err)
	}
	if err := validateMetadata(md); err != nil {
		return nil, fmt.Errorf("error validating plugin metadata: %w", err)
	}
	return md, nil
}

// validateMetadata checks if the plugin metadata provided is valid.
func validateMetadata(md *plugin.Metadata) error {
	var errs *multierror.Error

	if md.Name == "" {
		errs = multierror.Append(errs, errors.New("name not provided"))
	}
	if md.Version == "" {
		errs = multierror.Append(errs, errors.New("version not provided"))
	} else if _, err := semver.NewVersion(md.Version); err != nil {
		errs = multierror.Append(errs, fmt.Errorf("invalid version (semver expected): %w", err))
	}
	if md.Description == "" {
		errs = multierror.Append(errs, errors.New("description not provided"))
	}

	return errs.ErrorOrNil()
}

// PreparePackage prepares a package version using the plugin metadata and the
// files in the path provided.
func PreparePackage(r *hub.Repository, md *plugin.Metadata, pkgPath string) (*hub.Package, error) {
	// Parse version (previously validated)
	sv, _ := semver.NewVersion(md.Version)
	version := sv.String()

	// Prepare package from metadata
	p := &hub.Package{
		Name:        md.Name,
		Version:     version,
		Description: md.Description,
		Keywords: []string{
			"helm",
			"helm-plugin",
		},
		Links: []*hub.Link{
			{
				Name: "Source",
				URL:  r.URL,
			},
		},
		Repository: r,
	}

	// Include readme file if available
	readme, err := util.ReadRegularFile(filepath.Join(pkgPath, "README.md"))
	if err == nil {
		p.Readme = string(readme)
	}

	// Process and include license if available
	files, err := os.ReadDir(pkgPath)
	if err == nil {
		for _, file := range files {
			if licenseRE.Match([]byte(file.Name())) {
				licenseFile, err := util.ReadRegularFile(filepath.Join(pkgPath, file.Name()))
				if err == nil {
					p.License = license.Detect(licenseFile)
					break
				}
			}
		}
	}

	return p, nil
}
