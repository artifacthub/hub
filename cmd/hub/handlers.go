package main

import (
	"crypto/subtle"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"path"
	"runtime/debug"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/cncf/hub/internal/hub"
	"github.com/cncf/hub/internal/img/pg"
	"github.com/google/uuid"
	svg "github.com/h2non/go-is-svg"
	"github.com/jackc/pgx/v4"
	"github.com/julienschmidt/httprouter"
	"github.com/rs/zerolog/hlog"
	"github.com/rs/zerolog/log"
	"github.com/spf13/viper"
)

const (
	staticCacheMaxAge     = 365 * 24 * time.Hour
	defaultAPICacheMaxAge = 15 * time.Minute
)

// handlers groups all the http handlers defined for the hub, including the
// router in charge of sending requests to the right handler.
type handlers struct {
	cfg        *viper.Viper
	hubApi     *hub.Hub
	imageStore *pg.ImageStore
	router     http.Handler

	mu          sync.RWMutex
	imagesCache map[string][]byte
}

// setupHandlers creates a new handlers instance.
func setupHandlers(cfg *viper.Viper, hubApi *hub.Hub, imageStore *pg.ImageStore) *handlers {
	h := &handlers{
		cfg:         cfg,
		hubApi:      hubApi,
		imageStore:  imageStore,
		imagesCache: make(map[string][]byte),
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
	r.GET("/api/v1/updates", h.getPackagesUpdates)
	r.GET("/api/v1/search", h.search)
	r.GET("/api/v1/package/:packageID", h.getPackage)
	r.GET("/api/v1/package/:packageID/:version", h.getPackageVersion)

	// Images
	r.GET("/image/:image", h.image)

	// Static files
	staticFilesPath := path.Join(h.cfg.GetString("server.webBuildPath"), "static")
	staticFilesServer := http.FileServer(http.Dir(staticFilesPath))
	r.GET("/static/*filepath", func(w http.ResponseWriter, req *http.Request, ps httprouter.Params) {
		w.Header().Set("Cache-Control", fmt.Sprintf("max-age=%d", int64(staticCacheMaxAge.Seconds())))
		req.URL.Path = ps.ByName("filepath")
		staticFilesServer.ServeHTTP(w, req)
	})
	r.NotFound = http.HandlerFunc(h.serveIndex)

	// Apply middleware
	h.router = accessHandler()(r)
	if h.cfg.GetBool("server.basicAuth.enabled") {
		h.router = h.basicAuth(h.router)
	}
}

// serveIndex is an http handler that serves the index.html file.
func (h *handlers) serveIndex(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Cache-Control", "no-store, no-cache, must-revalidate")
	http.ServeFile(w, r, path.Join(h.cfg.GetString("server.webBuildPath"), "index.html"))
}

// getStats is an http handler used to get some stats about packages registered
// in the hub database.
func (h *handlers) getStats(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	jsonData, err := h.hubApi.GetStatsJSON(r.Context())
	if err != nil {
		log.Error().Err(err).Msg("getStats failed")
		http.Error(w, "", http.StatusInternalServerError)
		return
	}
	renderJSON(w, jsonData, defaultAPICacheMaxAge)
}

// getPackagesUpdates is an http handler used to get the last packages updates
// in the hub database.
func (h *handlers) getPackagesUpdates(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	jsonData, err := h.hubApi.GetPackagesUpdatesJSON(r.Context())
	if err != nil {
		log.Error().Err(err).Msg("getPackagesUpdates failed")
		http.Error(w, "", http.StatusInternalServerError)
		return
	}
	renderJSON(w, jsonData, defaultAPICacheMaxAge)
}

// search is an http handler used to search for packages in the hub database.
func (h *handlers) search(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	query, err := buildQuery(r.URL.Query())
	if err != nil {
		log.Error().Err(err).Str("query", r.URL.RawQuery).Msg("invalid query")
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	jsonData, err := h.hubApi.SearchPackagesJSON(r.Context(), query)
	if err != nil {
		log.Error().Err(err).Str("query", r.URL.RawQuery).Msg("search failed")
		http.Error(w, "", http.StatusInternalServerError)
		return
	}
	renderJSON(w, jsonData, defaultAPICacheMaxAge)
}

// buildQuery builds a packages search query from a map of query string values,
// validating them as they are extracted.
func buildQuery(qs url.Values) (*hub.Query, error) {
	// Limit
	var limit int
	if qs.Get("limit") != "" {
		var err error
		limit, err = strconv.Atoi(qs.Get("limit"))
		if err != nil {
			return nil, fmt.Errorf("invalid limit: %s", qs.Get("limit"))
		}
	}

	// Offset
	var offset int
	if qs.Get("offset") != "" {
		var err error
		offset, err = strconv.Atoi(qs.Get("offset"))
		if err != nil {
			return nil, fmt.Errorf("invalid offset: %s", qs.Get("offset"))
		}
	}

	// Facets
	var facets bool
	if qs.Get("facets") != "" {
		var err error
		facets, err = strconv.ParseBool(qs.Get("facets"))
		if err != nil {
			return nil, fmt.Errorf("invalid facets: %s", qs.Get("facets"))
		}
	}

	// Text
	text := qs.Get("text")

	// Kinds
	var kinds []hub.PackageKind
	for _, kindStr := range qs["kind"] {
		kind, err := strconv.Atoi(kindStr)
		if err != nil {
			return nil, fmt.Errorf("invalid kind: %s", kindStr)
		}
		kinds = append(kinds, hub.PackageKind(kind))
	}

	// Repos
	repos := qs["repo"]
	for _, repo := range repos {
		if _, err := uuid.Parse(repo); err != nil {
			return nil, fmt.Errorf("invalid repo: %s", repo)
		}
	}

	return &hub.Query{
		Limit:                limit,
		Offset:               offset,
		Facets:               facets,
		Text:                 text,
		PackageKinds:         kinds,
		ChartRepositoriesIDs: repos,
	}, nil
}

// getPackage is an http handler used to get a package details.
func (h *handlers) getPackage(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	packageID := ps.ByName("packageID")
	jsonData, err := h.hubApi.GetPackageJSON(r.Context(), packageID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			http.NotFound(w, r)
		} else {
			log.Error().Err(err).Str("packageID", packageID).Msg("getPackage failed")
			http.Error(w, "", http.StatusInternalServerError)
		}
		return
	}
	renderJSON(w, jsonData, defaultAPICacheMaxAge)
}

// getPackageVersion is an http handler used to get the details of a package
// specific version.
func (h *handlers) getPackageVersion(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	packageID := ps.ByName("packageID")
	version := ps.ByName("version")
	jsonData, err := h.hubApi.GetPackageVersionJSON(r.Context(), packageID, version)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			http.NotFound(w, r)
		} else {
			log.Error().Err(err).
				Str("packageID", packageID).
				Str("version", version).
				Msg("getPackageVersion failed")
			http.Error(w, "", http.StatusInternalServerError)
		}
		return
	}
	renderJSON(w, jsonData, defaultAPICacheMaxAge)
}

