package container

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"

	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/tracker/source"
	"github.com/rs/zerolog"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

func TestTrackerSourceIgnoredPackages(t *testing.T) {
	t.Parallel()

	testCases := []struct {
		desc                   string
		tags                   []hub.ContainerImageTag
		expectRegistryRequests bool
	}{
		{
			"ignored tags skipped, tag not ignored fetched",
			[]hub.ContainerImageTag{
				{Name: "1.0.0", Mutable: true},
				{Name: "2.0.0", Mutable: false},
				{Name: "3.0.0", Mutable: false},
				{Name: "v4.0.0", Mutable: true},
			},
			true,
		},
		{
			"all tags to process ignored",
			[]hub.ContainerImageTag{
				{Name: "1.0.0", Mutable: true},
				{Name: "2.0.0", Mutable: false},
				{Name: "3.0.0", Mutable: false},
			},
			false,
		},
	}
	for _, tc := range testCases {
		t.Run(tc.desc, func(t *testing.T) {
			t.Parallel()

			// Setup fake registry
			var requests atomic.Int64
			registry := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				requests.Add(1)
				w.WriteHeader(http.StatusNotFound)
			}))
			defer registry.Close()
			host := strings.TrimPrefix(registry.URL, "http://")

			// Setup services and expectations
			sw := source.NewTestsServicesWrapper()
			sw.Ec.Test(t)
			sw.Hc.Test(t)
			sw.Op.Test(t)
			sw.Is.Test(t)
			sw.Sc.Test(t)
			var logs bytes.Buffer
			sw.Svc.Logger = zerolog.New(zerolog.SyncWriter(&logs))
			data, err := json.Marshal(hub.ContainerImageData{Tags: tc.tags})
			require.NoError(t, err)
			i := &hub.TrackerSourceInput{
				Repository: &hub.Repository{
					RepositoryID: "repo1",
					URL:          hub.RepositoryOCIPrefix + host + "/ns/img",
					Data:         data,
				},
				RepositoryMetadata: &hub.RepositoryMetadata{
					Ignore: []*hub.RepositoryIgnoreEntry{
						{
							Name: "img",
							// 4 matches a normalized 4.0.0, but not the raw v4.0.0 tag
							Version: `^[124]\.0\.0$`,
						},
					},
				},
				PackagesRegistered: map[string]string{
					"img@2.0.0": "digest2",
					"img@3.0.0": "digest3",
				},
				Svc: sw.Svc,
			}
			if tc.expectRegistryRequests {
				sw.Ec.On("Append", "repo1", mock.Anything).Return().Once()
			}

			// Run test and check expectations
			packages, err := NewTrackerSource(i).GetPackagesAvailable()
			require.NoError(t, err)
			assert.Equal(t, map[string]*hub.Package{
				"img@3.0.0": {
					Name:    "img",
					Version: "3.0.0",
					Digest:  hub.HasNotChanged,
				},
			}, packages)
			if tc.expectRegistryRequests {
				assert.Positive(t, requests.Load())
			} else {
				assert.Zero(t, requests.Load())
			}
			assert.NotContains(t, logs.String(), "recover")
			sw.AssertExpectations(t)
		})
	}
}
