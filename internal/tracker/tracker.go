package tracker

import (
	"context"
	"fmt"
	"net/http"
	"sync"

	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/img"
	"github.com/spf13/viper"
)

// HTTPClient defines the methods an HTTPClient implementation must provide.
type HTTPClient interface {
	Do(req *http.Request) (*http.Response, error)
}

// Tracker is the interface that wraps the Track method, used to ask a tracker
// to start running and processing packages in a given repository. A call to
// wg.Done() is expected once the tracker has completed.
type Tracker interface {
	Track(wg *sync.WaitGroup) error
}

// OCITagsGetter is the interface that wraps the Tags method, used to get all
// the tags available for a given repository in a OCI registry.
type OCITagsGetter interface {
	Tags(ctx context.Context, rURL string) ([]string, error)
}

// New represents a function that creates new repository trackers. Each tracker
// is in charge of processing a given repository, and based on the concurrency
// configured, the tracker cmd may run multiple Tracker instances concurrently.
type New func(svc *Services, r *hub.Repository, opts ...func(t Tracker)) Tracker

// Services represents a set of services that must be provided to a Tracker
// instance so that it can perform its tasks.
type Services struct {
	Ctx context.Context
	Cfg *viper.Viper
	Rc  hub.RepositoryCloner
	Rm  hub.RepositoryManager
	Pm  hub.PackageManager
	Il  hub.HelmIndexLoader
	Tg  OCITagsGetter
	Is  img.Store
	Ec  ErrorsCollector
	Hc  HTTPClient
}

// SetVerifiedPublisherFlag sets the repository verified publisher flag for the
// repository provided when needed.
func SetVerifiedPublisherFlag(svc *Services, r *hub.Repository, mdFile string) error {
	var verifiedPublisher bool
	md, err := svc.Rm.GetMetadata(mdFile)
	if err == nil {
		if r.RepositoryID == md.RepositoryID {
			verifiedPublisher = true
		}
	}
	if r.VerifiedPublisher != verifiedPublisher {
		err := svc.Rm.SetVerifiedPublisher(svc.Ctx, r.RepositoryID, verifiedPublisher)
		if err != nil {
			return fmt.Errorf("error setting verified publisher flag: %w", err)
		}
	}
	return nil
}
