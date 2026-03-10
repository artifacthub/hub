package oci

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"regexp"
	"sort"
	"strings"

	"github.com/Masterminds/semver/v3"
	"github.com/google/go-containerregistry/pkg/authn"
	"github.com/google/go-containerregistry/pkg/name"
	v1 "github.com/google/go-containerregistry/pkg/v1"
	ggcrremote "github.com/google/go-containerregistry/pkg/v1/remote"
	ggcrtypes "github.com/google/go-containerregistry/pkg/v1/types"
	ocispec "github.com/opencontainers/image-spec/specs-go/v1"
	csoci "github.com/sigstore/cosign/v3/pkg/oci"
	csremote "github.com/sigstore/cosign/v3/pkg/oci/remote"
	cstypes "github.com/sigstore/cosign/v3/pkg/types"
	"github.com/spf13/viper"
	oraserdef "oras.land/oras-go/v2/errdef"
	orasremote "oras.land/oras-go/v2/registry/remote"
	orasauth "oras.land/oras-go/v2/registry/remote/auth"

	"github.com/artifacthub/hub/internal/httpw"
	"github.com/artifacthub/hub/internal/hub"
)

const (
	// Cosign represents the cosign signature kind.
	Cosign = "cosign"

	// cosignSigArtifactType is the OCI 1.1 artifact type that cosign uses
	// when attaching signatures via the referrers API.
	cosignSigArtifactType = "application/vnd.dev.cosign.artifact.sig.v1+json"
)

var (
	// ErrArtifactNotFound indicates that the requested artifact was not found
	// in the registry.
	ErrArtifactNotFound = errors.New("artifact not found")

	// ErrLayerNotFound indicates that the requested layer was not found in the
	// OCI artifact provided.
	ErrLayerNotFound = errors.New("layer not found")

	// dockerHubRE is a regexp used to check if the registry used is the Docker
	// Hub.
	dockerHubRE = regexp.MustCompile(`^(.*\.)?docker\.io$`)
)

// registryRepository abstracts the authenticated remote repository operations
// used by the OCI helpers so they can share one access pattern and be tested
// without talking to a live registry.
type registryRepository interface {
	Fetch(ctx context.Context, target ocispec.Descriptor) (io.ReadCloser, error)
	FetchReference(ctx context.Context, reference string) (ocispec.Descriptor, io.ReadCloser, error)
}

// registryRepositoryFactory creates remote repositories configured for a
// specific OCI reference.
type registryRepositoryFactory func(
	ref name.Reference,
	username string,
	password string,
) (registryRepository, error)

// Puller is a hub.OCIPuller implementation.
type Puller struct {
	cfg           *viper.Viper
	newRepository registryRepositoryFactory
}

// NewPuller creates a new Puller instance.
func NewPuller(cfg *viper.Viper) *Puller {
	return &Puller{
		cfg: cfg,
		newRepository: func(
			ref name.Reference,
			username string,
			password string,
		) (registryRepository, error) {
			return newRegistryRepository(cfg, ref, username, password)
		},
	}
}

// PullLayer pulls the first layer of the media type provided from the OCI
// artifact at the given reference.
func (p *Puller) PullLayer(
	ctx context.Context,
	imageRef,
	mediaType,
	username,
	password string,
) (ocispec.Descriptor, []byte, error) {
	// Parse the reference of the requested artifact
	ref, err := name.ParseReference(imageRef)
	if err != nil {
		return ocispec.Descriptor{}, nil, err
	}

	// Build a repository client for the requested artifact
	repo, err := p.newRepository(ref, username, password)
	if err != nil {
		return ocispec.Descriptor{}, nil, err
	}

	// Load the root artifact document so its graph can be inspected
	manifestDesc, manifestReader, err := repo.FetchReference(ctx, ref.Identifier())
	if err != nil {
		return ocispec.Descriptor{}, nil, translateRegistryError(err)
	}
	defer manifestReader.Close()

	manifestData, err := io.ReadAll(manifestReader)
	if err != nil {
		return ocispec.Descriptor{}, nil, err
	}

	// Walk the artifact graph until the requested layer is found
	return findLayerInDescriptor(ctx, repo, manifestDesc, manifestData, mediaType, map[string]struct{}{})
}

// SignatureChecker is a hub.OCISignatureChecker implementation.
type SignatureChecker struct {
	cfg             *viper.Viper
	getManifest     func(ref name.Reference, opts ...ggcrremote.Option) (*v1.Manifest, error)
	getReferrers    func(d name.Digest, artifactType string, opts ...csremote.Option) (*v1.IndexManifest, error)
	getSignedEntity func(ref name.Reference, options ...csremote.Option) (csoci.SignedEntity, error)
}

// NewSignatureChecker creates a new SignatureChecker instance.
func NewSignatureChecker(cfg *viper.Viper) *SignatureChecker {
	return &SignatureChecker{
		cfg: cfg,
		getManifest: func(ref name.Reference, opts ...ggcrremote.Option) (*v1.Manifest, error) {
			img, err := ggcrremote.Image(ref, opts...)
			if err != nil {
				return nil, err
			}
			return img.Manifest()
		},
		getReferrers:    csremote.Referrers,
		getSignedEntity: csremote.SignedEntity,
	}
}

