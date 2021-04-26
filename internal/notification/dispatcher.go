package notification

import (
	"context"
	"sync"
	"time"

	"github.com/artifacthub/hub/internal/hub"
	"github.com/patrickmn/go-cache"
	"github.com/spf13/viper"
)

const (
	defaultNumWorkers      = 2
	cacheDefaultExpiration = 5 * time.Minute
	cacheCleanupInterval   = 10 * time.Minute
)

// Services is a wrapper around several internal services used to handle
// notifications deliveries.
type Services struct {
	DB                  hub.DB
	ES                  hub.EmailSender
	NotificationManager hub.NotificationManager
	SubscriptionManager hub.SubscriptionManager
	RepositoryManager   hub.RepositoryManager
	PackageManager      hub.PackageManager
	HTTPClient          hub.HTTPClient
}

// Dispatcher handles a group of workers in charge of delivering notifications.
type Dispatcher struct {
	numWorkers int
	workers    []*Worker
}

// NewDispatcher creates a new Dispatcher instance.
func NewDispatcher(cfg *viper.Viper, svc *Services, opts ...func(d *Dispatcher)) *Dispatcher {
	// Setup dispatcher
	d := &Dispatcher{
		numWorkers: defaultNumWorkers,
	}
	for _, o := range opts {
		o(d)
	}

	// Setup and launch workers
	c := cache.New(cacheDefaultExpiration, cacheCleanupInterval)
	baseURL := cfg.GetString("server.baseURL")
	d.workers = make([]*Worker, 0, d.numWorkers)
	for i := 0; i < d.numWorkers; i++ {
		d.workers = append(d.workers, NewWorker(svc, c, baseURL))
	}

	return d
}

// WithNumWorkers allows providing a specific number of workers for a
// Dispatcher instance.
func WithNumWorkers(n int) func(d *Dispatcher) {
	return func(d *Dispatcher) {
		d.numWorkers = n
	}
}

// Run starts the workers and lets them run until the dispatcher is asked to
// stop via the context provided.
func (d *Dispatcher) Run(ctx context.Context, wg *sync.WaitGroup) {
	defer wg.Done()

	// Start workers
	wwg := &sync.WaitGroup{}
	wctx, stopWorkers := context.WithCancel(context.Background())
	for _, w := range d.workers {
		wwg.Add(1)
		go w.Run(wctx, wwg)
	}

	// Stop workers when dispatcher is asked to stop
	<-ctx.Done()
	stopWorkers()
	wwg.Wait()
}
