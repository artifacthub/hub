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
	"sync/atomic"
	"testing"

	"github.com/artifacthub/hub/internal/oci"
	"github.com/google/go-containerregistry/pkg/name"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"google.golang.org/protobuf/encoding/protowire"
)

// missingBlobsPath is the path of the Twirp method of the Trivy server used to
// find out which blobs it does not have.
const (
	missingBlobsPath = "/twirp/trivy.cache.v1.Cache/MissingBlobs"
	putBlobPath      = "/twirp/trivy.cache.v1.Cache/PutBlob"
	putArtifactPath  = "/twirp/trivy.cache.v1.Cache/PutArtifact"
	scanPath         = "/twirp/trivy.scanner.v1.Scanner/Scan"
)

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

// TestTrivyServerCheckContract checks that the real Trivy analyzes the
// synthetic server-check layout (uploading its Alpine OS and busybox package
// metadata via PutBlob/PutArtifact) and produces a report accepted by
// validateServerCheckReport.
func TestTrivyServerCheckContract(t *testing.T) {
	if _, err := exec.LookPath("trivy"); err != nil {
		if os.Getenv("CI") != "" {
			t.Fatal("trivy not found in PATH: it is required to run this test in CI")
		}
		t.Skip("trivy not found in PATH: skipping test against the real trivy")
	}

	var (
		mu         sync.Mutex
		sawMissing bool
		sawPutBlob bool
		sawPutArt  bool
		sawScan    bool
		rawOS      []byte
		rawPkgs    [][]byte
	)
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		body, err := io.ReadAll(r.Body)
		if err != nil {
			w.WriteHeader(http.StatusBadRequest)
			return
		}
		switch r.URL.Path {
		case missingBlobsPath:
			blobIDs, ok := decodeMissingBlobsRequest(body)
			if !assert.True(t, ok, "invalid MissingBlobs request") {
				w.WriteHeader(http.StatusBadRequest)
				return
			}
			mu.Lock()
			sawMissing = true
			mu.Unlock()
			w.Header().Set("Content-Type", "application/protobuf")
			_, _ = w.Write(encodeMissingBlobsResponse(blobIDs))
		case putBlobPath:
			osBytes, pkgs, ok := decodePutBlobRequest(body)
			if !assert.True(t, ok, "invalid PutBlob request") {
				w.WriteHeader(http.StatusBadRequest)
				return
			}
			mu.Lock()
			sawPutBlob = true
			if len(osBytes) > 0 {
				rawOS = osBytes
			}
			rawPkgs = append(rawPkgs, pkgs...)
			mu.Unlock()
			w.Header().Set("Content-Type", "application/protobuf")
			_, _ = w.Write(nil)
		case putArtifactPath:
			mu.Lock()
			sawPutArt = true
			mu.Unlock()
			w.Header().Set("Content-Type", "application/protobuf")
			_, _ = w.Write(nil)
		case scanPath:
			mu.Lock()
			sawScan = true
			osBytes := rawOS
			pkgs := append([][]byte(nil), rawPkgs...)
			mu.Unlock()

			w.Header().Set("Content-Type", "application/protobuf")
			_, _ = w.Write(encodeScanResponse(osBytes, pkgs))
		default:
			w.WriteHeader(http.StatusNotFound)
		}
	}))
	t.Cleanup(srv.Close)

	s := newScanner(t, false)
	s.cfg.Set("scanner.trivyURL", srv.URL)
	t.Setenv("TRIVY_CACHE_DIR", t.TempDir())

	require.NoError(t, s.checkTrivyServer(false))

	mu.Lock()
	defer mu.Unlock()
	assert.True(t, sawMissing, "expected MissingBlobs request")
	assert.True(t, sawPutBlob, "expected PutBlob request")
	assert.True(t, sawPutArt, "expected PutArtifact request")
	assert.True(t, sawScan, "expected Scan request")
	assert.NotEmpty(t, rawOS, "expected OS info in PutBlob")
	assert.NotEmpty(t, rawPkgs, "expected packages in PutBlob")
}

