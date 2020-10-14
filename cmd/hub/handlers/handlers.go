package handlers

import (
	"fmt"
	"net"
	"net/http"
	"path"
	"strings"
	"time"

	"github.com/artifacthub/hub/cmd/hub/handlers/apikey"
	"github.com/artifacthub/hub/cmd/hub/handlers/helpers"
	"github.com/artifacthub/hub/cmd/hub/handlers/org"
	"github.com/artifacthub/hub/cmd/hub/handlers/pkg"
	"github.com/artifacthub/hub/cmd/hub/handlers/repo"
	"github.com/artifacthub/hub/cmd/hub/handlers/static"
	"github.com/artifacthub/hub/cmd/hub/handlers/subscription"
	"github.com/artifacthub/hub/cmd/hub/handlers/user"
	"github.com/artifacthub/hub/cmd/hub/handlers/webhook"
	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/img"
	"github.com/go-chi/chi"
	"github.com/go-chi/chi/middleware"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
	"github.com/spf13/viper"
	"github.com/ulule/limiter/v3"
	"github.com/ulule/limiter/v3/drivers/middleware/stdlib"
	"github.com/ulule/limiter/v3/drivers/store/memory"
)

var xForwardedFor = http.CanonicalHeaderKey("X-Forwarded-For")

// Services is a wrapper around several internal services used by the handlers.
type Services struct {
	OrganizationManager hub.OrganizationManager
	UserManager         hub.UserManager
	RepositoryManager   hub.RepositoryManager
	PackageManager      hub.PackageManager
	SubscriptionManager hub.SubscriptionManager
	WebhookManager      hub.WebhookManager
	APIKeyManager       hub.APIKeyManager
	ImageStore          img.Store
	Authorizer          hub.Authorizer
}

// Metrics groups some metrics collected from a Handlers instance.
type Metrics struct {
	duration *prometheus.HistogramVec
}

// Handlers groups all the http handlers defined for the hub, including the
// router in charge of sending requests to the right handler.
type Handlers struct {
	cfg     *viper.Viper
	svc     *Services
	metrics *Metrics
	logger  zerolog.Logger
	Router  http.Handler

	Organizations *org.Handlers
	Users         *user.Handlers
	Packages      *pkg.Handlers
	Repositories  *repo.Handlers
	Subscriptions *subscription.Handlers
	Webhooks      *webhook.Handlers
	APIKeys       *apikey.Handlers
	Static        *static.Handlers
}

// Setup creates a new Handlers instance.
func Setup(cfg *viper.Viper, svc *Services) *Handlers {
	h := &Handlers{
		cfg:     cfg,
		svc:     svc,
		metrics: setupMetrics(),
		logger:  log.With().Str("handlers", "root").Logger(),

		Organizations: org.NewHandlers(svc.OrganizationManager, svc.Authorizer, cfg),
		Users:         user.NewHandlers(svc.UserManager, cfg),
		Repositories:  repo.NewHandlers(svc.RepositoryManager),
		Packages:      pkg.NewHandlers(svc.PackageManager, cfg),
		Subscriptions: subscription.NewHandlers(svc.SubscriptionManager),
		Webhooks:      webhook.NewHandlers(svc.WebhookManager),
		APIKeys:       apikey.NewHandlers(svc.APIKeyManager),
		Static:        static.NewHandlers(cfg, svc.ImageStore),
	}
	h.setupRouter()
	return h
}

// setupMetrics creates and registers some metrics
func setupMetrics() *Metrics {
	// Requests duration
	duration := prometheus.NewHistogramVec(prometheus.HistogramOpts{
		Name: "http_request_duration",
		Help: "Duration of the http requests processed.",
	},
		[]string{"status", "method", "path"},
	)
	prometheus.MustRegister(duration)

	return &Metrics{
		duration: duration,
	}
}

