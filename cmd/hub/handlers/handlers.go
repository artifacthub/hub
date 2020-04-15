package handlers

import (
	"fmt"
	"net"
	"net/http"
	"path"
	"strings"
	"time"

	"github.com/artifacthub/hub/cmd/hub/handlers/chartrepo"
	"github.com/artifacthub/hub/cmd/hub/handlers/org"
	"github.com/artifacthub/hub/cmd/hub/handlers/pkg"
	"github.com/artifacthub/hub/cmd/hub/handlers/static"
	"github.com/artifacthub/hub/cmd/hub/handlers/user"
	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/img"
	"github.com/go-chi/chi"
	"github.com/go-chi/chi/middleware"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
	"github.com/spf13/viper"
)

// Services is a wrapper around several internal services used by the handlers.
type Services struct {
	OrganizationManager    hub.OrganizationManager
	UserManager            hub.UserManager
	PackageManager         hub.PackageManager
	ChartRepositoryManager hub.ChartRepositoryManager
	ImageStore             img.Store
}

// Metrics groups some metrics collected from a Handlers instance.
type Metrics struct {
	requests *prometheus.CounterVec
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

	Organizations     *org.Handlers
	Users             *user.Handlers
	Packages          *pkg.Handlers
	ChartRepositories *chartrepo.Handlers
	Static            *static.Handlers
}

// Setup creates a new Handlers instance.
func Setup(cfg *viper.Viper, svc *Services) *Handlers {
	h := &Handlers{
		cfg:     cfg,
		svc:     svc,
		metrics: setupMetrics(),
		logger:  log.With().Str("handlers", "root").Logger(),

		Organizations:     org.NewHandlers(svc.OrganizationManager),
		Users:             user.NewHandlers(svc.UserManager, cfg),
		Packages:          pkg.NewHandlers(svc.PackageManager),
		ChartRepositories: chartrepo.NewHandlers(svc.ChartRepositoryManager),
		Static:            static.NewHandlers(cfg, svc.ImageStore),
	}
	h.setupRouter()
	return h
}

// setupMetrics creates and registers some metrics
func setupMetrics() *Metrics {
	// Number of requests
	requests := prometheus.NewCounterVec(prometheus.CounterOpts{
		Name: "http_requests_total",
		Help: "Number of http requests processed.",
	},
		[]string{"status", "method", "path"},
	)
	prometheus.MustRegister(requests)

	// Requests duration
	duration := prometheus.NewHistogramVec(prometheus.HistogramOpts{
		Name: "http_request_duration",
		Help: "Duration of the http requests processed.",
	},
		[]string{"status", "method", "path"},
	)
	prometheus.MustRegister(duration)

	return &Metrics{
		requests: requests,
		duration: duration,
	}
}

// setupRouter initializes the handlers router, defining all routes used within
// the hub, as well as some essential middleware to handle panics, logging, etc.
func (h *Handlers) setupRouter() {
	r := chi.NewRouter()

	// Setup middleware and special handlers
	r.Use(h.MetricsCollector)
	r.Use(middleware.RealIP)
	r.Use(Logger)
	r.Use(middleware.Recoverer)
	if h.cfg.GetBool("server.basicAuth.enabled") {
		r.Use(h.Users.BasicAuth)
	}
	r.NotFound(h.Static.ServeIndex)

	// API
	r.Route("/api/v1", func(r chi.Router) {
		r.Route("/packages", func(r chi.Router) {
			r.Get("/stats", h.Packages.GetStats)
			r.Get("/updates", h.Packages.GetUpdates)
			r.Get("/search", h.Packages.Search)
			r.With(h.Users.RequireLogin).Get("/starred", h.Packages.GetStarredByUser)
		})
		r.Route("/package", func(r chi.Router) {
			r.Route("/chart/{repoName}/{packageName}", func(r chi.Router) {
				r.Use(h.Users.InjectUserID)
				r.Get("/{version}", h.Packages.Get)
				r.Get("/", h.Packages.Get)
			})
			r.Route("/{^falco$|^opa$}/{packageName}", func(r chi.Router) {
				r.Use(h.Users.InjectUserID)
				r.Get("/{version}", h.Packages.Get)
				r.Get("/", h.Packages.Get)
			})
			r.Route("/{packageID}", func(r chi.Router) {
				r.With(h.Users.RequireLogin).Put("/", h.Packages.ToggleStar)
			})
		})
		r.Post("/users", h.Users.RegisterUser)
		r.Route("/user", func(r chi.Router) {
			r.Use(h.Users.RequireLogin)
			r.Get("/", h.Users.GetProfile)
			r.Get("/orgs", h.Organizations.GetByUser)
			r.Put("/password", h.Users.UpdatePassword)
			r.Put("/profile", h.Users.UpdateProfile)
			r.Route("/chart-repositories", func(r chi.Router) {
				r.Get("/", h.ChartRepositories.GetOwnedByUser)
				r.Post("/", h.ChartRepositories.Add)
			})
			r.Route("/chart-repository/{repoName}", func(r chi.Router) {
				r.Put("/", h.ChartRepositories.Update)
				r.Delete("/", h.ChartRepositories.Delete)
			})
		})
		r.With(h.Users.RequireLogin).Post("/orgs", h.Organizations.Add)
		r.Route("/org/{orgName}", func(r chi.Router) {
			r.Get("/", h.Organizations.Get)
			r.Group(func(r chi.Router) {
				r.Use(h.Users.RequireLogin)
				r.Put("/", h.Organizations.Update)
				r.Get("/accept-invitation", h.Organizations.ConfirmMembership)
				r.Get("/members", h.Organizations.GetMembers)
				r.Route("/member/{userAlias}", func(r chi.Router) {
					r.Post("/", h.Organizations.AddMember)
					r.Delete("/", h.Organizations.DeleteMember)
				})
				r.Route("/chart-repositories", func(r chi.Router) {
					r.Get("/", h.ChartRepositories.GetOwnedByOrg)
					r.Post("/", h.ChartRepositories.Add)
				})
				r.Route("/chart-repository/{repoName}", func(r chi.Router) {
					r.Put("/", h.ChartRepositories.Update)
					r.Delete("/", h.ChartRepositories.Delete)
				})
			})
		})
		r.Route("/check-availability", func(r chi.Router) {
			r.Head("/{resourceKind:^chartRepositoryName$|^chartRepositoryURL$}", h.ChartRepositories.CheckAvailability)
			r.Head("/{resourceKind:^organizationName$}", h.Organizations.CheckAvailability)
			r.Head("/{resourceKind:^userAlias$}", h.Users.CheckAvailability)
		})
		r.Post("/verify-email", h.Users.VerifyEmail)
		r.Post("/login", h.Users.Login)
		r.With(h.Users.RequireLogin).Get("/logout", h.Users.Logout)
		r.With(h.Users.RequireLogin).Post("/images", h.Static.SaveImage)
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

	// Static files and index
	staticFilesPath := path.Join(h.cfg.GetString("server.webBuildPath"), "static")
	static.FileServer(r, "/static", http.Dir(staticFilesPath))
	r.Get("/image/{image}", h.Static.Image)
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
			h.metrics.requests.WithLabelValues(
				http.StatusText(ww.Status()),
				r.Method,
				rctx.RoutePattern(),
			).Inc()
			h.metrics.duration.WithLabelValues(
				http.StatusText(ww.Status()),
				r.Method,
				rctx.RoutePattern(),
			).Observe(time.Since(start).Seconds())
		}()
		next.ServeHTTP(ww, r)
	})
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
