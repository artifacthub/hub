package pkg

import (
	"context"
	"fmt"
	"io/ioutil"
	"net/http"
	"net/http/httptest"
	"os"
	"strconv"
	"testing"
	"time"

	"github.com/artifacthub/hub/cmd/hub/handlers/helpers"
	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/pkg"
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

func TestGet(t *testing.T) {
	t.Run("get package failed", func(t *testing.T) {
		testCases := []struct {
			pmErr              error
			expectedStatusCode int
		}{
			{
				hub.ErrInvalidInput,
				http.StatusBadRequest,
			},
			{
				hub.ErrNotFound,
				http.StatusNotFound,
			},
			{
				tests.ErrFakeDB,
				http.StatusInternalServerError,
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.pmErr.Error(), func(t *testing.T) {
				w := httptest.NewRecorder()
				r, _ := http.NewRequest("GET", "/", nil)
				r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))

				hw := newHandlersWrapper()
				hw.pm.On("GetJSON", r.Context(), mock.Anything).Return(nil, tc.pmErr)
				hw.h.Get(w, r)
				resp := w.Result()
				defer resp.Body.Close()

				assert.Equal(t, tc.expectedStatusCode, resp.StatusCode)
				hw.pm.AssertExpectations(t)
			})
		}
	})

	t.Run("get package succeeded", func(t *testing.T) {
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
		r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))

		hw := newHandlersWrapper()
		hw.pm.On("GetJSON", r.Context(), mock.Anything).Return([]byte("dataJSON"), nil)
		hw.h.Get(w, r)
		resp := w.Result()
		defer resp.Body.Close()
		h := resp.Header
		data, _ := ioutil.ReadAll(resp.Body)

		assert.Equal(t, http.StatusOK, resp.StatusCode)
		assert.Equal(t, "application/json", h.Get("Content-Type"))
		assert.Equal(t, helpers.BuildCacheControlHeader(helpers.DefaultAPICacheMaxAge), h.Get("Cache-Control"))
		assert.Equal(t, []byte("dataJSON"), data)
		hw.pm.AssertExpectations(t)
	})
}

func TestGetRandom(t *testing.T) {
	t.Run("get random packages succeeded", func(t *testing.T) {
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)

		hw := newHandlersWrapper()
		hw.pm.On("GetRandomJSON", r.Context()).Return([]byte("dataJSON"), nil)
		hw.h.GetRandom(w, r)
		resp := w.Result()
		defer resp.Body.Close()
		h := resp.Header
		data, _ := ioutil.ReadAll(resp.Body)

		assert.Equal(t, http.StatusOK, resp.StatusCode)
		assert.Equal(t, "application/json", h.Get("Content-Type"))
		assert.Equal(t, helpers.BuildCacheControlHeader(helpers.DefaultAPICacheMaxAge), h.Get("Cache-Control"))
		assert.Equal(t, []byte("dataJSON"), data)
		hw.pm.AssertExpectations(t)
	})

	t.Run("error getting random packages", func(t *testing.T) {
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)

		hw := newHandlersWrapper()
		hw.pm.On("GetRandomJSON", r.Context()).Return(nil, tests.ErrFakeDB)
		hw.h.GetRandom(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
		hw.pm.AssertExpectations(t)
	})
}

func TestGetSnapshotSecurityReport(t *testing.T) {
	rctx := &chi.Context{
		URLParams: chi.RouteParams{
			Keys:   []string{"packageID", "version"},
			Values: []string{"pkg1", "1.0.0"},
		},
	}

	t.Run("get snapshot security report succeeded", func(t *testing.T) {
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
		r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))

		hw := newHandlersWrapper()
		hw.pm.On("GetSnapshotSecurityReportJSON", r.Context(), "pkg1", "1.0.0").Return([]byte("dataJSON"), nil)
		hw.h.GetSnapshotSecurityReport(w, r)
		resp := w.Result()
		defer resp.Body.Close()
		h := resp.Header
		data, _ := ioutil.ReadAll(resp.Body)

		assert.Equal(t, http.StatusOK, resp.StatusCode)
		assert.Equal(t, "application/json", h.Get("Content-Type"))
		assert.Equal(t, helpers.BuildCacheControlHeader(30*time.Minute), h.Get("Cache-Control"))
		assert.Equal(t, []byte("dataJSON"), data)
		hw.pm.AssertExpectations(t)
	})

	t.Run("error getting snapshot security report", func(t *testing.T) {
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
		r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))

		hw := newHandlersWrapper()
		hw.pm.On("GetSnapshotSecurityReportJSON", r.Context(), "pkg1", "1.0.0").Return(nil, tests.ErrFakeDB)
		hw.h.GetSnapshotSecurityReport(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
		hw.pm.AssertExpectations(t)
	})
}

