package oci

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"net/http"
	"sync"

	"github.com/google/go-containerregistry/pkg/name"
	v1 "github.com/google/go-containerregistry/pkg/v1"
	"github.com/google/go-containerregistry/pkg/v1/empty"
	"github.com/google/go-containerregistry/pkg/v1/layout"
	ggcrremote "github.com/google/go-containerregistry/pkg/v1/remote"
	ggcrtypes "github.com/google/go-containerregistry/pkg/v1/types"
	"github.com/spf13/viper"
	"golang.org/x/sync/errgroup"
)

const (
	// maxImageConfigSize is the maximum size allowed for the config of an
	// image. Configs are read into memory, unlike layers.
	maxImageConfigSize = 32 << 20

	// maxImageLayers is the maximum number of layers allowed in an image.
	maxImageLayers = 512

	// maxLayersWriters is the maximum number of layers written concurrently.
	maxLayersWriters = 4
)

// ErrImageTooLarge indicates that an image exceeds the limits allowed.
var ErrImageTooLarge = errors.New("image too large")

// Image represents a remote image that fits the limits allowed, which can be
// copied to an OCI layout in stages. All requests use the context provided to
// GetDescriptor, as go-containerregistry keeps it in the descriptor.
type Image struct {
	image    v1.Image
	manifest *v1.Manifest
	layers   map[v1.Hash]struct{}
}

// RateLimitTracker keeps track of the requests being rate limited by a registry.
// Only the last response of each request counts, as go-containerregistry retries
// them, and only requests sent to the registry or redirected by it are considered,
// as the servers of foreign layers are chosen by the publisher of the image.
type RateLimitTracker struct {
	registry string

	mu      sync.Mutex
	limited map[string]struct{}
}

// NewRateLimitTracker creates a new RateLimitTracker for the registry of the
// reference provided.
func NewRateLimitTracker(ref name.Reference) *RateLimitTracker {
	return &RateLimitTracker{
		registry: ref.Context().RegistryStr(),
		limited:  make(map[string]struct{}),
	}
}

// Limited checks if the last response received for any request was a 429. This
// is available even when go-containerregistry does not return that response as
// the error, like when it falls back to the foreign urls of a layer.
func (t *RateLimitTracker) Limited() bool {
	t.mu.Lock()
	defer t.mu.Unlock()

	return len(t.limited) > 0
}

// observe records the response received for the request provided.
func (t *RateLimitTracker) observe(req *http.Request, resp *http.Response) {
	origin := req
	for origin.Response != nil && origin.Response.Request != nil {
		origin = origin.Response.Request
	}
	if origin.URL.Host != t.registry {
		return
	}

	t.mu.Lock()
	defer t.mu.Unlock()

	if resp.StatusCode == http.StatusTooManyRequests {
		t.limited[req.URL.String()] = struct{}{}
	} else {
		delete(t.limited, req.URL.String())
	}
}

// GetDescriptor returns the descriptor of the manifest referenced. All
// connections go through the default transport, so they are subject to the
// address restrictions when enabled. The tracker provided, which is optional,
// observes all the requests made using the descriptor.
func GetDescriptor(
	ctx context.Context,
	cfg *viper.Viper,
	ref name.Reference,
	rateLimits *RateLimitTracker,
) (*ggcrremote.Descriptor, error) {
	options := append(
		PrepareRemoteOptions(ctx, cfg, ref, "", ""),
		ggcrremote.WithTransport(&registryTransport{next: ggcrremote.DefaultTransport, rateLimits: rateLimits}),
	)
	return ggcrremote.Get(ref, options...)
}

// NewImage returns the image of the descriptor provided, checking its manifest
// does not exceed the limits allowed before requesting any of its blobs. When
// the descriptor is an index the image selected is the linux/amd64 one, which
// is the go-containerregistry default.
func NewImage(desc *ggcrremote.Descriptor, maxSize int64) (*Image, error) {
	image, err := desc.Image()
	if err != nil {
		return nil, err
	}
	manifest, err := image.Manifest()
	if err != nil {
		return nil, err
	}
	if err := checkManifest(manifest, maxSize); err != nil {
		return nil, err
	}
	layers := make(map[v1.Hash]struct{}, len(manifest.Layers))
	for _, layer := range manifest.Layers {
		layers[layer.Digest] = struct{}{}
	}
	return &Image{image: image, manifest: manifest, layers: layers}, nil
}

