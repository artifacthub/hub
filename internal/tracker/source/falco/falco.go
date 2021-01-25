package falco

import (
	"errors"
	"fmt"
	"image"
	"io/ioutil"
	"os"
	"path/filepath"
	"strings"

	"github.com/Masterminds/semver/v3"
	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/img"
	"github.com/artifacthub/hub/internal/pkg"
	"github.com/artifacthub/hub/internal/repo"
	"gopkg.in/yaml.v2"
)

// TrackerSource is a hub.TrackerSource implementation for Falco repositories.
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
		if err != nil || info.IsDir() {
			return nil
		}

		// Only process rules files
		if !info.Mode().IsRegular() || filepath.Ext(info.Name()) != ".yaml" {
			return nil
		}

		// Read and parse rules metadata file
		data, err := ioutil.ReadFile(pkgPath)
		if err != nil {
			s.warn(fmt.Errorf("error reading rules metadata file: %w", err))
			return nil
		}
		var md *RulesMetadata
		if err = yaml.Unmarshal(data, &md); err != nil || md == nil {
			s.warn(fmt.Errorf("error unmarshaling rules metadata file: %w", err))
			return nil
		}

		// Only Falco rules are supported
		if md.Kind != "FalcoRules" {
			return nil
		}

		// Prepare and store package version
		p, err := s.preparePackage(s.i.Repository, md, strings.TrimPrefix(pkgPath, s.i.BasePath))
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

// preparePackage prepares a package version using the rules metadata provided.
func (s *TrackerSource) preparePackage(r *hub.Repository, md *RulesMetadata, pkgPath string) (*hub.Package, error) {
	// Parse and validate version
	sv, err := semver.NewVersion(md.Version)
	if err != nil {
		return nil, fmt.Errorf("invalid package (%s) version (%s): %w", md.Name, md.Version, err)
	}
	version := sv.String()

	// Prepare source link url
	var repoBaseURL, pkgsPath, provider string
	matches := repo.GitRepoURLRE.FindStringSubmatch(r.URL)
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

	// Prepare package from metadata
	p := &hub.Package{
		Name:        md.Name,
		Version:     version,
		Description: md.ShortDescription,
		Keywords:    md.Keywords,
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
		Repository: r,
	}

	// Register logo image if available
	if md.Icon != "" {
		githubToken := s.i.Svc.Cfg.GetString("tracker.githubToken")
		data, err := img.Get(s.i.Svc.Ctx, s.i.Svc.Hc, githubToken, s.i.Svc.GithubRL, md.Icon)
		if err != nil {
			s.warn(fmt.Errorf("error downloading package %s version %s image: %w", p.Name, p.Version, err))
		} else {
			p.LogoURL = md.Icon
			p.LogoImageID, err = s.i.Svc.Is.SaveImage(s.i.Svc.Ctx, data)
			if err != nil && !errors.Is(err, image.ErrFormat) {
				s.warn(fmt.Errorf("error saving package %s version %s image: %w", p.Name, p.Version, err))
			}
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

// RulesMetadata represents some metadata for a Falco rules package.
type RulesMetadata struct {
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

// Rule represents some Falco rules in yaml format, used by RulesMetadata.
type Rule struct {
	Raw string `yaml:"raw"`
}
