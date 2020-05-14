package notification

import (
	"context"
	"errors"
	"sync"
	"time"

	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/util"
	"github.com/jackc/pgx/v4"
	"github.com/rs/zerolog/log"
)

const (
	pauseOnEmptyQueue = 30 * time.Second
	pauseOnError      = 10 * time.Second
)

// Worker is in charge of delivering notifications to their intended recipients.
type Worker struct {
	svc            *Services
	emailDataCache hub.NotificationEmailDataCache
}

// NewWorker creates a new Worker instance.
func NewWorker(
	svc *Services,
	emailDataCache hub.NotificationEmailDataCache,
) *Worker {
	return &Worker{
		svc:            svc,
		emailDataCache: emailDataCache,
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
		emailData, err := w.emailDataCache.Get(ctx, n.Event)
		if err != nil {
			log.Error().Err(err).Msg("error getting email data")
			return err
		}
		emailData.To = n.User.Email
		processedErr := w.svc.ES.SendEmail(&emailData)

		// Update notification status
		err = w.svc.NotificationManager.UpdateStatus(ctx, tx, n.NotificationID, true, processedErr)
		if err != nil {
			log.Error().Err(err).Msg("error updating notification status")
		}
		return nil
	})
}
