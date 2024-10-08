package container

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"maps"
	"net/http"
	"net/url"
	"path"
	"runtime/debug"
	"slices"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/img"
	"github.com/artifacthub/hub/internal/oci"
	"github.com/artifacthub/hub/internal/pkg"
	"github.com/google/go-containerregistry/pkg/name"
	v1 "github.com/google/go-containerregistry/pkg/v1"
	"github.com/google/go-containerregistry/pkg/v1/remote"
	"github.com/google/go-containerregistry/pkg/v1/types"
	"github.com/hashicorp/go-multierror"
	"github.com/spf13/viper"
)

const (
	// Number of tags processed concurrently
	concurrency = 1

	// Annotations based on OCI pre-defined annotation keys
	// https://github.com/opencontainers/image-spec/blob/main/annotations.md#pre-defined-annotation-keys
	appVersionAnnotation       = "org.opencontainers.image.version"
	createdAnnotation          = "org.opencontainers.image.created"
	descriptionAnnotation      = "org.opencontainers.image.description"
	displayNameAnnotation      = "org.opencontainers.image.title"
	documentationURLAnnotation = "org.opencontainers.image.documentation"
	homeURLAnnotation          = "org.opencontainers.image.url"
	sourceURLAnnotation        = "org.opencontainers.image.source"
	vendorAnnotation           = "org.opencontainers.image.vendor"

	// Artifact Hub specific annotations
	alternativeLocationsAnnotation = "io.artifacthub.package.alternative-locations"
	categoryAnnotation             = "io.artifacthub.package.category"
	deprecatedAnnotation           = "io.artifacthub.package.deprecated"
	digestAnnotation               = "io.artifacthub.package.digest" // Populated internally in getMetadata
	keywordsAnnotation             = "io.artifacthub.package.keywords"
	licenseAnnotation              = "io.artifacthub.package.license"
	logoURLAnnotation              = "io.artifacthub.package.logo-url"
	maintainersAnnotation          = "io.artifacthub.package.maintainers"
	platformsAnnotation            = "io.artifacthub.package.platforms" // Populated internally in getMetadata
	prereleaseAnnotation           = "io.artifacthub.package.prerelease"
	readmeURLAnnotation            = "io.artifacthub.package.readme-url"
	securityUpdatesAnnotation      = "io.artifacthub.package.contains-security-updates"
)

var (
	// Default platform to use when resolving an index to a child image.
	defaultPlatform = v1.Platform{
		Architecture: "amd64",
		OS:           "linux",
	}

	// errUnsupportedMediaType indicates that the image media type is not
	// supported and should not be processed.
	errUnsupportedMediaType = errors.New("image media type not supported")

	// errInvalidAnnotation indicates that the annotation provided is not valid.
	errInvalidAnnotation = errors.New("invalid annotation")

	// requiredMetadata represents the fields that must be present in the image
	// metadata.
	requiredMetadata = []string{
		createdAnnotation,
		descriptionAnnotation,
		readmeURLAnnotation,
	}
)

// TrackerSource is a hub.TrackerSource implementation for containers images
// repositories.
type TrackerSource struct {
	i *hub.TrackerSourceInput
}

// NewTrackerSource creates a new TrackerSource instance.
func NewTrackerSource(i *hub.TrackerSourceInput) *TrackerSource {
	return &TrackerSource{i: i}
}

