package static

import (
	"encoding/json"
	"errors"
	"fmt"
	"html/template"
	"io/ioutil"
	"net/http"
	"os"
	"path"
	"strings"
	"sync"
	"time"

	"github.com/artifacthub/hub/internal/handlers/helpers"
	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/img"
	"github.com/go-chi/chi/v5"
	svg "github.com/h2non/go-is-svg"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
	"github.com/spf13/viper"
)

const (
	cspPolicy = `
	default-src 'none';
	connect-src 'self' https://play.openpolicyagent.org https://www.google-analytics.com https://kubernetesjsonschema.dev;
	font-src 'self';
	img-src 'self' data: https:;
	manifest-src 'self';
	script-src 'self' https://www.google-analytics.com;
	style-src 'self' 'unsafe-inline'
	`

	indexCacheMaxAge = 5 * time.Minute

	// DocsCacheMaxAge is the cache max age used when serving the docs.
	DocsCacheMaxAge = 15 * time.Minute

	// StaticCacheMaxAge is the cache max age used when serving static assets.
	StaticCacheMaxAge = 365 * 24 * time.Hour
)

// Handlers represents a group of http handlers in charge of handling
// static files operations.
type Handlers struct {
	cfg        *viper.Viper
	imageStore img.Store
	logger     zerolog.Logger
	indexTmpl  *template.Template

	mu          sync.RWMutex
	imagesCache map[string][]byte
}

// NewHandlers creates a new Handlers instance.
func NewHandlers(cfg *viper.Viper, imageStore img.Store) *Handlers {
	h := &Handlers{
		cfg:         cfg,
		imageStore:  imageStore,
		imagesCache: make(map[string][]byte),
		logger:      log.With().Str("handlers", "static").Logger(),
	}
	h.setupIndexTemplate()
	return h
}

// setupIndexTemplate parses the index.html template for later use.
func (h *Handlers) setupIndexTemplate() {
	path := path.Join(h.cfg.GetString("server.webBuildPath"), "index.html")
	text, err := ioutil.ReadFile(path)
	if err != nil {
		log.Panic().Err(err).Msg("error reading index.html template")
	}
	h.indexTmpl = template.Must(template.New("").Parse(string(text)))
}

// Image is an http handler that serves images stored in the database.
func (h *Handlers) Image(w http.ResponseWriter, r *http.Request) {
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
			if errors.Is(err, hub.ErrNotFound) {
				w.WriteHeader(http.StatusNotFound)
			} else {
				h.logger.Error().Err(err).Str("method", "Image").Str("imageID", imageID).Send()
				w.WriteHeader(http.StatusInternalServerError)
			}
			return
		}

		// Save image data in cache
		h.mu.Lock()
		h.imagesCache[image] = data
		h.mu.Unlock()
	}

	// Set headers and write image data to response writer
	w.Header().Set("Cache-Control", helpers.BuildCacheControlHeader(StaticCacheMaxAge))
	if svg.Is(data) {
		w.Header().Set("Content-Type", "image/svg+xml")
	} else {
		w.Header().Set("Content-Type", http.DetectContentType(data))
	}
	_, _ = w.Write(data)
}

