package org

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"

	"github.com/artifacthub/hub/internal/handlers/helpers"
	"github.com/artifacthub/hub/internal/hub"
	"github.com/go-chi/chi/v5"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
	"github.com/spf13/viper"
)

// Handlers represents a group of http handlers in charge of handling
// organizations operations.
type Handlers struct {
	orgManager hub.OrganizationManager
	az         hub.Authorizer
	cfg        *viper.Viper
	logger     zerolog.Logger
}

// NewHandlers creates a new Handlers instance.
func NewHandlers(orgManager hub.OrganizationManager, az hub.Authorizer, cfg *viper.Viper) *Handlers {
	return &Handlers{
		orgManager: orgManager,
		az:         az,
		cfg:        cfg,
		logger:     log.With().Str("handlers", "org").Logger(),
	}
}

// Add is an http handler that adds the provided organization to the database.
func (h *Handlers) Add(w http.ResponseWriter, r *http.Request) {
	o := &hub.Organization{}
	if err := json.NewDecoder(r.Body).Decode(&o); err != nil {
		h.logger.Error().Err(err).Str("method", "Add").Msg("invalid organization")
		helpers.RenderErrorJSON(w, hub.ErrInvalidInput)
		return
	}
	if err := h.orgManager.Add(r.Context(), o); err != nil {
		h.logger.Error().Err(err).Str("method", "Add").Send()
		helpers.RenderErrorJSON(w, err)
		return
	}
	w.WriteHeader(http.StatusCreated)
}

