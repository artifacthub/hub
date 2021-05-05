package olm

import (
	"io/ioutil"
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
		Data: map[string]interface{}{
			"isGlobalOperator": true,
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

	t.Run("invalid csv file name", func(t *testing.T) {
		t.Parallel()

		// Setup services and expectations
		sw := source.NewTestsServicesWrapper()
		i := &hub.TrackerSourceInput{
			Repository: &hub.Repository{},
			BasePath:   "testdata/path2",
			Svc:        sw.Svc,
		}
		expectedErr := "error getting package test-operator version 0.1.0 csv: csv file not found"
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
		expectedErr := "error preparing package test-operator version 0.1.0: invalid changes annotation: single string"
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
		expectedErr := "error saving package test-operator image: fake error for tests"
		sw.Ec.On("Append", i.Repository.RepositoryID, expectedErr).Return()

		// Run test and check expectations
		p := source.ClonePackage(basePkg)
		p.Repository = i.Repository
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
			Repository: &hub.Repository{},
			BasePath:   "testdata/path4",
			Svc:        sw.Svc,
		}
		sw.Is.On("SaveImage", sw.Svc.Ctx, imageData).Return("logoImageID", nil)

		// Run test and check expectations
		p := source.ClonePackage(basePkg)
		p.Repository = i.Repository
		p.LogoImageID = "logoImageID"
		packages, err := NewTrackerSource(i).GetPackagesAvailable()
		assert.Equal(t, map[string]*hub.Package{
			pkg.BuildKey(p): p,
		}, packages)
		assert.NoError(t, err)
		sw.AssertExpectations(t)
	})
}
