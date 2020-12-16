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
	"github.com/artifacthub/hub/internal/repo"
	"github.com/artifacthub/hub/internal/tracker"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
	ignore "github.com/sabhiram/go-gitignore"
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

		// Get package version metadata
		pvmd, err := pkg.GetPackageMetadata(filepath.Join(pkgPath, hub.PackageMetadataFile))
		if err != nil {
			if errors.Is(err, os.ErrNotExist) {
				return nil
			}
			t.warn(fmt.Errorf("error getting package metadata: %w", err))
			return nil
		}

		// Check if this package version is already registered
		key := fmt.Sprintf("%s@%s", pvmd.Name, pvmd.Version)
		packagesAvailable[key] = struct{}{}
		if _, ok := packagesRegistered[key]; ok && !bypassDigestCheck {
			return nil
		}

		// Check if this package should be ignored
		if tracker.ShouldIgnorePackage(rmd, pvmd.Name, pvmd.Version) {
			return nil
		}

		// Read logo image when available
		var logoImageID string
		if pvmd.LogoPath != "" {
			data, err := ioutil.ReadFile(filepath.Join(pkgPath, pvmd.LogoPath))
			if err != nil {
				t.warn(fmt.Errorf("error reading package %s version %s logo: %w", pvmd.Name, pvmd.Version, err))
				return nil
			}
			logoImageID, err = t.svc.Is.SaveImage(t.svc.Ctx, data)
			if err != nil && !errors.Is(err, image.ErrFormat) {
				t.warn(fmt.Errorf("error saving package %s version %s logo: %w", pvmd.Name, pvmd.Version, err))
				return nil
			}
		}

		// Register package version
		t.logger.Debug().Str("name", pvmd.Name).Str("v", pvmd.Version).Msg("registering package")
		err = t.registerPackage(pkgPath, pvmd, logoImageID)
		if err != nil {
			t.warn(fmt.Errorf("error registering package %s version %s: %w", pvmd.Name, pvmd.Version, err))
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
func (t *Tracker) registerPackage(pkgPath string, md *hub.PackageMetadata, logoImageID string) error {
	// Prepare package from metadata
	p, err := pkg.PreparePackageFromMetadata(md)
	if err != nil {
		return fmt.Errorf("error preparing package %s version %s from metadata: %w", md.Name, md.Version, err)
	}
	p.LogoImageID = logoImageID
	p.Repository = t.r

	// Include kind specific data into package
	ignorer, err := ignore.CompileIgnoreLines(md.Ignore...)
	if err != nil {
		return fmt.Errorf("error processing package %s version %s ignore entries: %w", md.Name, md.Version, err)
	}
	var data map[string]interface{}
	switch t.r.Kind {
	case hub.Falco:
		data, err = prepareFalcoData(pkgPath, ignorer)
	case hub.OPA:
		data, err = prepareOPAData(pkgPath, ignorer)
	}
	if err != nil {
		return fmt.Errorf("error preparing package %s version %s data: %w", md.Name, md.Version, err)
	}
	p.Data = data

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
