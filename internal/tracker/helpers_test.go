package tracker

import (
	"context"
	"errors"
	"fmt"
	"reflect"
	"testing"

	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/oci"
	"github.com/artifacthub/hub/internal/repo"
	"github.com/artifacthub/hub/internal/tests"
	"github.com/spf13/viper"
	"github.com/stretchr/testify/assert"
)

func TestGetRepositories(t *testing.T) {
	ctx := context.Background()
	repo1 := &hub.Repository{
		Name: "repo1",
		Kind: hub.Helm,
	}
	repo2 := &hub.Repository{
		Name: "repo2",
		Kind: hub.OLM,
	}
	repo3 := &hub.Repository{
		Name:     "repo3",
		Kind:     hub.OPA,
		Disabled: true,
	}

	t.Run("error getting repository by name", func(t *testing.T) {
		t.Parallel()

		// Setup expectations
		rm := &repo.ManagerMock{}
		rm.On("GetByName", ctx, "repo1", true).Return(nil, tests.ErrFake)

		// Run test and check expectations
		cfg := viper.New()
		cfg.Set("tracker.repositoriesNames", []string{"repo1"})
		repos, err := GetRepositories(ctx, cfg, rm)
		assert.True(t, errors.Is(err, tests.ErrFake))
		assert.Nil(t, repos)
		rm.AssertExpectations(t)
	})

	t.Run("get repositories by name", func(t *testing.T) {
		t.Parallel()

		// Setup expectations
		rm := &repo.ManagerMock{}
		rm.On("GetByName", ctx, "repo1", true).Return(repo1, nil)
		rm.On("GetByName", ctx, "repo2", true).Return(repo2, nil)

		// Run test and check expectations
		cfg := viper.New()
		cfg.Set("tracker.repositoriesNames", []string{"repo1", "repo2"})
		repos, err := GetRepositories(ctx, cfg, rm)
		assert.Nil(t, err)
		assert.ElementsMatch(t, []*hub.Repository{repo1, repo2}, repos)
		rm.AssertExpectations(t)
	})

	t.Run("error getting kind from name", func(t *testing.T) {
		t.Parallel()
		cfg := viper.New()
		cfg.Set("tracker.repositoriesKinds", []string{"invalid"})
		repos, err := GetRepositories(ctx, cfg, nil)
		assert.Error(t, err)
		assert.Nil(t, repos)
	})

	t.Run("error getting repository by kind", func(t *testing.T) {
		t.Parallel()

		// Setup expectations
		rm := &repo.ManagerMock{}
		rm.On("Search", ctx, &hub.SearchRepositoryInput{
			Kinds:              []hub.RepositoryKind{hub.Helm},
			IncludeCredentials: true,
		}).Return(nil, tests.ErrFake)

		// Run test and check expectations
		cfg := viper.New()
		cfg.Set("tracker.repositoriesKinds", []string{"helm"})
		repos, err := GetRepositories(ctx, cfg, rm)
		assert.True(t, errors.Is(err, tests.ErrFake))
		assert.Nil(t, repos)
		rm.AssertExpectations(t)
	})

	t.Run("get repositories by kind", func(t *testing.T) {
		t.Parallel()

		// Setup expectations
		rm := &repo.ManagerMock{}
		rm.On("Search", ctx, &hub.SearchRepositoryInput{
			Kinds:              []hub.RepositoryKind{hub.Helm, hub.OLM},
			IncludeCredentials: true,
		}).Return(&hub.SearchRepositoryResult{
			Repositories: []*hub.Repository{repo1, repo2},
		}, nil)

		// Run test and check expectations
		cfg := viper.New()
		cfg.Set("tracker.repositoriesKinds", []string{"helm", "olm"})
		repos, err := GetRepositories(ctx, cfg, rm)
		assert.Nil(t, err)
		assert.ElementsMatch(t, []*hub.Repository{repo1, repo2}, repos)
		rm.AssertExpectations(t)
	})

	t.Run("names have preference over kinds when both are provided", func(t *testing.T) {
		t.Parallel()

		// Setup expectations
		rm := &repo.ManagerMock{}
		rm.On("GetByName", ctx, "repo1", true).Return(repo1, nil)
		rm.On("GetByName", ctx, "repo2", true).Return(repo2, nil)

		// Run test and check expectations
		cfg := viper.New()
		cfg.Set("tracker.repositoriesNames", []string{"repo1", "repo2"})
		cfg.Set("tracker.repositoriesKinds", []string{"helm", "olm"})
		repos, err := GetRepositories(ctx, cfg, rm)
		assert.Nil(t, err)
		assert.ElementsMatch(t, []*hub.Repository{repo1, repo2}, repos)
		rm.AssertExpectations(t)
	})

	t.Run("error getting all repositories", func(t *testing.T) {
		t.Parallel()

		// Setup expectations
		rm := &repo.ManagerMock{}
		rm.On("Search", ctx, &hub.SearchRepositoryInput{
			IncludeCredentials: true,
		}).Return(nil, tests.ErrFake)

		// Run test and check expectations
		cfg := viper.New()
		repos, err := GetRepositories(ctx, cfg, rm)
		assert.True(t, errors.Is(err, tests.ErrFake))
		assert.Nil(t, repos)
		rm.AssertExpectations(t)
	})

	t.Run("get all repositories", func(t *testing.T) {
		t.Parallel()

		// Setup expectations
		rm := &repo.ManagerMock{}
		rm.On("Search", ctx, &hub.SearchRepositoryInput{
			IncludeCredentials: true,
		}).Return(&hub.SearchRepositoryResult{
			Repositories: []*hub.Repository{repo1, repo2, repo3},
		}, nil)

		// Run test and check expectations
		cfg := viper.New()
		repos, err := GetRepositories(ctx, cfg, rm)
		assert.Nil(t, err)
		assert.ElementsMatch(t, []*hub.Repository{repo1, repo2}, repos) // repo3 is disabled
		rm.AssertExpectations(t)
	})
}

