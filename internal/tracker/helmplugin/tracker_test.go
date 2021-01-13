package helmplugin

import (
	"context"
	"errors"
	"os"
	"testing"

	"github.com/artifacthub/hub/internal/hub"
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
		Kind:              hub.HelmPlugin,
		RepositoryID:      "00000000-0000-0000-0000-000000000001",
		Name:              "repo1",
		URL:               "https://github.com/org1/repo1",
		VerifiedPublisher: false,
	}

	t.Run("error cloning repository", func(t *testing.T) {
		t.Parallel()

		// Setup tracker and expectations
		tw := newTrackerWrapper(r)
		tw.rc.On("CloneRepository", tw.ctx, r).Return("", "", tests.ErrFake)

		// Run tracker and check expectations
		err := tw.t.Track()
		assert.True(t, errors.Is(err, tests.ErrFake))
		tw.assertExpectations(t)
	})

	t.Run("error loading repository registered packages", func(t *testing.T) {
		t.Parallel()

		// Setup tracker and expectations
		tw := newTrackerWrapper(r)
		tw.rc.On("CloneRepository", tw.ctx, r).Return("", "", nil)
		tw.rm.On("GetMetadata", mock.Anything).Return(&hub.RepositoryMetadata{}, nil)
		tw.rm.On("GetPackagesDigest", tw.ctx, r.RepositoryID).Return(nil, tests.ErrFake)

		// Run tracker and check expectations
		err := tw.t.Track()
		assert.True(t, errors.Is(err, tests.ErrFake))
		tw.assertExpectations(t)
	})

	t.Run("no packages in path, nothing to do", func(t *testing.T) {
		t.Parallel()

		// Setup tracker and expectations
		tw := newTrackerWrapper(r)
		tw.rc.On("CloneRepository", tw.ctx, r).Return(".", "testdata/path1", nil)
		tw.rm.On("GetMetadata", mock.Anything).Return(&hub.RepositoryMetadata{}, nil)
		tw.rm.On("GetPackagesDigest", tw.ctx, r.RepositoryID).Return(nil, nil)

		// Run tracker and check expectations
		err := tw.t.Track()
		assert.NoError(t, err)
		tw.assertExpectations(t)
	})

	t.Run("error parsing package metadata file", func(t *testing.T) {
		t.Parallel()

		// Setup tracker and expectations
		tw := newTrackerWrapper(r)
		tw.rc.On("CloneRepository", tw.ctx, r).Return(".", "testdata/path2", nil)
		tw.rm.On("GetMetadata", mock.Anything).Return(&hub.RepositoryMetadata{}, nil)
		tw.rm.On("GetPackagesDigest", tw.ctx, r.RepositoryID).Return(nil, nil)
		tw.ec.On("Append", r.RepositoryID, mock.Anything).Return()

		// Run tracker and check expectations
		err := tw.t.Track()
		assert.NoError(t, err)
		tw.assertExpectations(t)
	})

	t.Run("error registering package version", func(t *testing.T) {
		t.Parallel()

		// Setup tracker and expectations
		tw := newTrackerWrapper(r)
		tw.rc.On("CloneRepository", tw.ctx, r).Return(".", "testdata/path3", nil)
		tw.rm.On("GetMetadata", mock.Anything).Return(&hub.RepositoryMetadata{}, nil)
		tw.rm.On("GetPackagesDigest", tw.ctx, r.RepositoryID).Return(nil, nil)
		tw.pm.On("Register", tw.ctx, mock.Anything).Return(tests.ErrFake)
		tw.ec.On("Append", r.RepositoryID, mock.Anything).Return()

		// Run tracker and check expectations
		err := tw.t.Track()
		assert.NoError(t, err)
		tw.assertExpectations(t)
	})

	t.Run("no need to register package version because it is already registered", func(t *testing.T) {
		t.Parallel()

		// Setup tracker and expectations
		tw := newTrackerWrapper(r)
		tw.rc.On("CloneRepository", tw.ctx, r).Return(".", "testdata/path3", nil)
		tw.rm.On("GetMetadata", mock.Anything).Return(&hub.RepositoryMetadata{}, nil)
		tw.rm.On("GetPackagesDigest", tw.ctx, r.RepositoryID).Return(map[string]string{
			"test-plugin@0.1.0": "",
		}, nil)

		// Run tracker and check expectations
		err := tw.t.Track()
		assert.NoError(t, err)
		tw.assertExpectations(t)
	})

	t.Run("package version not registered because it is ignored", func(t *testing.T) {
		t.Parallel()

		// Setup tracker and expectations
		tw := newTrackerWrapper(r)
		tw.rc.On("CloneRepository", tw.ctx, r).Return(".", "testdata/path3", nil)
		tw.rm.On("GetMetadata", mock.Anything).Return(&hub.RepositoryMetadata{
			Ignore: []*hub.RepositoryIgnoreEntry{
				{
					Name: "test-plugin",
				},
			},
		}, nil)
		tw.rm.On("GetPackagesDigest", tw.ctx, r.RepositoryID).Return(nil, nil)

		// Run tracker and check expectations
		err := tw.t.Track()
		assert.NoError(t, err)
		tw.assertExpectations(t)
	})

	t.Run("package version registered successfully", func(t *testing.T) {
		t.Parallel()

		// Setup tracker and expectations
		tw := newTrackerWrapper(r)
		tw.rc.On("CloneRepository", tw.ctx, r).Return(".", "testdata/path3", nil)
		tw.rm.On("GetMetadata", mock.Anything).Return(&hub.RepositoryMetadata{}, nil)
		tw.rm.On("GetPackagesDigest", tw.ctx, r.RepositoryID).Return(nil, nil)
		tw.pm.On("Register", tw.ctx, &hub.Package{
			Name:        "test-plugin",
			Keywords:    []string{"helm", "helm-plugin"},
			Description: "This is a sample test plugin",
			Version:     "0.1.0",
			Readme:      "This is the readme file of the plugin\n",
			Repository:  r,
			License:     "Apache-2.0",
			Links: []*hub.Link{
				{
					Name: "Source",
					URL:  r.URL,
				},
			},
		}).Return(nil)

		// Run tracker and check expectations
		err := tw.t.Track()
		assert.NoError(t, err)
		tw.assertExpectations(t)
	})

	t.Run("error unregistering package version", func(t *testing.T) {
		t.Parallel()

		// Setup tracker and expectations
		tw := newTrackerWrapper(r)
		tw.rc.On("CloneRepository", tw.ctx, r).Return(".", "testdata/path3", nil)
		tw.rm.On("GetMetadata", mock.Anything).Return(&hub.RepositoryMetadata{RepositoryID: r.RepositoryID}, nil)
		tw.rm.On("GetPackagesDigest", tw.ctx, r.RepositoryID).Return(map[string]string{
			"test-plugin@0.1.0": "",
			"test-plugin@0.2.0": "",
		}, nil)
		tw.rm.On("SetVerifiedPublisher", tw.ctx, r.RepositoryID, true).Return(nil)
		tw.pm.On("Unregister", tw.ctx, &hub.Package{
			Name:       "test-plugin",
			Version:    "0.2.0",
			Repository: r,
		}).Return(tests.ErrFake)
		tw.ec.On("Append", r.RepositoryID, mock.Anything).Return()

		// Run tracker and check expectations
		err := tw.t.Track()
		assert.NoError(t, err)
		tw.assertExpectations(t)
	})

	t.Run("no packages unregistered because there are no packages available", func(t *testing.T) {
		t.Parallel()

		// Setup tracker and expectations
		tw := newTrackerWrapper(r)
		tw.rc.On("CloneRepository", tw.ctx, r).Return(".", "testdata/path1", nil)
		tw.rm.On("GetMetadata", mock.Anything).Return(&hub.RepositoryMetadata{RepositoryID: r.RepositoryID}, nil)
		tw.rm.On("GetPackagesDigest", tw.ctx, r.RepositoryID).Return(map[string]string{
			"test-plugin@0.1.0": "",
		}, nil)
		tw.rm.On("SetVerifiedPublisher", tw.ctx, r.RepositoryID, true).Return(nil)

		// Run tracker and check expectations
		err := tw.t.Track()
		assert.NoError(t, err)
		tw.assertExpectations(t)
	})

	t.Run("package version unregistered successfully", func(t *testing.T) {
		t.Parallel()

		// Setup tracker and expectations
		tw := newTrackerWrapper(r)
		tw.rc.On("CloneRepository", tw.ctx, r).Return(".", "testdata/path3", nil)
		tw.rm.On("GetMetadata", mock.Anything).Return(&hub.RepositoryMetadata{RepositoryID: r.RepositoryID}, nil)
		tw.rm.On("GetPackagesDigest", tw.ctx, r.RepositoryID).Return(map[string]string{
			"test-plugin@0.1.0": "",
			"test-plugin@0.2.0": "",
		}, nil)
		tw.rm.On("SetVerifiedPublisher", tw.ctx, r.RepositoryID, true).Return(nil)
		tw.pm.On("Unregister", tw.ctx, &hub.Package{
			Name:       "test-plugin",
			Version:    "0.2.0",
			Repository: r,
		}).Return(nil)

		// Run tracker and check expectations
		err := tw.t.Track()
		assert.NoError(t, err)
		tw.assertExpectations(t)
	})

	t.Run("all package versions unregistered because package is ignored", func(t *testing.T) {
		t.Parallel()

		// Setup tracker and expectations
		tw := newTrackerWrapper(r)
		tw.rc.On("CloneRepository", tw.ctx, r).Return(".", "testdata/path3", nil)
		tw.rm.On("GetMetadata", mock.Anything).Return(&hub.RepositoryMetadata{
			RepositoryID: r.RepositoryID,
			Ignore: []*hub.RepositoryIgnoreEntry{
				{
					Name: "test-plugin",
				},
			},
		}, nil)
		tw.rm.On("GetPackagesDigest", tw.ctx, r.RepositoryID).Return(map[string]string{
			"test-plugin@0.1.0": "",
		}, nil)
		tw.rm.On("SetVerifiedPublisher", tw.ctx, r.RepositoryID, true).Return(nil)
		tw.pm.On("Unregister", tw.ctx, &hub.Package{
			Name:       "test-plugin",
			Version:    "0.1.0",
			Repository: r,
		}).Return(nil)

		// Run tracker and check expectations
		err := tw.t.Track()
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
	rc  *repo.ClonerMock
	rm  *repo.ManagerMock
	pm  *pkg.ManagerMock
	ec  *tracker.ErrorsCollectorMock
	t   tracker.Tracker
}

func newTrackerWrapper(r *hub.Repository) *trackerWrapper {
	ctx := context.Background()
	cfg := viper.New()
	rc := &repo.ClonerMock{}
	rm := &repo.ManagerMock{}
	pm := &pkg.ManagerMock{}
	ec := &tracker.ErrorsCollectorMock{}
	svc := &tracker.Services{
		Ctx: ctx,
		Cfg: cfg,
		Rm:  rm,
		Pm:  pm,
		Ec:  ec,
	}

	t := NewTracker(svc, r, withRepositoryCloner(rc))

	return &trackerWrapper{
		ctx: ctx,
		cfg: cfg,
		rc:  rc,
		rm:  rm,
		pm:  pm,
		ec:  ec,
		t:   t,
	}
}

func (tw *trackerWrapper) assertExpectations(t *testing.T) {
	tw.rc.AssertExpectations(t)
	tw.rm.AssertExpectations(t)
	tw.pm.AssertExpectations(t)
	tw.ec.AssertExpectations(t)
}
