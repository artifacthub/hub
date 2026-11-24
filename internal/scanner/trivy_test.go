package scanner

import (
	"archive/tar"
	"bytes"
	"context"
	"crypto/sha512"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	trivy "github.com/aquasecurity/trivy/pkg/types"
	"github.com/artifacthub/hub/internal/oci"
	"github.com/artifacthub/hub/internal/tests"
	"github.com/artifacthub/hub/internal/util"
	"github.com/google/go-containerregistry/pkg/name"
	"github.com/google/go-containerregistry/pkg/registry"
	v1 "github.com/google/go-containerregistry/pkg/v1"
	"github.com/google/go-containerregistry/pkg/v1/empty"
	"github.com/google/go-containerregistry/pkg/v1/layout"
	"github.com/google/go-containerregistry/pkg/v1/mutate"
	"github.com/google/go-containerregistry/pkg/v1/random"
	"github.com/google/go-containerregistry/pkg/v1/remote"
	ggcrtypes "github.com/google/go-containerregistry/pkg/v1/types"
	"github.com/rs/zerolog"
	zlog "github.com/rs/zerolog/log"
	"github.com/spf13/viper"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

const (
	testReport = `{
		"ArtifactName": "image",
		"ArtifactType": "container_image",
		"Metadata": {"ImageID": "sha256:1234"},
		"Results": [
			{"Target": "image (alpine 3.20.0)", "Class": "os-pkgs", "Type": "alpine", "Packages": [{"Name": "busybox", "Version": "1.36.1-r0"}]},
			{"Target": "app/go.mod", "Class": "lang-pkgs", "Type": "gomod"}
		]
	}`
	testStderr = "data from a remote service"

	// fakeTrivyScript is a fake Trivy that requires the blobs listed in the file
	// named needed, like a Trivy server missing those layers. Blobs are listed as
	// algorithm/hex, or just hex when the algorithm is sha256. Downloads of the
	// Java DB are tracked separately, and run the file named javadb-before.
	fakeTrivyScript = `#!/bin/sh
dir="$(dirname "$0")"
case " $* " in *" --download-java-db-only "*)
  echo "$@" >> "$dir/javadb-runs"
  env > "$dir/javadb-env"
  if [ -f "$dir/javadb-before" ]; then . "$dir/javadb-before"; fi
  exit 0
esac
echo "$@" >> "$dir/runs"
env > "$dir/env"
pwd > "$dir/cwd"
find image/blobs -type f | sed 's|.*/||' | sort > "$dir/blobs"
if [ -f "$dir/before" ]; then . "$dir/before"; fi
for blob in $(cat "$dir/needed" 2>/dev/null); do
  case "$blob" in */*) ;; *) blob="sha256/$blob" ;; esac
  if [ ! -f "image/blobs/$blob" ]; then
    echo "failed to get the layer content: lstat image/blobs/$blob: no such file or directory" >&2
    exit 1
  fi
done
cat "$dir/report"
`
)

// fakeTrivy represents a Trivy executable available in the PATH.
type fakeTrivy struct {
	dir string
}

// setupTrivy makes a fake Trivy available. Tests using it cannot be parallel.
func setupTrivy(t *testing.T) *fakeTrivy {
	t.Helper()
	ft := &fakeTrivy{dir: t.TempDir()}
	require.NoError(t, os.WriteFile(filepath.Join(ft.dir, "trivy"), []byte(fakeTrivyScript), 0o700)) // #nosec G306
	ft.write(t, "report", testReport)
	t.Setenv("PATH", ft.dir+":"+os.Getenv("PATH"))
	return ft
}

// write writes a file used to control the fake Trivy.
func (ft *fakeTrivy) write(t *testing.T, file, content string) {
	t.Helper()
	require.NoError(t, os.WriteFile(filepath.Join(ft.dir, file), []byte(content), 0o600))
}

// read reads a file written by the fake Trivy.
func (ft *fakeTrivy) read(t *testing.T, file string) string {
	t.Helper()
	data, err := os.ReadFile(filepath.Join(ft.dir, file))
	require.NoError(t, err)
	return string(data)
}

// exists checks if the fake Trivy has written the file provided.
func (ft *fakeTrivy) exists(file string) bool {
	_, err := os.Stat(filepath.Join(ft.dir, file))
	return err == nil
}

// runs returns the number of times Trivy has been run to scan an image.
func (ft *fakeTrivy) runs(t *testing.T) int {
	t.Helper()
	return ft.lines(t, "runs")
}

// javaDBRuns returns the number of times Trivy has been run to download the
// Java DB.
func (ft *fakeTrivy) javaDBRuns(t *testing.T) int {
	t.Helper()
	return ft.lines(t, "javadb-runs")
}

// lines returns the number of lines of a file written by the fake Trivy, which
// is zero when it does not exist.
func (ft *fakeTrivy) lines(t *testing.T, file string) int {
	t.Helper()
	data, err := os.ReadFile(filepath.Join(ft.dir, file))
	if os.IsNotExist(err) {
		return 0
	}
	require.NoError(t, err)
	return strings.Count(string(data), "\n")
}

// fakeRegistry is a registry that keeps track of the requests received.
type fakeRegistry struct {
	host string

	mu        sync.Mutex
	requests  []string
	intercept func(w http.ResponseWriter, r *http.Request) bool
}

// newFakeRegistry creates a new fakeRegistry instance.
func newFakeRegistry(t *testing.T) *fakeRegistry {
	t.Helper()
	fr := &fakeRegistry{}
	base := registry.New(registry.Logger(log.New(io.Discard, "", 0)))
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		fr.mu.Lock()
		fr.requests = append(fr.requests, r.Method+" "+r.URL.Path)
		intercept := fr.intercept
		fr.mu.Unlock()
		if intercept == nil || !intercept(w, r) {
			base.ServeHTTP(w, r)
		}
	}))
	t.Cleanup(srv.Close)
	fr.host = strings.TrimPrefix(srv.URL, "http://")
	return fr
}

// setIntercept sets a handler that can take over the requests received.
func (fr *fakeRegistry) setIntercept(intercept func(w http.ResponseWriter, r *http.Request) bool) {
	fr.mu.Lock()
	defer fr.mu.Unlock()
	fr.intercept = intercept
}

// push adds the image provided to the registry, returning the reference.
func (fr *fakeRegistry) push(t *testing.T, repoAndTag string, img v1.Image) string {
	t.Helper()
	image := fr.host + "/" + repoAndTag
	ref, err := name.ParseReference(image)
	require.NoError(t, err)
	require.NoError(t, remote.Write(ref, img))
	fr.reset()
	return image
}

// pushIndex adds the index provided to the registry, returning the reference.
func (fr *fakeRegistry) pushIndex(t *testing.T, repoAndTag string, index v1.ImageIndex) string {
	t.Helper()
	image := fr.host + "/" + repoAndTag
	ref, err := name.ParseReference(image)
	require.NoError(t, err)
	require.NoError(t, remote.WriteIndex(ref, index))
	fr.reset()
	return image
}

// reset forgets the requests received so far.
func (fr *fakeRegistry) reset() {
	fr.mu.Lock()
	defer fr.mu.Unlock()
	fr.requests = nil
}

// count returns the number of requests received containing the text provided.
func (fr *fakeRegistry) count(text string) int {
	fr.mu.Lock()
	defer fr.mu.Unlock()
	var n int
	for _, request := range fr.requests {
		if strings.Contains(request, text) {
			n++
		}
	}
	return n
}

// captureLogs makes the entries written to the global logger available in the
// buffer returned until the test completes. Tests using it cannot be parallel.
func captureLogs(t *testing.T) *bytes.Buffer {
	t.Helper()
	var logs bytes.Buffer
	logger := zlog.Logger
	zlog.Logger = zerolog.New(zerolog.SyncWriter(&logs))
	t.Cleanup(func() { zlog.Logger = logger })
	return &logs
}

// errorLogs returns the messages of the error level entries in the logs provided.
func errorLogs(t *testing.T, logs *bytes.Buffer) []string {
	t.Helper()
	var messages []string
	decoder := json.NewDecoder(bytes.NewReader(logs.Bytes()))
	for decoder.More() {
		var entry struct {
			Level   string `json:"level"`
			Message string `json:"message"`
		}
		require.NoError(t, decoder.Decode(&entry))
		if entry.Level == zerolog.LevelErrorValue {
			messages = append(messages, entry.Message)
		}
	}
	return messages
}

// newImage returns a random image with the layers requested.
func newImage(t *testing.T, layers int64) v1.Image {
	t.Helper()
	img, err := random.Image(64, layers)
	require.NoError(t, err)
	return img
}

// sha512Layer is a layer whose digest uses SHA-512 instead of SHA-256.
type sha512Layer struct {
	v1.Layer
	digest v1.Hash
}

// Digest implements the v1.Layer interface.
func (l *sha512Layer) Digest() (v1.Hash, error) {
	return l.digest, nil
}

// newSHA512Image returns a random image with the layers requested, whose
// digests use SHA-512.
func newSHA512Image(t *testing.T, layers int) v1.Image {
	t.Helper()
	img := empty.Image
	for range layers {
		layer, err := random.Layer(64, ggcrtypes.DockerLayer)
		require.NoError(t, err)
		blob, err := layer.Compressed()
		require.NoError(t, err)
		hasher := sha512.New()
		_, err = io.Copy(hasher, blob)
		require.NoError(t, err)
		require.NoError(t, blob.Close())
		digest := v1.Hash{Algorithm: "sha512", Hex: hex.EncodeToString(hasher.Sum(nil))}
		img, err = mutate.AppendLayers(img, &sha512Layer{Layer: layer, digest: digest})
		require.NoError(t, err)
	}
	return img
}

// layerHexes returns the hex digests of the layers of the image provided.
func layerHexes(t *testing.T, img v1.Image) []string {
	t.Helper()
	manifest, err := img.Manifest()
	require.NoError(t, err)
	hexes := make([]string, 0, len(manifest.Layers))
	for _, layer := range manifest.Layers {
		hexes = append(hexes, layer.Digest.Hex)
	}
	return hexes
}

// newScanner returns a TrivyScanner ready to be used in tests.
func newScanner(t *testing.T, restricted bool) *TrivyScanner {
	t.Helper()
	cfg := viper.New()
	cfg.Set("restrictedHTTPClient", restricted)
	cfg.Set("scanner.maxImageSize", 1<<30)
	cfg.Set("scanner.trivyURL", "http://trivy.example.com:8081")
	s := newTrivyScanner(context.Background(), cfg)
	s.retryDelay = time.Millisecond
	t.Cleanup(func() { require.NoError(t, s.Close()) })
	return s
}

// parseReport parses the report provided.
func parseReport(t *testing.T, data []byte) *trivy.Report {
	t.Helper()
	var report *trivy.Report
	require.NoError(t, json.Unmarshal(data, &report))
	return report
}

