package olm

import (
	"os"
	"testing"

	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/pkg"
	"github.com/artifacthub/hub/internal/tests"
	"github.com/artifacthub/hub/internal/tracker/source"
	"github.com/stretchr/testify/assert"
)

func TestTrackerSource(t *testing.T) {
	basePkg := &hub.Package{
		Name:         "test-operator",
		DisplayName:  "Test Operator",
		Description:  "This is just a test",
		Keywords:     []string{"Test", "Application Runtime"},
		Readme:       "Test Operator README",
		Version:      "0.1.0",
		IsOperator:   true,
		Capabilities: "Basic Install",
		ContainersImages: []*hub.ContainerImage{
			{
				Image: "repo.url:latest",
			},
			{
				Name:  "image1",
				Image: "registry.io/image1:1.0.0",
			},
			{
				Name:        "image2",
				Image:       "registry.io/image2:1.0.0",
				Whitelisted: true,
			},
		},
		Provider: "Test",
		TS:       1561735380,
		Channels: []*hub.Channel{
			{
				Name:    "alpha",
				Version: "0.1.0",
			},
		},
		DefaultChannel: "alpha",
		License:        "Apache-2.0",
		Links: []*hub.Link{
			{
				Name: "Sample link",
				URL:  "https://sample.link",
			},
			{
				Name: "source",
				URL:  "https://github.com/test/test-operator",
			},
		},
		Changes: []*hub.Change{
			{
				Description: "feature 1",
			},
			{
				Description: "fix 1",
			},
		},
		ContainsSecurityUpdates: true,
		Prerelease:              true,
		Install:                 "Install instructions (markdown)\n",
		Maintainers: []*hub.Maintainer{
			{
				Name:  "Test",
				Email: "test@email.com",
			},
		},
		CRDs: []interface{}{
			map[string]interface{}{
				"description": "Test CRD",
				"displayName": "Test",
				"kind":        "Test",
				"name":        "test.crds.com",
				"version":     "v1",
			},
		},
		CRDsExamples: []interface{}{
			map[string]interface{}{
				"apiVersion": "crds.com/v1",
				"kind":       "Test",
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
			formatKey:           "packageManifest",
			isGlobalOperatorKey: true,
		},
	}
	imageData, _ := os.ReadFile("testdata/red-dot.png")

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

	t.Run("invalid csv file name", func(t *testing.T) {
		t.Parallel()

		// Setup services and expectations
		sw := source.NewTestsServicesWrapper()
		i := &hub.TrackerSourceInput{
			Repository: &hub.Repository{},
			BasePath:   "testdata/path2",
			Svc:        sw.Svc,
		}
		expectedErr := "error getting package metadata: error getting package test-operator csv (path: testdata/path2/test-operator/0.1.0): csv file not found"
		sw.Ec.On("Append", i.Repository.RepositoryID, expectedErr).Return()

		// Run test and check expectations
		packages, err := NewTrackerSource(i).GetPackagesAvailable()
		assert.Equal(t, map[string]*hub.Package{}, packages)
		assert.NoError(t, err)
		sw.AssertExpectations(t)
	})

	t.Run("invalid changes annotation", func(t *testing.T) {
		t.Parallel()

		// Setup services and expectations
		sw := source.NewTestsServicesWrapper()
		i := &hub.TrackerSourceInput{
			Repository: &hub.Repository{},
			BasePath:   "testdata/path3",
			Svc:        sw.Svc,
		}
		expectedErr := "error preparing package test-operator version 0.1.0: invalid changes annotation. Please use quotes on strings that include any of the following characters: {}:[],&*#?|-<>=!%@"
		sw.Ec.On("Append", i.Repository.RepositoryID, expectedErr).Return()

		// Run test and check expectations
		packages, err := NewTrackerSource(i).GetPackagesAvailable()
		assert.Equal(t, map[string]*hub.Package{}, packages)
		assert.NoError(t, err)
		sw.AssertExpectations(t)
	})

	t.Run("error saving logo image, package returned anyway", func(t *testing.T) {
		t.Parallel()

		// Setup services and expectations
		sw := source.NewTestsServicesWrapper()
		i := &hub.TrackerSourceInput{
			Repository: &hub.Repository{},
			BasePath:   "testdata/path4",
			Svc:        sw.Svc,
		}
		sw.Is.On("SaveImage", sw.Svc.Ctx, imageData).Return("", tests.ErrFake)
		expectedErr := "error preparing package test-operator version 0.1.0 logo image: error saving image: fake error for tests"
		sw.Ec.On("Append", i.Repository.RepositoryID, expectedErr).Return()

		// Run test and check expectations
		p := source.ClonePackage(basePkg)
		p.Repository = i.Repository
		p.Digest = "8593896476590401712"
		packages, err := NewTrackerSource(i).GetPackagesAvailable()
		assert.Equal(t, map[string]*hub.Package{
			pkg.BuildKey(p): p,
		}, packages)
		assert.NoError(t, err)
		sw.AssertExpectations(t)
	})

	t.Run("one package returned (package manifest format), no errors", func(t *testing.T) {
		t.Parallel()

		// Setup services and expectations
		sw := source.NewTestsServicesWrapper()
		i := &hub.TrackerSourceInput{
			Repository: &hub.Repository{},
			BasePath:   "testdata/path4",
			Svc:        sw.Svc,
		}
		sw.Is.On("SaveImage", sw.Svc.Ctx, imageData).Return("logoImageID", nil)

		// Run test and check expectations
		p := source.ClonePackage(basePkg)
		p.Repository = i.Repository
		p.LogoImageID = "logoImageID"
		p.Digest = "8593896476590401712"
		packages, err := NewTrackerSource(i).GetPackagesAvailable()
		assert.Equal(t, map[string]*hub.Package{
			pkg.BuildKey(p): p,
		}, packages)
		assert.NoError(t, err)
		sw.AssertExpectations(t)
	})

	t.Run("two packages returned (bundle format), no errors", func(t *testing.T) {
		t.Parallel()

		// Setup services and expectations
		sw := source.NewTestsServicesWrapper()
		i := &hub.TrackerSourceInput{
			Repository: &hub.Repository{},
			BasePath:   "testdata/path5",
			Svc:        sw.Svc,
		}
		sw.Is.On("SaveImage", sw.Svc.Ctx, imageData).Return("logoImageID", nil)

		// Run test and check expectations
		p1 := source.ClonePackage(basePkg)
		p1.Repository = i.Repository
		p1.Category = hub.Security
		p1.LogoImageID = "logoImageID"
		p1.Channels = []*hub.Channel{
			{
				Name:    "alpha",
				Version: "0.2.0",
			},
			{
				Name:    "stable",
				Version: "0.1.0",
			},
		}
		p1.DefaultChannel = "stable"
		p1.Data = map[string]interface{}{
			formatKey:           "bundle",
			isGlobalOperatorKey: true,
		}
		p1.Digest = "10644756248648523549"
		p2 := source.ClonePackage(p1)
		p2.Version = "0.2.0"
		p2.Category = hub.UnknownCategory
		p2.Digest = "6605061498162416521"
		packages, err := NewTrackerSource(i).GetPackagesAvailable()
		assert.Equal(t, map[string]*hub.Package{
			pkg.BuildKey(p1): p1,
			pkg.BuildKey(p2): p2,
		}, packages)
		assert.NoError(t, err)
		sw.AssertExpectations(t)
	})
}
