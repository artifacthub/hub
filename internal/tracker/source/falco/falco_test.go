package falco

import (
	"testing"

	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/pkg"
	"github.com/artifacthub/hub/internal/tests"
	"github.com/artifacthub/hub/internal/tracker/source"
	"github.com/stretchr/testify/assert"
)

func TestTrackerSource(t *testing.T) {
	basePkg := &hub.Package{
		Name:        "test",
		Description: "Short description",
		Keywords:    []string{"kw1", "kw2"},
		Readme:      "Description",
		Version:     "0.1.0",
		Provider:    "Sample provider",
		Links: []*hub.Link{
			{
				Name: "source",
				URL:  "https://github.com/org1/repo1/blob/main/path/to/packages/test.yaml",
			},
		},
	}
	logoImageURL := "https://icon.url"

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
		expectedErr := "error unmarshaling rules metadata file: yaml: line 3: found unexpected end of stream"
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
		expectedErr := "error preparing package: invalid package (test) version (invalid): invalid semantic version"
		sw.Ec.On("Append", i.Repository.RepositoryID, expectedErr).Return()

		// Run test and check expectations
		packages, err := NewTrackerSource(i).GetPackagesAvailable()
		assert.Equal(t, map[string]*hub.Package{}, packages)
		assert.NoError(t, err)
		sw.AssertExpectations(t)
	})

	t.Run("error getting logo image, package returned anyway", func(t *testing.T) {
		t.Parallel()

		// Setup services and expectations
		sw := source.NewTestsServicesWrapper()
		i := &hub.TrackerSourceInput{
			Repository: &hub.Repository{
				URL:    "https://github.com/org1/repo1/path/to/packages",
				Branch: "main",
			},
			BasePath: "testdata/path4",
			Svc:      sw.Svc,
		}
		sw.Is.On("DownloadAndSaveImage", sw.Svc.Ctx, logoImageURL).Return("", tests.ErrFake)
		expectedErr := "error getting package test version 0.1.0 logo image: fake error for tests"
		sw.Ec.On("Append", i.Repository.RepositoryID, expectedErr).Return()

		// Run test and check expectations
		p := source.ClonePackage(basePkg)
		p.Repository = i.Repository
		p.Data = map[string]interface{}{
			rulesKey: []*Rule{{Raw: "Falco rules in YAML"}},
		}
		packages, err := NewTrackerSource(i).GetPackagesAvailable()
		assert.Equal(t, map[string]*hub.Package{
			pkg.BuildKey(p): p,
		}, packages)
		assert.NoError(t, err)
		sw.AssertExpectations(t)
	})

	t.Run("one package returned, no errors", func(t *testing.T) {
		t.Parallel()

		// Setup services and expectations
		sw := source.NewTestsServicesWrapper()
		i := &hub.TrackerSourceInput{
			Repository: &hub.Repository{
				URL:    "https://github.com/org1/repo1/path/to/packages",
				Branch: "main",
			},
			BasePath: "testdata/path4",
			Svc:      sw.Svc,
		}
		sw.Is.On("DownloadAndSaveImage", sw.Svc.Ctx, logoImageURL).Return("logoImageID", nil)

		// Run test and check expectations
		p := source.ClonePackage(basePkg)
		p.Repository = i.Repository
		p.LogoURL = logoImageURL
		p.LogoImageID = "logoImageID"
		p.Data = map[string]interface{}{
			rulesKey: []*Rule{{Raw: "Falco rules in YAML"}},
		}
		packages, err := NewTrackerSource(i).GetPackagesAvailable()
		assert.Equal(t, map[string]*hub.Package{
			pkg.BuildKey(p): p,
		}, packages)
		assert.NoError(t, err)
		sw.AssertExpectations(t)
	})

	t.Run("ignored package not returned, logo not processed", func(t *testing.T) {
		t.Parallel()

		// Setup services and expectations
		sw := source.NewTestsServicesWrapper()
		i := &hub.TrackerSourceInput{
			Repository: &hub.Repository{
				URL:    "https://github.com/org1/repo1/path/to/packages",
				Branch: "main",
			},
			RepositoryMetadata: &hub.RepositoryMetadata{
				Ignore: []*hub.RepositoryIgnoreEntry{{Name: "test", Version: `^0\.1\.0$`}},
			},
			BasePath: "testdata/path4",
			Svc:      sw.Svc,
		}

		// Run test and check expectations
		packages, err := NewTrackerSource(i).GetPackagesAvailable()
		assert.Equal(t, map[string]*hub.Package{}, packages)
		assert.NoError(t, err)
		sw.AssertExpectations(t)
	})

	t.Run("package returned when ignore entry version does not match", func(t *testing.T) {
		t.Parallel()

		// Setup services and expectations
		sw := source.NewTestsServicesWrapper()
		i := &hub.TrackerSourceInput{
			Repository: &hub.Repository{
				URL:    "https://github.com/org1/repo1/path/to/packages",
				Branch: "main",
			},
			RepositoryMetadata: &hub.RepositoryMetadata{
				Ignore: []*hub.RepositoryIgnoreEntry{{Name: "test", Version: `^0\.2\.0$`}},
			},
			BasePath: "testdata/path4",
			Svc:      sw.Svc,
		}
		sw.Is.On("DownloadAndSaveImage", sw.Svc.Ctx, logoImageURL).Return("logoImageID", nil)

		// Run test and check expectations
		p := source.ClonePackage(basePkg)
		p.Repository = i.Repository
		p.LogoURL = logoImageURL
		p.LogoImageID = "logoImageID"
		p.Data = map[string]interface{}{
			rulesKey: []*Rule{{Raw: "Falco rules in YAML"}},
		}
		packages, err := NewTrackerSource(i).GetPackagesAvailable()
		assert.Equal(t, map[string]*hub.Package{
			pkg.BuildKey(p): p,
		}, packages)
		assert.NoError(t, err)
		sw.AssertExpectations(t)
	})

	t.Run("source links generated for supported git hosting providers", func(t *testing.T) {
		t.Parallel()

		testCases := []struct {
			name              string
			url               string
			branch            string
			expectedSourceURL string
		}{
			{
				name:              "codeberg",
				url:               "https://codeberg.org/org1/repo1/path/to/packages",
				branch:            "main",
				expectedSourceURL: "https://codeberg.org/org1/repo1/src/branch/main/path/to/packages/test.yaml",
			},
			{
				name:              "gitlab subgroup with .git delimiter",
				url:               "https://gitlab.com/org1/sub/repo1.git/path/to/packages",
				branch:            "main",
				expectedSourceURL: "https://gitlab.com/org1/sub/repo1/-/blob/main/path/to/packages/test.yaml",
			},
			{
				name:              "sourcehut",
				url:               "https://git.sr.ht/~org1/repo1/path/to/packages",
				branch:            "main",
				expectedSourceURL: "https://git.sr.ht/~org1/repo1/tree/main/item/path/to/packages/test.yaml",
			},
			{
				name:              "bitbucket",
				url:               "https://bitbucket.org/org1/repo1/path/to/packages",
				branch:            "main",
				expectedSourceURL: "https://bitbucket.org/org1/repo1/src/main/path/to/packages/test.yaml",
			},
		}

		for _, tc := range testCases {
			t.Run(tc.name, func(t *testing.T) {
				t.Parallel()

				sw := source.NewTestsServicesWrapper()
				i := &hub.TrackerSourceInput{
					Repository: &hub.Repository{
						URL:    tc.url,
						Branch: tc.branch,
					},
					BasePath: "testdata/path4",
					Svc:      sw.Svc,
				}
				sw.Is.On("DownloadAndSaveImage", sw.Svc.Ctx, logoImageURL).Return("logoImageID", nil)

				packages, err := NewTrackerSource(i).GetPackagesAvailable()
				assert.NoError(t, err)
				assert.Len(t, packages, 1)
				for _, p := range packages {
					assert.Equal(t, []*hub.Link{{Name: "source", URL: tc.expectedSourceURL}}, p.Links)
				}
				sw.AssertExpectations(t)
			})
		}
	})
}
