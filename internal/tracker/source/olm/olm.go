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
	"strconv"
	"strings"
	"time"

	"github.com/Masterminds/semver/v3"
	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/pkg"
	"github.com/artifacthub/hub/internal/tracker/source"
	"github.com/ghodss/yaml"
	"github.com/operator-framework/api/pkg/manifests"
	operatorsv1alpha1 "github.com/operator-framework/api/pkg/operators/v1alpha1"
)

const (
	changesAnnotation         = "artifacthub.io/changes"
	imagesWhitelistAnnotation = "artifacthub.io/imagesWhitelist"
	installAnnotation         = "artifacthub.io/install"
	licenseAnnotation         = "artifacthub.io/license"
	prereleaseAnnotation      = "artifacthub.io/prerelease"
	recommendationsAnnotation = "artifacthub.io/recommendations"
	securityUpdatesAnnotation = "artifacthub.io/containsSecurityUpdates"
)

var (
	// channelVersionRE is a regexp used to extract the version from the
	// channel CurrentCSVName.
	channelVersionRE = regexp.MustCompile(`^[A-Za-z0-9_-]+\.v?(.*)$`)
)

// TrackerSource is a hub.TrackerSource implementation for OLM repositories.
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

		// Get package manifest
		manifest, err := getManifest(pkgPath)
		if err != nil {
			s.warn(fmt.Errorf("error getting package manifest: %w", err))
			return nil
		}
		if manifest == nil {
			// Package manifest not found, not a package path
			return nil
		}

		// Get package versions
		pkgName := manifest.PackageName
		versionsUnfiltered, err := ioutil.ReadDir(pkgPath)
		if err != nil {
			s.warn(fmt.Errorf("error reading package %s versions: %w", pkgName, err))
			return nil
		}
		var versions []os.FileInfo
		for _, entryV := range versionsUnfiltered {
			if !entryV.IsDir() {
				continue
			}
			if _, err := semver.StrictNewVersion(entryV.Name()); err != nil {
				s.warn(fmt.Errorf("invalid package %s version (%s): %w", pkgName, entryV.Name(), err))
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

		// Process package versions
		for _, entryV := range versions {
			// Get package version CSV
			version := entryV.Name()
			pkgVersionPath := filepath.Join(pkgPath, version)
			csv, csvData, err := getCSV(pkgVersionPath)
			if err != nil {
				s.warn(fmt.Errorf("error getting package %s version %s csv: %w", pkgName, version, err))
				continue
			}

			// Prepare and store package version
			p, err := s.preparePackage(s.i.Repository, manifest, csv, csvData)
			if err != nil {
				s.warn(fmt.Errorf("error preparing package %s version %s: %w", pkgName, version, err))
				continue
			}
			packagesAvailable[pkg.BuildKey(p)] = p
		}

		return nil
	})
	if err != nil {
		return nil, err
	}

	return packagesAvailable, nil
}

// preparePackage prepares a package version using the package manifest and csv.
func (s *TrackerSource) preparePackage(
	r *hub.Repository,
	manifest *manifests.PackageManifest,
	csv *operatorsv1alpha1.ClusterServiceVersion,
	csvData []byte,
) (*hub.Package, error) {
	// Prepare package from manifest and csv
	p := &hub.Package{
		Name:           manifest.PackageName,
		DisplayName:    csv.Spec.DisplayName,
		Description:    csv.Annotations["description"],
		Keywords:       csv.Spec.Keywords,
		Readme:         csv.Spec.Description,
		Version:        csv.Spec.Version.String(),
		IsOperator:     true,
		Capabilities:   csv.Annotations["capabilities"],
		DefaultChannel: manifest.DefaultChannelName,
		License:        csv.Annotations[licenseAnnotation],
		Provider:       csv.Spec.Provider.Name,
		Install:        csv.Annotations[installAnnotation],
		Repository:     r,
	}

	// Containers images
	containersImages, err := getContainersImages(csv, csvData)
	if err != nil {
		return nil, err
	}
	p.ContainersImages = containersImages

	// TS
	ts, err := time.Parse(time.RFC3339, csv.Annotations["createdAt"])
	if err == nil {
		p.TS = ts.Unix()
	} else {
		// Try alternative layout
		ts, err = time.Parse("2006-01-02 15:04:05", csv.Annotations["createdAt"])
		if err == nil {
			p.TS = ts.Unix()
		}
	}

	// Keywords
	for _, category := range strings.Split(csv.Annotations["categories"], ",") {
		if strings.Trim(strings.ToLower(category), " ") == "ai/machine learning" {
			p.Keywords = append(p.Keywords, []string{"AI", "Machine Learning"}...)
		} else {
			p.Keywords = append(p.Keywords, strings.Trim(category, " "))
		}
	}

	// Links
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

	// Store logo when available
	if len(csv.Spec.Icon) > 0 && csv.Spec.Icon[0].Data != "" {
		data, err := base64.StdEncoding.DecodeString(csv.Spec.Icon[0].Data)
		if err != nil {
			s.warn(fmt.Errorf("error decoding package %s logo image: %w", p.Name, err))
		} else {
			p.LogoImageID, err = s.i.Svc.Is.SaveImage(s.i.Svc.Ctx, data)
			if err != nil {
				s.warn(fmt.Errorf("error saving package %s image: %w", p.Name, err))
			}
		}
	}

	// Maintainers
	for _, maintainer := range csv.Spec.Maintainers {
		p.Maintainers = append(p.Maintainers, &hub.Maintainer{
			Name:  maintainer.Name,
			Email: maintainer.Email,
		})
	}

	// Channels
	for _, channel := range manifest.Channels {
		matches := channelVersionRE.FindStringSubmatch(channel.CurrentCSVName)
		if len(matches) != 2 {
			continue
		}
		version := matches[1]
		p.Channels = append(p.Channels, &hub.Channel{
			Name:    channel.Name,
			Version: version,
		})
	}

	// CRDs
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

	// Changes
	if v, ok := csv.Annotations[changesAnnotation]; ok {
		changes, err := source.ParseChangesAnnotation(v)
		if err != nil {
			return nil, err
		}
		p.Changes = changes
	}

	// Prerelease
	if v, ok := csv.Annotations[prereleaseAnnotation]; ok {
		prerelease, err := strconv.ParseBool(v)
		if err != nil {
			return nil, fmt.Errorf("invalid prerelease value: %s", v)
		}
		p.Prerelease = prerelease
	}

	// Recommendations
	if v, ok := csv.Annotations[recommendationsAnnotation]; ok {
		var recommendations []*hub.Recommendation
		if err := yaml.Unmarshal([]byte(v), &recommendations); err != nil {
			return nil, fmt.Errorf("invalid recommendations value: %s", v)
		}
		p.Recommendations = recommendations
	}

	// Security updates
	if v, ok := csv.Annotations[securityUpdatesAnnotation]; ok {
		containsSecurityUpdates, err := strconv.ParseBool(v)
		if err != nil {
			return nil, fmt.Errorf("invalid containsSecurityUpdates value: %s", v)
		}
		p.ContainsSecurityUpdates = containsSecurityUpdates
	}

	// Prepare data specific to the package kind
	var isGlobalOperator bool
	for _, e := range csv.Spec.InstallModes {
		if e.Type == operatorsv1alpha1.InstallModeTypeAllNamespaces && e.Supported {
			isGlobalOperator = true
		}
	}
	p.Data = map[string]interface{}{
		"isGlobalOperator": isGlobalOperator,
	}

	return p, nil
}

