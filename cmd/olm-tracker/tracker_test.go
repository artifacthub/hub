package main

import (
	"context"
	"errors"
	"io/ioutil"
	"os"
	"sync"
	"testing"

	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/img"
	"github.com/artifacthub/hub/internal/pkg"
	"github.com/artifacthub/hub/internal/repo"
	"github.com/artifacthub/hub/internal/tracker"
	"github.com/rs/zerolog"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

var errFake = errors.New("fake error for tests")

func TestMain(m *testing.M) {
	zerolog.SetGlobalLevel(zerolog.Disabled)
	os.Exit(m.Run())
}

func TestTracker(t *testing.T) {
	r := &hub.Repository{
		RepositoryID: "00000000-0000-0000-0000-000000000001",
		Name:         "repo1",
		URL:          "https://github.com/org1/repo1/path/to/operators",
	}
	imageData, _ := ioutil.ReadFile("testdata/red-dot.png")

	t.Run("error cloning repository", func(t *testing.T) {
		// Setup tracker and expectations
		tw := newTrackerWrapper(r)
		tw.rc.On("CloneRepository", tw.ctx, r).Return("", "", errFake)

		// Run tracker and check expectations
		err := tw.t.Track(tw.wg)
		assert.True(t, errors.Is(err, errFake))
		tw.assertExpectations(t)
	})

	t.Run("error loading repository registered packages", func(t *testing.T) {
		// Setup tracker and expectations
		tw := newTrackerWrapper(r)
		tw.rc.On("CloneRepository", tw.ctx, r).Return("", "", nil)
		tw.rm.On("GetPackagesDigest", tw.ctx, r.RepositoryID).Return(nil, errFake)

		// Run tracker and check expectations
		err := tw.t.Track(tw.wg)
		assert.True(t, errors.Is(err, errFake))
		tw.assertExpectations(t)
	})

	t.Run("no operators in path, nothing to do", func(t *testing.T) {
		// Setup tracker and expectations
		tw := newTrackerWrapper(r)
		tw.rc.On("CloneRepository", tw.ctx, r).Return(".", "testdata/path1", nil)
		tw.rm.On("GetPackagesDigest", tw.ctx, r.RepositoryID).Return(nil, nil)

		// Run tracker and check expectations
		err := tw.t.Track(tw.wg)
		assert.NoError(t, err)
		tw.assertExpectations(t)
	})

	t.Run("package does not have a manifest file", func(t *testing.T) {
		// Setup tracker and expectations
		tw := newTrackerWrapper(r)
		tw.rc.On("CloneRepository", tw.ctx, r).Return(".", "testdata/path2", nil)
		tw.rm.On("GetPackagesDigest", tw.ctx, r.RepositoryID).Return(nil, nil)
		tw.ec.On("Append", r.RepositoryID, mock.Anything).Return()

		// Run tracker and check expectations
		err := tw.t.Track(tw.wg)
		assert.NoError(t, err)
		tw.assertExpectations(t)
	})

	t.Run("error getting operator csv", func(t *testing.T) {
		// Setup tracker and expectations
		tw := newTrackerWrapper(r)
		tw.rc.On("CloneRepository", tw.ctx, r).Return(".", "testdata/path3", nil)
		tw.rm.On("GetPackagesDigest", tw.ctx, r.RepositoryID).Return(nil, nil)
		tw.ec.On("Append", r.RepositoryID, mock.Anything).Return()

		// Run tracker and check expectations
		err := tw.t.Track(tw.wg)
		assert.NoError(t, err)
		tw.assertExpectations(t)
	})

	t.Run("error registering operator version", func(t *testing.T) {
		// Setup tracker and expectations
		tw := newTrackerWrapper(r)
		tw.rc.On("CloneRepository", tw.ctx, r).Return(".", "testdata/path4", nil)
		tw.rm.On("GetPackagesDigest", tw.ctx, r.RepositoryID).Return(nil, nil)
		tw.is.On("SaveImage", tw.ctx, imageData).Return("logoImageID", nil)
		tw.pm.On("Register", tw.ctx, mock.Anything).Return(errFake)
		tw.ec.On("Append", r.RepositoryID, mock.Anything).Return()

		// Run tracker and check expectations
		err := tw.t.Track(tw.wg)
		assert.NoError(t, err)
		tw.assertExpectations(t)
	})

	t.Run("no need to register operator version because it is already registered", func(t *testing.T) {
		// Setup tracker and expectations
		tw := newTrackerWrapper(r)
		tw.rc.On("CloneRepository", tw.ctx, r).Return(".", "testdata/path4", nil)
		tw.rm.On("GetPackagesDigest", tw.ctx, r.RepositoryID).Return(map[string]string{
			"test-operator@0.1.0": "",
		}, nil)

		// Run tracker and check expectations
		err := tw.t.Track(tw.wg)
		assert.NoError(t, err)
		tw.assertExpectations(t)
	})

	t.Run("operator version registered successfully", func(t *testing.T) {
		// Setup tracker and expectations
		tw := newTrackerWrapper(r)
		tw.rc.On("CloneRepository", tw.ctx, r).Return(".", "testdata/path4", nil)
		tw.rm.On("GetPackagesDigest", tw.ctx, r.RepositoryID).Return(nil, nil)
		tw.is.On("SaveImage", tw.ctx, imageData).Return("logoImageID", nil)
		tw.pm.On("Register", tw.ctx, &hub.Package{
			Name:           "test-operator",
			DisplayName:    "Test Operator",
			LogoImageID:    "logoImageID",
			Description:    "This is just a test",
			Keywords:       []string{"Test", "Application Runtime"},
			Readme:         "Test Operator README",
			Version:        "0.1.0",
			IsOperator:     true,
			ContainerImage: "repo.url:latest",
			Provider:       "Test",
			CreatedAt:      1561735380,
			Repository:     r,
			Channels: []*hub.Channel{
				{
					Name:    "alpha",
					Version: "0.1.0",
				},
			},
			DefaultChannel: "alpha",
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
			Maintainers: []*hub.Maintainer{
				{
					Name:  "Test",
					Email: "test@email.com",
				},
			},
			Data: map[string]interface{}{
				"capabilities": "Basic Install",
				"customResourcesDefinitions": []map[string]string{
					{
						"description": "Test CRD",
						"displayName": "Test",
						"kind":        "Test",
						"name":        "crd.test.com",
						"version":     "v1alpha1",
					},
				},
				"customResourcesDefinitionsExamples": "",
				"isGlobalOperator":                   true,
			},
		}).Return(nil)

		// Run tracker and check expectations
		err := tw.t.Track(tw.wg)
		assert.NoError(t, err)
		tw.assertExpectations(t)
	})

	t.Run("error unregistering operator version", func(t *testing.T) {
		// Setup tracker and expectations
		tw := newTrackerWrapper(r)
		tw.rc.On("CloneRepository", tw.ctx, r).Return(".", "testdata/path5", nil)
		tw.rm.On("GetPackagesDigest", tw.ctx, r.RepositoryID).Return(map[string]string{
			"test-operator@0.1.0": "",
		}, nil)
		tw.pm.On("Unregister", tw.ctx, &hub.Package{
			Name:       "test-operator",
			Version:    "0.1.0",
			Repository: r,
		}).Return(errFake)
		tw.ec.On("Append", r.RepositoryID, mock.Anything).Return()

		// Run tracker and check expectations
		err := tw.t.Track(tw.wg)
		assert.NoError(t, err)
		tw.assertExpectations(t)
	})

	t.Run("operator version unregistered successfully", func(t *testing.T) {
		// Setup tracker and expectations
		tw := newTrackerWrapper(r)
		tw.rc.On("CloneRepository", tw.ctx, r).Return(".", "testdata/path5", nil)
		tw.rm.On("GetPackagesDigest", tw.ctx, r.RepositoryID).Return(map[string]string{
			"test-operator@0.1.0": "",
		}, nil)
		tw.pm.On("Unregister", tw.ctx, &hub.Package{
			Name:       "test-operator",
			Version:    "0.1.0",
			Repository: r,
		}).Return(nil)

		// Run tracker and check expectations
		err := tw.t.Track(tw.wg)
		assert.NoError(t, err)
		tw.assertExpectations(t)
	})
}

func withRepositoryCloner(rc hub.RepositoryCloner) func(t *Tracker) {
	return func(t *Tracker) {
		t.rc = rc
	}
}

type trackerWrapper struct {
	ctx context.Context
	wg  *sync.WaitGroup
	rc  *repo.ClonerMock
	rm  *repo.ManagerMock
	pm  *pkg.ManagerMock
	is  *img.StoreMock
	ec  *tracker.ErrorsCollectorMock
	t   *Tracker
}

func newTrackerWrapper(r *hub.Repository) *trackerWrapper {
	ctx := context.Background()
	var wg sync.WaitGroup
	rc := &repo.ClonerMock{}
	rm := &repo.ManagerMock{}
	pm := &pkg.ManagerMock{}
	is := &img.StoreMock{}
	ec := &tracker.ErrorsCollectorMock{}

	wg.Add(1)
	t := NewTracker(ctx, r, rm, pm, is, ec, withRepositoryCloner(rc))

	return &trackerWrapper{
		ctx: ctx,
		wg:  &wg,
		rc:  rc,
		rm:  rm,
		pm:  pm,
		is:  is,
		ec:  ec,
		t:   t,
	}
}

func (tw *trackerWrapper) assertExpectations(t *testing.T) {
	tw.wg.Wait()

	tw.rc.AssertExpectations(t)
	tw.rm.AssertExpectations(t)
	tw.pm.AssertExpectations(t)
	tw.is.AssertExpectations(t)
	tw.ec.AssertExpectations(t)
}
