package olm

import (
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
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
	"github.com/hashicorp/go-multierror"
	"github.com/operator-framework/api/pkg/manifests"
	operatorsv1alpha1 "github.com/operator-framework/api/pkg/operators/v1alpha1"
	"sigs.k8s.io/yaml"
)

const (
	bundle          = "bundle"
	packageManifest = "packageManifest"

	formatKey           = "format"
	isGlobalOperatorKey = "isGlobalOperator"

	// Artifact Hub special annotations
	alternativeNameAnnotation = "artifacthub.io/alternativeName"
	categoryAnnotation        = "artifacthub.io/category"
	changesAnnotation         = "artifacthub.io/changes"
	imagesWhitelistAnnotation = "artifacthub.io/imagesWhitelist"
	installAnnotation         = "artifacthub.io/install"
	licenseAnnotation         = "artifacthub.io/license"
	prereleaseAnnotation      = "artifacthub.io/prerelease"
	recommendationsAnnotation = "artifacthub.io/recommendations"
	securityUpdatesAnnotation = "artifacthub.io/containsSecurityUpdates"
	screenshotsAnnotation     = "artifacthub.io/screenshots"
)

var (
	// channelVersionRE is a regexp used to extract the version from the
	// channel CurrentCSVName in the PackageManifest format.
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
	err := filepath.Walk(s.i.BasePath, func(path string, info os.FileInfo, err error) error {
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
		md, err := GetMetadata(path)
		if err != nil {
			s.warn(fmt.Errorf("error getting package metadata: %w", err))
			return nil
		}
		if md == nil {
			// Not a package path
			return nil
		}

		// Prepare and store package version
		p, err := PreparePackage(s.i.Repository, md)
		if err != nil {
			s.warn(fmt.Errorf("error preparing package %s version %s: %w", md.Name, md.Version, err))
			return nil
		}
		packagesAvailable[pkg.BuildKey(p)] = p
		logoImageID, err := s.prepareLogoImage(md)
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

	setPackagesChannels(packagesAvailable)
	setPackagesDefaultChannel(packagesAvailable)
	setPackagesDigest(packagesAvailable)

	return packagesAvailable, nil
}

// prepareLogoImage processes and stores the logo image provided.
func (s *TrackerSource) prepareLogoImage(md *Metadata) (string, error) {
	var logoImageID string

	if len(md.CSV.Spec.Icon) > 0 && md.CSV.Spec.Icon[0].Data != "" {
		data, err := base64.StdEncoding.DecodeString(md.CSV.Spec.Icon[0].Data)
		if err != nil {
			return "", fmt.Errorf("error decoding image: %w", err)
		}
		logoImageID, err = s.i.Svc.Is.SaveImage(s.i.Svc.Ctx, data)
		if err != nil {
			return "", fmt.Errorf("error saving image: %w", err)
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

// Metadata represents some information about an OLM operator version.
type Metadata struct {
	Format             string
	Name               string
	Version            string
	Channels           []*hub.Channel
	DefaultChannelName string
	CSV                *operatorsv1alpha1.ClusterServiceVersion
	CSVData            []byte
	CSVPath            string
}

// validate checks if the metadata provided is valid.
func (md *Metadata) validate() error {
	var errs *multierror.Error

	if md.Name == "" {
		errs = multierror.Append(errs, errors.New("name not provided"))
	}
	if md.Version == "" {
		errs = multierror.Append(errs, errors.New("version not provided"))
	} else if _, err := semver.StrictNewVersion(md.Version); err != nil {
		errs = multierror.Append(errs, fmt.Errorf("invalid version (semver expected): %w", err))
	}

	return errs.ErrorOrNil()
}

// GetMetadata returns the metadata for the package version located in the path
// provided.
func GetMetadata(path string) (*Metadata, error) {
	var md *Metadata

	// PackageManifest format
	manifest, err := getManifest(filepath.Join(path, ".."))
	if err != nil {
		return nil, err
	}
	if manifest != nil {
		csv, csvData, err := getCSV(path)
		if err != nil {
			return nil, fmt.Errorf("error getting package %s csv (path: %s): %w", manifest.PackageName, path, err)
		}
		var channels []*hub.Channel
		for _, channel := range manifest.Channels {
			matches := channelVersionRE.FindStringSubmatch(channel.CurrentCSVName)
			if len(matches) != 2 {
				continue
			}
			version := matches[1]
			channels = append(channels, &hub.Channel{
				Name:    channel.Name,
				Version: version,
			})
		}
		md = &Metadata{
			Format:             packageManifest,
			Name:               manifest.PackageName,
			Version:            csv.Spec.Version.String(),
			Channels:           channels,
			DefaultChannelName: manifest.DefaultChannelName,
			CSV:                csv,
			CSVData:            csvData,
		}
	}

	// Bundle format
	annotations, err := getBundleAnnotations(filepath.Join(path, "metadata"))
	if err != nil {
		return nil, err
	}
	if annotations != nil {
		csv, csvData, err := getCSV(filepath.Join(path, "manifests"))
		if err != nil {
			return nil, fmt.Errorf("error getting package %s csv (path: %s): %w", annotations.PackageName, path, err)
		}
		var channels []*hub.Channel
		for _, channelName := range strings.Split(annotations.Channels, ",") {
			channels = append(channels, &hub.Channel{
				Name:    channelName,
				Version: csv.Spec.Version.String(),
			})
		}
		md = &Metadata{
			Format:             bundle,
			Name:               annotations.PackageName,
			Version:            csv.Spec.Version.String(),
			Channels:           channels, // Will be updated when all package versions are processed
			DefaultChannelName: annotations.DefaultChannelName,
			CSV:                csv,
			CSVData:            csvData,
		}
	}

	if md != nil {
		if err := md.validate(); err != nil {
			return nil, fmt.Errorf("error validating metadata: %w", err)
		}
	}

	return md, nil
}

// getManifest reads and parses the package's manifest.
func getManifest(path string) (*manifests.PackageManifest, error) {
	// Locate manifest file
	matches, err := filepath.Glob(filepath.Join(path, "*package.yaml"))
	if err != nil {
		return nil, fmt.Errorf("error locating manifest file: %w", err)
	}
	if len(matches) != 1 {
		return nil, nil
	}
	manifestPath := matches[0]

	// Read and parse manifest file
	manifestData, err := os.ReadFile(manifestPath)
	if err != nil {
		return nil, fmt.Errorf("error reading manifest file: %w", err)
	}
	manifest := &manifests.PackageManifest{}
	if err = yaml.Unmarshal(manifestData, &manifest); err != nil {
		return nil, fmt.Errorf("error unmarshaling manifest file: %w", err)
	}

	return manifest, nil
}

// getBundleAnnotations reads and parses the bundle's annotations.
func getBundleAnnotations(path string) (*manifests.Annotations, error) {
	// Check if annotations file exists
	annotationsPath := filepath.Join(path, "annotations.yaml")
	if _, err := os.Stat(annotationsPath); os.IsNotExist(err) {
		return nil, nil
	}

	// Read and parse annotations file
	annotationsData, err := os.ReadFile(annotationsPath)
	if err != nil {
		return nil, fmt.Errorf("error reading annotations file: %w", err)
	}
	annotationsFile := &manifests.AnnotationsFile{}
	if err = yaml.Unmarshal(annotationsData, &annotationsFile); err != nil {
		return nil, fmt.Errorf("error unmarshaling annotations file: %w", err)
	}

	return &annotationsFile.Annotations, nil
}

// getCSV reads and parses the cluster service version file in the path
// provided, when available.
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
	csvData, err := os.ReadFile(csvPath)
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
		for _, image := range csvRI.Spec.RelatedImages {
			if !imagesContain(images, image) {
				images = append(images, image)
			}
		}
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

// PreparePackage prepares a package version using the provided metadata.
func PreparePackage(r *hub.Repository, md *Metadata) (*hub.Package, error) {
	// Prepare package from manifest and csv
	p := &hub.Package{
		Name:           md.Name,
		DisplayName:    md.CSV.Spec.DisplayName,
		Description:    md.CSV.Annotations["description"],
		Keywords:       md.CSV.Spec.Keywords,
		Readme:         md.CSV.Spec.Description,
		Version:        md.CSV.Spec.Version.String(),
		IsOperator:     true,
		Capabilities:   md.CSV.Annotations["capabilities"],
		Channels:       md.Channels,
		DefaultChannel: md.DefaultChannelName,
		License:        md.CSV.Annotations[licenseAnnotation],
		Provider:       md.CSV.Spec.Provider.Name,
		Install:        md.CSV.Annotations[installAnnotation],
		Repository:     r,
	}

	// Containers images
	containersImages, err := getContainersImages(md.CSV, md.CSVData)
	if err != nil {
		return nil, err
	}
	if err := pkg.ValidateContainersImages(hub.OLM, containersImages); err != nil {
		return nil, err
	}
	p.ContainersImages = containersImages

	// TS
	ts, err := time.Parse(time.RFC3339, md.CSV.Annotations["createdAt"])
	if err == nil {
		p.TS = ts.Unix()
	} else {
		// Try alternative layout
		ts, err = time.Parse("2006-01-02 15:04:05", md.CSV.Annotations["createdAt"])
		if err == nil {
			p.TS = ts.Unix()
		}
	}

	// Keywords
	for _, category := range strings.Split(md.CSV.Annotations["categories"], ",") {
		if strings.Trim(strings.ToLower(category), " ") == "ai/machine learning" {
			p.Keywords = append(p.Keywords, []string{"AI", "Machine Learning"}...)
		} else {
			p.Keywords = append(p.Keywords, strings.Trim(category, " "))
		}
	}

	// Links
	for _, link := range md.CSV.Spec.Links {
		p.Links = append(p.Links, &hub.Link{
			Name: link.Name,
			URL:  link.URL,
		})
	}
	if md.CSV.Annotations["repository"] != "" {
		p.Links = append(p.Links, &hub.Link{
			Name: "source",
			URL:  md.CSV.Annotations["repository"],
		})
	}

	// Maintainers
	for _, maintainer := range md.CSV.Spec.Maintainers {
		if maintainer.Email != "" {
			p.Maintainers = append(p.Maintainers, &hub.Maintainer{
				Name:  maintainer.Name,
				Email: maintainer.Email,
			})
		}
	}

	// CRDs
	crds := make([]interface{}, 0, len(md.CSV.Spec.CustomResourceDefinitions.Owned))
	for _, crd := range md.CSV.Spec.CustomResourceDefinitions.Owned {
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
	if err := json.Unmarshal([]byte(md.CSV.Annotations["alm-examples"]), &crdsExamples); err == nil {
		p.CRDsExamples = crdsExamples
	}

	// Alternative name
	if v, ok := md.CSV.Annotations[alternativeNameAnnotation]; ok && v != "" {
		p.AlternativeName = v
	}

	// Category
	if v, ok := md.CSV.Annotations[categoryAnnotation]; ok {
		category, err := hub.PackageCategoryFromName(v)
		if err == nil {
			p.Category = category
		}
	}

	// Changes
	if v, ok := md.CSV.Annotations[changesAnnotation]; ok {
		changes, err := source.ParseChangesAnnotation(v)
		if err != nil {
			return nil, err
		}
		p.Changes = changes
	}

	// Prerelease
	if v, ok := md.CSV.Annotations[prereleaseAnnotation]; ok {
		prerelease, err := strconv.ParseBool(v)
		if err != nil {
			return nil, fmt.Errorf("invalid prerelease value: %s", v)
		}
		p.Prerelease = prerelease
	}

	// Recommendations
	if v, ok := md.CSV.Annotations[recommendationsAnnotation]; ok {
		var recommendations []*hub.Recommendation
		if err := yaml.Unmarshal([]byte(v), &recommendations); err != nil {
			return nil, fmt.Errorf("invalid recommendations value: %s", v)
		}
		p.Recommendations = recommendations
	}

	// Screenshots
	if v, ok := md.CSV.Annotations[screenshotsAnnotation]; ok {
		var screenshots []*hub.Screenshot
		if err := yaml.Unmarshal([]byte(v), &screenshots); err != nil {
			return nil, fmt.Errorf("invalid screenshots value: %s", v)
		}
		p.Screenshots = screenshots
	}

	// Security updates
	if v, ok := md.CSV.Annotations[securityUpdatesAnnotation]; ok {
		containsSecurityUpdates, err := strconv.ParseBool(v)
		if err != nil {
			return nil, fmt.Errorf("invalid containsSecurityUpdates value: %s", v)
		}
		p.ContainsSecurityUpdates = containsSecurityUpdates
	}

	// Prepare data specific to the package kind
	var isGlobalOperator bool
	for _, e := range md.CSV.Spec.InstallModes {
		if e.Type == operatorsv1alpha1.InstallModeTypeAllNamespaces && e.Supported {
			isGlobalOperator = true
		}
	}
	p.Data = map[string]interface{}{
		formatKey:           md.Format,
		isGlobalOperatorKey: isGlobalOperator,
	}

	return p, nil
}

// setPackagesChannels prepares and updates the channels in the packages which
// use the bundle format when needed.
//
// At the moment, when registering an OLM operator package in Artifact Hub, the
// latest version of the package is expected to provide all channels available
// with the corresponding version they point to. When using the PackageManifest
// format, this information is read from the package manifest file. However,
// when using the Bundle format, this information is not available on a single
// location, so it needs to be prepared from the data available in all packages
// versions.
func setPackagesChannels(packages map[string]*hub.Package) {
	// Pass 1: track latest packages' channels version
	channels := make(map[string]map[string]string) // packageName:channelName:channelVersion
	for _, p := range packages {
		if !usesBundleFormat(p) {
			continue
		}
		for _, c := range p.Channels {
			if _, ok := channels[p.Name]; !ok {
				channels[p.Name] = map[string]string{c.Name: c.Version}
			} else {
				latestVersion, ok := channels[p.Name][c.Name]
				if !ok {
					channels[p.Name][c.Name] = c.Version
				} else {
					versionSV, _ := semver.StrictNewVersion(c.Version)
					latestVersionSV, _ := semver.StrictNewVersion(latestVersion)
					if versionSV.GreaterThan(latestVersionSV) {
						channels[p.Name][c.Name] = c.Version
					}
				}
			}
		}
	}

	// Prepare packages channels
	preparedChannels := make(map[string][]*hub.Channel)
	for pkgName, pkgChannels := range channels {
		for name, version := range pkgChannels {
			preparedChannels[pkgName] = append(preparedChannels[pkgName], &hub.Channel{
				Name:    name,
				Version: version,
			})
		}
		sort.Slice(preparedChannels[pkgName], func(i, j int) bool {
			return preparedChannels[pkgName][i].Name < preparedChannels[pkgName][j].Name
		})
	}

	// Pass 2: update the corresponding packages' channels
	for _, p := range packages {
		if !usesBundleFormat(p) {
			continue
		}
		p.Channels = preparedChannels[p.Name]
	}
}

// setPackagesDefaultChannel updates the default channel in the latest version
// of packages which use the bundle format when it does not contain one. The
// channel will be obtained from the highest semver version that has a default
// channel set.
func setPackagesDefaultChannel(packages map[string]*hub.Package) {
	// Track latest version of each package and the latest default channel
	latestPackage := make(map[string]*hub.Package)  // packageName
	latestDefaultChannel := make(map[string]string) // packageName:channelName
	for k, p := range packages {
		if !usesBundleFormat(p) {
			continue
		}
		name, version := pkg.ParseKey(k)
		if _, ok := latestPackage[name]; !ok {
			latestPackage[name] = p
			latestDefaultChannel[name] = p.DefaultChannel
		} else {
			versionSV, _ := semver.StrictNewVersion(version)
			latestVersionSV, _ := semver.StrictNewVersion(latestPackage[name].Version)
			if versionSV.GreaterThan(latestVersionSV) {
				latestPackage[name] = p
				if p.DefaultChannel != "" {
					latestDefaultChannel[name] = p.DefaultChannel
				}
			} else if latestDefaultChannel[name] == "" && p.DefaultChannel != "" {
				latestDefaultChannel[name] = p.DefaultChannel
			}
		}
	}

	// Set default channel in packages' latest version when it doesn't have one
	for name, p := range latestPackage {
		if p.DefaultChannel == "" {
			p.DefaultChannel = latestDefaultChannel[name]
		}
	}
}

// setPackagesDigest sets an auto generated digest in the packages provided.
func setPackagesDigest(packages map[string]*hub.Package) {
	for _, p := range packages {
		_ = p.SetAutoGeneratedDigest()
	}
}

// usesBundleFormat checks if the provided package uses the bundle format.
func usesBundleFormat(p *hub.Package) bool {
	format, ok := p.Data[formatKey].(string)
	return ok && format == bundle
}

// imagesContain is a helper to check if the image provided is already in a
// given list.
func imagesContain(images []*hub.ContainerImage, imageToCheck *hub.ContainerImage) bool {
	for _, image := range images {
		if image.Image == imageToCheck.Image {
			return true
		}
	}
	return false
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
