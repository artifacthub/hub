package tracker

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"testing"

	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/img"
	"github.com/artifacthub/hub/internal/pkg"
	"github.com/artifacthub/hub/internal/repo"
	"github.com/artifacthub/hub/internal/tests"
	"github.com/artifacthub/hub/internal/tracker/source"
	"github.com/rs/zerolog"
	"github.com/spf13/viper"
	"github.com/stretchr/testify/assert"
)

func TestTracker(t *testing.T) {
	// Define some repositories and packages for the tests
	r1 := &hub.Repository{
		RepositoryID: "repo1",
		Kind:         hub.Helm,
		URL:          "https://repo.url",
	}
	p1v1 := &hub.Package{
		Name:       "pkg1",
		Version:    "1.0.0",
		Repository: r1,
	}
	p1v2 := &hub.Package{
		Name:       "pkg1",
		Version:    "2.0.0",
		Repository: r1,
	}
	p2v1 := &hub.Package{
		Name:       "pkg2",
		Version:    "1.0.0",
		Repository: r1,
	}

	t.Run("error getting repository remote digest", func(t *testing.T) {
		t.Parallel()

		// Setup services and expectations
		r := &hub.Repository{}
		sw := newServicesWrapper()
		sw.rm.On("GetRemoteDigest", sw.svc.Ctx, r).Return("", tests.ErrFake)

		// Run test and check expectations
		err := New(sw.svc, r, zerolog.Nop()).Run()
		assert.True(t, errors.Is(err, tests.ErrFake))
		sw.assertExpectations(t)
	})

	t.Run("repository has not been updated, same digest", func(t *testing.T) {
		t.Parallel()

		// Setup services and expectations
		r := &hub.Repository{
			Digest: "digest",
		}
		sw := newServicesWrapper()
		sw.rm.On("GetRemoteDigest", sw.svc.Ctx, r).Return(r.Digest, nil)

		// Run test and check expectations
		err := New(sw.svc, r, zerolog.Nop()).Run()
		assert.Nil(t, err)
		sw.assertExpectations(t)
	})

	t.Run("repository has not been updated, but bypassDigestCheck is enabled", func(t *testing.T) {
		t.Parallel()

		// Setup services and expectations
		r := &hub.Repository{
			RepositoryID: "repo1",
			Digest:       "digest",
		}
		sw := newServicesWrapper()
		sw.svc.Cfg.Set("tracker.bypassDigestCheck", true)
		sw.rm.On("GetRemoteDigest", sw.svc.Ctx, r).Return(r.Digest, nil)
		sw.ec.On("Init", r.RepositoryID)
		sw.rm.On("GetMetadata", r, "").Return(nil, nil)
		sw.rm.On("GetPackagesDigest", sw.svc.Ctx, r.RepositoryID).Return(nil, tests.ErrFake)

		// Run test and check expectations
		err := New(sw.svc, r, zerolog.Nop()).Run()
		assert.True(t, errors.Is(err, tests.ErrFake))
		sw.assertExpectations(t)
	})

	t.Run("error cloning or exporting repository", func(t *testing.T) {
		repositories := []*hub.Repository{
			{
				RepositoryID: "test1",
				Kind:         hub.OLM,
				URL:          "https://github.com/org1/repo1",
			},
			{
				RepositoryID: "test2",
				Kind:         hub.OLM,
				URL:          "oci://github.com/org1/repo1",
			},
			{
				RepositoryID: "test3",
				Kind:         hub.OPA,
			},
		}
		for _, r := range repositories {
			r := r
			t.Run(r.RepositoryID, func(t *testing.T) {
				t.Parallel()

				// Setup services and expectations
				sw := newServicesWrapper()
				sw.rm.On("GetRemoteDigest", sw.svc.Ctx, r).Return("", nil)
				sw.ec.On("Init", r.RepositoryID)
				switch r.Kind {
				case hub.OLM:
					if strings.HasPrefix(r.URL, hub.RepositoryOCIPrefix) {
						sw.oe.On("ExportRepository", sw.svc.Ctx, r).Return("", tests.ErrFake)
					} else {
						sw.rc.On("CloneRepository", sw.svc.Ctx, r).Return("", "", tests.ErrFake)
					}
				case hub.OPA:
					sw.rc.On("CloneRepository", sw.svc.Ctx, r).Return("", "", tests.ErrFake)
				}

				// Run test and check expectations
				err := New(sw.svc, r, zerolog.Nop()).Run()
				assert.True(t, errors.Is(err, tests.ErrFake))
				sw.assertExpectations(t)
			})
		}
	})

	t.Run("error loading packages registered", func(t *testing.T) {
		t.Parallel()

		// Setup services and expectations
		sw := newServicesWrapper()
		sw.rm.On("GetRemoteDigest", sw.svc.Ctx, r1).Return("", nil)
		sw.ec.On("Init", r1.RepositoryID)
		sw.rm.On("GetMetadata", r1, "").Return(nil, nil)
		sw.rm.On("GetPackagesDigest", sw.svc.Ctx, r1.RepositoryID).Return(nil, tests.ErrFake)

		// Run test and check expectations
		err := New(sw.svc, r1, zerolog.Nop()).Run()
		assert.True(t, errors.Is(err, tests.ErrFake))
		sw.assertExpectations(t)
	})

	t.Run("error getting packages available", func(t *testing.T) {
		t.Parallel()

		// Setup services and expectations
		sw := newServicesWrapper()
		sw.rm.On("GetRemoteDigest", sw.svc.Ctx, r1).Return("", nil)
		sw.ec.On("Init", r1.RepositoryID)
		sw.rm.On("GetMetadata", r1, "").Return(nil, nil)
		sw.rm.On("GetPackagesDigest", sw.svc.Ctx, r1.RepositoryID).Return(nil, nil)
		sw.src.On("GetPackagesAvailable").Return(nil, tests.ErrFake)

		// Run test and check expectations
		err := New(sw.svc, r1, zerolog.Nop()).Run()
		assert.True(t, errors.Is(err, tests.ErrFake))
		sw.assertExpectations(t)
	})

	t.Run("no packages available, nothing to do", func(t *testing.T) {
		t.Parallel()

		// Setup services and expectations
		sw := newServicesWrapper()
		sw.rm.On("GetRemoteDigest", sw.svc.Ctx, r1).Return("", nil)
		sw.ec.On("Init", r1.RepositoryID)
		sw.rm.On("GetMetadata", r1, "").Return(nil, nil)
		sw.rm.On("GetPackagesDigest", sw.svc.Ctx, r1.RepositoryID).Return(nil, nil)
		sw.src.On("GetPackagesAvailable").Return(map[string]*hub.Package{}, nil)

		// Run test and check expectations
		err := New(sw.svc, r1, zerolog.Nop()).Run()
		assert.Nil(t, err)
		sw.assertExpectations(t)
	})

	t.Run("error registering package", func(t *testing.T) {
		t.Parallel()

		// Setup services and expectations
		sw := newServicesWrapper()
		sw.rm.On("GetRemoteDigest", sw.svc.Ctx, r1).Return("", nil)
		sw.ec.On("Init", r1.RepositoryID)
		sw.rm.On("GetMetadata", r1, "").Return(nil, nil)
		sw.rm.On("GetPackagesDigest", sw.svc.Ctx, r1.RepositoryID).Return(nil, nil)
		p := source.ClonePackage(p1v1)
		p.Category = hub.SkipCategoryPrediction
		sw.src.On("GetPackagesAvailable").Return(map[string]*hub.Package{
			pkg.BuildKey(p): p,
		}, nil)
		sw.pm.On("Register", sw.svc.Ctx, p).Return(tests.ErrFake)
		expectedErr := "error registering package pkg1 version 1.0.0: fake error for tests"
		sw.ec.On("Append", r1.RepositoryID, expectedErr).Return()

		// Run test and check expectations
		err := New(sw.svc, r1, zerolog.Nop()).Run()
		assert.Nil(t, err)
		sw.assertExpectations(t)
	})

	t.Run("package available but not registered because it already was (same digest)", func(t *testing.T) {
		t.Parallel()

		// Setup services and expectations
		sw := newServicesWrapper()
		sw.rm.On("GetRemoteDigest", sw.svc.Ctx, r1).Return("", nil)
		sw.ec.On("Init", r1.RepositoryID)
		sw.rm.On("GetMetadata", r1, "").Return(nil, nil)
		sw.rm.On("GetPackagesDigest", sw.svc.Ctx, r1.RepositoryID).Return(map[string]string{
			pkg.BuildKey(p1v1): "",
		}, nil)
		sw.src.On("GetPackagesAvailable").Return(map[string]*hub.Package{
			pkg.BuildKey(p1v1): p1v1,
		}, nil)

		// Run test and check expectations
		err := New(sw.svc, r1, zerolog.Nop()).Run()
		assert.Nil(t, err)
		sw.assertExpectations(t)
	})

	t.Run("package available but not registered because it already was (digest has not changed)", func(t *testing.T) {
		t.Parallel()

		// Setup services and expectations
		sw := newServicesWrapper()
		sw.rm.On("GetRemoteDigest", sw.svc.Ctx, r1).Return("", nil)
		sw.ec.On("Init", r1.RepositoryID)
		sw.rm.On("GetMetadata", r1, "").Return(nil, nil)
		sw.rm.On("GetPackagesDigest", sw.svc.Ctx, r1.RepositoryID).Return(map[string]string{
			pkg.BuildKey(p1v1): "",
		}, nil)
		p := source.ClonePackage(p1v1)
		p.Digest = hub.HasNotChanged
		sw.src.On("GetPackagesAvailable").Return(map[string]*hub.Package{
			pkg.BuildKey(p): p,
		}, nil)

		// Run test and check expectations
		err := New(sw.svc, r1, zerolog.Nop()).Run()
		assert.Nil(t, err)
		sw.assertExpectations(t)
	})

	t.Run("package available but not registered because it should be ignored", func(t *testing.T) {
		t.Parallel()

		// Setup services and expectations
		sw := newServicesWrapper()
		sw.rm.On("GetRemoteDigest", sw.svc.Ctx, r1).Return("", nil)
		sw.ec.On("Init", r1.RepositoryID)
		sw.rm.On("GetMetadata", r1, "").Return(&hub.RepositoryMetadata{
			Ignore: []*hub.RepositoryIgnoreEntry{
				{
					Name: p1v1.Name,
				},
			},
		}, nil)
		sw.rm.On("GetPackagesDigest", sw.svc.Ctx, r1.RepositoryID).Return(nil, nil)
		sw.src.On("GetPackagesAvailable").Return(map[string]*hub.Package{
			pkg.BuildKey(p1v1): p1v1,
		}, nil)

		// Run test and check expectations
		err := New(sw.svc, r1, zerolog.Nop()).Run()
		assert.Nil(t, err)
		sw.assertExpectations(t)
	})

	t.Run("package registered successfully", func(t *testing.T) {
		t.Parallel()

		// Setup services and expectations
		sw := newServicesWrapper()
		sw.rm.On("GetRemoteDigest", sw.svc.Ctx, r1).Return("", nil)
		sw.ec.On("Init", r1.RepositoryID)
		sw.rm.On("GetMetadata", r1, "").Return(nil, fmt.Errorf("error: %w", repo.ErrMetadataNotFound))
		sw.rm.On("GetPackagesDigest", sw.svc.Ctx, r1.RepositoryID).Return(nil, nil)
		p := source.ClonePackage(p1v1)
		sw.src.On("GetPackagesAvailable").Return(map[string]*hub.Package{
			pkg.BuildKey(p): p,
		}, nil)
		sw.pcc.On("Predict", p).Return(hub.UnknownCategory)
		sw.pm.On("Register", sw.svc.Ctx, p).Return(nil)

		// Run test and check expectations
		err := New(sw.svc, r1, zerolog.Nop()).Run()
		assert.Nil(t, err)
		sw.assertExpectations(t)
	})

	t.Run("package registered again because digest has changed", func(t *testing.T) {
		t.Parallel()

		// Setup services and expectations
		sw := newServicesWrapper()
		sw.rm.On("GetRemoteDigest", sw.svc.Ctx, r1).Return("", nil)
		sw.ec.On("Init", r1.RepositoryID)
		sw.rm.On("GetMetadata", r1, "").Return(nil, tests.ErrFake)
		expectedErr := "error getting repository metadata: fake error for tests"
		sw.ec.On("Append", r1.RepositoryID, expectedErr).Return()
		sw.rm.On("GetPackagesDigest", sw.svc.Ctx, r1.RepositoryID).Return(map[string]string{
			pkg.BuildKey(p1v1): "new digest",
		}, nil)
		p := source.ClonePackage(p1v1)
		sw.src.On("GetPackagesAvailable").Return(map[string]*hub.Package{
			pkg.BuildKey(p): p,
		}, nil)
		sw.pcc.On("Predict", p).Return(hub.UnknownCategory)
		sw.pm.On("Register", sw.svc.Ctx, p).Return(nil)

		// Run test and check expectations
		err := New(sw.svc, r1, zerolog.Nop()).Run()
		assert.Nil(t, err)
		sw.assertExpectations(t)
	})

	t.Run("two packages registered successfully", func(t *testing.T) {
		t.Parallel()

		// Setup services and expectations
		sw := newServicesWrapper()
		sw.rm.On("GetRemoteDigest", sw.svc.Ctx, r1).Return("", nil)
		sw.ec.On("Init", r1.RepositoryID)
		sw.rm.On("GetMetadata", r1, "").Return(nil, nil)
		sw.rm.On("GetPackagesDigest", sw.svc.Ctx, r1.RepositoryID).Return(nil, nil)
		p1 := source.ClonePackage(p1v1)
		p2 := source.ClonePackage(p2v1)
		sw.src.On("GetPackagesAvailable").Return(map[string]*hub.Package{
			pkg.BuildKey(p1): p1,
			pkg.BuildKey(p2): p2,
		}, nil)
		sw.pcc.On("Predict", p1).Return(hub.UnknownCategory)
		sw.pcc.On("Predict", p2).Return(hub.UnknownCategory)
		sw.pm.On("Register", sw.svc.Ctx, p1).Return(nil)
		sw.pm.On("Register", sw.svc.Ctx, p2).Return(nil)

		// Run test and check expectations
		err := New(sw.svc, r1, zerolog.Nop()).Run()
		assert.Nil(t, err)
		sw.assertExpectations(t)
	})

	t.Run("error unregistering package", func(t *testing.T) {
		t.Parallel()

		// Setup services and expectations
		sw := newServicesWrapper()
		sw.rm.On("GetRemoteDigest", sw.svc.Ctx, r1).Return("", nil)
		sw.ec.On("Init", r1.RepositoryID)
		sw.rm.On("GetMetadata", r1, "").Return(nil, nil)
		sw.rm.On("GetPackagesDigest", sw.svc.Ctx, r1.RepositoryID).Return(map[string]string{
			pkg.BuildKey(p1v1): "",
			pkg.BuildKey(p1v2): "",
		}, nil)
		sw.src.On("GetPackagesAvailable").Return(map[string]*hub.Package{
			pkg.BuildKey(p1v2): p1v2,
		}, nil)
		sw.pm.On("Unregister", sw.svc.Ctx, p1v1).Return(tests.ErrFake)
		expectedErr := "error unregistering package pkg1 version 1.0.0: fake error for tests"
		sw.ec.On("Append", r1.RepositoryID, expectedErr).Return()

		// Run test and check expectations
		err := New(sw.svc, r1, zerolog.Nop()).Run()
		assert.Nil(t, err)
		sw.assertExpectations(t)
	})

	t.Run("no packages unregistered because the are none available", func(t *testing.T) {
		t.Parallel()

		// Setup services and expectations
		sw := newServicesWrapper()
		sw.rm.On("GetRemoteDigest", sw.svc.Ctx, r1).Return("", nil)
		sw.ec.On("Init", r1.RepositoryID)
		sw.rm.On("GetMetadata", r1, "").Return(nil, nil)
		sw.rm.On("GetPackagesDigest", sw.svc.Ctx, r1.RepositoryID).Return(map[string]string{
			pkg.BuildKey(p1v1): "",
			pkg.BuildKey(p1v2): "",
		}, nil)
		sw.src.On("GetPackagesAvailable").Return(nil, nil)

		// Run test and check expectations
		err := New(sw.svc, r1, zerolog.Nop()).Run()
		assert.Nil(t, err)
		sw.assertExpectations(t)
	})

	t.Run("package unregistered successfully", func(t *testing.T) {
		t.Parallel()

		// Setup services and expectations
		sw := newServicesWrapper()
		sw.rm.On("GetRemoteDigest", sw.svc.Ctx, r1).Return("", nil)
		sw.ec.On("Init", r1.RepositoryID)
		sw.rm.On("GetMetadata", r1, "").Return(nil, nil)
		sw.rm.On("GetPackagesDigest", sw.svc.Ctx, r1.RepositoryID).Return(map[string]string{
			pkg.BuildKey(p1v1): "",
			pkg.BuildKey(p1v2): "",
		}, nil)
		sw.src.On("GetPackagesAvailable").Return(map[string]*hub.Package{
			pkg.BuildKey(p1v2): p1v2,
		}, nil)
		sw.pm.On("Unregister", sw.svc.Ctx, p1v1).Return(nil)

		// Run test and check expectations
		err := New(sw.svc, r1, zerolog.Nop()).Run()
		assert.Nil(t, err)
		sw.assertExpectations(t)
	})

	t.Run("ignored package unregistered successfully", func(t *testing.T) {
		t.Parallel()

		// Setup services and expectations
		sw := newServicesWrapper()
		sw.rm.On("GetRemoteDigest", sw.svc.Ctx, r1).Return("", nil)
		sw.ec.On("Init", r1.RepositoryID)
		sw.rm.On("GetMetadata", r1, "").Return(&hub.RepositoryMetadata{
			Ignore: []*hub.RepositoryIgnoreEntry{
				{
					Name:    p1v1.Name,
					Version: p1v1.Version,
				},
			},
		}, nil)
		sw.rm.On("GetPackagesDigest", sw.svc.Ctx, r1.RepositoryID).Return(map[string]string{
			pkg.BuildKey(p1v1): "",
			pkg.BuildKey(p1v2): "",
		}, nil)
		sw.src.On("GetPackagesAvailable").Return(map[string]*hub.Package{
			pkg.BuildKey(p1v1): p1v1,
			pkg.BuildKey(p1v2): p1v2,
		}, nil)
		sw.pm.On("Unregister", sw.svc.Ctx, p1v1).Return(nil)

		// Run test and check expectations
		err := New(sw.svc, r1, zerolog.Nop()).Run()
		assert.Nil(t, err)
		sw.assertExpectations(t)
	})

	t.Run("error setting verified publisher flag", func(t *testing.T) {
		t.Parallel()

		// Setup services and expectations
		sw := newServicesWrapper()
		sw.rm.On("GetRemoteDigest", sw.svc.Ctx, r1).Return("", nil)
		sw.ec.On("Init", r1.RepositoryID)
		sw.rm.On("GetMetadata", r1, "").Return(&hub.RepositoryMetadata{
			RepositoryID: r1.RepositoryID,
		}, nil)
		sw.rm.On("GetPackagesDigest", sw.svc.Ctx, r1.RepositoryID).Return(nil, nil)
		sw.src.On("GetPackagesAvailable").Return(map[string]*hub.Package{}, nil)
		sw.rm.On("SetVerifiedPublisher", sw.svc.Ctx, r1.RepositoryID, true).Return(tests.ErrFake)
		expectedErr := "error setting verified publisher flag: error setting verified publisher flag: fake error for tests"
		sw.ec.On("Append", r1.RepositoryID, expectedErr).Return()

		// Run test and check expectations
		err := New(sw.svc, r1, zerolog.Nop()).Run()
		assert.Nil(t, err)
		sw.assertExpectations(t)
	})

	t.Run("error updating repository digest", func(t *testing.T) {
		t.Parallel()

		// Setup services and expectations
		sw := newServicesWrapper()
		sw.rm.On("GetRemoteDigest", sw.svc.Ctx, r1).Return("digest", nil)
		sw.ec.On("Init", r1.RepositoryID)
		sw.rm.On("GetMetadata", r1, "").Return(nil, nil)
		sw.rm.On("GetPackagesDigest", sw.svc.Ctx, r1.RepositoryID).Return(nil, nil)
		sw.src.On("GetPackagesAvailable").Return(map[string]*hub.Package{}, nil)
		sw.rm.On("UpdateDigest", sw.svc.Ctx, r1.RepositoryID, "digest").Return(tests.ErrFake)

		// Run test and check expectations
		err := New(sw.svc, r1, zerolog.Nop()).Run()
		assert.Nil(t, err)
		sw.assertExpectations(t)
	})
}

