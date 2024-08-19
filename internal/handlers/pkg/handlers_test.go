package pkg

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"strconv"
	"strings"
	"testing"
	"time"

	"github.com/artifacthub/hub/internal/handlers/helpers"
	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/oci"
	"github.com/artifacthub/hub/internal/pkg"
	"github.com/artifacthub/hub/internal/repo"
	"github.com/artifacthub/hub/internal/tests"
	"github.com/artifacthub/hub/internal/tracker/source/helm"
	"github.com/go-chi/chi/v5"
	ocispec "github.com/opencontainers/image-spec/specs-go/v1"
	"github.com/rs/zerolog"
	"github.com/spf13/viper"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"helm.sh/helm/v3/pkg/chart/loader"
)

func TestMain(m *testing.M) {
	zerolog.SetGlobalLevel(zerolog.Disabled)
	os.Exit(m.Run())
}

func TestAddProductionUsage(t *testing.T) {
	rctx := &chi.Context{
		URLParams: chi.RouteParams{
			Keys:   []string{"repoName", "packageName", "orgName"},
			Values: []string{"repo1", "pkg1", "org1"},
		},
	}

	t.Run("error adding production usage entry", func(t *testing.T) {
		t.Parallel()
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("POST", "/", nil)
		r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))
		r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))

		hw := newHandlersWrapper()
		hw.pm.On("AddProductionUsage", r.Context(), "repo1", "pkg1", "org1").Return(tests.ErrFakeDB)
		hw.h.AddProductionUsage(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
		hw.assertExpectations(t)
	})

	t.Run("add production usage entry succeeded", func(t *testing.T) {
		t.Parallel()
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("POST", "/", nil)
		r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))
		r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))

		hw := newHandlersWrapper()
		hw.pm.On("AddProductionUsage", r.Context(), "repo1", "pkg1", "org1").Return(nil)
		hw.h.AddProductionUsage(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusCreated, resp.StatusCode)
		hw.assertExpectations(t)
	})
}

func TestDeleteProductionUsage(t *testing.T) {
	rctx := &chi.Context{
		URLParams: chi.RouteParams{
			Keys:   []string{"repoName", "packageName", "orgName"},
			Values: []string{"repo1", "pkg1", "org1"},
		},
	}

	t.Run("error deleting production usage entry", func(t *testing.T) {
		t.Parallel()
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("POST", "/", nil)
		r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))
		r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))

		hw := newHandlersWrapper()
		hw.pm.On("DeleteProductionUsage", r.Context(), "repo1", "pkg1", "org1").Return(tests.ErrFakeDB)
		hw.h.DeleteProductionUsage(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
		hw.assertExpectations(t)
	})

	t.Run("delete production usage entry succeeded", func(t *testing.T) {
		t.Parallel()
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("POST", "/", nil)
		r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))
		r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))

		hw := newHandlersWrapper()
		hw.pm.On("DeleteProductionUsage", r.Context(), "repo1", "pkg1", "org1").Return(nil)
		hw.h.DeleteProductionUsage(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusNoContent, resp.StatusCode)
		hw.assertExpectations(t)
	})
}

func TestGenerateChangelogMD(t *testing.T) {
	packageID := "packageID"
	rctx := &chi.Context{
		URLParams: chi.RouteParams{
			Keys:   []string{"repoName", "packageName"},
			Values: []string{"repo1", "pkg1"},
		},
	}
	getPkgInput := &hub.GetPackageInput{
		RepositoryName: "repo1",
		PackageName:    "pkg1",
	}

	t.Run("error getting package", func(t *testing.T) {
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
				t.Parallel()
				w := httptest.NewRecorder()
				r, _ := http.NewRequest("GET", "/", nil)
				r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))

				hw := newHandlersWrapper()
				hw.pm.On("Get", r.Context(), getPkgInput).Return(nil, tc.pmErr)
				hw.h.GenerateChangelogMD(w, r)
				resp := w.Result()
				defer resp.Body.Close()

				assert.Equal(t, tc.expectedStatusCode, resp.StatusCode)
				hw.assertExpectations(t)
			})
		}
	})

	t.Run("error getting package changelog", func(t *testing.T) {
		t.Parallel()
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
		r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))

		hw := newHandlersWrapper()
		hw.pm.On("Get", r.Context(), mock.Anything).Return(&hub.Package{PackageID: packageID}, nil)
		hw.pm.On("GetChangelog", r.Context(), packageID).Return(nil, tests.ErrFake)
		hw.h.GenerateChangelogMD(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
		hw.assertExpectations(t)
	})

	t.Run("changelog not found", func(t *testing.T) {
		t.Parallel()
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
		r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))

		hw := newHandlersWrapper()
		hw.pm.On("Get", r.Context(), mock.Anything).Return(&hub.Package{PackageID: packageID}, nil)
		hw.pm.On("GetChangelog", r.Context(), packageID).Return(&hub.Changelog{}, nil)
		hw.h.GenerateChangelogMD(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusNotFound, resp.StatusCode)
		hw.assertExpectations(t)
	})

	t.Run("changelog returned formatted as markdown", func(t *testing.T) {
		t.Parallel()
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
		r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))

		hw := newHandlersWrapper()
		hw.pm.On("Get", r.Context(), mock.Anything).Return(&hub.Package{PackageID: packageID}, nil)
		hw.pm.On("GetChangelog", r.Context(), packageID).Return(&hub.Changelog{
			{
				Version: "1.0.0",
				TS:      1592299234,
				Changes: []*hub.Change{
					{
						Kind:        "added",
						Description: "feature 3",
						Links: []*hub.Link{
							{
								Name: "github issue",
								URL:  "https://issue.url",
							},
						},
					},
					{
						Kind:        "fixed",
						Description: "fix 3",
						Links: []*hub.Link{
							{
								Name: "github issue",
								URL:  "https://issue.url",
							},
						},
					},
				},
				ContainsSecurityUpdates: true,
				Prerelease:              true,
			},
			{
				Version: "0.0.9",
				TS:      1592299233,
				Changes: []*hub.Change{
					{
						Kind:        "added",
						Description: "feature 2",
						Links: []*hub.Link{
							{
								Name: "github issue",
								URL:  "https://issue.url",
							},
						},
					},
					{
						Kind:        "fixed",
						Description: "fix 2",
						Links: []*hub.Link{
							{
								Name: "github issue",
								URL:  "https://issue.url",
							},
						},
					},
				},
				ContainsSecurityUpdates: false,
				Prerelease:              false,
			},
		}, nil)
		hw.h.GenerateChangelogMD(w, r)
		resp := w.Result()
		defer resp.Body.Close()
		h := resp.Header
		data, _ := io.ReadAll(resp.Body)

		expectedData := []byte(`
# Changelog

## 1.0.0 - 2020-06-16

### Added

- feature 3

### Fixed

- fix 3

## 0.0.9 - 2020-06-16

### Added

- feature 2

### Fixed

- fix 2

`)
		assert.Equal(t, http.StatusOK, resp.StatusCode)
		assert.Equal(t, "text/markdown", h.Get("Content-Type"))
		assert.Equal(t, helpers.BuildCacheControlHeader(helpers.DefaultAPICacheMaxAge), h.Get("Cache-Control"))
		assert.Equal(t, expectedData, data)
		hw.assertExpectations(t)
	})
}

