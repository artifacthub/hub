package notification

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"sync"
	"text/template"
	"time"

	"github.com/artifacthub/hub/internal/email"
	"github.com/artifacthub/hub/internal/handlers/pkg"
	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/util"
	"github.com/jackc/pgx/v4"
	"github.com/patrickmn/go-cache"
	"github.com/rs/zerolog/log"
)

const (
	pauseOnEmptyQueue = 30 * time.Second
	pauseOnError      = 10 * time.Second

	// DefaultPayloadContentType represents the default content type used for
	// webhooks notifications.
	DefaultPayloadContentType = "application/cloudevents+json"
)

var (
	// ErrRetryable is meant to be used as a wrapper for other errors to
	// indicate the error is not final and the operation should be retried.
	ErrRetryable = errors.New("retryable error")
)

// Worker is in charge of delivering notifications to their intended recipients.
type Worker struct {
	svc   *Services
	cache *cache.Cache
	tmpl  map[templateID]*template.Template
}

// NewWorker creates a new Worker instance.
func NewWorker(
	svc *Services,
	c *cache.Cache,
	tmpl map[templateID]*template.Template,
) *Worker {
	return &Worker{
		svc:   svc,
		cache: c,
		tmpl:  tmpl,
	}
}

// Run is the main loop of the worker. It calls processNotification periodically
// until it's asked to stop via the context provided.
func (w *Worker) Run(ctx context.Context, wg *sync.WaitGroup) {
	defer wg.Done()

	for {
		err := w.processNotification(ctx)
		switch {
		case err == nil:
			select {
			case <-ctx.Done():
				return
			default:
			}
		case errors.Is(err, pgx.ErrNoRows):
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
				log.Error().Err(err).Msg("processNotification: error getting pending notification")
			}
			return err
		}

		// Process notification
		switch {
		case n.User != nil:
			if w.svc.ES != nil {
				err = w.deliverEmailNotification(ctx, n)
			} else {
				err = email.ErrSenderNotAvailable
			}
		case n.Webhook != nil:
			err = w.deliverWebhookNotification(ctx, n)
		}
		if errors.Is(err, ErrRetryable) {
			log.Error().Err(err).Msg("processNotification: error delivering notification")
			return err
		}

		// Update notification status
		err = w.svc.NotificationManager.UpdateStatus(ctx, tx, n.NotificationID, true, err)
		if err != nil {
			log.Error().Err(err).Msg("processNotification: error updating notification status")
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
			return fmt.Errorf("%w: error preparing email data: %w", ErrRetryable, err)
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
	tmplData, err := w.preparePkgNotificationTemplateData(ctx, n.Event)
	if err != nil {
		return fmt.Errorf("%w: %w", ErrRetryable, err)
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
	resp, err := w.svc.HTTPClient.Do(req)
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
		tmplData, err := w.preparePkgNotificationTemplateData(ctx, e)
		if err != nil {
			return email.Data{}, err
		}
		subject = fmt.Sprintf("%s version %s released", tmplData.Package["Name"], tmplData.Package["Version"])
		if err := w.tmpl[newReleaseEmail].Execute(&emailBody, tmplData); err != nil {
			return email.Data{}, err
		}
	case hub.SecurityAlert:
		tmplData, err := w.preparePkgNotificationTemplateData(ctx, e)
		if err != nil {
			return email.Data{}, err
		}
		subject = fmt.Sprintf("Security vulnerabilities found in %s version %s images",
			tmplData.Package["Name"], tmplData.Package["Version"])
		if err := w.tmpl[securityAlertEmail].Execute(&emailBody, tmplData); err != nil {
			return email.Data{}, err
		}
	case hub.RepositoryScanningErrors:
		tmplData, err := w.prepareRepoNotificationTemplateData(ctx, e)
		if err != nil {
			return email.Data{}, err
		}
		subject = fmt.Sprintf("Something went wrong scanning repository %s", tmplData.Repository["Name"])
		if err := w.tmpl[scanningErrorsEmail].Execute(&emailBody, tmplData); err != nil {
			return email.Data{}, err
		}
	case hub.RepositoryTrackingErrors:
		tmplData, err := w.prepareRepoNotificationTemplateData(ctx, e)
		if err != nil {
			return email.Data{}, err
		}
		subject = fmt.Sprintf("Something went wrong tracking repository %s", tmplData.Repository["Name"])
		if err := w.tmpl[trackingErrorsEmail].Execute(&emailBody, tmplData); err != nil {
			return email.Data{}, err
		}
	case hub.RepositoryOwnershipClaim:
		tmplData, err := w.prepareRepoNotificationTemplateData(ctx, e)
		if err != nil {
			return email.Data{}, err
		}
		subject = fmt.Sprintf("%s repository ownership has been claimed", tmplData.Repository["Name"])
		if err := w.tmpl[ownershipClaimEmail].Execute(&emailBody, tmplData); err != nil {
			return email.Data{}, err
		}
	}

	return email.Data{
		Subject: subject,
		Body:    emailBody.Bytes(),
	}, nil
}

// preparePkgNotificationTemplateData prepares the data available to packages
// notifications templates.
func (w *Worker) preparePkgNotificationTemplateData(
	ctx context.Context,
	e *hub.Event,
) (*hub.PackageNotificationTemplateData, error) {
	// Get notification package (try from cache first)
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
	case hub.SecurityAlert:
		eventKindStr = "package.security-alert"
	}
	publisher := p.Repository.OrganizationName
	if publisher == "" {
		publisher = p.Repository.UserAlias
	}

	baseURL := w.svc.Cfg.GetString("server.baseURL")
	return &hub.PackageNotificationTemplateData{
		BaseURL: baseURL,
		Event: map[string]interface{}{
			"ID":   e.EventID,
			"Kind": eventKindStr,
		},
		Package: map[string]interface{}{
			"Name":                    p.Name,
			"Version":                 p.Version,
			"LogoImageID":             p.LogoImageID,
			"URL":                     pkg.BuildURL(baseURL, p, e.PackageVersion),
			"Changes":                 p.Changes,
			"ContainsSecurityUpdates": p.ContainsSecurityUpdates,
			"Prerelease":              p.Prerelease,
			"Repository": map[string]interface{}{
				"Kind":      hub.GetKindName(p.Repository.Kind),
				"Name":      p.Repository.Name,
				"Publisher": publisher,
			},
		},
		Theme: map[string]string{
			"PrimaryColor":   w.svc.Cfg.GetString("theme.colors.primary"),
			"SecondaryColor": w.svc.Cfg.GetString("theme.colors.secondary"),
			"SiteName":       w.svc.Cfg.GetString("theme.siteName"),
		},
	}, nil
}

