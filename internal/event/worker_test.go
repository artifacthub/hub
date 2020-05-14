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
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

func TestWorker(t *testing.T) {
	t.Run("error getting pending event", func(t *testing.T) {
		sw := newServicesWrapper()
		sw.db.On("Begin", mock.Anything).Return(sw.tx, nil)
		sw.em.On("GetPending", mock.Anything, mock.Anything).Return(nil, errFake)
		sw.tx.On("Rollback", mock.Anything).Return(nil)

		w := NewWorker(sw.svc)
		go w.Run(sw.ctx, sw.wg)
		sw.assertExpectations(t)
	})

	t.Run("error getting subscriptors", func(t *testing.T) {
		sw := newServicesWrapper()
		sw.db.On("Begin", mock.Anything).Return(sw.tx, nil)
		sw.em.On("GetPending", mock.Anything, mock.Anything).Return(&hub.Event{
			EventKind: hub.NewRelease,
			PackageID: "packageID",
		}, nil)
		sw.sm.On("GetSubscriptors", mock.Anything, "packageID", hub.NewRelease).Return(nil, errFake)
		sw.tx.On("Rollback", mock.Anything).Return(nil)

		w := NewWorker(sw.svc)
		go w.Run(sw.ctx, sw.wg)
		sw.assertExpectations(t)
	})

	t.Run("no subscriptors found", func(t *testing.T) {
		sw := newServicesWrapper()
		sw.db.On("Begin", mock.Anything).Return(sw.tx, nil)
		sw.em.On("GetPending", mock.Anything, mock.Anything).Return(&hub.Event{
			EventKind: hub.NewRelease,
			PackageID: "packageID",
		}, nil)
		sw.sm.On("GetSubscriptors", mock.Anything, "packageID", hub.NewRelease).Return([]*hub.User{}, nil)
		sw.tx.On("Commit", mock.Anything).Return(nil)

		w := NewWorker(sw.svc)
		go w.Run(sw.ctx, sw.wg)
		sw.assertExpectations(t)
	})

	t.Run("error adding notification", func(t *testing.T) {
		sw := newServicesWrapper()
		sw.db.On("Begin", mock.Anything).Return(sw.tx, nil)
		sw.em.On("GetPending", mock.Anything, mock.Anything).Return(&hub.Event{
			EventID:   "eventID",
			EventKind: hub.NewRelease,
			PackageID: "packageID",
		}, nil)
		sw.sm.On("GetSubscriptors", mock.Anything, "packageID", hub.NewRelease).Return([]*hub.User{
			{UserID: "userID"},
		}, nil)
		sw.nm.On("Add", mock.Anything, mock.Anything, "eventID", "userID").Return(errFake)
		sw.tx.On("Rollback", mock.Anything).Return(nil)

		w := NewWorker(sw.svc)
		go w.Run(sw.ctx, sw.wg)
		sw.assertExpectations(t)
	})

	t.Run("adding one notification succeeded", func(t *testing.T) {
		sw := newServicesWrapper()
		sw.db.On("Begin", mock.Anything).Return(sw.tx, nil)
		sw.em.On("GetPending", mock.Anything, mock.Anything).Return(&hub.Event{
			EventID:   "eventID",
			EventKind: hub.NewRelease,
			PackageID: "packageID",
		}, nil)
		sw.sm.On("GetSubscriptors", mock.Anything, "packageID", hub.NewRelease).Return([]*hub.User{
			{UserID: "userID"},
		}, nil)
		sw.nm.On("Add", mock.Anything, mock.Anything, "eventID", "userID").Return(nil)
		sw.tx.On("Commit", mock.Anything).Return(nil)

		w := NewWorker(sw.svc)
		go w.Run(sw.ctx, sw.wg)
		sw.assertExpectations(t)
	})

	t.Run("adding two notifications succeeded", func(t *testing.T) {
		sw := newServicesWrapper()
		sw.db.On("Begin", mock.Anything).Return(sw.tx, nil)
		sw.em.On("GetPending", mock.Anything, mock.Anything).Return(&hub.Event{
			EventID:   "eventID",
			EventKind: hub.NewRelease,
			PackageID: "packageID",
		}, nil)
		sw.sm.On("GetSubscriptors", mock.Anything, "packageID", hub.NewRelease).Return([]*hub.User{
			{UserID: "user1ID"},
			{UserID: "user2ID"},
		}, nil)
		sw.nm.On("Add", mock.Anything, mock.Anything, "eventID", "user1ID").Return(nil)
		sw.nm.On("Add", mock.Anything, mock.Anything, "eventID", "user2ID").Return(nil)
		sw.tx.On("Commit", mock.Anything).Return(nil)

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
	nm := &notification.ManagerMock{}

	return &servicesWrapper{
		ctx:        ctx,
		stopWorker: stopWorker,
		wg:         &wg,
		db:         db,
		tx:         tx,
		em:         em,
		sm:         sm,
		nm:         nm,
		svc: &Services{
			DB:                  db,
			EventManager:        em,
			SubscriptionManager: sm,
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
	sw.nm.AssertExpectations(t)
}