// GetPackagesAvailable implements the TrackerSource interface.
func (s *TrackerSource) GetPackagesAvailable() (map[string]*hub.Package, error) {
	var mu sync.Mutex
	packagesAvailable := make(map[string]*hub.Package)

	// Prepare tags to process based on already processed ones and mutability config
	if s.i.Repository.Data == nil {
		// No tags have been set up yet, nothing to do
		return packagesAvailable, nil
	}
	var data *hub.ContainerImageData
	if err := json.Unmarshal(s.i.Repository.Data, &data); err != nil {
		return nil, fmt.Errorf("invalid container image data: %w", err)
	}
	var tagsToProcess []string
	for _, tag := range data.Tags {
		p := &hub.Package{
			Name:    path.Base(s.i.Repository.URL),
			Version: tag.Name,
		}
		key := pkg.BuildKey(p)
		if _, ok := s.i.PackagesRegistered[key]; !ok || tag.Mutable {
			tagsToProcess = append(tagsToProcess, tag.Name)
		} else {
			p.Digest = hub.HasNotChanged
			packagesAvailable[key] = p
		}
	}

	// Iterate over tags to process and prepare a package version for each
	limiter := make(chan struct{}, concurrency)
	var wg sync.WaitGroup
	for _, tag := range tagsToProcess {
		// Return ASAP if context is cancelled
		select {
		case <-s.i.Svc.Ctx.Done():
			wg.Wait()
			return nil, s.i.Svc.Ctx.Err()
		default:
		}

		// Prepare and store package version
		limiter <- struct{}{}
		wg.Add(1)
		go func(tag string) {
			defer func() {
				<-limiter
				wg.Done()
			}()
			defer func() {
				if r := recover(); r != nil {
					s.i.Svc.Logger.Error().Bytes("stacktrace", debug.Stack()).Interface("recover", r).Send()
				}
			}()
			p, err := PreparePackage(s.i.Svc.Ctx, s.i.Svc.Cfg, s.i.Svc.Hc, s.i.Svc.Is, s.i.Svc.Sc, s.i.Repository, tag)
			if err != nil {
				s.warn(fmt.Errorf("error preparing package (tag: %s): %w", tag, err))
				return
			}
			mu.Lock()
			packagesAvailable[pkg.BuildKey(p)] = p
			mu.Unlock()
		}(tag)
	}
	wg.Wait()

	return packagesAvailable, nil
}

// warn is a helper that sends the error provided to the errors collector and
// logs it as a warning.
func (s *TrackerSource) warn(err error) {
	s.i.Svc.Logger.Warn().Err(err).Send()
	s.i.Svc.Ec.Append(s.i.Repository.RepositoryID, err.Error())
}