func TestTrivyScannerOnDemandLayers(t *testing.T) {
	t.Run("layers are not pulled when trivy does not need them", func(t *testing.T) {
		ft := setupTrivy(t)
		fr := newFakeRegistry(t)
		img := newImage(t, 3)
		image := fr.push(t, "repo:1.0.0", img)

		data, err := newScanner(t, false).ScanImage(image)

		require.NoError(t, err)
		assert.Equal(t, image, parseReport(t, data).ArtifactName)
		assert.Equal(t, 1, ft.runs(t))
		assert.Equal(t, 1, fr.count("GET /v2/repo/blobs/"))
		assert.Equal(t, 2, strings.Count(ft.read(t, "blobs"), "\n"))
	})

	t.Run("all layers are pulled at once when trivy needs one of them", func(t *testing.T) {
		ft := setupTrivy(t)
		fr := newFakeRegistry(t)
		img := newImage(t, 3)
		image := fr.push(t, "repo:1.0.0", img)
		ft.write(t, "needed", layerHexes(t, img)[1])

		data, err := newScanner(t, false).ScanImage(image)

		require.NoError(t, err)
		assert.Equal(t, image, parseReport(t, data).ArtifactName)
		assert.Equal(t, 2, ft.runs(t))
		assert.Equal(t, 4, fr.count("GET /v2/repo/blobs/"))
		assert.Equal(t, 1, fr.count("/manifests/"))
		for _, layer := range layerHexes(t, img) {
			assert.Equal(t, 1, fr.count(layer))
			assert.Contains(t, ft.read(t, "blobs"), layer)
		}
	})

	t.Run("sha512 layers are pulled when trivy needs one of them", func(t *testing.T) {
		ft := setupTrivy(t)
		fr := newFakeRegistry(t)
		img := newSHA512Image(t, 2)
		image := fr.push(t, "repo:1.0.0", img)
		ft.write(t, "needed", "sha512/"+layerHexes(t, img)[1])

		data, err := newScanner(t, false).ScanImage(image)

		require.NoError(t, err)
		assert.Equal(t, image, parseReport(t, data).ArtifactName)
		assert.Equal(t, 2, ft.runs(t))
		assert.Equal(t, 3, fr.count("GET /v2/repo/blobs/"))
		for _, layer := range layerHexes(t, img) {
			assert.Equal(t, 1, fr.count("sha512:"+layer))
			assert.Contains(t, ft.read(t, "blobs"), layer)
		}
	})

	t.Run("trivy is only run again once", func(t *testing.T) {
		ft := setupTrivy(t)
		fr := newFakeRegistry(t)
		img := newImage(t, 2)
		image := fr.push(t, "repo:1.0.0", img)
		ft.write(t, "before", "echo 'lstat image/blobs/sha256/"+layerHexes(t, img)[0]+": failed' >&2; exit 1\n")

		_, err := newScanner(t, false).ScanImage(image)

		require.ErrorContains(t, err, "error running trivy on image "+image)
		assert.Equal(t, 2, ft.runs(t))
	})

	t.Run("blobs that are not layers of the image do not cause a pull", func(t *testing.T) {
		img := newImage(t, 2)
		configName, err := img.ConfigName()
		require.NoError(t, err)
		testCases := []struct {
			name   string
			stderr string
		}{
			{"unknown blob", "lstat image/blobs/sha256/" + strings.Repeat("a", 64) + ": no such file"},
			{"config", "lstat image/blobs/sha256/" + configName.Hex + ": no such file"},
			{"layer digest out of a blob path", "layer sha256:" + layerHexes(t, img)[0] + " failed"},
			{"truncated digest", "lstat image/blobs/sha256/" + layerHexes(t, img)[0][:63]},
			{"digest with extra hex", "lstat image/blobs/sha256/" + layerHexes(t, img)[0] + "0"},
			{"digest with the wrong algorithm", "lstat image/blobs/sha512/" + layerHexes(t, img)[0]},
			{"unknown sha512 blob", "lstat image/blobs/sha512/" + strings.Repeat("a", 128) + ": no such file"},
			{"unsupported algorithm", "lstat image/blobs/sha384/" + strings.Repeat("a", 96) + ": no such file"},
		}
		for _, tc := range testCases {
			t.Run(tc.name, func(t *testing.T) {
				ft := setupTrivy(t)
				fr := newFakeRegistry(t)
				image := fr.push(t, "repo:1.0.0", img)
				ft.write(t, "before", "echo '"+tc.stderr+"' >&2; exit 1\n")

				_, err := newScanner(t, false).ScanImage(image)

				require.ErrorContains(t, err, tc.stderr)
				assert.Equal(t, 2, ft.runs(t))
				assert.Equal(t, 1, fr.count("GET /v2/repo/blobs/"))
			})
		}
	})
}

func TestTrivyScannerReuse(t *testing.T) {
	t.Run("repeats of a reference make no requests", func(t *testing.T) {
		ft := setupTrivy(t)
		fr := newFakeRegistry(t)
		image := fr.push(t, "repo:latest", newImage(t, 1))
		s := newScanner(t, false)
		_, err := s.ScanImage(image)
		require.NoError(t, err)
		fr.reset()

		first, err := s.ScanImage(image)
		require.NoError(t, err)
		implicitTag, err := s.ScanImage(strings.TrimSuffix(image, ":latest"))
		require.NoError(t, err)

		assert.Equal(t, image, parseReport(t, first).ArtifactName)
		assert.Equal(t, strings.TrimSuffix(image, ":latest"), parseReport(t, implicitTag).ArtifactName)
		assert.Zero(t, fr.count("/"))
		assert.Equal(t, 1, ft.runs(t))
	})

	t.Run("references sharing a digest are scanned once", func(t *testing.T) {
		ft := setupTrivy(t)
		fr1, fr2 := newFakeRegistry(t), newFakeRegistry(t)
		img := newImage(t, 2)
		digest, err := img.Digest()
		require.NoError(t, err)
		image1 := fr1.push(t, "repo1:1.0.0", img)
		image2 := fr1.push(t, "repo2:2.0.0", img)
		image3 := fr2.push(t, "repo3:3.0.0", img)
		ft.write(t, "needed", layerHexes(t, img)[0])
		s := newScanner(t, false)
		_, err = s.ScanImage(image1)
		require.NoError(t, err)
		fr1.reset()

		for _, tc := range []struct {
			image string
			fr    *fakeRegistry
			repo  string
		}{
			{image2, fr1, fr1.host + "/repo2"},
			{image3, fr2, fr2.host + "/repo3"},
		} {
			data, err := s.ScanImage(tc.image)
			require.NoError(t, err)

			report := parseReport(t, data)
			assert.Equal(t, tc.image, report.ArtifactName)
			assert.Equal(t, tc.image+" (alpine 3.20.0)", report.Results[0].Target)
			assert.Equal(t, []string{tc.repo + "@" + digest.String()}, report.Metadata.RepoDigests)
			assert.Equal(t, 1, tc.fr.count("/manifests/"))
			assert.Zero(t, tc.fr.count("/blobs/"))
		}
		assert.Equal(t, 2, ft.runs(t))
		assert.Zero(t, fr1.count("HEAD"))
	})

	t.Run("concurrent requests wait for the scan in progress", func(t *testing.T) {
		ft := setupTrivy(t)
		fr := newFakeRegistry(t)
		img := newImage(t, 1)
		images := []string{fr.push(t, "repo:1.0.0", img), fr.push(t, "repo:2.0.0", img)}
		ft.write(t, "before", "sleep 0.3\n")
		s := newScanner(t, false)

		var wg sync.WaitGroup
		results := make([][]byte, 8)
		errs := make([]error, len(results))
		for i := range results {
			wg.Add(1)
			go func() {
				defer wg.Done()
				results[i], errs[i] = s.ScanImage(images[i%len(images)])
			}()
		}
		wg.Wait()

		for i := range results {
			require.NoError(t, errs[i])
			assert.Equal(t, images[i%len(images)], parseReport(t, results[i]).ArtifactName)
		}
		assert.Equal(t, 1, ft.runs(t))
		assert.Equal(t, len(images), fr.count("/manifests/"))
		assert.Equal(t, 1, fr.count("/blobs/"))
	})

	t.Run("failures are remembered", func(t *testing.T) {
		manifestUnknown := `{"errors":[{"code":"MANIFEST_UNKNOWN","message":"not found"}]}`
		testCases := []struct {
			name         string
			setup        func(t *testing.T, ft *fakeTrivy, fr *fakeRegistry)
			expectedErr  error
			expectedRuns int
		}{
			{
				"image not found",
				func(_ *testing.T, _ *fakeTrivy, fr *fakeRegistry) {
					fr.setIntercept(func(w http.ResponseWriter, r *http.Request) bool {
						if !strings.Contains(r.URL.Path, "/manifests/") {
							return false
						}
						w.WriteHeader(http.StatusNotFound)
						_, _ = w.Write([]byte(manifestUnknown))
						return true
					})
				},
				ErrImageNotFound,
				0,
			},
			{
				"schema v1",
				func(_ *testing.T, _ *fakeTrivy, fr *fakeRegistry) {
					fr.setIntercept(func(w http.ResponseWriter, r *http.Request) bool {
						if !strings.Contains(r.URL.Path, "/manifests/") {
							return false
						}
						w.Header().Set("Content-Type", string(ggcrtypes.DockerManifestSchema1Signed))
						_, _ = w.Write([]byte(`{"schemaVersion":1}`))
						return true
					})
				},
				ErrSchemaV1NotSupported,
				0,
			},
			{
				"trivy failure",
				func(t *testing.T, ft *fakeTrivy, _ *fakeRegistry) {
					ft.write(t, "before", "echo failed >&2; exit 1\n")
				},
				nil,
				2,
			},
		}
		for _, tc := range testCases {
			t.Run(tc.name, func(t *testing.T) {
				ft := setupTrivy(t)
				fr := newFakeRegistry(t)
				image := fr.push(t, "repo:1.0.0", newImage(t, 1))
				tc.setup(t, ft, fr)
				s := newScanner(t, false)
				_, firstErr := s.ScanImage(image)
				require.Error(t, firstErr)
				if tc.expectedErr != nil {
					require.ErrorIs(t, firstErr, tc.expectedErr)
				}
				fr.reset()

				_, err := s.ScanImage(image)

				require.Equal(t, firstErr, err)
				assert.Zero(t, fr.count("/"))
				assert.Equal(t, tc.expectedRuns, ft.runs(t))
			})
		}
	})

	t.Run("trivy failures apply to references sharing the digest", func(t *testing.T) {
		ft := setupTrivy(t)
		fr := newFakeRegistry(t)
		img := newImage(t, 1)
		image1 := fr.push(t, "repo:1.0.0", img)
		image2 := fr.push(t, "repo:2.0.0", img)
		ft.write(t, "before", "echo failed >&2; exit 1\n")
		s := newScanner(t, false)
		_, err := s.ScanImage(image1)
		require.Error(t, err)
		fr.reset()

		_, err = s.ScanImage(image2)

		require.EqualError(t, err, "error running trivy on image "+image2+": failed\n")
		assert.Equal(t, 2, ft.runs(t))
		assert.Zero(t, fr.count("/blobs/"))
	})

	t.Run("pull failures do not apply to references sharing the digest", func(t *testing.T) {
		ft := setupTrivy(t)
		fr := newFakeRegistry(t)
		img := newImage(t, 1)
		broken := fr.push(t, "broken:1.0.0", img)
		image := fr.push(t, "repo:1.0.0", img)
		fr.setIntercept(func(w http.ResponseWriter, r *http.Request) bool {
			if strings.HasPrefix(r.URL.Path, "/v2/broken/blobs/") {
				w.WriteHeader(http.StatusForbidden)
				return true
			}
			return false
		})
		s := newScanner(t, false)
		_, err := s.ScanImage(broken)
		require.Error(t, err)

		_, err = s.ScanImage(image)

		require.NoError(t, err)
		assert.Equal(t, 1, ft.runs(t))
	})

	t.Run("requests waiting for a failed pull try with their reference", func(t *testing.T) {
		ft := setupTrivy(t)
		fr := newFakeRegistry(t)
		img := newImage(t, 1)
		broken := fr.push(t, "broken:1.0.0", img)
		image := fr.push(t, "repo:1.0.0", img)
		blocked := make(chan struct{})
		release := make(chan struct{})
		fr.setIntercept(func(w http.ResponseWriter, r *http.Request) bool {
			if strings.HasPrefix(r.URL.Path, "/v2/broken/blobs/") {
				close(blocked)
				<-release
				w.WriteHeader(http.StatusForbidden)
				return true
			}
			return false
		})
		s := newScanner(t, false)
		brokenErr := make(chan error, 1)
		go func() {
			_, err := s.ScanImage(broken)
			brokenErr <- err
		}()
		<-blocked
		go func() {
			for fr.count("/v2/repo/manifests/") == 0 {
				time.Sleep(time.Millisecond)
			}
			time.Sleep(20 * time.Millisecond)
			close(release)
		}()

		_, err := s.ScanImage(image)

		require.NoError(t, err)
		require.Error(t, <-brokenErr)
		assert.Equal(t, 1, ft.runs(t))
	})

	t.Run("context cancellation is not remembered", func(t *testing.T) {
		ft := setupTrivy(t)
		fr := newFakeRegistry(t)
		image := fr.push(t, "repo:1.0.0", newImage(t, 1))
		ft.write(t, "before", "exec sleep 10\n")
		s := newScanner(t, false)
		ctx, cancel := context.WithCancel(context.Background())
		s.ctx = ctx
		time.AfterFunc(100*time.Millisecond, cancel)

		_, err := s.ScanImage(image)
		require.Error(t, err)

		ft.write(t, "before", "")
		s.ctx = context.Background()
		data, err := s.ScanImage(image)
		require.NoError(t, err)
		assert.Equal(t, image, parseReport(t, data).ArtifactName)
		assert.Equal(t, 2, ft.runs(t))
	})

	t.Run("requests waiting are released when the context is canceled", func(t *testing.T) {
		ft := setupTrivy(t)
		fr := newFakeRegistry(t)
		image := fr.push(t, "repo:1.0.0", newImage(t, 1))
		ft.write(t, "before", "exec sleep 10\n")
		s := newScanner(t, false)
		ctx, cancel := context.WithCancel(context.Background())
		s.ctx = ctx
		errs := make(chan error, 2)
		for range 2 {
			go func() {
				_, err := s.ScanImage(image)
				errs <- err
			}()
		}
		time.Sleep(100 * time.Millisecond)
		cancel()

		for range 2 {
			require.Error(t, <-errs)
		}
	})
}