func TestGet(t *testing.T) {
	rctx := &chi.Context{
		URLParams: chi.RouteParams{
			Keys:   []string{"repoName", "packageName", "version"},
			Values: []string{"repo1", "pkg1", "1.0.0"},
		},
	}
	getPkgInput := &hub.GetPackageInput{
		RepositoryName: "repo1",
		PackageName:    "pkg1",
		Version:        "1.0.0",
	}

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
				t.Parallel()
				w := httptest.NewRecorder()
				r, _ := http.NewRequest("GET", "/", nil)
				r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))

				hw := newHandlersWrapper()
				hw.pm.On("GetJSON", r.Context(), getPkgInput).Return(nil, tc.pmErr)
				hw.h.Get(w, r)
				resp := w.Result()
				defer resp.Body.Close()

				assert.Equal(t, tc.expectedStatusCode, resp.StatusCode)
				hw.assertExpectations(t)
			})
		}
	})

	t.Run("get package succeeded", func(t *testing.T) {
		t.Parallel()
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
		r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))

		hw := newHandlersWrapper()
		hw.pm.On("GetJSON", r.Context(), getPkgInput).Return([]byte("dataJSON"), nil)
		hw.h.Get(w, r)
		resp := w.Result()
		defer resp.Body.Close()
		h := resp.Header
		data, _ := io.ReadAll(resp.Body)

		assert.Equal(t, http.StatusOK, resp.StatusCode)
		assert.Equal(t, "application/json", h.Get("Content-Type"))
		assert.Equal(t, helpers.BuildCacheControlHeader(helpers.DefaultAPICacheMaxAge), h.Get("Cache-Control"))
		assert.Equal(t, []byte("dataJSON"), data)
		hw.assertExpectations(t)
	})
}

func TestGetChangelog(t *testing.T) {
	rctx := &chi.Context{
		URLParams: chi.RouteParams{
			Keys:   []string{"packageID"},
			Values: []string{"pkg1"},
		},
	}

	t.Run("get changelog succeeded", func(t *testing.T) {
		t.Parallel()
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
		r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))

		hw := newHandlersWrapper()
		changelog := &hub.Changelog{
			{
				Version: "1.0.0",
				TS:      1592299234,
				Changes: []*hub.Change{
					{
						Kind:        "added",
						Description: "feature 3",
						Links: []*hub.Link{
							{
								Name: "github issue",
								URL:  "https://issue.url",
							},
						},
					},
					{
						Kind:        "fixed",
						Description: "fix 3",
						Links: []*hub.Link{
							{
								Name: "github issue",
								URL:  "https://issue.url",
							},
						},
					},
				},
				ContainsSecurityUpdates: true,
				Prerelease:              true,
			},
			{
				Version: "0.0.9",
				TS:      1592299233,
				Changes: []*hub.Change{
					{
						Kind:        "added",
						Description: "feature 2",
						Links: []*hub.Link{
							{
								Name: "github issue",
								URL:  "https://issue.url",
							},
						},
					},
					{
						Kind:        "fixed",
						Description: "fix 2",
						Links: []*hub.Link{
							{
								Name: "github issue",
								URL:  "https://issue.url",
							},
						},
					},
				},
				ContainsSecurityUpdates: false,
				Prerelease:              false,
			},
		}
		hw.pm.On("GetChangelog", r.Context(), "pkg1").Return(changelog, nil)
		hw.h.GetChangelog(w, r)
		resp := w.Result()
		defer resp.Body.Close()
		h := resp.Header
		data, _ := io.ReadAll(resp.Body)

		expectedData, _ := json.Marshal(changelog)
		assert.Equal(t, http.StatusOK, resp.StatusCode)
		assert.Equal(t, "application/json", h.Get("Content-Type"))
		assert.Equal(t, helpers.BuildCacheControlHeader(helpers.DefaultAPICacheMaxAge), h.Get("Cache-Control"))
		assert.Equal(t, expectedData, data)
		hw.assertExpectations(t)
	})

	t.Run("error getting changelog", func(t *testing.T) {
		t.Parallel()
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
		r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))

		hw := newHandlersWrapper()
		hw.pm.On("GetChangelog", r.Context(), "pkg1").Return(nil, tests.ErrFakeDB)
		hw.h.GetChangelog(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
		hw.assertExpectations(t)
	})
}

func TestGetChartValues(t *testing.T) {
	rctx := &chi.Context{
		URLParams: chi.RouteParams{
			Keys:   []string{"packageID", "version"},
			Values: []string{"pkg", "1.0.0"},
		},
	}
	getPkgInput := &hub.GetPackageInput{
		PackageID: "pkg",
		Version:   "1.0.0",
	}
	p1ContentURL := "https://content.url/p1.tgz"
	p1 := &hub.Package{
		ContentURL: p1ContentURL,
		Repository: &hub.Repository{
			Kind: hub.Helm,
			URL:  "https://repo.url",
		},
	}

	t.Run("get chart archive failed", func(t *testing.T) {
		t.Parallel()
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
		r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))

		hw := newHandlersWrapper()
		hw.pm.On("Get", r.Context(), getPkgInput).Return(nil, tests.ErrFakeDB)
		hw.h.GetChartValues(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
		hw.assertExpectations(t)
	})

	t.Run("get chart archive succeeded, but values not found", func(t *testing.T) {
		t.Parallel()
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
		r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))

		hw := newHandlersWrapper()
		hw.pm.On("Get", r.Context(), getPkgInput).Return(p1, nil)
		tgzReq, _ := http.NewRequest("GET", p1ContentURL, nil)
		tgzReq = tgzReq.WithContext(r.Context())
		tgzReq.Header.Set("Accept-Encoding", "identity")
		f, _ := os.Open("testdata/pkg2-1.0.0.tgz")
		hw.hc.On("Do", tgzReq).Return(&http.Response{
			Body:       f,
			StatusCode: http.StatusOK,
		}, nil)
		hw.h.GetChartValues(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusNotFound, resp.StatusCode)
		hw.assertExpectations(t)
	})

	t.Run("get chart archive succeeded", func(t *testing.T) {
		t.Parallel()
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
		r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))

		hw := newHandlersWrapper()
		hw.pm.On("Get", r.Context(), getPkgInput).Return(p1, nil)
		tgzReq, _ := http.NewRequest("GET", p1ContentURL, nil)
		tgzReq = tgzReq.WithContext(r.Context())
		tgzReq.Header.Set("Accept-Encoding", "identity")
		f, _ := os.Open("testdata/pkg1-1.0.0.tgz")
		hw.hc.On("Do", tgzReq).Return(&http.Response{
			Body:       f,
			StatusCode: http.StatusOK,
		}, nil)
		hw.h.GetChartValues(w, r)
		resp := w.Result()
		defer resp.Body.Close()
		h := resp.Header
		data, _ := io.ReadAll(resp.Body)

		assert.Equal(t, http.StatusOK, resp.StatusCode)
		assert.Equal(t, "application/yaml", h.Get("Content-Type"))
		expectedData := []byte("key: value\n")
		assert.Equal(t, expectedData, data)
		hw.assertExpectations(t)
	})
}

