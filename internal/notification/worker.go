package notification

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"net/http"
	"sync"
	"text/template"
	"time"

	"github.com/artifacthub/hub/internal/email"
	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/util"
	"github.com/jackc/pgx/v4"
	"github.com/patrickmn/go-cache"
	"github.com/rs/zerolog/log"
)

const (
	pauseOnEmptyQueue         = 30 * time.Second
	pauseOnError              = 10 * time.Second
	DefaultPayloadContentType = "application/cloudevents+json"
)

var (
	// ErrRetryable is meant to be used as a wrapper for other errors to
	// indicate the error is not final and the operation should be retried.
	ErrRetryable = errors.New("retryable error")
)

// HTTPClient defines the methods an HTTPClient implementation must provide.
type HTTPClient interface {
	Do(req *http.Request) (*http.Response, error)
}

// Worker is in charge of delivering notifications to their intended recipients.
type Worker struct {
	svc        *Services
	cache      *cache.Cache
	baseURL    string
	httpClient HTTPClient
}

// NewWorker creates a new Worker instance.
func NewWorker(
	svc *Services,
	c *cache.Cache,
	baseURL string,
	httpClient HTTPClient,
) *Worker {
	return &Worker{
		svc:        svc,
		cache:      c,
		baseURL:    baseURL,
		httpClient: httpClient,
	}
}

// Run is the main loop of the worker. It calls processNotification periodically
// until it's asked to stop via the context provided.
func (w *Worker) Run(ctx context.Context, wg *sync.WaitGroup) {
	defer wg.Done()

	for {
		err := w.processNotification(ctx)
		switch err {
		case nil:
			select {
			case <-ctx.Done():
				return
			default:
			}
		case pgx.ErrNoRows:
			select {
			case <-time.After(pauseOnEmptyQueue):
			case <-ctx.Done():
				return
			}
		default:
			select {
			case <-time.After(pauseOnError):
			case <-ctx.Done():
				return
			}
		}
	}
}

// processNotification gets a pending notification from the database and
// delivers it.
func (w *Worker) processNotification(ctx context.Context) error {
	return util.DBTransact(ctx, w.svc.DB, func(tx pgx.Tx) error {
		// Get pending notification to process
		n, err := w.svc.NotificationManager.GetPending(ctx, tx)
		if err != nil {
			if !errors.Is(err, pgx.ErrNoRows) {
				log.Error().Err(err).Msg("error getting pending notification")
			}
			return err
		}

		// Process notification
		switch {
		case n.User != nil:
			err = w.deliverEmailNotification(ctx, n)
		case n.Webhook != nil:
			err = w.deliverWebhookNotification(ctx, n)
		}
		if errors.Is(err, ErrRetryable) {
			log.Error().Err(err).Msg("error delivering notification")
			return err
		}

		// Update notification status
		err = w.svc.NotificationManager.UpdateStatus(ctx, tx, n.NotificationID, true, err)
		if err != nil {
			log.Error().Err(err).Msg("error updating notification status")
		}
		return nil
	})
}

// deliverEmailNotification delivers the provided notification via email.
func (w *Worker) deliverEmailNotification(ctx context.Context, n *hub.Notification) error {
	// Prepare email data
	var emailData email.Data
	cKey := "emailData.%" + n.Event.EventID
	cValue, ok := w.cache.Get(cKey)
	if ok {
		emailData = cValue.(email.Data)
	} else {
		var err error
		emailData, err = w.prepareEmailData(ctx, n.Event)
		if err != nil {
			log.Error().Err(err).Msg("deliverEmailNotification: error preparing email data")
			return fmt.Errorf("%w: %v", ErrRetryable, err)
		}
		w.cache.SetDefault(cKey, emailData)
	}
	emailData.To = n.User.Email

	// Send email
	return w.svc.ES.SendEmail(&emailData)
}