func TestTrivyScannerHostileRegistries(t *testing.T) {
	// serve returns an intercept function that replaces a manifest
	serve := func(path, contentType, contentDigest string, body []byte) func(w http.ResponseWriter, r *http.Request) bool {
		return func(w http.ResponseWriter, r *http.Request) bool {
			if !strings.Contains(r.URL.Path, path) {
				return false
			}
			w.Header().Set("Content-Type", contentType)
			if contentDigest != "" {
				w.Header().Set("Docker-Content-Digest", contentDigest)
			}
			_, _ = w.Write(body)
			return true
		}
	}
	signed := string(ggcrtypes.DockerManifestSchema1Signed)
	hugeLayer := fmt.Sprintf(`{
		"schemaVersion": 2,
		"config": {"mediaType": %[1]q, "size": 2, "digest": "sha256:%[3]s"},
		"layers": [{"mediaType": %[2]q, "size": 9000000000000, "digest": "sha256:%[4]s"}]
	}`, ggcrtypes.OCIConfigJSON, ggcrtypes.OCILayer, strings.Repeat("a", 64), strings.Repeat("b", 64))
	forged := newImage(t, 1)
	forgedManifest, err := forged.RawManifest()
	require.NoError(t, err)

	// All cases target an index, as it has a child that can be forged
	index, err := random.Index(64, 1, 1)
	require.NoError(t, err)
	rawIndex, err := index.RawManifest()
	require.NoError(t, err)
	indexDigest, err := index.Digest()
	require.NoError(t, err)
	indexManifest, err := index.IndexManifest()
	require.NoError(t, err)
	child := indexManifest.Manifests[0].Digest
	childImage, err := index.Image(child)
	require.NoError(t, err)
	config, err := childImage.ConfigName()
	require.NoError(t, err)

	testCases := []struct {
		name      string
		intercept func(w http.ResponseWriter, r *http.Request) bool
	}{
		{
			"child replaced by another image",
			serve("/manifests/"+child.String(), signed, child.String(), forgedManifest),
		},
		{
			"child replaced by an image too large",
			serve("/manifests/"+child.String(), signed, child.String(), []byte(hugeLayer)),
		},
		{
			"schema v1 manifest claiming the digest",
			serve("/manifests/", signed, indexDigest.String(), []byte("{}")),
		},
		{
			"same manifest using a schema v1 content type",
			serve("/manifests/", string(ggcrtypes.DockerManifestSchema1), "", rawIndex),
		},
	}
	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			ft := setupTrivy(t)
			ft.write(t, "before", `printf '{"Metadata":{"ImageID":"%s"}}' "$(ls image/blobs/sha256 | tr '\n' ',')" > "$dir/report"`+"\n")
			victim, hostile := newFakeRegistry(t), newFakeRegistry(t)
			victimImage := victim.pushIndex(t, "victim:1.0.0", index)
			hostileImage := hostile.pushIndex(t, "hostile:1.0.0", index)
			hostile.push(t, "hostile:forged", forged)
			hostile.setIntercept(tc.intercept)
			s := newScanner(t, true)

			_, err := s.ScanImage(hostileImage)
			require.Error(t, err)
			assert.Zero(t, ft.runs(t))

			data, err := s.ScanImage(victimImage)
			require.NoError(t, err)
			assert.Contains(t, parseReport(t, data).Metadata.ImageID, config.Hex)
			assert.Equal(t, 1, ft.runs(t))
			assert.Equal(t, 1, victim.count("/blobs/"))
		})
	}
}

func TestTrivyScannerReportStore(t *testing.T) {
	t.Run("reports that do not fit are not added", func(t *testing.T) {
		ft := setupTrivy(t)
		fr := newFakeRegistry(t)
		image1 := fr.push(t, "repo:1.0.0", newImage(t, 1))
		image2 := fr.push(t, "repo:2.0.0", newImage(t, 1))
		s := newScanner(t, false)
		s.reports = newReportStore(int64(len(testReport)) + 1) // Only one report fits

		for range 2 {
			_, err := s.ScanImage(image1)
			require.NoError(t, err)
		}
		assert.Equal(t, 1, ft.runs(t))

		for range 2 {
			data, err := s.ScanImage(image2)
			require.NoError(t, err)
			assert.Equal(t, image2, parseReport(t, data).ArtifactName)
		}
		assert.Equal(t, 3, ft.runs(t))
		assert.Equal(t, 3, fr.count("/manifests/"))
	})

	t.Run("requests waiting get reports that do not fit", func(t *testing.T) {
		ft := setupTrivy(t)
		fr := newFakeRegistry(t)
		image := fr.push(t, "repo:1.0.0", newImage(t, 1))
		ft.write(t, "before", "sleep 0.3\n")
		s := newScanner(t, false)
		s.reports = newReportStore(1)

		var wg sync.WaitGroup
		var ok atomic.Int32
		for range 4 {
			wg.Add(1)
			go func() {
				defer wg.Done()
				if _, err := s.ScanImage(image); err == nil {
					ok.Add(1)
				}
			}()
		}
		wg.Wait()

		assert.EqualValues(t, 4, ok.Load())
		assert.Equal(t, 1, ft.runs(t))
	})

	t.Run("reports are removed when closing the scanner", func(t *testing.T) {
		setupTrivy(t)
		fr := newFakeRegistry(t)
		image := fr.push(t, "repo:1.0.0", newImage(t, 1))
		tmpDir := t.TempDir()
		t.Setenv("TMPDIR", tmpDir)
		s := newScanner(t, false)

		_, err := s.ScanImage(image)
		require.NoError(t, err)
		entries, err := os.ReadDir(tmpDir)
		require.NoError(t, err)
		require.Len(t, entries, 1)
		assert.Contains(t, entries[0].Name(), "artifact-hub-reports")

		require.NoError(t, s.Close())
		entries, err = os.ReadDir(tmpDir)
		require.NoError(t, err)
		assert.Empty(t, entries)
	})
}

