package static

import (
	"errors"
	"fmt"
	"net/http"
	"path"
	"strings"
	"sync"

	"github.com/artifacthub/hub/cmd/hub/handlers/helpers"
	"github.com/artifacthub/hub/internal/img/pg"
	"github.com/go-chi/chi"
	svg "github.com/h2non/go-is-svg"
	"github.com/jackc/pgx/v4"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
	"github.com/spf13/viper"
)

// Handlers represents a group of http handlers in charge of handling
// static files operations.
type Handlers struct {
	cfg        *viper.Viper
	imageStore *pg.ImageStore
	logger     zerolog.Logger

	mu          sync.RWMutex
	imagesCache map[string][]byte
}

// NewHandlers creates a new Handlers instance.
func NewHandlers(cfg *viper.Viper, imageStore *pg.ImageStore) *Handlers {
	return &Handlers{
		cfg:         cfg,
		imageStore:  imageStore,
		imagesCache: make(map[string][]byte),
		logger:      log.With().Str("handlers", "static").Logger(),
	}
}

// Image in an http handler that serves images stored in the database.
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
			if errors.Is(err, pgx.ErrNoRows) {
				http.NotFound(w, r)
			} else {
				h.logger.Error().Err(err).Str("method", "Image").Str("imageID", imageID).Send()
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

// ServeIndex is an http handler that serves the index.html file.
func (h *Handlers) ServeIndex(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Cache-Control", "no-store, no-cache, must-revalidate")
	http.ServeFile(w, r, path.Join(h.cfg.GetString("server.webBuildPath"), "index.html"))
}

// FileServer sets up a http.FileServer handler to serve static files from a
// a http.FileSystem.
func FileServer(r chi.Router, path string, fs http.FileSystem) {
	fsHandler := http.StripPrefix(path, http.FileServer(fs))

	if path != "/" && path[len(path)-1] != '/' {
		r.Get(path, http.RedirectHandler(path+"/", 301).ServeHTTP)
		path += "/"
	}
	path += "*"

	r.Get(path, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", fmt.Sprintf("max-age=%d", int64(helpers.StaticCacheMaxAge.Seconds())))
		fsHandler.ServeHTTP(w, r)
	}))
}
