package generic

import (
	"errors"
	"fmt"
	"image"
	"io/ioutil"
	"os"
	"path/filepath"
	"strings"

	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/pkg"
	ignore "github.com/sabhiram/go-gitignore"
)

// TrackerSource is a hub.TrackerSource implementation used by several kinds
// of repositories.
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

		// Get package version metadata
		md, err := pkg.GetPackageMetadata(filepath.Join(pkgPath, hub.PackageMetadataFile))
		if err != nil {
			if !errors.Is(err, os.ErrNotExist) {
				s.warn(err)
			}
			return nil
		}

		// Prepare and store package version
		p, err := s.preparePackage(s.i.Repository, md, pkgPath)
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

// preparePackage prepares a package version using the metadata and the files
// in the path provided.
func (s *TrackerSource) preparePackage(r *hub.Repository, md *hub.PackageMetadata, pkgPath string) (*hub.Package, error) {
	// Prepare package from metadata
	p, err := pkg.PreparePackageFromMetadata(md)
	if err != nil {
		return nil, fmt.Errorf("error preparing package %s version %s from metadata: %w", md.Name, md.Version, err)
	}
	p.Repository = r

	// If the readme content hasn't been provided in the metadata file, try to
	// get it from the README.md file.
	if p.Readme == "" {
		readme, err := ioutil.ReadFile(filepath.Join(pkgPath, "README.md"))
		if err == nil {
			p.Readme = string(readme)
		}
	}

	// Include kind specific data into package
	ignorer := ignore.CompileIgnoreLines(md.Ignore...)
	var data map[string]interface{}
	switch r.Kind {
	case hub.Falco:
		data, err = prepareFalcoData(pkgPath, ignorer)
	case hub.OPA:
		data, err = prepareOPAData(pkgPath, ignorer)
	}
	if err != nil {
		return nil, fmt.Errorf("error preparing package %s version %s data: %w", md.Name, md.Version, err)
	}
	p.Data = data

	// Store logo image when available
	if md.LogoPath != "" {
		data, err := ioutil.ReadFile(filepath.Join(pkgPath, md.LogoPath))
		if err != nil {
			s.warn(fmt.Errorf("error reading package %s version %s logo: %w", md.Name, md.Version, err))
		} else {
			p.LogoImageID, err = s.i.Svc.Is.SaveImage(s.i.Svc.Ctx, data)
			if err != nil && !errors.Is(err, image.ErrFormat) {
				s.warn(fmt.Errorf("error saving package %s version %s logo: %w", md.Name, md.Version, err))
			}
		}
	} else if md.LogoURL != "" {
		logoImageID, err := s.i.Svc.Is.DownloadAndSaveImage(s.i.Svc.Ctx, md.LogoURL)
		if err == nil {
			p.LogoURL = md.LogoURL
			p.LogoImageID = logoImageID
		} else {
			s.warn(fmt.Errorf("error getting package %s version %s logo: %w", md.Name, md.Version, err))
		}
	}

	return p, nil
}

// warn is a helper that sends the error provided to the errors collector and
// logs it as a warning.
func (s *TrackerSource) warn(err error) {
	s.i.Svc.Logger.Warn().Err(err).Send()
	s.i.Svc.Ec.Append(s.i.Repository.RepositoryID, err.Error())
}

// prepareFalcoData reads and formats Falco specific data available in the path
// provided, returning the resulting data structure.
func prepareFalcoData(pkgPath string, ignorer ignore.IgnoreParser) (map[string]interface{}, error) {
	// Read rules files
	files, err := getFilesWithSuffix("-rules.yaml", pkgPath, ignorer)
	if err != nil {
		return nil, err
	}

	// Return package data field
	return map[string]interface{}{
		"rules": files,
	}, nil
}

// prepareOPAData reads and formats OPA specific data available in the path
// provided, returning the resulting data structure.
func prepareOPAData(pkgPath string, ignorer ignore.IgnoreParser) (map[string]interface{}, error) {
	// Read policies files
	files, err := getFilesWithSuffix(".rego", pkgPath, ignorer)
	if err != nil {
		return nil, err
	}

	// Return package data field
	return map[string]interface{}{
		"policies": files,
	}, nil
}

// getFilesWithSuffix returns the files with a given suffix in the path
// provided, ignoring the ones the ignorer matches.
func getFilesWithSuffix(suffix, pkgPath string, ignorer ignore.IgnoreParser) (map[string]string, error) {
	files := make(map[string]string)
	err := filepath.Walk(pkgPath, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return fmt.Errorf("error reading files: %w", err)
		}
		if info.IsDir() {
			return nil
		}
		name := strings.TrimPrefix(path, pkgPath+"/")
		if ignorer.MatchesPath(name) {
			return nil
		}
		if !strings.HasSuffix(info.Name(), suffix) {
			return nil
		}
		content, err := ioutil.ReadFile(path)
		if err != nil {
			return fmt.Errorf("error reading file: %w", err)
		}
		files[name] = string(content)
		return nil
	})
	if err != nil {
		return nil, err
	}
	if len(files) == 0 {
		return nil, errors.New("no files found")
	}
	return files, nil
}