func TestTrivyScannerRateLimit(t *testing.T) {
	tooManyRequests := func(w http.ResponseWriter) {
		w.WriteHeader(http.StatusTooManyRequests)
		_, _ = w.Write([]byte(`{"errors":[{"code":"UNAUTHORIZED","message":"slow down"}]}`))
	}

	t.Run("registry is not called again and others are not affected", func(t *testing.T) {
		ft := setupTrivy(t)
		fr1, fr2 := newFakeRegistry(t), newFakeRegistry(t)
		img := newImage(t, 1)
		image1 := fr1.push(t, "repo:1.0.0", img)
		image2 := fr1.push(t, "repo:2.0.0", newImage(t, 1))
		image3 := fr2.push(t, "repo:1.0.0", img)
		fr1.setIntercept(func(w http.ResponseWriter, r *http.Request) bool {
			if strings.Contains(r.URL.Path, "/manifests/") {
				tooManyRequests(w)
				return true
			}
			return false
		})
		s := newScanner(t, false)

		_, err := s.ScanImage(image1)
		require.ErrorIs(t, err, ErrRateLimited)
		fr1.reset()
		_, err = s.ScanImage(image1)
		require.ErrorIs(t, err, ErrRateLimited)
		_, err = s.ScanImage(image2)
		require.ErrorIs(t, err, ErrRateLimited)
		assert.Zero(t, fr1.count("/"))

		_, err = s.ScanImage(image3)
		require.NoError(t, err)
		assert.Equal(t, 1, ft.runs(t))
	})

	t.Run("layers rate limited are not remembered by digest", func(t *testing.T) {
		ft := setupTrivy(t)
		fr1, fr2 := newFakeRegistry(t), newFakeRegistry(t)
		img := newImage(t, 1)
		image1 := fr1.push(t, "repo:1.0.0", img)
		image2 := fr2.push(t, "repo:1.0.0", img)
		layer := layerHexes(t, img)[0]
		ft.write(t, "needed", layer)
		fr1.setIntercept(func(w http.ResponseWriter, r *http.Request) bool {
			if strings.HasSuffix(r.URL.Path, layer) {
				tooManyRequests(w)
				return true
			}
			return false
		})
		s := newScanner(t, false)

		_, err := s.ScanImage(image1)
		require.ErrorIs(t, err, ErrRateLimited)
		_, err = s.ScanImage(image2)
		require.NoError(t, err)
		assert.Equal(t, 3, ft.runs(t))
	})

	t.Run("rate limited layers stop the pull and the registry right away", func(t *testing.T) {
		ft := setupTrivy(t)
		fr := newFakeRegistry(t)
		img := newImage(t, 2)
		images := []string{fr.push(t, "repo:1.0.0", img), fr.push(t, "repo:2.0.0", img)}
		layers := layerHexes(t, img)
		ft.write(t, "needed", layers[0])
		fr.setIntercept(func(w http.ResponseWriter, r *http.Request) bool {
			switch {
			case strings.HasSuffix(r.URL.Path, layers[0]):
				tooManyRequests(w)
				return true
			case strings.HasSuffix(r.URL.Path, layers[1]):
				<-r.Context().Done()
				return true
			}
			return false
		})
		s := newScanner(t, false)
		s.pullTimeout = 30 * time.Second
		startedAt := time.Now()

		errs := make(chan error, len(images))
		for _, image := range images {
			go func() {
				_, err := s.ScanImage(image)
				errs <- err
			}()
		}
		for range images {
			require.ErrorIs(t, <-errs, ErrRateLimited)
		}

		assert.Less(t, time.Since(startedAt), 20*time.Second)
		assert.Equal(t, 1, ft.runs(t))
		assert.Equal(t, 3, fr.count(layers[0]))
		assert.Equal(t, 1, fr.count(layers[1]))
	})

	t.Run("rate limits are detected when they are not the error received", func(t *testing.T) {
		foreignImage := func(t *testing.T, url string) v1.Image {
			t.Helper()
			layer, err := random.Layer(64, ggcrtypes.OCILayer)
			require.NoError(t, err)
			img, err := mutate.Append(empty.Image, mutate.Addendum{Layer: layer, URLs: []string{url}})
			require.NoError(t, err)
			return img
		}
		testCases := []struct {
			name      string
			img       v1.Image
			intercept func(t *testing.T, img v1.Image) func(w http.ResponseWriter, r *http.Request) bool
		}{
			{
				"failure in another layer first",
				newImage(t, 2),
				func(t *testing.T, img v1.Image) func(w http.ResponseWriter, r *http.Request) bool {
					layers := layerHexes(t, img)
					return func(w http.ResponseWriter, r *http.Request) bool {
						switch {
						case strings.HasSuffix(r.URL.Path, layers[0]):
							w.WriteHeader(http.StatusServiceUnavailable)
							return true
						case strings.HasSuffix(r.URL.Path, layers[1]):
							time.Sleep(200 * time.Millisecond)
							tooManyRequests(w)
							return true
						}
						return false
					}
				},
			},
			{
				"foreign layer with a scheme not allowed",
				foreignImage(t, "ftp://foreign.example.com/layer"),
				func(t *testing.T, img v1.Image) func(w http.ResponseWriter, r *http.Request) bool {
					layer := layerHexes(t, img)[0]
					return func(w http.ResponseWriter, r *http.Request) bool {
						if strings.HasSuffix(r.URL.Path, layer) {
							tooManyRequests(w)
							return true
						}
						return false
					}
				},
			},
		}
		for _, tc := range testCases {
			t.Run(tc.name, func(t *testing.T) {
				ft := setupTrivy(t)
				fr := newFakeRegistry(t)
				image := fr.push(t, "repo:1.0.0", tc.img)
				ft.write(t, "needed", layerHexes(t, tc.img)[0])
				fr.setIntercept(tc.intercept(t, tc.img))
				s := newScanner(t, false)

				_, err := s.ScanImage(image)

				require.ErrorIs(t, err, ErrRateLimited)
				ref, err := name.ParseReference(image)
				require.NoError(t, err)
				assert.True(t, s.registryIsRateLimited(ref))
			})
		}
	})

	t.Run("rate limits absorbed by the retries do not stop the registry", func(t *testing.T) {
		ft := setupTrivy(t)
		fr := newFakeRegistry(t)
		img := newImage(t, 1)
		image := fr.push(t, "repo:1.0.0", img)
		layer := layerHexes(t, img)[0]
		ft.write(t, "needed", layer)
		var limited atomic.Bool
		fr.setIntercept(func(w http.ResponseWriter, r *http.Request) bool {
			if strings.HasSuffix(r.URL.Path, layer) && limited.CompareAndSwap(false, true) {
				tooManyRequests(w)
				return true
			}
			return false
		})
		s := newScanner(t, false)

		_, err := s.ScanImage(image)

		require.NoError(t, err)
		ref, err := name.ParseReference(image)
		require.NoError(t, err)
		assert.False(t, s.registryIsRateLimited(ref))
	})

	t.Run("reports available are reused", func(t *testing.T) {
		setupTrivy(t)
		fr := newFakeRegistry(t)
		image := fr.push(t, "repo:1.0.0", newImage(t, 1))
		s := newScanner(t, false)
		_, err := s.ScanImage(image)
		require.NoError(t, err)
		ref, err := name.ParseReference(image)
		require.NoError(t, err)
		s.setRateLimited(ref)

		_, err = s.ScanImage(image)

		require.NoError(t, err)
	})
}

func TestTrivyScannerErrors(t *testing.T) {
	respond := func(status int, contentType, body string) func(w http.ResponseWriter, r *http.Request) bool {
		return func(w http.ResponseWriter, r *http.Request) bool {
			if !strings.Contains(r.URL.Path, "/manifests/") {
				return false
			}
			w.Header().Set("Content-Type", contentType)
			w.WriteHeader(status)
			_, _ = w.Write([]byte(body))
			return true
		}
	}

	t.Run("known errors are translated", func(t *testing.T) {
		testCases := []struct {
			name        string
			intercept   func(w http.ResponseWriter, r *http.Request) bool
			expectedErr error
		}{
			{
				"manifest unknown",
				respond(http.StatusNotFound, "application/json", `{"errors":[{"code":"MANIFEST_UNKNOWN","message":"x"}]}`),
				ErrImageNotFound,
			},
			{
				"unauthorized",
				respond(http.StatusUnauthorized, "application/json", `{"errors":[{"code":"UNAUTHORIZED","message":"x"}]}`),
				ErrImageNotFound,
			},
			{
				"schema v1",
				respond(http.StatusOK, "application/vnd.docker.distribution.manifest.v1+prettyjws", `{"schemaVersion":1}`),
				ErrSchemaV1NotSupported,
			},
		}
		for _, tc := range testCases {
			for _, restricted := range []bool{false, true} {
				t.Run(fmt.Sprintf("%s restricted=%t", tc.name, restricted), func(t *testing.T) {
					ft := setupTrivy(t)
					fr := newFakeRegistry(t)
					fr.setIntercept(tc.intercept)

					_, err := newScanner(t, restricted).ScanImage(fr.host + "/repo:1.0.0")

					require.ErrorIs(t, err, tc.expectedErr)
					assert.Zero(t, ft.runs(t))
				})
			}
		}
	})

	t.Run("details are only included when not restricted", func(t *testing.T) {
		testCases := []struct {
			name          string
			setup         func(t *testing.T, ft *fakeTrivy, fr *fakeRegistry, img v1.Image)
			expectedError string
		}{
			{
				"registry error",
				func(_ *testing.T, _ *fakeTrivy, fr *fakeRegistry, _ v1.Image) {
					fr.setIntercept(respond(http.StatusForbidden, "text/plain", testStderr))
				},
				"error pulling image",
			},
			{
				"layer error",
				func(t *testing.T, ft *fakeTrivy, fr *fakeRegistry, img v1.Image) {
					layer := layerHexes(t, img)[0]
					ft.write(t, "needed", layer)
					fr.setIntercept(func(w http.ResponseWriter, r *http.Request) bool {
						if !strings.HasSuffix(r.URL.Path, layer) {
							return false
						}
						w.Header().Set("Content-Type", "text/plain")
						w.WriteHeader(http.StatusForbidden)
						_, _ = w.Write([]byte(testStderr))
						return true
					})
				},
				"error pulling image",
			},
			{
				"trivy error",
				func(t *testing.T, ft *fakeTrivy, _ *fakeRegistry, _ v1.Image) {
					ft.write(t, "before", "echo '"+testStderr+"' >&2; exit 1\n")
				},
				"error running trivy on image",
			},
		}
		for _, tc := range testCases {
			t.Run(tc.name, func(t *testing.T) {
				logs := captureLogs(t)
				ft := setupTrivy(t)
				fr := newFakeRegistry(t)
				img := newImage(t, 1)
				image := fr.push(t, "repo:1.0.0", img)
				tc.setup(t, ft, fr, img)

				_, err := newScanner(t, false).ScanImage(image)
				require.ErrorContains(t, err, tc.expectedError+" "+image+": ")
				require.ErrorContains(t, err, testStderr)
				assert.Empty(t, errorLogs(t, logs))

				_, err = newScanner(t, true).ScanImage(image)
				require.EqualError(t, err, tc.expectedError+" "+image)
				assert.Equal(t, []string{"image scan failed"}, errorLogs(t, logs))
			})
		}
	})

	t.Run("images too large are rejected before requesting blobs", func(t *testing.T) {
		for _, restricted := range []bool{false, true} {
			t.Run(fmt.Sprintf("restricted=%t", restricted), func(t *testing.T) {
				logs := captureLogs(t)
				ft := setupTrivy(t)
				fr := newFakeRegistry(t)
				image := fr.push(t, "repo:1.0.0", newImage(t, 1))
				s := newScanner(t, restricted)
				s.maxImageSize = 1

				_, err := s.ScanImage(image)

				require.ErrorIs(t, err, oci.ErrImageTooLarge)
				if restricted {
					require.EqualError(t, err, oci.ErrImageTooLarge.Error())
				}
				assert.Empty(t, errorLogs(t, logs))
				assert.Zero(t, ft.runs(t))
				assert.Zero(t, fr.count("/blobs/"))
			})
		}
	})

	t.Run("invalid report", func(t *testing.T) {
		ft := setupTrivy(t)
		fr := newFakeRegistry(t)
		image := fr.push(t, "repo:1.0.0", newImage(t, 1))
		ft.write(t, "report", testStderr)

		_, err := newScanner(t, true).ScanImage(image)

		require.EqualError(t, err, "error running trivy on image "+image)
	})

	t.Run("invalid reference", func(t *testing.T) {
		ft := setupTrivy(t)

		_, err := newScanner(t, false).ScanImage("INVALID REF")

		require.ErrorContains(t, err, "error parsing image")
		assert.Zero(t, ft.runs(t))
	})
}

func TestTrivyScannerRestrictedHosts(t *testing.T) {
	// Not parallel: this test updates the process-wide default transports
	tests.PreserveDefaultTransports(t)
	require.NoError(t, util.SetupDefaultTransports(true))

	ft := setupTrivy(t)
	fr := newFakeRegistry(t)
	image := fr.host + "/repo:1.0.0"

	_, err := newScanner(t, true).ScanImage(image)

	require.EqualError(t, err, "error pulling image "+image)
	assert.Zero(t, fr.count("/"))
	assert.Zero(t, ft.runs(t))
}