func TestGetStarredByUser(t *testing.T) {
	t.Run("get packages starred by user succeeded", func(t *testing.T) {
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
		r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))

		hw := newHandlersWrapper()
		hw.pm.On("GetStarredByUserJSON", r.Context()).Return([]byte("dataJSON"), nil)
		hw.h.GetStarredByUser(w, r)
		resp := w.Result()
		defer resp.Body.Close()
		h := resp.Header
		data, _ := ioutil.ReadAll(resp.Body)

		assert.Equal(t, http.StatusOK, resp.StatusCode)
		assert.Equal(t, "application/json", h.Get("Content-Type"))
		assert.Equal(t, helpers.BuildCacheControlHeader(0), h.Get("Cache-Control"))
		assert.Equal(t, []byte("dataJSON"), data)
		hw.pm.AssertExpectations(t)
	})

	t.Run("error getting packages starred by user", func(t *testing.T) {
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
		r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))

		hw := newHandlersWrapper()
		hw.pm.On("GetStarredByUserJSON", r.Context()).Return(nil, tests.ErrFakeDB)
		hw.h.GetStarredByUser(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
		hw.pm.AssertExpectations(t)
	})
}

func TestGetStars(t *testing.T) {
	rctx := &chi.Context{
		URLParams: chi.RouteParams{
			Keys:   []string{"packageID"},
			Values: []string{"packageID"},
		},
	}

	t.Run("get stars failed", func(t *testing.T) {
		testCases := []struct {
			err            error
			expectedStatus int
		}{
			{
				hub.ErrInvalidInput,
				http.StatusBadRequest,
			},
			{
				tests.ErrFakeDB,
				http.StatusInternalServerError,
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.err.Error(), func(t *testing.T) {
				w := httptest.NewRecorder()
				r, _ := http.NewRequest("GET", "/", nil)
				r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))
				r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))

				hw := newHandlersWrapper()
				hw.pm.On("GetStarsJSON", r.Context(), "packageID").Return(nil, tc.err)
				hw.h.GetStars(w, r)
				resp := w.Result()
				defer resp.Body.Close()

				assert.Equal(t, tc.expectedStatus, resp.StatusCode)
				hw.pm.AssertExpectations(t)
			})
		}
	})

	t.Run("get stars succeeded", func(t *testing.T) {
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
		r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))
		r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))

		hw := newHandlersWrapper()
		hw.pm.On("GetStarsJSON", r.Context(), "packageID").Return([]byte("dataJSON"), nil)
		hw.h.GetStars(w, r)
		resp := w.Result()
		defer resp.Body.Close()
		h := resp.Header
		data, _ := ioutil.ReadAll(resp.Body)

		assert.Equal(t, http.StatusOK, resp.StatusCode)
		assert.Equal(t, "application/json", h.Get("Content-Type"))
		assert.Equal(t, helpers.BuildCacheControlHeader(0), h.Get("Cache-Control"))
		assert.Equal(t, []byte("dataJSON"), data)
		hw.pm.AssertExpectations(t)
	})
}

func TestGetStats(t *testing.T) {
	t.Run("get stats succeeded", func(t *testing.T) {
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)

		hw := newHandlersWrapper()
		hw.pm.On("GetStatsJSON", r.Context()).Return([]byte("dataJSON"), nil)
		hw.h.GetStats(w, r)
		resp := w.Result()
		defer resp.Body.Close()
		h := resp.Header
		data, _ := ioutil.ReadAll(resp.Body)

		assert.Equal(t, http.StatusOK, resp.StatusCode)
		assert.Equal(t, "application/json", h.Get("Content-Type"))
		assert.Equal(t, helpers.BuildCacheControlHeader(helpers.DefaultAPICacheMaxAge), h.Get("Cache-Control"))
		assert.Equal(t, []byte("dataJSON"), data)
		hw.pm.AssertExpectations(t)
	})

	t.Run("error getting stats", func(t *testing.T) {
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)

		hw := newHandlersWrapper()
		hw.pm.On("GetStatsJSON", r.Context()).Return(nil, tests.ErrFakeDB)
		hw.h.GetStats(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
		hw.pm.AssertExpectations(t)
	})
}

