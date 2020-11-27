package event

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

// Worker is in charge of handling events that happen in the Hub.
type Worker struct {
	svc *Services
}

// NewWorker creates a new Worker instance.
func NewWorker(svc *Services) *Worker {
	return &Worker{
		svc: svc,
	}
}

// Run is the main loop of the worker. It calls processEvent periodically until
// it's asked to stop via the context provided.
func (w *Worker) Run(ctx context.Context, wg *sync.WaitGroup) {
	defer wg.Done()

	for {
		err := w.processEvent(ctx)
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

// processEvent gets a pending event from the database and processes it.
func (w *Worker) processEvent(ctx context.Context) error {
	return util.DBTransact(ctx, w.svc.DB, func(tx pgx.Tx) error {
		// Get pending event to process
		e, err := w.svc.EventManager.GetPending(ctx, tx)
		if err != nil {
			if !errors.Is(err, pgx.ErrNoRows) {
				log.Error().Err(err).Msg("error getting pending event")
			}
			return err
		}

		// Register event notifications
		// Email notifications
		users, err := w.svc.SubscriptionManager.GetSubscriptors(ctx, e)
		if err != nil {
			log.Error().Err(err).Msg("error getting subscriptors")
			return err
		}
		for _, u := range users {
			n := &hub.Notification{
				Event: e,
				User:  u,
			}
			if err := w.svc.NotificationManager.Add(ctx, tx, n); err != nil {
				log.Error().Err(err).Msg("error adding notification")
				return err
			}
		}
		// Webhook notifications
		webhooks, err := w.svc.WebhookManager.GetSubscribedTo(ctx, e)
		if err != nil {
			log.Error().Err(err).Msg("error getting webhooks")
			return err
		}
		for _, wh := range webhooks {
			n := &hub.Notification{
				Event:   e,
				Webhook: wh,
			}
			err := w.svc.NotificationManager.Add(ctx, tx, n)
			if err != nil {
				log.Error().Err(err).Msg("error adding notification")
				return err
			}
		}

		return nil
	})
}