// PreparePackage prepares a package version from the metadata available in the
// container image identified by the tag provided.
func PreparePackage(
	ctx context.Context,
	cfg *viper.Viper,
	hc hub.HTTPClient,
	is img.Store,
	sc hub.OCISignatureChecker,
	r *hub.Repository,
	tag string,
) (*hub.Package, error) {
	// Get container image metadata
	imageRef := fmt.Sprintf("%s:%s", strings.TrimPrefix(r.URL, hub.RepositoryOCIPrefix), tag)
	md, err := getMetadata(ctx, cfg, r, imageRef)
	if err != nil {
		return nil, fmt.Errorf("error getting metadata: %w", err)
	}

	// Check required metadata fields are present
	var errs *multierror.Error
	for _, key := range requiredMetadata {
		if _, ok := md[key]; !ok {
			errs = multierror.Append(errs, fmt.Errorf("required metadata field not provided: %s", key))
		}
	}

	// Prepare package from metadata
	p := &hub.Package{
		Name:        path.Base(r.URL),
		Version:     tag,
		DisplayName: md[displayNameAnnotation],
		Description: md[descriptionAnnotation],
		HomeURL:     md[homeURLAnnotation],
		Digest:      md[digestAnnotation],
		AppVersion:  md[appVersionAnnotation],
		License:     md[licenseAnnotation],
		Provider:    md[vendorAnnotation],
		ContainersImages: []*hub.ContainerImage{
			{
				Image: fmt.Sprintf("%s:%s", strings.TrimPrefix(r.URL, hub.RepositoryOCIPrefix), tag),
			},
		},
		Data:       make(map[string]interface{}),
		Repository: r,
	}

	// Created timestamp
	if v, ok := md[createdAnnotation]; ok {
		ts, err := time.Parse(time.RFC3339, v)
		if err != nil {
			errs = multierror.Append(errs, err)
		} else {
			p.TS = ts.Unix()
		}
	}

	// Readme
	if v, ok := md[readmeURLAnnotation]; ok {
		data, err := getContent(ctx, hc, v)
		if err != nil {
			errs = multierror.Append(errs, fmt.Errorf("error getting readme file content: %w", err))
		} else {
			p.Readme = string(data)
		}
	}

	// Category
	if v, ok := md[categoryAnnotation]; ok {
		category, err := hub.PackageCategoryFromName(v)
		if err != nil {
			errs = multierror.Append(errs, err)
		} else {
			p.Category = category
		}
	}

	// Keywords
	if v, ok := md[keywordsAnnotation]; ok && v != "" {
		var keywords []string
		for _, keyword := range strings.Split(v, ",") {
			keywords = append(keywords, strings.TrimSpace(keyword))
		}
		p.Keywords = keywords
	}

	// Store logo when available if requested
	if v, ok := md[logoURLAnnotation]; ok {
		logoImageID, err := is.DownloadAndSaveImage(ctx, v)
		if err != nil {
			errs = multierror.Append(errs, fmt.Errorf("error downloading logo image: %w", err))
		} else {
			p.LogoURL = v
			p.LogoImageID = logoImageID
		}
	}

	// Links
	var links []*hub.Link
	if v, ok := md[documentationURLAnnotation]; ok {
		links = append(links, &hub.Link{
			Name: "documentation",
			URL:  v,
		})
	}
	if v, ok := md[sourceURLAnnotation]; ok {
		links = append(links, &hub.Link{
			Name: "source",
			URL:  v,
		})
	}
	p.Links = links

	// Maintainers
	if v, ok := md[maintainersAnnotation]; ok {
		var maintainers []*hub.Maintainer
		if err := json.Unmarshal([]byte(v), &maintainers); err != nil {
			errs = multierror.Append(errs, fmt.Errorf("%w: invalid maintainers value", errInvalidAnnotation))
		} else {
			p.Maintainers = maintainers
		}
	}

	// Security updates
	if v, ok := md[securityUpdatesAnnotation]; ok {
		containsSecurityUpdates, err := strconv.ParseBool(v)
		if err != nil {
			errs = multierror.Append(errs, fmt.Errorf("%w: invalid containsSecurityUpdates value", errInvalidAnnotation))
		} else {
			p.ContainsSecurityUpdates = containsSecurityUpdates
		}
	}

	// Pre-release
	if v, ok := md[prereleaseAnnotation]; ok {
		prerelease, err := strconv.ParseBool(v)
		if err != nil {
			errs = multierror.Append(errs, fmt.Errorf("%w: invalid prerelease value", errInvalidAnnotation))
		} else {
			p.Prerelease = prerelease
		}
	}

	// Deprecated
	if v, ok := md[deprecatedAnnotation]; ok {
		deprecated, err := strconv.ParseBool(v)
		if err != nil {
			errs = multierror.Append(errs, fmt.Errorf("%w: invalid deprecated value", errInvalidAnnotation))
		} else {
			p.Deprecated = deprecated
		}
	}

	// Platforms
	if v, ok := md[platformsAnnotation]; ok && v != "" {
		p.Data["platforms"] = strings.Split(v, ",")
	}

	// Alternative locations
	if v, ok := md[alternativeLocationsAnnotation]; ok && v != "" {
		var alternativeLocations []string
		for _, l := range strings.Split(v, ",") {
			alternativeLocations = append(alternativeLocations, strings.TrimSpace(l))
		}
		p.Data["alternativeLocations"] = alternativeLocations
	}

	// Signature
	hasCosignSignature, err := sc.HasCosignSignature(
		ctx,
		imageRef,
		r.AuthUser,
		r.AuthPass,
	)
	if err != nil {
		errs = multierror.Append(errs, fmt.Errorf("error checking cosign signature: %w", err))
	} else if hasCosignSignature {
		p.Signed = true
		p.Signatures = []string{oci.Cosign}
	}

	if errs.ErrorOrNil() != nil {
		return nil, errs
	}
	return p, nil
}

// getContent returns the content of the url provided.
func getContent(
	ctx context.Context,
	hc hub.HTTPClient,
	u string,
) ([]byte, error) {
	req, err := http.NewRequest("GET", u, nil)
	if err != nil {
		return nil, err
	}
	req = req.WithContext(ctx)
	if _, err := url.Parse(u); err != nil {
		return nil, err
	}
	resp, err := hc.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode == http.StatusOK {
		return io.ReadAll(resp.Body)
	}
	return nil, fmt.Errorf("unexpected status code received: %d", resp.StatusCode)
}

