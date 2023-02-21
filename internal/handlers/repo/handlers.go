package repo

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/artifacthub/hub/internal/handlers/helpers"
	"github.com/artifacthub/hub/internal/hub"
	"github.com/go-chi/chi/v5"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
	"github.com/spf13/viper"
)

const (
	logoSVG            = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-hexagon"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg>`
	searchDefaultLimit = 20
	searchMaxLimit     = 60
)

// Handlers represents a group of http handlers in charge of handling
// repositories operations.
type Handlers struct {
	cfg         *viper.Viper
	repoManager hub.RepositoryManager
	logger      zerolog.Logger
}

// NewHandlers creates a new Handlers instance.
func NewHandlers(cfg *viper.Viper, repoManager hub.RepositoryManager) *Handlers {
	return &Handlers{
		cfg:         cfg,
		repoManager: repoManager,
		logger:      log.With().Str("handlers", "repo").Logger(),
	}
}

// Add is an http handler that adds the provided repository to the database.
func (h *Handlers) Add(w http.ResponseWriter, r *http.Request) {
	orgName := chi.URLParam(r, "orgName")
	repo := &hub.Repository{}
	if err := json.NewDecoder(r.Body).Decode(&repo); err != nil {
		h.logger.Error().Err(err).Str("method", "Add").Msg(hub.ErrInvalidInput.Error())
		helpers.RenderErrorJSON(w, hub.ErrInvalidInput)
		return
	}
	if err := h.repoManager.Add(r.Context(), orgName, repo); err != nil {
		h.logger.Error().Err(err).Str("method", "Add").Send()
		helpers.RenderErrorJSON(w, err)
		return
	}
	w.WriteHeader(http.StatusCreated)
}

// Badge is an http handler that returns the information needed to render the
// repository badge.
func (h *Handlers) Badge(w http.ResponseWriter, r *http.Request) {
	data := map[string]interface{}{
		"color":         strings.TrimPrefix(h.cfg.GetString("theme.colors.secondary"), "#"),
		"label":         h.cfg.GetString("theme.siteName"),
		"labelColor":    strings.TrimPrefix(h.cfg.GetString("theme.colors.primary"), "#"),
		"logoSvg":       logoSVG,
		"logoWidth":     18,
		"message":       chi.URLParam(r, "repoName"),
		"schemaVersion": 1,
		"style":         "flat",
	}
	dataJSON, err := json.Marshal(data)
	if err != nil {
		h.logger.Error().Err(err).Str("method", "Badge").Send()
		helpers.RenderErrorJSON(w, err)
		return
	}
	helpers.RenderJSON(w, dataJSON, helpers.DefaultAPICacheMaxAge, http.StatusOK)
}

