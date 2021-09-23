package oci

import (
	"context"
	"errors"
	"strings"

	"github.com/containerd/containerd/remotes/docker"
	ocispec "github.com/opencontainers/image-spec/specs-go/v1"
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
type Puller struct{}

// PullLayer pulls the first layer of the media type provided from the OCI
// artifact at the given reference.
func (p *Puller) PullLayer(
	ctx context.Context,
	ref,
	mediaType,
	username,
	password string,
) (ocispec.Descriptor, []byte, error) {
	// Pull layers available at the ref provided
	resolverOptions := docker.ResolverOptions{}
	if username != "" || password != "" {
		resolverOptions.Authorizer = docker.NewDockerAuthorizer(
			docker.WithAuthCreds(func(string) (string, string, error) {
				return username, password, nil
			}),
		)
	}
	store := content.NewMemoryStore()
	_, layers, err := oras.Pull(
		ctxo.WithLoggerDiscarded(ctx),
		docker.NewResolver(resolverOptions),
		ref,
		store,
		oras.WithPullEmptyNameAllowed(),
		oras.WithAllowedMediaTypes([]string{mediaType}),
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
			desc, data, _ := store.Get(layer)
			return desc, data, nil
		}
	}
	return ocispec.Descriptor{}, nil, ErrLayerNotFound
}
