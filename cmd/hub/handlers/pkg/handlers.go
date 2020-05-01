package pkg

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strconv"

	"github.com/artifacthub/hub/cmd/hub/handlers/helpers"
	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/pkg"
	"github.com/go-chi/chi"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
)

// Handlers represents a group of http handlers in charge of handling packages
// operations.
type Handlers struct {
	pkgManager hub.PackageManager
	logger     zerolog.Logger
}

// NewHandlers creates a new Handlers instance.
func NewHandlers(pkgManager hub.PackageManager) *Handlers {
	return &Handlers{
		pkgManager: pkgManager,
		logger:     log.With().Str("handlers", "pkg").Logger(),
	}
}

// Get is an http handler used to get a package details.
func (h *Handlers) Get(w http.ResponseWriter, r *http.Request) {
	input := &hub.GetPackageInput{
		PackageName: chi.URLParam(r, "packageName"),
		Version:     chi.URLParam(r, "version"),
	}
	chartRepositoryName := chi.URLParam(r, "repoName")
	if chartRepositoryName != "" {
		input.ChartRepositoryName = chartRepositoryName
	}
	dataJSON, err := h.pkgManager.GetJSON(r.Context(), input)
	if err != nil {
		h.logger.Error().Err(err).Interface("input", input).Str("method", "Get").Send()
		if errors.Is(err, pkg.ErrInvalidInput) {
			http.Error(w, err.Error(), http.StatusBadRequest)
		} else if errors.Is(err, pkg.ErrNotFound) {
			http.NotFound(w, r)
		} else {
			http.Error(w, "", http.StatusInternalServerError)
		}
		return
	}
	helpers.RenderJSON(w, dataJSON, helpers.DefaultAPICacheMaxAge)
}

// GetStarredByUser is an http handler used to get the packages starred by the
// user doing the request.
func (h *Handlers) GetStarredByUser(w http.ResponseWriter, r *http.Request) {
	dataJSON, err := h.pkgManager.GetStarredByUserJSON(r.Context())
	if err != nil {
		h.logger.Error().Err(err).Str("method", "GetStarredByUser").Send()
		http.Error(w, "", http.StatusInternalServerError)
		return
	}
	helpers.RenderJSON(w, dataJSON, 0)
}

// GetStats is an http handler used to get some stats about packages registered
// in the hub database.
func (h *Handlers) GetStats(w http.ResponseWriter, r *http.Request) {
	dataJSON, err := h.pkgManager.GetStatsJSON(r.Context())
	if err != nil {
		h.logger.Error().Err(err).Str("method", "GetStats").Send()
		http.Error(w, "", http.StatusInternalServerError)
		return
	}
	helpers.RenderJSON(w, dataJSON, helpers.DefaultAPICacheMaxAge)
}

// GetUpdates is an http handler used to get the last packages updates in the
// hub database.
func (h *Handlers) GetUpdates(w http.ResponseWriter, r *http.Request) {
	dataJSON, err := h.pkgManager.GetUpdatesJSON(r.Context())
	if err != nil {
		h.logger.Error().Err(err).Str("method", "GetUpdates").Send()
		http.Error(w, "", http.StatusInternalServerError)
		return
	}
	helpers.RenderJSON(w, dataJSON, helpers.DefaultAPICacheMaxAge)
}