// CheckAvailability is an http handler that checks the availability of a given
// value for the provided resource kind.
func (h *Handlers) CheckAvailability(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Cache-Control", helpers.BuildCacheControlHeader(0))
	resourceKind := chi.URLParam(r, "resourceKind")
	value := r.FormValue("v")
	available, err := h.repoManager.CheckAvailability(r.Context(), resourceKind, value)
	if err != nil {
		h.logger.Error().Err(err).Str("method", "CheckAvailability").Send()
		helpers.RenderErrorJSON(w, err)
		return
	}
	if available {
		helpers.RenderErrorWithCodeJSON(w, nil, http.StatusNotFound)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// ClaimOwnership is an http handler used to claim the ownership of a given
// repository, transferring it to the selected entity if the requesting user
// has permissions to do so.
func (h *Handlers) ClaimOwnership(w http.ResponseWriter, r *http.Request) {
	repoName := chi.URLParam(r, "repoName")
	orgName := r.FormValue("org")
	if err := h.repoManager.ClaimOwnership(r.Context(), repoName, orgName); err != nil {
		h.logger.Error().Err(err).Str("method", "ClaimOwnership").Send()
		helpers.RenderErrorJSON(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// Delete is an http handler that deletes the provided repository from the
// database.
func (h *Handlers) Delete(w http.ResponseWriter, r *http.Request) {
	repoName := chi.URLParam(r, "repoName")
	if err := h.repoManager.Delete(r.Context(), repoName); err != nil {
		h.logger.Error().Err(err).Str("method", "Delete").Send()
		helpers.RenderErrorJSON(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// Search is an http handler used to search for repositories in the hub
// database.
func (h *Handlers) Search(w http.ResponseWriter, r *http.Request) {
	input, err := buildSearchInput(r.URL.Query())
	if err != nil {
		err = fmt.Errorf("%w: %w", hub.ErrInvalidInput, err)
		h.logger.Error().Err(err).Str("query", r.URL.RawQuery).Str("method", "Search").Msg("invalid query")
		helpers.RenderErrorJSON(w, err)
		return
	}
	result, err := h.repoManager.SearchJSON(r.Context(), input)
	if err != nil {
		h.logger.Error().Err(err).Str("query", r.URL.RawQuery).Str("method", "Search").Send()
		helpers.RenderErrorJSON(w, err)
		return
	}
	w.Header().Set(helpers.PaginationTotalCount, strconv.Itoa(result.TotalCount))
	cacheMaxAge := 1 * time.Hour
	if r.Context().Value(hub.UserIDKey) != nil {
		cacheMaxAge = 0
	}
	helpers.RenderJSON(w, result.Data, cacheMaxAge, http.StatusOK)
}

// Transfer is an http handler that transfers the provided repository to a
// different owner.
func (h *Handlers) Transfer(w http.ResponseWriter, r *http.Request) {
	repoName := chi.URLParam(r, "repoName")
	orgName := r.FormValue("org")
	if err := h.repoManager.Transfer(r.Context(), repoName, orgName, false); err != nil {
		h.logger.Error().Err(err).Str("method", "Transfer").Send()
		helpers.RenderErrorJSON(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// Update is an http handler that updates the provided repository in the
// database.
func (h *Handlers) Update(w http.ResponseWriter, r *http.Request) {
	repo := &hub.Repository{}
	if err := json.NewDecoder(r.Body).Decode(&repo); err != nil {
		h.logger.Error().Err(err).Str("method", "Update").Msg("invalid repository")
		helpers.RenderErrorJSON(w, hub.ErrInvalidInput)
		return
	}
	repo.Name = chi.URLParam(r, "repoName")
	if err := h.repoManager.Update(r.Context(), repo); err != nil {
		h.logger.Error().Err(err).Str("method", "Update").Send()
		helpers.RenderErrorJSON(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// buildSearchInput builds a packages search query from a map of query string
// values, validating them as they are extracted.
func buildSearchInput(qs url.Values) (*hub.SearchRepositoryInput, error) {
	// Kinds
	kinds := make([]hub.RepositoryKind, 0, len(qs["kind"]))
	for _, kindStr := range qs["kind"] {
		kind, err := strconv.Atoi(kindStr)
		if err != nil {
			return nil, fmt.Errorf("invalid kind: %s", kindStr)
		}
		kinds = append(kinds, hub.RepositoryKind(kind))
	}

	// Limit
	var limit int
	if qs.Get("limit") != "" {
		var err error
		limit, err = strconv.Atoi(qs.Get("limit"))
		if err != nil {
			return nil, fmt.Errorf("invalid limit: %s", qs.Get("limit"))
		}
		if limit > searchMaxLimit {
			return nil, fmt.Errorf("invalid limit: %s (max: %d)", qs.Get("limit"), searchMaxLimit)
		}
	} else {
		limit = searchDefaultLimit
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

	return &hub.SearchRepositoryInput{
		Name:               qs.Get("name"),
		URL:                qs.Get("url"),
		Kinds:              kinds,
		Orgs:               qs["org"],
		Users:              qs["user"],
		IncludeCredentials: false,
		Limit:              limit,
		Offset:             offset,
	}, nil
}