// image in an http handler that serves images stored in the database.
func (h *handlers) image(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	// Extract image id and version
	image := ps.ByName("image")
	parts := strings.Split(image, "@")
	var imageID, version string
	if len(parts) == 2 {
		imageID = parts[0]
		version = parts[1]
	} else {
		imageID = image
	}

	// Check if image version data is cached
	h.mu.RLock()
	data, ok := h.imagesCache[image]
	h.mu.RUnlock()
	if !ok {
		// Get image data from database
		var err error
		data, err = h.imageStore.GetImage(r.Context(), imageID, version)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				http.NotFound(w, r)
			} else {
				log.Error().Err(err).Str("imageID", imageID).Send()
				http.Error(w, "", http.StatusInternalServerError)
			}
			return
		}

		// Save image data in cache
		h.mu.Lock()
		h.imagesCache[image] = data
		h.mu.Unlock()
	}

	// Set headers and write image data to response writer
	w.Header().Set("Cache-Control", "public, max-age=31536000")
	if svg.Is(data) {
		w.Header().Set("Content-Type", "image/svg+xml")
	} else {
		w.Header().Set("Content-Type", http.DetectContentType(data))
	}
	_, _ = w.Write(data)
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

// panicHandler is an http handler invoked when a panic occurs during a request.
func panicHandler(w http.ResponseWriter, r *http.Request, err interface{}) {
	log.Error().
		Str("method", r.Method).
		Str("url", r.URL.String()).
		Bytes("stacktrace", debug.Stack()).
		Msgf("%v", err)
	w.WriteHeader(http.StatusInternalServerError)
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
// response writer, setting the appropriate content type and cache
func renderJSON(w http.ResponseWriter, jsonData []byte, cacheMaxAge time.Duration) {
	w.Header().Set("Cache-Control", fmt.Sprintf("max-age=%d", int64(cacheMaxAge.Seconds())))
	w.Header().Set("Content-Type", "application/json")
	_, _ = w.Write(jsonData)
}
