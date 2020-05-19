package event

import (
	"context"
	"sync"

	"github.com/artifacthub/hub/internal/hub"
)

const (
	defaultNumWorkers = 2
)

// Services is a wrapper around several internal services used to handle
// events processing.
type Services struct {
	DB                  hub.DB
	EventManager        hub.EventManager
	SubscriptionManager hub.SubscriptionManager
	WebhookManager      hub.WebhookManager
	NotificationManager hub.NotificationManager
}

// Dispatcher handles a group of workers in charge of processing events that
// happen in the Hub.
type Dispatcher struct {
	numWorkers int
	workers    []*Worker
}

// NewDispatcher creates a new Dispatcher instance.
func NewDispatcher(svc *Services, opts ...func(d *Dispatcher)) *Dispatcher {
	d := &Dispatcher{
		numWorkers: defaultNumWorkers,
	}
	for _, o := range opts {
		o(d)
	}
	d.workers = make([]*Worker, 0, d.numWorkers)
	for i := 0; i < d.numWorkers; i++ {
		d.workers = append(d.workers, NewWorker(svc))
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
