package main

import (
	"context"
	"errors"
	"fmt"
	"image"
	"io/ioutil"
	"os"
	"path/filepath"
	"strings"
	"sync"

	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/img"
	"github.com/artifacthub/hub/internal/pkg"
	"github.com/artifacthub/hub/internal/repo"
	"github.com/artifacthub/hub/internal/tracker"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
	"github.com/spf13/viper"
	"gopkg.in/yaml.v2"
)

// Tracker is in charge of tracking the packages available in a OPA policies
// repository, registering and unregistering them as needed.
type Tracker struct {
	ctx    context.Context
	cfg    *viper.Viper
	r      *hub.Repository
	rc     hub.RepositoryCloner
	rm     hub.RepositoryManager
	pm     hub.PackageManager
	is     img.Store
	ec     tracker.ErrorsCollector
	Logger zerolog.Logger
}

// NewTracker creates a new Tracker instance.
func NewTracker(
	ctx context.Context,
	cfg *viper.Viper,
	r *hub.Repository,
	rm hub.RepositoryManager,
	pm hub.PackageManager,
	is img.Store,
	ec tracker.ErrorsCollector,
	opts ...func(t *Tracker),
) *Tracker {
	t := &Tracker{
		ctx:    ctx,
		cfg:    cfg,
		r:      r,
		rm:     rm,
		pm:     pm,
		is:     is,
		ec:     ec,
		Logger: log.With().Str("repo", r.Name).Logger(),
	}
	for _, o := range opts {
		o(t)
	}
	if t.rc == nil {
		t.rc = &repo.Cloner{}
	}
	return t
}

// Track registers or unregisters the OPA policies packages available as needed.
func (t *Tracker) Track(wg *sync.WaitGroup) error {
	defer wg.Done()

	// Clone repository
	t.Logger.Debug().Msg("cloning repository")
	tmpDir, packagesPath, err := t.rc.CloneRepository(t.ctx, t.r)
	if err != nil {
		return fmt.Errorf("error cloning repository: %w", err)
	}
	defer os.RemoveAll(tmpDir)

	// Load packages already registered from this repository
	packagesRegistered, err := t.rm.GetPackagesDigest(t.ctx, t.r.RepositoryID)
	if err != nil {
		return fmt.Errorf("error getting registered packages: %w", err)
	}

	// Register available packages when needed
	bypassDigestCheck := t.cfg.GetBool("tracker.bypassDigestCheck")
	packagesAvailable := make(map[string]struct{})
	basePath := filepath.Join(tmpDir, packagesPath)
	err = filepath.Walk(basePath, func(pkgPath string, info os.FileInfo, err error) error {
		if err != nil {
			return fmt.Errorf("error reading packages: %w", err)
		}
		if !info.IsDir() {
			return nil
		}

		// Check if context has been cancelled
		select {
		case <-t.ctx.Done():
			return nil
		default:
		}

		// Read and parse package version metadata
		data, err := ioutil.ReadFile(filepath.Join(pkgPath, "artifacthub.yaml"))
		if err != nil {
			return nil
		}
		var md *hub.PackageMetadata
		if err = yaml.Unmarshal(data, &md); err != nil || md == nil {
			t.Warn(fmt.Errorf("error unmarshaling package version metadata file %s: %w", pkgPath, err))
			return nil
		}

		// Check if this package version is already registered
		key := fmt.Sprintf("%s@%s", md.Name, md.Version)
		packagesAvailable[key] = struct{}{}
		if _, ok := packagesRegistered[key]; ok && !bypassDigestCheck {
			return nil
		}

		// Read logo image when available
		var logoImageID string
		if md.LogoPath != "" {
			data, err := ioutil.ReadFile(filepath.Join(pkgPath, md.LogoPath))
			if err != nil {
				return fmt.Errorf("error reading package %s version %s logo: %w", md.Name, md.Version, err)
			}
			logoImageID, err = t.is.SaveImage(t.ctx, data)
			if err != nil && !errors.Is(err, image.ErrFormat) {
				return fmt.Errorf("error saving package %s version %s logo: %w", md.Name, md.Version, err)
			}
		}

		// Register package version
		t.Logger.Debug().Str("name", md.Name).Str("v", md.Version).Msg("registering package")
		err = t.registerPackage(pkgPath, md, logoImageID)
		if err != nil {
			t.Warn(fmt.Errorf("error registering package %s version %s: %w", md.Name, md.Version, err))
		}

		return nil
	})
	if err != nil {
		return err
	}

	// Unregister packages not available anymore
	for key := range packagesRegistered {
		select {
		case <-t.ctx.Done():
			return nil
		default:
		}
		if _, ok := packagesAvailable[key]; !ok {
			p := strings.Split(key, "@")
			name := p[0]
			version := p[1]
			t.Logger.Debug().Str("name", name).Str("v", version).Msg("unregistering package")
			if err := t.unregisterPackage(name, version); err != nil {
				t.Warn(fmt.Errorf("error unregistering package %s version %s: %w", name, version, err))
			}
		}
	}

	return nil
}

// Warn is a helper that sends the error provided to the errors collector and
// logs it as a warning.
func (t *Tracker) Warn(err error) {
	t.ec.Append(t.r.RepositoryID, err)
	log.Warn().Err(err).Send()
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

	// Read policies files and add them to the package data field
	policies := make(map[string]string)
	err = filepath.Walk(pkgPath, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return fmt.Errorf("error reading policy files: %w", err)
		}
		if info.IsDir() {
			return nil
		}
		if !strings.HasSuffix(info.Name(), ".rego") {
			return nil
		}
		policy, err := ioutil.ReadFile(path)
		if err != nil {
			return fmt.Errorf("error reading policy for package %s version %s: %w", md.Name, md.Version, err)
		}
		policies[strings.TrimPrefix(path, pkgPath+"/")] = string(policy)
		return nil
	})
	if err != nil {
		return err
	}
	p.Data = map[string]interface{}{
		"policies": policies,
	}

	// Register package
	return t.pm.Register(t.ctx, p)
}

// unregisterPackage unregisters the package version provided.
func (t *Tracker) unregisterPackage(name, version string) error {
	p := &hub.Package{
		Name:       name,
		Version:    version,
		Repository: t.r,
	}
	return t.pm.Unregister(t.ctx, p)
}
