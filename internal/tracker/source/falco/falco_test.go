package falco

import (
	"bytes"
	"io/ioutil"
	"net/http"
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
				URL:  "https://github.com/org1/repo1/blob/master/path/to/packages/test.yaml",
			},
		},
	}
	imageData, _ := ioutil.ReadFile("testdata/red-dot.png")

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
		expectedErr := "error preparing package: invalid package (test) version (invalid): Invalid Semantic Version"
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
				URL: "https://github.com/org1/repo1/path/to/packages",
			},
			BasePath: "testdata/path4",
			Svc:      sw.Svc,
		}
		req, _ := http.NewRequest("GET", "https://icon.url", nil)
		sw.Hc.On("Do", req).Return(nil, tests.ErrFake)
		expectedErr := "error downloading package test version 0.1.0 image: fake error for tests"
		sw.Ec.On("Append", i.Repository.RepositoryID, expectedErr).Return()

		// Run test and check expectations
		p := source.ClonePackage(basePkg)
		p.Repository = i.Repository
		p.Data = map[string]interface{}{
			"rules": []*Rule{{Raw: "Falco rules in YAML"}},
		}
		packages, err := NewTrackerSource(i).GetPackagesAvailable()
		assert.Equal(t, map[string]*hub.Package{
			pkg.BuildKey(p): p,
		}, packages)
		assert.NoError(t, err)
		sw.AssertExpectations(t)
	})

	t.Run("error saving logo image, package returned anyway", func(t *testing.T) {
		t.Parallel()

		// Setup services and expectations
		sw := source.NewTestsServicesWrapper()
		i := &hub.TrackerSourceInput{
			Repository: &hub.Repository{
				URL: "https://github.com/org1/repo1/path/to/packages",
			},
			BasePath: "testdata/path4",
			Svc:      sw.Svc,
		}
		req, _ := http.NewRequest("GET", "https://icon.url", nil)
		sw.Hc.On("Do", req).Return(&http.Response{
			Body:       ioutil.NopCloser(bytes.NewReader(imageData)),
			StatusCode: http.StatusOK,
		}, nil)
		sw.Is.On("SaveImage", sw.Svc.Ctx, imageData).Return("", tests.ErrFake)
		expectedErr := "error saving package test version 0.1.0 image: fake error for tests"
		sw.Ec.On("Append", i.Repository.RepositoryID, expectedErr).Return()

		// Run test and check expectations
		p := source.ClonePackage(basePkg)
		p.Repository = i.Repository
		p.LogoURL = "https://icon.url"
		p.Data = map[string]interface{}{
			"rules": []*Rule{{Raw: "Falco rules in YAML"}},
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
				URL: "https://github.com/org1/repo1/path/to/packages",
			},
			BasePath: "testdata/path4",
			Svc:      sw.Svc,
		}
		req, _ := http.NewRequest("GET", "https://icon.url", nil)
		sw.Hc.On("Do", req).Return(&http.Response{
			Body:       ioutil.NopCloser(bytes.NewReader(imageData)),
			StatusCode: http.StatusOK,
		}, nil)
		sw.Is.On("SaveImage", sw.Svc.Ctx, imageData).Return("logoImageID", nil)

		// Run test and check expectations
		p := source.ClonePackage(basePkg)
		p.Repository = i.Repository
		p.LogoURL = "https://icon.url"
		p.LogoImageID = "logoImageID"
		p.Data = map[string]interface{}{
			"rules": []*Rule{{Raw: "Falco rules in YAML"}},
		}
		packages, err := NewTrackerSource(i).GetPackagesAvailable()
		assert.Equal(t, map[string]*hub.Package{
			pkg.BuildKey(p): p,
		}, packages)
		assert.NoError(t, err)
		sw.AssertExpectations(t)
	})
}