func TestGetChartTemplates(t *testing.T) {
	rctx := &chi.Context{
		URLParams: chi.RouteParams{
			Keys:   []string{"packageID", "version"},
			Values: []string{"pkg", "1.0.0"},
		},
	}
	getPkgInput := &hub.GetPackageInput{
		PackageID: "pkg",
		Version:   "1.0.0",
	}
	p1ContentURL := "https://content.url/p1.tgz"
	p1 := &hub.Package{
		ContentURL: p1ContentURL,
		Repository: &hub.Repository{
			Kind: hub.Helm,
			URL:  "https://repo.url",
		},
	}

	t.Run("get chart archive failed", func(t *testing.T) {
		t.Parallel()
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
		r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))

		hw := newHandlersWrapper()
		hw.pm.On("Get", r.Context(), getPkgInput).Return(nil, tests.ErrFakeDB)
		hw.h.GetChartTemplates(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
		hw.assertExpectations(t)
	})

	t.Run("get chart archive succeeded", func(t *testing.T) {
		t.Parallel()
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
		r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))

		hw := newHandlersWrapper()
		hw.pm.On("Get", r.Context(), getPkgInput).Return(p1, nil)
		tgzReq, _ := http.NewRequest("GET", p1ContentURL, nil)
		tgzReq = tgzReq.WithContext(r.Context())
		tgzReq.Header.Set("Accept-Encoding", "identity")
		f, _ := os.Open("testdata/pkg1-1.0.0.tgz")
		hw.hc.On("Do", tgzReq).Return(&http.Response{
			Body:       f,
			StatusCode: http.StatusOK,
		}, nil)
		hw.h.GetChartTemplates(w, r)
		resp := w.Result()
		defer resp.Body.Close()
		data, _ := io.ReadAll(resp.Body)

		assert.Equal(t, http.StatusOK, resp.StatusCode)
		expectedData := []byte(`{"templates":[{"name":"templates/template.yaml","data":"a2V5OiB7eyAuVmFsdWVzLmtleSB9fQo="}],"values":{"key":"value"}}`)
		assert.Equal(t, expectedData, data)
		hw.assertExpectations(t)
	})
}

func TestGetHarborReplicationDump(t *testing.T) {
	t.Run("get harbor replication dump succeeded", func(t *testing.T) {
		t.Parallel()
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)

		hw := newHandlersWrapper()
		hw.pm.On("GetHarborReplicationDumpJSON", r.Context()).Return([]byte("dataJSON"), nil)
		hw.h.GetHarborReplicationDump(w, r)
		resp := w.Result()
		defer resp.Body.Close()
		h := resp.Header
		data, _ := io.ReadAll(resp.Body)

		assert.Equal(t, http.StatusOK, resp.StatusCode)
		assert.Equal(t, "application/json", h.Get("Content-Type"))
		assert.Equal(t, helpers.BuildCacheControlHeader(1*time.Hour), h.Get("Cache-Control"))
		assert.Equal(t, []byte("dataJSON"), data)
		hw.assertExpectations(t)
	})

	t.Run("error getting harbor replication dump", func(t *testing.T) {
		t.Parallel()
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)

		hw := newHandlersWrapper()
		hw.pm.On("GetHarborReplicationDumpJSON", r.Context()).Return(nil, tests.ErrFakeDB)
		hw.h.GetHarborReplicationDump(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
		hw.assertExpectations(t)
	})
}

func TestGetHelmExporterDump(t *testing.T) {
	t.Run("get helm exporter dump succeeded", func(t *testing.T) {
		t.Parallel()
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)

		hw := newHandlersWrapper()
		hw.pm.On("GetHelmExporterDumpJSON", r.Context()).Return([]byte("dataJSON"), nil)
		hw.h.GetHelmExporterDump(w, r)
		resp := w.Result()
		defer resp.Body.Close()
		h := resp.Header
		data, _ := io.ReadAll(resp.Body)

		assert.Equal(t, http.StatusOK, resp.StatusCode)
		assert.Equal(t, "application/json", h.Get("Content-Type"))
		assert.Equal(t, helpers.BuildCacheControlHeader(1*time.Hour), h.Get("Cache-Control"))
		assert.Equal(t, []byte("dataJSON"), data)
		hw.assertExpectations(t)
	})

	t.Run("error getting helm exporter dump", func(t *testing.T) {
		t.Parallel()
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)

		hw := newHandlersWrapper()
		hw.pm.On("GetHelmExporterDumpJSON", r.Context()).Return(nil, tests.ErrFakeDB)
		hw.h.GetHelmExporterDump(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
		hw.assertExpectations(t)
	})
}

func TestGetNovaDump(t *testing.T) {
	t.Run("get nova dump succeeded", func(t *testing.T) {
		t.Parallel()
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)

		hw := newHandlersWrapper()
		hw.pm.On("GetNovaDumpJSON", r.Context()).Return([]byte("dataJSON"), nil)
		hw.h.GetNovaDump(w, r)
		resp := w.Result()
		defer resp.Body.Close()
		h := resp.Header
		data, _ := io.ReadAll(resp.Body)

		assert.Equal(t, http.StatusOK, resp.StatusCode)
		assert.Equal(t, "application/json", h.Get("Content-Type"))
		assert.Equal(t, helpers.BuildCacheControlHeader(2*time.Hour), h.Get("Cache-Control"))
		assert.Equal(t, []byte("dataJSON"), data)
		hw.assertExpectations(t)
	})

	t.Run("error getting nova dump", func(t *testing.T) {
		t.Parallel()
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)

		hw := newHandlersWrapper()
		hw.pm.On("GetNovaDumpJSON", r.Context()).Return(nil, tests.ErrFakeDB)
		hw.h.GetNovaDump(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
		hw.assertExpectations(t)
	})
}

func TestGetProductionUsage(t *testing.T) {
	rctx := &chi.Context{
		URLParams: chi.RouteParams{
			Keys:   []string{"repoName", "packageName"},
			Values: []string{"repo1", "pkg1"},
		},
	}

	t.Run("get production usage succeeded", func(t *testing.T) {
		t.Parallel()
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
		r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))

		hw := newHandlersWrapper()
		hw.pm.On("GetProductionUsageJSON", r.Context(), "repo1", "pkg1").Return([]byte("dataJSON"), nil)
		hw.h.GetProductionUsage(w, r)
		resp := w.Result()
		defer resp.Body.Close()
		h := resp.Header
		data, _ := io.ReadAll(resp.Body)

		assert.Equal(t, http.StatusOK, resp.StatusCode)
		assert.Equal(t, "application/json", h.Get("Content-Type"))
		assert.Equal(t, helpers.BuildCacheControlHeader(0), h.Get("Cache-Control"))
		assert.Equal(t, []byte("dataJSON"), data)
		hw.assertExpectations(t)
	})

	t.Run("error getting production usage", func(t *testing.T) {
		t.Parallel()
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
		r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))

		hw := newHandlersWrapper()
		hw.pm.On("GetProductionUsageJSON", r.Context(), "repo1", "pkg1").Return(nil, tests.ErrFakeDB)
		hw.h.GetProductionUsage(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
		hw.assertExpectations(t)
	})
}

