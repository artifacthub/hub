package notification

import (
	"context"
	"sync"
	"testing"
	"time"

	"github.com/artifacthub/hub/internal/email"
	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/pkg"
	"github.com/artifacthub/hub/internal/subscription"
	"github.com/artifacthub/hub/internal/tests"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

func TestWorker(t *testing.T) {
	t.Run("error getting pending notification", func(t *testing.T) {
		sw := newServicesWrapper()
		sw.db.On("Begin", mock.Anything).Return(sw.tx, nil)
		sw.nm.On("GetPending", mock.Anything, mock.Anything).Return(nil, errFake)
		sw.tx.On("Rollback", mock.Anything).Return(nil)

		w := NewWorker(sw.svc, sw.cm)
		go w.Run(sw.ctx, sw.wg)
		sw.assertExpectations(t)
	})

	t.Run("error getting email data", func(t *testing.T) {
		sw := newServicesWrapper()
		sw.db.On("Begin", mock.Anything).Return(sw.tx, nil)
		sw.nm.On("GetPending", mock.Anything, mock.Anything).Return(&hub.Notification{
			Event: &hub.Event{
				EventKind: hub.NewRelease,
				PackageID: "packageID",
			},
		}, nil)
		sw.cm.On("Get", mock.Anything, mock.Anything).Return(nil, errFake)
		sw.tx.On("Rollback", mock.Anything).Return(nil)

		w := NewWorker(sw.svc, sw.cm)
		go w.Run(sw.ctx, sw.wg)
		sw.assertExpectations(t)
	})

	t.Run("error sending email", func(t *testing.T) {
		sw := newServicesWrapper()
		sw.db.On("Begin", mock.Anything).Return(sw.tx, nil)
		sw.nm.On("GetPending", mock.Anything, mock.Anything).Return(&hub.Notification{
			NotificationID: "notificationID",
			Event: &hub.Event{
				EventKind: hub.NewRelease,
				PackageID: "packageID",
			},
			User: &hub.User{
				Email: "user1@email.com",
			},
		}, nil)
		sw.cm.On("Get", mock.Anything, mock.Anything).Return(&email.Data{}, nil)
		sw.es.On("SendEmail", mock.Anything).Return(errFake)
		sw.nm.On("UpdateStatus", mock.Anything, mock.Anything, "notificationID", true, errFake).Return(nil)
		sw.tx.On("Commit", mock.Anything).Return(nil)

		w := NewWorker(sw.svc, sw.cm)
		go w.Run(sw.ctx, sw.wg)
		sw.assertExpectations(t)
	})

	t.Run("notification delivered successfully", func(t *testing.T) {
		sw := newServicesWrapper()
		sw.db.On("Begin", mock.Anything).Return(sw.tx, nil)
		sw.nm.On("GetPending", mock.Anything, mock.Anything).Return(&hub.Notification{
			NotificationID: "notificationID",
			Event: &hub.Event{
				EventKind: hub.NewRelease,
				PackageID: "packageID",
			},
			User: &hub.User{
				Email: "user1@email.com",
			},
		}, nil)
		sw.cm.On("Get", mock.Anything, mock.Anything).Return(&email.Data{}, nil)
		sw.es.On("SendEmail", mock.Anything).Return(nil)
		sw.nm.On("UpdateStatus", mock.Anything, mock.Anything, "notificationID", true, nil).Return(nil)
		sw.tx.On("Commit", mock.Anything).Return(nil)

		w := NewWorker(sw.svc, sw.cm)
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
	es         *email.SenderMock
	nm         *ManagerMock
	sm         *subscription.ManagerMock
	pm         *pkg.ManagerMock
	cm         *EmailDataCacheMock
	svc        *Services
}

func newServicesWrapper() *servicesWrapper {
	// Context and wait group used for Worker.Run()
	ctx, stopWorker := context.WithCancel(context.Background())
	var wg sync.WaitGroup
	wg.Add(1)

	db := &tests.DBMock{}
	tx := &tests.TXMock{}
	es := &email.SenderMock{}
	nm := &ManagerMock{}
	sm := &subscription.ManagerMock{}
	pm := &pkg.ManagerMock{}
	cm := &EmailDataCacheMock{}

	return &servicesWrapper{
		ctx:        ctx,
		stopWorker: stopWorker,
		wg:         &wg,
		db:         db,
		tx:         tx,
		es:         es,
		nm:         nm,
		sm:         sm,
		pm:         pm,
		cm:         cm,
		svc: &Services{
			DB:                  db,
			ES:                  es,
			NotificationManager: nm,
			SubscriptionManager: sm,
			PackageManager:      pm,
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
	sw.es.AssertExpectations(t)
	sw.nm.AssertExpectations(t)
	sw.sm.AssertExpectations(t)
	sw.pm.AssertExpectations(t)
}
