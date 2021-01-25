package repo

import (
	"context"
	"sort"
	"strings"

	"github.com/Masterminds/semver/v3"
	"github.com/artifacthub/hub/internal/hub"
	"github.com/google/go-containerregistry/pkg/authn"
	"github.com/google/go-containerregistry/pkg/name"
	"github.com/google/go-containerregistry/pkg/v1/remote"
)

// OCITagsGetter provides a mechanism to get all the version tags available for
// a given repository in a OCI registry. Tags that aren't valid semver versions
// will be filtered out.
type OCITagsGetter struct{}

// Tags returns a list with the tags available for the provided repository.
func (tg *OCITagsGetter) Tags(ctx context.Context, r *hub.Repository) ([]string, error) {
	u := strings.TrimPrefix(r.URL, hub.RepositoryOCIPrefix)
	ociRepo, err := name.NewRepository(u)
	if err != nil {
		return nil, err
	}
	var options []remote.Option
	if r.AuthUser != "" || r.AuthPass != "" {
		options = []remote.Option{
			remote.WithAuth(&authn.Basic{
				Username: r.AuthUser,
				Password: r.AuthPass,
			}),
		}
	}
	tags, err := remote.ListWithContext(ctx, ociRepo, options...)
	if err != nil {
		return nil, err
	}
	var tagsFiltered []string
	for _, tag := range tags {
		if _, err := semver.NewVersion(tag); err == nil {
			tagsFiltered = append(tagsFiltered, tag)
		}
	}
	sort.Slice(tagsFiltered, func(i, j int) bool {
		vi, _ := semver.NewVersion(tagsFiltered[i])
		vj, _ := semver.NewVersion(tagsFiltered[j])
		return vj.LessThan(vi)
	})
	return tagsFiltered, nil
}