// HasCosignSignature checks if the OCI artifact identified by the reference
// provided has a cosign (sigstore) signature.
func (c *SignatureChecker) HasCosignSignature(
	ctx context.Context,
	ref,
	username,
	password string,
) (bool, error) {
	// Parse the reference of the requested artifact
	artifactRef, err := name.ParseReference(ref)
	if err != nil {
		return false, err
	}

	// Prepare remote options for registry access
	options := PrepareRemoteOptions(ctx, c.cfg, artifactRef, username, password)

	// Resolve the signed entity via cosign's high-level API
	se, err := c.getSignedEntity(artifactRef, csremote.WithRemoteOptions(options...))
	if err != nil {
		var enf *csremote.EntityNotFoundError
		if errors.As(err, &enf) {
			return false, nil
		}
		return false, err
	}

	// Check whether any cosign signatures are attached using cosign's
	// tag-based discovery
	sigs, err := se.Signatures()
	if err != nil {
		return false, err
	}
	sl, err := sigs.Get()
	if err != nil {
		return false, err
	}
	if len(sl) > 0 {
		return true, nil
	}

	// Check whether any cosign signatures are attached via the OCI
	// referrers API
	h, err := se.Digest()
	if err != nil {
		return false, err
	}
	d := artifactRef.Context().Digest(h.String())
	csOptions := []csremote.Option{csremote.WithRemoteOptions(options...)}
	idx, err := c.getReferrers(d, "", csOptions...)
	if err != nil {
		return false, err
	}
	for _, m := range idx.Manifests {
		// Old experimental cosign referrers format
		if m.ArtifactType == cosignSigArtifactType {
			return true, nil
		}

		// For referrers with a non-empty artifact type, fetch the
		// manifest to check if it's a cosign signature stored in
		// the new sigstore bundle format
		if m.ArtifactType != "" {
			referrerRef := artifactRef.Context().Digest(m.Digest.String())
			manifest, err := c.getManifest(referrerRef, options...)
			if err != nil {
				return false, err
			}
			if manifest.Annotations[csremote.BundlePredicateType] == cstypes.CosignSignPredicateType {
				return true, nil
			}
		}
	}
	return false, nil
}

// TagsGetter provides a mechanism to get all the version tags available for
// a given repository in a OCI registry. Tags that aren't valid semver versions
// will be filtered out.
type TagsGetter struct {
	cfg *viper.Viper
}

// NewTagsGetter creates a new TagsGetter instance.
func NewTagsGetter(cfg *viper.Viper) *TagsGetter {
	return &TagsGetter{
		cfg: cfg,
	}
}

// Tags returns a list with the tags available for the provided repository.
func (tg *TagsGetter) Tags(
	ctx context.Context,
	r *hub.Repository,
	onlySemver bool,
	restorePlusSign bool,
) ([]string, error) {
	ref, err := name.ParseReference(strings.TrimPrefix(r.URL, hub.RepositoryOCIPrefix))
	if err != nil {
		return nil, err
	}
	options := PrepareRemoteOptions(ctx, tg.cfg, ref, r.AuthUser, r.AuthPass)
	tags, err := ggcrremote.List(ref.Context(), options...)
	if err != nil {
		return nil, err
	}

	// Filter and sort semver tags when requested
	if onlySemver {
		var semverTags []string
		for _, tag := range tags {
			if restorePlusSign {
				// See https://github.com/helm/helm/blob/14d0c13e9eefff5b4a1b511cf50643529692ec94/pkg/registry/client.go#L45C8-L50
				tag = strings.Replace(tag, "_", "+", 1)
			}
			if _, err := semver.NewVersion(tag); err == nil {
				semverTags = append(semverTags, tag)
			}
		}
		sort.Slice(semverTags, func(i, j int) bool {
			vi, _ := semver.NewVersion(semverTags[i])
			vj, _ := semver.NewVersion(semverTags[j])
			return vj.LessThan(vi)
		})
		tags = semverTags
	}
	return tags, nil
}

// PrepareRemoteOptions prepares some options used to interact with a remote
// registry.
func PrepareRemoteOptions(
	ctx context.Context,
	cfg *viper.Viper,
	ref name.Reference,
	username,
	password string,
) []ggcrremote.Option {
	// Setup remote options
	options := []ggcrremote.Option{ggcrremote.WithUserAgent(httpw.UserAgent)}
	if ctx != nil {
		options = append(options, ggcrremote.WithContext(ctx))
	}

	// Add authentication credentials
	username, password = prepareRegistryCredentials(cfg, ref, username, password)
	if username != "" || password != "" {
		options = append(options, ggcrremote.WithAuth(&authn.Basic{
			Username: username,
			Password: password,
		}))
	}

	return options
}

