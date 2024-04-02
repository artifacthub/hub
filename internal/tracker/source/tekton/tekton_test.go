package tekton

import (
	"encoding/json"
	"fmt"
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
			Repository: &hub.Repository{
				Kind: hub.TektonTask,
				Data: json.RawMessage(fmt.Sprintf(`{"versioning": "%s"}`, hub.TektonDirBasedVersioning)),
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
				Data: json.RawMessage(fmt.Sprintf(`{"versioning": "%s"}`, hub.TektonDirBasedVersioning)),
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
				Data: json.RawMessage(fmt.Sprintf(`{"versioning": "%s"}`, hub.TektonDirBasedVersioning)),
			},
			BasePath: "testdata/path3",
			Svc:      sw.Svc,
		}

		// Run test and check expectations
		manifestRaw, _ := os.ReadFile("testdata/path3/task1/0.1/task1.yaml")
		var tasks []map[string]interface{}
		p := &hub.Package{
			Name:        "task1",
			DisplayName: "Task 1",
			Description: "Test task",
			Category:    hub.Security,
			Keywords:    []string{"tekton", "task", "tag1", "tag2"},
			Readme:      "This is just a test task\n",
			Version:     "0.1.0",
			Provider:    "Some organization",
			ContentURL:  "https://github.com/user/repo/raw/master/path/task1/0.1/task1.yaml",
			Digest:      "d3174c6939c4eba748fb1e1136ccf897e8a70c90e6b3b495602a98dcac233777",
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
			Screenshots: []*hub.Screenshot{
				{
					Title: "Screenshot 1",
					URL:   "https://artifacthub.io/screenshot1.jpg",
				},
			},
			Data: map[string]interface{}{
				PipelinesMinVersionKey: "0.12.1",
				RawManifestKey:         string(manifestRaw),
				TasksKey:               tasks,
				PlatformsKey:           []string{"linux/amd64", "linux/arm64"},
				ExamplesKey: map[string]string{
					"sample1.yaml": "sample content\n",
				},
			},
			Signatures: []string{tekton},
			Signed:     true,
			ContainersImages: []*hub.ContainerImage{
				{
					Image: "bash:latest",
				},
				{
					Image: "alphine",
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

	t.Run("one package returned (tekton-pipeline), no errors", func(t *testing.T) {
		t.Parallel()

		// Setup services and expectations
		sw := source.NewTestsServicesWrapper()
		i := &hub.TrackerSourceInput{
			Repository: &hub.Repository{
				Kind: hub.TektonPipeline,
				URL:  "https://github.com/user/repo/path",
				Data: json.RawMessage(fmt.Sprintf(`{"versioning": "%s"}`, hub.TektonDirBasedVersioning)),
			},
			BasePath: "testdata/path4",
			Svc:      sw.Svc,
		}

		// Run test and check expectations
		manifestRaw, _ := os.ReadFile("testdata/path4/pipeline1/0.1/pipeline1.yaml")
		p := &hub.Package{
			Name:        "pipeline1",
			DisplayName: "Pipeline 1",
			Description: "Test pipeline",
			Keywords:    []string{"tekton", "pipeline", "tag1", "tag2"},
			Readme:      "This is just a test pipeline\n",
			Version:     "0.1.0",
			Provider:    "Some organization",
			ContentURL:  "https://github.com/user/repo/raw/master/path/pipeline1/0.1/pipeline1.yaml",
			Digest:      "f267eb9b1347935e55503cde2a17abf896af2a1a6fc52b903632e687d509a5e3",
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
			Screenshots: []*hub.Screenshot{
				{
					Title: "Screenshot 1",
					URL:   "https://artifacthub.io/screenshot1.jpg",
				},
			},
			Data: map[string]interface{}{
				PipelinesMinVersionKey: "0.12.1",
				RawManifestKey:         string(manifestRaw),
				TasksKey: []map[string]interface{}{
					{
						"name":      "say-hello",
						"run_after": []string{},
					},
					{
						"name":      "say-world",
						"run_after": []string{"say-hello"},
					},
					{
						"name":      "say-final",
						"run_after": []string{"say-world", "say-hello"},
					},
				},
				PlatformsKey: []string{"linux/amd64", "linux/arm64"},
				ExamplesKey: map[string]string{
					"sample1.yaml": "sample content\n",
				},
			},
			Signatures: []string{tekton},
			Signed:     true,
			ContainersImages: []*hub.ContainerImage{
				{
					Image: "bash:latest",
				},
				{
					Image: "alpine",
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

	t.Run("one package returned (tekton-stepaction), no errors", func(t *testing.T) {
		t.Parallel()

		// Setup services and expectations
		sw := source.NewTestsServicesWrapper()
		i := &hub.TrackerSourceInput{
			Repository: &hub.Repository{
				Kind: hub.TektonStepAction,
				URL:  "https://github.com/user/repo/path",
				Data: json.RawMessage(fmt.Sprintf(`{"versioning": "%s"}`, hub.TektonDirBasedVersioning)),
			},
			BasePath: "testdata/path5",
			Svc:      sw.Svc,
		}

		// Run test and check expectations
		manifestRaw, _ := os.ReadFile("testdata/path5/stepaction1/0.1/stepaction1.yaml")
		var tasks []map[string]interface{}
		p := &hub.Package{
			Name:        "stepaction1",
			DisplayName: "StepAction 1",
			Description: "StepAction 1 StepAction",
			Keywords:    []string{"tekton", "stepaction", "tag1", "tag2"},
			Readme:      "This is just a test stepaction\n",
			Version:     "0.1.0",
			Provider:    "Some organization",
			ContentURL:  "https://github.com/user/repo/raw/master/path/stepaction1/0.1/stepaction1.yaml",
			Digest:      "530682380f55de185372b1f2c776c0ef82b75273e33f9af34fa0279a9fb8ee0f",
			Repository:  i.Repository,
			License:     "Apache-2.0",
			Links: []*hub.Link{
				{
					Name: "source",
					URL:  "https://github.com/user/repo/blob/master/path/stepaction1/0.1/stepaction1.yaml",
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
			Screenshots: []*hub.Screenshot{
				{
					Title: "Screenshot 1",
					URL:   "https://artifacthub.io/screenshot1.jpg",
				},
			},
			Data: map[string]interface{}{
				PipelinesMinVersionKey: "0.54.0",
				RawManifestKey:         string(manifestRaw),
				TasksKey:               tasks,
				PlatformsKey:           []string{"linux/amd64", "linux/arm64"},
				ExamplesKey: map[string]string{
					"sample1.yaml": "sample content\n",
				},
			},
			Signatures: []string{tekton},
			Signed:     true,
		}
		packages, err := NewTrackerSource(i).GetPackagesAvailable()
		assert.Equal(t, map[string]*hub.Package{
			pkg.BuildKey(p): p,
		}, packages)
		assert.NoError(t, err)
		sw.AssertExpectations(t)
	})
}
