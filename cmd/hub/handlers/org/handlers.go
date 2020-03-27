package org

import (
	"encoding/json"
	"net/http"
	"regexp"

	"github.com/artifacthub/hub/cmd/hub/handlers/helpers"
	"github.com/artifacthub/hub/internal/api"
	"github.com/artifacthub/hub/internal/hub"
	"github.com/go-chi/chi"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
)

// organizationNameRE is a regexp used to validate an organization name.
var organizationNameRE = regexp.MustCompile(`^[a-z0-9-]+$`)

// Handlers represents a group of http handlers in charge of handling
// organizations operations.
type Handlers struct {
	hubAPI *api.API
	logger zerolog.Logger
}

// NewHandlers creates a new Handlers instance.
func NewHandlers(hubAPI *api.API) *Handlers {
	return &Handlers{
		hubAPI: hubAPI,
		logger: log.With().Str("handlers", "org").Logger(),
	}
}

// Add is an http handler that adds the provided organization to the database.
func (h *Handlers) Add(w http.ResponseWriter, r *http.Request) {
	org := &hub.Organization{}
	if err := json.NewDecoder(r.Body).Decode(&org); err != nil {
		h.logger.Error().Err(err).Str("method", "Add").Msg("invalid organization")
		http.Error(w, "organization provided is not valid", http.StatusBadRequest)
		return
	}
	if org.Name == "" {
		http.Error(w, "organization name must be provided", http.StatusBadRequest)
		return
	}
	if !organizationNameRE.MatchString(org.Name) {
		http.Error(w, "invalid chart repository name", http.StatusBadRequest)
		return
	}
	if err := h.hubAPI.Organizations.Add(r.Context(), org); err != nil {
		h.logger.Error().Err(err).Str("method", "Add").Send()
		http.Error(w, "", http.StatusInternalServerError)
		return
	}
}

// AddMember is an http handler that adds a member to the provided organization.
func (h *Handlers) AddMember(w http.ResponseWriter, r *http.Request) {
	orgName := chi.URLParam(r, "orgName")
	userAlias := chi.URLParam(r, "userAlias")
	baseURL := helpers.GetBaseURL(r)
	err := h.hubAPI.Organizations.AddMember(r.Context(), orgName, userAlias, baseURL)
	if err != nil {
		h.logger.Error().Err(err).Str("method", "AddMember").Send()
		http.Error(w, "", http.StatusInternalServerError)
		return
	}
}

// ConfirmMembership is an http handler used to confirm a user's membership to
// an organization.
func (h *Handlers) ConfirmMembership(w http.ResponseWriter, r *http.Request) {
	orgName := chi.URLParam(r, "orgName")
	if err := h.hubAPI.Organizations.ConfirmMembership(r.Context(), orgName); err != nil {
		h.logger.Error().Err(err).Str("method", "ConfirmMembership").Send()
		http.Error(w, "", http.StatusInternalServerError)
		return
	}
}

// DeleteMember is an http handler that deletes a member from the provided
// organization.
func (h *Handlers) DeleteMember(w http.ResponseWriter, r *http.Request) {
	orgName := chi.URLParam(r, "orgName")
	userAlias := chi.URLParam(r, "userAlias")
	if err := h.hubAPI.Organizations.DeleteMember(r.Context(), orgName, userAlias); err != nil {
		h.logger.Error().Err(err).Str("method", "DeleteMember").Send()
		http.Error(w, "", http.StatusInternalServerError)
		return
	}
}

// GetByUser is an http handler that returns the organizations the user doing
// the request belongs to.
func (h *Handlers) GetByUser(w http.ResponseWriter, r *http.Request) {
	jsonData, err := h.hubAPI.Organizations.GetByUserJSON(r.Context())
	if err != nil {
		h.logger.Error().Err(err).Str("method", "GetByUser").Send()
		http.Error(w, "", http.StatusInternalServerError)
		return
	}
	helpers.RenderJSON(w, jsonData, 0)
}

// GetMembers is an http handler that returns the members of the provided
// organization.
func (h *Handlers) GetMembers(w http.ResponseWriter, r *http.Request) {
	orgName := chi.URLParam(r, "orgName")
	jsonData, err := h.hubAPI.Organizations.GetMembersJSON(r.Context(), orgName)
	if err != nil {
		h.logger.Error().Err(err).Str("method", "GetMembers").Send()
		http.Error(w, "", http.StatusInternalServerError)
		return
	}
	helpers.RenderJSON(w, jsonData, 0)
}

// Update is an http handler that updates the provided organization in the
// database.
func (h *Handlers) Update(w http.ResponseWriter, r *http.Request) {
	org := &hub.Organization{}
	if err := json.NewDecoder(r.Body).Decode(&org); err != nil {
		h.logger.Error().Err(err).Str("method", "Update").Msg("invalid organization")
		http.Error(w, "organization provided is not valid", http.StatusBadRequest)
		return
	}
	org.Name = chi.URLParam(r, "orgName")
	if err := h.hubAPI.Organizations.Update(r.Context(), org); err != nil {
		h.logger.Error().Err(err).Str("method", "Update").Send()
		http.Error(w, "", http.StatusInternalServerError)
		return
	}
}