func TestTrivyScannerTimeouts(t *testing.T) {
	t.Run("pull fails when the time available runs out", func(t *testing.T) {
		ft := setupTrivy(t)
		fr := newFakeRegistry(t)
		img := newImage(t, 1)
		image := fr.push(t, "repo:1.0.0", img)
		layer := layerHexes(t, img)[0]
		ft.write(t, "needed", layer)
		fr.setIntercept(func(_ http.ResponseWriter, r *http.Request) bool {
			if strings.HasSuffix(r.URL.Path, layer) {
				<-r.Context().Done()
				return true
			}
			return false
		})
		s := newScanner(t, false)
		s.pullTimeout = 500 * time.Millisecond

		_, err := s.ScanImage(image)

		require.ErrorContains(t, err, "error pulling image "+image+": ")
		require.ErrorContains(t, err, "context canceled")
		assert.Equal(t, 1, ft.runs(t))
	})

	t.Run("time running trivy does not count for the pull", func(t *testing.T) {
		ft := setupTrivy(t)
		fr := newFakeRegistry(t)
		img := newImage(t, 1)
		image := fr.push(t, "repo:1.0.0", img)
		ft.write(t, "needed", layerHexes(t, img)[0])
		ft.write(t, "before", "sleep 1\n")
		s := newScanner(t, false)
		s.pullTimeout = 500 * time.Millisecond

		_, err := s.ScanImage(image)

		require.NoError(t, err)
		assert.Equal(t, 2, ft.runs(t))
	})

	t.Run("trivy can report its own timeout", func(t *testing.T) {
		ft := setupTrivy(t)
		fr := newFakeRegistry(t)
		image := fr.push(t, "repo:1.0.0", newImage(t, 1))
		ft.write(t, "before", "sleep 0.5; echo 'context deadline exceeded' >&2; exit 1\n")
		s := newScanner(t, false)
		s.scanTimeout = 100 * time.Millisecond

		_, err := s.ScanImage(image)

		require.EqualError(t, err, "error running trivy on image "+image+": context deadline exceeded\n")
		assert.Contains(t, ft.read(t, "runs"), "--timeout 100ms")
	})

	t.Run("trivy is asked to stop when it does not exit by itself", func(t *testing.T) {
		ft := setupTrivy(t)
		fr := newFakeRegistry(t)
		image := fr.push(t, "repo:1.0.0", newImage(t, 1))
		ft.write(t, "before", "exec sleep 10\n")
		s := newScanner(t, false)
		s.scanTimeout = 100 * time.Millisecond
		s.stopDelay = 100 * time.Millisecond

		_, err := s.ScanImage(image)

		require.EqualError(t, err, "error running trivy on image "+image+": signal: terminated")
	})

	t.Run("trivy is asked to stop when the scanner is shutting down", func(t *testing.T) {
		ft := setupTrivy(t)
		fr := newFakeRegistry(t)
		image := fr.push(t, "repo:1.0.0", newImage(t, 1))
		ft.write(t, "before", `trap 'touch "$dir/terminated"; exit 1' TERM; touch "$dir/started"; sleep 10 & wait`+"\n")
		s := newScanner(t, false)
		ctx, cancel := context.WithCancel(context.Background())
		s.ctx = ctx
		go func() {
			for !ft.exists("started") {
				time.Sleep(time.Millisecond)
			}
			cancel()
		}()

		_, err := s.ScanImage(image)

		require.ErrorIs(t, err, ErrScanCanceled)
		assert.True(t, ft.exists("terminated"))
		assert.Equal(t, 1, ft.runs(t))
	})

	t.Run("trivy is killed when it ignores the request to stop", func(t *testing.T) {
		ft := setupTrivy(t)
		fr := newFakeRegistry(t)
		image := fr.push(t, "repo:1.0.0", newImage(t, 1))
		ft.write(t, "before", "trap '' TERM; exec sleep 10\n")
		s := newScanner(t, false)
		s.scanTimeout = 100 * time.Millisecond
		s.stopDelay = 100 * time.Millisecond

		_, err := s.ScanImage(image)

		require.EqualError(t, err, "error running trivy on image "+image+": signal: killed")
	})

	t.Run("temporary files of a trivy killed are removed", func(t *testing.T) {
		ft := setupTrivy(t)
		fr := newFakeRegistry(t)
		image := fr.push(t, "repo:1.0.0", newImage(t, 1))
		ft.write(t, "before", `mkdir "$TMPDIR/trivy-1" && touch "$TMPDIR/trivy-1/cached-file"; trap '' TERM; exec sleep 10`+"\n")
		tmpDir := t.TempDir()
		t.Setenv("TMPDIR", tmpDir)
		s := newScanner(t, false)
		s.scanTimeout = 100 * time.Millisecond
		s.stopDelay = 100 * time.Millisecond

		_, err := s.ScanImage(image)

		require.ErrorContains(t, err, "signal: killed")
		entries, err := os.ReadDir(tmpDir)
		require.NoError(t, err)
		assert.Empty(t, entries)
	})
}

func TestTrivyScannerDiskLimit(t *testing.T) {
	// diskLimit is above the space used by a layout with no layers, and below the
	// size of the files written in these tests
	const diskLimit = 512 << 10

	// fillDisk makes Trivy use the disk and wait until it is killed
	fillDisk := `head -c 1048576 /dev/zero > "$TMPDIR/app.jar"; exec sleep 10` + "\n"

	testCases := []struct {
		name       string
		restricted bool
	}{
		{"not restricted", false},
		{"restricted", true},
	}
	for _, tc := range testCases {
		t.Run("trivy is killed when the limit is exceeded: "+tc.name, func(t *testing.T) {
			logs := captureLogs(t)
			ft := setupTrivy(t)
			fr := newFakeRegistry(t)
			img := newImage(t, 1)
			image1 := fr.push(t, "repo1:1.0.0", img)
			image2 := fr.push(t, "repo2:1.0.0", img)
			ft.write(t, "before", fillDisk)
			tmpDir := t.TempDir()
			t.Setenv("TMPDIR", tmpDir)
			s := newScanner(t, tc.restricted)
			s.maxDiskUsage = diskLimit
			s.diskCheckInterval = 10 * time.Millisecond

			startedAt := time.Now()
			_, err := s.ScanImage(image1)

			require.ErrorIs(t, err, oci.ErrImageTooLarge)
			if tc.restricted {
				require.EqualError(t, err, oci.ErrImageTooLarge.Error())
			}
			assert.Empty(t, errorLogs(t, logs))
			assert.Less(t, time.Since(startedAt), 5*time.Second)
			assert.Equal(t, 1, ft.runs(t))
			entries, err := os.ReadDir(tmpDir)
			require.NoError(t, err)
			assert.Empty(t, entries)

			// The failure applies to other references sharing the digest
			_, err = s.ScanImage(image2)

			require.ErrorIs(t, err, oci.ErrImageTooLarge)
			assert.Equal(t, 1, ft.runs(t))
		})
	}

	t.Run("layers pulled count against the limit", func(t *testing.T) {
		ft := setupTrivy(t)
		fr := newFakeRegistry(t)
		img, err := random.Image(1<<20, 1)
		require.NoError(t, err)
		image := fr.push(t, "repo:1.0.0", img)
		ft.write(t, "needed", layerHexes(t, img)[0])
		ft.write(t, "before", `if [ -n "$(ls image/blobs/sha256 | sed -n 3p)" ]; then exec sleep 10; fi`+"\n")
		s := newScanner(t, false)
		s.diskCheckInterval = 10 * time.Millisecond
		s.maxDiskUsage = diskLimit

		_, err = s.ScanImage(image)

		require.ErrorIs(t, err, oci.ErrImageTooLarge)
		assert.Equal(t, 2, ft.runs(t))
	})

	t.Run("tiny files count for the space they use and not for their size", func(t *testing.T) {
		ft := setupTrivy(t)
		fr := newFakeRegistry(t)
		image := fr.push(t, "repo:1.0.0", newImage(t, 1))
		ft.write(t, "before", `for i in $(seq 1 1000); do echo > "$TMPDIR/$i"; done; exec sleep 10`+"\n")
		s := newScanner(t, false)
		s.maxDiskUsage = diskLimit
		s.diskCheckInterval = 10 * time.Millisecond

		_, err := s.ScanImage(image)

		require.ErrorIs(t, err, oci.ErrImageTooLarge)
		assert.Equal(t, 1, ft.runs(t))
	})

	t.Run("files using no disk space count against the entries limit", func(t *testing.T) {
		ft := setupTrivy(t)
		fr := newFakeRegistry(t)
		image := fr.push(t, "repo:1.0.0", newImage(t, 1))
		ft.write(t, "before", `cd "$TMPDIR" && seq 1 1000 | xargs touch; exec sleep 10`+"\n")
		s := newScanner(t, false)
		s.maxEntries = 500
		s.diskCheckInterval = 10 * time.Millisecond

		_, err := s.ScanImage(image)

		require.ErrorIs(t, err, oci.ErrImageTooLarge)
		assert.Equal(t, 1, ft.runs(t))
	})

	t.Run("scans within the limit are not affected", func(t *testing.T) {
		ft := setupTrivy(t)
		fr := newFakeRegistry(t)
		image := fr.push(t, "repo:1.0.0", newImage(t, 1))
		ft.write(t, "before", `head -c 2048 /dev/zero > "$TMPDIR/app.jar"; sleep 0.2`+"\n")
		s := newScanner(t, false)
		s.diskCheckInterval = 10 * time.Millisecond

		_, err := s.ScanImage(image)

		require.NoError(t, err)
		assert.Equal(t, 1, ft.runs(t))
	})
}

func TestDiskUsage(t *testing.T) {
	t.Parallel()

	dir := t.TempDir()
	require.NoError(t, os.Mkdir(filepath.Join(dir, "subdir"), 0o700))
	require.NoError(t, os.WriteFile(filepath.Join(dir, "subdir", "tiny"), []byte("x"), 0o600))
	require.NoError(t, os.WriteFile(filepath.Join(dir, "large"), make([]byte, 1<<20), 0o600))
	require.NoError(t, os.WriteFile(filepath.Join(dir, "empty"), nil, 0o600))

	usage, entries := diskUsage(dir)

	assert.GreaterOrEqual(t, usage, int64(1<<20))
	assert.EqualValues(t, 5, entries)
}

