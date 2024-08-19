package handlers

import (
	"context"
	"fmt"
	"net"
	"net/http"
	"path"
	"strings"
	"time"

	"github.com/artifacthub/hub/internal/handlers/apikey"
	"github.com/artifacthub/hub/internal/handlers/helpers"
	"github.com/artifacthub/hub/internal/handlers/org"
	"github.com/artifacthub/hub/internal/handlers/pkg"
	"github.com/artifacthub/hub/internal/handlers/repo"
	"github.com/artifacthub/hub/internal/handlers/static"
	"github.com/artifacthub/hub/internal/handlers/stats"
	"github.com/artifacthub/hub/internal/handlers/subscription"
	"github.com/artifacthub/hub/internal/handlers/user"
	"github.com/artifacthub/hub/internal/handlers/webhook"
	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/img"
	"github.com/artifacthub/hub/internal/util"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/gorilla/csrf"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/rs/cors"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
	"github.com/spf13/viper"
	"github.com/unrolled/secure"
)

const csrfHeader = "X-CSRF-Token"

var (
	xForwardedFor = http.CanonicalHeaderKey("X-Forwarded-For")

	// WebhooksHTTPClientTimeout represents the timeout of the http client used
	// to handle the webhooks requests.
	WebhooksHTTPClientTimeout = 60 * time.Second
)

// Services is a wrapper around several internal services used by the handlers.
type Services struct {
	OrganizationManager hub.OrganizationManager
	UserManager         hub.UserManager
	RepositoryManager   hub.RepositoryManager
	PackageManager      hub.PackageManager
	SubscriptionManager hub.SubscriptionManager
	WebhookManager      hub.WebhookManager
	APIKeyManager       hub.APIKeyManager
	StatsManager        hub.StatsManager
	ImageStore          img.Store
	Authorizer          hub.Authorizer
	HTTPClient          hub.HTTPClient
	OCIPuller           hub.OCIPuller
	ViewsTracker        hub.ViewsTracker
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
	Stats         *stats.Handlers
}