// Index is an http handler that serves the index.html file.
func (h *Handlers) Index(w http.ResponseWriter, r *http.Request) {
	// Set headers
	w.Header().Set("Cache-Control", helpers.BuildCacheControlHeader(indexCacheMaxAge))
	w.Header().Set("Content-Security-Policy", cspPolicy)

	// Execute index template
	title, _ := r.Context().Value(hub.IndexMetaTitleKey).(string)
	if title == "" {
		title = h.cfg.GetString("theme.siteName")
	}
	description, _ := r.Context().Value(hub.IndexMetaDescriptionKey).(string)
	if description == "" {
		description = "Find, install and publish Kubernetes packages"
	}
	openGraphImage := h.cfg.GetString("theme.images.openGraphImage")
	if !strings.HasPrefix(openGraphImage, "http") {
		openGraphImage = h.cfg.GetString("server.baseURL") + openGraphImage
	}
	data := map[string]interface{}{
		"allowPrivateRepositories": h.cfg.GetBool("server.allowPrivateRepositories"),
		"appleTouchIcon192":        h.cfg.GetString("theme.images.appleTouchIcon192"),
		"appleTouchIcon512":        h.cfg.GetString("theme.images.appleTouchIcon512"),
		"description":              description,
		"gaTrackingID":             h.cfg.GetString("analytics.gaTrackingID"),
		"githubAuth":               h.cfg.IsSet("server.oauth.github"),
		"googleAuth":               h.cfg.IsSet("server.oauth.google"),
		"motd":                     h.cfg.GetString("server.motd"),
		"motdSeverity":             h.cfg.GetString("server.motdSeverity"),
		"oidcAuth":                 h.cfg.IsSet("server.oauth.oidc"),
		"openGraphImage":           openGraphImage,
		"primaryColor":             h.cfg.GetString("theme.colors.primary"),
		"reportURL":                h.cfg.GetString("theme.reportURL"),
		"secondaryColor":           h.cfg.GetString("theme.colors.secondary"),
		"shortcutIcon":             h.cfg.GetString("theme.images.shortcutIcon"),
		"siteName":                 h.cfg.GetString("theme.siteName"),
		"title":                    title,
		"websiteLogo":              h.cfg.GetString("theme.images.websiteLogo"),
	}
	sampleQueriesJSON, err := getSampleQueriesJSON(h.cfg)
	if err != nil {
		h.logger.Error().Err(err).Msg("error reading provided sample queries to JSON, they won't be used")
	} else {
		data["sampleQueries"] = sampleQueriesJSON
	}
	if err := h.indexTmpl.Execute(w, data); err != nil {
		h.logger.Error().Err(err).Msg("error executing index template")
		http.Error(w, "", http.StatusInternalServerError)
	}
}

// SaveImage is an http handler that stores the provided image returning its id.
func (h *Handlers) SaveImage(w http.ResponseWriter, r *http.Request) {
	data, err := ioutil.ReadAll(r.Body)
	if err != nil {
		h.logger.Error().Err(err).Str("method", "SaveImage").Msg("error reading body data")
		helpers.RenderErrorJSON(w, err)
		return
	}
	imageID, err := h.imageStore.SaveImage(r.Context(), data)
	if err != nil {
		h.logger.Error().Err(err).Str("method", "SaveImage").Send()
		helpers.RenderErrorJSON(w, err)
		return
	}
	dataJSON := []byte(fmt.Sprintf(`{"image_id": "%s"}`, imageID))
	helpers.RenderJSON(w, dataJSON, 0, http.StatusOK)
}

// FileServer sets up a http.FileServer handler to serve static files.
func FileServer(r chi.Router, public, static string, cacheMaxAge time.Duration) {
	if strings.ContainsAny(public, "{}*") {
		panic("FileServer does not permit URL parameters")
	}

	if public != "/" && public[len(public)-1] != '/' {
		r.Get(public, http.RedirectHandler(public+"/", http.StatusMovedPermanently).ServeHTTP)
		public += "/"
	}

	fsHandler := http.StripPrefix(public, http.FileServer(http.Dir(static)))

	r.Get(public+"*", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		file := strings.Replace(r.RequestURI, public, "/", 1)
		if _, err := os.Stat(static + file); os.IsNotExist(err) {
			w.WriteHeader(http.StatusNotFound)
			return
		}
		w.Header().Set("Cache-Control", helpers.BuildCacheControlHeader(cacheMaxAge))
		fsHandler.ServeHTTP(w, r)
	}))
}

// getSampleQueriesJSON is a helper function that reads the sample queries from
// the configuration provided and marshals them as json.
func getSampleQueriesJSON(cfg *viper.Viper) (string, error) {
	var sampleQueries []map[string]string
	if err := cfg.UnmarshalKey("theme.sampleQueries", &sampleQueries); err != nil {
		return "", err
	}
	sampleQueriesJSON, err := json.Marshal(sampleQueries)
	if err != nil {
		return "", err
	}
	return string(sampleQueriesJSON), nil
}