func TestGetRandom(t *testing.T) {
	t.Run("get random packages succeeded", func(t *testing.T) {
		t.Parallel()
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)

		hw := newHandlersWrapper()
		hw.pm.On("GetRandomJSON", r.Context()).Return([]byte("dataJSON"), nil)
		hw.h.GetRandom(w, r)
		resp := w.Result()
		defer resp.Body.Close()
		h := resp.Header
		data, _ := io.ReadAll(resp.Body)

		assert.Equal(t, http.StatusOK, resp.StatusCode)
		assert.Equal(t, "application/json", h.Get("Content-Type"))
		assert.Equal(t, helpers.BuildCacheControlHeader(helpers.DefaultAPICacheMaxAge), h.Get("Cache-Control"))
		assert.Equal(t, []byte("dataJSON"), data)
		hw.assertExpectations(t)
	})

	t.Run("error getting random packages", func(t *testing.T) {
		t.Parallel()
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)

		hw := newHandlersWrapper()
		hw.pm.On("GetRandomJSON", r.Context()).Return(nil, tests.ErrFakeDB)
		hw.h.GetRandom(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
		hw.assertExpectations(t)
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
		t.Parallel()
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
		r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))

		hw := newHandlersWrapper()
		hw.pm.On("GetSnapshotSecurityReportJSON", r.Context(), "pkg1", "1.0.0").Return([]byte("dataJSON"), nil)
		hw.h.GetSnapshotSecurityReport(w, r)
		resp := w.Result()
		defer resp.Body.Close()
		h := resp.Header
		data, _ := io.ReadAll(resp.Body)

		assert.Equal(t, http.StatusOK, resp.StatusCode)
		assert.Equal(t, "application/json", h.Get("Content-Type"))
		assert.Equal(t, helpers.BuildCacheControlHeader(helpers.DefaultAPICacheMaxAge), h.Get("Cache-Control"))
		assert.Equal(t, []byte("dataJSON"), data)
		hw.assertExpectations(t)
	})

	t.Run("error getting snapshot security report", func(t *testing.T) {
		t.Parallel()
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
		r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))

		hw := newHandlersWrapper()
		hw.pm.On("GetSnapshotSecurityReportJSON", r.Context(), "pkg1", "1.0.0").Return(nil, tests.ErrFakeDB)
		hw.h.GetSnapshotSecurityReport(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
		hw.assertExpectations(t)
	})
}

func TestGetStarredByUser(t *testing.T) {
	t.Run("get packages starred by user succeeded", func(t *testing.T) {
		t.Parallel()
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/?limit=10&offset=1", nil)
		r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))

		hw := newHandlersWrapper()
		hw.pm.On("GetStarredByUserJSON", r.Context(), &hub.Pagination{
			Limit:  10,
			Offset: 1,
		}).Return(&hub.JSONQueryResult{
			Data:       []byte("dataJSON"),
			TotalCount: 1,
		}, nil)
		hw.h.GetStarredByUser(w, r)
		resp := w.Result()
		defer resp.Body.Close()
		h := resp.Header
		data, _ := io.ReadAll(resp.Body)

		assert.Equal(t, http.StatusOK, resp.StatusCode)
		assert.Equal(t, h.Get(helpers.PaginationTotalCount), "1")
		assert.Equal(t, "application/json", h.Get("Content-Type"))
		assert.Equal(t, helpers.BuildCacheControlHeader(0), h.Get("Cache-Control"))
		assert.Equal(t, []byte("dataJSON"), data)
		hw.assertExpectations(t)
	})

	t.Run("error getting packages starred by user", func(t *testing.T) {
		t.Parallel()
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/?limit=10&offset=1", nil)
		r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))

		hw := newHandlersWrapper()
		hw.pm.On("GetStarredByUserJSON", r.Context(), &hub.Pagination{
			Limit:  10,
			Offset: 1,
		}).Return(nil, tests.ErrFakeDB)
		hw.h.GetStarredByUser(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
		hw.assertExpectations(t)
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
				t.Parallel()
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
				hw.assertExpectations(t)
			})
		}
	})

	t.Run("get stars succeeded", func(t *testing.T) {
		t.Parallel()
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
		data, _ := io.ReadAll(resp.Body)

		assert.Equal(t, http.StatusOK, resp.StatusCode)
		assert.Equal(t, "application/json", h.Get("Content-Type"))
		assert.Equal(t, helpers.BuildCacheControlHeader(0), h.Get("Cache-Control"))
		assert.Equal(t, []byte("dataJSON"), data)
		hw.assertExpectations(t)
	})
}

func TestGetStats(t *testing.T) {
	t.Run("get stats succeeded", func(t *testing.T) {
		t.Parallel()
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)

		hw := newHandlersWrapper()
		hw.pm.On("GetStatsJSON", r.Context()).Return([]byte("dataJSON"), nil)
		hw.h.GetStats(w, r)
		resp := w.Result()
		defer resp.Body.Close()
		h := resp.Header
		data, _ := io.ReadAll(resp.Body)

		assert.Equal(t, http.StatusOK, resp.StatusCode)
		assert.Equal(t, "application/json", h.Get("Content-Type"))
		assert.Equal(t, helpers.BuildCacheControlHeader(helpers.DefaultAPICacheMaxAge), h.Get("Cache-Control"))
		assert.Equal(t, []byte("dataJSON"), data)
		hw.assertExpectations(t)
	})

	t.Run("error getting stats", func(t *testing.T) {
		t.Parallel()
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)

		hw := newHandlersWrapper()
		hw.pm.On("GetStatsJSON", r.Context()).Return(nil, tests.ErrFakeDB)
		hw.h.GetStats(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
		hw.assertExpectations(t)
	})
}

func TestGetSummary(t *testing.T) {
	rctx := &chi.Context{
		URLParams: chi.RouteParams{
			Keys:   []string{"repoName", "packageName"},
			Values: []string{"repo1", "pkg1"},
		},
	}
	input := &hub.GetPackageInput{
		RepositoryName: "repo1",
		PackageName:    "pkg1",
	}

	t.Run("get package summary failed", func(t *testing.T) {
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
				t.Parallel()
				w := httptest.NewRecorder()
				r, _ := http.NewRequest("GET", "/", nil)
				r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))

				hw := newHandlersWrapper()
				hw.pm.On("GetSummaryJSON", r.Context(), input).Return(nil, tc.pmErr)
				hw.h.GetSummary(w, r)
				resp := w.Result()
				defer resp.Body.Close()

				assert.Equal(t, tc.expectedStatusCode, resp.StatusCode)
				hw.assertExpectations(t)
			})
		}
	})

	t.Run("get package summary succeeded", func(t *testing.T) {
		t.Parallel()
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
		r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))

		hw := newHandlersWrapper()
		hw.pm.On("GetSummaryJSON", r.Context(), input).Return([]byte("dataJSON"), nil)
		hw.h.GetSummary(w, r)
		resp := w.Result()
		defer resp.Body.Close()
		h := resp.Header
		data, _ := io.ReadAll(resp.Body)

		assert.Equal(t, http.StatusOK, resp.StatusCode)
		assert.Equal(t, "application/json", h.Get("Content-Type"))
		assert.Equal(t, helpers.BuildCacheControlHeader(helpers.DefaultAPICacheMaxAge), h.Get("Cache-Control"))
		assert.Equal(t, []byte("dataJSON"), data)
		hw.assertExpectations(t)
	})
}

