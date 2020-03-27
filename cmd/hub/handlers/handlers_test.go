package handlers

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/artifacthub/hub/internal/api"
	"github.com/artifacthub/hub/internal/tests"
	"github.com/go-chi/chi"
	"github.com/rs/zerolog"
	"github.com/spf13/viper"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

func TestMain(m *testing.M) {
	zerolog.SetGlobalLevel(zerolog.Disabled)
	os.Exit(m.Run())
}

func TestCheckAvailability(t *testing.T) {
	t.Run("invalid resource kind", func(t *testing.T) {
		hw := newHandlersWrapper()

		w := httptest.NewRecorder()
		r, _ := http.NewRequest("HEAD", "/?v=value", nil)
		rctx := &chi.Context{
			URLParams: chi.RouteParams{
				Keys:   []string{"resourceKind"},
				Values: []string{"invalidKind"},
			},
		}
		r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))
		hw.h.CheckAvailability(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
	})

	t.Run("invalid value", func(t *testing.T) {
		hw := newHandlersWrapper()

		w := httptest.NewRecorder()
		r, _ := http.NewRequest("HEAD", "/", nil)
		rctx := &chi.Context{
			URLParams: chi.RouteParams{
				Keys:   []string{"resourceKind"},
				Values: []string{"userAlias"},
			},
		}
		r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))
		hw.h.CheckAvailability(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
	})

	t.Run("valid resource kind", func(t *testing.T) {
		t.Run("database query succeeded", func(t *testing.T) {
			testCases := []struct {
				resourceKind string
				dbQuery      string
				available    bool
			}{
				{
					"userAlias",
					`select user_id from "user" where alias = $1`,
					true,
				},
				{
					"chartRepositoryName",
					`select chart_repository_id from chart_repository where name = $1`,
					true,
				},
				{
					"chartRepositoryURL",
					`select chart_repository_id from chart_repository where url = $1`,
					false,
				},
			}
			for _, tc := range testCases {
				tc := tc
				t.Run(fmt.Sprintf("resource kind: %s", tc.resourceKind), func(t *testing.T) {
					tc.dbQuery = fmt.Sprintf("select not exists (%s)", tc.dbQuery)
					hw := newHandlersWrapper()
					hw.db.On("QueryRow", tc.dbQuery, mock.Anything).Return(tc.available, nil)

					w := httptest.NewRecorder()
					r, _ := http.NewRequest("HEAD", "/?v=value", nil)
					rctx := &chi.Context{
						URLParams: chi.RouteParams{
							Keys:   []string{"resourceKind"},
							Values: []string{tc.resourceKind},
						},
					}
					r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))
					hw.h.CheckAvailability(w, r)
					resp := w.Result()
					defer resp.Body.Close()

					if tc.available {
						assert.Equal(t, http.StatusNotFound, resp.StatusCode)
					} else {
						assert.Equal(t, http.StatusOK, resp.StatusCode)
					}
					hw.db.AssertExpectations(t)
				})
			}
		})

		t.Run("database query failed", func(t *testing.T) {
			hw := newHandlersWrapper()
			dbQuery := `select not exists (select user_id from "user" where alias = $1)`
			hw.db.On("QueryRow", dbQuery, mock.Anything).Return(false, tests.ErrFakeDatabaseFailure)

			w := httptest.NewRecorder()
			r, _ := http.NewRequest("HEAD", "/?v=value", nil)
			rctx := &chi.Context{
				URLParams: chi.RouteParams{
					Keys:   []string{"resourceKind"},
					Values: []string{"userAlias"},
				},
			}
			r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))
			hw.h.CheckAvailability(w, r)
			resp := w.Result()
			defer resp.Body.Close()

			assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
			hw.db.AssertExpectations(t)
		})
	})
}

type handlersWrapper struct {
	db *tests.DBMock
	h  *Handlers
}

func newHandlersWrapper() *handlersWrapper {
	cfg := viper.New()
	db := &tests.DBMock{}
	hubAPI := api.New(db, nil)

	return &handlersWrapper{
		db: db,
		h:  Setup(cfg, hubAPI, nil),
	}
}