// setupRouter initializes the handlers router, defining all routes used within
// the hub, as well as some essential middleware to handle panics, logging, etc.
func (h *Handlers) setupRouter() {
	r := chi.NewRouter()

	// Setup middleware and special handlers
	r.Use(middleware.Recoverer)
	r.Use(RealIP(h.cfg.GetInt("server.xffIndex")))
	r.Use(Logger)
	r.Use(h.MetricsCollector)
	if h.cfg.GetBool("server.basicAuth.enabled") {
		r.Use(h.Users.BasicAuth)
	}
	r.NotFound(h.Static.ServeIndex)

	// API
	r.Route("/api/v1", func(r chi.Router) {
		// Setup rate limiter middleware
		if h.cfg.GetBool("server.limiter.enabled") {
			limiterRate := limiter.Rate{
				Period: h.cfg.GetDuration("server.limiter.period"),
				Limit:  h.cfg.GetInt64("server.limiter.limit"),
			}
			limiterStore := memory.NewStore()
			rateLimiter := limiter.New(limiterStore, limiterRate)
			r.Use(stdlib.NewMiddleware(rateLimiter).Handler)
		}

		// Users
		r.Route("/users", func(r chi.Router) {
			r.Post("/", h.Users.RegisterUser)
			r.Post("/login", h.Users.Login)
			r.Post("/verify-email", h.Users.VerifyEmail)
			r.Group(func(r chi.Router) {
				r.Use(h.Users.RequireLogin)
				r.Get("/logout", h.Users.Logout)
				r.Get("/profile", h.Users.GetProfile)
				r.Put("/profile", h.Users.UpdateProfile)
				r.Put("/password", h.Users.UpdatePassword)
			})
		})

		// Organizations
		r.Route("/orgs", func(r chi.Router) {
			r.Group(func(r chi.Router) {
				r.Use(h.Users.RequireLogin)
				r.Post("/", h.Organizations.Add)
				r.Get("/user", h.Organizations.GetByUser)
			})
			r.Route("/{orgName}", func(r chi.Router) {
				r.Get("/", h.Organizations.Get)
				r.Group(func(r chi.Router) {
					r.Use(h.Users.RequireLogin)
					r.Put("/", h.Organizations.Update)
					r.Route("/authorizationPolicy", func(r chi.Router) {
						r.Get("/", h.Organizations.GetAuthorizationPolicy)
						r.Put("/", h.Organizations.UpdateAuthorizationPolicy)
					})
					r.Get("/accept-invitation", h.Organizations.ConfirmMembership)
					r.Get("/members", h.Organizations.GetMembers)
					r.Route("/member/{userAlias}", func(r chi.Router) {
						r.Post("/", h.Organizations.AddMember)
						r.Delete("/", h.Organizations.DeleteMember)
					})
					r.Get("/userAllowedActions", h.Organizations.GetUserAllowedActions)
				})
			})
		})

		// Repositories
		r.Route("/repositories", func(r chi.Router) {
			r.Use(h.Users.RequireLogin)
			r.Get("/", h.Repositories.GetAll)
			r.Get("/{kind:^helm$|^falco$|^olm$|^opa$}", h.Repositories.GetByKind)
			r.Route("/user", func(r chi.Router) {
				r.Get("/", h.Repositories.GetOwnedByUser)
				r.Post("/", h.Repositories.Add)
				r.Route("/{repoName}", func(r chi.Router) {
					r.Put("/claimOwnership", h.Repositories.ClaimOwnership)
					r.Put("/transfer", h.Repositories.Transfer)
					r.Put("/", h.Repositories.Update)
					r.Delete("/", h.Repositories.Delete)
				})
			})
			r.Route("/org/{orgName}", func(r chi.Router) {
				r.Get("/", h.Repositories.GetOwnedByOrg)
				r.Post("/", h.Repositories.Add)
				r.Route("/{repoName}", func(r chi.Router) {
					r.Put("/claimOwnership", h.Repositories.ClaimOwnership)
					r.Put("/transfer", h.Repositories.Transfer)
					r.Put("/", h.Repositories.Update)
					r.Delete("/", h.Repositories.Delete)
				})
			})
		})

		// Packages
		r.Route("/packages", func(r chi.Router) {
			r.Get("/random", h.Packages.GetRandom)
			r.Get("/stats", h.Packages.GetStats)
			r.Get("/search", h.Packages.Search)
			r.With(h.Users.RequireLogin).Get("/starred", h.Packages.GetStarredByUser)
			r.Route("/{^helm$|^falco$|^opa$|^olm$}/{repoName}/{packageName}", func(r chi.Router) {
				r.Get("/feed/rss", h.Packages.RssFeed)
				r.Get("/{version}", h.Packages.Get)
				r.Get("/", h.Packages.Get)
			})
			r.Route("/{packageID}/stars", func(r chi.Router) {
				r.With(h.Users.InjectUserID).Get("/", h.Packages.GetStars)
				r.With(h.Users.RequireLogin).Put("/", h.Packages.ToggleStar)
			})
			r.Get("/{packageID}/{version}/securityReport", h.Packages.GetSnapshotSecurityReport)
		})

		// Subscriptions
		r.Route("/subscriptions", func(r chi.Router) {
			r.Use(h.Users.RequireLogin)
			r.Route("/opt-out", func(r chi.Router) {
				r.Get("/", h.Subscriptions.GetOptOutList)
				r.Post("/", h.Subscriptions.AddOptOut)
				r.Delete("/{optOutID}", h.Subscriptions.DeleteOptOut)
			})
			r.Get("/{packageID}", h.Subscriptions.GetByPackage)
			r.Get("/", h.Subscriptions.GetByUser)
			r.Post("/", h.Subscriptions.Add)
			r.Delete("/", h.Subscriptions.Delete)
		})

		// Webhooks
		r.Route("/webhooks", func(r chi.Router) {
			r.Use(h.Users.RequireLogin)
			r.Route("/user", func(r chi.Router) {
				r.Get("/", h.Webhooks.GetOwnedByUser)
				r.Post("/", h.Webhooks.Add)
				r.Route("/{webhookID}", func(r chi.Router) {
					r.Get("/", h.Webhooks.Get)
					r.Put("/", h.Webhooks.Update)
					r.Delete("/", h.Webhooks.Delete)
				})
			})
			r.Route("/org/{orgName}", func(r chi.Router) {
				r.Get("/", h.Webhooks.GetOwnedByOrg)
				r.Post("/", h.Webhooks.Add)
				r.Route("/{webhookID}", func(r chi.Router) {
					r.Get("/", h.Webhooks.Get)
					r.Put("/", h.Webhooks.Update)
					r.Delete("/", h.Webhooks.Delete)
				})
			})
			r.Post("/test", h.Webhooks.TriggerTest)
		})

		// API keys
		r.Route("/api-keys", func(r chi.Router) {
			r.Use(h.Users.RequireLogin)
			r.Get("/", h.APIKeys.GetOwnedByUser)
			r.Post("/", h.APIKeys.Add)
			r.Route("/{apiKeyID}", func(r chi.Router) {
				r.Get("/", h.APIKeys.Get)
				r.Put("/", h.APIKeys.Update)
				r.Delete("/", h.APIKeys.Delete)
			})
		})

		// Availability checks
		r.Route("/check-availability", func(r chi.Router) {
			r.Head("/{resourceKind:^repositoryName$|^repositoryURL$}", h.Repositories.CheckAvailability)
			r.Head("/{resourceKind:^organizationName$}", h.Organizations.CheckAvailability)
			r.Head("/{resourceKind:^userAlias$}", h.Users.CheckAvailability)
		})

		// Images
		r.With(h.Users.RequireLogin).Post("/images", h.Static.SaveImage)
	})

	// Monocular compatible search API
	//
	// This endpoint provides a Monocular compatible search API that the Helm
	// CLI search subcommand can use. The goal is to facilitate the transition
	// from the Helm Hub to Artifact Hub, allowing the existing Helm tooling to
	// continue working without modifications. This is a temporary solution and
	// future Helm CLI versions should use the generic Artifact Hub search API.
	r.Get("/api/chartsvc/v1/charts/search", h.Packages.SearchMonocular)

	// Monocular charts url redirect endpoint
	//
	// This endpoint is a helper related to the Monocular search one above. At
	// the moment Helm CLI builds charts urls coming from the Helm Hub using
	// this layout. This cannot be changed for previous versions out there, so
	// this endpoint handles the redirection to the package URL in Artifact Hub.
	// The monocular compatible search API endpoint that we provide now returns
	// the package url to facilitate that future versions of Helm can use it.
	r.Get("/charts/{repoName}/{packageName}", func(w http.ResponseWriter, r *http.Request) {
		pkgPath := fmt.Sprintf("/packages/helm/%s/%s",
			chi.URLParam(r, "repoName"),
			chi.URLParam(r, "packageName"),
		)
		http.Redirect(w, r, pkgPath, http.StatusMovedPermanently)
	})

	// Oauth
	providers := make([]string, 0, len(h.cfg.GetStringMap("server.oauth")))
	for provider := range h.cfg.GetStringMap("server.oauth") {
		providers = append(providers, fmt.Sprintf("^%s$", provider))
	}
	if len(providers) > 0 {
		r.Route(fmt.Sprintf("/oauth/{provider:%s}", strings.Join(providers, "|")), func(r chi.Router) {
			r.Get("/", h.Users.OauthRedirect)
			r.Get("/callback", h.Users.OauthCallback)
		})
	}

	// Index special entry points
	r.Route("/packages", func(r chi.Router) {
		r.Route("/{^helm$|^falco$|^opa$|^olm$}/{repoName}/{packageName}", func(r chi.Router) {
			r.With(h.Packages.InjectIndexMeta).Get("/{version}", h.Static.ServeIndex)
			r.With(h.Packages.InjectIndexMeta).Get("/", h.Static.ServeIndex)
		})
	})

	// Badges
	r.Get("/badge/repository/{repoName}", h.Repositories.Badge)

	// Static files and index
	webBuildPath := h.cfg.GetString("server.webBuildPath")
	staticFilesPath := path.Join(webBuildPath, "static")
	static.FileServer(r, "/static", http.Dir(staticFilesPath))
	r.Get("/image/{image}", h.Static.Image)
	r.Get("/manifest.json", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", helpers.BuildCacheControlHeader(5*time.Minute))
		http.ServeFile(w, r, path.Join(webBuildPath, "manifest.json"))
	})
	r.Get("/", h.Static.ServeIndex)

	h.Router = r
}