func TestGetValuesSchema(t *testing.T) {
	rctx := &chi.Context{
		URLParams: chi.RouteParams{
			Keys:   []string{"packageID", "version"},
			Values: []string{"pkg1", "1.0.0"},
		},
	}

	t.Run("get values schema succeeded", func(t *testing.T) {
		t.Parallel()
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
		r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))

		hw := newHandlersWrapper()
		hw.pm.On("GetValuesSchemaJSON", r.Context(), "pkg1", "1.0.0").Return([]byte("dataJSON"), nil)
		hw.h.GetValuesSchema(w, r)
		resp := w.Result()
		defer resp.Body.Close()
		h := resp.Header
		data, _ := io.ReadAll(resp.Body)

		assert.Equal(t, http.StatusOK, resp.StatusCode)
		assert.Equal(t, "application/json", h.Get("Content-Type"))
		assert.Equal(t, helpers.BuildCacheControlHeader(helpers.DefaultAPICacheMaxAge), h.Get("Cache-Control"))
		assert.Equal(t, []byte("dataJSON"), data)
		hw.assertExpectations(t)
	})

	t.Run("error getting values schema", func(t *testing.T) {
		t.Parallel()
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
		r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))

		hw := newHandlersWrapper()
		hw.pm.On("GetValuesSchemaJSON", r.Context(), "pkg1", "1.0.0").Return(nil, tests.ErrFakeDB)
		hw.h.GetValuesSchema(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
		hw.assertExpectations(t)
	})
}

func TestGetViews(t *testing.T) {
	rctx := &chi.Context{
		URLParams: chi.RouteParams{
			Keys:   []string{"packageID"},
			Values: []string{"pkg1"},
		},
	}

	t.Run("get views succeeded", func(t *testing.T) {
		t.Parallel()
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
		r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))

		hw := newHandlersWrapper()
		hw.pm.On("GetViewsJSON", r.Context(), "pkg1").Return([]byte("dataJSON"), nil)
		hw.h.GetViews(w, r)
		resp := w.Result()
		defer resp.Body.Close()
		h := resp.Header
		data, _ := io.ReadAll(resp.Body)

		assert.Equal(t, http.StatusOK, resp.StatusCode)
		assert.Equal(t, "application/json", h.Get("Content-Type"))
		assert.Equal(t, helpers.BuildCacheControlHeader(1*time.Hour), h.Get("Cache-Control"))
		assert.Equal(t, []byte("dataJSON"), data)
		hw.assertExpectations(t)
	})

	t.Run("error getting views", func(t *testing.T) {
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
				t.Parallel()
				w := httptest.NewRecorder()
				r, _ := http.NewRequest("GET", "/", nil)
				r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))

				hw := newHandlersWrapper()
				hw.pm.On("GetViewsJSON", r.Context(), "pkg1").Return(nil, tc.pmErr)
				hw.h.GetViews(w, r)
				resp := w.Result()
				defer resp.Body.Close()

				assert.Equal(t, tc.expectedStatusCode, resp.StatusCode)
				hw.assertExpectations(t)
			})
		}
	})
}

func TestInjectIndexMeta(t *testing.T) {
	checkIndexMeta := func(expectedTitle, expectedDescription interface{}) http.HandlerFunc {
		return func(w http.ResponseWriter, r *http.Request) {
			title, _ := r.Context().Value(hub.IndexMetaTitleKey).(string)
			description, _ := r.Context().Value(hub.IndexMetaDescriptionKey).(string)
			assert.Equal(t, expectedTitle, title)
			assert.Equal(t, expectedDescription, description)
		}
	}
	testCases := []struct {
		p                   *hub.Package
		err                 error
		expectedTitle       string
		expectedDescription string
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
			nil,
			"pkg1 1.0.0 · org1/repo1",
			"description",
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
			nil,
			"pkg1 1.0.0 · user1/repo1",
			"",
		},
		{
			nil,
			tests.ErrFake,
			"",
			"",
		},
	}
	for i, tc := range testCases {
		tc := tc
		t.Run(strconv.Itoa(i), func(t *testing.T) {
			t.Parallel()
			w := httptest.NewRecorder()
			r, _ := http.NewRequest("GET", "/", nil)

			hw := newHandlersWrapper()
			if tc.err == nil {
				hw.pm.On("Get", r.Context(), mock.Anything).Return(tc.p, nil)
			} else {
				hw.pm.On("Get", r.Context(), mock.Anything).Return(nil, tc.err)
			}
			hw.h.InjectIndexMeta(checkIndexMeta(tc.expectedTitle, tc.expectedDescription)).ServeHTTP(w, r)
			resp := w.Result()
			defer resp.Body.Close()

			assert.Equal(t, http.StatusOK, resp.StatusCode)
			hw.assertExpectations(t)
		})
	}
}

