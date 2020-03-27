package handlers

import (
	"net/http"
	"path"

	"github.com/artifacthub/hub/cmd/hub/handlers/chartrepo"
	"github.com/artifacthub/hub/cmd/hub/handlers/org"
	"github.com/artifacthub/hub/cmd/hub/handlers/pkg"
	"github.com/artifacthub/hub/cmd/hub/handlers/static"
	"github.com/artifacthub/hub/cmd/hub/handlers/user"
	"github.com/artifacthub/hub/internal/api"
	"github.com/artifacthub/hub/internal/img/pg"
	"github.com/go-chi/chi"
	"github.com/go-chi/chi/middleware"
	"github.com/ironstar-io/chizerolog"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
	"github.com/spf13/viper"
)

// Handlers groups all the http handlers defined for the hub, including the
// router in charge of sending requests to the right handler.
type Handlers struct {
	cfg    *viper.Viper
	hubAPI *api.API
	logger zerolog.Logger
	Router http.Handler

	Organizations     *org.Handlers
	User              *user.Handlers
	Packages          *pkg.Handlers
	ChartRepositories *chartrepo.Handlers
	Static            *static.Handlers
}

// Setup creates a new Handlers instance.
func Setup(cfg *viper.Viper, hubAPI *api.API, imageStore *pg.ImageStore) *Handlers {
	h := &Handlers{
		cfg:    cfg,
		hubAPI: hubAPI,
		logger: log.With().Str("handlers", "root").Logger(),

		Organizations:     org.NewHandlers(hubAPI),
		User:              user.NewHandlers(hubAPI, cfg),
		Packages:          pkg.NewHandlers(hubAPI),
		ChartRepositories: chartrepo.NewHandlers(hubAPI),
		Static:            static.NewHandlers(cfg, imageStore),
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
	r.Use(chizerolog.LoggerMiddleware(&log.Logger))
	r.Use(middleware.Recoverer)
	if h.cfg.GetBool("server.basicAuth.enabled") {
		r.Use(h.User.BasicAuth)
	}
	r.NotFound(h.Static.ServeIndex)

	// API
	r.Route("/api/v1", func(r chi.Router) {
		r.Route("/packages", func(r chi.Router) {
			r.Get("/stats", h.Packages.GetStats)
			r.Get("/updates", h.Packages.GetUpdates)
			r.Get("/search", h.Packages.Search)
		})
		r.Route("/package", func(r chi.Router) {
			r.Route("/chart/{repoName}/{packageName}", func(r chi.Router) {
				r.Get("/{version}", h.Packages.Get)
				r.Get("/", h.Packages.Get)
			})
			r.Route("/{packageName}", func(r chi.Router) {
				r.Get("/{version}", h.Packages.Get)
				r.Get("/", h.Packages.Get)
			})
		})
		r.Post("/users", h.User.RegisterUser)
		r.Route("/user", func(r chi.Router) {
			r.Use(h.User.RequireLogin)
			r.Get("/alias", h.User.GetAlias)
			r.Get("/orgs", h.Organizations.GetByUser)
			r.Route("/chart-repositories", func(r chi.Router) {
				r.Get("/", h.ChartRepositories.GetOwnedByUser)
				r.Post("/", h.ChartRepositories.Add)
			})
			r.Route("/chart-repository/{repoName}", func(r chi.Router) {
				r.Put("/", h.ChartRepositories.Update)
				r.Delete("/", h.ChartRepositories.Delete)
			})
		})
		r.With(h.User.RequireLogin).Post("/orgs", h.Organizations.Add)
		r.Route("/org/{orgName}", func(r chi.Router) {
			r.Use(h.User.RequireLogin)
			r.Get("/", h.Organizations.Get)
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
		r.Post("/verify-email", h.User.VerifyEmail)
		r.Post("/login", h.User.Login)
		r.With(h.User.RequireLogin).Get("/logout", h.User.Logout)
		r.Head("/check-availability/{resourceKind}", h.CheckAvailability)
	})

	// Images
	r.Get("/image/{image}", h.Static.Image)

	// Static files and index
	staticFilesPath := path.Join(h.cfg.GetString("server.webBuildPath"), "static")
	static.FileServer(r, "/static", http.Dir(staticFilesPath))
	r.Get("/", h.Static.ServeIndex)

	h.Router = r
}

// CheckAvailability is a middleware that checks the availability of a given
// value for the provided resource kind.
func (h *Handlers) CheckAvailability(w http.ResponseWriter, r *http.Request) {
	resourceKind := chi.URLParam(r, "resourceKind")
	value := r.FormValue("v")

	// Check if resource kind and value received are valid
	validResourceKinds := []string{
		"userAlias",
		"chartRepositoryName",
		"chartRepositoryURL",
		"organizationName",
	}
	isResourceKindValid := func(resourceKind string) bool {
		for _, k := range validResourceKinds {
			if resourceKind == k {
				return true
			}
		}
		return false
	}
	if !isResourceKindValid(resourceKind) {
		http.Error(w, "invalid resource kind provided", http.StatusBadRequest)
		return
	}
	if value == "" {
		http.Error(w, "invalid value provided", http.StatusBadRequest)
		return
	}

	// Check availability in database
	available, err := h.hubAPI.CheckAvailability(r.Context(), resourceKind, value)
	if err != nil {
		h.logger.Error().Err(err).Str("method", "CheckAvailability").Send()
		http.Error(w, "", http.StatusInternalServerError)
		return
	}
	if available {
		w.WriteHeader(http.StatusNotFound)
	}
}
