package helm

import (
	"context"
	"io/ioutil"
	"net/http"
	"os"
	"path"
	"strconv"
	"strings"
	"sync"
	"testing"

	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/img"
	"github.com/artifacthub/hub/internal/pkg"
	"github.com/artifacthub/hub/internal/tests"
	"github.com/artifacthub/hub/internal/tracker"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"helm.sh/helm/v3/pkg/chart"
	"helm.sh/helm/v3/pkg/repo"
)

func TestWorker(t *testing.T) {
	logoImageURL := "http://icon.url"

	t.Run("handle register job", func(t *testing.T) {
		pkg1V1 := &repo.ChartVersion{
			Metadata: &chart.Metadata{
				Name:    "pkg1",
				Version: "1.0.0",
			},
			URLs: []string{
				"http://tests/pkg1-1.0.0.tgz",
			},
		}
		pkg2V1 := &repo.ChartVersion{
			Metadata: &chart.Metadata{
				Name:    "pkg2",
				Version: "1.0.0",
			},
			URLs: []string{
				"http://tests/pkg2-1.0.0.tgz",
			},
		}
		job := &Job{
			Kind:         Register,
			ChartVersion: pkg1V1,
			StoreLogo:    true,
		}

		t.Run("error downloading chart", func(t *testing.T) {
			// Setup worker and expectations
			ww := newWorkerWrapper(context.Background())
			ww.queue <- job
			close(ww.queue)
			ww.hg.On("Get", job.ChartVersion.URLs[0]).Return(nil, tests.ErrFake)
			ww.ec.On("Append", ww.w.r.RepositoryID, mock.Anything).Return()

			// Run worker and check expectations
			ww.w.Run(ww.wg, ww.queue)
			ww.assertExpectations(t)
		})

		t.Run("error downloading chart (deprecated chart)", func(t *testing.T) {
			// Setup worker and expectations
			ww := newWorkerWrapper(context.Background())
			job := &Job{
				Kind: Register,
				ChartVersion: &repo.ChartVersion{
					Metadata: &chart.Metadata{
						Name:       "pkg1",
						Version:    "1.0.0",
						Deprecated: true,
					},
					URLs: []string{
						"http://tests/pkg1-1.0.0.tgz",
					},
				},
				StoreLogo: true,
			}
			ww.queue <- job
			close(ww.queue)
			ww.hg.On("Get", job.ChartVersion.URLs[0]).Return(nil, tests.ErrFake)

			// Run worker and check expectations
			ww.w.Run(ww.wg, ww.queue)
			ww.assertExpectations(t)
		})

		t.Run("unexpected status downloading chart", func(t *testing.T) {
			// Setup worker and expectations
			ww := newWorkerWrapper(context.Background())
			ww.queue <- job
			close(ww.queue)
			ww.hg.On("Get", job.ChartVersion.URLs[0]).Return(&http.Response{
				Body:       ioutil.NopCloser(strings.NewReader("")),
				StatusCode: http.StatusNotFound,
			}, nil)
			ww.ec.On("Append", ww.w.r.RepositoryID, mock.Anything).Return()

			// Run worker and check expectations
			ww.w.Run(ww.wg, ww.queue)
			ww.assertExpectations(t)
		})

		t.Run("error downloading logo image", func(t *testing.T) {
			// Setup worker and expectations
			ww := newWorkerWrapper(context.Background())
			ww.queue <- job
			close(ww.queue)
			f, _ := os.Open("testdata/" + path.Base(job.ChartVersion.URLs[0]))
			ww.hg.On("Get", job.ChartVersion.URLs[0]).Return(&http.Response{
				Body:       f,
				StatusCode: http.StatusOK,
			}, nil)
			ww.hg.On("Get", logoImageURL).Return(nil, tests.ErrFake)
			ww.hg.On("Get", job.ChartVersion.URLs[0]+".prov").Return(&http.Response{
				Body:       ioutil.NopCloser(strings.NewReader("")),
				StatusCode: http.StatusNotFound,
			}, nil)
			ww.ec.On("Append", ww.w.r.RepositoryID, mock.Anything).Return()
			ww.pm.On("Register", mock.Anything, mock.Anything).Return(nil)

			// Run worker and check expectations
			ww.w.Run(ww.wg, ww.queue)
			ww.assertExpectations(t)
		})

		t.Run("unexpected status downloading logo image", func(t *testing.T) {
			// Setup worker and expectations
			ww := newWorkerWrapper(context.Background())
			ww.queue <- job
			close(ww.queue)
			f, _ := os.Open("testdata/" + path.Base(job.ChartVersion.URLs[0]))
			ww.hg.On("Get", job.ChartVersion.URLs[0]).Return(&http.Response{
				Body:       f,
				StatusCode: http.StatusOK,
			}, nil)
			ww.hg.On("Get", logoImageURL).Return(&http.Response{
				Body:       ioutil.NopCloser(strings.NewReader("")),
				StatusCode: http.StatusUnauthorized,
			}, nil)
			ww.hg.On("Get", job.ChartVersion.URLs[0]+".prov").Return(&http.Response{
				Body:       ioutil.NopCloser(strings.NewReader("")),
				StatusCode: http.StatusNotFound,
			}, nil)
			ww.ec.On("Append", ww.w.r.RepositoryID, mock.Anything).Return()
			ww.pm.On("Register", mock.Anything, mock.Anything).Return(nil)

			// Run worker and check expectations
			ww.w.Run(ww.wg, ww.queue)
			ww.assertExpectations(t)
		})

		t.Run("error saving logo image", func(t *testing.T) {
			// Setup worker and expectations
			ww := newWorkerWrapper(context.Background())
			ww.queue <- job
			close(ww.queue)
			f, _ := os.Open("testdata/" + path.Base(job.ChartVersion.URLs[0]))
			ww.hg.On("Get", job.ChartVersion.URLs[0]).Return(&http.Response{
				Body:       f,
				StatusCode: http.StatusOK,
			}, nil)
			ww.hg.On("Get", logoImageURL).Return(&http.Response{
				Body:       ioutil.NopCloser(strings.NewReader("imageData")),
				StatusCode: http.StatusOK,
			}, nil)
			ww.ec.On("Append", ww.w.r.RepositoryID, mock.Anything).Return()
			ww.hg.On("Get", job.ChartVersion.URLs[0]+".prov").Return(&http.Response{
				Body:       ioutil.NopCloser(strings.NewReader("")),
				StatusCode: http.StatusNotFound,
			}, nil)
			ww.is.On("SaveImage", mock.Anything, []byte("imageData")).Return("", tests.ErrFake)
			ww.pm.On("Register", mock.Anything, mock.Anything).Return(nil)

			// Run worker and check expectations
			ww.w.Run(ww.wg, ww.queue)
			ww.assertExpectations(t)
		})

		t.Run("error registering package", func(t *testing.T) {
			// Setup worker and expectations
			ww := newWorkerWrapper(context.Background())
			ww.queue <- job
			close(ww.queue)
			f, _ := os.Open("testdata/" + path.Base(job.ChartVersion.URLs[0]))
			ww.hg.On("Get", job.ChartVersion.URLs[0]).Return(&http.Response{
				Body:       f,
				StatusCode: http.StatusOK,
			}, nil)
			ww.hg.On("Get", logoImageURL).Return(&http.Response{
				Body:       ioutil.NopCloser(strings.NewReader("imageData")),
				StatusCode: http.StatusOK,
			}, nil)
			ww.hg.On("Get", job.ChartVersion.URLs[0]+".prov").Return(&http.Response{
				Body:       ioutil.NopCloser(strings.NewReader("")),
				StatusCode: http.StatusNotFound,
			}, nil)
			ww.is.On("SaveImage", mock.Anything, []byte("imageData")).Return("imageID", nil)
			ww.pm.On("Register", mock.Anything, mock.Anything).Return(tests.ErrFake)
			ww.ec.On("Append", ww.w.r.RepositoryID, mock.Anything).Return()

			// Run worker and check expectations
			ww.w.Run(ww.wg, ww.queue)
			ww.assertExpectations(t)
		})

		t.Run("package registered successfully", func(t *testing.T) {
			// Setup worker and expectations
			ww := newWorkerWrapper(context.Background())
			ww.queue <- job
			close(ww.queue)
			f, _ := os.Open("testdata/" + path.Base(job.ChartVersion.URLs[0]))
			ww.hg.On("Get", job.ChartVersion.URLs[0]).Return(&http.Response{
				Body:       f,
				StatusCode: http.StatusOK,
			}, nil)
			ww.hg.On("Get", logoImageURL).Return(&http.Response{
				Body:       ioutil.NopCloser(strings.NewReader("imageData")),
				StatusCode: http.StatusOK,
			}, nil)
			ww.hg.On("Get", job.ChartVersion.URLs[0]+".prov").Return(&http.Response{
				Body:       ioutil.NopCloser(strings.NewReader("")),
				StatusCode: http.StatusNotFound,
			}, nil)
			ww.is.On("SaveImage", mock.Anything, []byte("imageData")).Return("imageID", nil)
			ww.pm.On("Register", mock.Anything, &hub.Package{
				Name:        "pkg1",
				LogoURL:     "http://icon.url",
				LogoImageID: "imageID",
				IsOperator:  true,
				Description: "Package1 chart",
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
						"spec": map[string]interface{}{
							"replicas": 1,
						},
					},
				},
				Version:    "1.0.0",
				AppVersion: "1.0.0",
				ContentURL: "http://tests/pkg1-1.0.0.tgz",
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
						Name:  "img2",
						Image: "repo/img2:2.0.0",
					},
				},
				Repository: &hub.Repository{
					RepositoryID: "repo1",
				},
				CreatedAt: -62135596800,
			}).Return(nil)

			// Run worker and check expectations
			ww.w.Run(ww.wg, ww.queue)
			ww.assertExpectations(t)
		})

		t.Run("package with logo in data url registered successfully", func(t *testing.T) {
			// Setup worker and expectations
			ww := newWorkerWrapper(context.Background())
			job := &Job{
				Kind:         Register,
				ChartVersion: pkg2V1,
				StoreLogo:    true,
			}
			ww.queue <- job
			close(ww.queue)
			f, _ := os.Open("testdata/" + path.Base(job.ChartVersion.URLs[0]))
			ww.hg.On("Get", job.ChartVersion.URLs[0]).Return(&http.Response{
				Body:       f,
				StatusCode: http.StatusOK,
			}, nil)
			ww.hg.On("Get", job.ChartVersion.URLs[0]+".prov").Return(&http.Response{
				Body:       ioutil.NopCloser(strings.NewReader("")),
				StatusCode: http.StatusNotFound,
			}, nil)
			expectedLogoData, _ := ioutil.ReadFile("testdata/red-dot.png")
			ww.is.On("SaveImage", mock.Anything, expectedLogoData).Return("imageID", nil)
			ww.pm.On("Register", mock.Anything, mock.Anything).Return(nil)

			// Run worker and check expectations
			ww.w.Run(ww.wg, ww.queue)
			ww.assertExpectations(t)
		})
	})

	t.Run("handle unregister job", func(t *testing.T) {
		job := &Job{
			Kind: Unregister,
			ChartVersion: &repo.ChartVersion{
				Metadata: &chart.Metadata{
					Name:    "pkg1",
					Version: "1.0.0",
				},
			},
		}

		t.Run("error unregistering package", func(t *testing.T) {
			// Setup worker and expectations
			ww := newWorkerWrapper(context.Background())
			ww.queue <- job
			close(ww.queue)
			ww.pm.On("Unregister", mock.Anything, mock.Anything).Return(tests.ErrFake)
			ww.ec.On("Append", ww.w.r.RepositoryID, mock.Anything).Return()

			// Run worker and check expectations
			ww.w.Run(ww.wg, ww.queue)
			ww.assertExpectations(t)
		})

		t.Run("package unregistered successfully", func(t *testing.T) {
			// Setup worker and expectations
			ww := newWorkerWrapper(context.Background())
			ww.queue <- job
			close(ww.queue)
			ww.pm.On("Unregister", mock.Anything, mock.Anything).Return(nil)

			// Run worker and check expectations
			ww.w.Run(ww.wg, ww.queue)
			ww.assertExpectations(t)
		})
	})
}