func TestInjectIndexMeta(t *testing.T) {
	t.Run("get package failed", func(t *testing.T) {
		testCases := []struct {
			pmErr              error
			expectedStatusCode int
		}{
			{
				hub.ErrInvalidInput,
				http.StatusBadRequest,
			},
			{
				hub.ErrNotFound,
				http.StatusNotFound,
			},
			{
				tests.ErrFakeDB,
				http.StatusInternalServerError,
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.pmErr.Error(), func(t *testing.T) {
				w := httptest.NewRecorder()
				r, _ := http.NewRequest("GET", "/", nil)

				hw := newHandlersWrapper()
				hw.pm.On("Get", r.Context(), mock.Anything).Return(nil, tc.pmErr)
				hw.h.InjectIndexMeta(http.HandlerFunc(testsOK)).ServeHTTP(w, r)
				resp := w.Result()
				defer resp.Body.Close()

				assert.Equal(t, tc.expectedStatusCode, resp.StatusCode)
				hw.pm.AssertExpectations(t)
			})
		}
	})

	t.Run("get package succeeded", func(t *testing.T) {
		checkIndexMeta := func(expectedTitle, expectedDescription interface{}) http.HandlerFunc {
			return func(w http.ResponseWriter, r *http.Request) {
				assert.Equal(t, expectedTitle, r.Context().Value(hub.IndexMetaTitleKey).(string))
				assert.Equal(t, expectedDescription, r.Context().Value(hub.IndexMetaDescriptionKey).(string))
			}
		}
		testCases := []struct {
			p                   *hub.Package
			expectedTitle       string
			expectedDescription string
			expectedStatusCode  int
		}{
			{
				&hub.Package{
					NormalizedName: "pkg1",
					Version:        "1.0.0",
					Description:    "description",
					Repository: &hub.Repository{
						Name:             "repo1",
						OrganizationName: "org1",
					},
				},
				"pkg1 1.0.0 · org1/repo1",
				"description",
				http.StatusOK,
			},
			{
				&hub.Package{
					NormalizedName: "pkg1",
					Version:        "1.0.0",
					Repository: &hub.Repository{
						Name:      "repo1",
						UserAlias: "user1",
					},
				},
				"pkg1 1.0.0 · user1/repo1",
				"",
				http.StatusOK,
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.expectedDescription, func(t *testing.T) {
				w := httptest.NewRecorder()
				r, _ := http.NewRequest("GET", "/", nil)

				hw := newHandlersWrapper()
				hw.pm.On("Get", r.Context(), mock.Anything).Return(tc.p, nil)
				hw.h.InjectIndexMeta(checkIndexMeta(tc.expectedTitle, tc.expectedDescription)).ServeHTTP(w, r)
				resp := w.Result()
				defer resp.Body.Close()

				assert.Equal(t, tc.expectedStatusCode, resp.StatusCode)
				hw.pm.AssertExpectations(t)
			})
		}
	})
}

func TestRssFeed(t *testing.T) {
	os.Setenv("TZ", "")

	t.Run("error getting rss feed package", func(t *testing.T) {
		testCases := []struct {
			pmErr              error
			expectedStatusCode int
		}{
			{
				hub.ErrInvalidInput,
				http.StatusBadRequest,
			},
			{
				hub.ErrNotFound,
				http.StatusNotFound,
			},
			{
				tests.ErrFakeDB,
				http.StatusInternalServerError,
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.pmErr.Error(), func(t *testing.T) {
				w := httptest.NewRecorder()
				r, _ := http.NewRequest("GET", "/", nil)

				hw := newHandlersWrapper()
				hw.pm.On("Get", r.Context(), mock.Anything).Return(nil, tc.pmErr)
				hw.h.RssFeed(w, r)
				resp := w.Result()
				defer resp.Body.Close()

				assert.Equal(t, tc.expectedStatusCode, resp.StatusCode)
				hw.pm.AssertExpectations(t)
			})
		}
	})

	t.Run("rss feed built successfully", func(t *testing.T) {
		testCases := []struct {
			p                   *hub.Package
			expectedRssFeedData []byte
		}{
			{
				&hub.Package{
					PackageID:      "0001",
					NormalizedName: "pkg1",
					Description:    "description",
					Version:        "1.0.0",
					LogoImageID:    "0001",
					CreatedAt:      1592299234,
					AvailableVersions: []*hub.Version{
						{
							Version:   "1.0.0",
							CreatedAt: 1592299234,
						},
						{
							Version:   "0.0.9",
							CreatedAt: 1592299233,
						},
					},
					Maintainers: []*hub.Maintainer{
						{
							Name:  "name1",
							Email: "email1",
						},
					},
					Repository: &hub.Repository{
						Name:             "repo1",
						OrganizationName: "org1",
					},
				},
				[]byte(`<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>org1/pkg1 (Artifact Hub)</title>
    <link>baseURL</link>
    <description>description</description>
    <managingEditor>email1 (name1)</managingEditor>
    <image>
      <url>baseURL/image/0001@4x</url>
      <title>logo</title>
      <link>baseURL</link>
    </image>
    <item>
      <title>1.0.0</title>
      <link>baseURL/packages/helm/repo1/pkg1/1.0.0</link>
      <description>pkg1 1.0.0</description>
      <guid>0001#1.0.0</guid>
      <pubDate>Tue, 16 Jun 2020 09:20:34 +0000</pubDate>
    </item>
    <item>
      <title>0.0.9</title>
      <link>baseURL/packages/helm/repo1/pkg1/0.0.9</link>
      <description>pkg1 0.0.9</description>
      <guid>0001#0.0.9</guid>
      <pubDate>Tue, 16 Jun 2020 09:20:33 +0000</pubDate>
    </item>
  </channel>
</rss>`),
			},
		}
		for i, tc := range testCases {
			tc := tc
			t.Run(strconv.Itoa(i), func(t *testing.T) {
				w := httptest.NewRecorder()
				r, _ := http.NewRequest("GET", "/", nil)

				hw := newHandlersWrapper()
				hw.pm.On("Get", r.Context(), mock.Anything).Return(tc.p, nil)
				hw.h.RssFeed(w, r)
				resp := w.Result()
				defer resp.Body.Close()
				h := resp.Header
				data, _ := ioutil.ReadAll(resp.Body)

				assert.Equal(t, http.StatusOK, resp.StatusCode)
				assert.Equal(t, "text/xml; charset=utf-8", h.Get("Content-Type"))
				assert.Equal(t, helpers.BuildCacheControlHeader(helpers.DefaultAPICacheMaxAge), h.Get("Cache-Control"))
				assert.Equal(t, tc.expectedRssFeedData, data)
				hw.pm.AssertExpectations(t)
			})
		}
	})
}

