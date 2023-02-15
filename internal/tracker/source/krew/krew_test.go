package krew

import (
	"os"
	"testing"

	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/pkg"
	"github.com/artifacthub/hub/internal/tracker/source"
	"github.com/stretchr/testify/assert"
)

func TestTrackerSource(t *testing.T) {
	t.Run("no packages in path", func(t *testing.T) {
		t.Parallel()

		// Setup services and expectations
		sw := source.NewTestsServicesWrapper()
		i := &hub.TrackerSourceInput{
			Repository: &hub.Repository{},
			BasePath:   "testdata/path1",
			Svc:        sw.Svc,
		}

		// Run test and check expectations
		packages, err := NewTrackerSource(i).GetPackagesAvailable()
		assert.Equal(t, map[string]*hub.Package{}, packages)
		assert.NoError(t, err)
		sw.AssertExpectations(t)
	})

	t.Run("invalid package metadata file", func(t *testing.T) {
		t.Parallel()

		// Setup services and expectations
		sw := source.NewTestsServicesWrapper()
		i := &hub.TrackerSourceInput{
			Repository: &hub.Repository{},
			BasePath:   "testdata/path2",
			Svc:        sw.Svc,
		}
		expectedErr := "error getting package manifest (path: testdata/path2/plugins/manifest.yaml): error unmarshaling plugin manifest file: error converting YAML to JSON: yaml: line 3: found unexpected end of stream"
		sw.Ec.On("Append", i.Repository.RepositoryID, expectedErr).Return()

		// Run test and check expectations
		packages, err := NewTrackerSource(i).GetPackagesAvailable()
		assert.Equal(t, map[string]*hub.Package{}, packages)
		assert.NoError(t, err)
		sw.AssertExpectations(t)
	})

	t.Run("invalid version in package metadata file", func(t *testing.T) {
		t.Parallel()

		// Setup services and expectations
		sw := source.NewTestsServicesWrapper()
		i := &hub.TrackerSourceInput{
			Repository: &hub.Repository{},
			BasePath:   "testdata/path3",
			Svc:        sw.Svc,
		}
		expectedErr := "error getting package manifest (path: testdata/path3/plugins/manifest.yaml): error validating plugin manifest: 1 error occurred:\n\t* invalid version (semver expected): Invalid Semantic Version\n\n"
		sw.Ec.On("Append", i.Repository.RepositoryID, expectedErr).Return()

		// Run test and check expectations
		packages, err := NewTrackerSource(i).GetPackagesAvailable()
		assert.Equal(t, map[string]*hub.Package{}, packages)
		assert.NoError(t, err)
		sw.AssertExpectations(t)
	})

	t.Run("one package returned, no errors", func(t *testing.T) {
		t.Parallel()

		// Setup services and expectations
		sw := source.NewTestsServicesWrapper()
		i := &hub.TrackerSourceInput{
			Repository: &hub.Repository{},
			BasePath:   "testdata/path4",
			Svc:        sw.Svc,
		}

		// Run test and check expectations
		manifestRaw, _ := os.ReadFile("testdata/path4/plugins/manifest.yaml")
		p := &hub.Package{
			Name:        "test-plugin",
			DisplayName: "My test plugin",
			Description: "Test plugin",
			Category:    hub.Security,
			HomeURL:     "https://test/plugin",
			Keywords:    []string{"kubernetes", "kubectl", "plugin", "networking", "security"},
			Readme:      "This is just a test plugin",
			Version:     "0.1.0",
			Provider:    "Some organization",
			Repository:  i.Repository,
			License:     "Apache-2.0",
			Links: []*hub.Link{
				{
					Name: "link1",
					URL:  "https://link1.url",
				},
				{
					Name: "link2",
					URL:  "https://link2.url",
				},
			},
			Maintainers: []*hub.Maintainer{
				{
					Name:  "user1",
					Email: "user1@email.com",
				},
				{
					Name:  "user2",
					Email: "user2@email.com",
				},
			},
			Changes: []*hub.Change{
				{
					Description: "Added cool feature",
				},
				{
					Description: "Fixed minor bug",
				},
			},
			Recommendations: []*hub.Recommendation{
				{
					URL: "https://artifacthub.io/packages/helm/artifact-hub/artifact-hub",
				},
			},
			Screenshots: []*hub.Screenshot{
				{
					Title: "Screenshot 1",
					URL:   "https://artifacthub.io/screenshot1.jpg",
				},
			},
			Data: map[string]interface{}{
				RawManifestKey: string(manifestRaw),
				PlatformsKey:   []string{"linux/amd64"},
			},
		}
		packages, err := NewTrackerSource(i).GetPackagesAvailable()
		assert.Equal(t, map[string]*hub.Package{
			pkg.BuildKey(p): p,
		}, packages)
		assert.NoError(t, err)
		sw.AssertExpectations(t)
	})
}
