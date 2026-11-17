package oci

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"math"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"slices"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/artifacthub/hub/internal/hub"
	"github.com/google/go-containerregistry/pkg/name"
	"github.com/google/go-containerregistry/pkg/registry"
	v1 "github.com/google/go-containerregistry/pkg/v1"
	"github.com/google/go-containerregistry/pkg/v1/empty"
	"github.com/google/go-containerregistry/pkg/v1/layout"
	"github.com/google/go-containerregistry/pkg/v1/mutate"
	"github.com/google/go-containerregistry/pkg/v1/partial"
	"github.com/google/go-containerregistry/pkg/v1/random"
	ggcrremote "github.com/google/go-containerregistry/pkg/v1/remote"
	"github.com/google/go-containerregistry/pkg/v1/remote/transport"
	ggcrtypes "github.com/google/go-containerregistry/pkg/v1/types"
	"github.com/google/go-containerregistry/pkg/v1/validate"
	"github.com/spf13/viper"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

const testMaxImageSize = 1 << 30

// testRegistry is a registry that records the blob requests received.
type testRegistry struct {
	host string

	mu    sync.Mutex
	blobs []string
}

// newTestRegistry creates a new testRegistry instance. The optional handler can
// intercept requests before they reach the registry.
func newTestRegistry(t *testing.T, intercept func(w http.ResponseWriter, r *http.Request) bool) *testRegistry {
	t.Helper()
	tr := &testRegistry{}
	base := registry.New(registry.Logger(log.New(io.Discard, "", 0)))
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet && strings.Contains(r.URL.Path, "/blobs/") {
			tr.mu.Lock()
			tr.blobs = append(tr.blobs, r.URL.Path[strings.LastIndex(r.URL.Path, "/")+1:])
			tr.mu.Unlock()
		}
		if intercept == nil || !intercept(w, r) {
			base.ServeHTTP(w, r)
		}
	}))
	t.Cleanup(srv.Close)
	tr.host = strings.TrimPrefix(srv.URL, "http://")
	return tr
}

// blobRequests returns the blobs requested so far.
func (tr *testRegistry) blobRequests() []string {
	tr.mu.Lock()
	defer tr.mu.Unlock()
	return append([]string{}, tr.blobs...)
}

// parseRef returns the reference used in the tests.
func (tr *testRegistry) parseRef(t *testing.T) name.Reference {
	t.Helper()
	ref, err := name.ParseReference(tr.host + "/repo:1.0.0")
	require.NoError(t, err)
	return ref
}

// push adds the image provided to the registry.
func (tr *testRegistry) push(t *testing.T, img v1.Image) name.Reference {
	t.Helper()
	ref := tr.parseRef(t)
	require.NoError(t, ggcrremote.Write(ref, img))
	return ref
}

// roundTripperFunc is a function implementing the http.RoundTripper interface.
type roundTripperFunc func(req *http.Request) (*http.Response, error)

// RoundTrip implements the http.RoundTripper interface.
func (f roundTripperFunc) RoundTrip(req *http.Request) (*http.Response, error) {
	return f(req)
}

// redirect sends a redirect to the location provided.
func redirect(w http.ResponseWriter, location string) {
	w.Header().Set("Location", location)
	w.WriteHeader(http.StatusFound)
}

// getImage returns the Image of the reference provided.
func getImage(t *testing.T, ref name.Reference) *Image {
	t.Helper()
	desc, err := GetDescriptor(context.Background(), viper.New(), ref, nil)
	require.NoError(t, err)
	image, err := NewImage(desc, testMaxImageSize)
	require.NoError(t, err)
	return image
}

// layerDigests returns the digests of the layers of the image provided.
func layerDigests(t *testing.T, img v1.Image) []string {
	t.Helper()
	manifest, err := img.Manifest()
	require.NoError(t, err)
	digests := make([]string, 0, len(manifest.Layers))
	for _, layer := range manifest.Layers {
		digests = append(digests, layer.Digest.String())
	}
	return digests
}