func TestSearch(t *testing.T) {
	t.Run("invalid request params", func(t *testing.T) {
		testCases := []struct {
			desc   string
			params string
		}{
			{"invalid limit", "limit=z"},
			{"invalid offset", "offset=z"},
			{"invalid facets", "facets=z"},
			{"invalid kind", "kind=z"},
			{"invalid kind (one of them)", "kind=0&kind=z"},
			{"invalid verified publisher", "verified_publisher=z"},
			{"invalid official", "official=z"},
			{"invalid operators", "operators=z"},
			{"invalid deprecated", "deprecated=z"},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(fmt.Sprintf("%s: %s", tc.desc, tc.params), func(t *testing.T) {
				w := httptest.NewRecorder()
				r, _ := http.NewRequest("GET", "/?"+tc.params, nil)

				hw := newHandlersWrapper()
				hw.h.Search(w, r)
				resp := w.Result()
				defer resp.Body.Close()

				assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
			})
		}
	})

	t.Run("invalid search input", func(t *testing.T) {
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)

		hw := newHandlersWrapper()
		hw.pm.On("SearchJSON", r.Context(), mock.Anything).Return(nil, hub.ErrInvalidInput)
		hw.h.Search(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
	})

	t.Run("valid request, search succeeded", func(t *testing.T) {
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)

		hw := newHandlersWrapper()
		hw.pm.On("SearchJSON", r.Context(), mock.Anything).Return([]byte("dataJSON"), nil)
		hw.h.Search(w, r)
		resp := w.Result()
		defer resp.Body.Close()
		h := resp.Header
		data, _ := ioutil.ReadAll(resp.Body)

		assert.Equal(t, http.StatusOK, resp.StatusCode)
		assert.Equal(t, "application/json", h.Get("Content-Type"))
		assert.Equal(t, helpers.BuildCacheControlHeader(helpers.DefaultAPICacheMaxAge), h.Get("Cache-Control"))
		assert.Equal(t, []byte("dataJSON"), data)
		hw.pm.AssertExpectations(t)
	})

	t.Run("error searching packages", func(t *testing.T) {
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)

		hw := newHandlersWrapper()
		hw.pm.On("SearchJSON", r.Context(), mock.Anything).Return(nil, tests.ErrFakeDB)
		hw.h.Search(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
		hw.pm.AssertExpectations(t)
	})
}