// Setup creates a new Handlers instance.
func Setup(ctx context.Context, cfg *viper.Viper, svc *Services) (*Handlers, error) {
	userHandlers, err := user.NewHandlers(ctx, svc.UserManager, svc.APIKeyManager, cfg)
	if err != nil {
		return nil, err
	}
	h := &Handlers{
		cfg:     cfg,
		svc:     svc,
		metrics: setupMetrics(),
		logger:  log.With().Str("handlers", "root").Logger(),

		Organizations: org.NewHandlers(svc.OrganizationManager, svc.Authorizer, cfg),
		Users:         userHandlers,
		Repositories:  repo.NewHandlers(cfg, svc.RepositoryManager),
		Packages: pkg.NewHandlers(
			svc.PackageManager,
			svc.RepositoryManager,
			cfg,
			svc.HTTPClient,
			svc.OCIPuller,
			svc.ViewsTracker,
		),
		Subscriptions: subscription.NewHandlers(svc.SubscriptionManager),
		Webhooks: webhook.NewHandlers(
			svc.WebhookManager,
			util.SetupHTTPClient(cfg.GetBool("restrictedHTTPClient"), WebhooksHTTPClientTimeout),
		),
		APIKeys: apikey.NewHandlers(svc.APIKeyManager),
		Static:  static.NewHandlers(cfg, svc.ImageStore),
		Stats:   stats.NewHandlers(svc.StatsManager),
	}
	h.setupRouter()
	return h, nil
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
	corsMW := cors.New(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET"},
		AllowCredentials: false,
	}).Handler
	compress := middleware.Compress(5)
	r.Use(middleware.Recoverer)
	r.Use(realIP(h.cfg.GetInt("server.xffIndex")))
	r.Use(logger)
	r.Use(h.MetricsCollector)
	r.Use(secure.New(secure.Options{
		SSLProxyHeaders:      map[string]string{"X-Forwarded-Proto": "https"},
		STSSeconds:           31536000,
		STSIncludeSubdomains: true,
		STSPreload:           true,
	}).Handler)
	if h.cfg.GetBool("server.basicAuth.enabled") {
		r.Use(h.Users.BasicAuth)
	}
	r.NotFound(h.Static.Index)

	// API
	r.Route("/api/v1", func(r chi.Router) {
		// CSRF
		r.Use(csrfSkipper)
		r.Use(csrf.Protect(
			[]byte(h.cfg.GetString("server.csrf.authKey")),
			csrf.Secure(h.cfg.GetBool("server.csrf.secure")),
			csrf.Path("/api/v1"),
			csrf.CookieName("csrf"),
		))
		r.Get("/csrf", func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Cache-Control", "no-store")
			w.Header().Set(csrfHeader, csrf.Token(r))
		})

		// Users
		r.Route("/users", func(r chi.Router) {
			r.Post("/", h.Users.RegisterUser)
			r.Post("/check-password-strength", h.Users.CheckPasswordStrength)
			r.Post("/login", h.Users.Login)
			r.Put("/approve-session", h.Users.ApproveSession)
			r.Post("/password-reset-code", h.Users.RegisterPasswordResetCode)
			r.Put("/reset-password", h.Users.ResetPassword)
			r.Post("/verify-email", h.Users.VerifyEmail)
			r.Post("/verify-password-reset-code", h.Users.VerifyPasswordResetCode)
			r.Group(func(r chi.Router) {
				r.Use(h.Users.RequireLogin)
				r.Delete("/", h.Users.DeleteUser)
				r.Post("/delete-user-code", h.Users.RegisterDeleteUserCode)
				r.Route("/tfa", func(r chi.Router) {
					r.Put("/disable", h.Users.DisableTFA)
					r.Put("/enable", h.Users.EnableTFA)
					r.Post("/", h.Users.SetupTFA)
				})
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
					r.Delete("/", h.Organizations.Delete)
					r.Put("/", h.Organizations.Update)
					r.Route("/authorization-policy", func(r chi.Router) {
						r.Get("/", h.Organizations.GetAuthorizationPolicy)
						r.Put("/", h.Organizations.UpdateAuthorizationPolicy)
					})
					r.Get("/accept-invitation", h.Organizations.ConfirmMembership)
					r.Get("/members", h.Organizations.GetMembers)
					r.Route("/member/{userAlias}", func(r chi.Router) {
						r.Post("/", h.Organizations.AddMember)
						r.Delete("/", h.Organizations.DeleteMember)
					})
					r.Get("/user-allowed-actions", h.Organizations.GetUserAllowedActions)
				})
			})
		})

		// Repositories
		r.Route("/repositories", func(r chi.Router) {
			r.With(h.Users.InjectUserID).Get("/search", h.Repositories.Search)
			r.Group(func(r chi.Router) {
				r.Use(h.Users.RequireLogin)
				r.Route("/user", func(r chi.Router) {
					r.Post("/", h.Repositories.Add)
					r.Route("/{repoName}", func(r chi.Router) {
						r.Put("/claim-ownership", h.Repositories.ClaimOwnership)
						r.Put("/transfer", h.Repositories.Transfer)
						r.Put("/", h.Repositories.Update)
						r.Delete("/", h.Repositories.Delete)
					})
				})
				r.Route("/org/{orgName}", func(r chi.Router) {
					r.Post("/", h.Repositories.Add)
					r.Route("/{repoName}", func(r chi.Router) {
						r.Put("/claim-ownership", h.Repositories.ClaimOwnership)
						r.Put("/transfer", h.Repositories.Transfer)
						r.Put("/", h.Repositories.Update)
						r.Delete("/", h.Repositories.Delete)
					})
				})
			})
		})

		// Packages
		r.With(compress).Route("/packages", func(r chi.Router) {
			r.Get("/random", h.Packages.GetRandom)
			r.Get("/stats", h.Packages.GetStats)
			r.With(corsMW).Get("/search", h.Packages.Search)
			r.With(h.Users.RequireLogin).Get("/starred", h.Packages.GetStarredByUser)
			r.Route("/{^helm$|^falco$|^opa$|^olm|^tbaction|^krew|^helm-plugin|^tekton-task|^keda-scaler|^coredns|^keptn|^tekton-pipeline|^container|^kubewarden|^gatekeeper|^kyverno|^knative-client-plugin|^backstage|^argo-template|^kubearmor|^kcl|^headlamp|^inspektor-gadget|^tekton-stepaction|^meshery|^opencost|^radius$}/{repoName}/{packageName}", func(r chi.Router) {
				r.Get("/feed/rss", h.Packages.RssFeed)
				r.With(corsMW).Get("/summary", h.Packages.GetSummary)
				r.Get("/{version}", h.Packages.Get)
				r.Get("/changelog.md", h.Packages.GenerateChangelogMD)
				r.Route("/production-usage", func(r chi.Router) {
					r.Use(h.Users.RequireLogin)
					r.Get("/", h.Packages.GetProductionUsage)
					r.Post("/{orgName}", h.Packages.AddProductionUsage)
					r.Delete("/{orgName}", h.Packages.DeleteProductionUsage)
				})
				r.Get("/", h.Packages.Get)
			})
			r.Route("/{packageID}/stars", func(r chi.Router) {
				r.With(h.Users.InjectUserID).Get("/", h.Packages.GetStars)
				r.With(h.Users.RequireLogin).Put("/", h.Packages.ToggleStar)
			})
			r.Get("/{packageID}/{version}/security-report", h.Packages.GetSnapshotSecurityReport)
			r.Get("/{packageID}/{version}/values", h.Packages.GetChartValues)
			r.Get("/{packageID}/{version}/values-schema", h.Packages.GetValuesSchema)
			r.Get("/{packageID}/{version}/templates", h.Packages.GetChartTemplates)
			r.Post("/{packageID}/{version}/views", h.Packages.TrackView)
			r.Get("/{packageID}/views", h.Packages.GetViews)
			r.Get("/{packageID}/changelog", h.Packages.GetChangelog)
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

		// Stats
		r.With(compress).Get("/stats", h.Stats.Get)

		// Harbor replication
		//
		// This endpoint is used by the Harbor replication Artifact Hub adapter.
		// It returns some information about all packages versions of Helm kind
		// available so that they can be synchronized in Harbor deployments. It
		// will probably start being used in Harbor 2.2.0, so we need to be
		// careful to not introduce breaking changes.
		r.With(compress).Get("/harbor-replication", h.Packages.GetHarborReplicationDump)
		r.With(compress).Get("/harborReplication", h.Packages.GetHarborReplicationDump) // Deprecated

		// Helm exporter
		//
		// This endpoint is used by Helm exporter (*) to get the latest version
		// available of all charts listed in Artifact Hub.
		//
		// (*) https://github.com/sstarcher/helm-exporter
		r.With(compress).Get("/helm-exporter", h.Packages.GetHelmExporterDump)

		// Nova
		//
		// This endpoint is used by Fairwinds Nova (*) to get the all charts
		// listed on Artifact Hub.
		//
		// (*) https://github.com/FairwindsOps/nova
		r.With(compress).Get("/nova", h.Packages.GetNovaDump)
	})

	// Monocular compatible search API
	//
	// This endpoint provides a Monocular compatible search API that the Helm
	// CLI search subcommand can use. The goal is to facilitate the transition
	// from the Helm Hub to Artifact Hub, allowing the existing Helm tooling to
	// continue working without modifications. This is a temporary solution and
	// future Helm CLI versions should use the generic Artifact Hub search API.
	r.With(compress).Get("/api/chartsvc/v1/charts/search", h.Packages.SearchMonocular)

	// Monocular charts url redirect endpoint
	//
	// This endpoint is a helper related to the Monocular search one above. At
	// the moment Helm CLI builds charts urls coming from the Helm Hub using
	// this layout. This cannot be changed for previous versions out there, so
	// this endpoint handles the redirection to the package URL in Artifact Hub.
	// The monocular compatible search API endpoint that we provide now returns
	// the package url to facilitate that future versions of Helm can use it.
	r.Route("/charts/{repoName}/{packageName}", func(r chi.Router) {
		r.Get("/", func(w http.ResponseWriter, r *http.Request) {
			pkgPath := fmt.Sprintf("/packages/helm/%s/%s",
				chi.URLParam(r, "repoName"),
				chi.URLParam(r, "packageName"),
			)
			http.Redirect(w, r, pkgPath, http.StatusMovedPermanently)
		})
		r.Get("/{version}", func(w http.ResponseWriter, r *http.Request) {
			pkgPath := fmt.Sprintf("/packages/helm/%s/%s/%s",
				chi.URLParam(r, "repoName"),
				chi.URLParam(r, "packageName"),
				chi.URLParam(r, "version"),
			)
			http.Redirect(w, r, pkgPath, http.StatusMovedPermanently)
		})
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
		r.Route("/{^helm$|^falco$|^opa$|^olm|^tbaction|^krew|^helm-plugin|^tekton-task|^keda-scaler|^coredns|^keptn|^tekton-pipeline|^container|^kubewarden|^gatekeeper|^kyverno|^knative-client-plugin|^backstage|^argo-template|^kubearmor|^kcl|^headlamp|^inspektor-gadget|^tekton-stepaction|^meshery|^opencost|^radius$}/{repoName}/{packageName}", func(r chi.Router) {
			r.With(h.Packages.InjectIndexMeta).Get("/{version}", h.Static.Index)
			r.With(h.Packages.InjectIndexMeta).Get("/", h.Static.Index)
		})
	})

	// Badges
	r.Get("/badge/repository/{repoName}", h.Repositories.Badge)

	// Static files and index
	webBuildPath := h.cfg.GetString("server.webBuildPath")
	webStaticFilesPath := path.Join(webBuildPath, "static")
	widgetBuildPath := h.cfg.GetString("server.widgetBuildPath")
	docsFilesPath := path.Join(webBuildPath, "docs")
	static.FileServer(r, "/static", webStaticFilesPath, static.StaticCacheMaxAge)
	static.FileServer(r, "/docs", docsFilesPath, static.DocsCacheMaxAge)
	r.Get("/image/{image}", h.Static.Image)
	r.Get("/manifest.json", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", helpers.BuildCacheControlHeader(5*time.Minute))
		http.ServeFile(w, r, path.Join(webBuildPath, "manifest.json"))
	})
	r.Get("/artifacthub-widget.js", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", helpers.BuildCacheControlHeader(5*time.Minute))
		http.ServeFile(w, r, path.Join(widgetBuildPath, "static/js/artifacthub-widget.js"))
	})
	r.Get("/", h.Static.Index)

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

