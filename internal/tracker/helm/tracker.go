package helm

import (
	"context"
	"fmt"
	"net/url"
	"path"
	"sort"
	"strings"
	"sync"

	"github.com/Masterminds/semver/v3"
	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/repo"
	"github.com/artifacthub/hub/internal/tracker"
	"github.com/google/go-containerregistry/pkg/authn"
	"github.com/google/go-containerregistry/pkg/name"
	"github.com/google/go-containerregistry/pkg/v1/remote"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
	"helm.sh/helm/v3/pkg/chart"
	helmrepo "helm.sh/helm/v3/pkg/repo"
)

const (
	// defaultNumWorkers is the number of workers used when none is provided.
	defaultNumWorkers = 10
)

// Tracker is in charge of tracking the packages available in a Helm repository,
// registering and unregistering them as needed.
type Tracker struct {
	svc        *tracker.Services
	r          *hub.Repository
	logger     zerolog.Logger
	queue      chan *Job
	numWorkers int
}

// NewTracker creates a new Tracker instance.
func NewTracker(
	svc *tracker.Services,
	r *hub.Repository,
	opts ...func(t tracker.Tracker),
) tracker.Tracker {
	t := &Tracker{
		svc:    svc,
		r:      r,
		logger: log.With().Str("repo", r.Name).Str("kind", hub.GetKindName(r.Kind)).Logger(),
		queue:  make(chan *Job),
	}
	for _, o := range opts {
		o(t)
	}
	if t.numWorkers == 0 {
		t.numWorkers = defaultNumWorkers
	}
	if t.svc.Il == nil {
		t.svc.Il = &repo.HelmIndexLoader{}
	}
	if t.svc.Tg == nil {
		t.svc.Tg = &OCITagsGetter{}
	}
	return t
}

// WithNumWorkers allows providing a specific number of workers for a Tracker
// instance.
func WithNumWorkers(n int) func(t tracker.Tracker) {
	return func(t tracker.Tracker) {
		t.(*Tracker).numWorkers = n
	}
}

// WithIndexLoader allows providing a specific Helm repository index loader for
// a Tracker instance.
func WithIndexLoader(il hub.HelmIndexLoader) func(t tracker.Tracker) {
	return func(t tracker.Tracker) {
		t.(*Tracker).svc.Il = il
	}
}

// WithOCITagsGetter allows providing a specific OCI tags getter for a Tracker
// instance.
func WithOCITagsGetter(tg tracker.OCITagsGetter) func(t tracker.Tracker) {
	return func(t tracker.Tracker) {
		t.(*Tracker).svc.Tg = tg
	}
}

