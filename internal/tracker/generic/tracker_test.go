package generic

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
	r := &hub.Repository{
		RepositoryID: "00000000-0000-0000-0000-000000000001",
		Name:         "repo1",
		URL:          "https://github.com/org1/repo1/path/to/packages",
	}
	rOPA := &hub.Repository{
		Kind:         hub.OPA,
		RepositoryID: "00000000-0000-0000-0000-000000000002",
		Name:         "repo2",
		URL:          "https://github.com/org1/repo2/path/to/packages",
	}
	imageData, _ := ioutil.ReadFile("testdata/red-dot.png")

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
		tw.rm.On("GetPackagesDigest", tw.ctx, r.RepositoryID).Return(nil, nil)
		tw.rm.On("GetMetadata", mock.Anything).Return(&hub.RepositoryMetadata{}, nil)

		// Run tracker and check expectations
		err := tw.t.Track()
		assert.NoError(t, err)
		tw.assertExpectations(t)
	})

	t.Run("invalid package metadata file", func(t *testing.T) {
		t.Parallel()

		// Setup tracker and expectations
		tw := newTrackerWrapper(r)
		tw.rc.On("CloneRepository", tw.ctx, r).Return(".", "testdata/path2", nil)
		tw.rm.On("GetPackagesDigest", tw.ctx, r.RepositoryID).Return(nil, nil)
		tw.rm.On("GetMetadata", mock.Anything).Return(&hub.RepositoryMetadata{}, nil)
		tw.ec.On("Append", r.RepositoryID, mock.Anything).Return()

		// Run tracker and check expectations
		err := tw.t.Track()
		assert.NoError(t, err)
		tw.assertExpectations(t)
	})

	t.Run("invalid version in package metadata file", func(t *testing.T) {
		t.Parallel()

		// Setup tracker and expectations
		tw := newTrackerWrapper(r)
		tw.rc.On("CloneRepository", tw.ctx, r).Return(".", "testdata/path3", nil)
		tw.rm.On("GetPackagesDigest", tw.ctx, r.RepositoryID).Return(nil, nil)
		tw.rm.On("GetMetadata", mock.Anything).Return(&hub.RepositoryMetadata{}, nil)
		tw.ec.On("Append", r.RepositoryID, mock.Anything).Return()

		// Run tracker and check expectations
		err := tw.t.Track()
		assert.NoError(t, err)
		tw.assertExpectations(t)
	})

	t.Run("(opa) package version not registered as it doesn't contain policies files", func(t *testing.T) {
		t.Parallel()

		// Setup tracker and expectations
		tw := newTrackerWrapper(rOPA)
		tw.rc.On("CloneRepository", tw.ctx, rOPA).Return(".", "testdata/path4", nil)
		tw.rm.On("GetPackagesDigest", tw.ctx, rOPA.RepositoryID).Return(nil, nil)
		tw.rm.On("GetMetadata", mock.Anything).Return(&hub.RepositoryMetadata{}, nil)
		tw.ec.On("Append", rOPA.RepositoryID, mock.Anything).Return()

		// Run tracker and check expectations
		err := tw.t.Track()
		assert.NoError(t, err)
		tw.assertExpectations(t)
	})

	t.Run("(opa) error registering package version", func(t *testing.T) {
		t.Parallel()

		// Setup tracker and expectations
		tw := newTrackerWrapper(rOPA)
		tw.rc.On("CloneRepository", tw.ctx, rOPA).Return(".", "testdata/path5", nil)
		tw.rm.On("GetPackagesDigest", tw.ctx, rOPA.RepositoryID).Return(nil, nil)
		tw.rm.On("GetMetadata", mock.Anything).Return(&hub.RepositoryMetadata{RepositoryID: rOPA.RepositoryID}, nil)
		tw.rm.On("SetVerifiedPublisher", tw.ctx, rOPA.RepositoryID, true).Return(nil)
		tw.is.On("SaveImage", tw.ctx, imageData).Return("logoImageID", nil)
		tw.pm.On("Register", tw.ctx, mock.Anything).Return(tests.ErrFake)
		tw.ec.On("Append", rOPA.RepositoryID, mock.Anything).Return()

		// Run tracker and check expectations
		err := tw.t.Track()
		assert.NoError(t, err)
		tw.assertExpectations(t)
	})

	t.Run("(opa) no need to register package version because it is already registered", func(t *testing.T) {
		t.Parallel()

		// Setup tracker and expectations
		tw := newTrackerWrapper(rOPA)
		tw.rc.On("CloneRepository", tw.ctx, rOPA).Return(".", "testdata/path5", nil)
		tw.rm.On("GetPackagesDigest", tw.ctx, rOPA.RepositoryID).Return(map[string]string{
			"package-name@1.0.0": "0123456789",
		}, nil)
		tw.rm.On("GetMetadata", mock.Anything).Return(&hub.RepositoryMetadata{RepositoryID: rOPA.RepositoryID}, nil)
		tw.rm.On("SetVerifiedPublisher", tw.ctx, rOPA.RepositoryID, true).Return(nil)

		// Run tracker and check expectations
		err := tw.t.Track()
		assert.NoError(t, err)
		tw.assertExpectations(t)
	})

	t.Run("(opa) package version registered successfully", func(t *testing.T) {
		t.Parallel()

		// Setup tracker and expectations
		tw := newTrackerWrapper(rOPA)
		tw.rc.On("CloneRepository", tw.ctx, rOPA).Return(".", "testdata/path5", nil)
		tw.rm.On("GetPackagesDigest", tw.ctx, rOPA.RepositoryID).Return(nil, nil)
		tw.rm.On("GetMetadata", mock.Anything).Return(&hub.RepositoryMetadata{RepositoryID: rOPA.RepositoryID}, nil)
		tw.rm.On("SetVerifiedPublisher", tw.ctx, rOPA.RepositoryID, true).Return(nil)
		tw.is.On("SaveImage", tw.ctx, imageData).Return("logoImageID", nil)
		tw.pm.On("Register", tw.ctx, &hub.Package{
			Version:     "1.0.0",
			Name:        "package-name",
			DisplayName: "Package name",
			CreatedAt:   1561735380,
			Description: "Description",
			Digest:      "0123456789",
			License:     "Apache-2.0",
			HomeURL:     "https://home.url",
			AppVersion:  "10.0.0",
			ContainersImages: []*hub.ContainerImage{
				{
					Image: "registry/test/test:latest",
				},
			},
			IsOperator: false,
			Deprecated: false,
			Keywords:   []string{"kw1", "kw2"},
			Links: []*hub.Link{
				{
					Name: "Link1",
					URL:  "https://link1.url",
				},
			},
			Readme:  "Package documentation in markdown format",
			Install: "Brief install instructions in markdown format",
			Changes: []string{
				"feature 1",
				"fix 1",
			},
			ContainsSecurityUpdates: true,
			Maintainers: []*hub.Maintainer{
				{
					Name:  "Maintainer",
					Email: "test@email.com",
				},
			},
			Provider: "Provider",
			Data: map[string]interface{}{
				"policies": map[string]string{
					"policy1.rego": "policy content\n",
				},
			},
			Repository:  rOPA,
			LogoImageID: "logoImageID",
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
		tw.rc.On("CloneRepository", tw.ctx, r).Return(".", "testdata/path6", nil)
		tw.rm.On("GetPackagesDigest", tw.ctx, r.RepositoryID).Return(map[string]string{
			"package-name@1.0.0": "",
			"package-name@2.0.0": "",
		}, nil)
		tw.rm.On("GetMetadata", mock.Anything).Return(&hub.RepositoryMetadata{}, nil)
		tw.pm.On("Unregister", tw.ctx, &hub.Package{
			Name:       "package-name",
			Version:    "1.0.0",
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
		tw.rm.On("GetPackagesDigest", tw.ctx, r.RepositoryID).Return(map[string]string{
			"package-name@1.0.0": "",
			"package-name@2.0.0": "",
		}, nil)
		tw.rm.On("GetMetadata", mock.Anything).Return(&hub.RepositoryMetadata{}, nil)

		// Run tracker and check expectations
		err := tw.t.Track()
		assert.NoError(t, err)
		tw.assertExpectations(t)
	})

	t.Run("package version unregistered successfully", func(t *testing.T) {
		t.Parallel()

		// Setup tracker and expectations
		tw := newTrackerWrapper(r)
		tw.rc.On("CloneRepository", tw.ctx, r).Return(".", "testdata/path6", nil)
		tw.rm.On("GetPackagesDigest", tw.ctx, r.RepositoryID).Return(map[string]string{
			"package-name@1.0.0": "",
			"package-name@2.0.0": "",
		}, nil)
		tw.rm.On("GetMetadata", mock.Anything).Return(&hub.RepositoryMetadata{}, nil)
		tw.pm.On("Unregister", tw.ctx, &hub.Package{
			Name:       "package-name",
			Version:    "1.0.0",
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

	t := NewTracker(svc, r, withRepositoryCloner(rc))

	return &trackerWrapper{
		ctx: ctx,
		cfg: cfg,
		rc:  rc,
		rm:  rm,
		pm:  pm,
		is:  is,
		ec:  ec,
		t:   t,
	}
}

func (tw *trackerWrapper) assertExpectations(t *testing.T) {
	tw.rc.AssertExpectations(t)
	tw.rm.AssertExpectations(t)
	tw.pm.AssertExpectations(t)
	tw.is.AssertExpectations(t)
	tw.ec.AssertExpectations(t)
}