func TestNewImageLimits(t *testing.T) {
	t.Parallel()

	digest := "sha256:" + strings.Repeat("a", 64)
	layers := func(sizes ...int64) []map[string]any {
		list := make([]map[string]any, 0, len(sizes))
		for _, size := range sizes {
			list = append(list, map[string]any{"mediaType": ggcrtypes.OCILayer, "digest": digest, "size": size})
		}
		return list
	}
	config := func(size int64) map[string]any {
		return map[string]any{"mediaType": ggcrtypes.OCIConfigJSON, "digest": digest, "size": size}
	}

	testCases := []struct {
		name        string
		config      map[string]any
		layers      []map[string]any
		expectedErr error
	}{
		{"within the limits", config(maxImageConfigSize), layers(testMaxImageSize/2, testMaxImageSize/2), nil},
		{"config too large", config(maxImageConfigSize + 1), layers(1), ErrImageTooLarge},
		{"negative config size", config(-1), layers(1), ErrImageTooLarge},
		{"too many layers", config(1), layers(make([]int64, maxImageLayers+1)...), ErrImageTooLarge},
		{"layer too large", config(1), layers(testMaxImageSize + 1), ErrImageTooLarge},
		{"layers too large", config(1), layers(testMaxImageSize, 1), ErrImageTooLarge},
		{"negative layer size", config(1), layers(-1), ErrImageTooLarge},
		{"negative size compensating a large one", config(1), layers(testMaxImageSize, testMaxImageSize, -testMaxImageSize), ErrImageTooLarge},
		{"size overflow", config(1), layers(math.MaxInt64, math.MaxInt64, 2), ErrImageTooLarge},
	}
	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()

			manifest, err := json.Marshal(map[string]any{
				"schemaVersion": 2,
				"mediaType":     ggcrtypes.OCIManifestSchema1,
				"config":        tc.config,
				"layers":        tc.layers,
			})
			require.NoError(t, err)
			tr := newTestRegistry(t, func(w http.ResponseWriter, r *http.Request) bool {
				if !strings.Contains(r.URL.Path, "/manifests/") {
					return false
				}
				w.Header().Set("Content-Type", string(ggcrtypes.OCIManifestSchema1))
				_, _ = w.Write(manifest)
				return true
			})

			desc, err := GetDescriptor(context.Background(), viper.New(), tr.parseRef(t), nil)
			require.NoError(t, err)
			_, err = NewImage(desc, testMaxImageSize)

			if tc.expectedErr != nil {
				require.ErrorIs(t, err, tc.expectedErr)
			} else {
				require.NoError(t, err)
			}
			assert.Empty(t, tr.blobRequests())
		})
	}
}

func TestNewImageMissingDigests(t *testing.T) {
	t.Parallel()

	digest := "sha256:" + strings.Repeat("a", 64)
	testCases := []struct {
		name     string
		manifest string
	}{
		{"config digest", `{"schemaVersion":2,"config":{"size":1},"layers":[]}`},
		{"layer digest", fmt.Sprintf(`{"schemaVersion":2,"config":{"digest":%q,"size":1},"layers":[{"size":1}]}`, digest)},
	}
	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()

			tr := newTestRegistry(t, func(w http.ResponseWriter, r *http.Request) bool {
				if !strings.Contains(r.URL.Path, "/manifests/") {
					return false
				}
				w.Header().Set("Content-Type", string(ggcrtypes.OCIManifestSchema1))
				_, _ = w.Write([]byte(tc.manifest))
				return true
			})

			desc, err := GetDescriptor(context.Background(), viper.New(), tr.parseRef(t), nil)
			require.NoError(t, err)
			_, err = NewImage(desc, testMaxImageSize)

			require.ErrorContains(t, err, "invalid manifest")
			assert.Empty(t, tr.blobRequests())
		})
	}
}

