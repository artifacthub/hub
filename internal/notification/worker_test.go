package notification

import (
	"context"
	"io/ioutil"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/artifacthub/hub/internal/email"
	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/pkg"
	"github.com/artifacthub/hub/internal/subscription"
	"github.com/artifacthub/hub/internal/tests"
	"github.com/patrickmn/go-cache"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

func TestWorker(t *testing.T) {
	e := &hub.Event{
		EventID:        "eventID",
		EventKind:      hub.NewRelease,
		PackageID:      "packageID",
		PackageVersion: "1.0.0",
	}
	u := &hub.User{
		Email: "user1@email.com",
	}
	wh := &hub.Webhook{
		Name: "webhook1",
		URL:  "http://webhook1.url",
	}
	n1 := &hub.Notification{
		NotificationID: "notificationID",
		Event:          e,
		User:           u,
	}
	n2 := &hub.Notification{
		NotificationID: "notificationID",
		Event:          e,
		Webhook:        wh,
	}
	gpi := &hub.GetPackageInput{
		PackageID: e.PackageID,
		Version:   e.PackageVersion,
	}
	p := &hub.Package{
		Kind:             0,
		Name:             "package1",
		NormalizedName:   "package1",
		Version:          "1.0.0",
		OrganizationName: "org1",
		ChartRepository: &hub.ChartRepository{
			Name: "repo1",
		},
	}

	t.Run("error getting pending notification", func(t *testing.T) {
		sw := newServicesWrapper()
		sw.db.On("Begin", sw.ctx).Return(sw.tx, nil)
		sw.nm.On("GetPending", sw.ctx, sw.tx).Return(nil, errFake)
		sw.tx.On("Rollback", sw.ctx).Return(nil)

		w := NewWorker(sw.svc, sw.cache, "", sw.hc)
		go w.Run(sw.ctx, sw.wg)
		sw.assertExpectations(t)
	})

	t.Run("error getting package preparing email data", func(t *testing.T) {
		sw := newServicesWrapper()
		sw.db.On("Begin", sw.ctx).Return(sw.tx, nil)
		sw.nm.On("GetPending", sw.ctx, sw.tx).Return(n1, nil)
		sw.pm.On("Get", sw.ctx, gpi).Return(nil, errFake)
		sw.tx.On("Rollback", sw.ctx).Return(nil)

		w := NewWorker(sw.svc, sw.cache, "", sw.hc)
		go w.Run(sw.ctx, sw.wg)
		sw.assertExpectations(t)
	})

	t.Run("error sending email", func(t *testing.T) {
		sw := newServicesWrapper()
		sw.db.On("Begin", sw.ctx).Return(sw.tx, nil)
		sw.nm.On("GetPending", sw.ctx, sw.tx).Return(n1, nil)
		sw.pm.On("Get", sw.ctx, gpi).Return(p, nil)
		sw.es.On("SendEmail", mock.Anything).Return(errFake)
		sw.nm.On("UpdateStatus", sw.ctx, sw.tx, n1.NotificationID, true, errFake).Return(nil)
		sw.tx.On("Commit", sw.ctx).Return(nil)

		w := NewWorker(sw.svc, sw.cache, "", sw.hc)
		go w.Run(sw.ctx, sw.wg)
		sw.assertExpectations(t)
	})

	t.Run("email notification delivered successfully", func(t *testing.T) {
		sw := newServicesWrapper()
		sw.db.On("Begin", sw.ctx).Return(sw.tx, nil)
		sw.nm.On("GetPending", sw.ctx, sw.tx).Return(n1, nil)
		sw.pm.On("Get", sw.ctx, gpi).Return(p, nil)
		sw.es.On("SendEmail", mock.Anything).Return(nil)
		sw.nm.On("UpdateStatus", sw.ctx, sw.tx, n1.NotificationID, true, nil).Return(nil)
		sw.tx.On("Commit", sw.ctx).Return(nil)

		w := NewWorker(sw.svc, sw.cache, "", sw.hc)
		go w.Run(sw.ctx, sw.wg)
		sw.assertExpectations(t)
	})

	t.Run("error getting package preparing webhook payload", func(t *testing.T) {
		sw := newServicesWrapper()
		sw.db.On("Begin", sw.ctx).Return(sw.tx, nil)
		sw.nm.On("GetPending", sw.ctx, sw.tx).Return(n2, nil)
		sw.pm.On("Get", sw.ctx, gpi).Return(nil, errFake)
		sw.tx.On("Rollback", sw.ctx).Return(nil)

		w := NewWorker(sw.svc, sw.cache, "", sw.hc)
		go w.Run(sw.ctx, sw.wg)
		sw.assertExpectations(t)
	})

	t.Run("webhook call returned an error", func(t *testing.T) {
		sw := newServicesWrapper()
		sw.db.On("Begin", sw.ctx).Return(sw.tx, nil)
		sw.nm.On("GetPending", sw.ctx, sw.tx).Return(n2, nil)
		sw.pm.On("Get", sw.ctx, gpi).Return(p, nil)
		sw.hc.On("Do", mock.Anything).Return(nil, errFake)
		sw.nm.On("UpdateStatus", sw.ctx, sw.tx, n2.NotificationID, true, errFake).Return(nil)
		sw.tx.On("Commit", sw.ctx).Return(nil)

		w := NewWorker(sw.svc, sw.cache, "", sw.hc)
		go w.Run(sw.ctx, sw.wg)
		sw.assertExpectations(t)
	})

	t.Run("webhook call returned an unexpected status code", func(t *testing.T) {
		sw := newServicesWrapper()
		sw.db.On("Begin", sw.ctx).Return(sw.tx, nil)
		sw.nm.On("GetPending", sw.ctx, sw.tx).Return(n2, nil)
		sw.pm.On("Get", sw.ctx, gpi).Return(p, nil)
		sw.hc.On("Do", mock.Anything).Return(&http.Response{
			Body:       ioutil.NopCloser(strings.NewReader("")),
			StatusCode: http.StatusNotFound,
		}, nil)
		sw.nm.On("UpdateStatus", sw.ctx, sw.tx, n2.NotificationID, true, mock.Anything).Return(nil)
		sw.tx.On("Commit", sw.ctx).Return(nil)

		w := NewWorker(sw.svc, sw.cache, "", sw.hc)
		go w.Run(sw.ctx, sw.wg)
		sw.assertExpectations(t)
	})

	t.Run("webhook notification delivered successfully", func(t *testing.T) {
		sw := newServicesWrapper()
		sw.db.On("Begin", sw.ctx).Return(sw.tx, nil)
		sw.nm.On("GetPending", sw.ctx, sw.tx).Return(n2, nil)
		sw.pm.On("Get", sw.ctx, gpi).Return(p, nil)
		sw.hc.On("Do", mock.Anything).Return(&http.Response{
			Body:       ioutil.NopCloser(strings.NewReader("")),
			StatusCode: http.StatusOK,
		}, nil)
		sw.nm.On("UpdateStatus", sw.ctx, sw.tx, n2.NotificationID, true, nil).Return(nil)
		sw.tx.On("Commit", sw.ctx).Return(nil)

		w := NewWorker(sw.svc, sw.cache, "", sw.hc)
		go w.Run(sw.ctx, sw.wg)
		sw.assertExpectations(t)
	})

	t.Run("webhook notification delivered successfully (real http server)", func(t *testing.T) {
		testCases := []struct {
			id              string
			contentType     string
			template        string
			secret          string
			expectedPayload []byte
		}{
			{
				"1",
				"",
				"",
				"",
				[]byte(`
{
	"specversion" : "1.0",
	"id" : "eventID",
	"source" : "https://artifacthub.io/cloudevents",
	"type" : "io.artifacthub.package.new-release",
	"datacontenttype" : "application/json",
	"data" : {
		"package": {
			"kind": "helm-chart",
			"name": "package1",
			"version": "1.0.0",
			"publisher": "org1/repo1",
			"url": "http://baseURL/packages/chart/repo1/package1/1.0.0"
		}
	}
}
`),
			},
			{
				"2",
				"custom/type",
				"Package {{ .Package.name }} {{ .Package.version}} updated!",
				"very",
				[]byte("Package package1 1.0.0 updated!"),
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.id, func(t *testing.T) {
				ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
					contentType := tc.contentType
					if contentType == "" {
						contentType = DefaultPayloadContentType
					}
					assert.Equal(t, "POST", r.Method)
					assert.Equal(t, contentType, r.Header.Get("Content-Type"))
					assert.Equal(t, tc.secret, r.Header.Get("X-ArtifactHub-Secret"))
					payload, _ := ioutil.ReadAll(r.Body)
					assert.Equal(t, tc.expectedPayload, payload)
				}))
				defer ts.Close()

				sw := newServicesWrapper()
				sw.db.On("Begin", sw.ctx).Return(sw.tx, nil)
				sw.nm.On("GetPending", sw.ctx, sw.tx).Return(&hub.Notification{
					NotificationID: "notificationID",
					Event:          e,
					Webhook: &hub.Webhook{
						URL:         ts.URL,
						ContentType: tc.contentType,
						Template:    tc.template,
						Secret:      tc.secret,
					},
				}, nil)
				sw.pm.On("Get", sw.ctx, gpi).Return(p, nil)
				sw.nm.On("UpdateStatus", sw.ctx, sw.tx, n2.NotificationID, true, nil).Return(nil)
				sw.tx.On("Commit", sw.ctx).Return(nil)

				w := NewWorker(sw.svc, sw.cache, "http://baseURL", http.DefaultClient)
				go w.Run(sw.ctx, sw.wg)
				sw.assertExpectations(t)
			})
		}
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
	cache      *cache.Cache
	hc         *httpClientMock
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
	cache := cache.New(1*time.Minute, 5*time.Minute)
	hc := &httpClientMock{}

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
		cache:      cache,
		hc:         hc,
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
	sw.hc.AssertExpectations(t)
}

type httpClientMock struct {
	mock.Mock
}

func (m *httpClientMock) Do(req *http.Request) (*http.Response, error) {
	args := m.Called(req)
	resp, _ := args.Get(0).(*http.Response)
	return resp, args.Error(1)
}
