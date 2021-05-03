package pkg

import (
	"errors"
	"fmt"
	"io/ioutil"
	"strings"
	"time"

	"github.com/Masterminds/semver/v3"
	"github.com/artifacthub/hub/internal/hub"
	"gopkg.in/yaml.v2"
)

var (
	// ErrInvalidMetadata indicates that the metadata provided is not valid.
	ErrInvalidMetadata = errors.New("invalid metadata")

	// validChangeKinds is the list of valid kinds that a pkg change can use.
	validChangeKinds = []string{
		"added",
		"changed",
		"deprecated",
		"removed",
		"fixed",
		"security",
	}
)

// GetPackageMetadata reads, parses and validates the package metadata file provided.
func GetPackageMetadata(mdFile string) (*hub.PackageMetadata, error) {
	var data []byte
	var err error
	for _, extension := range []string{".yml", ".yaml"} {
		data, err = ioutil.ReadFile(mdFile + extension)
		if err == nil {
			break
		}
	}
	if err != nil {
		return nil, fmt.Errorf("error reading package metadata file: %w", err)
	}

	var md *hub.PackageMetadata
	if err = yaml.Unmarshal(data, &md); err != nil || md == nil {
		return nil, fmt.Errorf("error unmarshaling package metadata file: %w", err)
	}
	if err := ValidatePackageMetadata(md); err != nil {
		return nil, fmt.Errorf("error validating package metadata file: %w", err)
	}

	return md, nil
}

// PreparePackageFromMetadata prepares a Package struct that will be used to
// proceed with a package registration from the PackageMetadata provided by the
// publisher.
func PreparePackageFromMetadata(md *hub.PackageMetadata) (*hub.Package, error) {
	if err := ValidatePackageMetadata(md); err != nil {
		return nil, err
	}
	for _, change := range md.Changes {
		NormalizeChange(change)
	}
	sv, _ := semver.NewVersion(md.Version)
	p := &hub.Package{
		Name:                    md.Name,
		IsOperator:              md.Operator,
		DisplayName:             md.DisplayName,
		Description:             md.Description,
		Keywords:                md.Keywords,
		HomeURL:                 md.HomeURL,
		Readme:                  md.Readme,
		Install:                 md.Install,
		Changes:                 md.Changes,
		ContainsSecurityUpdates: md.ContainsSecurityUpdates,
		Prerelease:              md.Prerelease,
		Links:                   md.Links,
		Version:                 sv.String(),
		AppVersion:              md.AppVersion,
		Digest:                  md.Digest,
		Deprecated:              md.Deprecated,
		License:                 md.License,
		ContainersImages:        md.ContainersImages,
		Maintainers:             md.Maintainers,
		Recommendations:         md.Recommendations,
	}
	if md.Provider != nil {
		p.Provider = md.Provider.Name
	}
	ts, _ := time.Parse(time.RFC3339, md.CreatedAt)
	p.TS = ts.Unix()
	return p, nil
}

// ValidatePackageMetadata validates if the package metadata provided is valid.
func ValidatePackageMetadata(md *hub.PackageMetadata) error {
	if md.Version == "" {
		return fmt.Errorf("%w: %s", ErrInvalidMetadata, "version not provided")
	}
	if _, err := semver.NewVersion(md.Version); err != nil {
		return fmt.Errorf("%w: %s: %v", ErrInvalidMetadata, "invalid version (semver expected)", err)
	}
	if md.Name == "" {
		return fmt.Errorf("%w: %s", ErrInvalidMetadata, "name not provided")
	}
	if md.DisplayName == "" {
		return fmt.Errorf("%w: %s", ErrInvalidMetadata, "display name not provided")
	}
	if md.CreatedAt == "" {
		return fmt.Errorf("%w: %s", ErrInvalidMetadata, "createdAt not provided")
	}
	if _, err := time.Parse(time.RFC3339, md.CreatedAt); err != nil {
		return fmt.Errorf("%w: %s: %v", ErrInvalidMetadata, "invalid createdAt (RFC3339 expected)", err)
	}
	if md.Description == "" {
		return fmt.Errorf("%w: %s", ErrInvalidMetadata, "description not provided")
	}
	for _, change := range md.Changes {
		if err := ValidateChange(change); err != nil {
			return fmt.Errorf("%w: %v", ErrInvalidMetadata, err)
		}
	}
	return nil
}

// ValidateChange validates if the provided change is valid.
func ValidateChange(change *hub.Change) error {
	if change.Kind != "" && !isValidChangeKind(change.Kind) {
		return fmt.Errorf("invalid change: invalid kind: %s", change.Kind)
	}
	if change.Description == "" {
		return errors.New("invalid change: description not provided")
	}
	for _, link := range change.Links {
		if link.Name == "" {
			return errors.New("invalid change: link name not provided")
		}
		if link.URL == "" {
			return errors.New("invalid change: link url not provided")
		}
	}
	return nil
}

// NormalizeChange normalizes some values of the change provided when needed.
func NormalizeChange(change *hub.Change) {
	change.Kind = strings.ToLower(change.Kind)
}

// isValidChange checks if the provided change is valid.
func isValidChangeKind(kind string) bool {
	for _, validKind := range validChangeKinds {
		if strings.ToLower(kind) == validKind {
			return true
		}
	}
	return false
}