func TestNewImagePlatform(t *testing.T) {
	t.Parallel()

	tr := newTestRegistry(t, nil)
	amd64, err := random.Image(64, 1)
	require.NoError(t, err)
	arm64, err := random.Image(64, 1)
	require.NoError(t, err)
	index := mutate.AppendManifests(empty.Index,
		mutate.IndexAddendum{Add: arm64, Descriptor: v1.Descriptor{Platform: &v1.Platform{OS: "linux", Architecture: "arm64"}}},
		mutate.IndexAddendum{Add: amd64, Descriptor: v1.Descriptor{Platform: &v1.Platform{OS: "linux", Architecture: "amd64"}}},
	)
	ref := tr.parseRef(t)
	require.NoError(t, ggcrremote.WriteIndex(ref, index))

	dir := filepath.Join(t.TempDir(), "image")
	require.NoError(t, getImage(t, ref).WriteLayout(dir))

	path, err := layout.FromPath(dir)
	require.NoError(t, err)
	layoutIndex, err := path.ImageIndex()
	require.NoError(t, err)
	manifest, err := layoutIndex.IndexManifest()
	require.NoError(t, err)
	require.Len(t, manifest.Manifests, 1)
	amd64Digest, err := amd64.Digest()
	require.NoError(t, err)
	assert.Equal(t, amd64Digest, manifest.Manifests[0].Digest)
}

func TestImageWriteLayout(t *testing.T) {
	t.Parallel()

	tr := newTestRegistry(t, nil)
	img, err := random.Image(64, 3)
	require.NoError(t, err)
	ref := tr.push(t, img)
	dir := filepath.Join(t.TempDir(), "image")

	require.NoError(t, getImage(t, ref).WriteLayout(dir))

	// Only the config is requested
	configName, err := img.ConfigName()
	require.NoError(t, err)
	assert.Equal(t, []string{configName.String()}, tr.blobRequests())

	// Only the manifest and the config are written
	digest, err := img.Digest()
	require.NoError(t, err)
	entries, err := os.ReadDir(filepath.Join(dir, "blobs", "sha256"))
	require.NoError(t, err)
	names := make([]string, 0, len(entries))
	for _, entry := range entries {
		names = append(names, entry.Name())
	}
	assert.ElementsMatch(t, []string{digest.Hex, configName.Hex}, names)

	// The manifest is written as received
	rawManifest, err := img.RawManifest()
	require.NoError(t, err)
	written, err := os.ReadFile(filepath.Join(dir, "blobs", "sha256", digest.Hex))
	require.NoError(t, err)
	assert.Equal(t, rawManifest, written)

	// The index only includes the fields needed
	path, err := layout.FromPath(dir)
	require.NoError(t, err)
	index, err := path.ImageIndex()
	require.NoError(t, err)
	indexManifest, err := index.IndexManifest()
	require.NoError(t, err)
	mediaType, err := img.MediaType()
	require.NoError(t, err)
	assert.Equal(t, []v1.Descriptor{{
		MediaType: mediaType,
		Size:      int64(len(rawManifest)),
		Digest:    digest,
	}}, indexManifest.Manifests)
}

func TestImageWriteLayoutInvalidMediaType(t *testing.T) {
	t.Parallel()

	img, err := random.Image(64, 1)
	require.NoError(t, err)
	rawManifest, err := img.RawManifest()
	require.NoError(t, err)
	tr := newTestRegistry(t, func(w http.ResponseWriter, r *http.Request) bool {
		if !strings.Contains(r.URL.Path, "/manifests/") || r.Method != http.MethodGet {
			return false
		}
		w.Header().Set("Content-Type", "text/plain")
		_, _ = w.Write(rawManifest)
		return true
	})
	ref := tr.push(t, img)
	dir := filepath.Join(t.TempDir(), "image")

	require.NoError(t, getImage(t, ref).WriteLayout(dir))

	path, err := layout.FromPath(dir)
	require.NoError(t, err)
	index, err := path.ImageIndex()
	require.NoError(t, err)
	indexManifest, err := index.IndexManifest()
	require.NoError(t, err)
	require.Len(t, indexManifest.Manifests, 1)
	assert.Equal(t, ggcrtypes.OCIManifestSchema1, indexManifest.Manifests[0].MediaType)
}

