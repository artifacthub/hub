package repo

import (
	"encoding/json"
	"net/http"

	"github.com/artifacthub/hub/cmd/hub/handlers/helpers"
	"github.com/artifacthub/hub/internal/hub"
	"github.com/go-chi/chi"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
)

// Handlers represents a group of http handlers in charge of handling
// repositories operations.
type Handlers struct {
	repoManager hub.RepositoryManager
	logger      zerolog.Logger
}

// NewHandlers creates a new Handlers instance.
func NewHandlers(repoManager hub.RepositoryManager) *Handlers {
	return &Handlers{
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

// GetAll is an http handler that returns all the repositories available.
func (h *Handlers) GetAll(w http.ResponseWriter, r *http.Request) {
	dataJSON, err := h.repoManager.GetAllJSON(r.Context())
	if err != nil {
		h.logger.Error().Err(err).Str("method", "GetAll").Send()
		helpers.RenderErrorJSON(w, err)
		return
	}
	helpers.RenderJSON(w, dataJSON, helpers.DefaultAPICacheMaxAge, http.StatusOK)
}

// GetByKind is an http handler that returns all the repositories available of
// the kind provided.
func (h *Handlers) GetByKind(w http.ResponseWriter, r *http.Request) {
	kind, err := hub.GetKindFromName(chi.URLParam(r, "kind"))
	if err != nil {
		h.logger.Error().Err(err).Str("method", "GetByKind").Msg("invalid kind")
		helpers.RenderErrorJSON(w, hub.ErrInvalidInput)
		return
	}
	dataJSON, err := h.repoManager.GetByKindJSON(r.Context(), kind)
	if err != nil {
		h.logger.Error().Err(err).Str("method", "GetByKind").Send()
		helpers.RenderErrorJSON(w, err)
		return
	}
	helpers.RenderJSON(w, dataJSON, helpers.DefaultAPICacheMaxAge, http.StatusOK)
}

// GetOwnedByOrg is an http handler that returns the repositories owned by the
// organization provided. The user doing the request must belong to the
// organization.
func (h *Handlers) GetOwnedByOrg(w http.ResponseWriter, r *http.Request) {
	orgName := chi.URLParam(r, "orgName")
	dataJSON, err := h.repoManager.GetOwnedByOrgJSON(r.Context(), orgName)
	if err != nil {
		h.logger.Error().Err(err).Str("method", "GetOwnedByOrg").Send()
		helpers.RenderErrorJSON(w, err)
		return
	}
	helpers.RenderJSON(w, dataJSON, 0, http.StatusOK)
}

// GetOwnedByUser is an http handler that returns the repositories owned by the
// user doing the request.
func (h *Handlers) GetOwnedByUser(w http.ResponseWriter, r *http.Request) {
	dataJSON, err := h.repoManager.GetOwnedByUserJSON(r.Context())
	if err != nil {
		h.logger.Error().Err(err).Str("method", "GetOwnedByUser").Send()
		helpers.RenderErrorJSON(w, err)
		return
	}
	helpers.RenderJSON(w, dataJSON, 0, http.StatusOK)
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
