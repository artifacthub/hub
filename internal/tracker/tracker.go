package tracker

import (
	"context"
	"fmt"
	"net/http"
	"regexp"

	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/img"
	"github.com/spf13/viper"
	"golang.org/x/time/rate"
)

// HTTPClient defines the methods an HTTPClient implementation must provide.
type HTTPClient interface {
	Do(req *http.Request) (*http.Response, error)
}

// Tracker is the interface that wraps the Track method, used to ask a tracker
// to start running and processing packages in a given repository.
type Tracker interface {
	Track() error
}

// OCITagsGetter is the interface that wraps the Tags method, used to get all
// the tags available for a given repository in a OCI registry.
type OCITagsGetter interface {
	Tags(ctx context.Context, r *hub.Repository) ([]string, error)
}

// New represents a function that creates new repository trackers. Each tracker
// is in charge of processing a given repository, and based on the concurrency
// configured, the tracker cmd may run multiple Tracker instances concurrently.
type New func(svc *Services, r *hub.Repository, opts ...func(t Tracker)) Tracker

// Services represents a set of services that must be provided to a Tracker
// instance so that it can perform its tasks.
type Services struct {
	Ctx      context.Context
	Cfg      *viper.Viper
	Rc       hub.RepositoryCloner
	Rm       hub.RepositoryManager
	Pm       hub.PackageManager
	Il       hub.HelmIndexLoader
	Tg       OCITagsGetter
	Re       hub.OLMRepositoryExporter
	Is       img.Store
	Ec       ErrorsCollector
	Hc       HTTPClient
	GithubRL *rate.Limiter
}

// GetRepositories gets the repositories the tracker will process based on the
// configuration provided:
//
// - If a list of repositories names, those will be the repositories returned
//   provided they are found.
// - If a list of repositories kinds is provided, all repositories of those
//   kinds will be returned.
// - Otherwise, all the repositories will be returned.
//
// NOTE: disabled repositories will be filtered out.
func GetRepositories(
	ctx context.Context,
	cfg *viper.Viper,
	rm hub.RepositoryManager,
) ([]*hub.Repository, error) {
	reposNames := cfg.GetStringSlice("tracker.repositoriesNames")
	reposKinds := cfg.GetStringSlice("tracker.repositoriesKinds")

	var repos []*hub.Repository
	switch {
	case len(reposNames) > 0:
		for _, name := range reposNames {
			repo, err := rm.GetByName(ctx, name, true)
			if err != nil {
				return nil, fmt.Errorf("error getting repository %s: %w", name, err)
			}
			repos = append(repos, repo)
		}
	case len(reposKinds) > 0:
		for _, kindName := range reposKinds {
			kind, err := hub.GetKindFromName(kindName)
			if err != nil {
				return nil, fmt.Errorf("invalid repository kind found in config: %s", kindName)
			}
			kindRepos, err := rm.GetByKind(ctx, kind, true)
			if err != nil {
				return nil, fmt.Errorf("error getting repositories by kind (%s): %w", kindName, err)
			}
			repos = append(repos, kindRepos...)
		}
	default:
		var err error
		repos, err = rm.GetAll(ctx, true)
		if err != nil {
			return nil, fmt.Errorf("error getting all repositories: %w", err)
		}
	}

	// Filter out disabled repositories
	var reposFiltered []*hub.Repository
	for _, repo := range repos {
		if !repo.Disabled {
			reposFiltered = append(reposFiltered, repo)
		}
	}

	return reposFiltered, nil
}

// TrackRepository tracks the provided repository.
func TrackRepository(
	ctx context.Context,
	cfg *viper.Viper,
	rm hub.RepositoryManager,
	t Tracker,
	r *hub.Repository,
) error {
	// Check if repository has been updated
	remoteDigest, err := rm.GetRemoteDigest(ctx, r)
	if err != nil {
		return fmt.Errorf("error getting repository remote digest: %w", err)
	}
	bypassDigestCheck := cfg.GetBool("tracker.bypassDigestCheck")
	if remoteDigest != "" && r.Digest == remoteDigest && !bypassDigestCheck {
		return nil
	}

	// Track repository
	if err := t.Track(); err != nil {
		return fmt.Errorf("error tracking repository: %w", err)
	}

	// Update repository digest if needed
	if remoteDigest != "" && remoteDigest != r.Digest {
		if err := rm.UpdateDigest(ctx, r.RepositoryID, remoteDigest); err != nil {
			return fmt.Errorf("error updating repository digest: %w", err)
		}
	}

	return nil
}

// SetVerifiedPublisherFlag sets the repository verified publisher flag for the
// repository provided when needed.
func SetVerifiedPublisherFlag(
	ctx context.Context,
	rm hub.RepositoryManager,
	r *hub.Repository,
	md *hub.RepositoryMetadata,
) error {
	var verifiedPublisher bool
	if md != nil {
		if r.RepositoryID == md.RepositoryID {
			verifiedPublisher = true
		}
	}
	if r.VerifiedPublisher != verifiedPublisher {
		err := rm.SetVerifiedPublisher(ctx, r.RepositoryID, verifiedPublisher)
		if err != nil {
			return fmt.Errorf("error setting verified publisher flag: %w", err)
		}
	}
	return nil
}

// ShouldIgnorePackage checks if the package provided should be ignored.
func ShouldIgnorePackage(md *hub.RepositoryMetadata, name, version string) bool {
	if md == nil {
		return false
	}
	for _, ignoreEntry := range md.Ignore {
		if matchesEntry(ignoreEntry, name, version) {
			return true
		}
	}
	return false
}

// matchesEntry checks if the package name and version provide match a given
// ignore entry.
func matchesEntry(ignoreEntry *hub.RepositoryIgnoreEntry, name, version string) bool {
	if ignoreEntry.Name != name {
		return false
	}
	if version == "" {
		return true
	}
	versionMatch, err := regexp.Match(ignoreEntry.Version, []byte(version))
	if err != nil {
		return false
	}
	if versionMatch {
		return true
	}
	return false
}
