package apikey

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
)

// Handlers represents a group of http handlers in charge of handling api keys
// operations.
type Handlers struct {
	apiKeyManager hub.APIKeyManager
	logger        zerolog.Logger
}

// NewHandlers creates a new Handlers instance.
func NewHandlers(apiKeyManager hub.APIKeyManager) *Handlers {
	return &Handlers{
		apiKeyManager: apiKeyManager,
		logger:        log.With().Str("handlers", "apikey").Logger(),
	}
}

// Add is an http handler that adds the provided api key to the database.
func (h *Handlers) Add(w http.ResponseWriter, r *http.Request) {
	akIN := &hub.APIKey{}
	if err := json.NewDecoder(r.Body).Decode(&akIN); err != nil {
		h.logger.Error().Err(err).Str("method", "Add").Msg(hub.ErrInvalidInput.Error())
		helpers.RenderErrorJSON(w, hub.ErrInvalidInput)
		return
	}
	akOUT, err := h.apiKeyManager.Add(r.Context(), akIN)
	if err != nil {
		h.logger.Error().Err(err).Str("method", "Add").Send()
		helpers.RenderErrorJSON(w, err)
		return
	}
	akOUTJSON, _ := json.Marshal(akOUT)
	helpers.RenderJSON(w, akOUTJSON, 0, http.StatusCreated)
}

// Delete is an http handler that deletes the provided api key from the database.
func (h *Handlers) Delete(w http.ResponseWriter, r *http.Request) {
	apiKeyID := chi.URLParam(r, "apiKeyID")
	if err := h.apiKeyManager.Delete(r.Context(), apiKeyID); err != nil {
		h.logger.Error().Err(err).Str("method", "Delete").Send()
		helpers.RenderErrorJSON(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// Get is an http handler that returns the requested api key.
func (h *Handlers) Get(w http.ResponseWriter, r *http.Request) {
	apiKeyID := chi.URLParam(r, "apiKeyID")
	dataJSON, err := h.apiKeyManager.GetJSON(r.Context(), apiKeyID)
	if err != nil {
		h.logger.Error().Err(err).Str("method", "Get").Send()
		helpers.RenderErrorJSON(w, err)
		return
	}
	helpers.RenderJSON(w, dataJSON, 0, http.StatusOK)
}

// GetOwnedByUser is an http handler that returns the api keys owned by the
// user doing the request.
func (h *Handlers) GetOwnedByUser(w http.ResponseWriter, r *http.Request) {
	p, err := helpers.GetPagination(r.URL.Query(), helpers.PaginationDefaultLimit, helpers.PaginationMaxLimit)
	if err != nil {
		err = fmt.Errorf("%w: %w", hub.ErrInvalidInput, err)
		h.logger.Error().Err(err).Str("query", r.URL.RawQuery).Str("method", "GetOwnedByUser").Send()
		helpers.RenderErrorJSON(w, err)
		return
	}
	result, err := h.apiKeyManager.GetOwnedByUserJSON(r.Context(), p)
	if err != nil {
		h.logger.Error().Err(err).Str("method", "GetOwnedByUser").Send()
		helpers.RenderErrorJSON(w, err)
		return
	}
	w.Header().Set(helpers.PaginationTotalCount, strconv.Itoa(result.TotalCount))
	helpers.RenderJSON(w, result.Data, 0, http.StatusOK)
}

// Update is an http handler that updates the provided api key in the database.
func (h *Handlers) Update(w http.ResponseWriter, r *http.Request) {
	ak := &hub.APIKey{}
	if err := json.NewDecoder(r.Body).Decode(&ak); err != nil {
		h.logger.Error().Err(err).Str("method", "Update").Msg(hub.ErrInvalidInput.Error())
		helpers.RenderErrorJSON(w, hub.ErrInvalidInput)
		return
	}
	ak.APIKeyID = chi.URLParam(r, "apiKeyID")
	if err := h.apiKeyManager.Update(r.Context(), ak); err != nil {
		h.logger.Error().Err(err).Str("method", "Update").Send()
		helpers.RenderErrorJSON(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