func TestRssFeed(t *testing.T) {
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
				t.Parallel()
				w := httptest.NewRecorder()
				r, _ := http.NewRequest("GET", "/", nil)

				hw := newHandlersWrapper()
				hw.pm.On("Get", r.Context(), mock.Anything).Return(nil, tc.pmErr)
				hw.h.RssFeed(w, r)
				resp := w.Result()
				defer resp.Body.Close()

				assert.Equal(t, tc.expectedStatusCode, resp.StatusCode)
				hw.assertExpectations(t)
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
					TS:             1592299234,
					AvailableVersions: []*hub.Version{
						{
							Version: "0.0.9",
							TS:      1592299233,
						},
						{
							Version: "1.0.0",
							TS:      1592299234,
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
				t.Parallel()
				w := httptest.NewRecorder()
				r, _ := http.NewRequest("GET", "/", nil)

				hw := newHandlersWrapper()
				hw.pm.On("Get", r.Context(), mock.Anything).Return(tc.p, nil)
				hw.h.RssFeed(w, r)
				resp := w.Result()
				defer resp.Body.Close()
				h := resp.Header
				data, _ := io.ReadAll(resp.Body)

				assert.Equal(t, http.StatusOK, resp.StatusCode)
				assert.Equal(t, "text/xml; charset=utf-8", h.Get("Content-Type"))
				assert.Equal(t, helpers.BuildCacheControlHeader(helpers.DefaultAPICacheMaxAge), h.Get("Cache-Control"))
				assert.Equal(t, tc.expectedRssFeedData, data)
				hw.assertExpectations(t)
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
			{"invalid category (one of them)", "category=1&category=z"},
			{"invalid kind", "kind=z"},
			{"invalid kind (one of them)", "kind=0&kind=z"},
			{"invalid verified publisher", "verified_publisher=z"},
			{"invalid official", "official=z"},
			{"invalid cncf", "cncf=z"},
			{"invalid operators", "operators=z"},
			{"invalid deprecated", "deprecated=z"},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(fmt.Sprintf("%s: %s", tc.desc, tc.params), func(t *testing.T) {
				t.Parallel()
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
		t.Parallel()
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
		t.Parallel()
		w := httptest.NewRecorder()
		v := url.Values{}
		v.Set("limit", "10")
		v.Set("offset", "10")
		v.Set("facets", "true")
		v.Set("ts_query_web", "q1")
		v.Set("ts_query", "q2")
		v.Add("category", "1")
		v.Add("category", "2")
		v.Add("user", "u1")
		v.Add("user", "u2")
		v.Add("org", "o1")
		v.Add("org", "o2")
		v.Add("repo", "r1")
		v.Add("repo", "r2")
		v.Add("kind", "0")
		v.Add("kind", "3")
		v.Set("verified_publisher", "true")
		v.Set("official", "true")
		v.Set("operators", "true")
		v.Set("deprecated", "true")
		v.Add("license", "l1")
		v.Add("license", "l2")
		v.Add("capabilities", "c1")
		v.Add("capabilities", "c2")
		v.Set("sort", "stars")
		r, _ := http.NewRequest("GET", "/?"+v.Encode(), nil)

		hw := newHandlersWrapper()
		hw.pm.On("SearchJSON", r.Context(), &hub.SearchPackageInput{
			Limit:             10,
			Offset:            10,
			Facets:            true,
			TSQueryWeb:        "q1",
			TSQuery:           "q2",
			Users:             []string{"u1", "u2"},
			Orgs:              []string{"o1", "o2"},
			Repositories:      []string{"r1", "r2"},
			RepositoryKinds:   []hub.RepositoryKind{hub.Helm, hub.OLM},
			Categories:        []hub.PackageCategory{hub.AIMachineLearning, hub.Database},
			VerifiedPublisher: true,
			Official:          true,
			Operators:         true,
			Deprecated:        true,
			Licenses:          []string{"l1", "l2"},
			Capabilities:      []string{"c1", "c2"},
			Sort:              "stars",
		}).Return(&hub.JSONQueryResult{
			Data:       []byte("dataJSON"),
			TotalCount: 1,
		}, nil)
		hw.h.Search(w, r)
		resp := w.Result()
		defer resp.Body.Close()
		h := resp.Header
		data, _ := io.ReadAll(resp.Body)

		assert.Equal(t, http.StatusOK, resp.StatusCode)
		assert.Equal(t, h.Get(helpers.PaginationTotalCount), "1")
		assert.Equal(t, helpers.BuildCacheControlHeader(helpers.DefaultAPICacheMaxAge), h.Get("Cache-Control"))
		assert.Equal(t, "application/json", h.Get("Content-Type"))
		assert.Equal(t, []byte("dataJSON"), data)
		hw.assertExpectations(t)
	})

	t.Run("error searching packages", func(t *testing.T) {
		t.Parallel()
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)

		hw := newHandlersWrapper()
		hw.pm.On("SearchJSON", r.Context(), mock.Anything).Return(nil, tests.ErrFakeDB)
		hw.h.Search(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
		hw.assertExpectations(t)
	})
}

func TestSearchMonocular(t *testing.T) {
	t.Run("search succeeded", func(t *testing.T) {
		t.Parallel()
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/?q=text", nil)

		hw := newHandlersWrapper()
		hw.pm.On("SearchMonocularJSON", r.Context(), "baseURL", "text").Return([]byte("dataJSON"), nil)
		hw.h.SearchMonocular(w, r)
		resp := w.Result()
		defer resp.Body.Close()
		h := resp.Header
		data, _ := io.ReadAll(resp.Body)

		assert.Equal(t, http.StatusOK, resp.StatusCode)
		assert.Equal(t, "application/json", h.Get("Content-Type"))
		assert.Equal(t, helpers.BuildCacheControlHeader(helpers.DefaultAPICacheMaxAge), h.Get("Cache-Control"))
		assert.Equal(t, []byte("dataJSON"), data)
		hw.assertExpectations(t)
	})

	t.Run("search failed", func(t *testing.T) {
		t.Parallel()
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/?q=text", nil)

		hw := newHandlersWrapper()
		hw.pm.On("SearchMonocularJSON", r.Context(), "baseURL", "text").Return(nil, tests.ErrFakeDB)
		hw.h.SearchMonocular(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
		hw.assertExpectations(t)
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
				t.Parallel()
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
				hw.assertExpectations(t)
			})
		}
	})

	t.Run("toggle star succeeded", func(t *testing.T) {
		t.Parallel()
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
		hw.assertExpectations(t)
	})
}

func TestTrackView(t *testing.T) {
	packageID := "00000000-0000-0000-0000-000000000001"
	version := "1.0.0"
	rctx := &chi.Context{
		URLParams: chi.RouteParams{
			Keys:   []string{"packageID", "version"},
			Values: []string{packageID, version},
		},
	}

	t.Run("track view succeeded", func(t *testing.T) {
		t.Parallel()
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("POST", "/", nil)
		r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))

		hw := newHandlersWrapper()
		hw.vt.On("TrackView", packageID, version).Return(nil)
		hw.h.TrackView(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusNoContent, resp.StatusCode)
		hw.assertExpectations(t)
	})

	t.Run("error tracking view", func(t *testing.T) {
		t.Parallel()
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("POST", "/", nil)
		r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))

		hw := newHandlersWrapper()
		hw.vt.On("TrackView", packageID, version).Return(hub.ErrInvalidInput)
		hw.h.TrackView(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
		hw.assertExpectations(t)
	})
}