// fetchDescriptorData fetches and reads the content addressed by the provided
// descriptor.
func fetchDescriptorData(
	ctx context.Context,
	repo registryRepository,
	desc ocispec.Descriptor,
) (ocispec.Descriptor, []byte, error) {
	reader, err := repo.Fetch(ctx, desc)
	if err != nil {
		return ocispec.Descriptor{}, nil, translateRegistryError(err)
	}
	defer reader.Close()

	data, err := io.ReadAll(reader)
	if err != nil {
		return ocispec.Descriptor{}, nil, err
	}
	return desc, data, nil
}

// findLayerInDescriptor walks OCI manifests and indexes until it finds a layer
// with the requested media type.
func findLayerInDescriptor(
	ctx context.Context,
	repo registryRepository,
	desc ocispec.Descriptor,
	data []byte,
	mediaType string,
	visited map[string]struct{},
) (ocispec.Descriptor, []byte, error) {
	if desc.Digest != "" {
		if _, ok := visited[desc.Digest.String()]; ok {
			return ocispec.Descriptor{}, nil, ErrLayerNotFound
		}
		visited[desc.Digest.String()] = struct{}{}
	}

	// Traverse index children before concluding the layer is missing
	index, isIndex, err := indexFromDescriptor(desc, data)
	if err != nil {
		return ocispec.Descriptor{}, nil, err
	}
	if isIndex {
		for _, child := range index.Manifests {
			childDesc, childData, err := fetchDescriptorData(ctx, repo, child)
			if err != nil {
				return ocispec.Descriptor{}, nil, err
			}
			layerDesc, layerData, err := findLayerInDescriptor(
				ctx,
				repo,
				childDesc,
				childData,
				mediaType,
				visited,
			)
			if err == nil {
				return layerDesc, layerData, nil
			}
			if !errors.Is(err, ErrLayerNotFound) {
				return ocispec.Descriptor{}, nil, err
			}
		}
		return ocispec.Descriptor{}, nil, ErrLayerNotFound
	}

	// Return the requested layer from a manifest node when available
	manifest, err := unmarshalManifest(data)
	if err != nil {
		return ocispec.Descriptor{}, nil, err
	}
	for _, layer := range manifest.Layers {
		if layer.MediaType == mediaType {
			return fetchDescriptorData(ctx, repo, layer)
		}
	}
	return ocispec.Descriptor{}, nil, ErrLayerNotFound
}

// indexFromDescriptor returns the parsed OCI index when the payload should be
// treated as an OCI index or Docker manifest list.
func indexFromDescriptor(
	desc ocispec.Descriptor,
	data []byte,
) (*ocispec.Index, bool, error) {
	isExplicitIndex := desc.MediaType == string(ggcrtypes.OCIImageIndex) ||
		desc.MediaType == string(ggcrtypes.DockerManifestList)

	var index ocispec.Index
	if err := json.Unmarshal(data, &index); err != nil {
		if isExplicitIndex {
			return nil, false, err
		}
		return nil, false, nil
	}

	if isExplicitIndex ||
		index.MediaType == string(ggcrtypes.OCIImageIndex) ||
		index.MediaType == string(ggcrtypes.DockerManifestList) ||
		len(index.Manifests) > 0 {
		return &index, true, nil
	}
	return nil, false, nil
}

// newRegistryRepository creates an authenticated ORAS repository client for
// the provided OCI reference.
func newRegistryRepository(
	cfg *viper.Viper,
	ref name.Reference,
	username string,
	password string,
) (registryRepository, error) {
	repo, err := orasremote.NewRepository(ref.Context().Name())
	if err != nil {
		return nil, err
	}

	// Prepare an authenticated client with the expected user agent
	client := &orasauth.Client{}
	client.SetUserAgent(httpw.UserAgent)
	username, password = prepareRegistryCredentials(cfg, ref, username, password)
	if username != "" || password != "" {
		client.Credential = orasauth.StaticCredential(repo.Reference.Host(), orasauth.Credential{
			Password: password,
			Username: username,
		})
	}

	repo.Client = client
	return repo, nil
}

// prepareRegistryCredentials returns the explicit credentials provided or the
// configured Docker Hub fallback when applicable.
func prepareRegistryCredentials(
	cfg *viper.Viper,
	ref name.Reference,
	username string,
	password string,
) (string, string) {
	if username != "" || password != "" {
		return username, password
	}
	if cfg != nil && RegistryIsDockerHub(ref) {
		return cfg.GetString("creds.dockerUsername"), cfg.GetString("creds.dockerPassword")
	}
	return "", ""
}

// translateRegistryError maps remote registry errors to the OCI package error
// values used by callers.
func translateRegistryError(err error) error {
	if errors.Is(err, oraserdef.ErrNotFound) {
		return fmt.Errorf("%w: %w", ErrArtifactNotFound, err)
	}
	return err
}

// unmarshalManifest decodes a JSON OCI manifest document.
func unmarshalManifest(data []byte) (*ocispec.Manifest, error) {
	var manifest ocispec.Manifest
	if err := json.Unmarshal(data, &manifest); err != nil {
		return nil, err
	}
	return &manifest, nil
}

// RegistryIsDockerHub checks if the registry of the reference provided is the
// Docker Hub.
func RegistryIsDockerHub(ref name.Reference) bool {
	return dockerHubRE.MatchString(ref.Context().Registry.Name())
}
