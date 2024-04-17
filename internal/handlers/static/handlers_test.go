package static

import (
	"context"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path"
	"strings"
	"testing"

	"github.com/artifacthub/hub/internal/handlers/helpers"
	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/img"
	"github.com/go-chi/chi/v5"
	"github.com/rs/zerolog"
	"github.com/spf13/viper"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestMain(m *testing.M) {
	zerolog.SetGlobalLevel(zerolog.Disabled)
	os.Exit(m.Run())
}

func TestImage(t *testing.T) {
	rctx := &chi.Context{
		URLParams: chi.RouteParams{
			Keys:   []string{"image"},
			Values: []string{"imageID@2x"},
		},
	}

	t.Run("non existing image", func(t *testing.T) {
		t.Parallel()
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
		r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))

		hw := newHandlersWrapper()
		hw.is.On("GetImage", r.Context(), "imageID", "2x").Return(nil, hub.ErrNotFound)
		hw.h.Image(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusNotFound, resp.StatusCode)
		hw.is.AssertExpectations(t)
	})

	t.Run("other internal error", func(t *testing.T) {
		t.Parallel()
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
		r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))

		hw := newHandlersWrapper()
		hw.is.On("GetImage", r.Context(), "imageID", "2x").Return(nil, errors.New("internal error"))
		hw.h.Image(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
		hw.is.AssertExpectations(t)
	})

	t.Run("existing images (png and svg)", func(t *testing.T) {
		testCases := []struct {
			imgPath             string
			expectedContentType string
		}{
			{"testdata/image.png", "image/png"},
			{"testdata/image.svg", "image/svg+xml"},
		}
		for i, tc := range testCases {
			i := i
			tc := tc
			t.Run(fmt.Sprintf("Test %d: %s", i, tc.expectedContentType), func(t *testing.T) {
				t.Parallel()
				imgData, err := os.ReadFile(tc.imgPath)
				require.NoError(t, err)
				w := httptest.NewRecorder()
				r, _ := http.NewRequest("GET", "/", nil)
				r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))

				hw := newHandlersWrapper()
				hw.is.On("GetImage", r.Context(), "imageID", "2x").Return(imgData, nil)
				hw.h.Image(w, r)
				resp := w.Result()
				defer resp.Body.Close()
				h := resp.Header
				data, _ := io.ReadAll(resp.Body)

				assert.Equal(t, http.StatusOK, resp.StatusCode)
				assert.Equal(t, tc.expectedContentType, h.Get("Content-Type"))
				assert.Equal(t, helpers.BuildCacheControlHeader(StaticCacheMaxAge), h.Get("Cache-Control"))
				assert.Equal(t, imgData, data)
				hw.is.AssertExpectations(t)
			})
		}
	})
}

func TestIndex(t *testing.T) {
	t.Parallel()
	w := httptest.NewRecorder()
	r, _ := http.NewRequest("GET", "/", nil)

	hw := newHandlersWrapper()
	hw.h.Index(w, r)
	resp := w.Result()
	defer resp.Body.Close()
	h := resp.Header
	data, _ := io.ReadAll(resp.Body)

	assert.Equal(t, http.StatusOK, resp.StatusCode)
	assert.Equal(t, helpers.BuildCacheControlHeader(indexCacheMaxAge), h.Get("Cache-Control"))
	assert.Equal(t, []byte("title:Artifact Hub\ndescription:Find, install and publish Cloud Native packages\ngaTrackingID:1234\n"), data)
}

func TestSaveImage(t *testing.T) {
	fakeSaveImageError := errors.New("fake save image error")

	t.Run("imageStore.SaveImage failed", func(t *testing.T) {
		t.Parallel()
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("POST", "/", strings.NewReader("imageData"))

		hw := newHandlersWrapper()
		hw.is.On("SaveImage", r.Context(), []byte("imageData")).Return("", fakeSaveImageError)
		hw.h.SaveImage(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
		hw.is.AssertExpectations(t)
	})

	t.Run("imageStore.SaveImage succeeded", func(t *testing.T) {
		t.Parallel()
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("POST", "/", strings.NewReader("imageData"))

		hw := newHandlersWrapper()
		hw.is.On("SaveImage", r.Context(), []byte("imageData")).Return("imageID", nil)
		hw.h.SaveImage(w, r)
		resp := w.Result()
		defer resp.Body.Close()
		h := resp.Header
		data, _ := io.ReadAll(resp.Body)

		assert.Equal(t, http.StatusOK, resp.StatusCode)
		assert.Equal(t, "application/json", h.Get("Content-Type"))
		assert.Equal(t, helpers.BuildCacheControlHeader(0), h.Get("Cache-Control"))
		assert.Equal(t, []byte(`{"image_id": "imageID"}`), data)
		hw.is.AssertExpectations(t)
	})
}

func TestServeStaticFile(t *testing.T) {
	hw := newHandlersWrapper()
	r := chi.NewRouter()
	staticFilesPath := path.Join(hw.h.cfg.GetString("server.webBuildPath"), "static")
	FileServer(r, "/static", staticFilesPath, StaticCacheMaxAge)
	s := httptest.NewServer(r)
	defer s.Close()

	t.Run("non existing static file", func(t *testing.T) {
		resp, err := http.Get(s.URL + "/static/test.js")
		require.NoError(t, err)
		defer resp.Body.Close()
		h := resp.Header

		assert.Empty(t, h.Get("Cache-Control"))
		assert.Equal(t, http.StatusNotFound, resp.StatusCode)
	})

	t.Run("existing static file", func(t *testing.T) {
		resp, err := http.Get(s.URL + "/static/test.css")
		require.NoError(t, err)
		defer resp.Body.Close()
		h := resp.Header
		data, _ := io.ReadAll(resp.Body)

		assert.Equal(t, http.StatusOK, resp.StatusCode)
		assert.Equal(t, helpers.BuildCacheControlHeader(StaticCacheMaxAge), h.Get("Cache-Control"))
		assert.Equal(t, []byte("testCssData\n"), data)
	})
}

type handlersWrapper struct {
	cfg *viper.Viper
	is  *img.StoreMock
	h   *Handlers
}

func newHandlersWrapper() *handlersWrapper {
	cfg := viper.New()
	cfg.Set("server.webBuildPath", "testdata")
	cfg.Set("analytics.gaTrackingID", "1234")
	cfg.Set("theme.siteName", "Artifact Hub")
	is := &img.StoreMock{}

	return &handlersWrapper{
		cfg: cfg,
		is:  is,
		h:   NewHandlers(cfg, is),
	}
}
