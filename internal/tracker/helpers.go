package tracker

import (
	"context"
	"fmt"
	"regexp"

	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/tracker/source/container"
	"github.com/artifacthub/hub/internal/tracker/source/falco"
	"github.com/artifacthub/hub/internal/tracker/source/generic"
	"github.com/artifacthub/hub/internal/tracker/source/helm"
	"github.com/artifacthub/hub/internal/tracker/source/helmplugin"
	"github.com/artifacthub/hub/internal/tracker/source/krew"
	"github.com/artifacthub/hub/internal/tracker/source/olm"
	"github.com/artifacthub/hub/internal/tracker/source/tekton"
	"github.com/spf13/viper"
)

const (
	cloudNativeSecurityHub = "https://github.com/falcosecurity/cloud-native-security-hub/resources/falco"
)

// GetRepositories gets the repositories the tracker will process based on the
// configuration provided:
//
//   - If a list of repositories names, those will be the repositories returned
//     provided they are found.
//   - If a list of repositories kinds is provided, all repositories of those
//     kinds will be returned.
//   - Otherwise, all the repositories will be returned.
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
		var kinds []hub.RepositoryKind
		for _, kindName := range reposKinds {
			kind, err := hub.GetKindFromName(kindName)
			if err != nil {
				return nil, fmt.Errorf("invalid repository kind found in config: %s", kindName)
			}
			kinds = append(kinds, kind)
		}
		result, err := rm.Search(ctx, &hub.SearchRepositoryInput{
			Kinds:              kinds,
			IncludeCredentials: true,
		})
		if err != nil {
			return nil, fmt.Errorf("error getting repositories for kinds (%#v): %w", kinds, err)
		}
		repos = result.Repositories
	default:
		result, err := rm.Search(ctx, &hub.SearchRepositoryInput{
			IncludeCredentials: true,
		})
		if err != nil {
			return nil, fmt.Errorf("error getting all repositories: %w", err)
		}
		repos = result.Repositories
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

// SetupSource returns the tracker source that should be used for the
// repository provided.
func SetupSource(i *hub.TrackerSourceInput) hub.TrackerSource {
	var source hub.TrackerSource
	switch i.Repository.Kind {
	case hub.Container:
		source = container.NewTrackerSource(i)
	case hub.Falco:
		// Temporary solution to maintain backwards compatibility with
		// the only Falco rules repository registered at the moment in
		// artifacthub.io using the structure and metadata format used
		// by the cloud native security hub.
		if i.Repository.URL == cloudNativeSecurityHub {
			source = falco.NewTrackerSource(i)
		} else {
			source = generic.NewTrackerSource(i)
		}
	case hub.Helm:
		source = helm.NewTrackerSource(i)
	case hub.HelmPlugin:
		source = helmplugin.NewTrackerSource(i)
	case hub.Krew:
		source = krew.NewTrackerSource(i)
	case hub.OLM:
		source = olm.NewTrackerSource(i)
	case
		hub.ArgoTemplate,
		hub.Backstage,
		hub.CoreDNS,
		hub.Gatekeeper,
		hub.Headlamp,
		hub.InspektorGadget,
		hub.KCL,
		hub.KedaScaler,
		hub.Keptn,
		hub.KnativeClientPlugin,
		hub.KubeArmor,
		hub.Kubewarden,
		hub.Kyverno,
		hub.Meshery,
		hub.OPA,
		hub.OpenCost,
		hub.Radius,
		hub.TBAction:
		source = generic.NewTrackerSource(i)
	case hub.TektonTask, hub.TektonPipeline, hub.TektonStepAction:
		source = tekton.NewTrackerSource(i)
	}
	return source
}

// setVerifiedPublisherFlag sets the repository verified publisher flag for the
// repository provided when needed.
func setVerifiedPublisherFlag(
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

// shouldIgnorePackage checks if the package provided should be ignored.
func shouldIgnorePackage(md *hub.RepositoryMetadata, name, version string) bool {
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
