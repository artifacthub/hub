package static

import (
	"errors"
	"fmt"
	"io/ioutil"
	"net/http"
	"net/http/httptest"
	"os"
	"path"
	"strings"
	"testing"

	"github.com/artifacthub/hub/cmd/hub/handlers/helpers"
	"github.com/artifacthub/hub/internal/img"
	"github.com/go-chi/chi"
	"github.com/rs/zerolog"
	"github.com/spf13/viper"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

func TestMain(m *testing.M) {
	zerolog.SetGlobalLevel(zerolog.Disabled)
	os.Exit(m.Run())
}

func TestImage(t *testing.T) {
	t.Run("non existing image", func(t *testing.T) {
		hw := newHandlersWrapper()
		hw.is.On("GetImage", mock.Anything, mock.Anything, mock.Anything).
			Return(nil, img.ErrNotFound)

		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
		hw.h.Image(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusNotFound, resp.StatusCode)
		hw.is.AssertExpectations(t)
	})

	t.Run("other internal error", func(t *testing.T) {
		hw := newHandlersWrapper()
		hw.is.On("GetImage", mock.Anything, mock.Anything, mock.Anything).
			Return(nil, errors.New("internal error"))

		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
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
				imgData, err := ioutil.ReadFile(tc.imgPath)
				require.NoError(t, err)
				hw := newHandlersWrapper()
				hw.is.On("GetImage", mock.Anything, mock.Anything, mock.Anything).
					Return(imgData, nil)

				w := httptest.NewRecorder()
				r, _ := http.NewRequest("GET", "/", nil)
				hw.h.Image(w, r)
				resp := w.Result()
				defer resp.Body.Close()
				h := resp.Header
				data, _ := ioutil.ReadAll(resp.Body)

				assert.Equal(t, http.StatusOK, resp.StatusCode)
				assert.Equal(t, tc.expectedContentType, h.Get("Content-Type"))
				assert.Equal(t, helpers.BuildCacheControlHeader(staticCacheMaxAge), h.Get("Cache-Control"))
				assert.Equal(t, imgData, data)
				hw.is.AssertExpectations(t)
			})
		}
	})
}

func TestSaveImage(t *testing.T) {
	fakeSaveImageError := errors.New("fake save image error")

	t.Run("imageStore.SaveImage failed", func(t *testing.T) {
		hw := newHandlersWrapper()
		hw.is.On("SaveImage", mock.Anything, mock.Anything).Return("", fakeSaveImageError)

		w := httptest.NewRecorder()
		r, _ := http.NewRequest("POST", "/", strings.NewReader("imageData"))
		hw.h.SaveImage(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
		hw.is.AssertExpectations(t)
	})

	t.Run("imageStore.SaveImage succeeded", func(t *testing.T) {
		hw := newHandlersWrapper()
		hw.is.On("SaveImage", mock.Anything, mock.Anything).Return("imageID", nil)

		w := httptest.NewRecorder()
		r, _ := http.NewRequest("POST", "/", strings.NewReader("imageData"))
		hw.h.SaveImage(w, r)
		resp := w.Result()
		defer resp.Body.Close()
		h := resp.Header
		data, _ := ioutil.ReadAll(resp.Body)

		assert.Equal(t, http.StatusOK, resp.StatusCode)
		assert.Equal(t, "application/json", h.Get("Content-Type"))
		assert.Equal(t, helpers.BuildCacheControlHeader(0), h.Get("Cache-Control"))
		assert.Equal(t, []byte(`{"image_id": "imageID"}`), data)
		hw.is.AssertExpectations(t)
	})
}

func TestServeIndex(t *testing.T) {
	hw := newHandlersWrapper()

	w := httptest.NewRecorder()
	r, _ := http.NewRequest("GET", "/", nil)
	hw.h.ServeIndex(w, r)
	resp := w.Result()
	defer resp.Body.Close()
	h := resp.Header
	data, _ := ioutil.ReadAll(resp.Body)

	assert.Equal(t, http.StatusOK, resp.StatusCode)
	assert.Equal(t, helpers.BuildCacheControlHeader(indexCacheMaxAge), h.Get("Cache-Control"))
	assert.Equal(t, []byte("indexHtmlData\n"), data)
}

func TestServeStaticFile(t *testing.T) {
	hw := newHandlersWrapper()
	r := chi.NewRouter()
	staticFilesPath := path.Join(hw.h.cfg.GetString("server.webBuildPath"), "static")
	FileServer(r, "/static", http.Dir(staticFilesPath))
	s := httptest.NewServer(r)
	defer s.Close()

	t.Run("non existing static file", func(t *testing.T) {
		resp, err := http.Get(s.URL + "/static/test.js")
		require.NoError(t, err)
		defer resp.Body.Close()

		assert.Equal(t, http.StatusNotFound, resp.StatusCode)
	})

	t.Run("existing static file", func(t *testing.T) {
		resp, err := http.Get(s.URL + "/static/test.css")
		require.NoError(t, err)
		defer resp.Body.Close()
		h := resp.Header
		data, _ := ioutil.ReadAll(resp.Body)

		assert.Equal(t, http.StatusOK, resp.StatusCode)
		assert.Equal(t, helpers.BuildCacheControlHeader(staticCacheMaxAge), h.Get("Cache-Control"))
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
	is := &img.StoreMock{}

	return &handlersWrapper{
		cfg: cfg,
		is:  is,
		h:   NewHandlers(cfg, is),
	}
}
