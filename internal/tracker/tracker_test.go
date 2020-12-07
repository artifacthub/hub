package tracker

import (
	"context"
	"errors"
	"testing"

	"github.com/artifacthub/hub/internal/hub"
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
		rm.On("GetByKind", ctx, hub.Helm, true).Return(nil, tests.ErrFake)

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
		rm.On("GetByKind", ctx, hub.Helm, true).Return([]*hub.Repository{repo1}, nil)
		rm.On("GetByKind", ctx, hub.OLM, true).Return([]*hub.Repository{repo2}, nil)

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
		rm.On("GetAll", ctx, true).Return(nil, tests.ErrFake)

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
		rm.On("GetAll", ctx, true).Return([]*hub.Repository{repo1, repo2, repo3}, nil)

		// Run test and check expectations
		cfg := viper.New()
		repos, err := GetRepositories(ctx, cfg, rm)
		assert.Nil(t, err)
		assert.ElementsMatch(t, []*hub.Repository{repo1, repo2}, repos)
		rm.AssertExpectations(t)
	})
}

func TestTrackRepository(t *testing.T) {
	ctx := context.Background()

	t.Run("error getting repository remote digest", func(t *testing.T) {
		t.Parallel()

		// Setup expectations
		r := &hub.Repository{}
		rm := &repo.ManagerMock{}
		tm := &Mock{}
		rm.On("GetRemoteDigest", ctx, r).Return("", tests.ErrFake)

		// Run test and check expectations
		err := TrackRepository(ctx, viper.New(), rm, tm, r)
		assert.True(t, errors.Is(err, tests.ErrFake))
		rm.AssertExpectations(t)
	})

	t.Run("repository has't been updated, same digest", func(t *testing.T) {
		t.Parallel()

		// Setup expectations
		r := &hub.Repository{
			Digest: "digest",
		}
		rm := &repo.ManagerMock{}
		tm := &Mock{}
		rm.On("GetRemoteDigest", ctx, r).Return("digest", nil)

		// Run test and check expectations
		err := TrackRepository(ctx, viper.New(), rm, tm, r)
		assert.Nil(t, err)
		rm.AssertExpectations(t)
	})

	t.Run("repository hasn't been updated, but bypassDigestCheck is enabled", func(t *testing.T) {
		t.Parallel()

		// Setup expectations
		r := &hub.Repository{
			Digest: "digest",
		}
		rm := &repo.ManagerMock{}
		tm := &Mock{}
		rm.On("GetRemoteDigest", ctx, r).Return("digest", nil)
		tm.On("Track").Return(nil)

		// Run test and check expectations
		cfg := viper.New()
		cfg.Set("tracker.bypassDigestCheck", true)
		err := TrackRepository(ctx, cfg, rm, tm, r)
		assert.Nil(t, err)
		rm.AssertExpectations(t)
	})

	t.Run("error tracking repository", func(t *testing.T) {
		t.Parallel()

		// Setup expectations
		r := &hub.Repository{}
		rm := &repo.ManagerMock{}
		tm := &Mock{}
		rm.On("GetRemoteDigest", ctx, r).Return("", nil)
		tm.On("Track").Return(tests.ErrFake)

		// Run test and check expectations
		err := TrackRepository(ctx, viper.New(), rm, tm, r)
		assert.True(t, errors.Is(err, tests.ErrFake))
		rm.AssertExpectations(t)
	})

	t.Run("repository tracked successfully, no need to update digest", func(t *testing.T) {
		t.Parallel()

		// Setup expectations
		r := &hub.Repository{}
		rm := &repo.ManagerMock{}
		tm := &Mock{}
		rm.On("GetRemoteDigest", ctx, r).Return("", nil)
		tm.On("Track").Return(nil)

		// Run test and check expectations
		err := TrackRepository(ctx, viper.New(), rm, tm, r)
		assert.Nil(t, err)
		rm.AssertExpectations(t)
	})

	t.Run("repository tracked successfully, digest updated", func(t *testing.T) {
		t.Parallel()

		// Setup expectations
		r := &hub.Repository{
			Digest: "digest1",
		}
		rm := &repo.ManagerMock{}
		tm := &Mock{}
		rm.On("GetRemoteDigest", ctx, r).Return("digest2", nil)
		tm.On("Track").Return(nil)
		rm.On("UpdateDigest", ctx, r.RepositoryID, "digest2").Return(nil)

		// Run test and check expectations
		err := TrackRepository(ctx, viper.New(), rm, tm, r)
		assert.Nil(t, err)
		rm.AssertExpectations(t)
	})

	t.Run("error updating repository digest", func(t *testing.T) {
		t.Parallel()

		// Setup expectations
		r := &hub.Repository{
			Digest: "digest1",
		}
		rm := &repo.ManagerMock{}
		tm := &Mock{}
		rm.On("GetRemoteDigest", ctx, r).Return("digest2", nil)
		tm.On("Track").Return(nil)
		rm.On("UpdateDigest", ctx, r.RepositoryID, "digest2").Return(tests.ErrFake)

		// Run test and check expectations
		err := TrackRepository(ctx, viper.New(), rm, tm, r)
		assert.True(t, errors.Is(err, tests.ErrFake))
		rm.AssertExpectations(t)
	})
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
		rm := &repo.ManagerMock{}
		rm.On("SetVerifiedPublisher", ctx, r.RepositoryID, true).Return(nil)
		rm.On("GetMetadata", "mdFile").Return(&hub.RepositoryMetadata{RepositoryID: repo1ID}, nil)

		// Run test and check expectations
		err := SetVerifiedPublisherFlag(ctx, rm, r, "mdFile")
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
		rm := &repo.ManagerMock{}
		rm.On("GetMetadata", "mdFile").Return(&hub.RepositoryMetadata{RepositoryID: repo1ID}, nil)

		// Run test and check expectations
		err := SetVerifiedPublisherFlag(ctx, rm, r, "mdFile")
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
		rm.On("GetMetadata", "mdFile").Return(nil, tests.ErrFake)

		// Run test and check expectations
		err := SetVerifiedPublisherFlag(ctx, rm, r, "mdFile")
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
		rm.On("GetMetadata", "mdFile").Return(nil, tests.ErrFake)
		rm.On("SetVerifiedPublisher", ctx, r.RepositoryID, false).Return(nil)

		// Run test and check expectations
		err := SetVerifiedPublisherFlag(ctx, rm, r, "mdFile")
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
		rm := &repo.ManagerMock{}
		rm.On("GetMetadata", "mdFile").Return(&hub.RepositoryMetadata{RepositoryID: repo1ID}, nil)
		rm.On("SetVerifiedPublisher", ctx, r.RepositoryID, true).Return(tests.ErrFake)

		// Run test and check expectations
		err := SetVerifiedPublisherFlag(ctx, rm, r, "mdFile")
		assert.True(t, errors.Is(err, tests.ErrFake))
		rm.AssertExpectations(t)
	})
}