// InjectIndexMeta is a middleware that injects the some index metadata related
// to a given package,
func (h *Handlers) InjectIndexMeta(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Prepare index metadata from package details
		input := &hub.GetPackageInput{
			PackageName: chi.URLParam(r, "packageName"),
			Version:     chi.URLParam(r, "version"),
		}
		chartRepositoryName := chi.URLParam(r, "repoName")
		if chartRepositoryName != "" {
			input.ChartRepositoryName = chartRepositoryName
		}
		dataJSON, err := h.pkgManager.GetJSON(r.Context(), input)
		if err != nil {
			h.logger.Error().Err(err).Interface("input", input).Str("method", "InjectIndexMeta").Send()
			if errors.Is(err, pkg.ErrInvalidInput) {
				http.Error(w, err.Error(), http.StatusBadRequest)
			} else if errors.Is(err, pkg.ErrNotFound) {
				http.NotFound(w, r)
			} else {
				http.Error(w, "", http.StatusInternalServerError)
			}
			return
		}
		p := &hub.Package{}
		if err := json.Unmarshal(dataJSON, p); err != nil {
			http.Error(w, "", http.StatusInternalServerError)
			return
		}
		publisher := p.OrganizationName
		if publisher == "" {
			publisher = p.UserAlias
		}
		repo := ""
		if p.ChartRepository != nil {
			repo = "/" + p.ChartRepository.Name
		}
		title := fmt.Sprintf("%s %s · %s%s", p.NormalizedName, p.Version, publisher, repo)
		description := p.Description

		// Inject index metadata in context and call next handler
		ctx := context.WithValue(r.Context(), hub.IndexMetaTitleKey, title)
		ctx = context.WithValue(ctx, hub.IndexMetaDescriptionKey, description)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
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
	dataJSON, err := h.pkgManager.SearchJSON(r.Context(), input)
	if err != nil {
		h.logger.Error().Err(err).Str("query", r.URL.RawQuery).Str("method", "Search").Send()
		if errors.Is(err, pkg.ErrInvalidInput) {
			http.Error(w, err.Error(), http.StatusBadRequest)
		} else {
			http.Error(w, "", http.StatusInternalServerError)
		}
		return
	}
	helpers.RenderJSON(w, dataJSON, helpers.DefaultAPICacheMaxAge)
}

// StarredByUser is an http handler used to check if a user has starred a given
// package.
func (h *Handlers) StarredByUser(w http.ResponseWriter, r *http.Request) {
	packageID := chi.URLParam(r, "packageID")
	starred, err := h.pkgManager.StarredByUser(r.Context(), packageID)
	if err != nil {
		h.logger.Error().Err(err).Str("method", "StarredByUser").Send()
		if errors.Is(err, pkg.ErrInvalidInput) {
			http.Error(w, err.Error(), http.StatusBadRequest)
		} else {
			http.Error(w, "", http.StatusInternalServerError)
		}
	}
	dataJSON := []byte(fmt.Sprintf(`{"starred": %v}`, starred))
	helpers.RenderJSON(w, dataJSON, 0)
}

// ToggleStar is an http handler used to toggle the star on a given package.
func (h *Handlers) ToggleStar(w http.ResponseWriter, r *http.Request) {
	packageID := chi.URLParam(r, "packageID")
	err := h.pkgManager.ToggleStar(r.Context(), packageID)
	if err != nil {
		h.logger.Error().Err(err).Str("method", "ToggleStar").Send()
		if errors.Is(err, pkg.ErrInvalidInput) {
			http.Error(w, err.Error(), http.StatusBadRequest)
		} else {
			http.Error(w, "", http.StatusInternalServerError)
		}
	}
}

// buildSearchInput builds a packages search query from a map of query string
// values, validating them as they are extracted.
func buildSearchInput(qs url.Values) (*hub.SearchPackageInput, error) {
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

	// Kinds
	kinds := make([]hub.PackageKind, 0, len(qs["kind"]))
	for _, kindStr := range qs["kind"] {
		kind, err := strconv.Atoi(kindStr)
		if err != nil {
			return nil, fmt.Errorf("invalid kind: %s", kindStr)
		}
		kinds = append(kinds, hub.PackageKind(kind))
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

	return &hub.SearchPackageInput{
		Limit:             limit,
		Offset:            offset,
		Facets:            facets,
		Text:              qs.Get("text"),
		PackageKinds:      kinds,
		Users:             qs["user"],
		Orgs:              qs["org"],
		ChartRepositories: qs["repo"],
		Deprecated:        deprecated,
	}, nil
}