func TestImageWriteLayers(t *testing.T) {
	t.Parallel()

	t.Run("all layers are added to the layout", func(t *testing.T) {
		t.Parallel()

		tr := newTestRegistry(t, nil)
		img, err := random.Image(64, 3)
		require.NoError(t, err)
		ref := tr.push(t, img)
		dir := filepath.Join(t.TempDir(), "image")
		image := getImage(t, ref)

		require.NoError(t, image.WriteLayout(dir))
		require.NoError(t, image.WriteLayers(dir, func(error) {}))

		configName, err := img.ConfigName()
		require.NoError(t, err)
		assert.ElementsMatch(t, append(layerDigests(t, img), configName.String()), tr.blobRequests())
		path, err := layout.FromPath(dir)
		require.NoError(t, err)
		index, err := path.ImageIndex()
		require.NoError(t, err)
		digest, err := img.Digest()
		require.NoError(t, err)
		layoutImage, err := index.Image(digest)
		require.NoError(t, err)
		require.NoError(t, validate.Image(layoutImage))
		layoutDigest, err := layoutImage.Digest()
		require.NoError(t, err)
		assert.Equal(t, digest, layoutDigest)
	})

	t.Run("layers repeated are requested once", func(t *testing.T) {
		t.Parallel()

		tr := newTestRegistry(t, nil)
		layer, err := random.Layer(64, ggcrtypes.OCILayer)
		require.NoError(t, err)
		img, err := mutate.AppendLayers(empty.Image, layer, layer)
		require.NoError(t, err)
		ref := tr.push(t, img)
		dir := filepath.Join(t.TempDir(), "image")
		image := getImage(t, ref)
		require.NoError(t, image.WriteLayout(dir))

		require.NoError(t, image.WriteLayers(dir, func(error) {}))

		digest, err := layer.Digest()
		require.NoError(t, err)
		configName, err := img.ConfigName()
		require.NoError(t, err)
		assert.ElementsMatch(t, []string{configName.String(), digest.String()}, tr.blobRequests())
	})

	t.Run("layers are written concurrently with a limit", func(t *testing.T) {
		t.Parallel()

		img, err := random.Image(64, 3*maxLayersWriters)
		require.NoError(t, err)
		configName, err := img.ConfigName()
		require.NoError(t, err)
		var current, peak atomic.Int32
		tr := newTestRegistry(t, func(_ http.ResponseWriter, r *http.Request) bool {
			if r.Method == http.MethodGet && strings.Contains(r.URL.Path, "/blobs/") &&
				!strings.HasSuffix(r.URL.Path, configName.String()) {
				n := current.Add(1)
				defer current.Add(-1)
				for {
					p := peak.Load()
					if n <= p || peak.CompareAndSwap(p, n) {
						break
					}
				}
				time.Sleep(20 * time.Millisecond)
			}
			return false
		})
		ref := tr.push(t, img)
		dir := filepath.Join(t.TempDir(), "image")
		image := getImage(t, ref)
		require.NoError(t, image.WriteLayout(dir))

		require.NoError(t, image.WriteLayers(dir, func(error) {}))

		assert.Greater(t, peak.Load(), int32(1))
		assert.LessOrEqual(t, peak.Load(), int32(maxLayersWriters))
	})

	t.Run("layers pending are not requested after a failure", func(t *testing.T) {
		t.Parallel()

		img, err := random.Image(64, 3*maxLayersWriters)
		require.NoError(t, err)
		layers := layerDigests(t, img)
		var requests, failures atomic.Int32
		tr := newTestRegistry(t, func(w http.ResponseWriter, r *http.Request) bool {
			if r.Method == http.MethodGet && slices.Contains(layers, r.URL.Path[strings.LastIndex(r.URL.Path, "/")+1:]) {
				requests.Add(1)
				w.WriteHeader(http.StatusForbidden)
				return true
			}
			return false
		})
		ref := tr.push(t, img)
		requests.Store(0)
		dir := filepath.Join(t.TempDir(), "image")
		image := getImage(t, ref)
		require.NoError(t, image.WriteLayout(dir))

		err = image.WriteLayers(dir, func(error) { failures.Add(1) })

		require.Error(t, err)
		assert.LessOrEqual(t, requests.Load(), int32(maxLayersWriters))
		assert.Equal(t, requests.Load(), failures.Load())
	})

	t.Run("a failure stops the layers in progress", func(t *testing.T) {
		t.Parallel()

		img, err := random.Image(64, 3*maxLayersWriters)
		require.NoError(t, err)
		configName, err := img.ConfigName()
		require.NoError(t, err)
		var requests atomic.Int32
		tr := newTestRegistry(t, func(w http.ResponseWriter, r *http.Request) bool {
			if r.Method != http.MethodGet || !strings.Contains(r.URL.Path, "/blobs/") ||
				strings.HasSuffix(r.URL.Path, configName.String()) {
				return false
			}
			if requests.Add(1) < maxLayersWriters {
				<-r.Context().Done()
			} else {
				w.WriteHeader(http.StatusForbidden)
			}
			return true
		})
		ref := tr.push(t, img)
		requests.Store(0)
		ctx, cancel := context.WithCancel(context.Background())
		defer cancel()
		desc, err := GetDescriptor(ctx, viper.New(), ref, nil)
		require.NoError(t, err)
		image, err := NewImage(desc, testMaxImageSize)
		require.NoError(t, err)
		dir := filepath.Join(t.TempDir(), "image")
		require.NoError(t, image.WriteLayout(dir))

		err = image.WriteLayers(dir, func(error) { cancel() })

		var transportErr *transport.Error
		require.ErrorAs(t, err, &transportErr)
		assert.Equal(t, http.StatusForbidden, transportErr.StatusCode)
		assert.EqualValues(t, maxLayersWriters, requests.Load())
	})

	t.Run("layer not matching its digest is rejected", func(t *testing.T) {
		t.Parallel()

		img, err := random.Image(64, 1)
		require.NoError(t, err)
		layerDigest := layerDigests(t, img)[0]
		tr := newTestRegistry(t, func(w http.ResponseWriter, r *http.Request) bool {
			if r.Method == http.MethodGet && strings.HasSuffix(r.URL.Path, layerDigest) {
				_, _ = w.Write([]byte(strings.Repeat("x", 4096)))
				return true
			}
			return false
		})
		ref := tr.push(t, img)
		dir := filepath.Join(t.TempDir(), "image")
		image := getImage(t, ref)
		require.NoError(t, image.WriteLayout(dir))

		require.Error(t, image.WriteLayers(dir, func(error) {}))
	})
}

