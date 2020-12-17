package olm

import (
	"context"
	"errors"
	"io/ioutil"
	"os"
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
	r1 := &hub.Repository{
		RepositoryID:      "00000000-0000-0000-0000-000000000001",
		Name:              "repo1",
		URL:               "https://github.com/org1/repo1/path/to/operators",
		VerifiedPublisher: false,
	}
	r2 := &hub.Repository{
		RepositoryID: "00000000-0000-0000-0000-000000000002",
		Name:         "repo2",
		URL:          "oci://registry.io/repo/index",
	}
	imageData, _ := ioutil.ReadFile("testdata/red-dot.png")

	t.Run("error exporting repository packages", func(t *testing.T) {
		t.Parallel()

		// Setup tracker and expectations
		tw := newTrackerWrapper(r2)
		tw.re.On("ExportRepository", tw.ctx, r2).Return("", tests.ErrFake)

		// Run tracker and check expectations
		err := tw.t.Track()
		assert.True(t, errors.Is(err, tests.ErrFake))
		tw.assertExpectations(t)
	})

	t.Run("error cloning repository", func(t *testing.T) {
		t.Parallel()

		// Setup tracker and expectations
		tw := newTrackerWrapper(r1)
		tw.rc.On("CloneRepository", tw.ctx, r1).Return("", "", tests.ErrFake)

		// Run tracker and check expectations
		err := tw.t.Track()
		assert.True(t, errors.Is(err, tests.ErrFake))
		tw.assertExpectations(t)
	})

	t.Run("error loading repository registered packages", func(t *testing.T) {
		t.Parallel()

		// Setup tracker and expectations
		tw := newTrackerWrapper(r1)
		tw.rc.On("CloneRepository", tw.ctx, r1).Return("", "", nil)
		tw.rm.On("GetMetadata", mock.Anything).Return(&hub.RepositoryMetadata{}, nil)
		tw.rm.On("GetPackagesDigest", tw.ctx, r1.RepositoryID).Return(nil, tests.ErrFake)

		// Run tracker and check expectations
		err := tw.t.Track()
		assert.True(t, errors.Is(err, tests.ErrFake))
		tw.assertExpectations(t)
	})

	t.Run("no packages in path, nothing to do", func(t *testing.T) {
		t.Parallel()

		// Setup tracker and expectations
		tw := newTrackerWrapper(r1)
		tw.rc.On("CloneRepository", tw.ctx, r1).Return(".", "testdata/path1", nil)
		tw.rm.On("GetMetadata", mock.Anything).Return(&hub.RepositoryMetadata{}, nil)
		tw.rm.On("GetPackagesDigest", tw.ctx, r1.RepositoryID).Return(nil, nil)

		// Run tracker and check expectations
		err := tw.t.Track()
		assert.NoError(t, err)
		tw.assertExpectations(t)
	})

	t.Run("package does not have a manifest file", func(t *testing.T) {
		t.Parallel()

		// Setup tracker and expectations
		tw := newTrackerWrapper(r1)
		tw.rc.On("CloneRepository", tw.ctx, r1).Return(".", "testdata/path2", nil)
		tw.rm.On("GetMetadata", mock.Anything).Return(&hub.RepositoryMetadata{}, nil)
		tw.rm.On("GetPackagesDigest", tw.ctx, r1.RepositoryID).Return(nil, nil)

		// Run tracker and check expectations
		err := tw.t.Track()
		assert.NoError(t, err)
		tw.assertExpectations(t)
	})

	t.Run("error getting package version csv", func(t *testing.T) {
		t.Parallel()

		// Setup tracker and expectations
		tw := newTrackerWrapper(r1)
		tw.rc.On("CloneRepository", tw.ctx, r1).Return(".", "testdata/path3", nil)
		tw.rm.On("GetMetadata", mock.Anything).Return(&hub.RepositoryMetadata{}, nil)
		tw.rm.On("GetPackagesDigest", tw.ctx, r1.RepositoryID).Return(nil, nil)
		tw.ec.On("Append", r1.RepositoryID, mock.Anything).Return()

		// Run tracker and check expectations
		err := tw.t.Track()
		assert.NoError(t, err)
		tw.assertExpectations(t)
	})

	t.Run("error registering package version", func(t *testing.T) {
		t.Parallel()

		// Setup tracker and expectations
		tw := newTrackerWrapper(r1)
		tw.rc.On("CloneRepository", tw.ctx, r1).Return(".", "testdata/path4", nil)
		tw.rm.On("GetMetadata", mock.Anything).Return(&hub.RepositoryMetadata{}, nil)
		tw.rm.On("GetPackagesDigest", tw.ctx, r1.RepositoryID).Return(nil, nil)
		tw.is.On("SaveImage", tw.ctx, imageData).Return("logoImageID", nil)
		tw.pm.On("Register", tw.ctx, mock.Anything).Return(tests.ErrFake)
		tw.ec.On("Append", r1.RepositoryID, mock.Anything).Return()

		// Run tracker and check expectations
		err := tw.t.Track()
		assert.NoError(t, err)
		tw.assertExpectations(t)
	})

	t.Run("no need to register package version because it is already registered", func(t *testing.T) {
		t.Parallel()

		// Setup tracker and expectations
		tw := newTrackerWrapper(r1)
		tw.rc.On("CloneRepository", tw.ctx, r1).Return(".", "testdata/path4", nil)
		tw.rm.On("GetMetadata", mock.Anything).Return(&hub.RepositoryMetadata{}, nil)
		tw.rm.On("GetPackagesDigest", tw.ctx, r1.RepositoryID).Return(map[string]string{
			"test-operator@0.1.0": "",
		}, nil)

		// Run tracker and check expectations
		err := tw.t.Track()
		assert.NoError(t, err)
		tw.assertExpectations(t)
	})

	t.Run("package version not registered because it is ignored", func(t *testing.T) {
		t.Parallel()

		// Setup tracker and expectations
		tw := newTrackerWrapper(r1)
		tw.rc.On("CloneRepository", tw.ctx, r1).Return(".", "testdata/path4", nil)
		tw.rm.On("GetMetadata", mock.Anything).Return(&hub.RepositoryMetadata{
			Ignore: []*hub.RepositoryIgnoreEntry{
				{
					Name: "test-operator",
				},
			},
		}, nil)
		tw.rm.On("GetPackagesDigest", tw.ctx, r1.RepositoryID).Return(nil, nil)

		// Run tracker and check expectations
		err := tw.t.Track()
		assert.NoError(t, err)
		tw.assertExpectations(t)
	})

	t.Run("package version registered successfully", func(t *testing.T) {
		t.Parallel()

		// Setup tracker and expectations
		tw := newTrackerWrapper(r1)
		tw.rc.On("CloneRepository", tw.ctx, r1).Return(".", "testdata/path4", nil)
		tw.rm.On("GetMetadata", mock.Anything).Return(&hub.RepositoryMetadata{}, nil)
		tw.rm.On("GetPackagesDigest", tw.ctx, r1.RepositoryID).Return(nil, nil)
		tw.is.On("SaveImage", tw.ctx, imageData).Return("logoImageID", nil)
		tw.pm.On("Register", tw.ctx, &hub.Package{
			Name:         "test-operator",
			DisplayName:  "Test Operator",
			LogoImageID:  "logoImageID",
			Description:  "This is just a test",
			Keywords:     []string{"Test", "Application Runtime"},
			Readme:       "Test Operator README",
			Version:      "0.1.0",
			IsOperator:   true,
			Capabilities: "Basic Install",
			ContainersImages: []*hub.ContainerImage{
				{
					Image: "repo.url:latest",
				},
				{
					Name:  "image1",
					Image: "registry.io/image1:1.0.0",
				},
				{
					Name:        "image2",
					Image:       "registry.io/image2:1.0.0",
					Whitelisted: true,
				},
			},
			Provider:   "Test",
			CreatedAt:  1561735380,
			Repository: r1,
			Channels: []*hub.Channel{
				{
					Name:    "alpha",
					Version: "0.1.0",
				},
			},
			DefaultChannel: "alpha",
			License:        "Apache-2.0",
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
			Changes: []string{
				"feature 1",
				"fix 1",
			},
			ContainsSecurityUpdates: true,
			Prerelease:              true,
			Maintainers: []*hub.Maintainer{
				{
					Name:  "Test",
					Email: "test@email.com",
				},
			},
			CRDs: []interface{}{
				map[string]interface{}{
					"description": "Test CRD",
					"displayName": "Test",
					"kind":        "Test",
					"name":        "test.crds.com",
					"version":     "v1",
				},
			},
			CRDsExamples: []interface{}{
				map[string]interface{}{
					"apiVersion": "crds.com/v1",
					"kind":       "Test",
				},
			},
			Data: map[string]interface{}{
				"isGlobalOperator": true,
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
		tw := newTrackerWrapper(r1)
		tw.rc.On("CloneRepository", tw.ctx, r1).Return(".", "testdata/path5", nil)
		tw.rm.On("GetMetadata", mock.Anything).Return(&hub.RepositoryMetadata{RepositoryID: r1.RepositoryID}, nil)
		tw.rm.On("GetPackagesDigest", tw.ctx, r1.RepositoryID).Return(map[string]string{
			"test-operator@0.1.0": "",
			"test-operator@0.2.0": "",
		}, nil)
		tw.rm.On("SetVerifiedPublisher", tw.ctx, r1.RepositoryID, true).Return(nil)
		tw.pm.On("Unregister", tw.ctx, &hub.Package{
			Name:       "test-operator",
			Version:    "0.1.0",
			Repository: r1,
		}).Return(tests.ErrFake)
		tw.ec.On("Append", r1.RepositoryID, mock.Anything).Return()

		// Run tracker and check expectations
		err := tw.t.Track()
		assert.NoError(t, err)
		tw.assertExpectations(t)
	})

	t.Run("no packages unregistered because there are no packages available", func(t *testing.T) {
		t.Parallel()

		// Setup tracker and expectations
		tw := newTrackerWrapper(r1)
		tw.rc.On("CloneRepository", tw.ctx, r1).Return(".", "testdata/path1", nil)
		tw.rm.On("GetMetadata", mock.Anything).Return(&hub.RepositoryMetadata{RepositoryID: r1.RepositoryID}, nil)
		tw.rm.On("GetPackagesDigest", tw.ctx, r1.RepositoryID).Return(map[string]string{
			"test-operator@0.1.0": "",
			"test-operator@0.2.0": "",
		}, nil)
		tw.rm.On("SetVerifiedPublisher", tw.ctx, r1.RepositoryID, true).Return(nil)

		// Run tracker and check expectations
		err := tw.t.Track()
		assert.NoError(t, err)
		tw.assertExpectations(t)
	})

	t.Run("package version unregistered successfully", func(t *testing.T) {
		t.Parallel()

		// Setup tracker and expectations
		tw := newTrackerWrapper(r1)
		tw.rc.On("CloneRepository", tw.ctx, r1).Return(".", "testdata/path5", nil)
		tw.rm.On("GetMetadata", mock.Anything).Return(&hub.RepositoryMetadata{RepositoryID: r1.RepositoryID}, nil)
		tw.rm.On("GetPackagesDigest", tw.ctx, r1.RepositoryID).Return(map[string]string{
			"test-operator@0.1.0": "",
			"test-operator@0.2.0": "",
		}, nil)
		tw.rm.On("SetVerifiedPublisher", tw.ctx, r1.RepositoryID, true).Return(nil)
		tw.pm.On("Unregister", tw.ctx, &hub.Package{
			Name:       "test-operator",
			Version:    "0.1.0",
			Repository: r1,
		}).Return(nil)

		// Run tracker and check expectations
		err := tw.t.Track()
		assert.NoError(t, err)
		tw.assertExpectations(t)
	})

	t.Run("all package versions unregistered because package is ignored", func(t *testing.T) {
		t.Parallel()

		// Setup tracker and expectations
		tw := newTrackerWrapper(r1)
		tw.rc.On("CloneRepository", tw.ctx, r1).Return(".", "testdata/path5", nil)
		tw.rm.On("GetMetadata", mock.Anything).Return(&hub.RepositoryMetadata{
			RepositoryID: r1.RepositoryID,
			Ignore: []*hub.RepositoryIgnoreEntry{
				{
					Name: "test-operator",
				},
			},
		}, nil)
		tw.rm.On("GetPackagesDigest", tw.ctx, r1.RepositoryID).Return(map[string]string{
			"test-operator@0.1.0": "",
			"test-operator@0.2.0": "",
		}, nil)
		tw.rm.On("SetVerifiedPublisher", tw.ctx, r1.RepositoryID, true).Return(nil)
		tw.pm.On("Unregister", tw.ctx, &hub.Package{
			Name:       "test-operator",
			Version:    "0.1.0",
			Repository: r1,
		}).Return(nil)
		tw.pm.On("Unregister", tw.ctx, &hub.Package{
			Name:       "test-operator",
			Version:    "0.2.0",
			Repository: r1,
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
	re  *repo.OLMRepositoryExporterMock
	is  *img.StoreMock
	ec  *tracker.ErrorsCollectorMock
	t   tracker.Tracker
}

func newTrackerWrapper(r *hub.Repository) *trackerWrapper {
	ctx := context.Background()
	cfg := viper.New()
	rc := &repo.ClonerMock{}
	rm := &repo.ManagerMock{}
	pm := &pkg.ManagerMock{}
	re := &repo.OLMRepositoryExporterMock{}
	is := &img.StoreMock{}
	ec := &tracker.ErrorsCollectorMock{}
	svc := &tracker.Services{
		Ctx: ctx,
		Cfg: cfg,
		Rm:  rm,
		Pm:  pm,
		Re:  re,
		Is:  is,
		Ec:  ec,
	}

	t := NewTracker(svc, r, withRepositoryCloner(rc))

	return &trackerWrapper{
		ctx: ctx,
		cfg: cfg,
		rc:  rc,
		rm:  rm,
		pm:  pm,
		re:  re,
		is:  is,
		ec:  ec,
		t:   t,
	}
}

func (tw *trackerWrapper) assertExpectations(t *testing.T) {
	tw.re.AssertExpectations(t)
	tw.rc.AssertExpectations(t)
	tw.rm.AssertExpectations(t)
	tw.pm.AssertExpectations(t)
	tw.is.AssertExpectations(t)
	tw.ec.AssertExpectations(t)
}
