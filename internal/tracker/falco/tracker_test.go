package falco

import (
	"context"
	"errors"
	"os"
	"sync"
	"testing"

	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/img"
	"github.com/artifacthub/hub/internal/pkg"
	"github.com/artifacthub/hub/internal/repo"
	"github.com/artifacthub/hub/internal/tests"
	"github.com/artifacthub/hub/internal/tracker"
	"github.com/rs/zerolog"
	"github.com/spf13/viper"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

func TestMain(m *testing.M) {
	zerolog.SetGlobalLevel(zerolog.Disabled)
	os.Exit(m.Run())
}

func TestTracker(t *testing.T) {
	r := &hub.Repository{
		RepositoryID:      "00000000-0000-0000-0000-000000000001",
		Name:              "repo1",
		URL:               "https://github.com/org1/repo1/path/to/packages",
		VerifiedPublisher: false,
	}

	t.Run("error getting repository remote digest", func(t *testing.T) {
		// Setup tracker and expectations
		tw := newTrackerWrapper(r)
		tw.rm.On("GetRemoteDigest", tw.ctx, r).Return("", tests.ErrFake)

		// Run tracker and check expectations
		err := tw.t.Track(tw.wg)
		assert.True(t, errors.Is(err, tests.ErrFake))
		tw.assertExpectations(t)
	})

	t.Run("digest has not changed, the repository has not been updated", func(t *testing.T) {
		// Setup tracker and expectations
		r := &hub.Repository{
			Digest: "oldDigest",
		}
		tw := newTrackerWrapper(r)
		tw.rm.On("GetRemoteDigest", tw.ctx, r).Return("oldDigest", nil)

		// Run tracker and check expectations
		err := tw.t.Track(tw.wg)
		assert.Nil(t, err)
		tw.assertExpectations(t)
	})

	t.Run("error cloning repository", func(t *testing.T) {
		// Setup tracker and expectations
		tw := newTrackerWrapper(r)
		tw.rm.On("GetRemoteDigest", tw.ctx, r).Return("digest", nil)
		tw.rc.On("CloneRepository", tw.ctx, r).Return("", "", tests.ErrFake)

		// Run tracker and check expectations
		err := tw.t.Track(tw.wg)
		assert.True(t, errors.Is(err, tests.ErrFake))
		tw.assertExpectations(t)
	})

	t.Run("error loading repository registered packages", func(t *testing.T) {
		// Setup tracker and expectations
		tw := newTrackerWrapper(r)
		tw.rm.On("GetRemoteDigest", tw.ctx, r).Return("digest", nil)
		tw.rc.On("CloneRepository", tw.ctx, r).Return("", "", nil)
		tw.rm.On("GetPackagesDigest", tw.ctx, r.RepositoryID).Return(nil, tests.ErrFake)

		// Run tracker and check expectations
		err := tw.t.Track(tw.wg)
		assert.True(t, errors.Is(err, tests.ErrFake))
		tw.assertExpectations(t)
	})

	t.Run("no packages in path, nothing to do", func(t *testing.T) {
		// Setup tracker and expectations
		tw := newTrackerWrapper(r)
		tw.rm.On("GetRemoteDigest", tw.ctx, r).Return("digest", nil)
		tw.rc.On("CloneRepository", tw.ctx, r).Return(".", "testdata/path1", nil)
		tw.rm.On("GetPackagesDigest", tw.ctx, r.RepositoryID).Return(nil, nil)
		tw.rm.On("GetMetadata", mock.Anything).Return(&hub.RepositoryMetadata{}, nil)
		tw.rm.On("UpdateDigest", tw.ctx, r.RepositoryID, "digest").Return(nil)

		// Run tracker and check expectations
		err := tw.t.Track(tw.wg)
		assert.NoError(t, err)
		tw.assertExpectations(t)
	})

	t.Run("invalid package metadata file", func(t *testing.T) {
		// Setup tracker and expectations
		tw := newTrackerWrapper(r)
		tw.rm.On("GetRemoteDigest", tw.ctx, r).Return("digest", nil)
		tw.rc.On("CloneRepository", tw.ctx, r).Return(".", "testdata/path2", nil)
		tw.rm.On("GetPackagesDigest", tw.ctx, r.RepositoryID).Return(nil, nil)
		tw.rm.On("GetMetadata", mock.Anything).Return(&hub.RepositoryMetadata{}, nil)
		tw.ec.On("Append", r.RepositoryID, mock.Anything).Return()
		tw.rm.On("UpdateDigest", tw.ctx, r.RepositoryID, "digest").Return(nil)

		// Run tracker and check expectations
		err := tw.t.Track(tw.wg)
		assert.NoError(t, err)
		tw.assertExpectations(t)
	})

	t.Run("invalid version in package metadata file", func(t *testing.T) {
		// Setup tracker and expectations
		tw := newTrackerWrapper(r)
		tw.rm.On("GetRemoteDigest", tw.ctx, r).Return("digest", nil)
		tw.rc.On("CloneRepository", tw.ctx, r).Return(".", "testdata/path3", nil)
		tw.rm.On("GetPackagesDigest", tw.ctx, r.RepositoryID).Return(nil, nil)
		tw.rm.On("GetMetadata", mock.Anything).Return(&hub.RepositoryMetadata{}, nil)
		tw.ec.On("Append", r.RepositoryID, mock.Anything).Return()
		tw.rm.On("UpdateDigest", tw.ctx, r.RepositoryID, "digest").Return(nil)

		// Run tracker and check expectations
		err := tw.t.Track(tw.wg)
		assert.NoError(t, err)
		tw.assertExpectations(t)
	})

	t.Run("error registering package version", func(t *testing.T) {
		// Setup tracker and expectations
		tw := newTrackerWrapper(r)
		tw.rm.On("GetRemoteDigest", tw.ctx, r).Return("digest", nil)
		tw.rc.On("CloneRepository", tw.ctx, r).Return(".", "testdata/path4", nil)
		tw.rm.On("GetPackagesDigest", tw.ctx, r.RepositoryID).Return(nil, nil)
		tw.rm.On("GetMetadata", mock.Anything).Return(&hub.RepositoryMetadata{RepositoryID: r.RepositoryID}, nil)
		tw.rm.On("SetVerifiedPublisher", tw.ctx, r.RepositoryID, true).Return(nil)
		tw.pm.On("Register", tw.ctx, mock.Anything).Return(tests.ErrFake)
		tw.ec.On("Append", r.RepositoryID, mock.Anything).Return()
		tw.rm.On("UpdateDigest", tw.ctx, r.RepositoryID, "digest").Return(nil)

		// Run tracker and check expectations
		err := tw.t.Track(tw.wg)
		assert.NoError(t, err)
		tw.assertExpectations(t)
	})

	t.Run("no need to register package version because it is already registered", func(t *testing.T) {
		// Setup tracker and expectations
		tw := newTrackerWrapper(r)
		tw.rm.On("GetRemoteDigest", tw.ctx, r).Return("digest", nil)
		tw.rc.On("CloneRepository", tw.ctx, r).Return(".", "testdata/path4", nil)
		tw.rm.On("GetPackagesDigest", tw.ctx, r.RepositoryID).Return(map[string]string{
			"test@0.1.0": "",
		}, nil)
		tw.rm.On("GetMetadata", mock.Anything).Return(&hub.RepositoryMetadata{RepositoryID: r.RepositoryID}, nil)
		tw.rm.On("SetVerifiedPublisher", tw.ctx, r.RepositoryID, true).Return(nil)
		tw.rm.On("UpdateDigest", tw.ctx, r.RepositoryID, "digest").Return(nil)

		// Run tracker and check expectations
		err := tw.t.Track(tw.wg)
		assert.NoError(t, err)
		tw.assertExpectations(t)
	})

	t.Run("package version registered successfully", func(t *testing.T) {
		// Setup tracker and expectations
		tw := newTrackerWrapper(r)
		tw.rm.On("GetRemoteDigest", tw.ctx, r).Return("digest", nil)
		tw.rc.On("CloneRepository", tw.ctx, r).Return(".", "testdata/path4", nil)
		tw.rm.On("GetPackagesDigest", tw.ctx, r.RepositoryID).Return(nil, nil)
		tw.rm.On("GetMetadata", mock.Anything).Return(&hub.RepositoryMetadata{RepositoryID: r.RepositoryID}, nil)
		tw.rm.On("SetVerifiedPublisher", tw.ctx, r.RepositoryID, true).Return(nil)
		tw.pm.On("Register", tw.ctx, &hub.Package{
			Name:        "test",
			Description: "Short description",
			Keywords:    []string{"kw1", "kw2"},
			Readme:      "Description",
			Version:     "0.1.0",
			Provider:    "Sample provider",
			Repository:  r,
			Links: []*hub.Link{
				{
					Name: "source",
					URL:  "https://github.com/org1/repo1/blob/master/path/to/packages/test.yaml",
				},
			},
			Data: map[string]interface{}{
				"rules": []*Rule{
					{
						Raw: "Falco rules in YAML",
					},
				},
			},
		}).Return(nil)
		tw.rm.On("UpdateDigest", tw.ctx, r.RepositoryID, "digest").Return(nil)

		// Run tracker and check expectations
		err := tw.t.Track(tw.wg)
		assert.NoError(t, err)
		tw.assertExpectations(t)
	})

	t.Run("error unregistering package version", func(t *testing.T) {
		// Setup tracker and expectations
		tw := newTrackerWrapper(r)
		tw.rm.On("GetRemoteDigest", tw.ctx, r).Return("digest", nil)
		tw.rc.On("CloneRepository", tw.ctx, r).Return(".", "testdata/path1", nil)
		tw.rm.On("GetPackagesDigest", tw.ctx, r.RepositoryID).Return(map[string]string{
			"test@0.1.0": "",
		}, nil)
		tw.rm.On("GetMetadata", mock.Anything).Return(&hub.RepositoryMetadata{}, nil)
		tw.pm.On("Unregister", tw.ctx, &hub.Package{
			Name:       "test",
			Version:    "0.1.0",
			Repository: r,
		}).Return(tests.ErrFake)
		tw.ec.On("Append", r.RepositoryID, mock.Anything).Return()
		tw.rm.On("UpdateDigest", tw.ctx, r.RepositoryID, "digest").Return(nil)

		// Run tracker and check expectations
		err := tw.t.Track(tw.wg)
		assert.NoError(t, err)
		tw.assertExpectations(t)
	})

	t.Run("package version unregistered successfully", func(t *testing.T) {
		// Setup tracker and expectations
		tw := newTrackerWrapper(r)
		tw.rm.On("GetRemoteDigest", tw.ctx, r).Return("digest", nil)
		tw.rc.On("CloneRepository", tw.ctx, r).Return(".", "testdata/path1", nil)
		tw.rm.On("GetPackagesDigest", tw.ctx, r.RepositoryID).Return(map[string]string{
			"test@0.1.0": "",
		}, nil)
		tw.rm.On("GetMetadata", mock.Anything).Return(&hub.RepositoryMetadata{}, nil)
		tw.pm.On("Unregister", tw.ctx, &hub.Package{
			Name:       "test",
			Version:    "0.1.0",
			Repository: r,
		}).Return(nil)
		tw.rm.On("UpdateDigest", tw.ctx, r.RepositoryID, "digest").Return(nil)

		// Run tracker and check expectations
		err := tw.t.Track(tw.wg)
		assert.NoError(t, err)
		tw.assertExpectations(t)
	})
}

func withRepositoryCloner(rc hub.RepositoryCloner) func(t tracker.Tracker) {
	return func(t tracker.Tracker) {
		t.(*Tracker).svc.Rc = rc
	}
}

type trackerWrapper struct {
	ctx context.Context
	cfg *viper.Viper
	wg  *sync.WaitGroup
	rc  *repo.ClonerMock
	rm  *repo.ManagerMock
	pm  *pkg.ManagerMock
	is  *img.StoreMock
	ec  *tracker.ErrorsCollectorMock
	t   tracker.Tracker
}

func newTrackerWrapper(r *hub.Repository) *trackerWrapper {
	ctx := context.Background()
	cfg := viper.New()
	var wg sync.WaitGroup
	rc := &repo.ClonerMock{}
	rm := &repo.ManagerMock{}
	pm := &pkg.ManagerMock{}
	is := &img.StoreMock{}
	ec := &tracker.ErrorsCollectorMock{}
	svc := &tracker.Services{
		Ctx: ctx,
		Cfg: cfg,
		Rm:  rm,
		Pm:  pm,
		Is:  is,
		Ec:  ec,
	}

	wg.Add(1)
	t := NewTracker(svc, r, withRepositoryCloner(rc))

	return &trackerWrapper{
		ctx: ctx,
		cfg: cfg,
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