func TestTrivyScannerRetry(t *testing.T) {
	// failFirst makes Trivy fail the first time it runs
	failFirst := `if [ "$(wc -l < "$dir/runs")" -eq 1 ]; then echo 'unexpected EOF' >&2; exit 1; fi` + "\n"

	t.Run("transient failure", func(t *testing.T) {
		ft := setupTrivy(t)
		fr := newFakeRegistry(t)
		image := fr.push(t, "repo:1.0.0", newImage(t, 1))
		ft.write(t, "before", failFirst)
		s := newScanner(t, false)

		_, err := s.ScanImage(image)

		require.NoError(t, err)
		assert.Equal(t, 2, ft.runs(t))
		assert.Equal(t, 1, fr.count("/manifests/"))
	})

	t.Run("transient failure before layers are requested", func(t *testing.T) {
		ft := setupTrivy(t)
		fr := newFakeRegistry(t)
		img := newImage(t, 1)
		image := fr.push(t, "repo:1.0.0", img)
		ft.write(t, "needed", layerHexes(t, img)[0])
		ft.write(t, "before", failFirst)
		s := newScanner(t, false)

		_, err := s.ScanImage(image)

		require.NoError(t, err)
		assert.Equal(t, 3, ft.runs(t))
	})

	t.Run("transient failure after pulling the layers", func(t *testing.T) {
		ft := setupTrivy(t)
		fr := newFakeRegistry(t)
		img := newImage(t, 1)
		image := fr.push(t, "repo:1.0.0", img)
		ft.write(t, "needed", layerHexes(t, img)[0])
		ft.write(t, "before", `if [ "$(wc -l < "$dir/runs")" -eq 2 ]; then echo 'unexpected EOF' >&2; exit 1; fi`+"\n")
		s := newScanner(t, false)

		_, err := s.ScanImage(image)

		require.NoError(t, err)
		assert.Equal(t, 3, ft.runs(t))
	})

	t.Run("failure is reported after trying again once", func(t *testing.T) {
		ft := setupTrivy(t)
		fr := newFakeRegistry(t)
		image := fr.push(t, "repo:1.0.0", newImage(t, 1))
		ft.write(t, "before", "echo failed >&2; exit 1\n")
		s := newScanner(t, false)

		_, err := s.ScanImage(image)

		require.ErrorContains(t, err, "failed")
		assert.Equal(t, 2, ft.runs(t))
	})

	t.Run("files left by a crashed trivy are removed before trying again", func(t *testing.T) {
		ft := setupTrivy(t)
		fr := newFakeRegistry(t)
		image := fr.push(t, "repo:1.0.0", newImage(t, 1))
		ft.write(t, "before", `if [ -n "$(ls -A "$TMPDIR")" ]; then echo 'files left' >&2; exit 1; fi
mkdir "$TMPDIR/trivy-1" && touch "$TMPDIR/trivy-1/cached-file"
if [ "$(wc -l < "$dir/runs")" -eq 1 ]; then kill -9 $$; fi
`)
		s := newScanner(t, false)

		_, err := s.ScanImage(image)

		require.NoError(t, err)
		assert.Equal(t, 2, ft.runs(t))
	})

	t.Run("waits before trying again", func(t *testing.T) {
		ft := setupTrivy(t)
		fr := newFakeRegistry(t)
		image := fr.push(t, "repo:1.0.0", newImage(t, 1))
		ft.write(t, "before", failFirst)
		s := newScanner(t, false)
		s.retryDelay = 200 * time.Millisecond

		startedAt := time.Now()
		_, err := s.ScanImage(image)

		require.NoError(t, err)
		assert.Equal(t, 2, ft.runs(t))
		assert.GreaterOrEqual(t, time.Since(startedAt), s.retryDelay)
	})

	t.Run("timeouts are not retried", func(t *testing.T) {
		ft := setupTrivy(t)
		fr := newFakeRegistry(t)
		image := fr.push(t, "repo:1.0.0", newImage(t, 1))
		ft.write(t, "before", "sleep 0.2; echo 'context deadline exceeded' >&2; exit 1\n")
		s := newScanner(t, false)
		s.scanTimeout = 100 * time.Millisecond

		_, err := s.ScanImage(image)

		require.Error(t, err)
		assert.Equal(t, 1, ft.runs(t))
	})
}

func TestTrivyScannerShutdown(t *testing.T) {
	t.Run("interrupted pull", func(t *testing.T) {
		ft := setupTrivy(t)
		fr := newFakeRegistry(t)
		img := newImage(t, 1)
		image := fr.push(t, "repo:1.0.0", img)
		layer := layerHexes(t, img)[0]
		ft.write(t, "needed", layer)
		s := newScanner(t, false)
		ctx, cancel := context.WithCancel(context.Background())
		defer cancel()
		s.ctx = ctx
		fr.setIntercept(func(_ http.ResponseWriter, r *http.Request) bool {
			if strings.HasSuffix(r.URL.Path, layer) {
				cancel()
				<-r.Context().Done()
				return true
			}
			return false
		})

		_, err := s.ScanImage(image)

		require.ErrorIs(t, err, ErrScanCanceled)
	})

	t.Run("waiting to run trivy again", func(t *testing.T) {
		ft := setupTrivy(t)
		fr := newFakeRegistry(t)
		image := fr.push(t, "repo:1.0.0", newImage(t, 1))
		ft.write(t, "before", `touch "$dir/started"; echo failed >&2; exit 1`+"\n")
		s := newScanner(t, false)
		ctx, cancel := context.WithCancel(context.Background())
		defer cancel()
		s.ctx = ctx
		s.retryDelay = time.Hour

		result := make(chan error, 1)
		go func() {
			_, err := s.ScanImage(image)
			result <- err
		}()
		for !ft.exists("started") {
			time.Sleep(time.Millisecond)
		}
		time.Sleep(50 * time.Millisecond)
		cancel()

		require.ErrorIs(t, <-result, ErrScanCanceled)
		assert.Equal(t, 1, ft.runs(t))
	})

	t.Run("requests waiting for a scan in progress", func(t *testing.T) {
		ft := setupTrivy(t)
		fr := newFakeRegistry(t)
		image := fr.push(t, "repo:1.0.0", newImage(t, 1))
		ft.write(t, "before", `touch "$dir/started"; sleep 10 & wait`+"\n")
		s := newScanner(t, false)
		ctx, cancel := context.WithCancel(context.Background())
		defer cancel()
		s.ctx = ctx
		s.stopDelay = 100 * time.Millisecond

		first := make(chan error, 1)
		go func() {
			_, err := s.ScanImage(image)
			first <- err
		}()
		for !ft.exists("started") {
			time.Sleep(time.Millisecond)
		}
		second := make(chan error, 1)
		go func() {
			_, err := s.ScanImage(image)
			second <- err
		}()
		time.Sleep(50 * time.Millisecond)
		cancel()

		require.ErrorIs(t, <-first, ErrScanCanceled)
		require.ErrorIs(t, <-second, ErrScanCanceled)
	})
}

func TestTrivyScannerCommand(t *testing.T) {
	ft := setupTrivy(t)
	ft.write(t, "before", `touch "$TMPDIR/file" || exit 1`+"\n")
	fr := newFakeRegistry(t)
	image := fr.push(t, "repo:1.0.0", newImage(t, 1))
	tmpDir, err := filepath.EvalSymlinks(t.TempDir())
	require.NoError(t, err)
	t.Setenv("TMPDIR", tmpDir)
	t.Setenv("TRIVY_CACHE_DIR", "/cache")
	t.Setenv("HTTP_PROXY", "http://proxy.example.com")
	t.Setenv("HTTPS_PROXY", "http://proxy.example.com")
	t.Setenv("NO_PROXY", "example.com")
	t.Setenv("TRIVY_USERNAME", "user")
	t.Setenv("TRIVY_PASSWORD", "pass")
	t.Setenv("OTHER_SECRET", "secret")
	s := newScanner(t, false)
	s.cfg.Set("creds.dockerUsername", "user")
	s.cfg.Set("creds.dockerPassword", "pass")

	data, err := s.ScanImage(image)
	require.NoError(t, err)

	// Only the variables allowed are available
	env := strings.Split(strings.TrimSpace(ft.read(t, "env")), "\n")
	assert.Contains(t, env, "TMPDIR="+strings.TrimSpace(ft.read(t, "cwd"))+"/"+trivyTmpDir)
	assert.Contains(t, env, "TRIVY_CACHE_DIR=/cache")
	assert.Contains(t, env, "TRIVY_NEW_JSON_SCHEMA=true")
	assertTrivyEnv(t, env)

	// Trivy gets a relative path, and never the reference. The Java DB is not
	// downloaded by scans.
	args := ft.read(t, "runs")
	for _, arg := range []string{
		"--server http://trivy.example.com:8081",
		"--skip-version-check",
		"--disable-telemetry",
		"--skip-java-db-update",
		"--input image",
	} {
		assert.Contains(t, args, arg)
	}
	assert.Zero(t, ft.javaDBRuns(t))
	assert.NotContains(t, args, fr.host)
	assert.NotContains(t, args, tmpDir)
	assert.True(t, strings.HasPrefix(ft.read(t, "cwd"), tmpDir))
	assert.NotContains(t, string(data), tmpDir)

	// The temporary directory of the scan is removed
	entries, err := os.ReadDir(tmpDir)
	require.NoError(t, err)
	for _, entry := range entries {
		assert.NotContains(t, entry.Name(), "artifact-hub-scan")
	}
}

func TestTrivyScannerPrepare(t *testing.T) {
	t.Run("checks trivy server and downloads java db using the temporary directory of the process", func(t *testing.T) {
		ft := setupTrivy(t)
		tmpDir := t.TempDir()
		t.Setenv("TMPDIR", tmpDir)
		t.Setenv("TRIVY_CACHE_DIR", "/cache")
		t.Setenv("OTHER_SECRET", "secret")
		s := newScanner(t, false)

		require.NoError(t, s.Prepare())

		assert.Equal(t, 1, ft.runs(t))
		assert.Equal(t, 1, ft.javaDBRuns(t))
		checkArgs := ft.read(t, "runs")
		assert.Contains(t, checkArgs, "--server http://trivy.example.com:8081")
		assert.Contains(t, checkArgs, "--skip-java-db-update")
		assert.Contains(t, checkArgs, "--input image")
		assert.Equal(t, 3, strings.Count(ft.read(t, "blobs"), "\n"))
		assert.Equal(t,
			"--quiet image --download-java-db-only --skip-version-check --disable-telemetry\n",
			ft.read(t, "javadb-runs"),
		)
		env := strings.Split(strings.TrimSpace(ft.read(t, "javadb-env")), "\n")
		assert.Contains(t, env, "TMPDIR="+tmpDir)
		assert.Contains(t, env, "TRIVY_CACHE_DIR=/cache")
		assertTrivyEnv(t, env)

		// The temporary check directory is removed
		entries, err := os.ReadDir(tmpDir)
		require.NoError(t, err)
		assert.Empty(t, entries)
	})

	t.Run("trivy server check retries once on transient failure", func(t *testing.T) {
		ft := setupTrivy(t)
		ft.write(t, "before", `if [ "$(wc -l < "$dir/runs")" -eq 1 ]; then echo 'twirp error internal: failed to do request: connection refused' >&2; exit 1; fi`+"\n")
		s := newScanner(t, false)

		require.NoError(t, s.Prepare())

		assert.Equal(t, 2, ft.runs(t))
		assert.Equal(t, 1, ft.javaDBRuns(t))
	})

	t.Run("trivy server check failure aborts before downloading java db", func(t *testing.T) {
		ft := setupTrivy(t)
		ft.write(t, "before", "echo 'twirp error internal: database not open' >&2; exit 1\n")
		s := newScanner(t, false)

		err := s.Prepare()

		require.ErrorContains(t, err, "error checking trivy server")
		require.ErrorContains(t, err, "database not open")
		assert.NotErrorIs(t, err, ErrScanCanceled)
		assert.Equal(t, 2, ft.runs(t))
		assert.Zero(t, ft.javaDBRuns(t))
	})

	t.Run("trivy server check fails on invalid report", func(t *testing.T) {
		ft := setupTrivy(t)
		ft.write(t, "report", "not json")
		s := newScanner(t, false)

		err := s.Prepare()

		require.ErrorContains(t, err, "error checking trivy server: invalid report")
		assert.Equal(t, 1, ft.runs(t))
		assert.Zero(t, ft.javaDBRuns(t))
	})

	t.Run("trivy server check fails when report is missing check package", func(t *testing.T) {
		ft := setupTrivy(t)
		ft.write(t, "report", `{"ArtifactName":"image","Results":[]}`)
		s := newScanner(t, false)

		err := s.Prepare()

		require.ErrorContains(t, err, "error checking trivy server: report missing expected alpine check package")
		assert.Equal(t, 1, ft.runs(t))
		assert.Zero(t, ft.javaDBRuns(t))
	})

	t.Run("trivy server check interrupted when the scanner is shutting down", func(t *testing.T) {
		ft := setupTrivy(t)
		ft.write(t, "before", `trap 'kill $!; touch "$dir/terminated"; exit 1' TERM; touch "$dir/started"; sleep 10 & wait`+"\n")
		s := newScanner(t, false)
		ctx, cancel := context.WithCancel(context.Background())
		s.ctx = ctx
		go func() {
			for !ft.exists("started") {
				time.Sleep(time.Millisecond)
			}
			cancel()
		}()

		err := s.Prepare()

		require.ErrorIs(t, err, ErrScanCanceled)
		assert.True(t, ft.exists("terminated"))
		assert.Zero(t, ft.javaDBRuns(t))
	})

	t.Run("download failure", func(t *testing.T) {
		ft := setupTrivy(t)
		ft.write(t, "javadb-before", "echo 'download failed' >&2; exit 1\n")
		s := newScanner(t, false)

		err := s.Prepare()

		require.ErrorContains(t, err, "error downloading trivy java db")
		require.ErrorContains(t, err, "download failed")
		assert.NotErrorIs(t, err, ErrScanCanceled)
		assert.Equal(t, 1, ft.runs(t))
		assert.Equal(t, 1, ft.javaDBRuns(t))
	})

	t.Run("download interrupted when the scanner is shutting down", func(t *testing.T) {
		ft := setupTrivy(t)
		ft.write(t, "javadb-before", `trap 'kill $!; touch "$dir/terminated"; exit 1' TERM; touch "$dir/started"; sleep 10 & wait`+"\n")
		s := newScanner(t, false)
		ctx, cancel := context.WithCancel(context.Background())
		s.ctx = ctx
		go func() {
			for !ft.exists("started") {
				time.Sleep(time.Millisecond)
			}
			cancel()
		}()

		err := s.Prepare()

		require.ErrorIs(t, err, ErrScanCanceled)
		assert.True(t, ft.exists("terminated"))
	})
}

