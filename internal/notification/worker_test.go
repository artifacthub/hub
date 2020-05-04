package notification

import (
	"context"
	"errors"
	"os"
	"sync"
	"testing"
	"time"

	"github.com/artifacthub/hub/internal/email"
	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/pkg"
	"github.com/artifacthub/hub/internal/subscription"
	"github.com/artifacthub/hub/internal/tests"
	"github.com/rs/zerolog"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

var errFake = errors.New("fake error for tests")

func TestMain(m *testing.M) {
	zerolog.SetGlobalLevel(zerolog.Disabled)
	os.Exit(m.Run())
}

func TestWorker(t *testing.T) {
	t.Run("error getting pending notification", func(t *testing.T) {
		sw := newServicesWrapper()
		sw.db.On("Begin", mock.Anything).Return(sw.tx, nil)
		sw.tx.On("Rollback", mock.Anything).Return(nil)
		sw.nm.On("GetPending", mock.Anything, mock.Anything).Return(nil, errFake)

		w := NewWorker(sw.svc, "baseURL")
		go w.Run(sw.ctx, sw.wg)
		sw.assertExpectations(t)
	})

	t.Run("error getting notification subscriptors", func(t *testing.T) {
		sw := newServicesWrapper()
		sw.db.On("Begin", mock.Anything).Return(sw.tx, nil)
		sw.tx.On("Rollback", mock.Anything).Return(nil)
		sw.nm.On("GetPending", mock.Anything, mock.Anything).Return(&hub.Notification{
			PackageID:        "packageID",
			NotificationKind: hub.NewRelease,
		}, nil)
		sw.sm.On("GetSubscriptors", mock.Anything, "packageID", hub.NewRelease).Return(nil, errFake)

		w := NewWorker(sw.svc, "baseURL")
		go w.Run(sw.ctx, sw.wg)
		sw.assertExpectations(t)
	})

	t.Run("no subscriptors found", func(t *testing.T) {
		sw := newServicesWrapper()
		sw.db.On("Begin", mock.Anything).Return(sw.tx, nil)
		sw.tx.On("Commit", mock.Anything).Return(nil)
		sw.nm.On("GetPending", mock.Anything, mock.Anything).Return(&hub.Notification{
			PackageID:        "packageID",
			NotificationKind: hub.NewRelease,
		}, nil)
		sw.sm.On("GetSubscriptors", mock.Anything, "packageID", hub.NewRelease).Return([]*hub.User{}, nil)

		w := NewWorker(sw.svc, "baseURL")
		go w.Run(sw.ctx, sw.wg)
		sw.assertExpectations(t)
	})

	t.Run("error preparing email data", func(t *testing.T) {
		sw := newServicesWrapper()
		sw.db.On("Begin", mock.Anything).Return(sw.tx, nil)
		sw.tx.On("Rollback", mock.Anything).Return(nil)
		sw.nm.On("GetPending", mock.Anything, mock.Anything).Return(&hub.Notification{
			PackageID:        "packageID",
			NotificationKind: hub.NewRelease,
		}, nil)
		sw.sm.On("GetSubscriptors", mock.Anything, "packageID", hub.NewRelease).Return([]*hub.User{
			{
				Email: "user1@email.com",
			},
		}, nil)
		sw.pm.On("Get", mock.Anything, mock.Anything).Return(nil, errFake)

		w := NewWorker(sw.svc, "baseURL")
		go w.Run(sw.ctx, sw.wg)
		sw.assertExpectations(t)
	})

	t.Run("error sending email", func(t *testing.T) {
		sw := newServicesWrapper()
		sw.db.On("Begin", mock.Anything).Return(sw.tx, nil)
		sw.tx.On("Rollback", mock.Anything).Return(nil)
		sw.nm.On("GetPending", mock.Anything, mock.Anything).Return(&hub.Notification{
			PackageID:        "packageID",
			NotificationKind: hub.NewRelease,
		}, nil)
		sw.sm.On("GetSubscriptors", mock.Anything, "packageID", hub.NewRelease).Return([]*hub.User{
			{
				Email: "user1@email.com",
			},
		}, nil)
		sw.pm.On("Get", mock.Anything, mock.Anything).Return(nil, errFake)
		sw.es.On("SendEmail", mock.Anything).Return(errFake)

		w := NewWorker(sw.svc, "baseURL")
		go w.Run(sw.ctx, sw.wg)
		sw.assertExpectations(t)
	})

	t.Run("notification delivered successfully", func(t *testing.T) {
		sw := newServicesWrapper()
		sw.db.On("Begin", mock.Anything).Return(sw.tx, nil)
		sw.tx.On("Rollback", mock.Anything).Return(nil)
		sw.nm.On("GetPending", mock.Anything, mock.Anything).Return(&hub.Notification{
			PackageID:        "packageID",
			NotificationKind: hub.NewRelease,
		}, nil)
		sw.sm.On("GetSubscriptors", mock.Anything, "packageID", hub.NewRelease).Return([]*hub.User{
			{
				Email: "user1@email.com",
			},
		}, nil)
		sw.pm.On("Get", mock.Anything, mock.Anything).Return(nil, errFake)
		sw.es.On("SendEmail", mock.Anything).Return(nil)

		w := NewWorker(sw.svc, "baseURL")
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

	sw.nm.AssertExpectations(t)
	sw.sm.AssertExpectations(t)
	sw.pm.AssertExpectations(t)
}
