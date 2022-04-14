package oci

import (
	"context"
	"errors"
	"sort"
	"strings"

	"github.com/Masterminds/semver/v3"
	"github.com/artifacthub/hub/internal/hub"
	"github.com/google/go-containerregistry/pkg/authn"
	"github.com/google/go-containerregistry/pkg/name"
	"github.com/google/go-containerregistry/pkg/v1/remote"
	ocispec "github.com/opencontainers/image-spec/specs-go/v1"
	csremote "github.com/sigstore/cosign/pkg/oci/remote"
	"github.com/sigstore/cosign/pkg/types"
	"github.com/spf13/viper"
	"oras.land/oras-go/pkg/content"
	ctxo "oras.land/oras-go/pkg/context"
	"oras.land/oras-go/pkg/oras"
)

var (
	// ErrArtifactNotFound indicates that the requested artifact was not found
	// in the registry.
	ErrArtifactNotFound = errors.New("artifact not found")

	// ErrLayerNotFound indicates that the requested layer was not found in the
	// OCI artifact provided.
	ErrLayerNotFound = errors.New("layer not found")
)

// Puller is a hub.OCIPuller implementation.
type Puller struct {
	cfg *viper.Viper
}

// NewPuller creates a new Puller instance.
func NewPuller(cfg *viper.Viper) *Puller {
	return &Puller{
		cfg: cfg,
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
	// Pull layers available at the ref provided
	ref, err := name.ParseReference(imageRef)
	if err != nil {
		return ocispec.Descriptor{}, nil, err
	}
	if username == "" && password == "" && p.cfg != nil && registryIsDockerHub(ref) {
		username = p.cfg.GetString("creds.dockerUsername")
		password = p.cfg.GetString("creds.dockerPassword")
	}
	options := content.RegistryOptions{
		Username:  username,
		Password:  password,
		Insecure:  false,
		PlainHTTP: false,
	}
	registryStore, err := content.NewRegistry(options)
	if err != nil {
		return ocispec.Descriptor{}, nil, err
	}
	memoryStore := content.NewMemory()
	var layers []ocispec.Descriptor
	_, err = oras.Copy(
		ctxo.WithLoggerDiscarded(ctx),
		registryStore,
		ref.String(),
		memoryStore,
		"",
		oras.WithPullEmptyNameAllowed(),
		oras.WithAllowedMediaTypes([]string{mediaType}),
		oras.WithLayerDescriptors(func(l []ocispec.Descriptor) {
			layers = l
		}),
	)
	if err != nil {
		if strings.HasSuffix(err.Error(), "not found") { // TODO: https://github.com/oras-project/oras-go/blob/a3ccc872651aac656c04c9a231423161f98e2f64/pkg/content/multireader.go#L55
			err = ErrArtifactNotFound
		}
		return ocispec.Descriptor{}, nil, err
	}

	// Return requested layer (if available)
	for _, layer := range layers {
		if layer.MediaType == mediaType {
			desc, data, _ := memoryStore.Get(layer)
			return desc, data, nil
		}
	}
	return ocispec.Descriptor{}, nil, ErrLayerNotFound
}

// SignatureChecker is a hub.OCISignatureChecker implementation.
type SignatureChecker struct {
	cfg *viper.Viper
	op  hub.OCIPuller
}

// NewSignatureChecker creates a new Puller instance.
func NewSignatureChecker(cfg *viper.Viper, op hub.OCIPuller) *SignatureChecker {
	return &SignatureChecker{
		cfg: cfg,
		op:  op,
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
	// Locate OCI artifact containing signature
	artifactRef, err := name.ParseReference(ref)
	if err != nil {
		return false, err
	}
	options := PrepareRemoteOptions(ctx, c.cfg, artifactRef, username, password)
	signatureRef, err := csremote.SignatureTag(artifactRef, csremote.WithRemoteOptions(options...))
	if err != nil {
		return false, err
	}

	// Check if the OCI artifact exists and contains a signature layer
	_, _, err = c.op.PullLayer(ctx, signatureRef.String(), types.SimpleSigningMediaType, username, password)
	if err != nil {
		if errors.Is(err, ErrArtifactNotFound) || errors.Is(err, ErrLayerNotFound) {
			return false, nil
		}
		return false, err
	}
	return true, nil
}

// OCITagsGetter provides a mechanism to get all the version tags available for
// a given repository in a OCI registry. Tags that aren't valid semver versions
// will be filtered out.
type TagsGetter struct{}

// Tags returns a list with the tags available for the provided repository.
func (tg *TagsGetter) Tags(ctx context.Context, r *hub.Repository, onlySemver bool) ([]string, error) {
	u := strings.TrimPrefix(r.URL, hub.RepositoryOCIPrefix)
	ociRepo, err := name.NewRepository(u)
	if err != nil {
		return nil, err
	}
	options := []remote.Option{
		remote.WithContext(ctx),
	}
	if r.AuthUser != "" || r.AuthPass != "" {
		options = append(options, remote.WithAuth(&authn.Basic{
			Username: r.AuthUser,
			Password: r.AuthPass,
		}))
	}
	tags, err := remote.List(ociRepo, options...)
	if err != nil {
		return nil, err
	}
	if onlySemver {
		var semverTags []string
		for _, tag := range tags {
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

// prepareRemoteOptions prepares some options used to interact with a remote
// registry.
func PrepareRemoteOptions(
	ctx context.Context,
	cfg *viper.Viper,
	ref name.Reference,
	username,
	password string,
) []remote.Option {
	options := []remote.Option{}
	if ctx != nil {
		options = append(options, remote.WithContext(ctx))
	}
	if username != "" || password != "" {
		options = append(options, remote.WithAuth(&authn.Basic{
			Username: username,
			Password: password,
		}))
	} else if cfg != nil && registryIsDockerHub(ref) {
		options = append(options, remote.WithAuth(&authn.Basic{
			Username: cfg.GetString("creds.dockerUsername"),
			Password: cfg.GetString("creds.dockerPassword"),
		}))
	}
	return options
}

// registryIsDockerHub checks if the registry name of the reference provided is
// docker.io.
func registryIsDockerHub(ref name.Reference) bool {
	return strings.HasSuffix(ref.Context().Registry.Name(), "docker.io")
}
