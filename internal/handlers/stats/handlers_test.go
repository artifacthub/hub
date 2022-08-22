package stats

import (
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"github.com/artifacthub/hub/internal/handlers/helpers"
	"github.com/artifacthub/hub/internal/stats"
	"github.com/artifacthub/hub/internal/tests"
	"github.com/rs/zerolog"
	"github.com/stretchr/testify/assert"
)

func TestMain(m *testing.M) {
	zerolog.SetGlobalLevel(zerolog.Disabled)
	os.Exit(m.Run())
}

func TestGet(t *testing.T) {
	t.Run("error getting stats", func(t *testing.T) {
		t.Parallel()
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)

		hw := newHandlersWrapper()
		hw.sm.On("GetJSON", r.Context()).Return(nil, tests.ErrFakeDB)
		hw.h.Get(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
		hw.sm.AssertExpectations(t)
	})

	t.Run("get stats succeeded", func(t *testing.T) {
		t.Parallel()
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)

		hw := newHandlersWrapper()
		hw.sm.On("GetJSON", r.Context()).Return([]byte("dataJSON"), nil)
		hw.h.Get(w, r)
		resp := w.Result()
		defer resp.Body.Close()
		h := resp.Header
		data, _ := io.ReadAll(resp.Body)

		assert.Equal(t, http.StatusOK, resp.StatusCode)
		assert.Equal(t, "application/json", h.Get("Content-Type"))
		assert.Equal(t, helpers.BuildCacheControlHeader(6*time.Hour), h.Get("Cache-Control"))
		assert.Equal(t, []byte("dataJSON"), data)
		hw.sm.AssertExpectations(t)
	})
}

type handlersWrapper struct {
	sm *stats.ManagerMock
	h  *Handlers
}

func newHandlersWrapper() *handlersWrapper {
	sm := &stats.ManagerMock{}

	return &handlersWrapper{
		sm: sm,
		h:  NewHandlers(sm),
	}
}