// MetricsCollector is an http middleware that collects some metrics about
// requests processed.
func (h *Handlers) MetricsCollector(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		ww := middleware.NewWrapResponseWriter(w, r.ProtoMajor)
		defer func() {
			rctx := chi.RouteContext(r.Context())
			h.metrics.duration.WithLabelValues(
				http.StatusText(ww.Status()),
				r.Method,
				rctx.RoutePattern(),
			).Observe(time.Since(start).Seconds())
		}()
		next.ServeHTTP(ww, r)
	})
}

// RealIP is an http middleware that sets the request remote addr to the result
// of extracting the IP in the requested index from the X-Forwarded-For header.
// Positives indexes start by 0 and work like usual slice indexes. Negative
// indexes are allowed being -1 the last entry in the slice, -2 the next, etc.
func RealIP(i int) func(next http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if xff := r.Header.Get(xForwardedFor); xff != "" {
				ips := strings.Split(xff, ",")
				if i >= 0 && len(ips) > i {
					r.RemoteAddr = strings.TrimSpace(ips[i]) + ":"
				}
				if i < 0 && len(ips)+i >= 0 {
					r.RemoteAddr = strings.TrimSpace(ips[len(ips)+i]) + ":"
				}
			}
			next.ServeHTTP(w, r)
		})
	}
}

// Logger is an http middleware that logs some information about requests
// processed using zerolog.
func Logger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		ww := middleware.NewWrapResponseWriter(w, r.ProtoMajor)
		host, port, _ := net.SplitHostPort(r.RemoteAddr)
		defer func() {
			var event *zerolog.Event
			if ww.Status() < 500 {
				event = log.Info()
			} else {
				event = log.Error()
			}
			event.
				Fields(map[string]interface{}{
					"host":      host,
					"port":      port,
					"method":    r.Method,
					"status":    ww.Status(),
					"took":      float64(time.Since(start)) / 1e6,
					"bytes_in":  r.Header.Get("Content-Length"),
					"bytes_out": ww.BytesWritten(),
				}).
				Timestamp().
				Msg(r.URL.Path)
		}()
		next.ServeHTTP(ww, r)
	})
}
