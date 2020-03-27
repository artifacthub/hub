package pkg

import (
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strconv"

	"github.com/artifacthub/hub/cmd/hub/handlers/helpers"
	"github.com/artifacthub/hub/internal/api"
	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/pkg"
	"github.com/go-chi/chi"
	"github.com/jackc/pgx/v4"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
)

// Handlers represents a group of http handlers in charge of handling packages
// operations.
type Handlers struct {
	hubAPI *api.API
	logger zerolog.Logger
}

// NewHandlers creates a new Handlers instance.
func NewHandlers(hubAPI *api.API) *Handlers {
	return &Handlers{
		hubAPI: hubAPI,
		logger: log.With().Str("handlers", "pkg").Logger(),
	}
}

// Get is an http handler used to get a package details.
func (h *Handlers) Get(w http.ResponseWriter, r *http.Request) {
	input := &pkg.GetInput{
		PackageName: chi.URLParam(r, "packageName"),
		Version:     chi.URLParam(r, "version"),
	}
	chartRepositoryName := chi.URLParam(r, "repoName")
	if chartRepositoryName != "" {
		input.ChartRepositoryName = chartRepositoryName
	}
	jsonData, err := h.hubAPI.Packages.GetJSON(r.Context(), input)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			http.NotFound(w, r)
		} else {
			h.logger.Error().Err(err).Interface("input", input).Str("method", "Get").Send()
			http.Error(w, "", http.StatusInternalServerError)
		}
		return
	}
	helpers.RenderJSON(w, jsonData, helpers.DefaultAPICacheMaxAge)
}

// GetStats is an http handler used to get some stats about packages registered
// in the hub database.
func (h *Handlers) GetStats(w http.ResponseWriter, r *http.Request) {
	jsonData, err := h.hubAPI.Packages.GetStatsJSON(r.Context())
	if err != nil {
		h.logger.Error().Err(err).Str("method", "GetStats").Send()
		http.Error(w, "", http.StatusInternalServerError)
		return
	}
	helpers.RenderJSON(w, jsonData, helpers.DefaultAPICacheMaxAge)
}

// GetUpdates is an http handler used to get the last packages updates in the
// hub database.
func (h *Handlers) GetUpdates(w http.ResponseWriter, r *http.Request) {
	jsonData, err := h.hubAPI.Packages.GetUpdatesJSON(r.Context())
	if err != nil {
		h.logger.Error().Err(err).Str("method", "GetUpdates").Send()
		http.Error(w, "", http.StatusInternalServerError)
		return
	}
	helpers.RenderJSON(w, jsonData, helpers.DefaultAPICacheMaxAge)
}

// Search is an http handler used to searchPackages for packages in the hub
// database.
func (h *Handlers) Search(w http.ResponseWriter, r *http.Request) {
	input, err := buildSearchInput(r.URL.Query())
	if err != nil {
		h.logger.Error().Err(err).Str("query", r.URL.RawQuery).Str("method", "Search").Msg("invalid query")
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	jsonData, err := h.hubAPI.Packages.SearchJSON(r.Context(), input)
	if err != nil {
		h.logger.Error().Err(err).Str("query", r.URL.RawQuery).Str("method", "Search").Send()
		http.Error(w, "", http.StatusInternalServerError)
		return
	}
	helpers.RenderJSON(w, jsonData, helpers.DefaultAPICacheMaxAge)
}

// buildSearchInput builds a packages search query from a map of query string
// values, validating them as they are extracted.
func buildSearchInput(qs url.Values) (*pkg.SearchInput, error) {
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

	// Include deprecated packages
	var deprecated bool
	if qs.Get("deprecated") != "" {
		var err error
		deprecated, err = strconv.ParseBool(qs.Get("deprecated"))
		if err != nil {
			return nil, fmt.Errorf("invalid deprecated: %s", qs.Get("deprecated"))
		}
	}

	return &pkg.SearchInput{
		Limit:             limit,
		Offset:            offset,
		Facets:            facets,
		Text:              text,
		PackageKinds:      kinds,
		ChartRepositories: repos,
		Deprecated:        deprecated,
	}, nil
}
