package oci

import (
	"context"
	"fmt"
	"net"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"

	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/tests"
	"github.com/artifacthub/hub/internal/util"
	"github.com/google/go-containerregistry/pkg/name"
	"github.com/google/go-containerregistry/pkg/v1/empty"
	"github.com/google/go-containerregistry/pkg/v1/mutate"
	"github.com/google/go-containerregistry/pkg/v1/random"
	ggcrtypes "github.com/google/go-containerregistry/pkg/v1/types"
	"github.com/spf13/viper"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestRegistryClientsEnforceDefaultTransportsRestrictions(t *testing.T) {
	// Not parallel: this test updates the process-wide default transports
	tests.PreserveDefaultTransports(t)
	require.NoError(t, util.SetupDefaultTransports(true))

	var hits atomic.Int32
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		hits.Add(1)
	}))
	defer srv.Close()
	registry := strings.TrimPrefix(srv.URL, "http://")

	t.Run("oras", func(t *testing.T) {
		_, _, err := NewPuller(nil).PullLayer(context.Background(), registry+"/repo:1.0.0", "media/type", "", "")
		require.ErrorIs(t, err, util.ErrRestrictedConnection)
	})

	t.Run("go-containerregistry", func(t *testing.T) {
		r := &hub.Repository{URL: hub.RepositoryOCIPrefix + registry + "/repo"}
		_, err := NewTagsGetter(nil).Tags(context.Background(), r, false, false)
		require.ErrorIs(t, err, util.ErrRestrictedConnection)
	})

	t.Run("go-containerregistry descriptor", func(t *testing.T) {
		ref, err := name.ParseReference(registry + "/repo:1.0.0")
		require.NoError(t, err)
		_, err = GetDescriptor(context.Background(), viper.New(), ref, nil)
		require.ErrorIs(t, err, util.ErrRestrictedConnection)
	})

	assert.Zero(t, hits.Load())
}

func TestRegistryHopsEnforceDefaultTransportsRestrictions(t *testing.T) {
	// Not parallel: this test updates the process-wide default transports
	transports := tests.PreserveDefaultTransports(t)
	require.NoError(t, util.SetupDefaultTransports(true))
	restrictedDialers := make([]func(context.Context, string, string) (net.Conn, error), 0, len(transports))
	for _, transport := range transports {
		restrictedDialers = append(restrictedDialers, transport.DialContext)
	}

	// allowRegistry lets the default transports connect to the registry
	// provided, which plays the role of a public registry. Connections to any
	// other address are only checked when restricted is set to true.
	allowRegistry := func(registry string, restricted bool) {
		for i, transport := range transports {
			restrictedDialer := restrictedDialers[i]
			transport.CloseIdleConnections()
			transport.DialContext = func(ctx context.Context, network, addr string) (net.Conn, error) {
				if addr == registry || !restricted {
					return (&net.Dialer{}).DialContext(ctx, network, addr)
				}
				return restrictedDialer(ctx, network, addr)
			}
		}
	}

	getDescriptor := func(t *testing.T, tr *testRegistry) error {
		_, err := GetDescriptor(context.Background(), viper.New(), tr.parseRef(t), nil)
		return err
	}

	testCases := []struct {
		name string
		// intercept returns the requests interceptor of the registry, which
		// sends the client to the target URL provided
		intercept func(target string) func(w http.ResponseWriter, r *http.Request) bool
		pull      func(t *testing.T, tr *testRegistry, target string) error
	}{
		{
			"redirect",
			func(target string) func(w http.ResponseWriter, r *http.Request) bool {
				return func(w http.ResponseWriter, r *http.Request) bool {
					if !strings.Contains(r.URL.Path, "/manifests/") {
						return false
					}
					redirect(w, target+r.URL.Path)
					return true
				}
			},
			func(t *testing.T, tr *testRegistry, _ string) error {
				return getDescriptor(t, tr)
			},
		},
		{
			"token realm",
			func(target string) func(w http.ResponseWriter, r *http.Request) bool {
				return func(w http.ResponseWriter, r *http.Request) bool {
					if r.URL.Path != "/v2/" {
						return false
					}
					w.Header().Set("WWW-Authenticate", `Bearer realm="`+target+`/token",service="registry"`)
					w.WriteHeader(http.StatusUnauthorized)
					return true
				}
			},
			func(t *testing.T, tr *testRegistry, _ string) error {
				return getDescriptor(t, tr)
			},
		},
		{
			"foreign layer",
			func(string) func(w http.ResponseWriter, r *http.Request) bool {
				return nil
			},
			func(t *testing.T, tr *testRegistry, target string) error {
				// Foreign layers are not pushed, so the registry does not
				// have the blob and the client falls back to its URLs
				layer, err := random.Layer(64, ggcrtypes.DockerForeignLayer)
				require.NoError(t, err)
				img, err := mutate.Append(empty.Image, mutate.Addendum{
					Layer: layer,
					URLs:  []string{target + "/layer"},
				})
				require.NoError(t, err)
				tr.push(t, img)
				return getImage(t, tr.parseRef(t)).WriteLayers(t.TempDir(), func(error) {})
			},
		},
	}
	for _, tc := range testCases {
		for _, restricted := range []bool{true, false} {
			t.Run(fmt.Sprintf("%s restricted=%t", tc.name, restricted), func(t *testing.T) {
				var hits atomic.Int32
				target := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
					hits.Add(1)
					w.WriteHeader(http.StatusNotFound)
				}))
				t.Cleanup(target.Close)
				_, port, err := net.SplitHostPort(strings.TrimPrefix(target.URL, "http://"))
				require.NoError(t, err)

				// A hostname is used so that the go-containerregistry checks
				// on IP addresses do not reject the target before connecting
				targetURL := "http://localhost:" + port
				tr := newTestRegistry(t, tc.intercept(targetURL))
				allowRegistry(tr.host, restricted)

				err = tc.pull(t, tr, targetURL)

				if restricted {
					require.ErrorIs(t, err, util.ErrRestrictedConnection)
					assert.Zero(t, hits.Load())
				} else {
					require.Error(t, err)
					assert.NotZero(t, hits.Load())
				}
			})
		}
	}
}
