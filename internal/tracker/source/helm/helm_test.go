package helm

import (
	"errors"
	"io/ioutil"
	"net/http"
	"os"
	"strconv"
	"strings"
	"testing"

	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/pkg"
	"github.com/artifacthub/hub/internal/repo"
	"github.com/artifacthub/hub/internal/tests"
	"github.com/artifacthub/hub/internal/tracker/source"
	"github.com/stretchr/testify/assert"
	"helm.sh/helm/v3/pkg/chart"
	helmrepo "helm.sh/helm/v3/pkg/repo"
)

func TestTrackerSource(t *testing.T) {
	basePkg := &hub.Package{
		Name:        "pkg1",
		IsOperator:  true,
		Description: "Package1 chart",
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
		Capabilities: "Basic Install",
		CRDs: []interface{}{
			map[string]interface{}{
				"kind":        "MyKind",
				"version":     "v1",
				"name":        "mykind",
				"displayName": "My Kind",
				"description": "Some nice description",
			},
		},
		CRDsExamples: []interface{}{
			map[string]interface{}{
				"apiVersion": "v1",
				"kind":       "MyKind",
				"metadata": map[string]interface{}{
					"name": "mykind",
				},
				"spec": interface{}(nil),
			},
		},
		Data: map[string]interface{}{
			"apiVersion":  "v2",
			"kubeVersion": ">= 1.13.0 < 1.15.0",
			"type":        "application",
		},
		Version:    "1.0.0",
		AppVersion: "1.0.0",
		ContentURL: "https://repo.url/pkg1-1.0.0.tgz",
		Maintainers: []*hub.Maintainer{
			{
				Name:  "me-updated",
				Email: "me@me.com",
			},
			{
				Name:  "me2",
				Email: "me2@me.com",
			},
		},
		ContainersImages: []*hub.ContainerImage{
			{
				Name:  "img1",
				Image: "repo/img1:1.0.0",
			},
			{
				Name:        "img2",
				Image:       "repo/img2:2.0.0",
				Whitelisted: true,
			},
		},
		Changes: []string{
			"Added cool feature",
			"Fixed minor bug",
		},
		Recommendations: []*hub.Recommendation{
			{
				URL: "https://artifacthub.io/packages/helm/artifact-hub/artifact-hub",
			},
		},
		ContainsSecurityUpdates: true,
		Prerelease:              true,
		CreatedAt:               0,
	}
	logoImageURL := "http://icon.url"

	t.Run("error loading repository index file", func(t *testing.T) {
		t.Parallel()

		// Setup services and expectations
		sw := source.NewTestsServicesWrapper()
		i := &hub.TrackerSourceInput{
			Repository: &hub.Repository{
				URL: "https://repo.url",
			},
			Svc: sw.Svc,
		}
		il := &repo.HelmIndexLoaderMock{}
		il.On("LoadIndex", i.Repository).Return(nil, "", tests.ErrFake)

		// Run test and check expectations
		packages, err := NewTrackerSource(i, withIndexLoader(il)).GetPackagesAvailable()
		assert.Nil(t, packages)
		assert.True(t, errors.Is(err, tests.ErrFake))
		sw.AssertExpectations(t)
	})

	t.Run("error loading oci repository tags", func(t *testing.T) {
		t.Parallel()

		// Setup services and expectations
		sw := source.NewTestsServicesWrapper()
		i := &hub.TrackerSourceInput{
			Repository: &hub.Repository{
				URL: "oci://repo.url",
			},
			Svc: sw.Svc,
		}
		tg := &repo.OCITagsGetterMock{}
		tg.On("Tags", i.Svc.Ctx, i.Repository).Return(nil, tests.ErrFake)

		// Run test and check expectations
		packages, err := NewTrackerSource(i, withOCITagsGetter(tg)).GetPackagesAvailable()
		assert.Nil(t, packages)
		assert.True(t, errors.Is(err, tests.ErrFake))
		sw.AssertExpectations(t)
	})

	t.Run("invalid package version", func(t *testing.T) {
		t.Parallel()

		// Setup services and expectations
		sw := source.NewTestsServicesWrapper()
		i := &hub.TrackerSourceInput{
			Repository: &hub.Repository{
				URL: "https://repo.url",
			},
			Svc: sw.Svc,
		}
		il := &repo.HelmIndexLoaderMock{}
		il.On("LoadIndex", i.Repository).Return(&helmrepo.IndexFile{
			Entries: map[string]helmrepo.ChartVersions{
				"pkg1": []*helmrepo.ChartVersion{
					{
						Metadata: &chart.Metadata{
							Name:    "pkg1",
							Version: "invalid",
						},
					},
				},
			},
		}, "", nil)
		expectedErr := "error preparing package: invalid package version: Invalid Semantic Version (package: pkg1 version: invalid)"
		sw.Ec.On("Append", i.Repository.RepositoryID, expectedErr).Return()

		// Run test and check expectations
		packages, err := NewTrackerSource(i, withIndexLoader(il)).GetPackagesAvailable()
		assert.Equal(t, map[string]*hub.Package{}, packages)
		assert.NoError(t, err)
		sw.AssertExpectations(t)
	})

	t.Run("error loading chart archive", func(t *testing.T) {
		t.Parallel()

		// Setup services and expectations
		sw := source.NewTestsServicesWrapper()
		i := &hub.TrackerSourceInput{
			Repository: &hub.Repository{
				URL: "https://repo.url",
			},
			Svc: sw.Svc,
		}
		il := &repo.HelmIndexLoaderMock{}
		il.On("LoadIndex", i.Repository).Return(&helmrepo.IndexFile{
			Entries: map[string]helmrepo.ChartVersions{
				"pkg1": []*helmrepo.ChartVersion{
					{
						Metadata: &chart.Metadata{
							Name:    "pkg1",
							Version: "1.0.0",
						},
						URLs: []string{
							"https://repo.url/pkg1-1.0.0.tgz",
						},
					},
				},
			},
		}, "", nil)
		req, _ := http.NewRequest("GET", "https://repo.url/pkg1-1.0.0.tgz", nil)
		sw.Hc.On("Do", req).Return(nil, tests.ErrFake)
		expectedErr := "error preparing package: error loading chart (https://repo.url/pkg1-1.0.0.tgz): fake error for tests (package: pkg1 version: 1.0.0)"
		sw.Ec.On("Append", i.Repository.RepositoryID, expectedErr).Return()

		// Run test and check expectations
		packages, err := NewTrackerSource(i, withIndexLoader(il)).GetPackagesAvailable()
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
				URL: "https://repo.url",
			},
			Svc: sw.Svc,
		}
		il := &repo.HelmIndexLoaderMock{}
		il.On("LoadIndex", i.Repository).Return(&helmrepo.IndexFile{
			Entries: map[string]helmrepo.ChartVersions{
				"pkg1": []*helmrepo.ChartVersion{
					{
						Metadata: &chart.Metadata{
							Name:    "pkg1",
							Version: "1.0.0",
							Icon:    logoImageURL,
						},
						URLs: []string{
							"https://repo.url/pkg1-1.0.0.tgz",
						},
					},
				},
			},
		}, "", nil)
		f, _ := os.Open("testdata/pkg1-1.0.0.tgz")
		reqChart, _ := http.NewRequest("GET", "https://repo.url/pkg1-1.0.0.tgz", nil)
		sw.Hc.On("Do", reqChart).Return(&http.Response{
			Body:       f,
			StatusCode: http.StatusOK,
		}, nil)
		reqProv, _ := http.NewRequest("GET", "https://repo.url/pkg1-1.0.0.tgz.prov", nil)
		sw.Hc.On("Do", reqProv).Return(&http.Response{
			Body:       ioutil.NopCloser(strings.NewReader("")),
			StatusCode: http.StatusNotFound,
		}, nil)
		sw.Is.On("DownloadAndSaveImage", sw.Svc.Ctx, logoImageURL).Return("", tests.ErrFake)
		expectedErr := "error getting logo image http://icon.url: fake error for tests (package: pkg1 version: 1.0.0)"
		sw.Ec.On("Append", i.Repository.RepositoryID, expectedErr).Return()

		// Run test and check expectations
		p := source.ClonePackage(basePkg)
		p.Repository = i.Repository
		packages, err := NewTrackerSource(i, withIndexLoader(il)).GetPackagesAvailable()
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
				URL: "https://repo.url",
			},
			Svc: sw.Svc,
		}
		il := &repo.HelmIndexLoaderMock{}
		il.On("LoadIndex", i.Repository).Return(&helmrepo.IndexFile{
			Entries: map[string]helmrepo.ChartVersions{
				"pkg1": []*helmrepo.ChartVersion{
					{
						Metadata: &chart.Metadata{
							Name:    "pkg1",
							Version: "1.0.0",
							Icon:    logoImageURL,
						},
						URLs: []string{
							"https://repo.url/pkg1-1.0.0.tgz",
						},
					},
				},
			},
		}, "", nil)
		f, _ := os.Open("testdata/pkg1-1.0.0.tgz")
		reqChart, _ := http.NewRequest("GET", "https://repo.url/pkg1-1.0.0.tgz", nil)
		sw.Hc.On("Do", reqChart).Return(&http.Response{
			Body:       f,
			StatusCode: http.StatusOK,
		}, nil)
		reqProv, _ := http.NewRequest("GET", "https://repo.url/pkg1-1.0.0.tgz.prov", nil)
		sw.Hc.On("Do", reqProv).Return(&http.Response{
			Body:       ioutil.NopCloser(strings.NewReader("")),
			StatusCode: http.StatusNotFound,
		}, nil)
		sw.Is.On("DownloadAndSaveImage", sw.Svc.Ctx, logoImageURL).Return("logoImageID", nil)

		// Run test and check expectations
		p := source.ClonePackage(basePkg)
		p.Repository = i.Repository
		p.LogoURL = logoImageURL
		p.LogoImageID = "logoImageID"
		packages, err := NewTrackerSource(i, withIndexLoader(il)).GetPackagesAvailable()
		assert.Equal(t, map[string]*hub.Package{
			pkg.BuildKey(p): p,
		}, packages)
		assert.NoError(t, err)
		sw.AssertExpectations(t)
	})
}

