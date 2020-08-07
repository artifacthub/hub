package helm

import (
	"fmt"
	"strings"
	"sync"

	"github.com/Masterminds/semver/v3"
	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/repo"
	"github.com/artifacthub/hub/internal/tracker"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
	"helm.sh/helm/v3/pkg/chart"
	helmrepo "helm.sh/helm/v3/pkg/repo"
)

// defaultNumWorkers is the number of workers used when none is provided.
const defaultNumWorkers = 25

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

// Track registers or unregisters the Helm packages available in the repository
// provided as needed. It is in charge of generating jobs to register or
// unregister Helm packages and dispatching them among the available workers.
func (t *Tracker) Track(wg *sync.WaitGroup) error {
	defer wg.Done()

	// Launch workers
	var workersWg sync.WaitGroup
	defer workersWg.Wait()
	defer close(t.queue)
	for i := 0; i < t.numWorkers; i++ {
		w := NewWorker(t.svc, t.r)
		workersWg.Add(1)
		go w.Run(&workersWg, t.queue)
	}

	// Load repository index file
	t.logger.Debug().Msg("loading repository index file")
	indexFile, err := t.svc.Il.LoadIndex(t.r)
	if err != nil {
		return fmt.Errorf("error loading repository index file: %w", err)
	}

	// Load packages already registered from this repository
	packagesRegistered, err := t.svc.Rm.GetPackagesDigest(t.svc.Ctx, t.r.RepositoryID)
	if err != nil {
		return fmt.Errorf("error getting registered packages digest: %w", err)
	}

	// Generate jobs to register available packages when needed
	bypassDigestCheck := t.svc.Cfg.GetBool("tracker.bypassDigestCheck")
	packagesAvailable := make(map[string]struct{})
	for _, charts := range indexFile.Entries {
		for i, chartVersion := range charts {
			md := chartVersion.Metadata
			select {
			case <-t.svc.Ctx.Done():
				return nil
			default:
			}
			var storeLogo bool
			if i == 0 {
				storeLogo = true
			}
			sv, err := semver.NewVersion(md.Version)
			if err != nil {
				t.warn(fmt.Errorf("invalid package %s version (%s): %w", md.Name, md.Version, err))
				continue
			}
			key := fmt.Sprintf("%s@%s", md.Name, sv.String())
			packagesAvailable[key] = struct{}{}
			if bypassDigestCheck || chartVersion.Digest != packagesRegistered[key] {
				t.queue <- &Job{
					Kind:         Register,
					ChartVersion: chartVersion,
					StoreLogo:    storeLogo,
				}
			}
		}
	}

	// Generate jobs to unregister packages not available anymore
	for key := range packagesRegistered {
		select {
		case <-t.svc.Ctx.Done():
			return nil
		default:
		}
		if _, ok := packagesAvailable[key]; !ok {
			p := strings.Split(key, "@")
			name := p[0]
			version := p[1]
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

	return nil
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
