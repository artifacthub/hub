package falco

import (
	"errors"
	"fmt"
	"image"
	"io/ioutil"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"

	"github.com/Masterminds/semver/v3"
	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/repo"
	"github.com/artifacthub/hub/internal/tracker"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
	"gopkg.in/yaml.v2"
)

// Tracker is in charge of tracking the packages available in a Falco rules
// repository, registering and unregistering them as needed.
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
		logger: log.With().Str("repo", r.Name).Logger(),
	}
	for _, o := range opts {
		o(t)
	}
	if t.svc.Rc == nil {
		t.svc.Rc = &repo.Cloner{}
	}
	return t
}

// Track registers or unregisters the falco rules packages available as needed.
func (t *Tracker) Track(wg *sync.WaitGroup) error {
	defer wg.Done()

	// Clone repository
	t.logger.Debug().Msg("cloning repository")
	tmpDir, packagesPath, err := t.svc.Rc.CloneRepository(t.svc.Ctx, t.r)
	if err != nil {
		return fmt.Errorf("error cloning repository: %w", err)
	}
	defer os.RemoveAll(tmpDir)

	// Load packages already registered from this repository
	packagesRegistered, err := t.svc.Rm.GetPackagesDigest(t.svc.Ctx, t.r.RepositoryID)
	if err != nil {
		return fmt.Errorf("error getting registered packages: %w", err)
	}

	// Register available packages when needed
	bypassDigestCheck := t.svc.Cfg.GetBool("tracker.bypassDigestCheck")
	packagesAvailable := make(map[string]struct{})
	basePath := filepath.Join(tmpDir, packagesPath)
	err = filepath.Walk(basePath, func(pkgPath string, info os.FileInfo, err error) error {
		if err != nil {
			return fmt.Errorf("error reading packages: %w", err)
		}
		if info.IsDir() {
			return nil
		}
		if !strings.HasSuffix(info.Name(), "yaml") {
			return nil
		}
		select {
		case <-t.svc.Ctx.Done():
			return nil
		default:
		}

		// Parse package metadata file and validate it
		data, err := ioutil.ReadFile(pkgPath)
		if err != nil {
			t.warn(fmt.Errorf("error reading package metadata file %s: %w", pkgPath, err))
			return nil
		}
		var md *PackageMetadata
		if err = yaml.Unmarshal(data, &md); err != nil || md == nil {
			t.warn(fmt.Errorf("error unmarshaling package metadata file %s: %w", pkgPath, err))
			return nil
		}
		if _, err := semver.StrictNewVersion(md.Version); err != nil {
			t.warn(fmt.Errorf("invalid package %s version (%s): %w", md.Name, md.Name, err))
			return nil
		}

		// Check if this package should be registered
		if md.Kind != "FalcoRules" {
			t.warn(fmt.Errorf("invalid package %s kind (%s)", md.Name, md.Kind))
			return nil
		}
		key := fmt.Sprintf("%s@%s", md.Name, md.Version)
		packagesAvailable[key] = struct{}{}
		if _, ok := packagesRegistered[key]; ok && !bypassDigestCheck {
			return nil
		}

		// Register package
		t.logger.Debug().Str("name", md.Name).Str("v", md.Version).Msg("registering package")
		err = t.registerPackage(md, strings.TrimPrefix(pkgPath, basePath))
		if err != nil {
			t.warn(fmt.Errorf("error registering package %s version %s: %w", md.Name, md.Version, err))
		}
		return nil
	})
	if err != nil {
		return err
	}

	// Unregister packages not available anymore
	for key := range packagesRegistered {
		select {
		case <-t.svc.Ctx.Done():
			return nil
		default:
		}
		if _, ok := packagesAvailable[key]; !ok {
			p := strings.Split(key, "@")
			name := p[0]
			version := p[1]
			t.logger.Debug().Str("name", name).Str("v", version).Msg("unregistering package")
			if err := t.unregisterPackage(name, version); err != nil {
				t.warn(fmt.Errorf("error unregistering package %s version %s: %w", name, version, err))
			}
		}
	}

	return nil
}

// registerPackage registers a package version using the package metadata
// provided.
func (t *Tracker) registerPackage(md *PackageMetadata, pkgPath string) error {
	// Register logo image if needed
	var logoURL, logoImageID string
	if md.Icon != "" {
		logoURL = md.Icon
		data, err := downloadImage(logoURL)
		if err != nil {
			return fmt.Errorf("error downloading package %s version %s image: %w", md.Name, md.Version, err)
		}
		logoImageID, err = t.svc.Is.SaveImage(t.svc.Ctx, data)
		if err != nil && !errors.Is(err, image.ErrFormat) {
			return fmt.Errorf("error saving package %s version %s image: %w", md.Name, md.Version, err)
		}
	}

	// Prepare source link
	var repoBaseURL, pkgsPath, provider string
	matches := repo.GitRepoURLRE.FindStringSubmatch(t.r.URL)
	if len(matches) >= 3 {
		repoBaseURL = matches[1]
		provider = matches[2]
	}
	if len(matches) == 4 {
		pkgsPath = strings.TrimSuffix(matches[3], "/")
	}
	var blobPath string
	switch provider {
	case "github":
		blobPath = "blob/master"
	case "gitlab":
		blobPath = "-/blob/master"
	}
	sourceURL := fmt.Sprintf("%s/%s/%s%s", repoBaseURL, blobPath, pkgsPath, pkgPath)

	// Build package and register it
	p := &hub.Package{
		Name:        md.Name,
		LogoURL:     logoURL,
		LogoImageID: logoImageID,
		Description: md.ShortDescription,
		Keywords:    md.Keywords,
		Version:     md.Version,
		Readme:      md.Description,
		Provider:    md.Vendor,
		Data: map[string]interface{}{
			"rules": md.Rules,
		},
		Links: []*hub.Link{
			{
				Name: "source",
				URL:  sourceURL,
			},
		},
		Repository: t.r,
	}
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
	log.Warn().Err(err).Send()
}

// PackageMetadata represents some metadata for a Falco rules package.
type PackageMetadata struct {
	Kind             string   `yaml:"kind"`
	Name             string   `yaml:"name"`
	ShortDescription string   `yaml:"shortDescription"`
	Version          string   `yaml:"version"`
	Description      string   `yaml:"description"`
	Keywords         []string `yaml:"keywords"`
	Icon             string   `yaml:"icon"`
	Vendor           string   `yaml:"vendor"`
	Rules            []*Rule  `yaml:"rules"`
}

// Rule represents some Falco rules in yaml format, used by PackageMetadata.
type Rule struct {
	Raw string `yaml:"raw"`
}

// downloadImage is a helper function used to download the image located in the
// url provided.
func downloadImage(u string) ([]byte, error) {
	resp, err := http.Get(fmt.Sprint(u))
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode == http.StatusOK {
		return ioutil.ReadAll(resp.Body)
	}
	return nil, fmt.Errorf("unexpected status code received: %d", resp.StatusCode)
}
