package generic

import (
	"errors"
	"fmt"
	"image"
	"os"
	"path/filepath"
	"strings"

	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/pkg"
	ignore "github.com/sabhiram/go-gitignore"
)

const (
	// FalcoRulesKey represents the key used in the package's data field that
	// contains the raw rules.
	FalcoRulesKey = "rules"

	// OPAPoliciesKey represents the key used in the package's data field that
	// contains the raw policies.
	OPAPoliciesKey = "policies"

	// falcoRulesSuffix is the suffix that each of the rules files in the
	// package must use.
	falcoRulesSuffix = "-rules.yaml"

	// opaPoliciesSuffix is the suffix that each of the policies files in the
	// package must use.
	opaPoliciesSuffix = ".rego"
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
				s.warn(fmt.Errorf("error getting package metadata (path: %s): %w", pkgPath, err))
			}
			return nil
		}

		// Prepare and store package version
		p, err := PreparePackage(s.i.Repository, md, pkgPath)
		if err != nil {
			s.warn(err)
			return nil
		}
		packagesAvailable[pkg.BuildKey(p)] = p
		logoImageID, err := s.prepareLogoImage(md, pkgPath)
		if err != nil {
			s.warn(fmt.Errorf("error preparing package %s version %s logo image: %w", md.Name, md.Version, err))
		} else {
			p.LogoImageID = logoImageID
		}

		return nil
	})
	if err != nil {
		return nil, err
	}

	return packagesAvailable, nil
}

// prepareLogoImage processes and stores the logo image provided.
func (s *TrackerSource) prepareLogoImage(md *hub.PackageMetadata, pkgPath string) (string, error) {
	var logoImageID string
	var err error

	// Store logo image when available
	if md.LogoPath != "" {
		data, err := os.ReadFile(filepath.Join(pkgPath, md.LogoPath))
		if err != nil {
			return "", fmt.Errorf("error reading logo image: %w", err)
		}
		logoImageID, err = s.i.Svc.Is.SaveImage(s.i.Svc.Ctx, data)
		if err != nil && !errors.Is(err, image.ErrFormat) {
			return "", fmt.Errorf("error saving logo image: %w", err)
		}
	} else if md.LogoURL != "" {
		logoImageID, err = s.i.Svc.Is.DownloadAndSaveImage(s.i.Svc.Ctx, md.LogoURL)
		if err != nil {
			return "", fmt.Errorf("error downloading and saving logo image: %w", err)
		}
	}

	return logoImageID, nil
}

// warn is a helper that sends the error provided to the errors collector and
// logs it as a warning.
func (s *TrackerSource) warn(err error) {
	s.i.Svc.Logger.Warn().Err(err).Send()
	s.i.Svc.Ec.Append(s.i.Repository.RepositoryID, err.Error())
}

// PreparePackage prepares a package version using the metadata and the files
// in the path provided.
func PreparePackage(r *hub.Repository, md *hub.PackageMetadata, pkgPath string) (*hub.Package, error) {
	// Prepare package from metadata
	p, err := pkg.PreparePackageFromMetadata(md)
	if err != nil {
		return nil, fmt.Errorf("error preparing package %s version %s from metadata: %w", md.Name, md.Version, err)
	}
	p.Repository = r

	// If the readme content hasn't been provided in the metadata file, try to
	// get it from the README.md file.
	if p.Readme == "" {
		readme, err := os.ReadFile(filepath.Join(pkgPath, "README.md"))
		if err == nil {
			p.Readme = string(readme)
		}
	}

	// Include kind specific data into package
	ignorer := ignore.CompileIgnoreLines(md.Ignore...)
	var kindData map[string]interface{}
	switch r.Kind {
	case hub.Falco:
		kindData, err = prepareFalcoData(pkgPath, ignorer)
	case hub.OPA:
		kindData, err = prepareOPAData(pkgPath, ignorer)
	}
	if err != nil {
		return nil, fmt.Errorf("error preparing package %s version %s data: %w", md.Name, md.Version, err)
	}
	if kindData != nil {
		if p.Data == nil {
			p.Data = kindData
		} else {
			for k, v := range kindData {
				p.Data[k] = v
			}
		}
	}

	return p, nil
}

// prepareFalcoData reads and formats Falco specific data available in the path
// provided, returning the resulting data structure.
func prepareFalcoData(pkgPath string, ignorer ignore.IgnoreParser) (map[string]interface{}, error) {
	// Read rules files
	files, err := getFilesWithSuffix(falcoRulesSuffix, pkgPath, ignorer)
	if err != nil {
		return nil, fmt.Errorf("error getting falco rules files: %w", err)
	}

	// Return package data field
	return map[string]interface{}{
		FalcoRulesKey: files,
	}, nil
}

// prepareOPAData reads and formats OPA specific data available in the path
// provided, returning the resulting data structure.
func prepareOPAData(pkgPath string, ignorer ignore.IgnoreParser) (map[string]interface{}, error) {
	// Read policies files
	files, err := getFilesWithSuffix(opaPoliciesSuffix, pkgPath, ignorer)
	if err != nil {
		return nil, fmt.Errorf("error getting opa policies files: %w", err)
	}

	// Return package data field
	return map[string]interface{}{
		OPAPoliciesKey: files,
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
		content, err := os.ReadFile(path)
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
