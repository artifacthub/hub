package tracker

import (
	"context"
	"fmt"

	"github.com/artifacthub/hub/internal/hub"
	"github.com/spf13/viper"
)

// GetRepositories gets the repositories a tracker will process. If a list of
// repositories names is found in the configuration provided, those will be the
// repositories returned provided they are found. If no repositories names are
// found in the configuration, all the repositories of the kind provided will
// be returned.
func GetRepositories(
	cfg *viper.Viper,
	rm hub.RepositoryManager,
	kind hub.RepositoryKind,
) ([]*hub.Repository, error) {
	reposNames := cfg.GetStringSlice("tracker.repositoriesNames")
	var repos []*hub.Repository
	if len(reposNames) > 0 {
		for _, name := range reposNames {
			repo, err := rm.GetByName(context.Background(), name)
			if err != nil {
				return nil, fmt.Errorf("error getting repository %s: %w", name, err)
			}
			repos = append(repos, repo)
		}
	} else {
		var err error
		repos, err = rm.GetByKind(context.Background(), kind)
		if err != nil {
			return nil, fmt.Errorf("error getting repositories by kind: %w", err)
		}
	}
	return repos, nil
}