// getMetadata returns the metadata available in the index or image identified
// by the reference provided.
func getMetadata(
	ctx context.Context,
	cfg *viper.Viper,
	r *hub.Repository,
	imageRef string,
) (map[string]string, error) {
	// Get reference's remote descriptor
	ref, err := name.ParseReference(imageRef)
	if err != nil {
		return nil, err
	}
	options := oci.PrepareRemoteOptions(ctx, cfg, ref, r.AuthUser, r.AuthPass)
	options = append(options, remote.WithPlatform(defaultPlatform))
	desc, err := remote.Get(ref, options...)
	if err != nil {
		return nil, err
	}

	// Get metadata and supported platforms from index manifest (if available)
	var indexManifest *v1.IndexManifest
	index, err := desc.ImageIndex()
	if err == nil {
		indexManifest, _ = index.IndexManifest()
	}
	supportedPlatforms := getSupportedPlatforms(indexManifest)
	md := getMetadataFromIndex(indexManifest)

	// Get metadata from image if it wasn't available in the index
	if md == nil {
		// Update descriptor's platform if the default one is not supported
		if len(supportedPlatforms) > 0 && !slices.Contains(supportedPlatforms, &defaultPlatform) {
			// We'll pick the first one available in the index
			options = append(options, remote.WithPlatform(*supportedPlatforms[0]))
			desc, err = remote.Get(ref, options...)
			if err != nil {
				return nil, err
			}
		}

		image, err := desc.Image()
		if err != nil {
			return nil, err
		}
		imageManifest, err := image.Manifest()
		if err != nil {
			return nil, err
		}
		md, err = getMetadataFromImage(image, imageManifest)
		if err != nil {
			return nil, err
		}
	}

	// Add supported platforms to metadata
	elems := make([]string, len(supportedPlatforms))
	for _, p := range supportedPlatforms {
		elems = append(elems, fmt.Sprintf("%s/%s", p.OS, p.Architecture))
	}
	if len(elems) > 0 {
		md[platformsAnnotation] = strings.Join(elems, ",")
	}

	return md, nil
}

// containsSomeMetadata checks if the provided map contains some of the
// required metadata fields.
func containsSomeMetadata(m map[string]string) bool {
	for _, key := range requiredMetadata {
		if _, ok := m[key]; ok {
			return true
		}
	}
	return false
}

// getMetadataFromIndex returns the metadata available in the index manifest.
func getMetadataFromIndex(indexManifest *v1.IndexManifest) map[string]string {
	var md map[string]string
	if indexManifest != nil {
		if indexManifest.MediaType == types.OCIImageIndex {
			if containsSomeMetadata(indexManifest.Annotations) {
				md = make(map[string]string)
				maps.Copy(md, indexManifest.Annotations)
				md[digestAnnotation] = md[createdAnnotation]
			}
		}
	}
	return md
}

// getMetadataFromImage returns the metadata available in the image manifest or
// config, depending on the manifest media type.
func getMetadataFromImage(image v1.Image, imageManifest *v1.Manifest) (map[string]string, error) {
	md := make(map[string]string)

	switch imageManifest.MediaType {
	case types.OCIManifestSchema1, "":
		if containsSomeMetadata(imageManifest.Annotations) {
			maps.Copy(md, imageManifest.Annotations)
		} else {
			configFile, err := image.ConfigFile()
			if err != nil {
				return nil, err
			}
			maps.Copy(md, configFile.Config.Labels)
		}
	case types.DockerManifestSchema2:
		configFile, err := image.ConfigFile()
		if err != nil {
			return nil, err
		}
		maps.Copy(md, configFile.Config.Labels)
	default:
		return nil, errUnsupportedMediaType
	}

	digest, err := image.Digest()
	if err == nil {
		md[digestAnnotation] = digest.String()
	}

	return md, nil
}

// getSupportedPlatforms returns the supported platforms available in the index
// manifest provided.
func getSupportedPlatforms(indexManifest *v1.IndexManifest) []*v1.Platform {
	var supportedPlatforms []*v1.Platform
	if indexManifest != nil {
		for _, m := range indexManifest.Manifests {
			if m.Platform != nil && m.Platform.Architecture != "unknown" {
				supportedPlatforms = append(supportedPlatforms, &v1.Platform{
					Architecture: m.Platform.Architecture,
					OS:           m.Platform.OS,
				})
			}
		}
	}
	return supportedPlatforms
}