// deliverWebhookNotification delivers the provided notification via webhook.
func (w *Worker) deliverWebhookNotification(ctx context.Context, n *hub.Notification) error {
	// Get template data
	tmplData, err := w.prepareTemplateData(ctx, n.Event)
	if err != nil {
		log.Error().Err(err).Msg("error preparing template data")
		return fmt.Errorf("%w: %v", ErrRetryable, err)
	}

	// Prepare payload
	var tmpl *template.Template
	if n.Webhook.Template != "" {
		var err error
		tmpl, err = template.New("").Parse(n.Webhook.Template)
		if err != nil {
			return err
		}
	} else {
		tmpl = DefaultWebhookPayloadTmpl
	}
	var payload bytes.Buffer
	if err := tmpl.Execute(&payload, tmplData); err != nil {
		return err
	}
	contentType := n.Webhook.ContentType
	if contentType == "" {
		contentType = DefaultPayloadContentType
	}

	// Call webhook endpoint
	req, _ := http.NewRequest("POST", n.Webhook.URL, &payload)
	req.Header.Set("Content-Type", contentType)
	req.Header.Set("X-ArtifactHub-Secret", n.Webhook.Secret)
	resp, err := w.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 400 {
		return fmt.Errorf("unexpected status code: %d", resp.StatusCode)
	}
	return nil
}

// prepareEmailData prepares the email data corresponding to the event provided.
func (w *Worker) prepareEmailData(ctx context.Context, e *hub.Event) (email.Data, error) {
	var subject string
	var emailBody bytes.Buffer

	switch e.EventKind {
	case hub.NewRelease:
		tmplData, err := w.prepareTemplateData(ctx, e)
		if err != nil {
			log.Error().Err(err).Msg("error prepating template data")
			return email.Data{}, fmt.Errorf("%w: %v", ErrRetryable, err)
		}
		subject = fmt.Sprintf("%s version %s released", tmplData.Package["name"], tmplData.Package["version"])
		if err := newReleaseEmailTmpl.Execute(&emailBody, tmplData); err != nil {
			return email.Data{}, err
		}
	}

	return email.Data{
		Subject: subject,
		Body:    emailBody.Bytes(),
	}, nil
}

// prepareTemplateData prepares the data available to notifications templates.
func (w *Worker) prepareTemplateData(ctx context.Context, e *hub.Event) (*hub.NotificationTemplateData, error) {
	// Get notification package
	var p *hub.Package
	cKey := "package.%" + e.EventID
	cValue, ok := w.cache.Get(cKey)
	if ok {
		p = cValue.(*hub.Package)
	} else {
		var err error
		p, err = w.svc.PackageManager.Get(ctx, &hub.GetPackageInput{
			PackageID: e.PackageID,
			Version:   e.PackageVersion,
		})
		if err != nil {
			return nil, err
		}
		w.cache.SetDefault(cKey, p)
	}

	// Prepare template data
	var eventKindStr string
	switch e.EventKind {
	case hub.NewRelease:
		eventKindStr = "package.new-release"
	}
	publisher := p.OrganizationName
	if publisher == "" {
		publisher = p.UserAlias
	}
	if p.ChartRepository != nil {
		publisher += "/" + p.ChartRepository.Name
	}
	var packageKindStr, packagePath string
	switch p.Kind {
	case hub.Chart:
		packageKindStr = "helm-chart"
		packagePath = fmt.Sprintf("/packages/chart/%s/%s/%s",
			p.ChartRepository.Name,
			p.NormalizedName,
			e.PackageVersion,
		)
	case hub.Falco:
		packageKindStr = "falco-rules"
		packagePath = fmt.Sprintf("/packages/falco/%s/%s", p.NormalizedName, e.PackageVersion)
	case hub.OPA:
		packageKindStr = "opa-policies"
		packagePath = fmt.Sprintf("/packages/opa/%s/%s", p.NormalizedName, e.PackageVersion)
	}

	return &hub.NotificationTemplateData{
		BaseURL: w.baseURL,
		Event: map[string]interface{}{
			"id":   e.EventID,
			"kind": eventKindStr,
		},
		Package: map[string]interface{}{
			"kind":        packageKindStr,
			"name":        p.Name,
			"version":     p.Version,
			"logoImageID": p.LogoImageID,
			"publisher":   publisher,
			"url":         w.baseURL + packagePath,
		},
	}, nil
}

// DefaultWebhookPayloadTmpl is the template used for the webhook payload when
// the webhook uses the default template.
var DefaultWebhookPayloadTmpl = template.Must(template.New("").Parse(`
{
	"specversion" : "1.0",
	"id" : "{{ .Event.id }}",
	"source" : "https://artifacthub.io/cloudevents",
	"type" : "io.artifacthub.{{ .Event.kind }}",
	"datacontenttype" : "application/json",
	"data" : {
		"package": {
			"kind": "{{ .Package.kind }}",
			"name": "{{ .Package.name }}",
			"version": "{{ .Package.version }}",
			"publisher": "{{ .Package.publisher }}",
			"url": "{{ .Package.url }}"
		}
	}
}
`))
