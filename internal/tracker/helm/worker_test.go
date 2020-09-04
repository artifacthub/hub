package helm

import (
	"context"
	"io/ioutil"
	"net/http"
	"os"
	"path"
	"strings"
	"sync"
	"testing"

	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/img"
	"github.com/artifacthub/hub/internal/pkg"
	"github.com/artifacthub/hub/internal/tests"
	"github.com/artifacthub/hub/internal/tracker"
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
			ww.hg.On("Get", job.ChartVersion.URLs[0]).Return(nil, errFake)
			ww.ec.On("Append", ww.w.r.RepositoryID, mock.Anything).Return()

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
			ww.hg.On("Get", logoImageURL).Return(nil, errFake)
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
			ww.is.On("SaveImage", mock.Anything, []byte("imageData")).Return("", errFake)
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
			ww.pm.On("Register", mock.Anything, mock.Anything).Return(errFake)
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
			ww.pm.On("Register", mock.Anything, mock.Anything).Return(nil)

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
			ww.pm.On("Unregister", mock.Anything, mock.Anything).Return(errFake)
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