// prepareRepoNotificationTemplateData prepares the data available to
// repositories notifications templates.
func (w *Worker) prepareRepoNotificationTemplateData(
	ctx context.Context,
	e *hub.Event,
) (*hub.RepositoryNotificationTemplateData, error) {
	// Get notification repository (try from cache first)
	var r *hub.Repository
	cKey := "repository.%" + e.EventID
	cValue, ok := w.cache.Get(cKey)
	if ok {
		r = cValue.(*hub.Repository)
	} else {
		var err error
		r, err = w.svc.RepositoryManager.GetByID(ctx, e.RepositoryID, false)
		if err != nil {
			return nil, err
		}
		w.cache.SetDefault(cKey, r)
	}

	// Prepare template data
	var eventKindStr string
	switch e.EventKind {
	case hub.RepositoryScanningErrors:
		eventKindStr = "repository.scanning-errors"
	case hub.RepositoryTrackingErrors:
		eventKindStr = "repository.tracking-errors"
	case hub.RepositoryOwnershipClaim:
		eventKindStr = "repository.ownership-claim"
	}

	// Prepare last scanning and tracking errors
	var lastScanningErrors, lastTrackingErrors []string
	if v := strings.TrimSpace(r.LastScanningErrors); v != "" {
		lastScanningErrors = strings.Split(v, "\n")
	}
	if v := strings.TrimSpace(r.LastTrackingErrors); v != "" {
		lastTrackingErrors = strings.Split(v, "\n")
	}

	return &hub.RepositoryNotificationTemplateData{
		BaseURL: w.svc.Cfg.GetString("server.baseURL"),
		Event: map[string]interface{}{
			"ID":   e.EventID,
			"Kind": eventKindStr,
		},
		Repository: map[string]interface{}{
			"Kind":               hub.GetKindName(r.Kind),
			"Name":               r.Name,
			"UserAlias":          r.UserAlias,
			"OrganizationName":   r.OrganizationName,
			"LastScanningErrors": lastScanningErrors,
			"LastTrackingErrors": lastTrackingErrors,
		},
		Theme: map[string]string{
			"PrimaryColor":   w.svc.Cfg.GetString("theme.colors.primary"),
			"SecondaryColor": w.svc.Cfg.GetString("theme.colors.secondary"),
			"SiteName":       w.svc.Cfg.GetString("theme.siteName"),
		},
	}, nil
}

// DefaultWebhookPayloadTmpl is the template used for the webhook payload when
// the webhook uses the default template.
var DefaultWebhookPayloadTmpl = template.Must(template.New("").Parse(`
{
	"specversion" : "1.0",
	"id" : "{{ .Event.ID }}",
	"source" : "{{ .BaseURL }}",
	"type" : "io.artifacthub.{{ .Event.Kind }}",
	"datacontenttype" : "application/json",
	"data" : {
		"package": {
			"name": "{{ .Package.Name }}",
			"version": "{{ .Package.Version }}",
			"url": "{{ .Package.URL }}",
			"changes": [{{range $i, $e := .Package.Changes}}{{if $i}}, {{end}}"{{.Description}}"{{end}}],
			"containsSecurityUpdates": {{ .Package.ContainsSecurityUpdates }},
			"prerelease": {{ .Package.Prerelease }},
			"repository": {
				"kind": "{{ .Package.Repository.Kind }}",
				"name": "{{ .Package.Repository.Name }}",
				"publisher": "{{ .Package.Repository.Publisher }}"
			}
		}
	}
}
`))
