package main

import (
	"context"
	"crypto/subtle"
	"encoding/json"
	"errors"
	"fmt"
	"net"
	"net/http"
	"net/url"
	"path"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/cncf/hub/internal/hub"
	"github.com/cncf/hub/internal/img/pg"
	"github.com/go-chi/chi"
	"github.com/go-chi/chi/middleware"
	"github.com/gorilla/securecookie"
	svg "github.com/h2non/go-is-svg"
	"github.com/ironstar-io/chizerolog"
	"github.com/jackc/pgx/v4"
	"github.com/rs/zerolog/log"
	"github.com/spf13/viper"
)

const (
	// Cache
	staticCacheMaxAge     = 365 * 24 * time.Hour
	defaultAPICacheMaxAge = 15 * time.Minute

	// Session
	sessionCookieName = "sid"
	sessionDuration   = 30 * 24 * time.Hour
)

// handlers groups all the http handlers defined for the hub, including the
// router in charge of sending requests to the right handler.
type handlers struct {
	cfg        *viper.Viper
	hubAPI     *hub.Hub
	imageStore *pg.ImageStore
	router     http.Handler
	sc         *securecookie.SecureCookie

	mu          sync.RWMutex
	imagesCache map[string][]byte
}

// setupHandlers creates a new handlers instance.
func setupHandlers(cfg *viper.Viper, hubAPI *hub.Hub, imageStore *pg.ImageStore) *handlers {
	sc := securecookie.New([]byte(cfg.GetString("server.cookie.hashKey")), nil)
	sc.MaxAge(int(sessionDuration.Seconds()))
	h := &handlers{
		cfg:         cfg,
		hubAPI:      hubAPI,
		imageStore:  imageStore,
		imagesCache: make(map[string][]byte),
		sc:          sc,
	}
	h.setupRouter()
	return h
}

// setupRouter initializes the handlers router, defining all routes used within
// the hub, as well as some essential middleware to handle panics, logging, etc.
func (h *handlers) setupRouter() {
	r := chi.NewRouter()

	// Setup middleware and special handlers
	r.Use(middleware.RealIP)
	r.Use(chizerolog.LoggerMiddleware(&log.Logger))
	r.Use(middleware.Recoverer)
	if h.cfg.GetBool("server.basicAuth.enabled") {
		r.Use(h.basicAuth)
	}
	r.NotFound(h.serveIndex)

	// API
	r.Route("/api/v1", func(r chi.Router) {
		r.Route("/package", func(r chi.Router) {
			r.Get("/stats", h.getPackagesStats)
			r.Get("/updates", h.getPackagesUpdates)
			r.Get("/search", h.searchPackages)
			r.Get("/chart/{repoName}/{packageName}", h.getPackage(hub.Chart))
			r.Get("/chart/{repoName}/{packageName}/{version}", h.getPackage(hub.Chart))
		})

		r.Route("/user", func(r chi.Router) {
			r.Post("/", h.registerUser)
			r.Post("/verifyEmail", h.verifyEmail)
			r.Post("/login", h.login)
			r.Get("/logout", h.logout)
		})

		r.Route("/admin", func(r chi.Router) {
			r.Use(h.requireLogin)
			r.Route("/chart", func(r chi.Router) {
				r.Get("/", h.getChartRepositories)
				r.Post("/", h.addChartRepository)
				r.Put("/{repoName}", h.updateChartRepository)
				r.Delete("/{repoName}", h.deleteChartRepository)
			})
		})
	})

	// Images
	r.Get("/image/{image}", h.image)

	// Static files and index
	staticFilesPath := path.Join(h.cfg.GetString("server.webBuildPath"), "static")
	fileServer(r, "/static", http.Dir(staticFilesPath))
	r.Get("/", h.serveIndex)

	h.router = r
}

// serveIndex is an http handler that serves the index.html file.
func (h *handlers) serveIndex(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Cache-Control", "no-store, no-cache, must-revalidate")
	http.ServeFile(w, r, path.Join(h.cfg.GetString("server.webBuildPath"), "index.html"))
}

// getPackagesStats is an http handler used to get some stats about packages
// registered in the hub database.
func (h *handlers) getPackagesStats(w http.ResponseWriter, r *http.Request) {
	jsonData, err := h.hubAPI.GetPackagesStatsJSON(r.Context())
	if err != nil {
		log.Error().Err(err).Msg("getStats failed")
		http.Error(w, "", http.StatusInternalServerError)
		return
	}
	renderJSON(w, jsonData, defaultAPICacheMaxAge)
}