func TestImageHasLayer(t *testing.T) {
	t.Parallel()

	tr := newTestRegistry(t, nil)
	img, err := random.Image(64, 2)
	require.NoError(t, err)
	image := getImage(t, tr.push(t, img))

	for _, digest := range layerDigests(t, img) {
		hash, err := v1.NewHash(digest)
		require.NoError(t, err)
		assert.True(t, image.HasLayer(hash))
	}
	configName, err := img.ConfigName()
	require.NoError(t, err)
	assert.False(t, image.HasLayer(configName))
}

func TestRegistryTransportContentDigest(t *testing.T) {
	t.Parallel()

	body := []byte(`{"schemaVersion":1}`)
	bodyDigest, _, err := v1.SHA256(bytes.NewReader(body))
	require.NoError(t, err)
	claimed := v1.Hash{Algorithm: "sha256", Hex: strings.Repeat("a", 64)}
	signed := ggcrtypes.DockerManifestSchema1Signed
	newRegistry := func(t *testing.T, contentType ggcrtypes.MediaType) *testRegistry {
		t.Helper()
		return newTestRegistry(t, func(w http.ResponseWriter, r *http.Request) bool {
			if !strings.Contains(r.URL.Path, "/manifests/") {
				return false
			}
			w.Header().Set("Content-Type", string(contentType))
			w.Header().Set("Docker-Content-Digest", claimed.String())
			w.Header().Set("Content-Length", fmt.Sprint(len(body)))
			_, _ = w.Write(body)
			return true
		})
	}

	t.Run("signed schema v1 digest is computed when requesting a tag", func(t *testing.T) {
		t.Parallel()

		desc, err := GetDescriptor(context.Background(), viper.New(), newRegistry(t, signed).parseRef(t), nil)

		require.NoError(t, err)
		assert.Equal(t, bodyDigest, desc.Digest)
	})

	t.Run("signed schema v1 digest is verified when requesting a digest", func(t *testing.T) {
		t.Parallel()

		ref, err := name.ParseReference(newRegistry(t, signed).host + "/repo@" + claimed.String())
		require.NoError(t, err)

		_, err = GetDescriptor(context.Background(), viper.New(), ref, nil)

		require.ErrorContains(t, err, "does not match requested digest")
	})

	t.Run("head requests can still use the header", func(t *testing.T) {
		t.Parallel()

		ref := newRegistry(t, signed).parseRef(t)

		desc, err := ggcrremote.Head(ref, PrepareRemoteOptions(context.Background(), nil, ref, "", "")...)

		require.NoError(t, err)
		assert.Equal(t, claimed, desc.Digest)
	})

	t.Run("other media types are not updated", func(t *testing.T) {
		t.Parallel()

		next := roundTripperFunc(func(*http.Request) (*http.Response, error) {
			return &http.Response{Body: http.NoBody, Header: http.Header{
				"Content-Type":          {string(ggcrtypes.OCIManifestSchema1)},
				"Docker-Content-Digest": {claimed.String()},
			}}, nil
		})
		req := httptest.NewRequest(http.MethodGet, "http://registry.test/v2/repo/manifests/1.0.0", nil)

		resp, err := (&registryTransport{next: next}).RoundTrip(req)

		require.NoError(t, err)
		defer resp.Body.Close()
		assert.Equal(t, claimed.String(), resp.Header.Get("Docker-Content-Digest"))
	})
}

