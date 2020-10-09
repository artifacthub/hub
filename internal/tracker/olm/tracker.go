package olm

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/Masterminds/semver/v3"
	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/repo"
	"github.com/artifacthub/hub/internal/tracker"
	"github.com/ghodss/yaml"
	"github.com/operator-framework/api/pkg/manifests"
	operatorsv1alpha1 "github.com/operator-framework/api/pkg/operators/v1alpha1"
	"github.com/operator-framework/api/pkg/validation"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
)

const (
	licenseAnnotation = "artifacthub.io/license"
)

var (
	// channelVersionRE is a regexp used to extract the version from the
	// channel CurrentCSVName.
	channelVersionRE = regexp.MustCompile(`^[A-Za-z0-9_-]+\.v?(.*)$`)
)

// Tracker is in charge of tracking the packages available in a OLM operators
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

// Track registers or unregisters the OLM operators packages available in the
// repository provided as needed.
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
		if !info.IsDir() {
			return nil
		}

		// Get package manifest
		manifest, err := t.getPackageManifest(pkgPath)
		if err != nil {
			t.warn(fmt.Errorf("error getting package manifest from %s: %w", pkgPath, err))
			return nil
		}
		// Package manifest not found, not a package path
		if manifest == nil {
			return nil
		}

		// Get package versions available
		pkgName := manifest.PackageName
		versionsUnfiltered, err := ioutil.ReadDir(pkgPath)
		if err != nil {
			t.warn(fmt.Errorf("error reading package %s versions: %w", pkgName, err))
			return nil
		}
		var versions []os.FileInfo
		for _, entryV := range versionsUnfiltered {
			if !entryV.IsDir() {
				continue
			}
			if _, err := semver.StrictNewVersion(entryV.Name()); err != nil {
				t.warn(fmt.Errorf("invalid package %s version (%s): %w", pkgName, entryV.Name(), err))
				continue
			} else {
				versions = append(versions, entryV)
			}
		}
		sort.Slice(versions, func(i, j int) bool {
			vi, _ := semver.NewVersion(versions[i].Name())
			vj, _ := semver.NewVersion(versions[j].Name())
			return vj.LessThan(vi)
		})

		// Process package versions found
		for i, entryV := range versions {
			select {
			case <-t.svc.Ctx.Done():
				return nil
			default:
			}
			version := entryV.Name()

			// Get package version CSV
			pkgVersionPath := filepath.Join(pkgPath, version)
			csv, err := t.getPackageVersionCSV(pkgVersionPath)
			if err != nil {
				t.warn(fmt.Errorf("error getting package %s version %s csv: %w", pkgName, version, err))
				continue
			}

			// Check if this package version is already registered
			key := fmt.Sprintf("%s@%s", pkgName, getPackageVersion(csv))
			packagesAvailable[key] = struct{}{}
			if _, ok := packagesRegistered[key]; ok && !bypassDigestCheck {
				continue
			}

			// Register package version
			t.logger.Debug().Str("name", pkgName).Str("v", version).Msg("registering package")
			var storeLogo bool
			if i == 0 {
				storeLogo = true
			}
			err = t.registerPackage(pkgName, manifest, csv, storeLogo)
			if err != nil {
				t.warn(fmt.Errorf("error registering package %s version %s: %w", pkgName, version, err))
			}
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

	// Set verified publisher flag if needed
	err = tracker.SetVerifiedPublisherFlag(t.svc, t.r, filepath.Join(basePath, hub.RepositoryMetadataFile))
	if err != nil {
		t.warn(fmt.Errorf("error setting verified publisher flag: %w", err))
	}

	return nil
}

// getPackageManifest reads and parses the package manifest.
func (t *Tracker) getPackageManifest(path string) (*manifests.PackageManifest, error) {
	// Locate package manifest file
	matches, err := filepath.Glob(filepath.Join(path, "*.package.yaml"))
	if err != nil {
		return nil, fmt.Errorf("error locating package manifest file: %w", err)
	}
	if len(matches) != 1 {
		return nil, nil
	}
	manifestPath := matches[0]

	// Read and parse package manifest file
	manifestData, err := ioutil.ReadFile(manifestPath)
	if err != nil {
		return nil, fmt.Errorf("error reading package manifest file: %w", err)
	}
	manifest := &manifests.PackageManifest{}
	if err = yaml.Unmarshal(manifestData, &manifest); err != nil {
		return nil, fmt.Errorf("error unmarshaling package manifest file: %w", err)
	}

	return manifest, nil
}

// getPackageVersionCSV reads, parses and validates the cluster service version
// file of the given package version.
func (t *Tracker) getPackageVersionCSV(path string) (*operatorsv1alpha1.ClusterServiceVersion, error) {
	// Locate cluster service version file
	matches, err := filepath.Glob(filepath.Join(path, "*.clusterserviceversion.yaml"))
	if err != nil {
		return nil, fmt.Errorf("error locating csv file: %w", err)
	}
	if len(matches) != 1 {
		return nil, fmt.Errorf("csv file not found in %s", path)
	}
	csvPath := matches[0]

	// Read and parse cluster service version file
	csvData, err := ioutil.ReadFile(csvPath)
	if err != nil {
		return nil, fmt.Errorf("error reading csv file: %w", err)
	}
	csv := &operatorsv1alpha1.ClusterServiceVersion{}
	if err = yaml.Unmarshal(csvData, &csv); err != nil {
		return nil, fmt.Errorf("error unmarshaling csv file: %w", err)
	}

	// Validate cluster service version
	results := validation.ClusterServiceVersionValidator.Validate(csv)
	for _, result := range results {
		for _, err := range result.Errors {
			t.warn(fmt.Errorf("error validating csv (%s): %w", filepath.Base(csvPath), err))
		}
	}

	return csv, nil
}

