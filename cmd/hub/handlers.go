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
	"runtime/debug"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/cncf/hub/internal/hub"
	"github.com/cncf/hub/internal/img/pg"
	"github.com/gorilla/securecookie"
	svg "github.com/h2non/go-is-svg"
	"github.com/jackc/pgx/v4"
	"github.com/julienschmidt/httprouter"
	"github.com/rs/zerolog/hlog"
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

type userIDKey struct{}

// UserIDKey represents the key used for the userID value inside a context.
var UserIDKey = userIDKey{}

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
	r := httprouter.New()

	// Recover panics from http handlers
	r.PanicHandler = panicHandler

	// API
	r.GET("/api/v1/stats", h.getStats)
	r.GET("/api/v1/updates", h.getPackagesUpdates)
	r.GET("/api/v1/search", h.search)
	r.GET("/api/v1/package/chart/:repoName/:packageName", h.getPackage(hub.Chart))
	r.GET("/api/v1/package/chart/:repoName/:packageName/:version", h.getPackage(hub.Chart))
	r.POST("/api/v1/user", h.registerUser)
	r.POST("/api/v1/user/verifyEmail", h.verifyEmail)
	r.POST("/api/v1/user/login", h.login)

	// Images
	r.GET("/image/:image", h.image)

	// Misc
	r.Handler("GET", "/admin/test", h.requireLogin(http.HandlerFunc(
		func(w http.ResponseWriter, req *http.Request) {
			w.WriteHeader(http.StatusOK)
		},
	)))

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
	jsonData, err := h.hubAPI.GetStatsJSON(r.Context())
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
	jsonData, err := h.hubAPI.GetPackagesUpdatesJSON(r.Context())
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
	jsonData, err := h.hubAPI.SearchPackagesJSON(r.Context(), query)
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

	return &hub.Query{
		Limit:             limit,
		Offset:            offset,
		Facets:            facets,
		Text:              text,
		PackageKinds:      kinds,
		ChartRepositories: repos,
	}, nil
}

// getPackage is an http handler used to get a package details.
func (h *handlers) getPackage(kind hub.PackageKind) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		input := &hub.GetPackageInput{
			Kind:                kind,
			ChartRepositoryName: ps.ByName("repoName"),
			PackageName:         ps.ByName("packageName"),
			Version:             ps.ByName("version"),
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
func (h *handlers) registerUser(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
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
	err = h.hubAPI.RegisterUser(r.Context(), user)
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
func (h *handlers) verifyEmail(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
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
func (h *handlers) login(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
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
		Expires:  time.Now().Add(sessionDuration),
		HttpOnly: true,
	}
	if h.cfg.GetBool("server.cookie.secure") {
		cookie.Secure = true
	}
	http.SetCookie(w, cookie)
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
		ctx := context.WithValue(r.Context(), UserIDKey, checkSessionOutput.UserID)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
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