// TestTrivyServerErrorContract checks that the real Trivy reports Trivy server
// cache write and Scan RPC failures (such as a full cache, closed vulnerability
// DB, or truncated Scan response) in a way detected by isTrivyRPCError and
// caught by checkTrivyServer.
func TestTrivyServerErrorContract(t *testing.T) {
	if _, err := exec.LookPath("trivy"); err != nil {
		if os.Getenv("CI") != "" {
			t.Fatal("trivy not found in PATH: it is required to run this test in CI")
		}
		t.Skip("trivy not found in PATH: skipping test against the real trivy")
	}

	testCases := []struct {
		name          string
		expectedError string
		handler       func(injected *atomic.Bool) http.HandlerFunc
	}{
		{
			name:          "closed vulnerability db on scan",
			expectedError: "database not open",
			handler: func(injected *atomic.Bool) http.HandlerFunc {
				return func(w http.ResponseWriter, r *http.Request) {
					switch r.URL.Path {
					case missingBlobsPath, putBlobPath, putArtifactPath:
						w.Header().Set("Content-Type", "application/protobuf")
						_, _ = w.Write(nil)
					case scanPath:
						injected.Store(true)
						w.Header().Set("Content-Type", "application/json")
						w.WriteHeader(http.StatusInternalServerError)
						_, _ = w.Write([]byte(`{"code":"internal","msg":"failed scan, image: database not open"}`))
					default:
						w.WriteHeader(http.StatusNotFound)
					}
				}
			},
		},
		{
			name:          "full cache on put blob",
			expectedError: "no space left on device",
			handler: func(injected *atomic.Bool) http.HandlerFunc {
				return func(w http.ResponseWriter, r *http.Request) {
					switch r.URL.Path {
					case missingBlobsPath:
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
					case putBlobPath:
						injected.Store(true)
						w.Header().Set("Content-Type", "application/json")
						w.WriteHeader(http.StatusInternalServerError)
						_, _ = w.Write([]byte(`{"code":"internal","msg":"unable to store layer info in cache: no space left on device"}`))
					default:
						w.WriteHeader(http.StatusNotFound)
					}
				}
			},
		},
		{
			name:          "truncated scan response",
			expectedError: "EOF",
			handler: func(injected *atomic.Bool) http.HandlerFunc {
				return func(w http.ResponseWriter, r *http.Request) {
					switch r.URL.Path {
					case missingBlobsPath, putBlobPath, putArtifactPath:
						w.Header().Set("Content-Type", "application/protobuf")
						_, _ = w.Write(nil)
					case scanPath:
						injected.Store(true)
						w.Header().Set("Content-Type", "application/protobuf")
						w.Header().Set("Content-Length", "1024")
						w.WriteHeader(http.StatusOK)
						_, _ = w.Write([]byte("partial"))
					default:
						w.WriteHeader(http.StatusNotFound)
					}
				}
			},
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			var injected atomic.Bool
			srv := httptest.NewServer(tc.handler(&injected))
			t.Cleanup(srv.Close)

			s := newScanner(t, false)
			s.cfg.Set("scanner.trivyURL", srv.URL)
			t.Setenv("TRIVY_CACHE_DIR", t.TempDir())

			err := s.checkTrivyServer(false)

			require.Error(t, err)
			assert.True(t, injected.Load(), "expected fault-injection handler to be reached")
			assert.ErrorContains(t, err, tc.expectedError)
			assert.True(t, isTrivyRPCError(err.Error()), "rpc error not detected in trivy output: %v", err)
		})
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

// decodePutBlobRequest extracts the raw OS message (BlobInfo field 2) and raw
// Package messages (BlobInfo field 3 -> PackageInfo field 2) from a
// PutBlobRequest (field 3 is blob_info).
func decodePutBlobRequest(data []byte) ([]byte, [][]byte, bool) {
	var (
		rawOS   []byte
		rawPkgs [][]byte
	)
	for len(data) > 0 {
		num, typ, n := protowire.ConsumeTag(data)
		if n < 0 {
			return nil, nil, false
		}
		data = data[n:]
		if num == 3 && typ == protowire.BytesType {
			blobInfo, n := protowire.ConsumeBytes(data)
			if n < 0 {
				return nil, nil, false
			}
			data = data[n:]
			for len(blobInfo) > 0 {
				bNum, bTyp, bn := protowire.ConsumeTag(blobInfo)
				if bn < 0 {
					return nil, nil, false
				}
				blobInfo = blobInfo[bn:]
				switch {
				case bNum == 2 && bTyp == protowire.BytesType:
					v, vn := protowire.ConsumeBytes(blobInfo)
					if vn < 0 {
						return nil, nil, false
					}
					rawOS = append([]byte(nil), v...)
					blobInfo = blobInfo[vn:]
				case bNum == 3 && bTyp == protowire.BytesType:
					pkgInfo, pn := protowire.ConsumeBytes(blobInfo)
					if pn < 0 {
						return nil, nil, false
					}
					blobInfo = blobInfo[pn:]
					for len(pkgInfo) > 0 {
						pNum, pTyp, pkgn := protowire.ConsumeTag(pkgInfo)
						if pkgn < 0 {
							return nil, nil, false
						}
						pkgInfo = pkgInfo[pkgn:]
						if pNum == 2 && pTyp == protowire.BytesType {
							pkgBytes, vn := protowire.ConsumeBytes(pkgInfo)
							if vn < 0 {
								return nil, nil, false
							}
							rawPkgs = append(rawPkgs, append([]byte(nil), pkgBytes...))
							pkgInfo = pkgInfo[vn:]
							continue
						}
						if vn := protowire.ConsumeFieldValue(pNum, pTyp, pkgInfo); vn < 0 {
							return nil, nil, false
						} else {
							pkgInfo = pkgInfo[vn:]
						}
					}
				default:
					if vn := protowire.ConsumeFieldValue(bNum, bTyp, blobInfo); vn < 0 {
						return nil, nil, false
					} else {
						blobInfo = blobInfo[vn:]
					}
				}
			}
			continue
		}
		if n = protowire.ConsumeFieldValue(num, typ, data); n < 0 {
			return nil, nil, false
		}
		data = data[n:]
	}
	return rawOS, rawPkgs, true
}

// encodeScanResponse encodes a ScanResponse containing the OS message (field 1)
// and a single os-pkgs/alpine Result (field 3) carrying the raw Package
// messages provided.
func encodeScanResponse(rawOS []byte, rawPkgs [][]byte) []byte {
	var result []byte
	result = protowire.AppendTag(result, 1, protowire.BytesType)
	result = protowire.AppendString(result, imageLayout+" (alpine "+serverCheckOSVersion+")")
	result = protowire.AppendTag(result, 3, protowire.BytesType)
	result = protowire.AppendString(result, "alpine")
	for _, pkg := range rawPkgs {
		result = protowire.AppendTag(result, 5, protowire.BytesType)
		result = protowire.AppendBytes(result, pkg)
	}
	result = protowire.AppendTag(result, 6, protowire.BytesType)
	result = protowire.AppendString(result, "os-pkgs")

	var resp []byte
	if len(rawOS) > 0 {
		resp = protowire.AppendTag(resp, 1, protowire.BytesType)
		resp = protowire.AppendBytes(resp, rawOS)
	}
	resp = protowire.AppendTag(resp, 3, protowire.BytesType)
	resp = protowire.AppendBytes(resp, result)
	return resp
}
