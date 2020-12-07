package helm

import (
	"context"
	"fmt"
	"net/url"
	"os"
	"path"
	"testing"

	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/repo"
	"github.com/artifacthub/hub/internal/tests"
	"github.com/artifacthub/hub/internal/tracker"
	"github.com/rs/zerolog"
	"github.com/spf13/viper"
	"github.com/stretchr/testify/assert"
	"helm.sh/helm/v3/pkg/chart"
	helmrepo "helm.sh/helm/v3/pkg/repo"
)

func TestMain(m *testing.M) {
	zerolog.SetGlobalLevel(zerolog.Disabled)
	os.Exit(m.Run())
}

func TestTracker(t *testing.T) {
	t.Run("error loading registered packages digest", func(t *testing.T) {
		t.Parallel()

		// Setup tracker and expectations
		r := &hub.Repository{RepositoryID: "repo1"}
		tw := newTrackerWrapper(r)
		tw.rm.On("GetPackagesDigest", tw.ctx, r.RepositoryID).Return(nil, tests.ErrFake)

		// Run tracker and check expectations
		err := tw.t.Track()
		assert.Error(t, err)
		tw.assertExpectations(t, nil)
	})

	t.Run("error loading repository index file", func(t *testing.T) {
		t.Parallel()

		// Setup tracker and expectations
		r := &hub.Repository{
			RepositoryID: "repo1",
			URL:          "http://localhost",
		}
		tw := newTrackerWrapper(r)
		tw.rm.On("GetPackagesDigest", tw.ctx, r.RepositoryID).Return(nil, nil)
		tw.il.On("LoadIndex", r).Return(nil, "", tests.ErrFake)

		// Run tracker and check expectations
		err := tw.t.Track()
		assert.Error(t, err)
		tw.assertExpectations(t, nil)
	})

	t.Run("error loading repository tags", func(t *testing.T) {
		t.Parallel()

		// Setup tracker and expectations
		r := &hub.Repository{
			RepositoryID: "repo1",
			URL:          "oci://localhost/repo/chart",
		}
		tw := newTrackerWrapper(r)
		tw.rm.On("GetPackagesDigest", tw.ctx, r.RepositoryID).Return(nil, nil)
		tw.tg.On("Tags", tw.ctx, r).Return(nil, tests.ErrFake)

		// Run tracker and check expectations
		err := tw.t.Track()
		assert.Error(t, err)
		tw.assertExpectations(t, nil)
	})

	t.Run("tracker completed successfully (http scheme)", func(t *testing.T) {
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
				nil,
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
				t.Parallel()

				// Setup tracker and expectations
				tw := newTrackerWrapper(tc.r)
				tw.rm.On("GetPackagesDigest", tw.ctx, tc.r.RepositoryID).
					Return(tc.packagesDigest[tc.r.RepositoryID], nil)
				tw.il.On("LoadIndex", tc.r).Return(tc.indexFile[tc.r.RepositoryID], "", nil)
				u, _ := url.Parse(tc.r.URL)
				u.Path = path.Join(u.Path, hub.RepositoryMetadataFile)
				tw.rm.On("GetMetadata", u.String()).Return(&hub.RepositoryMetadata{
					RepositoryID: tc.r.RepositoryID,
				}, nil)
				tw.rm.On("SetVerifiedPublisher", tw.ctx, tc.r.RepositoryID, true).Return(nil)

				// Run tracker and check expectations
				err := tw.t.Track()
				assert.NoError(t, err)
				tw.assertExpectations(t, tc.expectedJobs)
			})
		}
	})

	t.Run("tracker completed successfully (oci scheme)", func(t *testing.T) {
		repo1ID := "00000000-0000-0000-0000-000000000001"
		repo1 := &hub.Repository{
			RepositoryID: repo1ID,
			URL:          "oci://localhost/repo1/pkg1",
		}
		pkg1V1 := &helmrepo.ChartVersion{
			Metadata: &chart.Metadata{
				Name:    "pkg1",
				Version: "1.0.0",
			},
			URLs: []string{"oci://localhost/repo1/pkg1:1.0.0"},
		}
		pkg1V2 := &helmrepo.ChartVersion{
			Metadata: &chart.Metadata{
				Name:    "pkg1",
				Version: "2.0.0",
			},
			URLs: []string{"oci://localhost/repo1/pkg1:2.0.0"},
		}

		testCases := []struct {
			n              int
			r              *hub.Repository
			tags           []string
			packagesDigest map[string]map[string]string
			expectedJobs   []*Job
		}{
			{
				1,
				repo1,
				[]string{"1.0.0"},
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
				[]string{"1.0.0", "2.0.0"},
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
				[]string{"1.0.0"},
				map[string]map[string]string{
					repo1ID: {
						"pkg1@1.0.0": "",
					},
				},
				nil,
			},
			{
				4,
				repo1,
				[]string{"1.0.0", "2.0.0"},
				map[string]map[string]string{
					repo1ID: {
						"pkg1@1.0.0": "",
						"pkg1@2.0.0": "",
					},
				},
				nil,
			},
			{
				5,
				repo1,
				[]string{"2.0.0"},
				map[string]map[string]string{
					repo1ID: {
						"pkg1@1.0.0": "",
						"pkg1@2.0.0": "",
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
				6,
				repo1,
				[]string{},
				map[string]map[string]string{
					repo1ID: {
						"pkg1@1.0.0": "",
						"pkg1@2.0.0": "",
					},
				},
				nil,
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(fmt.Sprintf("Test case %d", tc.n), func(t *testing.T) {
				t.Parallel()

				// Setup tracker and expectations
				tw := newTrackerWrapper(tc.r)
				tw.rm.On("GetPackagesDigest", tw.ctx, tc.r.RepositoryID).
					Return(tc.packagesDigest[tc.r.RepositoryID], nil)
				tw.tg.On("Tags", tw.ctx, tc.r).Return(tc.tags, nil)

				// Run tracker and check expectations
				err := tw.t.Track()
				assert.NoError(t, err)
				tw.assertExpectations(t, tc.expectedJobs)
			})
		}
	})
}

type trackerWrapper struct {
	ctx          context.Context
	cfg          *viper.Viper
	rm           *repo.ManagerMock
	il           *repo.HelmIndexLoaderMock
	tg           *OCITagsGetterMock
	ec           *tracker.ErrorsCollectorMock
	t            tracker.Tracker
	queuedJobs   *[]*Job
	jobsConsumed chan struct{}
}

func newTrackerWrapper(r *hub.Repository) *trackerWrapper {
	// Setup tracker
	ctx := context.Background()
	cfg := viper.New()
	il := &repo.HelmIndexLoaderMock{}
	tg := &OCITagsGetterMock{}
	rm := &repo.ManagerMock{}
	ec := &tracker.ErrorsCollectorMock{}
	svc := &tracker.Services{
		Ctx: ctx,
		Cfg: cfg,
		Rm:  rm,
		Il:  il,
		Tg:  tg,
		Ec:  ec,
	}
	t := NewTracker(svc, r, WithNumWorkers(-1), WithIndexLoader(il), WithOCITagsGetter(tg))

	// Consume queued jobs from tracker queue and store them
	jobsConsumed := make(chan struct{})
	var queuedJobs []*Job
	go func() {
		for job := range t.(*Tracker).queue {
			queuedJobs = append(queuedJobs, job)
		}
		jobsConsumed <- struct{}{}
	}()

	return &trackerWrapper{
		ctx:          ctx,
		cfg:          cfg,
		rm:           rm,
		il:           il,
		tg:           tg,
		ec:           ec,
		t:            t,
		queuedJobs:   &queuedJobs,
		jobsConsumed: jobsConsumed,
	}
}

func (tw *trackerWrapper) assertExpectations(t *testing.T, expectedJobs []*Job) {
	<-tw.jobsConsumed

	tw.il.AssertExpectations(t)
	tw.tg.AssertExpectations(t)
	tw.rm.AssertExpectations(t)
	tw.ec.AssertExpectations(t)

	assert.Equal(t, len(expectedJobs), len(*tw.queuedJobs))
	if len(*tw.queuedJobs) > 0 {
		assert.ElementsMatch(t, *tw.queuedJobs, expectedJobs)
	}
}