func TestRateLimitTracker(t *testing.T) {
	t.Parallel()

	const (
		blob    = "https://registry.test/v2/repo/blobs/sha256:1"
		cdn     = "https://cdn.test/blob"
		foreign = "https://foreign.test/layer"
	)
	type response struct {
		url        string
		redirector string
		status     int
	}
	testCases := []struct {
		name      string
		responses []response
		expected  bool
	}{
		{"no requests", nil, false},
		{"request succeeded", []response{{blob, "", http.StatusOK}}, false},
		{"other failures", []response{{blob, "", http.StatusServiceUnavailable}}, false},
		{"rate limited", []response{{blob, "", http.StatusTooManyRequests}}, true},
		{"rate limit absorbed by a retry", []response{
			{blob, "", http.StatusTooManyRequests},
			{blob, "", http.StatusOK},
		}, false},
		{"other requests succeeding", []response{
			{blob, "", http.StatusTooManyRequests},
			{blob + "2", "", http.StatusOK},
		}, true},
		{"rate limited after a redirect", []response{{cdn, blob, http.StatusTooManyRequests}}, true},
		{"rate limit absorbed by a retry after a redirect", []response{
			{cdn, blob, http.StatusTooManyRequests},
			{cdn, blob, http.StatusOK},
		}, false},
		{"foreign server", []response{{foreign, "", http.StatusTooManyRequests}}, false},
		{"foreign server redirecting to the registry", []response{{blob, foreign, http.StatusTooManyRequests}}, false},
	}
	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()

			ref, err := name.ParseReference("registry.test/repo:1.0.0")
			require.NoError(t, err)
			tracker := NewRateLimitTracker(ref)
			for _, r := range tc.responses {
				next := roundTripperFunc(func(*http.Request) (*http.Response, error) {
					return &http.Response{StatusCode: r.status, Body: http.NoBody, Header: http.Header{}}, nil
				})
				req := httptest.NewRequest(http.MethodGet, r.url, nil)
				if r.redirector != "" {
					req.Response = &http.Response{Request: httptest.NewRequest(http.MethodGet, r.redirector, nil)}
				}

				resp, err := (&registryTransport{next: next, rateLimits: tracker}).RoundTrip(req)
				require.NoError(t, err)
				resp.Body.Close()
			}

			assert.Equal(t, tc.expected, tracker.Limited())
		})
	}
}

