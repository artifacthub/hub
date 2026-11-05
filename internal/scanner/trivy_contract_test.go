package scanner

import (
	"context"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"os/exec"
	"path/filepath"
	"sync"
	"testing"

	"github.com/artifacthub/hub/internal/oci"
	"github.com/google/go-containerregistry/pkg/name"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"google.golang.org/protobuf/encoding/protowire"
)

// missingBlobsPath is the path of the Twirp method of the Trivy server used to
// find out which blobs it does not have.
const missingBlobsPath = "/twirp/trivy.cache.v1.Cache/MissingBlobs"

// TestTrivyMissingLayerContract checks that the real Trivy reports the layers
// the Trivy server needs in a way detected by missingLayer, as the rest of the
// tests use a fake Trivy. Trivy is run like in the scans, by runTrivy, using a
// fake Trivy server that is missing everything.
func TestTrivyMissingLayerContract(t *testing.T) {
	if _, err := exec.LookPath("trivy"); err != nil {
		// Trivy is installed in CI, so it must not be skipped silently there
		if os.Getenv("CI") != "" {
			t.Fatal("trivy not found in PATH: it is required to run this test in CI")
		}
		t.Skip("trivy not found in PATH: skipping test against the real trivy")
	}

	// Setup a fake Trivy server
	var (
		mu       sync.Mutex
		requests []string
	)
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		mu.Lock()
		requests = append(requests, r.Method+" "+r.URL.Path)
		mu.Unlock()
		if r.Method != http.MethodPost || r.URL.Path != missingBlobsPath {
			w.WriteHeader(http.StatusNotFound)
			return
		}
		body, err := io.ReadAll(r.Body)
		if err != nil {
			w.WriteHeader(http.StatusBadRequest)
			return
		}
		blobIDs, ok := decodeMissingBlobsRequest(body)
		if !assert.True(t, ok, "invalid MissingBlobs request") {
			w.WriteHeader(http.StatusBadRequest)
			return
		}
		w.Header().Set("Content-Type", "application/protobuf")
		_, _ = w.Write(encodeMissingBlobsResponse(blobIDs))
	}))
	t.Cleanup(srv.Close)

	// Write a layout of an image with no layers, like the first run of a scan
	fr := newFakeRegistry(t)
	image := fr.push(t, "repo:1.0.0", newImage(t, 2))
	ref, err := name.ParseReference(image)
	require.NoError(t, err)
	s := newScanner(t, false)
	s.cfg.Set("scanner.trivyURL", srv.URL)
	desc, err := oci.GetDescriptor(context.Background(), s.cfg, ref, nil)
	require.NoError(t, err)
	img, err := oci.NewImage(desc, s.maxImageSize)
	require.NoError(t, err)
	dir := t.TempDir()
	require.NoError(t, img.WriteLayout(filepath.Join(dir, imageLayout)))
	t.Setenv("TRIVY_CACHE_DIR", t.TempDir())

	_, stderr, err := s.runTrivy(dir)

	require.Error(t, err)
	assert.True(t, missingLayer(img, stderr), "missing layer not detected in trivy output: %s", stderr)
	mu.Lock()
	defer mu.Unlock()
	assert.NotEmpty(t, requests)
	for _, request := range requests {
		assert.Equal(t, http.MethodPost+" "+missingBlobsPath, request)
	}
}

// decodeMissingBlobsRequest returns the blob ids of the MissingBlobsRequest
// provided, encoded in protobuf (field 2 is blob_ids).
func decodeMissingBlobsRequest(data []byte) ([]string, bool) {
	var blobIDs []string
	for len(data) > 0 {
		num, typ, n := protowire.ConsumeTag(data)
		if n < 0 {
			return nil, false
		}
		data = data[n:]
		if num == 2 && typ == protowire.BytesType {
			blobID, n := protowire.ConsumeString(data)
			if n < 0 {
				return nil, false
			}
			blobIDs = append(blobIDs, blobID)
			data = data[n:]
			continue
		}
		if n = protowire.ConsumeFieldValue(num, typ, data); n < 0 {
			return nil, false
		}
		data = data[n:]
	}
	return blobIDs, true
}

// encodeMissingBlobsResponse returns a MissingBlobsResponse encoded in protobuf
// that reports the artifact (field 1 is missing_artifact) and the blobs provided
// (field 2 is missing_blob_ids) as missing.
func encodeMissingBlobsResponse(blobIDs []string) []byte {
	data := protowire.AppendTag(nil, 1, protowire.VarintType)
	data = protowire.AppendVarint(data, protowire.EncodeBool(true))
	for _, blobID := range blobIDs {
		data = protowire.AppendTag(data, 2, protowire.BytesType)
		data = protowire.AppendString(data, blobID)
	}
	return data
}