// csrfSkipper is an http middleware that skips CSRF checks for requests that
// match certain criteria.
func csrfSkipper(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Skip checks for requests authenticated using API keys
		if r.Header.Get(user.APIKeyIDHeader) != "" && r.Header.Get(user.APIKeySecretHeader) != "" {
			r = csrf.UnsafeSkipCheck(r)
		}
		// Skip checks for requests using GET or HEAD methods, except requests
		// to /api/v1/csrf, which is the endpoint used to get the token that
		// should be provided on subsequent POST, PUT or DELETE API requests.
		if (r.Method == "GET" && r.URL.Path != "/api/v1/csrf") || r.Method == "HEAD" {
			r = csrf.UnsafeSkipCheck(r)
		}
		next.ServeHTTP(w, r)
	})
}

// logger is an http middleware that logs some information about requests
// processed using zerolog.
func logger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		ww := middleware.NewWrapResponseWriter(w, r.ProtoMajor)
		host, port, _ := net.SplitHostPort(r.RemoteAddr)
		msg := r.URL.Path
		if r.URL.Path == "/api/v1/packages/search" || r.URL.Path == "/api/chartsvc/v1/charts/search" {
			msg += "?" + r.URL.RawQuery
		}
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
				Msg(msg)
		}()
		next.ServeHTTP(ww, r)
	})
}

// realIP is an http middleware that sets the request remote addr to the result
// of extracting the IP in the requested index from the X-Forwarded-For header.
// Positives indexes start by 0 and work like usual slice indexes. Negative
// indexes are allowed being -1 the last entry in the slice, -2 the next, etc.
func realIP(i int) func(next http.Handler) http.Handler {
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