func TestSetupSource(t *testing.T) {
	testCases := []struct {
		r            *hub.Repository
		expectedType string
	}{
		{
			&hub.Repository{
				Kind: hub.Falco,
				URL:  cloudNativeSecurityHub,
			},
			"*falco.TrackerSource",
		},
		{
			&hub.Repository{
				Kind: hub.Falco,
			},
			"*generic.TrackerSource",
		},
		{
			&hub.Repository{
				Kind: hub.Helm,
			},
			"*helm.TrackerSource",
		},
		{
			&hub.Repository{
				Kind: hub.HelmPlugin,
			},
			"*helmplugin.TrackerSource",
		},
		{
			&hub.Repository{
				Kind: hub.Krew,
			},
			"*krew.TrackerSource",
		},
		{
			&hub.Repository{
				Kind: hub.OLM,
			},
			"*olm.TrackerSource",
		},
		{
			&hub.Repository{
				Kind: hub.OPA,
			},
			"*generic.TrackerSource",
		},
		{
			&hub.Repository{
				Kind: hub.TBAction,
			},
			"*generic.TrackerSource",
		},
		{
			&hub.Repository{
				Kind: hub.TektonTask,
			},
			"*tekton.TrackerSource",
		},
	}
	for i, tc := range testCases {
		tc := tc
		t.Run(fmt.Sprintf("Test case %d", i), func(t *testing.T) {
			t.Parallel()

			i := &hub.TrackerSourceInput{
				Repository: tc.r,
				Svc: &hub.TrackerSourceServices{
					Op: &oci.PullerMock{},
				},
			}
			source := SetupSource(i)
			assert.Equal(t, tc.expectedType, reflect.TypeOf(source).String())
		})
	}
}