// registerPackage registers the package version provided.
func (t *Tracker) registerPackage(
	name string,
	manifest *manifests.PackageManifest,
	csv *operatorsv1alpha1.ClusterServiceVersion,
	storeLogo bool,
) error {
	// Store logo when available if requested
	var logoImageID string
	if storeLogo && len(csv.Spec.Icon) > 0 && csv.Spec.Icon[0].Data != "" {
		data, err := base64.StdEncoding.DecodeString(csv.Spec.Icon[0].Data)
		if err != nil {
			t.warn(fmt.Errorf("error decoding package %s logo image: %w", name, err))
		} else {
			logoImageID, err = t.svc.Is.SaveImage(t.svc.Ctx, data)
			if err != nil {
				t.warn(fmt.Errorf("error saving package %s image: %w", name, err))
			}
		}
	}

	// Prepare package from CSV content
	p := &hub.Package{
		Name:           name,
		DisplayName:    csv.Spec.DisplayName,
		LogoImageID:    logoImageID,
		Description:    csv.Annotations["description"],
		Keywords:       csv.Spec.Keywords,
		Readme:         csv.Spec.Description,
		Version:        getPackageVersion(csv),
		IsOperator:     true,
		Capabilities:   csv.Annotations["capabilities"],
		DefaultChannel: manifest.DefaultChannelName,
		License:        csv.Annotations[licenseAnnotation],
		Provider:       csv.Spec.Provider.Name,
		Repository:     t.r,
	}
	if containerImage, ok := csv.Annotations["containerImage"]; ok && containerImage != "" {
		p.ContainersImages = []*hub.ContainerImage{
			{
				Image: containerImage,
			},
		}
	}
	createdAt, err := time.Parse(time.RFC3339, csv.Annotations["createdAt"])
	if err == nil {
		p.CreatedAt = createdAt.Unix()
	} else {
		// Try alternative layout
		createdAt, err = time.Parse("2006-01-02 15:04:05", csv.Annotations["createdAt"])
		if err == nil {
			p.CreatedAt = createdAt.Unix()
		}
	}
	for _, channel := range manifest.Channels {
		matches := channelVersionRE.FindStringSubmatch(channel.CurrentCSVName)
		if len(matches) != 2 {
			t.warn(fmt.Errorf("error getting version from %s", channel.CurrentCSVName))
			continue
		}
		version := matches[1]
		p.Channels = append(p.Channels, &hub.Channel{
			Name:    channel.Name,
			Version: version,
		})
	}
	for _, category := range strings.Split(csv.Annotations["categories"], ",") {
		if strings.Trim(strings.ToLower(category), " ") == "ai/machine learning" {
			p.Keywords = append(p.Keywords, []string{"AI", "Machine Learning"}...)
		} else {
			p.Keywords = append(p.Keywords, strings.Trim(category, " "))
		}
	}
	for _, link := range csv.Spec.Links {
		p.Links = append(p.Links, &hub.Link{
			Name: link.Name,
			URL:  link.URL,
		})
	}
	if csv.Annotations["repository"] != "" {
		p.Links = append(p.Links, &hub.Link{
			Name: "source",
			URL:  csv.Annotations["repository"],
		})
	}
	for _, maintainer := range csv.Spec.Maintainers {
		p.Maintainers = append(p.Maintainers, &hub.Maintainer{
			Name:  maintainer.Name,
			Email: maintainer.Email,
		})
	}
	var isGlobalOperator bool
	for _, e := range csv.Spec.InstallModes {
		if e.Type == operatorsv1alpha1.InstallModeTypeAllNamespaces && e.Supported {
			isGlobalOperator = true
		}
	}
	crds := make([]interface{}, 0, len(csv.Spec.CustomResourceDefinitions.Owned))
	for _, crd := range csv.Spec.CustomResourceDefinitions.Owned {
		crds = append(crds, map[string]interface{}{
			"name":        crd.Name,
			"version":     crd.Version,
			"kind":        crd.Kind,
			"displayName": crd.DisplayName,
			"description": crd.Description,
		})
	}
	if len(crds) > 0 {
		p.CRDs = crds
	}
	var crdsExamples []interface{}
	if err := json.Unmarshal([]byte(csv.Annotations["alm-examples"]), &crdsExamples); err == nil {
		p.CRDsExamples = crdsExamples
	}
	p.Data = map[string]interface{}{
		"isGlobalOperator": isGlobalOperator,
	}

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

// getPackageVersion returns the package version from the cluster service
// version provided.
func getPackageVersion(csv *operatorsv1alpha1.ClusterServiceVersion) string {
	return csv.Spec.Version.String()
}