// getPackagesUpdates is an http handler used to get the last packages updates
// in the hub database.
func (h *handlers) getPackagesUpdates(w http.ResponseWriter, r *http.Request) {
	jsonData, err := h.hubAPI.GetPackagesUpdatesJSON(r.Context())
	if err != nil {
		log.Error().Err(err).Msg("getPackagesUpdates failed")
		http.Error(w, "", http.StatusInternalServerError)
		return
	}
	renderJSON(w, jsonData, defaultAPICacheMaxAge)
}

// searchPackages is an http handler used to searchPackages for packages in the
// hub database.
func (h *handlers) searchPackages(w http.ResponseWriter, r *http.Request) {
	input, err := buildSearchPackageInput(r.URL.Query())
	if err != nil {
		log.Error().Err(err).Str("query", r.URL.RawQuery).Msg("invalid query")
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	jsonData, err := h.hubAPI.SearchPackagesJSON(r.Context(), input)
	if err != nil {
		log.Error().Err(err).Str("query", r.URL.RawQuery).Msg("search failed")
		http.Error(w, "", http.StatusInternalServerError)
		return
	}
	renderJSON(w, jsonData, defaultAPICacheMaxAge)
}

// buildSearchPackageInput builds a packages search query from a map of query
// string values, validating them as they are extracted.
func buildSearchPackageInput(qs url.Values) (*hub.SearchPackageInput, error) {
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
	kinds := make([]hub.PackageKind, 0, len(qs["kind"]))
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
		if repo == "" {
			return nil, fmt.Errorf("invalid repo: %s", repo)
		}
	}

	return &hub.SearchPackageInput{
		Limit:             limit,
		Offset:            offset,
		Facets:            facets,
		Text:              text,
		PackageKinds:      kinds,
		ChartRepositories: repos,
	}, nil
}

// getPackage is an http handler used to get a package details.
func (h *handlers) getPackage(kind hub.PackageKind) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		input := &hub.GetPackageInput{
			Kind:                kind,
			ChartRepositoryName: chi.URLParam(r, "repoName"),
			PackageName:         chi.URLParam(r, "packageName"),
			Version:             chi.URLParam(r, "version"),
		}
		jsonData, err := h.hubAPI.GetPackageJSON(r.Context(), input)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				http.NotFound(w, r)
			} else {
				log.Error().Err(err).Interface("input", input).Msg("getPackage failed")
				http.Error(w, "", http.StatusInternalServerError)
			}
			return
		}
		renderJSON(w, jsonData, defaultAPICacheMaxAge)
	}
}