func TestEnrichPackageFromAnnotations(t *testing.T) {
	testCases := []struct {
		pkg            *hub.Package
		annotations    map[string]string
		expectedPkg    *hub.Package
		expectedErrMsg string
	}{
		// Changes
		{
			&hub.Package{},
			map[string]string{
				changesAnnotation: `
- Added cool feature
- Fixed minor bug
`,
			},
			&hub.Package{
				Changes: []string{
					"Added cool feature",
					"Fixed minor bug",
				},
			},
			"",
		},
		// CRDs
		{
			&hub.Package{},
			map[string]string{
				crdsAnnotation: `
- kind: MyKind
  version: v1
  name: mykind
  displayName: My Kind
  description: Some nice description
`,
			},
			&hub.Package{
				CRDs: []interface{}{
					map[string]interface{}{
						"description": "Some nice description",
						"displayName": "My Kind",
						"kind":        "MyKind",
						"name":        "mykind",
						"version":     "v1",
					},
				},
			},
			"",
		},
		// CRDs examples
		{
			&hub.Package{},
			map[string]string{
				crdsExamplesAnnotation: `
- apiVersion: v1
  kind: MyKind
  metadata:
    name: mykind
  spec:
    replicas: 1
`,
			},
			&hub.Package{
				CRDsExamples: []interface{}{
					map[string]interface{}{
						"apiVersion": "v1",
						"kind":       "MyKind",
						"metadata": map[string]interface{}{
							"name": "mykind",
						},
						"spec": map[string]interface{}{
							"replicas": 1,
						},
					},
				},
			},
			"",
		},
		// Images
		{
			&hub.Package{},
			map[string]string{
				imagesAnnotation: `
- name: img1
  image: repo/img1:1.0.0
- name: img2
  image: repo/img2:2.0.0
  whitelisted: true
`,
			},
			&hub.Package{
				ContainersImages: []*hub.ContainerImage{
					{
						Name:  "img1",
						Image: "repo/img1:1.0.0",
					},
					{
						Name:        "img2",
						Image:       "repo/img2:2.0.0",
						Whitelisted: true,
					},
				},
			},
			"",
		},
		// License
		{
			&hub.Package{},
			map[string]string{
				licenseAnnotation: "Apache-2.0",
			},
			&hub.Package{
				License: "Apache-2.0",
			},
			"",
		},
		{
			&hub.Package{
				License: "GPL-3",
			},
			map[string]string{
				licenseAnnotation: "Apache-2.0",
			},
			&hub.Package{
				License: "Apache-2.0",
			},
			"",
		},
		{
			&hub.Package{
				License: "Apache-2.0",
			},
			map[string]string{
				licenseAnnotation: "",
			},
			&hub.Package{
				License: "Apache-2.0",
			},
			"",
		},
		// Links
		{
			&hub.Package{},
			map[string]string{
				linksAnnotation: `"{\"`,
			},
			&hub.Package{},
			"invalid links value",
		},
		{
			&hub.Package{
				Links: []*hub.Link{
					{
						Name: "",
						URL:  "https://link1.url",
					},
				},
			},
			map[string]string{
				linksAnnotation: `"{\"`,
			},
			&hub.Package{
				Links: []*hub.Link{
					{
						Name: "",
						URL:  "https://link1.url",
					},
				},
			},
			"invalid links value",
		},
		{
			&hub.Package{},
			map[string]string{
				linksAnnotation: `
- name: link1
  url: https://link1.url
`,
			},
			&hub.Package{
				Links: []*hub.Link{
					{
						Name: "link1",
						URL:  "https://link1.url",
					},
				},
			},
			"",
		},
		{
			&hub.Package{
				Links: []*hub.Link{
					{
						Name: "",
						URL:  "https://link1.url",
					},
				},
			},
			map[string]string{
				linksAnnotation: `
- name: link1
  url: https://link1.url
- name: link2
  url: https://link2.url
`,
			},
			&hub.Package{
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
			},
			"",
		},
		// Maintainers
		{
			&hub.Package{},
			map[string]string{
				maintainersAnnotation: `"{\"`,
			},
			&hub.Package{},
			"invalid maintainers value",
		},
		{
			&hub.Package{
				Maintainers: []*hub.Maintainer{
					{
						Name:  "user1",
						Email: "user1@email.com",
					},
				},
			},
			map[string]string{
				maintainersAnnotation: `"{\"`,
			},
			&hub.Package{
				Maintainers: []*hub.Maintainer{
					{
						Name:  "user1",
						Email: "user1@email.com",
					},
				},
			},
			"invalid maintainers value",
		},
		{
			&hub.Package{},
			map[string]string{
				maintainersAnnotation: `
- name: user1
  email: user1@email.com
`,
			},
			&hub.Package{
				Maintainers: []*hub.Maintainer{
					{
						Name:  "user1",
						Email: "user1@email.com",
					},
				},
			},
			"",
		},
		{
			&hub.Package{
				Maintainers: []*hub.Maintainer{
					{
						Name:  "user1",
						Email: "user1@email.com",
					},
				},
			},
			map[string]string{
				maintainersAnnotation: `
- name: user1-updated
  email: user1@email.com
- name: user2
  email: user2@email.com
`,
			},
			&hub.Package{
				Maintainers: []*hub.Maintainer{
					{
						Name:  "user1-updated",
						Email: "user1@email.com",
					},
					{
						Name:  "user2",
						Email: "user2@email.com",
					},
				},
			},
			"",
		},
		// Operator flag
		{
			&hub.Package{},
			map[string]string{
				operatorAnnotation: "invalid",
			},
			&hub.Package{},
			"invalid operator value",
		},
		{
			&hub.Package{},
			map[string]string{
				operatorAnnotation: "true",
			},
			&hub.Package{
				IsOperator: true,
			},
			"",
		},
		{
			&hub.Package{
				IsOperator: true,
			},
			map[string]string{
				operatorAnnotation: "false",
			},
			&hub.Package{
				IsOperator: false,
			},
			"",
		},
		{
			&hub.Package{
				IsOperator: true,
			},
			map[string]string{},
			&hub.Package{
				IsOperator: true,
			},
			"",
		},
		// Operator capabilities
		{
			&hub.Package{},
			map[string]string{
				operatorCapabilitiesAnnotation: "Basic Install",
			},
			&hub.Package{
				Capabilities: "Basic Install",
			},
			"",
		},
		// Prerelease
		{
			&hub.Package{},
			map[string]string{
				prereleaseAnnotation: "invalid",
			},
			&hub.Package{},
			"invalid prerelease value",
		},
		{
			&hub.Package{},
			map[string]string{
				prereleaseAnnotation: "true",
			},
			&hub.Package{
				Prerelease: true,
			},
			"",
		},
		{
			&hub.Package{
				Prerelease: true,
			},
			map[string]string{
				prereleaseAnnotation: "false",
			},
			&hub.Package{
				Prerelease: false,
			},
			"",
		},
		{
			&hub.Package{
				Prerelease: true,
			},
			map[string]string{},
			&hub.Package{
				Prerelease: true,
			},
			"",
		},
		// Recommendations
		{
			&hub.Package{},
			map[string]string{
				recommendationsAnnotation: `
- url: https://artifacthub.io/packages/helm/artifact-hub/artifact-hub
`,
			},
			&hub.Package{
				Recommendations: []*hub.Recommendation{
					{
						URL: "https://artifacthub.io/packages/helm/artifact-hub/artifact-hub",
					},
				},
			},
			"",
		},
		// Security updates
		{
			&hub.Package{},
			map[string]string{
				securityUpdatesAnnotation: "true",
			},
			&hub.Package{
				ContainsSecurityUpdates: true,
			},
			"",
		},
	}
	for i, tc := range testCases {
		tc := tc
		t.Run(strconv.Itoa(i), func(t *testing.T) {
			t.Parallel()
			err := enrichPackageFromAnnotations(tc.pkg, tc.annotations)
			if tc.expectedErrMsg != "" {
				assert.Error(t, err)
				assert.Contains(t, err.Error(), tc.expectedErrMsg)
			} else {
				assert.Nil(t, err)
			}
			assert.Equal(t, tc.expectedPkg, tc.pkg)
		})
	}
}

func withIndexLoader(il hub.HelmIndexLoader) func(s *TrackerSource) {
	return func(s *TrackerSource) {
		s.il = il
	}
}

func withOCITagsGetter(tg hub.OCITagsGetter) func(s *TrackerSource) {
	return func(s *TrackerSource) {
		s.tg = tg
	}
}
