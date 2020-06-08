package org

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/artifacthub/hub/cmd/hub/handlers/helpers"
	"github.com/artifacthub/hub/internal/hub"
	"github.com/go-chi/chi"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
	"github.com/spf13/viper"
)

// Handlers represents a group of http handlers in charge of handling
// organizations operations.
type Handlers struct {
	orgManager hub.OrganizationManager
	cfg        *viper.Viper
	logger     zerolog.Logger
}

// NewHandlers creates a new Handlers instance.
func NewHandlers(orgManager hub.OrganizationManager, cfg *viper.Viper) *Handlers {
	return &Handlers{
		orgManager: orgManager,
		cfg:        cfg,
		logger:     log.With().Str("handlers", "org").Logger(),
	}
}

// Add is an http handler that adds the provided organization to the database.
func (h *Handlers) Add(w http.ResponseWriter, r *http.Request) {
	o := &hub.Organization{}
	if err := json.NewDecoder(r.Body).Decode(&o); err != nil {
		h.logger.Error().Err(err).Str("method", "Add").Msg("invalid organization")
		http.Error(w, "organization provided is not valid", http.StatusBadRequest)
		return
	}
	if err := h.orgManager.Add(r.Context(), o); err != nil {
		h.logger.Error().Err(err).Str("method", "Add").Send()
		if errors.Is(err, hub.ErrInvalidInput) {
			http.Error(w, err.Error(), http.StatusBadRequest)
		} else {
			http.Error(w, "", http.StatusInternalServerError)
		}
	}
}

// AddMember is an http handler that adds a member to the provided organization.
func (h *Handlers) AddMember(w http.ResponseWriter, r *http.Request) {
	orgName := chi.URLParam(r, "orgName")
	userAlias := chi.URLParam(r, "userAlias")
	baseURL := h.cfg.GetString("server.baseURL")
	err := h.orgManager.AddMember(r.Context(), orgName, userAlias, baseURL)
	if err != nil {
		h.logger.Error().Err(err).Str("method", "AddMember").Send()
		switch {
		case errors.Is(err, hub.ErrInvalidInput):
			http.Error(w, err.Error(), http.StatusBadRequest)
		case errors.Is(err, hub.ErrInsufficientPrivilege):
			http.Error(w, "", http.StatusForbidden)
		default:
			http.Error(w, "", http.StatusInternalServerError)
		}
	}
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
		if errors.Is(err, hub.ErrInvalidInput) {
			http.Error(w, err.Error(), http.StatusBadRequest)
		} else {
			http.Error(w, "", http.StatusInternalServerError)
		}
		return
	}
	if available {
		w.WriteHeader(http.StatusNotFound)
	}
}

// ConfirmMembership is an http handler used to confirm a user's membership to
// an organization.
func (h *Handlers) ConfirmMembership(w http.ResponseWriter, r *http.Request) {
	orgName := chi.URLParam(r, "orgName")
	if err := h.orgManager.ConfirmMembership(r.Context(), orgName); err != nil {
		h.logger.Error().Err(err).Str("method", "ConfirmMembership").Send()
		if errors.Is(err, hub.ErrInvalidInput) {
			http.Error(w, err.Error(), http.StatusBadRequest)
		} else {
			http.Error(w, "", http.StatusInternalServerError)
		}
	}
}

// DeleteMember is an http handler that deletes a member from the provided
// organization.
func (h *Handlers) DeleteMember(w http.ResponseWriter, r *http.Request) {
	orgName := chi.URLParam(r, "orgName")
	userAlias := chi.URLParam(r, "userAlias")
	if err := h.orgManager.DeleteMember(r.Context(), orgName, userAlias); err != nil {
		h.logger.Error().Err(err).Str("method", "DeleteMember").Send()
		switch {
		case errors.Is(err, hub.ErrInvalidInput):
			http.Error(w, err.Error(), http.StatusBadRequest)
		case errors.Is(err, hub.ErrInsufficientPrivilege):
			http.Error(w, "", http.StatusForbidden)
		default:
			http.Error(w, "", http.StatusInternalServerError)
		}
	}
}

// Get is an http handler that returns the organization requested.
func (h *Handlers) Get(w http.ResponseWriter, r *http.Request) {
	orgName := chi.URLParam(r, "orgName")
	dataJSON, err := h.orgManager.GetJSON(r.Context(), orgName)
	if err != nil {
		h.logger.Error().Err(err).Str("method", "Get").Send()
		if errors.Is(err, hub.ErrInvalidInput) {
			http.Error(w, err.Error(), http.StatusBadRequest)
		} else {
			http.Error(w, "", http.StatusInternalServerError)
		}
		return
	}
	helpers.RenderJSON(w, dataJSON, 0)
}

// GetByUser is an http handler that returns the organizations the user doing
// the request belongs to.
func (h *Handlers) GetByUser(w http.ResponseWriter, r *http.Request) {
	dataJSON, err := h.orgManager.GetByUserJSON(r.Context())
	if err != nil {
		h.logger.Error().Err(err).Str("method", "GetByUser").Send()
		http.Error(w, "", http.StatusInternalServerError)
		return
	}
	helpers.RenderJSON(w, dataJSON, 0)
}

// GetMembers is an http handler that returns the members of the provided
// organization.
func (h *Handlers) GetMembers(w http.ResponseWriter, r *http.Request) {
	orgName := chi.URLParam(r, "orgName")
	dataJSON, err := h.orgManager.GetMembersJSON(r.Context(), orgName)
	if err != nil {
		h.logger.Error().Err(err).Str("method", "GetMembers").Send()
		if errors.Is(err, hub.ErrInvalidInput) {
			http.Error(w, err.Error(), http.StatusBadRequest)
		} else {
			http.Error(w, "", http.StatusInternalServerError)
		}
		return
	}
	helpers.RenderJSON(w, dataJSON, 0)
}

// Update is an http handler that updates the provided organization in the
// database.
func (h *Handlers) Update(w http.ResponseWriter, r *http.Request) {
	o := &hub.Organization{}
	if err := json.NewDecoder(r.Body).Decode(&o); err != nil {
		h.logger.Error().Err(err).Str("method", "Update").Msg("invalid organization")
		http.Error(w, "organization provided is not valid", http.StatusBadRequest)
		return
	}
	o.Name = chi.URLParam(r, "orgName")
	if err := h.orgManager.Update(r.Context(), o); err != nil {
		h.logger.Error().Err(err).Str("method", "Update").Send()
		switch {
		case errors.Is(err, hub.ErrInvalidInput):
			http.Error(w, err.Error(), http.StatusBadRequest)
		case errors.Is(err, hub.ErrInsufficientPrivilege):
			http.Error(w, "", http.StatusForbidden)
		default:
			http.Error(w, "", http.StatusInternalServerError)
		}
	}
}