// warn is a helper that sends the error provided to the errors collector and
// logs it as a warning.
func (s *TrackerSource) warn(err error) {
	s.i.Svc.Logger.Warn().Err(err).Send()
	s.i.Svc.Ec.Append(s.i.Repository.RepositoryID, err.Error())
}

// getManifest reads and parses the package manifest.
func getManifest(pkgPath string) (*manifests.PackageManifest, error) {
	// Locate manifest file
	matches, err := filepath.Glob(filepath.Join(pkgPath, "*package.yaml"))
	if err != nil {
		return nil, fmt.Errorf("error locating manifest file: %w", err)
	}
	if len(matches) != 1 {
		return nil, nil
	}
	manifestPath := matches[0]

	// Read and parse manifest file
	manifestData, err := ioutil.ReadFile(manifestPath)
	if err != nil {
		return nil, fmt.Errorf("error reading manifest file: %w", err)
	}
	manifest := &manifests.PackageManifest{}
	if err = yaml.Unmarshal(manifestData, &manifest); err != nil {
		return nil, fmt.Errorf("error unmarshaling manifest file: %w", err)
	}

	return manifest, nil
}

// getCSV reads, parses and validates the cluster service version file of the
// given package version.
func getCSV(path string) (*operatorsv1alpha1.ClusterServiceVersion, []byte, error) {
	// Locate cluster service version file
	matches, err := filepath.Glob(filepath.Join(path, "*.clusterserviceversion.yaml"))
	if err != nil {
		return nil, nil, fmt.Errorf("error locating csv file: %w", err)
	}
	if len(matches) != 1 {
		return nil, nil, fmt.Errorf("csv file not found")
	}
	csvPath := matches[0]

	// Read and parse cluster service version file
	csvData, err := ioutil.ReadFile(csvPath)
	if err != nil {
		return nil, nil, fmt.Errorf("error reading csv file: %w", err)
	}
	csv := &operatorsv1alpha1.ClusterServiceVersion{}
	if err = yaml.Unmarshal(csvData, &csv); err != nil {
		return nil, nil, fmt.Errorf("error unmarshaling csv file: %w", err)
	}

	return csv, csvData, nil
}

// getContainersImages returns all containers images declared in the csv data
// provided.
func getContainersImages(
	csv *operatorsv1alpha1.ClusterServiceVersion,
	csvData []byte,
) ([]*hub.ContainerImage, error) {
	var images []*hub.ContainerImage

	// Container image annotation
	if containerImage, ok := csv.Annotations["containerImage"]; ok && containerImage != "" {
		images = append(images, &hub.ContainerImage{Image: containerImage})
	}

	// Related images
	type Spec struct {
		RelatedImages []*hub.ContainerImage `json:"relatedImages"`
	}
	type CSV struct {
		Spec Spec `json:"spec"`
	}
	csvRI := &CSV{}
	if err := yaml.Unmarshal(csvData, &csvRI); err == nil {
		images = append(images, csvRI.Spec.RelatedImages...)
	}

	// Images whitelisting
	if v, ok := csv.Annotations[imagesWhitelistAnnotation]; ok {
		var imagesWhitelist []string
		if err := yaml.Unmarshal([]byte(v), &imagesWhitelist); err != nil {
			return nil, fmt.Errorf("invalid imagesWhitelist value: %s", v)
		}
		for _, image := range images {
			if contains(imagesWhitelist, image.Image) {
				image.Whitelisted = true
			}
		}
	}

	return images, nil
}

// contains is a helper to check if a list contains the string provided.
func contains(l []string, e string) bool {
	for _, x := range l {
		if x == e {
			return true
		}
	}
	return false
}