// HasLayer checks if the image contains a layer with the digest provided.
func (i *Image) HasLayer(digest v1.Hash) bool {
	_, ok := i.layers[digest]
	return ok
}

// WriteLayout writes an OCI layout to the path provided that contains only the
// manifest and the config of the image. The manifest is written as received, so
// its digest does not change.
func (i *Image) WriteLayout(path string) error {
	config, err := i.image.RawConfigFile()
	if err != nil {
		return err
	}
	manifest, err := i.image.RawManifest()
	if err != nil {
		return err
	}
	digest, err := i.image.Digest()
	if err != nil {
		return err
	}
	mediaType, err := i.image.MediaType()
	if err != nil {
		return err
	}

	// The content type sent by some registries is not valid
	if !mediaType.IsImage() {
		mediaType = ggcrtypes.OCIManifestSchema1
	}

	imageLayout, err := layout.Write(path, empty.Index)
	if err != nil {
		return err
	}
	if err := imageLayout.WriteBlob(i.manifest.Config.Digest, io.NopCloser(bytes.NewReader(config))); err != nil {
		return err
	}
	if err := imageLayout.WriteBlob(digest, io.NopCloser(bytes.NewReader(manifest))); err != nil {
		return err
	}
	return imageLayout.AppendDescriptor(v1.Descriptor{
		MediaType: mediaType,
		Size:      int64(len(manifest)),
		Digest:    digest,
	})
}

// WriteLayers adds all the layers of the image to the OCI layout at the path
// provided. Blobs are verified while reading them, so no more data than declared
// in the manifest is written.
//
// The first failure stops the layers pending and is the error returned. Failures
// are passed to the function provided as soon as they happen, which should cancel
// the context provided to GetDescriptor as requests in progress depend on it.
func (i *Image) WriteLayers(path string, onFailure func(error)) error {
	imageLayout := layout.Path(path)
	ctx, cancel := context.WithCancelCause(context.Background())
	defer cancel(nil)

	var g errgroup.Group
	g.SetLimit(maxLayersWriters)
	for digest := range i.layers {
		g.Go(func() error {
			if ctx.Err() != nil {
				return nil
			}
			if err := i.writeLayer(imageLayout, digest); err != nil {
				cancel(err) // Before onFailure, which makes others fail as well
				onFailure(err)
			}
			return nil
		})
	}
	_ = g.Wait()
	return context.Cause(ctx)
}

// writeLayer adds the layer with the digest provided to the OCI layout.
func (i *Image) writeLayer(imageLayout layout.Path, digest v1.Hash) error {
	layer, err := i.image.LayerByDigest(digest)
	if err != nil {
		return err
	}
	blob, err := layer.Compressed()
	if err != nil {
		return err
	}
	return imageLayout.WriteBlob(digest, blob)
}

// checkManifest checks the manifest provided includes all digests, which are not
// required when parsing it, and that the sizes it declares do not exceed the
// limits allowed.
func checkManifest(manifest *v1.Manifest, maxSize int64) error {
	if manifest.Config.Digest == (v1.Hash{}) {
		return errors.New("invalid manifest: config digest missing")
	}
	if manifest.Config.Size < 0 || manifest.Config.Size > maxImageConfigSize {
		return fmt.Errorf("%w: config size %d", ErrImageTooLarge, manifest.Config.Size)
	}
	if len(manifest.Layers) > maxImageLayers {
		return fmt.Errorf("%w: %d layers", ErrImageTooLarge, len(manifest.Layers))
	}
	var total int64
	for _, layer := range manifest.Layers {
		if layer.Digest == (v1.Hash{}) {
			return errors.New("invalid manifest: layer digest missing")
		}
		if layer.Size < 0 || layer.Size > maxSize-total {
			return fmt.Errorf("%w: layer size %d", ErrImageTooLarge, layer.Size)
		}
		total += layer.Size
	}
	return nil
}
