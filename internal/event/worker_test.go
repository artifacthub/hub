package event

import (
	"context"
	"sync"
	"testing"
	"time"

	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/notification"
	"github.com/artifacthub/hub/internal/subscription"
	"github.com/artifacthub/hub/internal/tests"
	"github.com/artifacthub/hub/internal/webhook"
	"github.com/stretchr/testify/assert"
)

func TestWorker(t *testing.T) {
	e := &hub.Event{
		EventID:   "eventID",
		EventKind: hub.NewRelease,
		PackageID: "packageID",
	}
	u1 := &hub.User{
		UserID: "user1ID",
	}
	u2 := &hub.User{
		UserID: "user2ID",
	}
	wh1 := &hub.Webhook{
		WebhookID: "webhook1ID",
	}
	wh2 := &hub.Webhook{
		WebhookID: "webhook2ID",
	}

	t.Run("error getting pending event", func(t *testing.T) {
		t.Parallel()
		sw := newServicesWrapper()
		sw.db.On("Begin", sw.ctx).Return(sw.tx, nil)
		sw.em.On("GetPending", sw.ctx, sw.tx).Return(nil, tests.ErrFake)
		sw.tx.On("Rollback", sw.ctx).Return(nil)

		w := NewWorker(sw.svc)
		go w.Run(sw.ctx, sw.wg)
		sw.assertExpectations(t)
	})

	t.Run("error getting subscriptors", func(t *testing.T) {
		t.Parallel()
		sw := newServicesWrapper()
		sw.db.On("Begin", sw.ctx).Return(sw.tx, nil)
		sw.em.On("GetPending", sw.ctx, sw.tx).Return(e, nil)
		sw.sm.On("GetSubscriptors", sw.ctx, e).Return(nil, tests.ErrFake)
		sw.tx.On("Rollback", sw.ctx).Return(nil)

		w := NewWorker(sw.svc)
		go w.Run(sw.ctx, sw.wg)
		sw.assertExpectations(t)
	})

	t.Run("no subscriptors nor webhooks found", func(t *testing.T) {
		t.Parallel()
		sw := newServicesWrapper()
		sw.db.On("Begin", sw.ctx).Return(sw.tx, nil)
		sw.em.On("GetPending", sw.ctx, sw.tx).Return(e, nil)
		sw.sm.On("GetSubscriptors", sw.ctx, e).Return([]*hub.User{}, nil)
		sw.wm.On("GetSubscribedTo", sw.ctx, e).Return([]*hub.Webhook{}, nil)
		sw.tx.On("Commit", sw.ctx).Return(nil)

		w := NewWorker(sw.svc)
		go w.Run(sw.ctx, sw.wg)
		sw.assertExpectations(t)
	})

	t.Run("error adding email notification", func(t *testing.T) {
		t.Parallel()
		sw := newServicesWrapper()
		sw.db.On("Begin", sw.ctx).Return(sw.tx, nil)
		sw.em.On("GetPending", sw.ctx, sw.tx).Return(e, nil)
		sw.sm.On("GetSubscriptors", sw.ctx, e).Return([]*hub.User{u1}, nil)
		sw.nm.On("Add", sw.ctx, sw.tx, &hub.Notification{Event: e, User: u1}).Return(tests.ErrFake)
		sw.tx.On("Rollback", sw.ctx).Return(nil)

		w := NewWorker(sw.svc)
		go w.Run(sw.ctx, sw.wg)
		sw.assertExpectations(t)
	})

	t.Run("adding one email notification succeeded", func(t *testing.T) {
		t.Parallel()
		sw := newServicesWrapper()
		sw.db.On("Begin", sw.ctx).Return(sw.tx, nil)
		sw.em.On("GetPending", sw.ctx, sw.tx).Return(e, nil)
		sw.sm.On("GetSubscriptors", sw.ctx, e).Return([]*hub.User{u1}, nil)
		sw.nm.On("Add", sw.ctx, sw.tx, &hub.Notification{Event: e, User: u1}).Return(nil)
		sw.wm.On("GetSubscribedTo", sw.ctx, e).Return([]*hub.Webhook{}, nil)
		sw.tx.On("Commit", sw.ctx).Return(nil)

		w := NewWorker(sw.svc)
		go w.Run(sw.ctx, sw.wg)
		sw.assertExpectations(t)
	})

	t.Run("adding two email notifications succeeded", func(t *testing.T) {
		t.Parallel()
		sw := newServicesWrapper()
		sw.db.On("Begin", sw.ctx).Return(sw.tx, nil)
		sw.em.On("GetPending", sw.ctx, sw.tx).Return(e, nil)
		sw.sm.On("GetSubscriptors", sw.ctx, e).Return([]*hub.User{u1, u2}, nil)
		sw.nm.On("Add", sw.ctx, sw.tx, &hub.Notification{Event: e, User: u1}).Return(nil)
		sw.nm.On("Add", sw.ctx, sw.tx, &hub.Notification{Event: e, User: u2}).Return(nil)
		sw.wm.On("GetSubscribedTo", sw.ctx, e).Return([]*hub.Webhook{}, nil)
		sw.tx.On("Commit", sw.ctx).Return(nil)

		w := NewWorker(sw.svc)
		go w.Run(sw.ctx, sw.wg)
		sw.assertExpectations(t)
	})

	t.Run("error adding webhook notification", func(t *testing.T) {
		t.Parallel()
		sw := newServicesWrapper()
		sw.db.On("Begin", sw.ctx).Return(sw.tx, nil)
		sw.em.On("GetPending", sw.ctx, sw.tx).Return(e, nil)
		sw.sm.On("GetSubscriptors", sw.ctx, e).Return([]*hub.User{}, nil)
		sw.wm.On("GetSubscribedTo", sw.ctx, e).Return([]*hub.Webhook{wh1}, nil)
		sw.nm.On("Add", sw.ctx, sw.tx, &hub.Notification{Event: e, Webhook: wh1}).Return(tests.ErrFake)
		sw.tx.On("Rollback", sw.ctx).Return(nil)

		w := NewWorker(sw.svc)
		go w.Run(sw.ctx, sw.wg)
		sw.assertExpectations(t)
	})

	t.Run("adding one webhook notification succeeded", func(t *testing.T) {
		t.Parallel()
		sw := newServicesWrapper()
		sw.db.On("Begin", sw.ctx).Return(sw.tx, nil)
		sw.em.On("GetPending", sw.ctx, sw.tx).Return(e, nil)
		sw.sm.On("GetSubscriptors", sw.ctx, e).Return([]*hub.User{}, nil)
		sw.wm.On("GetSubscribedTo", sw.ctx, e).Return([]*hub.Webhook{wh1}, nil)
		sw.nm.On("Add", sw.ctx, sw.tx, &hub.Notification{Event: e, Webhook: wh1}).Return(nil)
		sw.tx.On("Commit", sw.ctx).Return(nil)

		w := NewWorker(sw.svc)
		go w.Run(sw.ctx, sw.wg)
		sw.assertExpectations(t)
	})

	t.Run("adding two webhook notifications succeeded", func(t *testing.T) {
		t.Parallel()
		sw := newServicesWrapper()
		sw.db.On("Begin", sw.ctx).Return(sw.tx, nil)
		sw.em.On("GetPending", sw.ctx, sw.tx).Return(e, nil)
		sw.sm.On("GetSubscriptors", sw.ctx, e).Return([]*hub.User{}, nil)
		sw.wm.On("GetSubscribedTo", sw.ctx, e).Return([]*hub.Webhook{wh1, wh2}, nil)
		sw.nm.On("Add", sw.ctx, sw.tx, &hub.Notification{Event: e, Webhook: wh1}).Return(nil)
		sw.nm.On("Add", sw.ctx, sw.tx, &hub.Notification{Event: e, Webhook: wh2}).Return(nil)
		sw.tx.On("Commit", sw.ctx).Return(nil)

		w := NewWorker(sw.svc)
		go w.Run(sw.ctx, sw.wg)
		sw.assertExpectations(t)
	})
}