func TestSetVerifiedPublisherFlag(t *testing.T) {
	ctx := context.Background()

	// Setup some services required by tests
	repo1ID := "00000000-0000-0000-0000-000000000001"

	t.Run("verified publisher flag set to true successfully (remote url)", func(t *testing.T) {
		t.Parallel()

		// Setup expectations
		r := &hub.Repository{
			RepositoryID:      repo1ID,
			VerifiedPublisher: false,
		}
		md := &hub.RepositoryMetadata{
			RepositoryID: r.RepositoryID,
		}
		rm := &repo.ManagerMock{}
		rm.On("SetVerifiedPublisher", ctx, r.RepositoryID, true).Return(nil)

		// Run test and check expectations
		err := setVerifiedPublisherFlag(ctx, rm, r, md)
		assert.Nil(t, err)
		rm.AssertExpectations(t)
	})

	t.Run("verified publisher flag not set as it was already true", func(t *testing.T) {
		t.Parallel()

		// Setup expectations
		r := &hub.Repository{
			RepositoryID:      repo1ID,
			VerifiedPublisher: true,
		}
		md := &hub.RepositoryMetadata{
			RepositoryID: r.RepositoryID,
		}
		rm := &repo.ManagerMock{}

		// Run test and check expectations
		err := setVerifiedPublisherFlag(ctx, rm, r, md)
		assert.Nil(t, err)
		rm.AssertExpectations(t)
	})

	t.Run("verified publisher flag not set: it was false and md file did not exist", func(t *testing.T) {
		t.Parallel()

		// Setup expectations
		r := &hub.Repository{
			RepositoryID:      repo1ID,
			VerifiedPublisher: false,
		}
		rm := &repo.ManagerMock{}

		// Run test and check expectations
		err := setVerifiedPublisherFlag(ctx, rm, r, nil)
		assert.Nil(t, err)
		rm.AssertExpectations(t)
	})

	t.Run("verified publisher flag set to false: it was true and md file did not exist", func(t *testing.T) {
		t.Parallel()

		// Setup expectations
		r := &hub.Repository{
			RepositoryID:      repo1ID,
			VerifiedPublisher: true,
		}
		rm := &repo.ManagerMock{}
		rm.On("SetVerifiedPublisher", ctx, r.RepositoryID, false).Return(nil)

		// Run test and check expectations
		err := setVerifiedPublisherFlag(ctx, rm, r, nil)
		assert.Nil(t, err)
		rm.AssertExpectations(t)
	})

	t.Run("set verified publisher flag failed", func(t *testing.T) {
		t.Parallel()

		// Setup expectations
		r := &hub.Repository{
			RepositoryID:      repo1ID,
			VerifiedPublisher: false,
		}
		md := &hub.RepositoryMetadata{
			RepositoryID: r.RepositoryID,
		}
		rm := &repo.ManagerMock{}
		rm.On("SetVerifiedPublisher", ctx, r.RepositoryID, true).Return(tests.ErrFake)

		// Run test and check expectations
		err := setVerifiedPublisherFlag(ctx, rm, r, md)
		assert.True(t, errors.Is(err, tests.ErrFake))
		rm.AssertExpectations(t)
	})
}

func TestShouldIgnorePackage(t *testing.T) {
	testCases := []struct {
		md             *hub.RepositoryMetadata
		name           string
		version        string
		expectedResult bool
	}{
		{
			&hub.RepositoryMetadata{
				Ignore: []*hub.RepositoryIgnoreEntry{
					{
						Name: "pkg1",
					},
				},
			},
			"pkg1",
			"",
			true,
		},
		{
			&hub.RepositoryMetadata{
				Ignore: []*hub.RepositoryIgnoreEntry{
					{
						Name: "pkg1",
					},
				},
			},
			"pkg1",
			"1.0.0",
			true,
		},
		{
			&hub.RepositoryMetadata{
				Ignore: []*hub.RepositoryIgnoreEntry{
					{
						Name: "pkg2",
					},
				},
			},
			"pkg1",
			"1.0.0",
			false,
		},
		{
			&hub.RepositoryMetadata{
				Ignore: []*hub.RepositoryIgnoreEntry{},
			},
			"pkg1",
			"1.0.0",
			false,
		},
		{
			nil,
			"pkg1",
			"1.0.0",
			false,
		},
		{
			&hub.RepositoryMetadata{
				Ignore: []*hub.RepositoryIgnoreEntry{
					{
						Name:    "pkg1",
						Version: "beta",
					},
				},
			},
			"pkg1",
			"1.0.0-beta1",
			true,
		},
		{
			&hub.RepositoryMetadata{
				Ignore: []*hub.RepositoryIgnoreEntry{
					{
						Name:    "pkg1",
						Version: "1.0.0",
					},
				},
			},
			"pkg1",
			"1.0.0",
			true,
		},
		{
			&hub.RepositoryMetadata{
				Ignore: []*hub.RepositoryIgnoreEntry{
					{
						Name:    "pkg1",
						Version: "1.0.0",
					},
				},
			},
			"pkg1",
			"1.0.1",
			false,
		},
	}
	for i, tc := range testCases {
		tc := tc
		t.Run(fmt.Sprintf("Test case %d", i), func(t *testing.T) {
			t.Parallel()

			result := shouldIgnorePackage(tc.md, tc.name, tc.version)
			assert.Equal(t, tc.expectedResult, result)
		})
	}
}
