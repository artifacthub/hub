package generic

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
		Version:     "1.0.0",
		Name:        "pkg1",
		DisplayName: "Package 1",
		TS:          1561735380,
		Description: "Description",
		Digest:      "0123456789",
		License:     "Apache-2.0",
		HomeURL:     "https://home.url",
		AppVersion:  "10.0.0",
		ContainersImages: []*hub.ContainerImage{
			{
				Image: "registry/test/test:latest",
			},
		},
		IsOperator: false,
		Deprecated: false,
		Keywords:   []string{"kw1", "kw2"},
		Links: []*hub.Link{
			{
				Name: "Link1",
				URL:  "https://link1.url",
			},
		},
		Readme:  "Package documentation in markdown format",
		Install: "Brief install instructions in markdown format",
		Changes: []*hub.Change{
			{
				Kind:        "added",
				Description: "feature 1",
			},
			{
				Kind:        "fixed",
				Description: "issue 1",
			},
		},
		Recommendations: []*hub.Recommendation{
			{
				URL: "https://artifacthub.io/packages/helm/artifact-hub/artifact-hub",
			},
		},
		ContainsSecurityUpdates: true,
		Prerelease:              true,
		Maintainers: []*hub.Maintainer{
			{
				Name:  "Maintainer",
				Email: "test@email.com",
			},
		},
		Provider: "Provider",
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
		expectedErr := "error unmarshaling package metadata file: yaml: line 2: did not find expected node content"
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
		expectedErr := "error validating package metadata file: invalid metadata: invalid version (semver expected): Invalid Semantic Version"
		sw.Ec.On("Append", i.Repository.RepositoryID, expectedErr).Return()

		// Run test and check expectations
		packages, err := NewTrackerSource(i).GetPackagesAvailable()
		assert.Equal(t, map[string]*hub.Package{}, packages)
		assert.NoError(t, err)
		sw.AssertExpectations(t)
	})

	t.Run("falco and opa packages must contain at least one data file", func(t *testing.T) {
		repositories := []*hub.Repository{
			{Kind: hub.Falco},
			{Kind: hub.OPA},
		}
		for _, r := range repositories {
			r := r
			t.Run(hub.GetKindName(r.Kind), func(t *testing.T) {
				t.Parallel()

				// Setup services and expectations
				sw := source.NewTestsServicesWrapper()
				i := &hub.TrackerSourceInput{
					Repository: r,
					BasePath:   "testdata/path4",
					Svc:        sw.Svc,
				}
				expectedErr := "error preparing package: error preparing package pkg1 version 1.0.0 data: no files found"
				sw.Ec.On("Append", i.Repository.RepositoryID, expectedErr).Return()

				// Run test and check expectations
				packages, err := NewTrackerSource(i).GetPackagesAvailable()
				assert.Equal(t, map[string]*hub.Package{}, packages)
				assert.NoError(t, err)
				sw.AssertExpectations(t)
			})
		}
	})

	t.Run("error reading logo image, package returned anyway", func(t *testing.T) {
		t.Parallel()

		// Setup services and expectations
		sw := source.NewTestsServicesWrapper()
		i := &hub.TrackerSourceInput{
			Repository: &hub.Repository{
				Kind: hub.TBAction,
			},
			BasePath: "testdata/path4",
			Svc:      sw.Svc,
		}
		expectedErr := "error reading package pkg1 version 1.0.0 logo: open testdata/path4/red-dot.png: no such file or directory"
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

	t.Run("error saving logo image, package returned anyway", func(t *testing.T) {
		t.Parallel()

		// Setup services and expectations
		sw := source.NewTestsServicesWrapper()
		i := &hub.TrackerSourceInput{
			Repository: &hub.Repository{
				Kind: hub.TBAction,
			},
			BasePath: "testdata/path5",
			Svc:      sw.Svc,
		}
		sw.Is.On("SaveImage", sw.Svc.Ctx, imageData).Return("", tests.ErrFake)
		expectedErr := "error saving package pkg1 version 1.0.0 logo: fake error for tests"
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

	t.Run("opa package returned, no errors", func(t *testing.T) {
		t.Parallel()

		// Setup services and expectations
		sw := source.NewTestsServicesWrapper()
		i := &hub.TrackerSourceInput{
			Repository: &hub.Repository{
				Kind: hub.OPA,
			},
			BasePath: "testdata/path6",
			Svc:      sw.Svc,
		}
		sw.Is.On("SaveImage", sw.Svc.Ctx, imageData).Return("logoImageID", nil)

		// Run test and check expectations
		p := source.ClonePackage(basePkg)
		p.Repository = i.Repository
		p.LogoImageID = "logoImageID"
		p.Data = map[string]interface{}{
			"policies": map[string]string{
				"policy1.rego": "policy content\n",
			},
		}
		packages, err := NewTrackerSource(i).GetPackagesAvailable()
		assert.Equal(t, map[string]*hub.Package{
			pkg.BuildKey(p): p,
		}, packages)
		assert.NoError(t, err)
		sw.AssertExpectations(t)
	})

	t.Run("falco package returned, no errors", func(t *testing.T) {
		t.Parallel()

		// Setup services and expectations
		sw := source.NewTestsServicesWrapper()
		i := &hub.TrackerSourceInput{
			Repository: &hub.Repository{
				Kind: hub.Falco,
			},
			BasePath: "testdata/path7",
			Svc:      sw.Svc,
		}
		sw.Is.On("SaveImage", sw.Svc.Ctx, imageData).Return("logoImageID", nil)

		// Run test and check expectations
		p := source.ClonePackage(basePkg)
		p.Repository = i.Repository
		p.LogoImageID = "logoImageID"
		p.Data = map[string]interface{}{
			"rules": map[string]string{
				"file1-rules.yaml": "falco rules\n",
			},
		}
		packages, err := NewTrackerSource(i).GetPackagesAvailable()
		assert.Equal(t, map[string]*hub.Package{
			pkg.BuildKey(p): p,
		}, packages)
		assert.NoError(t, err)
		sw.AssertExpectations(t)
	})

	t.Run("falco package (using logo url) returned, no errors", func(t *testing.T) {
		t.Parallel()

		// Setup services and expectations
		sw := source.NewTestsServicesWrapper()
		i := &hub.TrackerSourceInput{
			Repository: &hub.Repository{
				Kind: hub.Falco,
			},
			BasePath: "testdata/path8",
			Svc:      sw.Svc,
		}
		sw.Is.On("DownloadAndSaveImage", sw.Svc.Ctx, "https://logo.url/red-dot.png").Return("logoImageID", nil)

		// Run test and check expectations
		p := source.ClonePackage(basePkg)
		p.Repository = i.Repository
		p.LogoURL = "https://logo.url/red-dot.png"
		p.LogoImageID = "logoImageID"
		p.Data = map[string]interface{}{
			"rules": map[string]string{
				"file1-rules.yaml": "falco rules\n",
			},
		}
		packages, err := NewTrackerSource(i).GetPackagesAvailable()
		assert.Equal(t, map[string]*hub.Package{
			pkg.BuildKey(p): p,
		}, packages)
		assert.NoError(t, err)
		sw.AssertExpectations(t)
	})

	t.Run("opa package returned (README.md file), no errors", func(t *testing.T) {
		t.Parallel()

		// Setup services and expectations
		sw := source.NewTestsServicesWrapper()
		i := &hub.TrackerSourceInput{
			Repository: &hub.Repository{
				Kind: hub.OPA,
			},
			BasePath: "testdata/path9",
			Svc:      sw.Svc,
		}
		sw.Is.On("SaveImage", sw.Svc.Ctx, imageData).Return("logoImageID", nil)

		// Run test and check expectations
		p := source.ClonePackage(basePkg)
		p.Repository = i.Repository
		p.LogoImageID = "logoImageID"
		p.Data = map[string]interface{}{
			"policies": map[string]string{
				"policy1.rego": "policy content\n",
			},
		}
		p.Readme = "# Package documentation in markdown format\n"
		packages, err := NewTrackerSource(i).GetPackagesAvailable()
		assert.Equal(t, map[string]*hub.Package{
			pkg.BuildKey(p): p,
		}, packages)
		assert.NoError(t, err)
		sw.AssertExpectations(t)
	})
}
