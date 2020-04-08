package handlers

import (
	"net"
	"net/http"
	"path"
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

// Handlers groups all the http handlers defined for the hub, including the
// router in charge of sending requests to the right handler.
type Handlers struct {
	cfg    *viper.Viper
	svc    *Services
	logger zerolog.Logger
	Router http.Handler

	Organizations     *org.Handlers
	Users             *user.Handlers
	Packages          *pkg.Handlers
	ChartRepositories *chartrepo.Handlers
	Static            *static.Handlers
}

// Setup creates a new Handlers instance.
func Setup(cfg *viper.Viper, svc *Services) *Handlers {
	h := &Handlers{
		cfg:    cfg,
		svc:    svc,
		logger: log.With().Str("handlers", "root").Logger(),

		Organizations:     org.NewHandlers(svc.OrganizationManager),
		Users:             user.NewHandlers(svc.UserManager, cfg),
		Packages:          pkg.NewHandlers(svc.PackageManager),
		ChartRepositories: chartrepo.NewHandlers(svc.ChartRepositoryManager),
		Static:            static.NewHandlers(cfg, svc.ImageStore),
	}
	h.setupRouter()
	return h
}

// setupRouter initializes the handlers router, defining all routes used within
// the hub, as well as some essential middleware to handle panics, logging, etc.
func (h *Handlers) setupRouter() {
	r := chi.NewRouter()

	// Setup middleware and special handlers
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
		r.Post("/verify-email", h.Users.VerifyEmail)
		r.Post("/login", h.Users.Login)
		r.With(h.Users.RequireLogin).Get("/logout", h.Users.Logout)
		r.Head("/check-availability/{resourceKind}", h.ChartRepositories.CheckAvailability)
		r.With(h.Users.RequireLogin).Post("/images", h.Static.SaveImage)
	})

	// Static files and index
	staticFilesPath := path.Join(h.cfg.GetString("server.webBuildPath"), "static")
	static.FileServer(r, "/static", http.Dir(staticFilesPath))
	r.Get("/image/{image}", h.Static.Image)
	r.Get("/", h.Static.ServeIndex)

	h.Router = r
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
