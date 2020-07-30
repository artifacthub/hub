package tracker

import (
	"context"
	"sync"

	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/img"
	"github.com/spf13/viper"
)

// Tracker is the interface that wraps the Track method, used to ask a tracker
// to start running and processing packages in a given repository. A call to
// wg.Done() is expected once the tracker has completed.
type Tracker interface {
	Track(wg *sync.WaitGroup) error
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
	Is  img.Store
	Ec  ErrorsCollector
}