// Track registers or unregisters the Helm packages available in the repository
// provided as needed. It is in charge of generating jobs to register or
// unregister Helm packages and dispatching them among the available workers.
func (t *Tracker) Track() error {
	// Launch workers
	var workersWg sync.WaitGroup
	defer workersWg.Wait()
	defer close(t.queue)
	for i := 0; i < t.numWorkers; i++ {
		w := NewWorker(t.svc, t.r)
		workersWg.Add(1)
		go w.Run(&workersWg, t.queue)
	}

	// Get repository metadata
	var rmd *hub.RepositoryMetadata
	u, _ := url.Parse(t.r.URL)
	if repo.SchemeIsHTTP(u) {
		u.Path = path.Join(u.Path, hub.RepositoryMetadataFile)
		rmd, _ = t.svc.Rm.GetMetadata(u.String())
	}

	// Load packages already registered from this repository
	packagesRegistered, err := t.svc.Rm.GetPackagesDigest(t.svc.Ctx, t.r.RepositoryID)
	if err != nil {
		return fmt.Errorf("error getting registered packages digest: %w", err)
	}

	// Generate jobs to register available packages when needed
	bypassDigestCheck := t.svc.Cfg.GetBool("tracker.bypassDigestCheck")
	packagesAvailable := make(map[string]struct{})
	charts, err := t.getCharts()
	if err != nil {
		return err
	}
	for _, chartVersions := range charts {
		for i, chartVersion := range chartVersions {
			// Return ASAP if context is cancelled
			select {
			case <-t.svc.Ctx.Done():
				return nil
			default:
			}

			// Check if the logo of this chart version should be stored. Only
			// the most recent version's logo is stored.
			var storeLogo bool
			if i == 0 {
				storeLogo = true
			}

			// Parse package version
			cvmd := chartVersion.Metadata
			sv, err := semver.NewVersion(cvmd.Version)
			if err != nil {
				t.warn(fmt.Errorf("invalid package %s version (%s): %w", cvmd.Name, cvmd.Version, err))
				continue
			}

			// Build package key and track its availability
			key := fmt.Sprintf("%s@%s", cvmd.Name, sv.String())
			packagesAvailable[key] = struct{}{}

			// Check if this package should be ignored
			if tracker.ShouldIgnorePackage(rmd, cvmd.Name, sv.String()) {
				continue
			}

			// Register package if it isn't already registered, if its digest
			// has changed or if the tracker is bypassing the digest check
			digest, ok := packagesRegistered[key]
			if !ok || chartVersion.Digest != digest || bypassDigestCheck {
				t.queue <- &Job{
					Kind:         Register,
					ChartVersion: chartVersion,
					StoreLogo:    storeLogo,
				}
			}
		}
	}

	// Generate jobs to unregister packages not available anymore or ignored
	if len(packagesAvailable) > 0 {
		for key := range packagesRegistered {
			// Return ASAP if context is cancelled
			select {
			case <-t.svc.Ctx.Done():
				return nil
			default:
			}

			// Extract package name and version from key
			p := strings.Split(key, "@")
			name := p[0]
			version := p[1]

			// Unregister pkg if it's not available anymore or if it's ignored
			_, ok := packagesAvailable[key]
			if !ok || tracker.ShouldIgnorePackage(rmd, name, version) {
				t.queue <- &Job{
					Kind: Unregister,
					ChartVersion: &helmrepo.ChartVersion{
						Metadata: &chart.Metadata{
							Name:    name,
							Version: version,
						},
					},
				}
			}
		}
	}

	// Set verified publisher flag
	if err := tracker.SetVerifiedPublisherFlag(t.svc.Ctx, t.svc.Rm, t.r, rmd); err != nil {
		t.warn(fmt.Errorf("error setting verified publisher flag: %w", err))
	}

	return nil
}

// getCharts returns the charts available in the repository.
func (t *Tracker) getCharts() (map[string][]*helmrepo.ChartVersion, error) {
	charts := make(map[string][]*helmrepo.ChartVersion)

	u, _ := url.Parse(t.r.URL)
	switch u.Scheme {
	case "http", "https":
		// Load repository index file
		t.logger.Debug().Msg("loading repository index file")
		indexFile, _, err := t.svc.Il.LoadIndex(t.r)
		if err != nil {
			return nil, fmt.Errorf("error loading repository index file: %w", err)
		}

		// Read available charts versions from index file
		for name, chartVersions := range indexFile.Entries {
			for _, chartVersion := range chartVersions {
				charts[name] = append(charts[name], chartVersion)
			}
		}
	case "oci":
		// Get package versions available in the repository
		versions, err := t.svc.Tg.Tags(t.svc.Ctx, t.r)
		if err != nil {
			return nil, fmt.Errorf("error getting package's available versions: %w", err)
		}

		// Prepare chart versions using the list of versions available
		name := path.Base(t.r.URL)
		for _, version := range versions {
			charts[name] = append(charts[name], &helmrepo.ChartVersion{
				Metadata: &chart.Metadata{
					Name:    name,
					Version: version,
				},
				URLs: []string{t.r.URL + ":" + version},
			})
		}
	default:
		return nil, repo.ErrSchemeNotSupported
	}

	return charts, nil
}

// warn is a helper that sends the error provided to the errors collector and
// logs it as a warning.
func (t *Tracker) warn(err error) {
	t.svc.Ec.Append(t.r.RepositoryID, err)
	t.logger.Warn().Err(err).Send()
}

// JobKind represents the kind of a job, which can be register or unregister.
type JobKind int

const (
	// Register represents a job to Register a Helm package version.
	Register JobKind = iota

	// Unregister represents a job to Unregister a Helm package version.
	Unregister
)

// Job represents a job for registering or unregistering a Helm package version
// available in the provided Helm repository. Jobs are created by the
// dispatcher and will eventually be handled by a worker.
type Job struct {
	Kind         JobKind
	ChartVersion *helmrepo.ChartVersion
	StoreLogo    bool
}

// OCITagsGetter provides a mechanism to get all the tags available for a given
// repository in a OCI registry.
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
	sort.Slice(tags, func(i, j int) bool {
		vi, _ := semver.NewVersion(tags[i])
		vj, _ := semver.NewVersion(tags[j])
		return vj.LessThan(vi)
	})
	return tags, nil
}
