package util

import (
	"context"
	"errors"

	"github.com/containerd/containerd/remotes/docker"
	ocispec "github.com/opencontainers/image-spec/specs-go/v1"
	"oras.land/oras-go/pkg/content"
	ctxo "oras.land/oras-go/pkg/context"
	"oras.land/oras-go/pkg/oras"
)

var (
	// ErrLayerNotFound indicates that the requested layer was not found in the
	// OCI image provided.
	ErrLayerNotFound = errors.New("layer not found")
)

// OCIPullLayer pulls the first layer of the media type provided from the OCI
// image at the given reference.
func OCIPullLayer(
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
