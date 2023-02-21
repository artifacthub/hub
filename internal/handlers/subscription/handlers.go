package subscription

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

// Handlers represents a group of http handlers in charge of handling
// subscriptions operations.
type Handlers struct {
	subscriptionManager hub.SubscriptionManager
	logger              zerolog.Logger
}

// NewHandlers creates a new Handlers instance.
func NewHandlers(subscriptionManager hub.SubscriptionManager) *Handlers {
	return &Handlers{
		subscriptionManager: subscriptionManager,
		logger:              log.With().Str("handlers", "subscription").Logger(),
	}
}

// Add is an http handler that adds the provided subscription to the database.
func (h *Handlers) Add(w http.ResponseWriter, r *http.Request) {
	s := &hub.Subscription{}
	if err := json.NewDecoder(r.Body).Decode(&s); err != nil {
		h.logger.Error().Err(err).Str("method", "Add").Msg("invalid subscription")
		helpers.RenderErrorJSON(w, hub.ErrInvalidInput)
		return
	}
	if err := h.subscriptionManager.Add(r.Context(), s); err != nil {
		h.logger.Error().Err(err).Str("method", "Add").Send()
		helpers.RenderErrorJSON(w, err)
		return
	}
	w.WriteHeader(http.StatusCreated)
}

// AddOptOut is an http handler that adds the provided opt-out to the database.
func (h *Handlers) AddOptOut(w http.ResponseWriter, r *http.Request) {
	o := &hub.OptOut{}
	if err := json.NewDecoder(r.Body).Decode(&o); err != nil {
		h.logger.Error().Err(err).Str("method", "AddOptOut").Msg("invalid opt-out entry")
		helpers.RenderErrorJSON(w, hub.ErrInvalidInput)
		return
	}
	if err := h.subscriptionManager.AddOptOut(r.Context(), o); err != nil {
		h.logger.Error().Err(err).Str("method", "AddOptOut").Send()
		helpers.RenderErrorJSON(w, err)
		return
	}
	w.WriteHeader(http.StatusCreated)
}

// Delete is an http handler that removes the provided subscription from the
// database.
func (h *Handlers) Delete(w http.ResponseWriter, r *http.Request) {
	eventKind, err := strconv.Atoi(r.FormValue("event_kind"))
	if err != nil {
		errMsg := "invalid event kind"
		h.logger.Error().Err(err).Str("method", "Delete").Msg(errMsg)
		helpers.RenderErrorJSON(w, fmt.Errorf("%w: %s", hub.ErrInvalidInput, errMsg))
		return
	}
	s := &hub.Subscription{
		PackageID: r.FormValue("package_id"),
		EventKind: hub.EventKind(eventKind),
	}
	if err := h.subscriptionManager.Delete(r.Context(), s); err != nil {
		h.logger.Error().Err(err).Str("method", "Delete").Send()
		helpers.RenderErrorJSON(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// DeleteOptOut is an http handler that removes the provided opt-out from the
// database.
func (h *Handlers) DeleteOptOut(w http.ResponseWriter, r *http.Request) {
	optOutID := chi.URLParam(r, "optOutID")
	if err := h.subscriptionManager.DeleteOptOut(r.Context(), optOutID); err != nil {
		h.logger.Error().Err(err).Str("method", "DeleteOptOut").Send()
		helpers.RenderErrorJSON(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// GetByPackage is an http handler that returns the subscriptions a user has
// for a given package.
func (h *Handlers) GetByPackage(w http.ResponseWriter, r *http.Request) {
	packageID := chi.URLParam(r, "packageID")
	dataJSON, err := h.subscriptionManager.GetByPackageJSON(r.Context(), packageID)
	if err != nil {
		h.logger.Error().Err(err).Str("method", "GetByPackage").Send()
		helpers.RenderErrorJSON(w, err)
		return
	}
	helpers.RenderJSON(w, dataJSON, 0, http.StatusOK)
}

// GetByUser is an http handler that returns the subscriptions of the user
// doing the request.
func (h *Handlers) GetByUser(w http.ResponseWriter, r *http.Request) {
	p, err := helpers.GetPagination(r.URL.Query(), helpers.PaginationDefaultLimit, helpers.PaginationMaxLimit)
	if err != nil {
		err = fmt.Errorf("%w: %w", hub.ErrInvalidInput, err)
		h.logger.Error().Err(err).Str("query", r.URL.RawQuery).Str("method", "GetByUser").Send()
		helpers.RenderErrorJSON(w, err)
		return
	}
	result, err := h.subscriptionManager.GetByUserJSON(r.Context(), p)
	if err != nil {
		h.logger.Error().Err(err).Str("method", "GetByUser").Send()
		helpers.RenderErrorJSON(w, err)
		return
	}
	w.Header().Set(helpers.PaginationTotalCount, strconv.Itoa(result.TotalCount))
	helpers.RenderJSON(w, result.Data, 0, http.StatusOK)
}

// GetOptOutList is an http handler that returns the opt-out entries of the
// user doing the request.
func (h *Handlers) GetOptOutList(w http.ResponseWriter, r *http.Request) {
	p, err := helpers.GetPagination(r.URL.Query(), helpers.PaginationDefaultLimit, helpers.PaginationMaxLimit)
	if err != nil {
		err = fmt.Errorf("%w: %w", hub.ErrInvalidInput, err)
		h.logger.Error().Err(err).Str("query", r.URL.RawQuery).Str("method", "GetOptOutList").Send()
		helpers.RenderErrorJSON(w, err)
		return
	}
	result, err := h.subscriptionManager.GetOptOutListJSON(r.Context(), p)
	if err != nil {
		h.logger.Error().Err(err).Str("method", "GetOptOutList").Send()
		helpers.RenderErrorJSON(w, err)
		return
	}
	w.Header().Set(helpers.PaginationTotalCount, strconv.Itoa(result.TotalCount))
	helpers.RenderJSON(w, result.Data, 0, http.StatusOK)
}
