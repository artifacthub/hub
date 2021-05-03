package tekton

import (
	"io/ioutil"
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

	t.Run("invalid version in package metadata file", func(t *testing.T) {
		t.Parallel()

		// Setup services and expectations
		sw := source.NewTestsServicesWrapper()
		i := &hub.TrackerSourceInput{
			Repository: &hub.Repository{},
			BasePath:   "testdata/path2",
			Svc:        sw.Svc,
		}
		expectedErr := "invalid package (task1) version (invalid): Invalid Semantic Version"
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
			Repository: &hub.Repository{
				URL: "https://github.com/user/repo/path",
			},
			BasePath: "testdata/path3",
			Svc:      sw.Svc,
		}

		// Run test and check expectations
		manifestRaw, _ := ioutil.ReadFile("testdata/path3/task1/0.1/task1.yaml")
		p := &hub.Package{
			Name:        "task1",
			DisplayName: "Task 1",
			Description: "Test task",
			Keywords:    []string{"tekton", "task", "tag1", "tag2"},
			Readme:      "This is just a test task\n",
			Version:     "0.1.0",
			Provider:    "Some organization",
			ContentURL:  "https://github.com/user/repo/raw/master/path/task1/0.1/task1.yaml",
			Repository:  i.Repository,
			License:     "Apache-2.0",
			Links: []*hub.Link{
				{
					Name: "source",
					URL:  "https://github.com/user/repo/blob/master/path/task1/0.1/task1.yaml",
				},
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
			Data: map[string]interface{}{
				"manifestRaw":          string(manifestRaw),
				"pipelines.minVersion": "0.12.1",
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
