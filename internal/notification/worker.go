package notification

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"sync"
	"time"

	"github.com/artifacthub/hub/internal/email"
	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/util"
	"github.com/jackc/pgx/v4"
	"github.com/rs/zerolog/log"
)

const (
	pauseOnEmptyQueue = 1 * time.Minute
	pauseOnError      = 1 * time.Second
)

// Worker is in charge of delivering pending notifications to their intended
// recipients.
type Worker struct {
	svc     *Services
	baseURL string
}

// NewWorker creates a new Worker instance.
func NewWorker(
	svc *Services,
	baseURL string,
) *Worker {
	return &Worker{
		svc:     svc,
		baseURL: baseURL,
	}
}

// Run is the main loop of the worker. It calls deliverNotification periodically
// until it's asked to stop via the context provided.
func (w *Worker) Run(ctx context.Context, wg *sync.WaitGroup) {
	defer wg.Done()

	for {
		err := w.deliverNotification(ctx)
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

// deliverNotification gets a pending notification from the database and
// delivers it.
func (w *Worker) deliverNotification(ctx context.Context) error {
	return util.DBTransact(ctx, w.svc.DB, func(tx pgx.Tx) error {
		n, err := w.svc.NotificationManager.GetPending(ctx, tx)
		if err != nil {
			if !errors.Is(err, pgx.ErrNoRows) {
				log.Error().Err(err).Msg("error getting pending notification")
			}
			return err
		}
		rcpts, err := w.svc.SubscriptionManager.GetSubscriptors(ctx, n.PackageID, n.NotificationKind)
		if err != nil {
			log.Error().Err(err).Msg("error getting notification subscriptors")
			return err
		}
		if len(rcpts) == 0 {
			return nil
		}
		emailData, err := w.prepareEmailData(ctx, n)
		if err != nil {
			log.Error().Err(err).Msg("error preparing email data")
			return err
		}
		for _, u := range rcpts {
			emailData.To = u.Email
			if err := w.svc.ES.SendEmail(emailData); err != nil {
				log.Error().
					Err(err).
					Str("notificationID", n.NotificationID).
					Str("email", u.Email).
					Msg("error sending notification email")
			}
		}
		return nil
	})
}

// prepareEmailData prepares the content of the notification email.
func (w *Worker) prepareEmailData(ctx context.Context, n *hub.Notification) (*email.Data, error) {
	var subject string
	var emailBody bytes.Buffer

	switch n.NotificationKind {
	case hub.NewRelease:
		p, err := w.svc.PackageManager.Get(ctx, &hub.GetPackageInput{PackageID: n.PackageID})
		if err != nil {
			return nil, err
		}
		subject = fmt.Sprintf("%s version %s released", p.Name, n.PackageVersion)
		publisher := p.OrganizationName
		if publisher == "" {
			publisher = p.UserAlias
		}
		if p.ChartRepository != nil {
			publisher += "/" + p.ChartRepository.Name
		}
		var packagePath string
		switch p.Kind {
		case hub.Chart:
			packagePath = fmt.Sprintf("/package/chart/%s/%s", p.ChartRepository.Name, p.NormalizedName)
		case hub.Falco:
			packagePath = fmt.Sprintf("/package/falco/%s", p.NormalizedName)
		case hub.OPA:
			packagePath = fmt.Sprintf("/package/opa/%s", p.NormalizedName)
		}
		data := map[string]interface{}{
			"publisher":   publisher,
			"kind":        p.Kind,
			"name":        p.Name,
			"version":     n.PackageVersion,
			"baseURL":     w.baseURL,
			"logoImageID": p.LogoImageID,
			"packagePath": packagePath,
		}
		if err := newReleaseEmailTmpl.Execute(&emailBody, data); err != nil {
			return nil, err
		}
	}

	return &email.Data{
		Subject: subject,
		Body:    emailBody.Bytes(),
	}, nil
}

// - Publisher (/ Chart repo)