// AddMember is an http handler that adds a member to the provided organization.
func (h *Handlers) AddMember(w http.ResponseWriter, r *http.Request) {
	orgName := chi.URLParam(r, "orgName")
	userAlias := chi.URLParam(r, "userAlias")
	err := h.orgManager.AddMember(r.Context(), orgName, userAlias)
	if err != nil {
		h.logger.Error().Err(err).Str("method", "AddMember").Send()
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
	available, err := h.orgManager.CheckAvailability(r.Context(), resourceKind, value)
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

// ConfirmMembership is an http handler used to confirm a user's membership to
// an organization.
func (h *Handlers) ConfirmMembership(w http.ResponseWriter, r *http.Request) {
	orgName := chi.URLParam(r, "orgName")
	if err := h.orgManager.ConfirmMembership(r.Context(), orgName); err != nil {
		h.logger.Error().Err(err).Str("method", "ConfirmMembership").Send()
		helpers.RenderErrorJSON(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// Delete is an http handler that deletes an organization.
func (h *Handlers) Delete(w http.ResponseWriter, r *http.Request) {
	orgName := chi.URLParam(r, "orgName")
	if err := h.orgManager.Delete(r.Context(), orgName); err != nil {
		h.logger.Error().Err(err).Str("method", "Delete").Send()
		helpers.RenderErrorJSON(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// DeleteMember is an http handler that deletes a member from the provided
// organization.
func (h *Handlers) DeleteMember(w http.ResponseWriter, r *http.Request) {
	orgName := chi.URLParam(r, "orgName")
	userAlias := chi.URLParam(r, "userAlias")
	if err := h.orgManager.DeleteMember(r.Context(), orgName, userAlias); err != nil {
		h.logger.Error().Err(err).Str("method", "DeleteMember").Send()
		helpers.RenderErrorJSON(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// Get is an http handler that returns the organization requested.
func (h *Handlers) Get(w http.ResponseWriter, r *http.Request) {
	orgName := chi.URLParam(r, "orgName")
	dataJSON, err := h.orgManager.GetJSON(r.Context(), orgName)
	if err != nil {
		h.logger.Error().Err(err).Str("method", "Get").Send()
		helpers.RenderErrorJSON(w, err)
		return
	}
	helpers.RenderJSON(w, dataJSON, 0, http.StatusOK)
}

// GetAuthorizationPolicy is an http handler that returns the organization's
// authorization policy.
func (h *Handlers) GetAuthorizationPolicy(w http.ResponseWriter, r *http.Request) {
	orgName := chi.URLParam(r, "orgName")
	dataJSON, err := h.orgManager.GetAuthorizationPolicyJSON(r.Context(), orgName)
	if err != nil {
		h.logger.Error().Err(err).Str("method", "GetAuthorizationPolicy").Send()
		helpers.RenderErrorJSON(w, err)
		return
	}
	helpers.RenderJSON(w, dataJSON, 0, http.StatusOK)
}

// GetByUser is an http handler that returns the organizations the user doing
// the request belongs to.
func (h *Handlers) GetByUser(w http.ResponseWriter, r *http.Request) {
	p, err := helpers.GetPagination(r.URL.Query(), helpers.PaginationDefaultLimit, helpers.PaginationMaxLimit)
	if err != nil {
		err = fmt.Errorf("%w: %w", hub.ErrInvalidInput, err)
		h.logger.Error().Err(err).Str("query", r.URL.RawQuery).Str("method", "GetByUser").Send()
		helpers.RenderErrorJSON(w, err)
		return
	}
	result, err := h.orgManager.GetByUserJSON(r.Context(), p)
	if err != nil {
		h.logger.Error().Err(err).Str("method", "GetByUser").Send()
		helpers.RenderErrorJSON(w, err)
		return
	}
	w.Header().Set(helpers.PaginationTotalCount, strconv.Itoa(result.TotalCount))
	helpers.RenderJSON(w, result.Data, 0, http.StatusOK)
}

// GetMembers is an http handler that returns the members of the provided
// organization.
func (h *Handlers) GetMembers(w http.ResponseWriter, r *http.Request) {
	p, err := helpers.GetPagination(r.URL.Query(), helpers.PaginationDefaultLimit, helpers.PaginationMaxLimit)
	if err != nil {
		err = fmt.Errorf("%w: %w", hub.ErrInvalidInput, err)
		h.logger.Error().Err(err).Str("query", r.URL.RawQuery).Str("method", "GetMembers").Send()
		helpers.RenderErrorJSON(w, err)
		return
	}
	orgName := chi.URLParam(r, "orgName")
	result, err := h.orgManager.GetMembersJSON(r.Context(), orgName, p)
	if err != nil {
		h.logger.Error().Err(err).Str("method", "GetMembers").Send()
		helpers.RenderErrorJSON(w, err)
		return
	}
	w.Header().Set(helpers.PaginationTotalCount, strconv.Itoa(result.TotalCount))
	helpers.RenderJSON(w, result.Data, 0, http.StatusOK)
}

// Update is an http handler that updates the provided organization in the
// database.
func (h *Handlers) Update(w http.ResponseWriter, r *http.Request) {
	orgName := chi.URLParam(r, "orgName")
	org := &hub.Organization{}
	if err := json.NewDecoder(r.Body).Decode(&org); err != nil {
		h.logger.Error().Err(err).Str("method", "Update").Msg("invalid organization")
		helpers.RenderErrorJSON(w, hub.ErrInvalidInput)
		return
	}
	if err := h.orgManager.Update(r.Context(), orgName, org); err != nil {
		h.logger.Error().Err(err).Str("method", "Update").Send()
		helpers.RenderErrorJSON(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// UpdateAuthorizationPolicy is an http handler that updates organization's
// authorization policy in the database.
func (h *Handlers) UpdateAuthorizationPolicy(w http.ResponseWriter, r *http.Request) {
	policy := &hub.AuthorizationPolicy{}
	if err := json.NewDecoder(r.Body).Decode(&policy); err != nil {
		h.logger.Error().Err(err).Str("method", "UpdateAuthorizationPolicy").Msg("invalid authorization policy")
		helpers.RenderErrorJSON(w, hub.ErrInvalidInput)
		return
	}
	orgName := chi.URLParam(r, "orgName")
	if err := h.orgManager.UpdateAuthorizationPolicy(r.Context(), orgName, policy); err != nil {
		h.logger.Error().Err(err).Str("method", "UpdateAuthorizationPolicy").Send()
		helpers.RenderErrorJSON(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// GetUserAllowedActions is an http handler that returns the actions the
// requesting user is allowed to perform in the provided organization.
func (h *Handlers) GetUserAllowedActions(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(hub.UserIDKey).(string)
	orgName := chi.URLParam(r, "orgName")
	actions, err := h.az.GetAllowedActions(r.Context(), userID, orgName)
	if err != nil {
		h.logger.Error().Err(err).Str("method", "GetUserAllowedActions").Send()
		helpers.RenderErrorJSON(w, err)
		return
	}
	dataJSON, _ := json.Marshal(actions)
	helpers.RenderJSON(w, dataJSON, 0, http.StatusOK)
}
