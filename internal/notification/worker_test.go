package notification

import (
	"context"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"text/template"
	"time"

	"github.com/artifacthub/hub/internal/email"
	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/pkg"
	"github.com/artifacthub/hub/internal/repo"
	"github.com/artifacthub/hub/internal/subscription"
	"github.com/artifacthub/hub/internal/tests"
	"github.com/patrickmn/go-cache"
	"github.com/spf13/viper"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

func TestWorker(t *testing.T) {
	e1 := &hub.Event{
		EventID:        "eventID",
		EventKind:      hub.NewRelease,
		PackageID:      "packageID",
		PackageVersion: "1.0.0",
	}
	e2 := &hub.Event{
		EventID:      "eventID",
		EventKind:    hub.RepositoryTrackingErrors,
		RepositoryID: "repositoryID",
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
		Event:          e1,
		User:           u,
	}
	n2 := &hub.Notification{
		NotificationID: "notificationID",
		Event:          e1,
		Webhook:        wh,
	}
	n3 := &hub.Notification{
		NotificationID: "notificationID",
		Event:          e2,
		User:           u,
	}
	gpi := &hub.GetPackageInput{
		PackageID: e1.PackageID,
		Version:   e1.PackageVersion,
	}
	p := &hub.Package{
		Name:           "package1",
		NormalizedName: "package1",
		Version:        "1.0.0",
		Changes: []*hub.Change{
			{
				Kind:        "added",
				Description: "feature 1",
			},
			{
				Kind:        "fixed",
				Description: "bug 1",
			},
		},
		ContainsSecurityUpdates: true,
		Prerelease:              true,
		Repository: &hub.Repository{
			Kind:             hub.Helm,
			Name:             "repo1",
			OrganizationName: "org1",
		},
	}
	r := &hub.Repository{
		Kind:             hub.Helm,
		Name:             "repo1",
		OrganizationName: "org1",
	}
	tmpl := map[templateID]*template.Template{
		newReleaseEmail:     template.Must(template.New("").Parse(email.BaseTmpl + newReleaseEmailTmpl)),
		ownershipClaimEmail: template.Must(template.New("").Parse(email.BaseTmpl + ownershipClaimEmailTmpl)),
		scanningErrorsEmail: template.Must(template.New("").Parse(email.BaseTmpl + scanningErrorsEmailTmpl)),
		securityAlertEmail:  template.Must(template.New("").Parse(email.BaseTmpl + securityAlertEmailTmpl)),
		trackingErrorsEmail: template.Must(template.New("").Parse(email.BaseTmpl + trackingErrorsEmailTmpl)),
	}

	t.Run("error getting pending notification", func(t *testing.T) {
		t.Parallel()
		sw := newServicesWrapper()
		sw.db.On("Begin", sw.ctx).Return(sw.tx, nil)
		sw.nm.On("GetPending", sw.ctx, sw.tx).Return(nil, tests.ErrFake)
		sw.tx.On("Rollback", sw.ctx).Return(nil)

		w := NewWorker(sw.svc, sw.cache, tmpl)
		go w.Run(sw.ctx, sw.wg)
		sw.assertExpectations(t)
	})

	t.Run("error getting package preparing email data", func(t *testing.T) {
		t.Parallel()
		sw := newServicesWrapper()
		sw.db.On("Begin", sw.ctx).Return(sw.tx, nil)
		sw.nm.On("GetPending", sw.ctx, sw.tx).Return(n1, nil)
		sw.pm.On("Get", sw.ctx, gpi).Return(nil, tests.ErrFake)
		sw.tx.On("Rollback", sw.ctx).Return(nil)

		w := NewWorker(sw.svc, sw.cache, tmpl)
		go w.Run(sw.ctx, sw.wg)
		sw.assertExpectations(t)
	})

	t.Run("error getting repository preparing email data", func(t *testing.T) {
		t.Parallel()
		sw := newServicesWrapper()
		sw.db.On("Begin", sw.ctx).Return(sw.tx, nil)
		sw.nm.On("GetPending", sw.ctx, sw.tx).Return(n3, nil)
		sw.rm.On("GetByID", sw.ctx, "repositoryID", false).Return(nil, tests.ErrFake)
		sw.tx.On("Rollback", sw.ctx).Return(nil)

		w := NewWorker(sw.svc, sw.cache, tmpl)
		go w.Run(sw.ctx, sw.wg)
		sw.assertExpectations(t)
	})

	t.Run("error sending package notification email", func(t *testing.T) {
		t.Parallel()
		sw := newServicesWrapper()
		sw.db.On("Begin", sw.ctx).Return(sw.tx, nil)
		sw.nm.On("GetPending", sw.ctx, sw.tx).Return(n1, nil)
		sw.pm.On("Get", sw.ctx, gpi).Return(p, nil)
		sw.es.On("SendEmail", mock.Anything).Return(tests.ErrFake)
		sw.nm.On("UpdateStatus", sw.ctx, sw.tx, n1.NotificationID, true, tests.ErrFake).Return(nil)
		sw.tx.On("Commit", sw.ctx).Return(nil)

		w := NewWorker(sw.svc, sw.cache, tmpl)
		go w.Run(sw.ctx, sw.wg)
		sw.assertExpectations(t)
	})

	t.Run("error sending repository notification email", func(t *testing.T) {
		t.Parallel()
		sw := newServicesWrapper()
		sw.db.On("Begin", sw.ctx).Return(sw.tx, nil)
		sw.nm.On("GetPending", sw.ctx, sw.tx).Return(n3, nil)
		sw.rm.On("GetByID", sw.ctx, "repositoryID", false).Return(r, nil)
		sw.es.On("SendEmail", mock.Anything).Return(tests.ErrFake)
		sw.nm.On("UpdateStatus", sw.ctx, sw.tx, n3.NotificationID, true, tests.ErrFake).Return(nil)
		sw.tx.On("Commit", sw.ctx).Return(nil)

		w := NewWorker(sw.svc, sw.cache, tmpl)
		go w.Run(sw.ctx, sw.wg)
		sw.assertExpectations(t)
	})

	t.Run("package email notification delivered successfully", func(t *testing.T) {
		t.Parallel()
		sw := newServicesWrapper()
		sw.db.On("Begin", sw.ctx).Return(sw.tx, nil)
		sw.nm.On("GetPending", sw.ctx, sw.tx).Return(n1, nil)
		sw.pm.On("Get", sw.ctx, gpi).Return(p, nil)
		sw.es.On("SendEmail", mock.Anything).Return(nil)
		sw.nm.On("UpdateStatus", sw.ctx, sw.tx, n1.NotificationID, true, nil).Return(nil)
		sw.tx.On("Commit", sw.ctx).Return(nil)

		w := NewWorker(sw.svc, sw.cache, tmpl)
		go w.Run(sw.ctx, sw.wg)
		sw.assertExpectations(t)
	})

	t.Run("repository email notification delivered successfully", func(t *testing.T) {
		t.Parallel()
		sw := newServicesWrapper()
		sw.db.On("Begin", sw.ctx).Return(sw.tx, nil)
		sw.nm.On("GetPending", sw.ctx, sw.tx).Return(n3, nil)
		sw.rm.On("GetByID", sw.ctx, "repositoryID", false).Return(r, nil)
		sw.es.On("SendEmail", mock.Anything).Return(nil)
		sw.nm.On("UpdateStatus", sw.ctx, sw.tx, n3.NotificationID, true, nil).Return(nil)
		sw.tx.On("Commit", sw.ctx).Return(nil)

		w := NewWorker(sw.svc, sw.cache, tmpl)
		go w.Run(sw.ctx, sw.wg)
		sw.assertExpectations(t)
	})

	t.Run("error getting package preparing webhook payload", func(t *testing.T) {
		t.Parallel()
		sw := newServicesWrapper()
		sw.db.On("Begin", sw.ctx).Return(sw.tx, nil)
		sw.nm.On("GetPending", sw.ctx, sw.tx).Return(n2, nil)
		sw.pm.On("Get", sw.ctx, gpi).Return(nil, tests.ErrFake)
		sw.tx.On("Rollback", sw.ctx).Return(nil)

		w := NewWorker(sw.svc, sw.cache, tmpl)
		go w.Run(sw.ctx, sw.wg)
		sw.assertExpectations(t)
	})

	t.Run("webhook call returned an error", func(t *testing.T) {
		t.Parallel()
		sw := newServicesWrapper()
		sw.db.On("Begin", sw.ctx).Return(sw.tx, nil)
		sw.nm.On("GetPending", sw.ctx, sw.tx).Return(n2, nil)
		sw.pm.On("Get", sw.ctx, gpi).Return(p, nil)
		sw.hc.On("Do", mock.Anything).Return(nil, tests.ErrFake)
		sw.nm.On("UpdateStatus", sw.ctx, sw.tx, n2.NotificationID, true, tests.ErrFake).Return(nil)
		sw.tx.On("Commit", sw.ctx).Return(nil)

		w := NewWorker(sw.svc, sw.cache, tmpl)
		go w.Run(sw.ctx, sw.wg)
		sw.assertExpectations(t)
	})

	t.Run("webhook call returned an unexpected status code", func(t *testing.T) {
		t.Parallel()
		sw := newServicesWrapper()
		sw.db.On("Begin", sw.ctx).Return(sw.tx, nil)
		sw.nm.On("GetPending", sw.ctx, sw.tx).Return(n2, nil)
		sw.pm.On("Get", sw.ctx, gpi).Return(p, nil)
		sw.hc.On("Do", mock.Anything).Return(&http.Response{
			Body:       io.NopCloser(strings.NewReader("")),
			StatusCode: http.StatusNotFound,
		}, nil)
		sw.nm.On("UpdateStatus", sw.ctx, sw.tx, n2.NotificationID, true, mock.Anything).Return(nil)
		sw.tx.On("Commit", sw.ctx).Return(nil)

		w := NewWorker(sw.svc, sw.cache, tmpl)
		go w.Run(sw.ctx, sw.wg)
		sw.assertExpectations(t)
	})

	t.Run("webhook notification delivered successfully", func(t *testing.T) {
		t.Parallel()
		sw := newServicesWrapper()
		sw.db.On("Begin", sw.ctx).Return(sw.tx, nil)
		sw.nm.On("GetPending", sw.ctx, sw.tx).Return(n2, nil)
		sw.pm.On("Get", sw.ctx, gpi).Return(p, nil)
		sw.hc.On("Do", mock.Anything).Return(&http.Response{
			Body:       io.NopCloser(strings.NewReader("")),
			StatusCode: http.StatusOK,
		}, nil)
		sw.nm.On("UpdateStatus", sw.ctx, sw.tx, n2.NotificationID, true, nil).Return(nil)
		sw.tx.On("Commit", sw.ctx).Return(nil)

		w := NewWorker(sw.svc, sw.cache, tmpl)
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
	"source" : "http://baseURL",
	"type" : "io.artifacthub.package.new-release",
	"datacontenttype" : "application/json",
	"data" : {
		"package": {
			"name": "package1",
			"version": "1.0.0",
			"url": "http://baseURL/packages/helm/repo1/package1/1.0.0",
			"changes": ["feature 1", "bug 1"],
			"containsSecurityUpdates": true,
			"prerelease": true,
			"repository": {
				"kind": "helm",
				"name": "repo1",
				"publisher": "org1"
			}
		}
	}
}
`),
			},
			{
				"2",
				"custom/type",
				"Package {{ .Package.Name }} {{ .Package.Version}} updated!",
				"very",
				[]byte("Package package1 1.0.0 updated!"),
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.id, func(t *testing.T) {
				t.Parallel()
				ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
					contentType := tc.contentType
					if contentType == "" {
						contentType = DefaultPayloadContentType
					}
					assert.Equal(t, "POST", r.Method)
					assert.Equal(t, contentType, r.Header.Get("Content-Type"))
					assert.Equal(t, tc.secret, r.Header.Get("X-ArtifactHub-Secret"))
					payload, _ := io.ReadAll(r.Body)
					assert.Equal(t, tc.expectedPayload, payload)
				}))
				defer ts.Close()

				sw := newServicesWrapper()
				sw.svc.HTTPClient = &http.Client{}
				sw.db.On("Begin", sw.ctx).Return(sw.tx, nil)
				sw.nm.On("GetPending", sw.ctx, sw.tx).Return(&hub.Notification{
					NotificationID: "notificationID",
					Event:          e1,
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

				w := NewWorker(sw.svc, sw.cache, tmpl)
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
	cfg        *viper.Viper
	db         *tests.DBMock
	tx         *tests.TXMock
	es         *email.SenderMock
	nm         *ManagerMock
	sm         *subscription.ManagerMock
	rm         *repo.ManagerMock
	pm         *pkg.ManagerMock
	cache      *cache.Cache
	hc         *tests.HTTPClientMock
	svc        *Services
}

func newServicesWrapper() *servicesWrapper {
	// Context and wait group used for Worker.Run()
	ctx, stopWorker := context.WithCancel(context.Background())
	var wg sync.WaitGroup
	wg.Add(1)

	cfg := viper.New()
	cfg.Set("server.baseURL", "http://baseURL")
	db := &tests.DBMock{}
	tx := &tests.TXMock{}
	es := &email.SenderMock{}
	nm := &ManagerMock{}
	sm := &subscription.ManagerMock{}
	rm := &repo.ManagerMock{}
	pm := &pkg.ManagerMock{}
	cache := cache.New(1*time.Minute, 5*time.Minute)
	hc := &tests.HTTPClientMock{}

	return &servicesWrapper{
		ctx:        ctx,
		stopWorker: stopWorker,
		wg:         &wg,
		cfg:        cfg,
		db:         db,
		tx:         tx,
		es:         es,
		nm:         nm,
		sm:         sm,
		rm:         rm,
		pm:         pm,
		cache:      cache,
		hc:         hc,
		svc: &Services{
			Cfg:                 cfg,
			DB:                  db,
			ES:                  es,
			NotificationManager: nm,
			SubscriptionManager: sm,
			RepositoryManager:   rm,
			PackageManager:      pm,
			HTTPClient:          hc,
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
	sw.rm.AssertExpectations(t)
	sw.pm.AssertExpectations(t)
	sw.hc.AssertExpectations(t)
}