func TestSearchMonocular(t *testing.T) {
	t.Run("search succeeded", func(t *testing.T) {
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/?q=text", nil)

		hw := newHandlersWrapper()
		hw.pm.On("SearchMonocularJSON", r.Context(), "baseURL", "text").Return([]byte("dataJSON"), nil)
		hw.h.SearchMonocular(w, r)
		resp := w.Result()
		defer resp.Body.Close()
		h := resp.Header
		data, _ := ioutil.ReadAll(resp.Body)

		assert.Equal(t, http.StatusOK, resp.StatusCode)
		assert.Equal(t, "application/json", h.Get("Content-Type"))
		assert.Equal(t, helpers.BuildCacheControlHeader(helpers.DefaultAPICacheMaxAge), h.Get("Cache-Control"))
		assert.Equal(t, []byte("dataJSON"), data)
		hw.pm.AssertExpectations(t)
	})

	t.Run("search failed", func(t *testing.T) {
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/?q=text", nil)

		hw := newHandlersWrapper()
		hw.pm.On("SearchMonocularJSON", r.Context(), "baseURL", "text").Return(nil, tests.ErrFakeDB)
		hw.h.SearchMonocular(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
		hw.pm.AssertExpectations(t)
	})
}

func TestToggleStar(t *testing.T) {
	rctx := &chi.Context{
		URLParams: chi.RouteParams{
			Keys:   []string{"packageID"},
			Values: []string{"packageID"},
		},
	}

	t.Run("error toggling star", func(t *testing.T) {
		testCases := []struct {
			err            error
			expectedStatus int
		}{
			{
				hub.ErrInvalidInput,
				http.StatusBadRequest,
			},
			{
				tests.ErrFakeDB,
				http.StatusInternalServerError,
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.err.Error(), func(t *testing.T) {
				w := httptest.NewRecorder()
				r, _ := http.NewRequest("PUT", "/", nil)
				r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))
				r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))

				hw := newHandlersWrapper()
				hw.pm.On("ToggleStar", r.Context(), "packageID").Return(tc.err)
				hw.h.ToggleStar(w, r)
				resp := w.Result()
				defer resp.Body.Close()

				assert.Equal(t, tc.expectedStatus, resp.StatusCode)
				hw.pm.AssertExpectations(t)
			})
		}
	})

	t.Run("toggle star succeeded", func(t *testing.T) {
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("PUT", "/", nil)
		r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))
		r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))

		hw := newHandlersWrapper()
		hw.pm.On("ToggleStar", r.Context(), "packageID").Return(nil)
		hw.h.ToggleStar(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusNoContent, resp.StatusCode)
		hw.pm.AssertExpectations(t)
	})
}

func testsOK(w http.ResponseWriter, r *http.Request) {}

type handlersWrapper struct {
	pm *pkg.ManagerMock
	h  *Handlers
}

func newHandlersWrapper() *handlersWrapper {
	cfg := viper.New()
	cfg.Set("server.baseURL", "baseURL")
	pm := &pkg.ManagerMock{}

	return &handlersWrapper{
		pm: pm,
		h:  NewHandlers(pm, cfg),
	}
}

func TestBuildPackageURL(t *testing.T) {
	baseURL := "http://localhost:8000"
	testCases := []struct {
		p              *hub.Package
		version        string
		expectedPkgURL string
	}{
		{
			&hub.Package{
				NormalizedName: "pkg1",
				Repository: &hub.Repository{
					Kind: hub.Helm,
					Name: "repo1",
				},
			},
			"1.0.0",
			baseURL + "/packages/helm/repo1/pkg1/1.0.0",
		},
		{
			&hub.Package{
				NormalizedName: "pkg1",
				Repository: &hub.Repository{
					Kind: hub.Helm,
					Name: "repo1",
				},
			},
			"",
			baseURL + "/packages/helm/repo1/pkg1",
		},
		{
			&hub.Package{
				NormalizedName: "pkg1",
				Repository: &hub.Repository{
					Kind: hub.Falco,
					Name: "repo1",
				},
			},
			"",
			baseURL + "/packages/falco/repo1/pkg1",
		},
		{
			&hub.Package{
				NormalizedName: "pkg1",
				Repository: &hub.Repository{
					Kind: hub.OPA,
					Name: "repo1",
				},
			},
			"",
			baseURL + "/packages/opa/repo1/pkg1",
		},
		{
			&hub.Package{
				NormalizedName: "pkg1",
				Repository: &hub.Repository{
					Kind: hub.OLM,
					Name: "repo1",
				},
			},
			"2.0.0",
			baseURL + "/packages/olm/repo1/pkg1/2.0.0",
		},
	}
	for _, tc := range testCases {
		tc := tc
		t.Run(tc.expectedPkgURL, func(t *testing.T) {
			pkgURL := BuildURL(baseURL, tc.p, tc.version)
			assert.Equal(t, tc.expectedPkgURL, pkgURL)
		})
	}
}
