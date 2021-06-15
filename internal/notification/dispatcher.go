package notification

import (
	"context"
	"sync"
	"text/template"
	"time"

	_ "embed" // Used by templates

	"github.com/artifacthub/hub/internal/email"
	"github.com/artifacthub/hub/internal/hub"
	"github.com/patrickmn/go-cache"
	"github.com/spf13/viper"
)

const (
	defaultNumWorkers      = 2
	cacheDefaultExpiration = 5 * time.Minute
	cacheCleanupInterval   = 10 * time.Minute
)

type templateID int

const (
	newReleaseEmail templateID = iota
	ownershipClaimEmail
	scanningErrorsEmail
	securityAlertEmail
	trackingErrorsEmail
)

var (
	//go:embed template/new_release_email.tmpl
	newReleaseEmailTmpl string

	//go:embed template/ownership_claim_email.tmpl
	ownershipClaimEmailTmpl string

	//go:embed template/scanning_errors_email.tmpl
	scanningErrorsEmailTmpl string

	//go:embed template/security_alert_email.tmpl
	securityAlertEmailTmpl string

	//go:embed template/tracking_errors_email.tmpl
	trackingErrorsEmailTmpl string
)

// Services is a wrapper around several internal services used to handle
// notifications deliveries.
type Services struct {
	Cfg                 *viper.Viper
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
func NewDispatcher(svc *Services, opts ...func(d *Dispatcher)) *Dispatcher {
	// Setup dispatcher
	d := &Dispatcher{
		numWorkers: defaultNumWorkers,
	}
	for _, o := range opts {
		o(d)
	}

	// Setup templates
	tmpl := map[templateID]*template.Template{
		newReleaseEmail:     template.Must(template.New("").Parse(email.BaseTmpl + newReleaseEmailTmpl)),
		ownershipClaimEmail: template.Must(template.New("").Parse(email.BaseTmpl + ownershipClaimEmailTmpl)),
		scanningErrorsEmail: template.Must(template.New("").Parse(email.BaseTmpl + scanningErrorsEmailTmpl)),
		securityAlertEmail:  template.Must(template.New("").Parse(email.BaseTmpl + securityAlertEmailTmpl)),
		trackingErrorsEmail: template.Must(template.New("").Parse(email.BaseTmpl + trackingErrorsEmailTmpl)),
	}

	// Setup and launch workers
	c := cache.New(cacheDefaultExpiration, cacheCleanupInterval)
	d.workers = make([]*Worker, 0, d.numWorkers)
	for i := 0; i < d.numWorkers; i++ {
		d.workers = append(d.workers, NewWorker(svc, c, tmpl))
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