type servicesWrapper struct {
	ctx        context.Context
	stopWorker context.CancelFunc
	wg         *sync.WaitGroup
	db         *tests.DBMock
	tx         *tests.TXMock
	em         *ManagerMock
	sm         *subscription.ManagerMock
	wm         *webhook.ManagerMock
	nm         *notification.ManagerMock
	svc        *Services
}

func newServicesWrapper() *servicesWrapper {
	// Context and wait group used for Worker.Run()
	ctx, stopWorker := context.WithCancel(context.Background())
	var wg sync.WaitGroup
	wg.Add(1)

	db := &tests.DBMock{}
	tx := &tests.TXMock{}
	em := &ManagerMock{}
	sm := &subscription.ManagerMock{}
	wm := &webhook.ManagerMock{}
	nm := &notification.ManagerMock{}

	return &servicesWrapper{
		ctx:        ctx,
		stopWorker: stopWorker,
		wg:         &wg,
		db:         db,
		tx:         tx,
		em:         em,
		sm:         sm,
		wm:         wm,
		nm:         nm,
		svc: &Services{
			DB:                  db,
			EventManager:        em,
			SubscriptionManager: sm,
			WebhookManager:      wm,
			NotificationManager: nm,
		},
	}
}

func (sw *servicesWrapper) assertExpectations(t *testing.T) {
	sw.stopWorker()
	assert.Eventually(t, func() bool {
		sw.wg.Wait()
		return true
	}, 2*time.Second, 100*time.Millisecond)

	sw.db.AssertExpectations(t)
	sw.tx.AssertExpectations(t)
	sw.em.AssertExpectations(t)
	sw.sm.AssertExpectations(t)
	sw.wm.AssertExpectations(t)
	sw.nm.AssertExpectations(t)
}
