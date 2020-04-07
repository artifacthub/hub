package chartrepo

import (
	"encoding/json"
	"net/http"
	"regexp"

	"github.com/artifacthub/hub/cmd/hub/handlers/helpers"
	"github.com/artifacthub/hub/internal/hub"
	"github.com/go-chi/chi"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
)

// chartRepositoryNameRE is a regexp used to validate a chart repository name.
var chartRepositoryNameRE = regexp.MustCompile(`^[a-z][a-z0-9-]*$`)

// Handlers represents a group of http handlers in charge of handling chart
// repositories operations.
type Handlers struct {
	chartRepoManager hub.ChartRepositoryManager
	logger           zerolog.Logger
}

// NewHandlers creates a new Handlers instance.
func NewHandlers(chartRepoManager hub.ChartRepositoryManager) *Handlers {
	return &Handlers{
		chartRepoManager: chartRepoManager,
		logger:           log.With().Str("handlers", "chartrepo").Logger(),
	}
}

// Add is an http handler that adds the provided chart repository to the
// database.
func (h *Handlers) Add(w http.ResponseWriter, r *http.Request) {
	orgName := chi.URLParam(r, "orgName")
	repo := &hub.ChartRepository{}
	if err := json.NewDecoder(r.Body).Decode(&repo); err != nil {
		h.logger.Error().Err(err).Str("method", "Add").Msg("invalid chart repository")
		http.Error(w, "chart repository provided is not valid", http.StatusBadRequest)
		return
	}
	if repo.Name == "" || repo.URL == "" {
		http.Error(w, "chart repository name and url must be provided", http.StatusBadRequest)
		return
	}
	if !chartRepositoryNameRE.MatchString(repo.Name) {
		http.Error(w, "invalid chart repository name", http.StatusBadRequest)
		return
	}
	if err := h.chartRepoManager.Add(r.Context(), orgName, repo); err != nil {
		h.logger.Error().Err(err).Str("method", "Add").Send()
		http.Error(w, "", http.StatusInternalServerError)
		return
	}
}

// CheckAvailability is a middleware that checks the availability of a given
// value for the provided resource kind.
func (h *Handlers) CheckAvailability(w http.ResponseWriter, r *http.Request) {
	resourceKind := chi.URLParam(r, "resourceKind")
	value := r.FormValue("v")

	// Check if resource kind and value received are valid
	validResourceKinds := []string{
		"chartRepositoryName",
		"chartRepositoryURL",
		"organizationName",
		"userAlias",
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
	available, err := h.chartRepoManager.CheckAvailability(r.Context(), resourceKind, value)
	if err != nil {
		h.logger.Error().Err(err).Str("method", "CheckAvailability").Send()
		http.Error(w, "", http.StatusInternalServerError)
		return
	}
	if available {
		w.WriteHeader(http.StatusNotFound)
	}
}

// Delete is an http handler that deletes the provided chart repository from
// the database.
func (h *Handlers) Delete(w http.ResponseWriter, r *http.Request) {
	repoName := chi.URLParam(r, "repoName")
	if err := h.chartRepoManager.Delete(r.Context(), repoName); err != nil {
		h.logger.Error().Err(err).Str("method", "Delete").Send()
		http.Error(w, "", http.StatusInternalServerError)
		return
	}
}

// GetOwnedByOrg is an http handler that returns the chart repositories owned
// by the organization provided. The user doing the request must belong to the
// organization.
func (h *Handlers) GetOwnedByOrg(w http.ResponseWriter, r *http.Request) {
	orgName := chi.URLParam(r, "orgName")
	dataJSON, err := h.chartRepoManager.GetOwnedByOrgJSON(r.Context(), orgName)
	if err != nil {
		h.logger.Error().Err(err).Str("method", "GetOwnedByOrg").Send()
		http.Error(w, "", http.StatusInternalServerError)
		return
	}
	helpers.RenderJSON(w, dataJSON, 0)
}

// GetOwnedByUser is an http handler that returns the chart repositories owned
// by the user doing the request.
func (h *Handlers) GetOwnedByUser(w http.ResponseWriter, r *http.Request) {
	dataJSON, err := h.chartRepoManager.GetOwnedByUserJSON(r.Context())
	if err != nil {
		h.logger.Error().Err(err).Str("method", "GetOwnedByUser").Send()
		http.Error(w, "", http.StatusInternalServerError)
		return
	}
	helpers.RenderJSON(w, dataJSON, 0)
}

// Update is an http handler that updates the provided chart repository in the
// database.
func (h *Handlers) Update(w http.ResponseWriter, r *http.Request) {
	repo := &hub.ChartRepository{}
	if err := json.NewDecoder(r.Body).Decode(&repo); err != nil {
		h.logger.Error().Err(err).Str("method", "Update").Msg("invalid chart repository")
		http.Error(w, "chart repository provided is not valid", http.StatusBadRequest)
		return
	}
	repo.Name = chi.URLParam(r, "repoName")
	if err := h.chartRepoManager.Update(r.Context(), repo); err != nil {
		log.Error().Err(err).Str("method", "Update").Send()
		http.Error(w, "", http.StatusInternalServerError)
		return
	}
}
