package pkg

import (
	"errors"
	"fmt"
	"time"

	"github.com/Masterminds/semver/v3"
	"github.com/artifacthub/hub/internal/hub"
)

var (
	// ErrInvalidMetadata indicates that the metadata provided is not valid.
	ErrInvalidMetadata = errors.New("invalid metadata")
)

// PreparePackageFromMetadata prepares a Package struct that will be used to
// proceed with a package registration from the PackageMetadata provided by the
// publisher.
func PreparePackageFromMetadata(md *hub.PackageMetadata) (*hub.Package, error) {
	if err := ValidatePackageMetadata(md); err != nil {
		return nil, err
	}
	p := &hub.Package{
		Name:             md.Name,
		IsOperator:       md.Operator,
		DisplayName:      md.DisplayName,
		Description:      md.Description,
		Keywords:         md.Keywords,
		HomeURL:          md.HomeURL,
		Readme:           md.Readme,
		Install:          md.Install,
		Links:            md.Links,
		Version:          md.Version,
		AppVersion:       md.AppVersion,
		Digest:           md.Digest,
		Deprecated:       md.Deprecated,
		License:          md.License,
		ContainersImages: md.ContainersImages,
		Maintainers:      md.Maintainers,
	}
	if md.Provider != nil {
		p.Provider = md.Provider.Name
	}
	createdAt, _ := time.Parse(time.RFC3339, md.CreatedAt)
	p.CreatedAt = createdAt.Unix()
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
	return nil
}
