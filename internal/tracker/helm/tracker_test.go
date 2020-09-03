package helm

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"os"
	"path"
	"sync"
	"testing"

	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/repo"
	"github.com/artifacthub/hub/internal/tracker"
	"github.com/rs/zerolog"
	"github.com/spf13/viper"
	"github.com/stretchr/testify/assert"
	"helm.sh/helm/v3/pkg/chart"
	helmrepo "helm.sh/helm/v3/pkg/repo"
)

var errFake = errors.New("fake error for tests")

func TestMain(m *testing.M) {
	zerolog.SetGlobalLevel(zerolog.Disabled)
	os.Exit(m.Run())
}

func TestTracker(t *testing.T) {
	t.Run("error loading repository index file", func(t *testing.T) {
		// Setup tracker and expectations
		r := &hub.Repository{RepositoryID: "repo1"}
		tw := newTrackerWrapper(r)
		tw.il.On("LoadIndex", r).Return(nil, errFake)

		// Run tracker and check expectations
		err := tw.t.Track(tw.wg)
		assert.Error(t, err)
		tw.assertExpectations(t, nil)
	})

	t.Run("error loading registered packages digest", func(t *testing.T) {
		// Setup tracker and expectations
		r := &hub.Repository{RepositoryID: "repo1"}
		tw := newTrackerWrapper(r)
		tw.il.On("LoadIndex", r).Return(nil, nil)
		tw.rm.On("GetPackagesDigest", tw.ctx, r.RepositoryID).Return(nil, errFake)

		// Run tracker and check expectations
		err := tw.t.Track(tw.wg)
		assert.Error(t, err)
		tw.assertExpectations(t, nil)
	})

	t.Run("tracker completed successfully", func(t *testing.T) {
		repo1ID := "00000000-0000-0000-0000-000000000001"
		repo1 := &hub.Repository{
			RepositoryID:      repo1ID,
			URL:               "http://localhost",
			VerifiedPublisher: false,
		}
		pkg1V1 := &helmrepo.ChartVersion{
			Metadata: &chart.Metadata{
				Name:    "pkg1",
				Version: "1.0.0",
			},
			Digest: "pkg1-1.0.0",
		}
		pkg1V2 := &helmrepo.ChartVersion{
			Metadata: &chart.Metadata{
				Name:    "pkg1",
				Version: "2.0.0",
			},
			Digest: "pkg1-2.0.0",
		}
		pkg2V1 := &helmrepo.ChartVersion{
			Metadata: &chart.Metadata{
				Name:    "pkg2",
				Version: "1.0.0",
			},
			Digest: "pkg2-1.0.0",
		}

		testCases := []struct {
			n              int
			r              *hub.Repository
			indexFile      map[string]*helmrepo.IndexFile
			packagesDigest map[string]map[string]string
			expectedJobs   []*Job
		}{
			{
				1,
				repo1,
				map[string]*helmrepo.IndexFile{
					repo1ID: {
						Entries: map[string]helmrepo.ChartVersions{
							"pkg1": []*helmrepo.ChartVersion{
								pkg1V1,
							},
						},
					},
				},
				nil,
				[]*Job{
					{
						Kind:         Register,
						ChartVersion: pkg1V1,
						StoreLogo:    true,
					},
				},
			},
			{
				2,
				repo1,
				map[string]*helmrepo.IndexFile{
					repo1ID: {
						Entries: map[string]helmrepo.ChartVersions{
							"pkg1": []*helmrepo.ChartVersion{
								pkg1V1,
								pkg1V2,
							},
						},
					},
				},
				nil,
				[]*Job{
					{
						Kind:         Register,
						ChartVersion: pkg1V1,
						StoreLogo:    true,
					},
					{
						Kind:         Register,
						ChartVersion: pkg1V2,
						StoreLogo:    false,
					},
				},
			},
			{
				3,
				repo1,
				map[string]*helmrepo.IndexFile{
					repo1ID: {
						Entries: map[string]helmrepo.ChartVersions{
							"pkg1": []*helmrepo.ChartVersion{
								pkg1V1,
							},
						},
					},
				},
				map[string]map[string]string{
					repo1ID: {
						"pkg1@1.0.0": "pkg1-1.0.0",
					},
				},
				nil,
			},
			{
				4,
				repo1,
				map[string]*helmrepo.IndexFile{
					repo1ID: {
						Entries: map[string]helmrepo.ChartVersions{
							"pkg1": []*helmrepo.ChartVersion{
								pkg1V1,
								pkg1V2,
							},
						},
					},
				},
				map[string]map[string]string{
					repo1ID: {
						"pkg1@1.0.0": "pkg1-1.0.0",
						"pkg1@2.0.0": "pkg1-2.0.0",
					},
				},
				nil,
			},
			{
				5,
				repo1,
				map[string]*helmrepo.IndexFile{
					repo1ID: {
						Entries: map[string]helmrepo.ChartVersions{
							"pkg1": []*helmrepo.ChartVersion{
								pkg1V1,
								pkg1V2,
							},
						},
					},
				},
				map[string]map[string]string{
					repo1ID: {
						"pkg1@1.0.0": "pkg1-1.0.0",
						"pkg1@2.0.0": "pkg1-2.0.0-updated",
					},
				},
				[]*Job{
					{
						Kind:         Register,
						ChartVersion: pkg1V2,
						StoreLogo:    false,
					},
				},
			},
			{
				6,
				repo1,
				map[string]*helmrepo.IndexFile{
					repo1ID: {
						Entries: map[string]helmrepo.ChartVersions{
							"pkg1": []*helmrepo.ChartVersion{
								pkg1V1,
								pkg1V2,
							},
							"pkg2": []*helmrepo.ChartVersion{
								pkg2V1,
							},
						},
					},
				},
				map[string]map[string]string{
					repo1ID: {
						"pkg1@1.0.0": "pkg1-1.0.0",
						"pkg1@2.0.0": "pkg1-2.0.0",
					},
				},
				[]*Job{
					{
						Kind:         Register,
						ChartVersion: pkg2V1,
						StoreLogo:    true,
					},
				},
			},
			{
				7,
				repo1,
				map[string]*helmrepo.IndexFile{
					repo1ID: {
						Entries: nil,
					},
				},
				map[string]map[string]string{
					repo1ID: {
						"pkg1@1.0.0": "pkg1-1.0.0",
					},
				},
				[]*Job{
					{
						Kind: Unregister,
						ChartVersion: &helmrepo.ChartVersion{
							Metadata: &chart.Metadata{
								Name:    "pkg1",
								Version: "1.0.0",
							},
						},
					},
				},
			},
			{
				8,
				repo1,
				map[string]*helmrepo.IndexFile{
					repo1ID: {
						Entries: map[string]helmrepo.ChartVersions{
							"pkg1": []*helmrepo.ChartVersion{
								pkg1V2,
							},
							"pkg2": nil,
						},
					},
				},
				map[string]map[string]string{
					repo1ID: {
						"pkg1@1.0.0": "pkg1-1.0.0",
						"pkg1@2.0.0": "pkg1-2.0.0",
						"pkg2@1.0.0": "pkg2-1.0.0",
					},
				},
				[]*Job{
					{
						Kind: Unregister,
						ChartVersion: &helmrepo.ChartVersion{
							Metadata: &chart.Metadata{
								Name:    "pkg1",
								Version: "1.0.0",
							},
						},
					},
					{
						Kind: Unregister,
						ChartVersion: &helmrepo.ChartVersion{
							Metadata: &chart.Metadata{
								Name:    "pkg2",
								Version: "1.0.0",
							},
						},
					},
				},
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(fmt.Sprintf("Test case %d", tc.n), func(t *testing.T) {
				// Setup tracker and expectations
				mdFile, _ := os.Open("testdata/artifacthub-repo.yml")
				tw := newTrackerWrapper(tc.r)
				tw.il.On("LoadIndex", tc.r).Return(tc.indexFile[tc.r.RepositoryID], nil)
				tw.rm.On("GetPackagesDigest", tw.ctx, tc.r.RepositoryID).
					Return(tc.packagesDigest[tc.r.RepositoryID], nil)
				u, _ := url.Parse(tc.r.URL)
				u.Path = path.Join(u.Path, hub.RepositoryMetadataFile)
				tw.hg.On("Get", u.String()).Return(&http.Response{
					Body:       mdFile,
					StatusCode: http.StatusOK,
				}, nil)
				tw.rm.On("SetVerifiedPublisher", tw.ctx, tc.r.RepositoryID, true).Return(nil)

				// Run tracker and check expectations
				err := tw.t.Track(tw.wg)
				assert.NoError(t, err)
				tw.assertExpectations(t, tc.expectedJobs)
			})
		}
	})
}

type trackerWrapper struct {
	ctx        context.Context
	cfg        *viper.Viper
	wg         *sync.WaitGroup
	rm         *repo.ManagerMock
	il         *repo.HelmIndexLoaderMock
	ec         *tracker.ErrorsCollectorMock
	hg         *tracker.HTTPGetterMock
	t          tracker.Tracker
	queuedJobs *[]*Job
}

func newTrackerWrapper(r *hub.Repository) *trackerWrapper {
	// Setup tracker
	ctx := context.Background()
	cfg := viper.New()
	il := &repo.HelmIndexLoaderMock{}
	rm := &repo.ManagerMock{}
	ec := &tracker.ErrorsCollectorMock{}
	hg := &tracker.HTTPGetterMock{}
	svc := &tracker.Services{
		Ctx: ctx,
		Cfg: cfg,
		Rm:  rm,
		Il:  il,
		Ec:  ec,
		Hg:  hg,
	}
	t := NewTracker(svc, r, WithNumWorkers(-1), WithIndexLoader(il))

	// Wait group used for Track()
	var wg sync.WaitGroup
	wg.Add(1)

	// Consume queued jobs from tracker queue and store them
	var queuedJobs []*Job
	wg.Add(1)
	go func() {
		defer wg.Done()
		for job := range t.(*Tracker).queue {
			queuedJobs = append(queuedJobs, job)
		}
	}()

	return &trackerWrapper{
		ctx:        ctx,
		cfg:        cfg,
		wg:         &wg,
		rm:         rm,
		il:         il,
		ec:         ec,
		hg:         hg,
		t:          t,
		queuedJobs: &queuedJobs,
	}
}

func (tw *trackerWrapper) assertExpectations(t *testing.T, expectedJobs []*Job) {
	tw.wg.Wait()

	tw.il.AssertExpectations(t)
	tw.rm.AssertExpectations(t)
	tw.ec.AssertExpectations(t)
	tw.hg.AssertExpectations(t)

	assert.Equal(t, len(expectedJobs), len(*tw.queuedJobs))
	if len(*tw.queuedJobs) > 0 {
		assert.ElementsMatch(t, *tw.queuedJobs, expectedJobs)
	}
}