// registerUser is an http handler used to register a user in the hub database.
func (h *handlers) registerUser(w http.ResponseWriter, r *http.Request) {
	user := &hub.User{}
	err := json.NewDecoder(r.Body).Decode(&user)
	if err != nil {
		log.Error().Err(err).Msg("invalid user")
		http.Error(w, "user provided is not valid", http.StatusBadRequest)
		return
	}
	if err := validateUser(user); err != nil {
		log.Error().Err(err).Msg("invalid user")
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	scheme := "http"
	if r.TLS != nil {
		scheme = "https"
	}
	baseURL := fmt.Sprintf("%s://%s", scheme, r.Host)
	err = h.hubAPI.RegisterUser(r.Context(), user, baseURL)
	if err != nil {
		log.Error().Err(err).Msg("registerUser failed")
		http.Error(w, "", http.StatusInternalServerError)
		return
	}
}

// validateUser validates a user instance before we attempt to register it in
// the database.
func validateUser(user *hub.User) error {
	if user.Alias == "" {
		return fmt.Errorf("alias not provided")
	}
	if user.Email == "" {
		return fmt.Errorf("email not provided")
	}
	if user.Password == "" {
		return fmt.Errorf("password not provided")
	}
	return nil
}

// verifyEmail is an http handler used to verify a user's email address.
func (h *handlers) verifyEmail(w http.ResponseWriter, r *http.Request) {
	code := r.FormValue("code")
	if code == "" {
		errMsg := "email verification code not provided"
		log.Error().Msg(errMsg)
		http.Error(w, errMsg, http.StatusBadRequest)
		return
	}
	verified, err := h.hubAPI.VerifyEmail(r.Context(), code)
	if err != nil {
		log.Error().Err(err).Msg("verifyEmail failed")
		http.Error(w, "", http.StatusInternalServerError)
		return
	}
	if !verified {
		w.WriteHeader(http.StatusGone)
	}
}

// login is an http handler used to log a user in.
func (h *handlers) login(w http.ResponseWriter, r *http.Request) {
	// Extract credentials from request
	email := r.FormValue("email")
	password := r.FormValue("password")
	if email == "" || password == "" {
		errMsg := "credentials not provided"
		log.Error().Msg(errMsg)
		http.Error(w, errMsg, http.StatusBadRequest)
		return
	}

	// Check if the credentials provided are valid
	checkCredentialsOutput, err := h.hubAPI.CheckCredentials(r.Context(), email, password)
	if err != nil {
		log.Error().Err(err).Msg("checkCredentials failed")
		http.Error(w, "", http.StatusInternalServerError)
		return
	}
	if !checkCredentialsOutput.Valid {
		w.WriteHeader(http.StatusUnauthorized)
		return
	}

	// Register user session
	ip, _, _ := net.SplitHostPort(r.RemoteAddr)
	session := &hub.Session{
		UserID:    checkCredentialsOutput.UserID,
		IP:        ip,
		UserAgent: r.UserAgent(),
	}
	sessionID, err := h.hubAPI.RegisterSession(r.Context(), session)
	if err != nil {
		log.Error().Err(err).Msg("registerSession failed")
		http.Error(w, "", http.StatusInternalServerError)
		return
	}

	// Generate and set session cookie
	encodedSessionID, err := h.sc.Encode(sessionCookieName, sessionID)
	if err != nil {
		log.Error().Err(err).Msg("sessionID encoding failed")
		http.Error(w, "", http.StatusInternalServerError)
		return
	}
	cookie := &http.Cookie{
		Name:     sessionCookieName,
		Value:    encodedSessionID,
		Path:     "/",
		Expires:  time.Now().Add(sessionDuration),
		HttpOnly: true,
	}
	if h.cfg.GetBool("server.cookie.secure") {
		cookie.Secure = true
	}
	http.SetCookie(w, cookie)
}

// logout is an http handler used to log a user out.
func (h *handlers) logout(w http.ResponseWriter, r *http.Request) {
	// Delete user session
	cookie, err := r.Cookie(sessionCookieName)
	if err == nil {
		var sessionID []byte
		err = h.sc.Decode(sessionCookieName, cookie.Value, &sessionID)
		if err == nil {
			err = h.hubAPI.DeleteSession(r.Context(), sessionID)
			if err != nil {
				log.Error().Err(err).Msg("deleteSession failed")
			}
		}
	}

	// Request browser to delete session cookie
	cookie = &http.Cookie{
		Name:    sessionCookieName,
		Expires: time.Now().Add(-24 * time.Hour),
	}
	http.SetCookie(w, cookie)
}

// getChartRepositories is an http handler that returns the chart repositories
// owned by the user doing the request.
func (h *handlers) getChartRepositories(w http.ResponseWriter, r *http.Request) {
	jsonData, err := h.hubAPI.GetChartRepositoriesByUserJSON(r.Context())
	if err != nil {
		log.Error().Err(err).Msg("getChartRepositories failed")
		http.Error(w, "", http.StatusInternalServerError)
		return
	}
	renderJSON(w, jsonData, defaultAPICacheMaxAge)
}

// addChartRepository is an http handler that adds the provided chart
// repository to the database.
func (h *handlers) addChartRepository(w http.ResponseWriter, r *http.Request) {
	repo := &hub.ChartRepository{}
	if err := json.NewDecoder(r.Body).Decode(&repo); err != nil {
		log.Error().Err(err).Msg("invalid chart repository")
		http.Error(w, "chart repository provided is not valid", http.StatusBadRequest)
		return
	}
	if repo.Name == "" || repo.URL == "" {
		http.Error(w, "chart repository name and url must be provided", http.StatusBadRequest)
		return
	}
	if err := h.hubAPI.AddChartRepository(r.Context(), repo); err != nil {
		log.Error().Err(err).Msg("addChartRepository failed")
		http.Error(w, "", http.StatusInternalServerError)
		return
	}
}

// updateChartRepository is an http handler that updates the provided chart
// repository in the database.
func (h *handlers) updateChartRepository(w http.ResponseWriter, r *http.Request) {
	repo := &hub.ChartRepository{}
	if err := json.NewDecoder(r.Body).Decode(&repo); err != nil {
		log.Error().Err(err).Msg("invalid chart repository")
		http.Error(w, "chart repository provided is not valid", http.StatusBadRequest)
		return
	}
	repo.Name = chi.URLParam(r, "repoName")
	if err := h.hubAPI.UpdateChartRepository(r.Context(), repo); err != nil {
		log.Error().Err(err).Msg("updateChartRepository failed")
		http.Error(w, "", http.StatusInternalServerError)
		return
	}
}

// deleteChartRepository is an http handler that deletes the provided chart
// repository from the database.
func (h *handlers) deleteChartRepository(w http.ResponseWriter, r *http.Request) {
	repo := &hub.ChartRepository{
		Name: chi.URLParam(r, "repoName"),
	}
	if err := h.hubAPI.DeleteChartRepository(r.Context(), repo); err != nil {
		log.Error().Err(err).Msg("deleteChartRepository failed")
		http.Error(w, "", http.StatusInternalServerError)
		return
	}
}

// requireLogin is a middleware that verifies if a user is logged in.
func (h *handlers) requireLogin(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Extract and validate cookie from request
		cookie, err := r.Cookie(sessionCookieName)
		if err != nil {
			http.Error(w, "", http.StatusUnauthorized)
			return
		}
		var sessionID []byte
		if err = h.sc.Decode(sessionCookieName, cookie.Value, &sessionID); err != nil {
			log.Error().Err(err).Msg("sessionID decoding failed")
			http.Error(w, "", http.StatusUnauthorized)
			return
		}

		// Check the session provided is valid
		checkSessionOutput, err := h.hubAPI.CheckSession(r.Context(), sessionID, sessionDuration)
		if err != nil {
			log.Error().Err(err).Msg("checkSession failed")
			http.Error(w, "", http.StatusInternalServerError)
			return
		}
		if !checkSessionOutput.Valid {
			w.WriteHeader(http.StatusUnauthorized)
			return
		}

		// Inject userID in context and call next handler
		ctx := context.WithValue(r.Context(), hub.UserIDKey, checkSessionOutput.UserID)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// image in an http handler that serves images stored in the database.
func (h *handlers) image(w http.ResponseWriter, r *http.Request) {
	// Extract image id and version
	image := chi.URLParam(r, "image")
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
	validUser := []byte(h.cfg.GetString("server.basicAuth.username"))
	validPass := []byte(h.cfg.GetString("server.basicAuth.password"))
	realm := "Hub"

	areCredentialsValid := func(user, pass []byte) bool {
		if subtle.ConstantTimeCompare(user, validUser) != 1 {
			return false
		}
		if subtle.ConstantTimeCompare(pass, validPass) != 1 {
			return false
		}
		return true
	}

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		user, pass, ok := r.BasicAuth()
		if !ok || !areCredentialsValid([]byte(user), []byte(pass)) {
			w.Header().Set("WWW-Authenticate", "Basic realm="+realm+`"`)
			w.WriteHeader(http.StatusUnauthorized)
			_, _ = w.Write([]byte("Unauthorized\n"))
			return
		}
		next.ServeHTTP(w, r)
	})
}

// renderJSON is a helper to write the json data provided to the given http
// response writer, setting the appropriate content type and cache
func renderJSON(w http.ResponseWriter, jsonData []byte, cacheMaxAge time.Duration) {
	w.Header().Set("Cache-Control", fmt.Sprintf("max-age=%d", int64(cacheMaxAge.Seconds())))
	w.Header().Set("Content-Type", "application/json")
	_, _ = w.Write(jsonData)
}

// fileServer sets up a http.FileServer handler to serve static files from a
// a http.FileSystem.
func fileServer(r chi.Router, path string, fs http.FileSystem) {
	fsHandler := http.StripPrefix(path, http.FileServer(fs))

	if path != "/" && path[len(path)-1] != '/' {
		r.Get(path, http.RedirectHandler(path+"/", 301).ServeHTTP)
		path += "/"
	}
	path += "*"

	r.Get(path, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", fmt.Sprintf("max-age=%d", int64(staticCacheMaxAge.Seconds())))
		fsHandler.ServeHTTP(w, r)
	}))
}