func TestGetChartArchive(t *testing.T) {
	ctx := context.Background()
	packageID := "packageID"
	version := "1.0.0"
	getPkgInput := &hub.GetPackageInput{
		PackageID: packageID,
		Version:   version,
	}
	p1ContentURL := "https://content.url/p1.tgz"
	p1 := &hub.Package{
		ContentURL: p1ContentURL,
		Repository: &hub.Repository{
			Kind: hub.Helm,
			URL:  "https://repo.url",
		},
	}
	p2ContentURL := "https://content.url/p2.tgz"
	p2 := &hub.Package{
		ContentURL: p2ContentURL,
		Repository: &hub.Repository{
			RepositoryID: "repo2",
			Kind:         hub.Helm,
			URL:          "https://repo2.url",
			Private:      true,
		},
	}
	p3ContentURL := "oci://registry/namespace/chart:1.0.0"
	p3 := &hub.Package{
		ContentURL: p3ContentURL,
		Repository: &hub.Repository{
			Kind: hub.Helm,
			URL:  "oci://registry/namespace/chart",
		},
	}
	f, _ := os.Open("testdata/pkg1-1.0.0.tgz")
	expectedChrt, _ := loader.LoadArchive(f)

	t.Run("error getting package", func(t *testing.T) {
		t.Parallel()

		hw := newHandlersWrapper()
		hw.pm.On("Get", ctx, getPkgInput).Return(nil, tests.ErrFake)
		chrt, err := hw.h.getChartArchive(ctx, packageID, version)

		assert.Equal(t, tests.ErrFake, err)
		assert.Nil(t, chrt)
		hw.assertExpectations(t)
	})

	t.Run("repository kind not supported", func(t *testing.T) {
		t.Parallel()

		hw := newHandlersWrapper()
		hw.pm.On("Get", ctx, getPkgInput).Return(&hub.Package{
			Repository: &hub.Repository{
				Kind: hub.OLM,
			},
		}, nil)
		chrt, err := hw.h.getChartArchive(ctx, packageID, version)

		assert.Error(t, err)
		assert.Contains(t, err.Error(), "operation not supported for this repository kind")
		assert.Nil(t, chrt)
		hw.assertExpectations(t)
	})

	t.Run("error downloading repository", func(t *testing.T) {
		t.Parallel()

		hw := newHandlersWrapper()
		hw.pm.On("Get", ctx, getPkgInput).Return(p2, nil)
		hw.rm.On("GetByID", ctx, p2.Repository.RepositoryID, true).Return(nil, tests.ErrFake)
		chrt, err := hw.h.getChartArchive(ctx, packageID, version)

		assert.Equal(t, tests.ErrFake, err)
		assert.Nil(t, chrt)
		hw.assertExpectations(t)
	})

	t.Run("error downloading chart archive from http server", func(t *testing.T) {
		testCases := []struct {
			description string
			resp        *http.Response
			err         error
		}{
			{
				"server returned an error",
				nil,
				tests.ErrFake,
			},
			{
				"server returned an unexpected status code",
				&http.Response{
					Body:       io.NopCloser(strings.NewReader("")),
					StatusCode: http.StatusNotFound,
				},
				nil,
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.description, func(t *testing.T) {
				t.Parallel()

				hw := newHandlersWrapper()
				hw.pm.On("Get", ctx, getPkgInput).Return(p1, nil)
				tgzReq, _ := http.NewRequest("GET", p1ContentURL, nil)
				tgzReq = tgzReq.WithContext(ctx)
				tgzReq.Header.Set("Accept-Encoding", "identity")
				hw.hc.On("Do", tgzReq).Return(tc.resp, tc.err)
				chrt, err := hw.h.getChartArchive(ctx, packageID, version)

				assert.Error(t, err)
				assert.Nil(t, chrt)
				hw.assertExpectations(t)
			})
		}
	})

	t.Run("error pulling chart archive from oci registry", func(t *testing.T) {
		t.Parallel()

		hw := newHandlersWrapper()
		hw.pm.On("Get", ctx, getPkgInput).Return(p3, nil)
		ref := strings.TrimPrefix(p3ContentURL, hub.RepositoryOCIPrefix)
		hw.op.On("PullLayer", ctx, ref, helm.ChartContentLayerMediaType, "", "").
			Return(ocispec.Descriptor{}, nil, tests.ErrFake)
		chrt, err := hw.h.getChartArchive(ctx, packageID, version)

		assert.Equal(t, tests.ErrFake, err)
		assert.Nil(t, chrt)
		hw.assertExpectations(t)
	})

	t.Run("error loading chart archive", func(t *testing.T) {
		t.Parallel()

		hw := newHandlersWrapper()
		hw.pm.On("Get", ctx, getPkgInput).Return(p1, nil)
		tgzReq, _ := http.NewRequest("GET", p1ContentURL, nil)
		tgzReq = tgzReq.WithContext(ctx)
		tgzReq.Header.Set("Accept-Encoding", "identity")
		hw.hc.On("Do", tgzReq).Return(&http.Response{
			Body:       io.NopCloser(strings.NewReader("")),
			StatusCode: http.StatusOK,
		}, nil)
		chrt, err := hw.h.getChartArchive(ctx, packageID, version)

		assert.Error(t, err)
		assert.Nil(t, chrt)
		hw.assertExpectations(t)
	})

	t.Run("chart archive returned successfully (http server)", func(t *testing.T) {
		t.Parallel()

		hw := newHandlersWrapper()
		hw.pm.On("Get", ctx, getPkgInput).Return(p1, nil)
		tgzReq, _ := http.NewRequest("GET", p1ContentURL, nil)
		tgzReq = tgzReq.WithContext(ctx)
		tgzReq.Header.Set("Accept-Encoding", "identity")
		f, _ := os.Open("testdata/pkg1-1.0.0.tgz")
		hw.hc.On("Do", tgzReq).Return(&http.Response{
			Body:       f,
			StatusCode: http.StatusOK,
		}, nil)
		chrt, err := hw.h.getChartArchive(ctx, packageID, version)

		assert.Equal(t, expectedChrt, chrt)
		assert.NoError(t, err)
		hw.assertExpectations(t)
	})

	t.Run("chart archive returned successfully (http server, private repository)", func(t *testing.T) {
		t.Parallel()

		hw := newHandlersWrapper()
		hw.pm.On("Get", ctx, getPkgInput).Return(p2, nil)
		hw.rm.On("GetByID", ctx, p2.Repository.RepositoryID, true).Return(&hub.Repository{
			AuthUser: "user",
			AuthPass: "pass",
		}, nil)
		tgzReq, _ := http.NewRequest("GET", p2ContentURL, nil)
		tgzReq = tgzReq.WithContext(ctx)
		tgzReq.SetBasicAuth("user", "pass")
		tgzReq.Header.Set("Accept-Encoding", "identity")
		f, _ := os.Open("testdata/pkg1-1.0.0.tgz")
		hw.hc.On("Do", tgzReq).Return(&http.Response{
			Body:       f,
			StatusCode: http.StatusOK,
		}, nil)
		chrt, err := hw.h.getChartArchive(ctx, packageID, version)

		assert.Equal(t, expectedChrt, chrt)
		assert.NoError(t, err)
		hw.assertExpectations(t)
	})

	t.Run("chart archive returned successfully (oci registry)", func(t *testing.T) {
		t.Parallel()

		hw := newHandlersWrapper()
		hw.pm.On("Get", ctx, getPkgInput).Return(p3, nil)
		layerData, _ := os.ReadFile("testdata/pkg1-1.0.0.tgz")
		ref := strings.TrimPrefix(p3ContentURL, hub.RepositoryOCIPrefix)
		hw.op.On("PullLayer", ctx, ref, helm.ChartContentLayerMediaType, "", "").
			Return(ocispec.Descriptor{}, layerData, nil)
		chrt, err := hw.h.getChartArchive(ctx, packageID, version)

		assert.Equal(t, expectedChrt, chrt)
		assert.NoError(t, err)
		hw.assertExpectations(t)
	})
}