func TestRemoteOptionsLimitRedirects(t *testing.T) {
	t.Parallel()

	digest := "sha256:" + strings.Repeat("a", 64)
	layer, err := random.Layer(64, ggcrtypes.OCILayer)
	require.NoError(t, err)
	img, err := mutate.AppendLayers(empty.Image, layer)
	require.NoError(t, err)
	rawManifest, err := img.RawManifest()
	require.NoError(t, err)

	testCases := []struct {
		name string
		path string
		call func(ref name.Reference, repository *hub.Repository) error
	}{
		{"tags", "/tags/list", func(_ name.Reference, r *hub.Repository) error {
			_, err := NewTagsGetter(nil).Tags(context.Background(), r, false, false)
			return err
		}},
		{"descriptor", "/manifests/", func(ref name.Reference, _ *hub.Repository) error {
			_, err := GetDescriptor(context.Background(), viper.New(), ref, nil)
			return err
		}},
		{"image", "/manifests/", func(ref name.Reference, _ *hub.Repository) error {
			_, err := NewSignatureChecker(nil).getManifest(ref, PrepareRemoteOptions(context.Background(), nil, ref, "", "")...)
			return err
		}},
		{"blob", "/blobs/", func(ref name.Reference, _ *hub.Repository) error {
			img, err := ggcrremote.Image(ref, PrepareRemoteOptions(context.Background(), nil, ref, "", "")...)
			if err != nil {
				return err
			}
			_, err = partial.ConfigFile(img)
			return err
		}},
	}
	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()

			var hits atomic.Int32
			srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				switch {
				case r.URL.Path == "/v2/":
				case strings.Contains(r.URL.Path, tc.path):
					hits.Add(1)
					redirect(w, r.URL.Path+"?hop="+fmt.Sprint(hits.Load()))
				case strings.Contains(r.URL.Path, "/manifests/"):
					w.Header().Set("Content-Type", string(ggcrtypes.OCIManifestSchema1))
					_, _ = w.Write(rawManifest)
				default:
					w.WriteHeader(http.StatusNotFound)
				}
			}))
			defer srv.Close()
			registryHost := strings.TrimPrefix(srv.URL, "http://")
			ref, err := name.ParseReference(registryHost + "/repo@" + digest)
			if tc.path == "/blobs/" {
				ref, err = name.ParseReference(registryHost + "/repo:1.0.0")
			}
			require.NoError(t, err)

			err = tc.call(ref, &hub.Repository{URL: hub.RepositoryOCIPrefix + registryHost + "/repo"})

			require.ErrorContains(t, err, "too many redirects")
			assert.LessOrEqual(t, hits.Load(), int32(maxRedirects+1))
		})
	}

	t.Run("redirects within the limit are followed", func(t *testing.T) {
		t.Parallel()

		var hops atomic.Int32
		tr := newTestRegistry(t, func(w http.ResponseWriter, r *http.Request) bool {
			if r.Method == http.MethodGet && strings.Contains(r.URL.Path, "/manifests/") && hops.Add(1) <= maxRedirects {
				redirect(w, r.URL.Path)
				return true
			}
			return false
		})
		ref := tr.push(t, img)
		hops.Store(0)

		_, err := GetDescriptor(context.Background(), viper.New(), ref, nil)
		require.NoError(t, err)
	})
}