type servicesWrapper struct {
	rm  *repo.ManagerMock
	pm  *pkg.ManagerMock
	rc  *repo.ClonerMock
	oe  *repo.OLMOCIExporterMock
	ec  *repo.ErrorsCollectorMock
	hc  *tests.HTTPClientMock
	is  *img.StoreMock
	pcc *PackageCategoryClassifierMock
	src *source.Mock
	svc *hub.TrackerServices
}

func newServicesWrapper() *servicesWrapper {
	// Setup mocks
	rm := &repo.ManagerMock{}
	pm := &pkg.ManagerMock{}
	rc := &repo.ClonerMock{}
	oe := &repo.OLMOCIExporterMock{}
	ec := &repo.ErrorsCollectorMock{}
	hc := &tests.HTTPClientMock{}
	is := &img.StoreMock{}
	pcc := &PackageCategoryClassifierMock{}
	src := &source.Mock{}

	// Setup tracker services using mocks
	svc := &hub.TrackerServices{
		Ctx: context.Background(),
		Cfg: viper.New(),
		Rm:  rm,
		Pm:  pm,
		Rc:  rc,
		Oe:  oe,
		Ec:  ec,
		Hc:  hc,
		Is:  is,
		Pcc: pcc,
		SetupTrackerSource: func(i *hub.TrackerSourceInput) hub.TrackerSource {
			return src
		},
	}

	// Setup services wrapper and return it
	return &servicesWrapper{
		rm:  rm,
		pm:  pm,
		rc:  rc,
		oe:  oe,
		ec:  ec,
		hc:  hc,
		is:  is,
		pcc: pcc,
		src: src,
		svc: svc,
	}
}

func (sw *servicesWrapper) assertExpectations(t *testing.T) {
	sw.rm.AssertExpectations(t)
	sw.pm.AssertExpectations(t)
	sw.rc.AssertExpectations(t)
	sw.oe.AssertExpectations(t)
	sw.ec.AssertExpectations(t)
	sw.hc.AssertExpectations(t)
	sw.is.AssertExpectations(t)
	sw.pcc.AssertExpectations(t)
	sw.src.AssertExpectations(t)
}