func TestBuildURL(t *testing.T) {
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
		{
			&hub.Package{
				NormalizedName: "pkg1",
				Repository: &hub.Repository{
					Kind: hub.TBAction,
					Name: "repo1",
				},
			},
			"2.0.0",
			baseURL + "/packages/tbaction/repo1/pkg1/2.0.0",
		},
		{
			&hub.Package{
				NormalizedName: "pkg1",
				Repository: &hub.Repository{
					Kind: hub.Krew,
					Name: "repo1",
				},
			},
			"2.0.0",
			baseURL + "/packages/krew/repo1/pkg1/2.0.0",
		},
		{
			&hub.Package{
				NormalizedName: "pkg1",
				Repository: &hub.Repository{
					Kind: hub.HelmPlugin,
					Name: "repo1",
				},
			},
			"2.0.0",
			baseURL + "/packages/helm-plugin/repo1/pkg1/2.0.0",
		},
		{
			&hub.Package{
				NormalizedName: "pkg1",
				Repository: &hub.Repository{
					Kind: hub.TektonTask,
					Name: "repo1",
				},
			},
			"2.0.0",
			baseURL + "/packages/tekton-task/repo1/pkg1/2.0.0",
		},
		{
			&hub.Package{
				NormalizedName: "pkg1",
				Repository: &hub.Repository{
					Kind: hub.KedaScaler,
					Name: "repo1",
				},
			},
			"2.0.0",
			baseURL + "/packages/keda-scaler/repo1/pkg1/2.0.0",
		},
		{
			&hub.Package{
				NormalizedName: "pkg1",
				Repository: &hub.Repository{
					Kind: hub.CoreDNS,
					Name: "repo1",
				},
			},
			"2.0.0",
			baseURL + "/packages/coredns/repo1/pkg1/2.0.0",
		},
		{
			&hub.Package{
				NormalizedName: "pkg1",
				Repository: &hub.Repository{
					Kind: hub.Keptn,
					Name: "repo1",
				},
			},
			"2.0.0",
			baseURL + "/packages/keptn/repo1/pkg1/2.0.0",
		},
		{
			&hub.Package{
				NormalizedName: "pkg1",
				Repository: &hub.Repository{
					Kind: hub.TektonPipeline,
					Name: "repo1",
				},
			},
			"2.0.0",
			baseURL + "/packages/tekton-pipeline/repo1/pkg1/2.0.0",
		},
		{
			&hub.Package{
				NormalizedName: "pkg1",
				Repository: &hub.Repository{
					Kind: hub.Container,
					Name: "repo1",
				},
			},
			"2.0.0",
			baseURL + "/packages/container/repo1/pkg1/2.0.0",
		},
		{
			&hub.Package{
				NormalizedName: "pkg1",
				Repository: &hub.Repository{
					Kind: hub.Kubewarden,
					Name: "repo1",
				},
			},
			"2.0.0",
			baseURL + "/packages/kubewarden/repo1/pkg1/2.0.0",
		},
		{
			&hub.Package{
				NormalizedName: "pkg1",
				Repository: &hub.Repository{
					Kind: hub.Gatekeeper,
					Name: "repo1",
				},
			},
			"2.0.0",
			baseURL + "/packages/gatekeeper/repo1/pkg1/2.0.0",
		},
		{
			&hub.Package{
				NormalizedName: "pkg1",
				Repository: &hub.Repository{
					Kind: hub.Kyverno,
					Name: "repo1",
				},
			},
			"2.0.0",
			baseURL + "/packages/kyverno/repo1/pkg1/2.0.0",
		},
		{
			&hub.Package{
				NormalizedName: "pkg1",
				Repository: &hub.Repository{
					Kind: hub.KnativeClientPlugin,
					Name: "repo1",
				},
			},
			"2.0.0",
			baseURL + "/packages/knative-client-plugin/repo1/pkg1/2.0.0",
		},
		{
			&hub.Package{
				NormalizedName: "pkg1",
				Repository: &hub.Repository{
					Kind: hub.Backstage,
					Name: "repo1",
				},
			},
			"2.0.0",
			baseURL + "/packages/backstage/repo1/pkg1/2.0.0",
		},
		{
			&hub.Package{
				NormalizedName: "pkg1",
				Repository: &hub.Repository{
					Kind: hub.ArgoTemplate,
					Name: "repo1",
				},
			},
			"2.0.0",
			baseURL + "/packages/argo-template/repo1/pkg1/2.0.0",
		},
		{
			&hub.Package{
				NormalizedName: "pkg1",
				Repository: &hub.Repository{
					Kind: hub.KubeArmor,
					Name: "repo1",
				},
			},
			"2.0.0",
			baseURL + "/packages/kubearmor/repo1/pkg1/2.0.0",
		},
		{
			&hub.Package{
				NormalizedName: "pkg1",
				Repository: &hub.Repository{
					Kind: hub.KCL,
					Name: "repo1",
				},
			},
			"2.0.0",
			baseURL + "/packages/kcl/repo1/pkg1/2.0.0",
		},
		{
			&hub.Package{
				NormalizedName: "pkg1",
				Repository: &hub.Repository{
					Kind: hub.Headlamp,
					Name: "repo1",
				},
			},
			"2.0.0",
			baseURL + "/packages/headlamp/repo1/pkg1/2.0.0",
		},
		{
			&hub.Package{
				NormalizedName: "pkg1",
				Repository: &hub.Repository{
					Kind: hub.InspektorGadget,
					Name: "repo1",
				},
			},
			"2.0.0",
			baseURL + "/packages/inspektor-gadget/repo1/pkg1/2.0.0",
		},
		{
			&hub.Package{
				NormalizedName: "pkg1",
				Repository: &hub.Repository{
					Kind: hub.TektonStepAction,
					Name: "repo1",
				},
			},
			"2.0.0",
			baseURL + "/packages/tekton-stepaction/repo1/pkg1/2.0.0",
		},
		{
			&hub.Package{
				NormalizedName: "pkg1",
				Repository: &hub.Repository{
					Kind: hub.Meshery,
					Name: "repo1",
				},
			},
			"2.0.0",
			baseURL + "/packages/meshery/repo1/pkg1/2.0.0",
		},
		{
			&hub.Package{
				NormalizedName: "pkg1",
				Repository: &hub.Repository{
					Kind: hub.OpenCost,
					Name: "repo1",
				},
			},
			"2.0.0",
			baseURL + "/packages/opencost/repo1/pkg1/2.0.0",
		},
		{
			&hub.Package{
				NormalizedName: "pkg1",
				Repository: &hub.Repository{
					Kind: hub.Radius,
					Name: "repo1",
				},
			},
			"2.0.0",
			baseURL + "/packages/radius/repo1/pkg1/2.0.0",
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

type handlersWrapper struct {
	pm *pkg.ManagerMock
	rm *repo.ManagerMock
	hc *tests.HTTPClientMock
	op *oci.PullerMock
	vt *pkg.ViewsTrackerMock
	h  *Handlers
}

func newHandlersWrapper() *handlersWrapper {
	cfg := viper.New()
	cfg.Set("server.baseURL", "baseURL")
	pm := &pkg.ManagerMock{}
	rm := &repo.ManagerMock{}
	hc := &tests.HTTPClientMock{}
	op := &oci.PullerMock{}
	vt := &pkg.ViewsTrackerMock{}

	return &handlersWrapper{
		pm: pm,
		rm: rm,
		hc: hc,
		op: op,
		vt: vt,
		h:  NewHandlers(pm, rm, cfg, hc, op, vt),
	}
}

func (hw *handlersWrapper) assertExpectations(t *testing.T) {
	hw.pm.AssertExpectations(t)
	hw.rm.AssertExpectations(t)
	hw.hc.AssertExpectations(t)
	hw.op.AssertExpectations(t)
}