func TestEnrichPackageFromAnnotations(t *testing.T) {
	testCases := []struct {
		p                            *hub.Package
		annotations                  map[string]string
		expectedOperator             bool
		expectedOperatorCapabilities string
		expectedLinks                []*hub.Link
		expectedMaintainers          []*hub.Maintainer
		expectedErrMsg               string
	}{
		// Operator flag
		{
			&hub.Package{},
			map[string]string{
				operatorAnnotation: "invalid",
			},
			false,
			"",
			nil,
			nil,
			"invalid operator value",
		},
		{
			&hub.Package{},
			map[string]string{
				operatorAnnotation: "true",
			},
			true,
			"",
			nil,
			nil,
			"",
		},
		{
			&hub.Package{
				IsOperator: true,
			},
			map[string]string{
				operatorAnnotation: "false",
			},
			false,
			"",
			nil,
			nil,
			"",
		},
		{
			&hub.Package{
				IsOperator: true,
			},
			map[string]string{},
			true,
			"",
			nil,
			nil,
			"",
		},
		// Operator capabilities
		{
			&hub.Package{},
			map[string]string{
				operatorCapabilitiesAnnotation: "Basic Install",
			},
			false,
			"Basic Install",
			nil,
			nil,
			"",
		},
		// Links
		{
			&hub.Package{},
			map[string]string{
				linksAnnotation: `"{\"`,
			},
			false,
			"",
			nil,
			nil,
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
			false,
			"",
			[]*hub.Link{
				{
					Name: "",
					URL:  "https://link1.url",
				},
			},
			nil,
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
			false,
			"",
			[]*hub.Link{
				{
					Name: "link1",
					URL:  "https://link1.url",
				},
			},
			nil,
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
			false,
			"",
			[]*hub.Link{
				{
					Name: "link1",
					URL:  "https://link1.url",
				},
				{
					Name: "link2",
					URL:  "https://link2.url",
				},
			},
			nil,
			"",
		},
		// Maintainers
		{
			&hub.Package{},
			map[string]string{
				maintainersAnnotation: `"{\"`,
			},
			false,
			"",
			nil,
			nil,
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
			false,
			"",
			nil,
			[]*hub.Maintainer{
				{
					Name:  "user1",
					Email: "user1@email.com",
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
			false,
			"",
			nil,
			[]*hub.Maintainer{
				{
					Name:  "user1",
					Email: "user1@email.com",
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
			false,
			"",
			nil,
			[]*hub.Maintainer{
				{
					Name:  "user1-updated",
					Email: "user1@email.com",
				},
				{
					Name:  "user2",
					Email: "user2@email.com",
				},
			},
			"",
		},
	}
	for i, tc := range testCases {
		tc := tc
		t.Run(strconv.Itoa(i), func(t *testing.T) {
			err := enrichPackageFromAnnotations(tc.p, tc.annotations)
			if tc.expectedErrMsg != "" {
				assert.Error(t, err)
				assert.Contains(t, err.Error(), tc.expectedErrMsg)
			} else {
				assert.Nil(t, err)
			}
			assert.Equal(t, tc.expectedOperator, tc.p.IsOperator)
			assert.Equal(t, tc.expectedOperatorCapabilities, tc.p.Capabilities)
			assert.Equal(t, tc.expectedLinks, tc.p.Links)
		})
	}
}

type workerWrapper struct {
	wg    *sync.WaitGroup
	pm    *pkg.ManagerMock
	is    *img.StoreMock
	ec    *tracker.ErrorsCollectorMock
	hg    *tests.HTTPGetterMock
	w     *Worker
	queue chan *Job
}

func newWorkerWrapper(ctx context.Context) *workerWrapper {
	// Setup worker
	pm := &pkg.ManagerMock{}
	is := &img.StoreMock{}
	ec := &tracker.ErrorsCollectorMock{}
	hg := &tests.HTTPGetterMock{}
	r := &hub.Repository{RepositoryID: "repo1"}
	svc := &tracker.Services{
		Ctx: ctx,
		Pm:  pm,
		Is:  is,
		Ec:  ec,
		Hg:  hg,
	}
	w := NewWorker(svc, r)
	queue := make(chan *Job, 100)

	// Wait group used for Worker.Run()
	var wg sync.WaitGroup
	wg.Add(1)

	return &workerWrapper{
		wg:    &wg,
		pm:    pm,
		is:    is,
		ec:    ec,
		hg:    hg,
		w:     w,
		queue: queue,
	}
}

func (ww *workerWrapper) assertExpectations(t *testing.T) {
	ww.wg.Wait()

	ww.pm.AssertExpectations(t)
	ww.is.AssertExpectations(t)
	ww.ec.AssertExpectations(t)
	ww.hg.AssertExpectations(t)
}
