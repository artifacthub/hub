package tekton

import (
	"bytes"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/pkg"
	"github.com/artifacthub/hub/internal/tracker/source"
	"github.com/go-git/go-git/v5"
	"github.com/go-git/go-git/v5/plumbing/object"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
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
		expectedErr := "error getting package manifest (path: testdata/path2/task1/0.1): error validating manifest: 1 error occurred:\n\t* invalid version (semver expected): invalid semantic version\n\n"
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
			Digest:      "71cb438c009785420747d5409ad016a6792135c6d1555984508ba6da6dec79cf",
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
			Deprecated: true,
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

	t.Run("version entries that are not directories are skipped (dir based)", func(t *testing.T) {
		t.Parallel()

		// Setup catalog with a version entry that is a regular file
		basePath := t.TempDir()
		require.NoError(t, os.Mkdir(filepath.Join(basePath, "task1"), 0o755))
		require.NoError(t, os.WriteFile(filepath.Join(basePath, "task1", "0.2.0"), []byte("not a dir"), 0o600))

		// Setup services and expectations
		sw := source.NewTestsServicesWrapper()
		i := &hub.TrackerSourceInput{
			Repository: &hub.Repository{
				Kind: hub.TektonTask,
				Data: json.RawMessage(fmt.Sprintf(`{"versioning": "%s"}`, hub.TektonDirBasedVersioning)),
			},
			BasePath: basePath,
			Svc:      sw.Svc,
		}

		// Run test and check expectations
		packages, err := NewTrackerSource(i).GetPackagesAvailable()
		assert.Equal(t, map[string]*hub.Package{}, packages)
		assert.NoError(t, err)
		sw.AssertExpectations(t)
	})

	t.Run("ignored package not returned (git based)", func(t *testing.T) {
		t.Parallel()

		// Setup git based catalog with two versions of a task
		repoPath := t.TempDir()
		basePath := filepath.Join(repoPath, "catalog")
		gr, err := git.PlainInit(repoPath, false)
		require.NoError(t, err)
		wt, err := gr.Worktree()
		require.NoError(t, err)
		manifest, err := os.ReadFile("testdata/path3/task1/0.1/task1.yaml")
		require.NoError(t, err)
		require.NoError(t, os.MkdirAll(filepath.Join(basePath, "task1"), 0o755))
		manifestPath := filepath.Join(basePath, "task1", "task1.yaml")
		for _, version := range []string{"0.1.0", "0.2.0"} {
			versionManifest := bytes.Replace(
				manifest,
				[]byte(`app.kubernetes.io/version: "0.1.0"`),
				[]byte(`app.kubernetes.io/version: "`+version+`"`),
				1,
			)
			require.Contains(t, string(versionManifest), `app.kubernetes.io/version: "`+version+`"`)
			err := os.WriteFile(manifestPath, versionManifest, 0o600) // #nosec G703 -- test path is under t.TempDir()
			require.NoError(t, err)
			_, err = wt.Add("catalog/task1/task1.yaml")
			require.NoError(t, err)
			hash, err := wt.Commit("version "+version, &git.CommitOptions{
				Author: &object.Signature{Name: "test", Email: "test@email.com", When: time.Now()},
			})
			require.NoError(t, err)
			_, err = gr.CreateTag("v"+version, hash, nil)
			require.NoError(t, err)
		}

		// Setup services and expectations
		sw := source.NewTestsServicesWrapper()
		i := &hub.TrackerSourceInput{
			Repository: &hub.Repository{
				Kind: hub.TektonTask,
				URL:  "https://github.com/user/repo/path",
				Data: json.RawMessage(fmt.Sprintf(`{"versioning": "%s"}`, hub.TektonGitBasedVersioning)),
			},
			RepositoryMetadata: &hub.RepositoryMetadata{
				Ignore: []*hub.RepositoryIgnoreEntry{{Name: "task1", Version: `^0\.1\.0$`}},
			},
			BasePath: basePath,
			Svc:      sw.Svc,
		}

		// Run test and check expectations
		packages, err := NewTrackerSource(i).GetPackagesAvailable()
		assert.NoError(t, err)
		require.Len(t, packages, 1)
		require.Contains(t, packages, "task1@0.2.0")
		assert.Equal(t, "task1", packages["task1@0.2.0"].Name)
		assert.Equal(t, "0.2.0", packages["task1@0.2.0"].Version)
		sw.AssertExpectations(t)
	})
}

func TestTrackerSourceIgnoredPackages(t *testing.T) {
	t.Parallel()

	testCases := []struct {
		desc             string
		ignoredVersion   string
		expectedReturned bool
	}{
		{
			"ignored package not returned",
			`^0\.1\.0$`,
			false,
		},
		{
			"package returned when ignore entry version does not match",
			`^0\.2\.0$`,
			true,
		},
	}
	for _, tc := range testCases {
		t.Run(tc.desc, func(t *testing.T) {
			t.Parallel()

			// Setup services and expectations
			sw := source.NewTestsServicesWrapper()
			r := &hub.Repository{
				Kind: hub.TektonTask,
				URL:  "https://github.com/user/repo/path",
				Data: json.RawMessage(fmt.Sprintf(`{"versioning": "%s"}`, hub.TektonDirBasedVersioning)),
			}
			i := &hub.TrackerSourceInput{
				Repository: r,
				RepositoryMetadata: &hub.RepositoryMetadata{
					Ignore: []*hub.RepositoryIgnoreEntry{{Name: "task1", Version: tc.ignoredVersion}},
				},
				BasePath: "testdata/path3",
				Svc:      sw.Svc,
			}

			// Run test and check expectations (when returned, the package must
			// be the same as the one returned without an ignore list)
			expectedPackages := map[string]*hub.Package{}
			if tc.expectedReturned {
				var err error
				expectedPackages, err = NewTrackerSource(&hub.TrackerSourceInput{
					Repository: r,
					BasePath:   "testdata/path3",
					Svc:        sw.Svc,
				}).GetPackagesAvailable()
				require.NoError(t, err)
				require.Len(t, expectedPackages, 1)
				require.Contains(t, expectedPackages, "task1@0.1.0")
			}
			packages, err := NewTrackerSource(i).GetPackagesAvailable()
			assert.Equal(t, expectedPackages, packages)
			assert.NoError(t, err)
			sw.AssertExpectations(t)
		})
	}
}
