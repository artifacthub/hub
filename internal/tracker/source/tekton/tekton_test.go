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
			Repository: &hub.Repository{
				Kind: hub.TektonTask,
			},
			BasePath: "testdata/path1",
			Svc:      sw.Svc,
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
			Repository: &hub.Repository{
				Kind: hub.TektonTask,
			},
			BasePath: "testdata/path2",
			Svc:      sw.Svc,
		}
		expectedErr := "error getting package manifest (path: testdata/path2/task1/0.1): error validating manifest: 1 error occurred:\n\t* invalid version (semver expected): Invalid Semantic Version\n\n"
		sw.Ec.On("Append", i.Repository.RepositoryID, expectedErr).Return()

		// Run test and check expectations
		packages, err := NewTrackerSource(i).GetPackagesAvailable()
		assert.Equal(t, map[string]*hub.Package{}, packages)
		assert.NoError(t, err)
		sw.AssertExpectations(t)
	})

	t.Run("one package returned (tekton-task), no errors", func(t *testing.T) {
		t.Parallel()

		// Setup services and expectations
		sw := source.NewTestsServicesWrapper()
		i := &hub.TrackerSourceInput{
			Repository: &hub.Repository{
				Kind: hub.TektonTask,
				URL:  "https://github.com/user/repo/path",
			},
			BasePath: "testdata/path3",
			Svc:      sw.Svc,
		}

		// Run test and check expectations
		manifestRaw, _ := ioutil.ReadFile("testdata/path3/task1/0.1/task1.yaml")
		var tasks []map[string]interface{}
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
				PipelinesMinVersionKey: "0.12.1",
				RawManifestKey:         string(manifestRaw),
				TasksKey:               tasks,
			},
		}
		packages, err := NewTrackerSource(i).GetPackagesAvailable()
		assert.Equal(t, map[string]*hub.Package{
			pkg.BuildKey(p): p,
		}, packages)
		assert.NoError(t, err)
		sw.AssertExpectations(t)
	})

	t.Run("one package returned (tekton-pipeline), no errors", func(t *testing.T) {
		t.Parallel()

		// Setup services and expectations
		sw := source.NewTestsServicesWrapper()
		i := &hub.TrackerSourceInput{
			Repository: &hub.Repository{
				Kind: hub.TektonPipeline,
				URL:  "https://github.com/user/repo/path",
			},
			BasePath: "testdata/path4",
			Svc:      sw.Svc,
		}

		// Run test and check expectations
		manifestRaw, _ := ioutil.ReadFile("testdata/path4/pipeline1/0.1/pipeline1.yaml")
		p := &hub.Package{
			Name:        "pipeline1",
			DisplayName: "Pipeline 1",
			Description: "Test pipeline",
			Keywords:    []string{"tekton", "pipeline", "tag1", "tag2"},
			Readme:      "This is just a test pipeline\n",
			Version:     "0.1.0",
			Provider:    "Some organization",
			ContentURL:  "https://github.com/user/repo/raw/master/path/pipeline1/0.1/pipeline1.yaml",
			Repository:  i.Repository,
			License:     "Apache-2.0",
			Links: []*hub.Link{
				{
					Name: "source",
					URL:  "https://github.com/user/repo/blob/master/path/pipeline1/0.1/pipeline1.yaml",
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
				PipelinesMinVersionKey: "0.12.1",
				RawManifestKey:         string(manifestRaw),
				TasksKey: []map[string]interface{}{
					{
						"name":      "task1",
						"run_after": []string{},
					},
					{
						"name":      "task2",
						"run_after": []string{"task1"},
					},
					{
						"name":      "task3",
						"run_after": []string{"task1", "task2"},
					},
				},
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