func TestWriteServerCheckLayout(t *testing.T) {
	t.Parallel()

	dir1 := filepath.Join(t.TempDir(), imageLayout)
	dir2 := filepath.Join(t.TempDir(), imageLayout)
	require.NoError(t, writeServerCheckLayout(dir1))
	require.NoError(t, writeServerCheckLayout(dir2))

	lp1, err := layout.FromPath(dir1)
	require.NoError(t, err)
	idx1, err := lp1.ImageIndex()
	require.NoError(t, err)
	im1, err := idx1.IndexManifest()
	require.NoError(t, err)
	require.Len(t, im1.Manifests, 1)

	lp2, err := layout.FromPath(dir2)
	require.NoError(t, err)
	idx2, err := lp2.ImageIndex()
	require.NoError(t, err)
	im2, err := idx2.IndexManifest()
	require.NoError(t, err)
	require.Len(t, im2.Manifests, 1)

	// Layout has a per-check nonce so every check exercises cache writes
	assert.NotEqual(t, im1.Manifests[0].Digest, im2.Manifests[0].Digest)

	img, err := idx1.Image(im1.Manifests[0].Digest)
	require.NoError(t, err)
	cfg, err := img.ConfigFile()
	require.NoError(t, err)
	assert.Equal(t, "linux", cfg.OS)
	assert.Equal(t, "amd64", cfg.Architecture)

	layers, err := img.Layers()
	require.NoError(t, err)
	require.Len(t, layers, 1)
	rc, err := layers[0].Uncompressed()
	require.NoError(t, err)
	defer rc.Close()

	files := make(map[string]string)
	tr := tar.NewReader(rc)
	for {
		hdr, err := tr.Next()
		if errors.Is(err, io.EOF) {
			break
		}
		require.NoError(t, err)
		content, err := io.ReadAll(tr)
		require.NoError(t, err)
		files[hdr.Name] = string(content)
	}
	assert.Equal(t, serverCheckOSVersion+"\n", files["etc/alpine-release"])
	assert.Contains(t, files["lib/apk/db/installed"], "P:"+serverCheckPkgName+"\n")
	assert.Contains(t, files["lib/apk/db/installed"], "V:"+serverCheckPkgVersion+"\n")
	assert.Len(t, strings.TrimSpace(files["etc/artifact-hub-check"]), 32)
}

func TestTrivyScannerServerUnavailable(t *testing.T) {
	t.Run("confirmed server errors return ErrTrivyServerUnavailable and are not cached", func(t *testing.T) {
		testCases := []struct {
			name   string
			stderr string
		}{
			{
				"database not open",
				"failed to detect vulnerabilities via RPC: backoff: permanent error (last error: twirp error internal: failed scan, image: advisory foreach error: database not open)",
			},
			{
				"truncated scan response",
				"failed to detect vulnerabilities via RPC: twirp error internal: failed to read response body: unexpected EOF",
			},
			{
				"missing blobs rpc failure",
				"unable to fetch missing layers: twirp error internal: failed to do request: connection refused",
			},
			{
				"cache write failure",
				"unable to store cache on the server: twirp error internal: no space left on device",
			},
			{
				"server unavailable twirp error",
				"failed to detect vulnerabilities via RPC: twirp error unavailable: service unavailable",
			},
		}
		for _, tc := range testCases {
			t.Run(tc.name, func(t *testing.T) {
				logs := captureLogs(t)
				ft := setupTrivy(t)
				fr := newFakeRegistry(t)
				image := fr.push(t, "repo:1.0.0", newImage(t, 1))
				ft.write(t, "before", "echo '"+tc.stderr+"' >&2; exit 1\n")
				s := newScanner(t, true)
				s.maxServerErrors = 3

				_, err := s.ScanImage(image)

				require.ErrorIs(t, err, ErrTrivyServerUnavailable)
				assert.False(t, s.ServerUnavailable())
				assert.Contains(t, errorLogs(t, logs), "trivy server error")

				// Recovering allows the same reference to be scanned successfully
				ft.write(t, "before", "")
				data, err := s.ScanImage(image)
				require.NoError(t, err)
				assert.Equal(t, image, parseReport(t, data).ArtifactName)
			})
		}
	})

	t.Run("spoofed or image-specific rpc errors do not trigger ErrTrivyServerUnavailable when probe succeeds", func(t *testing.T) {
		testCases := []struct {
			name         string
			stderr       string
			expectProbe  bool
			expectedRuns int
		}{
			{
				"spoofed twirp error in image path",
				"failed to analyze twirp error unavailable:/x: unexpected EOF",
				true,
				3, // 2 scan attempts + 1 passing probe
			},
			{
				"image-specific cache rejection",
				"unable to store cache on the server: twirp error internal: unable to store layer info in cache: invalid diffID",
				true,
				3, // 2 scan attempts + 1 passing probe
			},
			{
				"client-side protobuf marshal error skips probe",
				"unable to store cache on the server: twirp error internal: failed to marshal proto request: string field contains invalid UTF-8",
				false,
				2, // 2 scan attempts, no probe
			},
		}
		for _, tc := range testCases {
			t.Run(tc.name, func(t *testing.T) {
				ft := setupTrivy(t)
				fr := newFakeRegistry(t)
				image := fr.push(t, "repo:1.0.0", newImage(t, 1))
				// Fail only when scanning the image layout, not the probe layout
				ft.write(t, "before", `case "$PWD" in *artifact-hub-trivy-check*) ;; *) echo '`+tc.stderr+`' >&2; exit 1 ;; esac`+"\n")
				s := newScanner(t, false)
				s.maxServerErrors = 1

				_, err := s.ScanImage(image)

				require.ErrorContains(t, err, "error running trivy on image "+image)
				assert.NotErrorIs(t, err, ErrTrivyServerUnavailable)
				assert.False(t, s.ServerUnavailable())
				assert.Equal(t, tc.expectedRuns, ft.runs(t))
			})
		}
	})

	t.Run("circuit breaker trips after consecutive confirmed server errors and stops further scans", func(t *testing.T) {
		ft := setupTrivy(t)
		fr := newFakeRegistry(t)
		image1 := fr.push(t, "repo:1.0.0", newImage(t, 1))
		image2 := fr.push(t, "repo:2.0.0", newImage(t, 1))
		image3 := fr.push(t, "repo:3.0.0", newImage(t, 1))
		ft.write(t, "before", "echo 'failed to detect vulnerabilities via RPC: twirp error internal: database not open' >&2; exit 1\n")
		s := newScanner(t, true)
		s.maxServerErrors = 2

		_, err := s.ScanImage(image1)
		require.ErrorIs(t, err, ErrTrivyServerUnavailable)
		assert.False(t, s.ServerUnavailable())

		_, err = s.ScanImage(image2)
		require.ErrorIs(t, err, ErrTrivyServerUnavailable)
		assert.True(t, s.ServerUnavailable())

		fr.reset()
		runsBefore := ft.runs(t)
		_, err = s.ScanImage(image3)
		require.ErrorIs(t, err, ErrTrivyServerUnavailable)
		assert.Zero(t, fr.count("/"))
		assert.Equal(t, runsBefore, ft.runs(t))
	})

	t.Run("successful scan resets the consecutive server error counter", func(t *testing.T) {
		ft := setupTrivy(t)
		fr := newFakeRegistry(t)
		image1 := fr.push(t, "repo:1.0.0", newImage(t, 1))
		image2 := fr.push(t, "repo:2.0.0", newImage(t, 1))
		image3 := fr.push(t, "repo:3.0.0", newImage(t, 1))
		serverErr := "echo 'failed to detect vulnerabilities via RPC: twirp error internal: database not open' >&2; exit 1\n"
		s := newScanner(t, true)
		s.maxServerErrors = 2

		ft.write(t, "before", serverErr)
		_, err := s.ScanImage(image1)
		require.ErrorIs(t, err, ErrTrivyServerUnavailable)
		assert.False(t, s.ServerUnavailable())

		// Recovery resets the counter
		ft.write(t, "before", "")
		_, err = s.ScanImage(image2)
		require.NoError(t, err)

		// Another isolated failure does not trip the breaker
		ft.write(t, "before", serverErr)
		_, err = s.ScanImage(image3)
		require.ErrorIs(t, err, ErrTrivyServerUnavailable)
		assert.False(t, s.ServerUnavailable())
	})

	t.Run("non-rpc trivy errors do not probe or trip the circuit breaker", func(t *testing.T) {
		ft := setupTrivy(t)
		fr := newFakeRegistry(t)
		image1 := fr.push(t, "repo:1.0.0", newImage(t, 1))
		image2 := fr.push(t, "repo:2.0.0", newImage(t, 1))
		ft.write(t, "before", "echo 'invalid tar header' >&2; exit 1\n")
		s := newScanner(t, false)
		s.maxServerErrors = 1

		_, err := s.ScanImage(image1)
		require.ErrorContains(t, err, "invalid tar header")
		assert.NotErrorIs(t, err, ErrTrivyServerUnavailable)
		assert.False(t, s.ServerUnavailable())
		assert.Equal(t, 2, ft.runs(t))

		_, err = s.ScanImage(image2)
		require.ErrorContains(t, err, "invalid tar header")
		assert.False(t, s.ServerUnavailable())
		assert.Equal(t, 4, ft.runs(t))
	})

	t.Run("concurrent requests sharing a digest get ErrTrivyServerUnavailable without retrying immediately", func(t *testing.T) {
		ft := setupTrivy(t)
		fr := newFakeRegistry(t)
		img := newImage(t, 1)
		image1 := fr.push(t, "repo:1.0.0", img)
		image2 := fr.push(t, "repo:2.0.0", img)
		ft.write(t, "before", `touch "$dir/started"; sleep 0.2; echo 'twirp error internal: database not open' >&2; exit 1`+"\n")
		s := newScanner(t, true)
		s.maxServerErrors = 5

		err1Ch := make(chan error, 1)
		go func() {
			_, err := s.ScanImage(image1)
			err1Ch <- err
		}()
		for !ft.exists("started") {
			time.Sleep(time.Millisecond)
		}
		_, err2 := s.ScanImage(image2)
		err1 := <-err1Ch

		require.ErrorIs(t, err1, ErrTrivyServerUnavailable)
		require.ErrorIs(t, err2, ErrTrivyServerUnavailable)
		assert.Equal(t, 3, ft.runs(t)) // 2 scan attempts + 1 probe
	})

	t.Run("concurrent rpc failures coalesce onto a single server probe and count once", func(t *testing.T) {
		ft := setupTrivy(t)
		fr := newFakeRegistry(t)
		image1 := fr.push(t, "repo:1.0.0", newImage(t, 1))
		image2 := fr.push(t, "repo:2.0.0", newImage(t, 1))
		image3 := fr.push(t, "repo:3.0.0", newImage(t, 1))
		ft.write(t, "before", `case "$PWD" in
  *artifact-hub-trivy-check*) echo probe >> "$dir/probes"; sleep 0.3; echo 'twirp error internal: database not open' >&2; exit 1 ;;
  *) echo 'twirp error internal: database not open' >&2; exit 1 ;;
esac
`)
		s := newScanner(t, true)
		s.maxServerErrors = 2

		var wg sync.WaitGroup
		errs := make([]error, 2)
		for i, img := range []string{image1, image2} {
			wg.Add(1)
			go func() {
				defer wg.Done()
				_, errs[i] = s.ScanImage(img)
			}()
		}
		wg.Wait()

		require.ErrorIs(t, errs[0], ErrTrivyServerUnavailable)
		require.ErrorIs(t, errs[1], ErrTrivyServerUnavailable)
		assert.Equal(t, 1, ft.lines(t, "probes"))
		assert.False(t, s.ServerUnavailable())

		// A second independent probe failure trips the breaker
		_, err := s.ScanImage(image3)
		require.ErrorIs(t, err, ErrTrivyServerUnavailable)
		assert.Equal(t, 2, ft.lines(t, "probes"))
		assert.True(t, s.ServerUnavailable())
	})

	t.Run("breaker tripping during a failing scan skips retry and returns ErrTrivyServerUnavailable", func(t *testing.T) {
		ft := setupTrivy(t)
		fr := newFakeRegistry(t)
		image := fr.push(t, "repo:1.0.0", newImage(t, 1))
		ft.write(t, "before", `touch "$dir/started"; while [ ! -f "$dir/release" ]; do sleep 0.01; done; echo 'transient crash' >&2; exit 1`+"\n")
		s := newScanner(t, false)

		errCh := make(chan error, 1)
		go func() {
			_, err := s.ScanImage(image)
			errCh <- err
		}()
		for !ft.exists("started") {
			time.Sleep(time.Millisecond)
		}
		s.mu.Lock()
		s.serverUnavailable = true
		s.mu.Unlock()
		ft.write(t, "release", "")

		require.ErrorIs(t, <-errCh, ErrTrivyServerUnavailable)
		assert.Equal(t, 1, ft.runs(t))
	})

	t.Run("failed server probes back off exponentially and cancel cleanly on shutdown", func(t *testing.T) {
		s := newScanner(t, true)
		s.retryDelay = 5 * time.Second
		s.maxProbeBackoff = 30 * time.Second
		assert.Equal(t, 5*time.Second, s.probeBackoff(1))
		assert.Equal(t, 10*time.Second, s.probeBackoff(2))
		assert.Equal(t, 20*time.Second, s.probeBackoff(3))
		assert.Equal(t, 30*time.Second, s.probeBackoff(4))
		assert.Equal(t, 30*time.Second, s.probeBackoff(10))

		// Verify backoff waits between non-terminal failed probes
		ft := setupTrivy(t)
		fr := newFakeRegistry(t)
		image1 := fr.push(t, "repo:1.0.0", newImage(t, 1))
		image2 := fr.push(t, "repo:2.0.0", newImage(t, 1))
		ft.write(t, "before", "echo 'twirp error internal: database not open' >&2; exit 1\n")
		s = newScanner(t, true)
		s.retryDelay = 100 * time.Millisecond
		s.maxProbeBackoff = 500 * time.Millisecond
		s.maxServerErrors = 3

		startedAt := time.Now()
		_, err := s.ScanImage(image1)
		require.ErrorIs(t, err, ErrTrivyServerUnavailable)
		// scanLayout retryDelay (100ms) + first probe backoff (100ms)
		assert.GreaterOrEqual(t, time.Since(startedAt), 200*time.Millisecond)
		assert.False(t, s.ServerUnavailable())

		// Shutting down during probe backoff cancels immediately
		ctx, cancel := context.WithCancel(context.Background())
		defer cancel()
		s.ctx = ctx
		ft.write(t, "before", `case "$PWD" in
  *artifact-hub-trivy-check*) touch "$dir/probing"; echo 'twirp error internal: database not open' >&2; exit 1 ;;
  *) echo 'twirp error internal: database not open' >&2; exit 1 ;;
esac
`)
		s.retryDelay = 20 * time.Millisecond
		s.maxProbeBackoff = time.Hour
		s.serverErrors = 10 // probeBackoff(11) = 20ms * 2^10 > 20s
		s.maxServerErrors = 20

		errCh := make(chan error, 1)
		go func() {
			_, err := s.ScanImage(image2)
			errCh <- err
		}()
		for !ft.exists("probing") {
			time.Sleep(time.Millisecond)
		}
		time.Sleep(50 * time.Millisecond)
		cancelAt := time.Now()
		cancel()

		require.ErrorIs(t, <-errCh, ErrScanCanceled)
		assert.Less(t, time.Since(cancelAt), 2*time.Second)
	})
}

