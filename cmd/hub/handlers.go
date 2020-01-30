package main

import (
	"crypto/subtle"
	"errors"
	"net/http"
	"path"
	"runtime/debug"
	"time"

	"github.com/jackc/pgx/v4"
	"github.com/julienschmidt/httprouter"
	"github.com/rs/zerolog/hlog"
	"github.com/rs/zerolog/log"
	"github.com/spf13/viper"
	"github.com/tegioz/hub/internal/hub"
)

// handlers groups all the http handlers defined for the hub, including the
// router in charge of sending requests to the right handler.
type handlers struct {
	cfg    *viper.Viper
	hubApi *hub.Hub
	router http.Handler
}

// setupHandlers creates a new handlers instance.
func setupHandlers(cfg *viper.Viper, hubApi *hub.Hub) *handlers {
	h := &handlers{
		cfg:    cfg,
		hubApi: hubApi,
	}
	h.setupRouter()
	return h
}

// setupRouter initializes the handlers router, defining all routes used within
// the hub, as well as some essential middleware to handle panics, logging, etc.
func (h *handlers) setupRouter() {
	r := httprouter.New()

	// Recover panics from http handlers
	r.PanicHandler = panicHandler

	// API
	r.GET("/api/v1/stats", h.getStats)
	r.GET("/api/v1/search", h.search)
	r.GET("/api/v1/package/:package_id", h.getPackage)
	r.GET("/api/v1/package/:package_id/:version", h.getPackageVersion)

	// Static files
	staticFilesPath := path.Join(h.cfg.GetString("server.webBuildPath"), "static")
	r.ServeFiles("/static/*filepath", http.Dir(staticFilesPath))
	r.NotFound = http.HandlerFunc(h.serveIndex)

	// Apply middleware
	h.router = accessHandler()(r)
	if h.cfg.GetBool("server.basicAuth.enabled") {
		h.router = h.basicAuth(h.router)
	}
}

// getStats is an http handler used to get some stats about packages registered
// in the hub database.
func (h *handlers) getStats(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	jsonData, err := h.hubApi.GetStatsJSON(r.Context())
	if err != nil {
		log.Error().Err(err).Msg("getStats failed")
		http.Error(w, "", http.StatusInternalServerError)
	}
	renderJSON(w, jsonData)
}

// search is an http handler used to search for packages in the hub database.
func (h *handlers) search(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	query := &hub.Query{
		Text: r.FormValue("q"),
	}
	jsonData, err := h.hubApi.SearchPackagesJSON(r.Context(), query)
	if err != nil {
		log.Error().Err(err).Str("query", query.Text).Msg("search failed")
		http.Error(w, "", http.StatusInternalServerError)
	}
	renderJSON(w, jsonData)
}

// getPackage is an http handler used to get a package details.
func (h *handlers) getPackage(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	packageID := ps.ByName("package_id")
	jsonData, err := h.hubApi.GetPackageJSON(r.Context(), packageID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			http.Error(w, "", http.StatusNotFound)
		} else {
			log.Error().Err(err).Str("packageID", packageID).Msg("getPackage failed")
			http.Error(w, "", http.StatusInternalServerError)
		}
	}
	renderJSON(w, jsonData)
}

// getPackageVersion is an http handler used to get the details of a package
// specific version.
func (h *handlers) getPackageVersion(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	packageID := ps.ByName("package_id")
	version := ps.ByName("version")
	jsonData, err := h.hubApi.GetPackageVersionJSON(r.Context(), packageID, version)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			http.Error(w, "", http.StatusNotFound)
		} else {
			log.Error().Err(err).
				Str("packageID", packageID).
				Str("version", version).
				Msg("getPackageVersion failed")
			http.Error(w, "", http.StatusInternalServerError)
		}
	}
	renderJSON(w, jsonData)
}

// serveIndex is an http handler that serves the index.html file.
func (h *handlers) serveIndex(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Cache-Control", "no-store, no-cache, must-revalidate")
	http.ServeFile(w, r, path.Join(h.cfg.GetString("server.webBuildPath"), "index.html"))
}

// serveFile is an http handler that serves the file provided.
func (h *handlers) serveFile(name string) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, path.Join(h.cfg.GetString("server.webBuildPath"), name))
	})
}

// panicHandler is an http handler invoked when a panic occurs during a request.
func panicHandler(w http.ResponseWriter, r *http.Request, err interface{}) {
	log.Error().
		Str("method", r.Method).
		Str("url", r.URL.String()).
		Bytes("stacktrace", debug.Stack()).
		Msgf("%v", err)
	w.WriteHeader(http.StatusInternalServerError)
}

// basicAuth is a middleware that provides basic auth support.
func (h *handlers) basicAuth(next http.Handler) http.Handler {
	username := h.cfg.GetString("server.basicAuth.username")
	password := h.cfg.GetString("server.basicAuth.password")
	realm := "Hub"

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		user, pass, ok := r.BasicAuth()
		if !ok || subtle.ConstantTimeCompare([]byte(user), []byte(username)) != 1 || subtle.ConstantTimeCompare([]byte(pass), []byte(password)) != 1 {
			w.Header().Set("WWW-Authenticate", "Basic realm="+realm+`"`)
			w.WriteHeader(401)
			_, _ = w.Write([]byte("Unauthorized\n"))
			return
		}
		next.ServeHTTP(w, r)
	})
}

// accessHandler is a middleware invoked for each request. At the moment it is
// only used to log requests.
func accessHandler() func(http.Handler) http.Handler {
	return hlog.AccessHandler(func(r *http.Request, status, size int, duration time.Duration) {
		log.Debug().
			Str("method", r.Method).
			Str("url", r.URL.String()).
			Int("status", status).
			Int("size", size).
			Float64("duration", duration.Seconds()).
			Msg("request processed")
	})
}

// renderJSON is a helper to write the json data provided to the given http
// response writer, setting the appropriate content type.
func renderJSON(w http.ResponseWriter, jsonData []byte) {
	w.Header().Set("Content-Type", "application/json")
	_, _ = w.Write(jsonData)
}
