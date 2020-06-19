package main

import (
	"context"
	"fmt"
	"sync"
	"testing"

	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/repo"
	"github.com/spf13/viper"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"helm.sh/helm/v3/pkg/chart"
	helmrepo "helm.sh/helm/v3/pkg/repo"
)

func TestDispatcher(t *testing.T) {
	t.Run("error waiting for limiter", func(t *testing.T) {
		// Setup dispatcher
		ctx, cancel := context.WithCancel(context.Background())
		cancel()
		dw := newDispatcherWrapper(ctx)

		// Run dispatcher and check expectations
		r := &hub.Repository{RepositoryID: "repo1"}
		dw.d.Run(dw.wg, []*hub.Repository{r})
		dw.assertExpectations(t, nil)
	})

	t.Run("error loading chart repository index file", func(t *testing.T) {
		// Setup dispatcher and expectations
		r := &hub.Repository{RepositoryID: "repo1"}
		dw := newDispatcherWrapper(context.Background())
		dw.il.On("LoadIndex", r).Return(nil, errFake)
		dw.ec.On("Append", r.RepositoryID, mock.Anything).Return()

		// Run dispatcher and check expectations
		dw.d.Run(dw.wg, []*hub.Repository{r})
		dw.assertExpectations(t, nil)
	})

	t.Run("error loading registered packages digest", func(t *testing.T) {
		// Setup dispatcher and expectations
		r := &hub.Repository{RepositoryID: "repo1"}
		dw := newDispatcherWrapper(context.Background())
		dw.il.On("LoadIndex", r).Return(nil, nil)
		dw.rm.On("GetPackagesDigest", dw.d.ctx, r.RepositoryID).Return(nil, errFake)

		// Run dispatcher and check expectations
		dw.d.Run(dw.wg, []*hub.Repository{r})
		dw.assertExpectations(t, nil)
	})

	t.Run("dispatcher completed successfully", func(t *testing.T) {
		repo1 := &hub.Repository{
			RepositoryID: "repo1",
		}
		repo2 := &hub.Repository{
			RepositoryID: "repo2",
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
		pkg3V1 := &helmrepo.ChartVersion{
			Metadata: &chart.Metadata{
				Name:    "pkg3",
				Version: "1.0.0",
			},
			Digest: "pkg3-1.0.0",
		}

		testCases := []struct {
			n              int
			repos          []*hub.Repository
			indexFile      map[string]*helmrepo.IndexFile
			packagesDigest map[string]map[string]string
			expectedJobs   []*Job
		}{
			{
				1,
				[]*hub.Repository{
					repo1,
				},
				map[string]*helmrepo.IndexFile{
					"repo1": {
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
						Repo:         repo1,
						ChartVersion: pkg1V1,
						GetLogo:      true,
					},
				},
			},
			{
				2,
				[]*hub.Repository{
					repo1,
				},
				map[string]*helmrepo.IndexFile{
					"repo1": {
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
						Repo:         repo1,
						ChartVersion: pkg1V1,
						GetLogo:      true,
					},
					{
						Kind:         Register,
						Repo:         repo1,
						ChartVersion: pkg1V2,
						GetLogo:      false,
					},
				},
			},
			{
				3,
				[]*hub.Repository{
					repo1,
				},
				map[string]*helmrepo.IndexFile{
					"repo1": {
						Entries: map[string]helmrepo.ChartVersions{
							"pkg1": []*helmrepo.ChartVersion{
								pkg1V1,
							},
						},
					},
				},
				map[string]map[string]string{
					"repo1": {
						"pkg1@1.0.0": "pkg1-1.0.0",
					},
				},
				nil,
			},
			{
				4,
				[]*hub.Repository{
					repo1,
				},
				map[string]*helmrepo.IndexFile{
					"repo1": {
						Entries: map[string]helmrepo.ChartVersions{
							"pkg1": []*helmrepo.ChartVersion{
								pkg1V1,
								pkg1V2,
							},
						},
					},
				},
				map[string]map[string]string{
					"repo1": {
						"pkg1@1.0.0": "pkg1-1.0.0",
						"pkg1@2.0.0": "pkg1-2.0.0",
					},
				},
				nil,
			},
			{
				5,
				[]*hub.Repository{
					repo1,
				},
				map[string]*helmrepo.IndexFile{
					"repo1": {
						Entries: map[string]helmrepo.ChartVersions{
							"pkg1": []*helmrepo.ChartVersion{
								pkg1V1,
								pkg1V2,
							},
						},
					},
				},
				map[string]map[string]string{
					"repo1": {
						"pkg1@1.0.0": "pkg1-1.0.0",
						"pkg1@2.0.0": "pkg1-2.0.0-updated",
					},
				},
				[]*Job{
					{
						Kind:         Register,
						Repo:         repo1,
						ChartVersion: pkg1V2,
						GetLogo:      false,
					},
				},
			},
			{
				6,
				[]*hub.Repository{
					repo1,
				},
				map[string]*helmrepo.IndexFile{
					"repo1": {
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
					"repo1": {
						"pkg1@1.0.0": "pkg1-1.0.0",
						"pkg1@2.0.0": "pkg1-2.0.0",
					},
				},
				[]*Job{
					{
						Kind:         Register,
						Repo:         repo1,
						ChartVersion: pkg2V1,
						GetLogo:      true,
					},
				},
			},
			{
				7,
				[]*hub.Repository{
					repo1,
					repo2,
				},
				map[string]*helmrepo.IndexFile{
					"repo1": {
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
					"repo2": {
						Entries: map[string]helmrepo.ChartVersions{
							"pkg3": []*helmrepo.ChartVersion{
								pkg3V1,
							},
						},
					},
				},
				nil,
				[]*Job{
					{
						Kind:         Register,
						Repo:         repo1,
						ChartVersion: pkg1V1,
						GetLogo:      true,
					},
					{
						Kind:         Register,
						Repo:         repo1,
						ChartVersion: pkg1V2,
						GetLogo:      false,
					},
					{
						Kind:         Register,
						Repo:         repo1,
						ChartVersion: pkg2V1,
						GetLogo:      true,
					},
					{
						Kind:         Register,
						Repo:         repo2,
						ChartVersion: pkg3V1,
						GetLogo:      true,
					},
				},
			},
			{
				8,
				[]*hub.Repository{
					repo1,
				},
				map[string]*helmrepo.IndexFile{
					"repo1": {
						Entries: nil,
					},
				},
				map[string]map[string]string{
					"repo1": {
						"pkg1@1.0.0": "pkg1-1.0.0",
					},
				},
				[]*Job{
					{
						Kind: Unregister,
						Repo: repo1,
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
				9,
				[]*hub.Repository{
					repo1,
				},
				map[string]*helmrepo.IndexFile{
					"repo1": {
						Entries: map[string]helmrepo.ChartVersions{
							"pkg1": []*helmrepo.ChartVersion{
								pkg1V2,
							},
							"pkg2": nil,
						},
					},
				},
				map[string]map[string]string{
					"repo1": {
						"pkg1@1.0.0": "pkg1-1.0.0",
						"pkg1@2.0.0": "pkg1-2.0.0",
						"pkg2@1.0.0": "pkg2-1.0.0",
					},
				},
				[]*Job{
					{
						Kind: Unregister,
						Repo: repo1,
						ChartVersion: &helmrepo.ChartVersion{
							Metadata: &chart.Metadata{
								Name:    "pkg1",
								Version: "1.0.0",
							},
						},
					},
					{
						Kind: Unregister,
						Repo: repo1,
						ChartVersion: &helmrepo.ChartVersion{
							Metadata: &chart.Metadata{
								Name:    "pkg2",
								Version: "1.0.0",
							},
						},
					},
				},
			},
			{
				10,
				[]*hub.Repository{
					repo1,
					repo2,
				},
				map[string]*helmrepo.IndexFile{
					"repo1": {
						Entries: map[string]helmrepo.ChartVersions{
							"pkg1": []*helmrepo.ChartVersion{
								pkg1V1,
							},
							"pkg2": []*helmrepo.ChartVersion{
								pkg2V1,
							},
						},
					},
					"repo2": {
						Entries: map[string]helmrepo.ChartVersions{
							"pkg3": nil,
						},
					},
				},
				map[string]map[string]string{
					"repo1": {
						"pkg1@1.0.0": "pkg1-1.0.0",
						"pkg1@2.0.0": "pkg1-2.0.0",
						"pkg2@1.0.0": "pkg2-1.0.0",
					},
					"repo2": {
						"pkg3@1.0.0": "pkg3-1.0.0",
					},
				},
				[]*Job{
					{
						Kind: Unregister,
						Repo: repo1,
						ChartVersion: &helmrepo.ChartVersion{
							Metadata: &chart.Metadata{
								Name:    "pkg1",
								Version: "2.0.0",
							},
						},
					},
					{
						Kind: Unregister,
						Repo: repo2,
						ChartVersion: &helmrepo.ChartVersion{
							Metadata: &chart.Metadata{
								Name:    "pkg3",
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
				// Setup dispatcher and expectations
				dw := newDispatcherWrapper(context.Background())
				for _, r := range tc.repos {
					dw.il.On("LoadIndex", r).Return(tc.indexFile[r.RepositoryID], nil)
					dw.rm.On("GetPackagesDigest", dw.d.ctx, r.RepositoryID).
						Return(tc.packagesDigest[r.RepositoryID], nil)
				}

				// Run dispatcher and check expectations
				dw.d.Run(dw.wg, tc.repos)
				dw.assertExpectations(t, tc.expectedJobs)
			})
		}
	})
}

type dispatcherWrapper struct {
	cfg        *viper.Viper
	wg         *sync.WaitGroup
	il         *repo.HelmIndexLoaderMock
	rm         *repo.ManagerMock
	ec         *ErrorsCollectorMock
	d          *Dispatcher
	queuedJobs *[]*Job
}

func newDispatcherWrapper(ctx context.Context) *dispatcherWrapper {
	// Setup dispatcher
	cfg := viper.New()
	il := &repo.HelmIndexLoaderMock{}
	rm := &repo.ManagerMock{}
	ec := &ErrorsCollectorMock{}
	d := NewDispatcher(ctx, cfg, il, rm, ec)

	// Wait group used for Dispatcher.Run()
	var wg sync.WaitGroup
	wg.Add(1)

	// Consume queued jobs from dispatcher queue and store them
	var queuedJobs []*Job
	wg.Add(1)
	go func() {
		defer wg.Done()
		for job := range d.Queue {
			queuedJobs = append(queuedJobs, job)
		}
	}()

	return &dispatcherWrapper{
		cfg:        cfg,
		wg:         &wg,
		ec:         ec,
		il:         il,
		rm:         rm,
		d:          d,
		queuedJobs: &queuedJobs,
	}
}

func (dw *dispatcherWrapper) assertExpectations(t *testing.T, expectedJobs []*Job) {
	dw.wg.Wait()

	dw.il.AssertExpectations(t)
	dw.rm.AssertExpectations(t)
	dw.ec.AssertExpectations(t)

	assert.Equal(t, len(expectedJobs), len(*dw.queuedJobs))
	if len(*dw.queuedJobs) > 0 {
		assert.ElementsMatch(t, *dw.queuedJobs, expectedJobs)
	}
}