// assertTrivyEnv checks that the environment of Trivy provided only contains the
// variables allowed.
func assertTrivyEnv(t *testing.T, env []string) {
	t.Helper()
	for _, entry := range env {
		name, _, _ := strings.Cut(entry, "=")
		assert.Contains(t, []string{
			"HOME", "PATH", "PWD", "TMPDIR", "TRIVY_CACHE_DIR", "TRIVY_NEW_JSON_SCHEMA", "USER",
			"OLDPWD", "SHLVL", "_", // Set by the shell running the script
		}, name)
	}
}

func TestNormalizeReport(t *testing.T) {
	t.Parallel()

	digest, err := v1.NewHash("sha256:" + strings.Repeat("a", 64))
	require.NoError(t, err)

	testCases := []struct {
		image               string
		expectedRepoTags    []string
		expectedRepoDigest  string
		expectedReference   string
		expectedOSTarget    string
		expectedOtherTarget string
	}{
		{"nginx:1.27", []string{"nginx:1.27"}, "nginx@" + digest.String(), "nginx:1.27", "nginx:1.27 (alpine 3.20.0)", "app/go.mod"},
		{"bitnami/nginx", []string{"bitnami/nginx:latest"}, "bitnami/nginx@" + digest.String(), "bitnami/nginx:latest", "bitnami/nginx (alpine 3.20.0)", "app/go.mod"},
		{"docker.io/library/nginx:1.27", []string{"nginx:1.27"}, "nginx@" + digest.String(), "nginx:1.27", "docker.io/library/nginx:1.27 (alpine 3.20.0)", "app/go.mod"},
		{"quay.io/org/image:1.0", []string{"quay.io/org/image:1.0"}, "quay.io/org/image@" + digest.String(), "quay.io/org/image:1.0", "quay.io/org/image:1.0 (alpine 3.20.0)", "app/go.mod"},
		{"quay.io/org/image:1.0@" + digest.String(), nil, "quay.io/org/image@" + digest.String(), "quay.io/org/image@" + digest.String(), "quay.io/org/image:1.0@" + digest.String() + " (alpine 3.20.0)", "app/go.mod"},
	}
	for _, tc := range testCases {
		t.Run(tc.image, func(t *testing.T) {
			t.Parallel()

			ref, err := name.ParseReference(tc.image)
			require.NoError(t, err)

			data, err := normalizeReport([]byte(testReport), tc.image, ref, digest)
			require.NoError(t, err)

			report := parseReport(t, data)
			assert.Equal(t, tc.image, report.ArtifactName)
			assert.Equal(t, tc.expectedRepoTags, report.Metadata.RepoTags)
			assert.Equal(t, []string{tc.expectedRepoDigest}, report.Metadata.RepoDigests)
			assert.Equal(t, tc.expectedReference, report.Metadata.Reference.String())
			assert.Equal(t, tc.expectedOSTarget, report.Results[0].Target)
			assert.Equal(t, tc.expectedOtherTarget, report.Results[1].Target)
			assert.Equal(t, "sha256:1234", report.Metadata.ImageID)
		})
	}

	t.Run("targets not using the layout name are not updated", func(t *testing.T) {
		t.Parallel()

		ref, err := name.ParseReference("nginx:1.27")
		require.NoError(t, err)

		data, err := normalizeReport([]byte(`{"Results":[{"Target":"image-other","Class":"os-pkgs"}]}`), "nginx:1.27", ref, digest)
		require.NoError(t, err)

		assert.Equal(t, "image-other", parseReport(t, data).Results[0].Target)
	})

	t.Run("invalid report", func(t *testing.T) {
		t.Parallel()

		ref, err := name.ParseReference("nginx:1.27")
		require.NoError(t, err)

		_, err = normalizeReport([]byte("invalid"), "nginx:1.27", ref, digest)

		require.ErrorContains(t, err, "error unmarshalling report")
	})
}

func TestPullTimer(t *testing.T) {
	t.Parallel()

	t.Run("time is not consumed between stages", func(t *testing.T) {
		t.Parallel()

		pull := newPullTimer(context.Background(), 50*time.Millisecond, nil)
		defer pull.close()

		time.Sleep(100 * time.Millisecond)
		require.NoError(t, pull.ctx.Err())
		pull.start()
		pull.stop()
		time.Sleep(100 * time.Millisecond)
		require.NoError(t, pull.ctx.Err())
	})

	t.Run("time available is shared by all stages", func(t *testing.T) {
		t.Parallel()

		pull := newPullTimer(context.Background(), time.Minute, nil)
		defer pull.close()

		pull.start()
		time.Sleep(10 * time.Millisecond)
		pull.stop()

		assert.LessOrEqual(t, pull.remaining, time.Minute-10*time.Millisecond)
		require.NoError(t, pull.ctx.Err())
	})

	t.Run("context is canceled when there is no time left", func(t *testing.T) {
		t.Parallel()

		pull := newPullTimer(context.Background(), time.Minute, nil)
		defer pull.close()

		pull.remaining = 0
		pull.start()
		select {
		case <-pull.ctx.Done():
		case <-time.After(5 * time.Second):
			require.Fail(t, "timer did not expire")
		}
	})

	t.Run("parent cancellation is propagated", func(t *testing.T) {
		t.Parallel()

		ctx, cancel := context.WithCancel(context.Background())
		pull := newPullTimer(ctx, time.Minute, nil)
		defer pull.close()

		cancel()
		require.Error(t, pull.ctx.Err())
	})
}
