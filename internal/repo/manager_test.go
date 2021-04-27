package repo

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io/ioutil"
	"net/http"
	"os"
	"strconv"
	"strings"
	"testing"

	"github.com/artifacthub/hub/internal/authz"
	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/tests"
	"github.com/artifacthub/hub/internal/util"
	"github.com/spf13/viper"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

const repoID = "00000000-0000-0000-0000-000000000001"

var cfg = viper.New()

func TestAdd(t *testing.T) {
	ctx := context.WithValue(context.Background(), hub.UserIDKey, "userID")

	t.Run("user id not found in ctx", func(t *testing.T) {
		t.Parallel()
		m := NewManager(cfg, nil, nil, nil)
		assert.Panics(t, func() {
			_ = m.Add(context.Background(), "orgName", nil)
		})
	})

	t.Run("invalid input", func(t *testing.T) {
		testCases := []struct {
			errMsg  string
			orgName string
			r       *hub.Repository
			lErr    error
		}{
			{
				"invalid kind",
				"org1",
				&hub.Repository{
					Kind: hub.RepositoryKind(100),
				},
				nil,
			},
			{
				"name not provided",
				"org1",
				&hub.Repository{
					Kind: hub.Helm,
					Name: "",
				},
				nil,
			},
			{
				"invalid name",
				"org1",
				&hub.Repository{
					Kind: hub.Helm,
					Name: "1repo",
					URL:  "https://repo1.com",
				},
				nil,
			},
			{
				"invalid name",
				"org1",
				&hub.Repository{
					Kind: hub.Helm,
					Name: "repo_underscore",
					URL:  "https://repo1.com",
				},
				nil,
			},
			{
				"invalid name",
				"org1",
				&hub.Repository{
					Kind: hub.Helm,
					Name: "REPO_UPPERCASE",
					URL:  "https://repo1.com",
				},
				nil,
			},
			{
				"url not provided",
				"org1",
				&hub.Repository{
					Kind: hub.Helm,
					Name: "repo1",
					URL:  "",
				},
				nil,
			},
			{
				"missing protocol scheme",
				"org1",
				&hub.Repository{
					Kind: hub.Helm,
					Name: "repo1",
					URL:  ":::///",
				},
				nil,
			},
			{
				"scheme not supported",
				"org1",
				&hub.Repository{
					Kind: hub.Helm,
					Name: "repo1",
					URL:  "other://repo1.com",
				},
				nil,
			},
			{
				"urls with credentials not allowed",
				"org1",
				&hub.Repository{
					Kind: hub.Helm,
					Name: "repo1",
					URL:  "https://user:pass@repo1.com",
				},
				nil,
			},
			{
				"invalid url format",
				"org1",
				&hub.Repository{
					Kind: hub.OLM,
					Name: "repo1",
					URL:  "https://repo1.com",
				},
				nil,
			},
			{
				"invalid url format",
				"org1",
				&hub.Repository{
					Kind: hub.OLM,
					Name: "repo1",
					URL:  "https://github.com/incomplete",
				},
				nil,
			},
			{
				"the url provided does not point to a valid Helm repository",
				"org1",
				&hub.Repository{
					Kind: hub.Helm,
					Name: "repo1",
					URL:  "https://repo1.com",
				},
				errors.New("error loading index file"),
			},
			{
				"private repositories not allowed",
				"org1",
				&hub.Repository{
					Kind:     hub.Helm,
					Name:     "repo1",
					URL:      "https://repo1.com",
					AuthUser: "user1",
					AuthPass: "pass1",
				},
				nil,
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.errMsg, func(t *testing.T) {
				t.Parallel()
				l := &HelmIndexLoaderMock{}
				if tc.lErr != nil {
					l.On("LoadIndex", tc.r).Return(nil, "", tc.lErr)
				} else {
					l.On("LoadIndex", tc.r).Return(nil, "", nil).Maybe()
				}
				m := NewManager(cfg, nil, nil, nil, WithHelmIndexLoader(l))

				err := m.Add(ctx, tc.orgName, tc.r)
				assert.True(t, errors.Is(err, hub.ErrInvalidInput))
				assert.Contains(t, err.Error(), tc.errMsg)
				l.AssertExpectations(t)
			})
		}
	})

	t.Run("authorization failed", func(t *testing.T) {
		t.Parallel()
		r := &hub.Repository{
			Name:        "repo1",
			DisplayName: "Repository 1",
			URL:         "https://repo1.com",
			Kind:        hub.Helm,
		}
		az := &authz.AuthorizerMock{}
		az.On("Authorize", ctx, &hub.AuthorizeInput{
			OrganizationName: "orgName",
			UserID:           "userID",
			Action:           hub.AddOrganizationRepository,
		}).Return(tests.ErrFake)
		l := &HelmIndexLoaderMock{}
		l.On("LoadIndex", r).Return(nil, "", nil)
		m := NewManager(cfg, nil, az, nil, WithHelmIndexLoader(l))

		err := m.Add(ctx, "orgName", r)
		assert.Equal(t, tests.ErrFake, err)
		az.AssertExpectations(t)
	})

	t.Run("database error", func(t *testing.T) {
		testCases := []struct {
			r             *hub.Repository
			dbErr         error
			expectedError error
		}{
			{
				&hub.Repository{
					Name:        "repo1",
					DisplayName: "Repository 1",
					URL:         "https://repo1.com",
					Kind:        hub.Helm,
				},
				tests.ErrFakeDB,
				tests.ErrFakeDB,
			},
			{
				&hub.Repository{
					Name:        "repo1",
					DisplayName: "Repository 1",
					URL:         "https://repo1.com",
					Kind:        hub.Helm,
				},
				util.ErrDBInsufficientPrivilege,
				hub.ErrInsufficientPrivilege,
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.dbErr.Error(), func(t *testing.T) {
				t.Parallel()
				db := &tests.DBMock{}
				db.On("Exec", ctx, addRepoDBQ, "userID", "orgName", mock.Anything).Return(tc.dbErr)
				az := &authz.AuthorizerMock{}
				az.On("Authorize", ctx, &hub.AuthorizeInput{
					OrganizationName: "orgName",
					UserID:           "userID",
					Action:           hub.AddOrganizationRepository,
				}).Return(nil)
				l := &HelmIndexLoaderMock{}
				l.On("LoadIndex", tc.r).Return(nil, "", nil)
				m := NewManager(cfg, db, az, nil, WithHelmIndexLoader(l))

				err := m.Add(ctx, "orgName", tc.r)
				assert.Equal(t, tc.expectedError, err)
				db.AssertExpectations(t)
				az.AssertExpectations(t)
				l.AssertExpectations(t)
			})
		}
	})

	t.Run("add repository succeeded", func(t *testing.T) {
		testCases := []struct {
			r *hub.Repository
		}{
			{
				&hub.Repository{
					Name:        "repo1",
					DisplayName: "Repository 1",
					URL:         "https://repo1.com",
					Kind:        hub.Helm,
				},
			},
			{
				&hub.Repository{
					Name:        "repo2",
					DisplayName: "Repository 2",
					URL:         "https://github.com/org2/repo2/path",
					Kind:        hub.OLM,
				},
			},
		}
		for i, tc := range testCases {
			tc := tc
			t.Run(strconv.Itoa(i), func(t *testing.T) {
				t.Parallel()
				db := &tests.DBMock{}
				db.On("Exec", ctx, addRepoDBQ, "userID", "orgName", mock.Anything).Return(nil)
				az := &authz.AuthorizerMock{}
				az.On("Authorize", ctx, &hub.AuthorizeInput{
					OrganizationName: "orgName",
					UserID:           "userID",
					Action:           hub.AddOrganizationRepository,
				}).Return(nil)
				l := &HelmIndexLoaderMock{}
				if tc.r.Kind == hub.Helm {
					l.On("LoadIndex", tc.r).Return(nil, "", nil)
				}
				m := NewManager(cfg, db, az, nil, WithHelmIndexLoader(l))

				err := m.Add(ctx, "orgName", tc.r)
				assert.NoError(t, err)
				db.AssertExpectations(t)
				az.AssertExpectations(t)
				l.AssertExpectations(t)
			})
		}
	})
}

func TestCheckAvailability(t *testing.T) {
	ctx := context.Background()

	t.Run("invalid input", func(t *testing.T) {
		testCases := []struct {
			errMsg       string
			resourceKind string
			value        string
		}{
			{
				"invalid resource kind",
				"invalid",
				"value",
			},
			{
				"invalid value",
				"repositoryName",
				"",
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.errMsg, func(t *testing.T) {
				t.Parallel()
				m := NewManager(cfg, nil, nil, nil)
				_, err := m.CheckAvailability(context.Background(), tc.resourceKind, tc.value)
				assert.True(t, errors.Is(err, hub.ErrInvalidInput))
				assert.Contains(t, err.Error(), tc.errMsg)
			})
		}
	})

	t.Run("database query succeeded", func(t *testing.T) {
		testCases := []struct {
			resourceKind string
			dbQuery      string
			available    bool
		}{
			{
				"repositoryName",
				checkRepoNameAvailDBQ,
				true,
			},
			{
				"repositoryURL",
				checkRepoURLAvailDBQ,
				false,
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(fmt.Sprintf("resource kind: %s", tc.resourceKind), func(t *testing.T) {
				t.Parallel()
				tc.dbQuery = fmt.Sprintf("select not exists (%s)", tc.dbQuery)
				db := &tests.DBMock{}
				db.On("QueryRow", ctx, tc.dbQuery, "value").Return(tc.available, nil)
				m := NewManager(cfg, db, nil, nil)

				available, err := m.CheckAvailability(ctx, tc.resourceKind, "value/")
				assert.NoError(t, err)
				assert.Equal(t, tc.available, available)
				db.AssertExpectations(t)
			})
		}
	})

	t.Run("database error", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		dbQuery := fmt.Sprintf(`select not exists (%s)`, checkRepoNameAvailDBQ)
		db.On("QueryRow", ctx, dbQuery, "value").Return(false, tests.ErrFakeDB)
		m := NewManager(cfg, db, nil, nil)

		available, err := m.CheckAvailability(ctx, "repositoryName", "value")
		assert.Equal(t, tests.ErrFakeDB, err)
		assert.False(t, available)
		db.AssertExpectations(t)
	})
}

func TestClaimOwnership(t *testing.T) {
	userID := "userID"
	userIDP := &userID
	org := "org1"
	orgP := &org
	helmRepoJSON := []byte(`{"kind": 0, "url": "http://repo.url"}`)
	opaRepoJSON := []byte(`{"kind": 2, "url": "http://repo.url"}`)
	ociRepoJSON := []byte(`{"kind": 0, "url": "oci://registry.io/repo/pkg"}`)
	ctx := context.WithValue(context.Background(), hub.UserIDKey, userID)
	mdYmlReq, _ := http.NewRequest("GET", "http://repo.url/artifacthub-repo.yml", nil)
	mdYamlReq, _ := http.NewRequest("GET", "http://repo.url/artifacthub-repo.yaml", nil)

	t.Run("user id not found in ctx", func(t *testing.T) {
		t.Parallel()
		m := NewManager(cfg, nil, nil, nil)
		assert.Panics(t, func() {
			_ = m.ClaimOwnership(context.Background(), "repo1", "")
		})
	})

	t.Run("invalid input", func(t *testing.T) {
		testCases := []struct {
			errMsg   string
			repoName string
		}{
			{
				"repository name not provided",
				"",
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.errMsg, func(t *testing.T) {
				t.Parallel()
				m := NewManager(cfg, nil, nil, nil)

				err := m.ClaimOwnership(ctx, tc.repoName, "")
				assert.True(t, errors.Is(err, hub.ErrInvalidInput))
			})
		}
	})

	t.Run("ownership claim failed: database error getting repository", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, getRepoByNameDBQ, "repo1", false).Return(nil, tests.ErrFakeDB)
		m := NewManager(cfg, db, nil, nil)

		err := m.ClaimOwnership(ctx, "repo1", org)
		assert.Equal(t, tests.ErrFakeDB, err)
		db.AssertExpectations(t)
	})

	t.Run("ownership claim failed: error getting repository metadata", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, getRepoByNameDBQ, "repo1", false).Return(helmRepoJSON, nil)
		hc := &tests.HTTPClientMock{}
		hc.On("Do", mdYmlReq).Return(&http.Response{
			Body:       ioutil.NopCloser(strings.NewReader("")),
			StatusCode: http.StatusNotFound,
		}, nil)
		hc.On("Do", mdYamlReq).Return(&http.Response{
			Body:       ioutil.NopCloser(strings.NewReader("")),
			StatusCode: http.StatusNotFound,
		}, nil)
		m := NewManager(cfg, db, nil, hc)

		err := m.ClaimOwnership(ctx, "repo1", org)
		assert.Error(t, err)
		db.AssertExpectations(t)
	})

	t.Run("ownership claim failed: oci repo", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, getRepoByNameDBQ, "repo1", false).Return(ociRepoJSON, nil)
		m := NewManager(cfg, db, nil, nil)

		err := m.ClaimOwnership(ctx, "repo1", org)
		assert.True(t, errors.Is(err, hub.ErrInvalidInput))
		db.AssertExpectations(t)
	})

	t.Run("ownership claim failed: database error getting user email", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, getRepoByNameDBQ, "repo1", false).Return(helmRepoJSON, nil)
		db.On("QueryRow", ctx, getUserEmailDBQ, userID).Return("", tests.ErrFakeDB)
		mdFile, _ := os.Open("testdata/artifacthub-repo.yml")
		hc := &tests.HTTPClientMock{}
		hc.On("Do", mdYmlReq).Return(&http.Response{
			Body:       mdFile,
			StatusCode: http.StatusOK,
		}, nil)
		m := NewManager(cfg, db, nil, hc)

		err := m.ClaimOwnership(ctx, "repo1", org)
		assert.Equal(t, tests.ErrFakeDB, err)
		db.AssertExpectations(t)
	})

	t.Run("ownership claim failed: user not in repository owners list", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, getRepoByNameDBQ, "repo1", false).Return(helmRepoJSON, nil)
		db.On("QueryRow", ctx, getUserEmailDBQ, userID).Return("user1@email.com", nil)
		mdFile, _ := os.Open("testdata/artifacthub-repo.yml")
		hc := &tests.HTTPClientMock{}
		hc.On("Do", mdYmlReq).Return(&http.Response{
			Body:       mdFile,
			StatusCode: http.StatusOK,
		}, nil)
		m := NewManager(cfg, db, nil, hc)

		err := m.ClaimOwnership(ctx, "repo1", org)
		assert.Equal(t, hub.ErrInsufficientPrivilege, err)
		db.AssertExpectations(t)
	})

	t.Run("ownership claim succeeded (helm)", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, getRepoByNameDBQ, "repo1", false).Return(helmRepoJSON, nil)
		db.On("QueryRow", ctx, getUserEmailDBQ, userID).Return("owner1@email.com", nil)
		db.On("Exec", ctx, transferRepoDBQ, "repo1", userIDP, orgP, true).Return(nil)
		mdFile, _ := os.Open("testdata/artifacthub-repo.yml")
		hc := &tests.HTTPClientMock{}
		hc.On("Do", mdYmlReq).Return(&http.Response{
			Body:       mdFile,
			StatusCode: http.StatusOK,
		}, nil)
		m := NewManager(cfg, db, nil, hc)

		err := m.ClaimOwnership(ctx, "repo1", org)
		assert.Nil(t, err)
		db.AssertExpectations(t)
	})

	t.Run("ownership claim failed (opa): error cloning repository", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, getRepoByNameDBQ, "repo1", false).Return(opaRepoJSON, nil)
		rc := &ClonerMock{}
		var r *hub.Repository
		_ = json.Unmarshal(opaRepoJSON, &r)
		rc.On("CloneRepository", ctx, r).Return("", "", tests.ErrFake)
		m := NewManager(cfg, db, nil, nil, withRepositoryCloner(rc))

		err := m.ClaimOwnership(ctx, "repo1", org)
		assert.Equal(t, tests.ErrFake, err)
		db.AssertExpectations(t)
	})

	t.Run("ownership claim succeeded (opa)", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, getRepoByNameDBQ, "repo1", false).Return(opaRepoJSON, nil)
		db.On("QueryRow", ctx, getUserEmailDBQ, userID).Return("owner1@email.com", nil)
		db.On("Exec", ctx, transferRepoDBQ, "repo1", userIDP, orgP, true).Return(nil)
		rc := &ClonerMock{}
		var r *hub.Repository
		_ = json.Unmarshal(opaRepoJSON, &r)
		rc.On("CloneRepository", ctx, r).Return(".", "testdata", nil)
		m := NewManager(cfg, db, nil, nil, withRepositoryCloner(rc))

		err := m.ClaimOwnership(ctx, "repo1", org)
		assert.Nil(t, err)
		db.AssertExpectations(t)
	})
}

func TestDelete(t *testing.T) {
	ctx := context.WithValue(context.Background(), hub.UserIDKey, "userID")

	t.Run("user id not found in ctx", func(t *testing.T) {
		t.Parallel()
		m := NewManager(cfg, nil, nil, nil)
		assert.Panics(t, func() {
			_ = m.Delete(context.Background(), "repo1")
		})
	})

	t.Run("invalid input", func(t *testing.T) {
		t.Parallel()
		m := NewManager(cfg, nil, nil, nil)
		err := m.Delete(ctx, "")
		assert.True(t, errors.Is(err, hub.ErrInvalidInput))
	})

	t.Run("authorization failed", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, getRepoByNameDBQ, "repo1", false).Return([]byte(`
		{
			"repository_id": "00000000-0000-0000-0000-000000000001",
			"name": "repo1",
			"organization_name": "orgName"
		}
		`), nil)
		az := &authz.AuthorizerMock{}
		az.On("Authorize", ctx, &hub.AuthorizeInput{
			OrganizationName: "orgName",
			UserID:           "userID",
			Action:           hub.DeleteOrganizationRepository,
		}).Return(tests.ErrFake)
		m := NewManager(cfg, db, az, nil)

		err := m.Delete(ctx, "repo1")
		assert.Equal(t, tests.ErrFake, err)
		az.AssertExpectations(t)
	})

	t.Run("database error", func(t *testing.T) {
		testCases := []struct {
			dbErr         error
			expectedError error
		}{
			{
				tests.ErrFakeDB,
				tests.ErrFakeDB,
			},
			{
				util.ErrDBInsufficientPrivilege,
				hub.ErrInsufficientPrivilege,
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.dbErr.Error(), func(t *testing.T) {
				t.Parallel()
				db := &tests.DBMock{}
				db.On("QueryRow", ctx, getRepoByNameDBQ, "repo1", false).Return([]byte(`
				{
					"repository_id": "00000000-0000-0000-0000-000000000001",
					"name": "repo1",
					"organization_name": "orgName"
				}
				`), nil)
				db.On("Exec", ctx, deleteRepoDBQ, "userID", "repo1").Return(tc.dbErr)
				az := &authz.AuthorizerMock{}
				az.On("Authorize", ctx, &hub.AuthorizeInput{
					OrganizationName: "orgName",
					UserID:           "userID",
					Action:           hub.DeleteOrganizationRepository,
				}).Return(nil)
				m := NewManager(cfg, db, az, nil)

				err := m.Delete(ctx, "repo1")
				assert.Equal(t, tc.expectedError, err)
				db.AssertExpectations(t)
				az.AssertExpectations(t)
			})
		}
	})

	t.Run("delete repository succeeded", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, getRepoByNameDBQ, "repo1", false).Return([]byte(`
		{
			"repository_id": "00000000-0000-0000-0000-000000000001",
			"name": "repo1",
			"user_alias": "user1"
		}
		`), nil)
		db.On("Exec", ctx, deleteRepoDBQ, "userID", "repo1").Return(nil)
		m := NewManager(cfg, db, nil, nil)

		err := m.Delete(ctx, "repo1")
		assert.NoError(t, err)
		db.AssertExpectations(t)
	})
}

func TestGetAll(t *testing.T) {
	t.Parallel()
	ctx := context.Background()

	db := &tests.DBMock{}
	db.On("QueryRow", ctx, getAllReposDBQ, false).Return([]byte(`
	[{
        "repository_id": "00000000-0000-0000-0000-000000000001",
        "name": "repo1",
        "display_name": "Repo 1",
		"url": "https://repo1.com",
		"kind": 0,
		"verified_publisher": true,
		"official": true
    }, {
        "repository_id": "00000000-0000-0000-0000-000000000002",
        "name": "repo2",
        "display_name": "Repo 2",
		"url": "https://repo2.com",
		"kind": 0,
		"verified_publisher": true,
		"official": true
    }, {
        "repository_id": "00000000-0000-0000-0000-000000000003",
        "name": "repo3",
        "display_name": "Repo 3",
		"url": "https://repo3.com",
		"kind": 1,
		"verified_publisher": true,
		"official": true
    }]
	`), nil)
	m := NewManager(cfg, db, nil, nil)

	r, err := m.GetAll(ctx, false)
	require.NoError(t, err)
	assert.Len(t, r, 3)
	assert.Equal(t, "00000000-0000-0000-0000-000000000001", r[0].RepositoryID)
	assert.Equal(t, "repo1", r[0].Name)
	assert.Equal(t, "Repo 1", r[0].DisplayName)
	assert.Equal(t, "https://repo1.com", r[0].URL)
	assert.Equal(t, hub.Helm, r[0].Kind)
	assert.True(t, r[0].VerifiedPublisher)
	assert.True(t, r[0].Official)
	assert.Equal(t, "00000000-0000-0000-0000-000000000002", r[1].RepositoryID)
	assert.Equal(t, "repo2", r[1].Name)
	assert.Equal(t, "Repo 2", r[1].DisplayName)
	assert.Equal(t, "https://repo2.com", r[1].URL)
	assert.Equal(t, hub.Helm, r[1].Kind)
	assert.True(t, r[1].VerifiedPublisher)
	assert.True(t, r[1].Official)
	assert.Equal(t, "00000000-0000-0000-0000-000000000003", r[2].RepositoryID)
	assert.Equal(t, "repo3", r[2].Name)
	assert.Equal(t, "Repo 3", r[2].DisplayName)
	assert.Equal(t, "https://repo3.com", r[2].URL)
	assert.Equal(t, hub.Falco, r[2].Kind)
	assert.True(t, r[2].VerifiedPublisher)
	assert.True(t, r[2].Official)
	db.AssertExpectations(t)
}

func TestGetAllJSON(t *testing.T) {
	ctx := context.WithValue(context.Background(), hub.UserIDKey, "userID")

	t.Run("database error", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, getAllReposDBQ, false).Return(nil, tests.ErrFakeDB)
		m := NewManager(cfg, db, nil, nil)

		dataJSON, err := m.GetAllJSON(ctx, false)
		assert.Equal(t, tests.ErrFakeDB, err)
		assert.Nil(t, dataJSON)
		db.AssertExpectations(t)
	})

	t.Run("all repositories data returned successfully", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, getAllReposDBQ, false).Return([]byte("dataJSON"), nil)
		m := NewManager(cfg, db, nil, nil)

		dataJSON, err := m.GetAllJSON(ctx, false)
		assert.NoError(t, err)
		assert.Equal(t, []byte("dataJSON"), dataJSON)
		db.AssertExpectations(t)
	})
}

func TestGetByID(t *testing.T) {
	ctx := context.Background()

	t.Run("invalid input", func(t *testing.T) {
		testCases := []struct {
			repoID string
			errStr string
		}{
			{
				"",
				"repository id not provided",
			},
			{
				"invalid",
				"invalid repository id",
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.errStr, func(t *testing.T) {
				t.Parallel()
				m := NewManager(cfg, nil, nil, nil)

				_, err := m.GetByID(ctx, tc.repoID, false)
				assert.True(t, errors.Is(err, hub.ErrInvalidInput))
				assert.Contains(t, err.Error(), tc.errStr)
			})
		}
	})

	t.Run("database error", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, getRepoByIDDBQ, repoID, false).Return(nil, tests.ErrFakeDB)
		m := NewManager(cfg, db, nil, nil)

		r, err := m.GetByID(context.Background(), repoID, false)
		assert.Equal(t, tests.ErrFakeDB, err)
		assert.Nil(t, r)
		db.AssertExpectations(t)
	})

	t.Run("database query succeeded", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, getRepoByIDDBQ, repoID, false).Return([]byte(`
		{
			"repository_id": "00000000-0000-0000-0000-000000000001",
			"name": "repo1",
			"display_name": "Repo 1",
			"url": "https://repo1.com",
			"kind": 0,
			"verified_publisher": true,
			"official": true
		}
		`), nil)
		m := NewManager(cfg, db, nil, nil)

		r, err := m.GetByID(context.Background(), repoID, false)
		require.NoError(t, err)
		assert.Equal(t, repoID, r.RepositoryID)
		assert.Equal(t, "repo1", r.Name)
		assert.Equal(t, "Repo 1", r.DisplayName)
		assert.Equal(t, "https://repo1.com", r.URL)
		assert.Equal(t, hub.Helm, r.Kind)
		assert.True(t, r.VerifiedPublisher)
		assert.True(t, r.Official)
		db.AssertExpectations(t)
	})
}

func TestGetByKind(t *testing.T) {
	t.Parallel()
	ctx := context.Background()

	db := &tests.DBMock{}
	db.On("QueryRow", ctx, getReposByKindDBQ, hub.Helm, false).Return([]byte(`
	[{
        "repository_id": "00000000-0000-0000-0000-000000000001",
        "name": "repo1",
        "display_name": "Repo 1",
		"url": "https://repo1.com",
		"kind": 0,
		"verified_publisher": true,
		"official": true
    }, {
        "repository_id": "00000000-0000-0000-0000-000000000002",
        "name": "repo2",
        "display_name": "Repo 2",
		"url": "https://repo2.com",
		"kind": 0,
		"verified_publisher": true,
		"official": true
    }]
	`), nil)
	m := NewManager(cfg, db, nil, nil)

	r, err := m.GetByKind(ctx, hub.Helm, false)
	require.NoError(t, err)
	assert.Len(t, r, 2)
	assert.Equal(t, "00000000-0000-0000-0000-000000000001", r[0].RepositoryID)
	assert.Equal(t, "repo1", r[0].Name)
	assert.Equal(t, "Repo 1", r[0].DisplayName)
	assert.Equal(t, "https://repo1.com", r[0].URL)
	assert.Equal(t, hub.Helm, r[0].Kind)
	assert.True(t, r[0].VerifiedPublisher)
	assert.True(t, r[0].Official)
	assert.Equal(t, "00000000-0000-0000-0000-000000000002", r[1].RepositoryID)
	assert.Equal(t, "repo2", r[1].Name)
	assert.Equal(t, "Repo 2", r[1].DisplayName)
	assert.Equal(t, "https://repo2.com", r[1].URL)
	assert.Equal(t, hub.Helm, r[1].Kind)
	assert.True(t, r[1].VerifiedPublisher)
	assert.True(t, r[1].Official)
	db.AssertExpectations(t)
}

func TestGetByKindJSON(t *testing.T) {
	ctx := context.WithValue(context.Background(), hub.UserIDKey, "userID")

	t.Run("database error", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, getReposByKindDBQ, hub.OLM, false).Return(nil, tests.ErrFakeDB)
		m := NewManager(cfg, db, nil, nil)

		dataJSON, err := m.GetByKindJSON(ctx, hub.OLM, false)
		assert.Equal(t, tests.ErrFakeDB, err)
		assert.Nil(t, dataJSON)
		db.AssertExpectations(t)
	})

	t.Run("all repositories data returned successfully", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, getReposByKindDBQ, hub.OLM, false).Return([]byte("dataJSON"), nil)
		m := NewManager(cfg, db, nil, nil)

		dataJSON, err := m.GetByKindJSON(ctx, hub.OLM, false)
		assert.NoError(t, err)
		assert.Equal(t, []byte("dataJSON"), dataJSON)
		db.AssertExpectations(t)
	})
}

func TestGetByName(t *testing.T) {
	ctx := context.Background()

	t.Run("invalid input", func(t *testing.T) {
		t.Parallel()
		m := NewManager(cfg, nil, nil, nil)
		_, err := m.GetByName(ctx, "", false)
		assert.True(t, errors.Is(err, hub.ErrInvalidInput))
	})

	t.Run("get existing repository by name", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, getRepoByNameDBQ, "repo1", false).Return([]byte(`
		{
			"repository_id": "00000000-0000-0000-0000-000000000001",
			"name": "repo1",
			"display_name": "Repo 1",
			"url": "https://repo1.com",
			"kind": 0,
			"verified_publisher": true,
			"official": true,
			"user_alias": "user",
			"organization_name": ""
		}
		`), nil)
		m := NewManager(cfg, db, nil, nil)

		r, err := m.GetByName(context.Background(), "repo1", false)
		require.NoError(t, err)
		assert.Equal(t, "00000000-0000-0000-0000-000000000001", r.RepositoryID)
		assert.Equal(t, "repo1", r.Name)
		assert.Equal(t, "Repo 1", r.DisplayName)
		assert.Equal(t, "https://repo1.com", r.URL)
		assert.Equal(t, hub.Helm, r.Kind)
		assert.True(t, r.VerifiedPublisher)
		assert.True(t, r.Official)
		db.AssertExpectations(t)
	})

	t.Run("database error", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, getRepoByNameDBQ, "repo1", false).Return(nil, tests.ErrFakeDB)
		m := NewManager(cfg, db, nil, nil)

		r, err := m.GetByName(context.Background(), "repo1", false)
		assert.Equal(t, tests.ErrFakeDB, err)
		assert.Nil(t, r)
		db.AssertExpectations(t)
	})

	t.Run("invalid json data returned from database", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, getRepoByNameDBQ, "repo1", false).Return([]byte("invalid json"), nil)
		m := NewManager(cfg, db, nil, nil)

		r, err := m.GetByName(context.Background(), "repo1", false)
		assert.Error(t, err)
		assert.Nil(t, r)
		db.AssertExpectations(t)
	})
}

func TestGetMetadata(t *testing.T) {
	mdYmlReq, _ := http.NewRequest("GET", "http://url.test/ok.yml", nil)
	mdYamlReq, _ := http.NewRequest("GET", "http://url.test/ok.yaml", nil)
	mdNotFoundYmlReq, _ := http.NewRequest("GET", "http://url.test/not-found.yml", nil)
	mdNotFoundYamlReq, _ := http.NewRequest("GET", "http://url.test/not-found.yaml", nil)

	t.Run("local file: error reading repository metadata file", func(t *testing.T) {
		t.Parallel()
		m := NewManager(cfg, nil, nil, nil)
		_, err := m.GetMetadata("testdata/not-exists.yaml")
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "error reading repository metadata file")
	})

	t.Run("remote file: error downloading repository metadata file", func(t *testing.T) {
		t.Parallel()
		hc := &tests.HTTPClientMock{}
		hc.On("Do", mdNotFoundYmlReq).Return(nil, tests.ErrFake)
		hc.On("Do", mdNotFoundYamlReq).Return(nil, tests.ErrFake)
		m := NewManager(cfg, nil, nil, hc)
		_, err := m.GetMetadata("http://url.test/not-found")
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "error downloading repository metadata file")
	})

	t.Run("remote file: unexpected status code received", func(t *testing.T) {
		t.Parallel()
		hc := &tests.HTTPClientMock{}
		hc.On("Do", mdNotFoundYmlReq).Return(&http.Response{
			Body:       ioutil.NopCloser(strings.NewReader("")),
			StatusCode: http.StatusNotFound,
		}, nil)
		hc.On("Do", mdNotFoundYamlReq).Return(&http.Response{
			Body:       ioutil.NopCloser(strings.NewReader("")),
			StatusCode: http.StatusNotFound,
		}, nil)
		m := NewManager(cfg, nil, nil, hc)
		_, err := m.GetMetadata("http://url.test/not-found")
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "unexpected status code received")
	})

	t.Run("remote file: error reading repository metadata file", func(t *testing.T) {
		t.Parallel()
		hc := &tests.HTTPClientMock{}
		hc.On("Do", mdNotFoundYmlReq).Return(&http.Response{
			Body:       ioutil.NopCloser(tests.ErrReader(0)),
			StatusCode: http.StatusOK,
		}, nil)
		hc.On("Do", mdNotFoundYamlReq).Return(&http.Response{
			Body:       ioutil.NopCloser(tests.ErrReader(0)),
			StatusCode: http.StatusOK,
		}, nil)
		m := NewManager(cfg, nil, nil, hc)
		_, err := m.GetMetadata("http://url.test/not-found")
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "error reading repository metadata file")
	})

	t.Run("error unmarshaling repository metadata file", func(t *testing.T) {
		t.Parallel()
		m := NewManager(cfg, nil, nil, nil)
		_, err := m.GetMetadata("testdata/invalid")
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "error unmarshaling repository metadata file")
	})

	t.Run("invalid repository id", func(t *testing.T) {
		t.Parallel()
		m := NewManager(cfg, nil, nil, nil)
		_, err := m.GetMetadata("testdata/invalid-repo-id")
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "invalid repository id")
	})

	t.Run("local file: success fetching .yml", func(t *testing.T) {
		t.Parallel()
		m := NewManager(cfg, nil, nil, nil)
		_, err := m.GetMetadata("testdata/artifacthub-repo")
		assert.NoError(t, err)
	})

	t.Run("local file: success .yaml", func(t *testing.T) {
		t.Parallel()
		m := NewManager(cfg, nil, nil, nil)
		_, err := m.GetMetadata("testdata/test-yaml-repo")
		assert.NoError(t, err)
	})

	t.Run("remote file: success", func(t *testing.T) {
		t.Parallel()
		hc := &tests.HTTPClientMock{}
		hc.On("Do", mdYmlReq).Return(&http.Response{
			Body:       ioutil.NopCloser(strings.NewReader("repositoryID: 00000000-0000-0000-0000-000000000001")),
			StatusCode: http.StatusOK,
		}, nil)
		m := NewManager(cfg, nil, nil, hc)
		_, err := m.GetMetadata("http://url.test/ok")
		assert.NoError(t, err)
	})

	t.Run("remote file: success on yaml", func(t *testing.T) {
		t.Parallel()
		hc := &tests.HTTPClientMock{}
		hc.On("Do", mdYmlReq).Return(&http.Response{
			Body:       ioutil.NopCloser(strings.NewReader("")),
			StatusCode: http.StatusNotFound,
		}, nil)
		hc.On("Do", mdYamlReq).Return(&http.Response{
			Body:       ioutil.NopCloser(strings.NewReader("repositoryID: 00000000-0000-0000-0000-000000000001")),
			StatusCode: http.StatusOK,
		}, nil)
		m := NewManager(cfg, nil, nil, hc)
		_, err := m.GetMetadata("http://url.test/ok")
		assert.NoError(t, err)
	})
}

func TestGetPackagesDigest(t *testing.T) {
	ctx := context.Background()

	t.Run("invalid input", func(t *testing.T) {
		t.Parallel()
		m := NewManager(cfg, nil, nil, nil)
		_, err := m.GetPackagesDigest(context.Background(), "invalid")
		assert.True(t, errors.Is(err, hub.ErrInvalidInput))
	})

	t.Run("database query succeeded", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, getRepoPkgsDigestDBQ, "00000000-0000-0000-0000-000000000001").Return([]byte(`
		{
			"package1@1.0.0": "digest-package1-1.0.0",
			"package1@0.0.9": "digest-package1-0.0.9",
			"package2@1.0.0": "digest-package2-1.0.0",
			"package2@0.0.9": "digest-package2-0.0.9"
		}
		`), nil)
		m := NewManager(cfg, db, nil, nil)

		pd, err := m.GetPackagesDigest(ctx, "00000000-0000-0000-0000-000000000001")
		require.NoError(t, err)
		assert.Len(t, pd, 4)
		assert.Equal(t, "digest-package1-1.0.0", pd["package1@1.0.0"])
		assert.Equal(t, "digest-package1-0.0.9", pd["package1@0.0.9"])
		assert.Equal(t, "digest-package2-1.0.0", pd["package2@1.0.0"])
		assert.Equal(t, "digest-package2-0.0.9", pd["package2@0.0.9"])
		db.AssertExpectations(t)
	})
}

func TestGetOwnedByOrgJSON(t *testing.T) {
	ctx := context.WithValue(context.Background(), hub.UserIDKey, "userID")

	t.Run("user id not found in ctx", func(t *testing.T) {
		t.Parallel()
		m := NewManager(cfg, nil, nil, nil)
		assert.Panics(t, func() {
			_, _ = m.GetOwnedByOrgJSON(context.Background(), "orgName", false)
		})
	})

	t.Run("invalid input", func(t *testing.T) {
		t.Parallel()
		m := NewManager(cfg, nil, nil, nil)
		_, err := m.GetOwnedByOrgJSON(ctx, "", false)
		assert.True(t, errors.Is(err, hub.ErrInvalidInput))
	})

	t.Run("database error", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, getOrgReposDBQ, "userID", "orgName", false).Return(nil, tests.ErrFakeDB)
		m := NewManager(cfg, db, nil, nil)

		dataJSON, err := m.GetOwnedByOrgJSON(ctx, "orgName", false)
		assert.Equal(t, tests.ErrFakeDB, err)
		assert.Nil(t, dataJSON)
		db.AssertExpectations(t)
	})

	t.Run("org repositories data returned successfully", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, getOrgReposDBQ, "userID", "orgName", false).Return([]byte("dataJSON"), nil)
		m := NewManager(cfg, db, nil, nil)

		dataJSON, err := m.GetOwnedByOrgJSON(ctx, "orgName", false)
		assert.NoError(t, err)
		assert.Equal(t, []byte("dataJSON"), dataJSON)
		db.AssertExpectations(t)
	})
}

func TestGetOwnedByUserJSON(t *testing.T) {
	ctx := context.WithValue(context.Background(), hub.UserIDKey, "userID")

	t.Run("user id not found in ctx", func(t *testing.T) {
		t.Parallel()
		m := NewManager(cfg, nil, nil, nil)
		assert.Panics(t, func() {
			_, _ = m.GetOwnedByUserJSON(context.Background(), false)
		})
	})

	t.Run("database error", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, getUserReposDBQ, "userID", false).Return(nil, tests.ErrFakeDB)
		m := NewManager(cfg, db, nil, nil)

		dataJSON, err := m.GetOwnedByUserJSON(ctx, false)
		assert.Equal(t, tests.ErrFakeDB, err)
		assert.Nil(t, dataJSON)
		db.AssertExpectations(t)
	})

	t.Run("user repositories data returned successfully", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, getUserReposDBQ, "userID", false).Return([]byte("dataJSON"), nil)
		m := NewManager(cfg, db, nil, nil)

		dataJSON, err := m.GetOwnedByUserJSON(ctx, false)
		assert.NoError(t, err)
		assert.Equal(t, []byte("dataJSON"), dataJSON)
		db.AssertExpectations(t)
	})
}

func TestGetRemoteDigest(t *testing.T) {
	ctx := context.Background()
	helmHTTP := &hub.Repository{
		Kind: hub.Helm,
		Name: "repo1",
		URL:  "https://myrepo.url",
	}

	t.Run("helm-http: error loading index", func(t *testing.T) {
		t.Parallel()
		l := &HelmIndexLoaderMock{}
		l.On("LoadIndex", helmHTTP).Return(nil, "", tests.ErrFake)
		m := NewManager(cfg, nil, nil, nil, WithHelmIndexLoader(l))

		digest, err := m.GetRemoteDigest(ctx, helmHTTP)
		assert.Empty(t, digest)
		assert.Equal(t, tests.ErrFake, err)
	})

	t.Run("helm-http: success", func(t *testing.T) {
		t.Parallel()
		l := &HelmIndexLoaderMock{}
		l.On("LoadIndex", helmHTTP).Return(nil, "digest", nil)
		m := NewManager(cfg, nil, nil, nil, WithHelmIndexLoader(l))

		digest, err := m.GetRemoteDigest(ctx, helmHTTP)
		assert.Equal(t, "digest", digest)
		assert.Nil(t, err)
	})
}

func TestSetLastScanningResults(t *testing.T) {
	ctx := context.Background()

	t.Run("invalid input", func(t *testing.T) {
		t.Parallel()
		m := NewManager(cfg, nil, nil, nil)
		err := m.SetLastScanningResults(ctx, "invalid", "errors")
		assert.True(t, errors.Is(err, hub.ErrInvalidInput))
	})

	t.Run("database update succeeded", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("Exec", ctx, setLastScanningResultsDBQ, repoID, "errors", false).Return(nil)
		m := NewManager(cfg, db, nil, nil)

		err := m.SetLastScanningResults(ctx, repoID, "errors")
		assert.NoError(t, err)
		db.AssertExpectations(t)
	})

	t.Run("database error", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("Exec", ctx, setLastScanningResultsDBQ, repoID, "errors", false).Return(tests.ErrFakeDB)
		m := NewManager(cfg, db, nil, nil)

		err := m.SetLastScanningResults(ctx, repoID, "errors")
		assert.Equal(t, tests.ErrFakeDB, err)
		db.AssertExpectations(t)
	})
}

func TestSetLastTrackingResults(t *testing.T) {
	ctx := context.Background()

	t.Run("invalid input", func(t *testing.T) {
		t.Parallel()
		m := NewManager(cfg, nil, nil, nil)
		err := m.SetLastTrackingResults(ctx, "invalid", "errors")
		assert.True(t, errors.Is(err, hub.ErrInvalidInput))
	})

	t.Run("database update succeeded", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("Exec", ctx, setLastTrackingResultsDBQ, repoID, "errors", false).Return(nil)
		m := NewManager(cfg, db, nil, nil)

		err := m.SetLastTrackingResults(ctx, repoID, "errors")
		assert.NoError(t, err)
		db.AssertExpectations(t)
	})

	t.Run("database error", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("Exec", ctx, setLastTrackingResultsDBQ, repoID, "errors", false).Return(tests.ErrFakeDB)
		m := NewManager(cfg, db, nil, nil)

		err := m.SetLastTrackingResults(ctx, repoID, "errors")
		assert.Equal(t, tests.ErrFakeDB, err)
		db.AssertExpectations(t)
	})
}

func TestSetVerifiedPublisher(t *testing.T) {
	ctx := context.Background()

	t.Run("invalid input", func(t *testing.T) {
		t.Parallel()
		m := NewManager(cfg, nil, nil, nil)
		err := m.SetVerifiedPublisher(ctx, "invalid", true)
		assert.True(t, errors.Is(err, hub.ErrInvalidInput))
	})

	t.Run("database update succeeded", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("Exec", ctx, setVerifiedPublisherDBQ, repoID, true).Return(nil)
		m := NewManager(cfg, db, nil, nil)

		err := m.SetVerifiedPublisher(ctx, repoID, true)
		assert.NoError(t, err)
		db.AssertExpectations(t)
	})

	t.Run("database error", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("Exec", ctx, setVerifiedPublisherDBQ, repoID, true).Return(tests.ErrFakeDB)
		m := NewManager(cfg, db, nil, nil)

		err := m.SetVerifiedPublisher(ctx, repoID, true)
		assert.Equal(t, tests.ErrFakeDB, err)
		db.AssertExpectations(t)
	})
}

func TestTransfer(t *testing.T) {
	ctx := context.WithValue(context.Background(), hub.UserIDKey, "userID")
	userID := "userID"
	userIDP := &userID
	org := "org1"
	orgP := &org

	t.Run("user id not found in ctx", func(t *testing.T) {
		t.Parallel()
		m := NewManager(cfg, nil, nil, nil)
		assert.Panics(t, func() {
			_ = m.Transfer(context.Background(), "repo1", "", false)
		})
	})

	t.Run("invalid input", func(t *testing.T) {
		testCases := []struct {
			errMsg   string
			repoName string
		}{
			{
				"repository name not provided",
				"",
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.errMsg, func(t *testing.T) {
				t.Parallel()
				m := NewManager(cfg, nil, nil, nil)

				err := m.Transfer(ctx, tc.repoName, "", false)
				assert.True(t, errors.Is(err, hub.ErrInvalidInput))
			})
		}
	})

	t.Run("authorization failed", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, getRepoByNameDBQ, "repo1", false).Return([]byte(`
		{
			"repository_id": "00000000-0000-0000-0000-000000000001",
			"name": "repo1",
			"organization_name": "orgName"
		}
		`), nil)
		az := &authz.AuthorizerMock{}
		az.On("Authorize", ctx, &hub.AuthorizeInput{
			OrganizationName: "orgName",
			UserID:           "userID",
			Action:           hub.TransferOrganizationRepository,
		}).Return(tests.ErrFake)
		m := NewManager(cfg, db, az, nil)

		err := m.Transfer(ctx, "repo1", "orgDest", false)
		assert.Equal(t, tests.ErrFake, err)
		az.AssertExpectations(t)
	})

	t.Run("database error", func(t *testing.T) {
		testCases := []struct {
			dbErr         error
			expectedError error
		}{
			{
				tests.ErrFakeDB,
				tests.ErrFakeDB,
			},
			{
				util.ErrDBInsufficientPrivilege,
				hub.ErrInsufficientPrivilege,
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.dbErr.Error(), func(t *testing.T) {
				t.Parallel()
				db := &tests.DBMock{}
				db.On("QueryRow", ctx, getRepoByNameDBQ, "repo1", false).Return([]byte(`
				{
					"repository_id": "00000000-0000-0000-0000-000000000001",
					"name": "repo1",
					"organization_name": "orgName"
				}
				`), nil)
				db.On("Exec", ctx, transferRepoDBQ, "repo1", userIDP, orgP, false).Return(tc.dbErr)
				az := &authz.AuthorizerMock{}
				az.On("Authorize", ctx, &hub.AuthorizeInput{
					OrganizationName: "orgName",
					UserID:           "userID",
					Action:           hub.TransferOrganizationRepository,
				}).Return(nil)
				m := NewManager(cfg, db, az, nil)

				err := m.Transfer(ctx, "repo1", org, false)
				assert.Equal(t, tc.expectedError, err)
				db.AssertExpectations(t)
				az.AssertExpectations(t)
			})
		}
	})

	t.Run("transfer repository succeeded", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, getRepoByNameDBQ, "repo1", false).Return([]byte(`
		{
			"repository_id": "00000000-0000-0000-0000-000000000001",
			"name": "repo1",
			"user_alias": "user1"
		}
		`), nil)
		db.On("Exec", ctx, transferRepoDBQ, "repo1", userIDP, orgP, false).Return(nil)
		m := NewManager(cfg, db, nil, nil)

		err := m.Transfer(ctx, "repo1", org, false)
		assert.NoError(t, err)
		db.AssertExpectations(t)
	})
}

func TestUpdate(t *testing.T) {
	ctx := context.WithValue(context.Background(), hub.UserIDKey, "userID")

	t.Run("user id not found in ctx", func(t *testing.T) {
		t.Parallel()
		m := NewManager(cfg, nil, nil, nil)
		assert.Panics(t, func() {
			_ = m.Update(context.Background(), nil)
		})
	})

	t.Run("invalid input", func(t *testing.T) {
		testCases := []struct {
			errMsg string
			r      *hub.Repository
			lErr   error
		}{
			{
				"name not provided",
				&hub.Repository{
					Name: "",
				},
				nil,
			},
			{
				"url not provided",
				&hub.Repository{
					Name: "repo1",
					URL:  "",
				},
				nil,
			},
			{
				"missing protocol scheme",
				&hub.Repository{
					Kind: hub.Helm,
					Name: "repo1",
					URL:  ":::///",
				},
				nil,
			},
			{
				"scheme not supported",
				&hub.Repository{
					Kind: hub.Helm,
					Name: "repo1",
					URL:  "other://repo1.com",
				},
				nil,
			},
			{
				"urls with credentials not allowed",
				&hub.Repository{
					Kind: hub.Helm,
					Name: "repo1",
					URL:  "https://user:pass@repo1.com",
				},
				nil,
			},
			{
				"invalid url format",
				&hub.Repository{
					Kind: hub.OLM,
					Name: "repo1",
					URL:  "https://repo1.com",
				},
				nil,
			},
			{
				"the url provided does not point to a valid Helm repository",
				&hub.Repository{
					Name: "repo1",
					URL:  "https://repo1.com",
					Kind: hub.Helm,
				},
				errors.New("error loading index file"),
			},
			{
				"private repositories not allowed",
				&hub.Repository{
					Kind:     hub.Helm,
					Name:     "repo1",
					URL:      "https://repo1.com",
					AuthUser: "user1",
					AuthPass: "pass1",
				},
				nil,
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.errMsg, func(t *testing.T) {
				t.Parallel()
				l := &HelmIndexLoaderMock{}
				if tc.lErr != nil {
					l.On("LoadIndex", tc.r).Return(nil, "", tc.lErr)
				} else {
					l.On("LoadIndex", tc.r).Return(nil, "", nil).Maybe()
				}
				m := NewManager(cfg, nil, nil, nil, WithHelmIndexLoader(l))

				err := m.Update(ctx, tc.r)
				assert.True(t, errors.Is(err, hub.ErrInvalidInput))
				assert.Contains(t, err.Error(), tc.errMsg)
				l.AssertExpectations(t)
			})
		}
	})

	t.Run("authorization failed", func(t *testing.T) {
		t.Parallel()
		r := &hub.Repository{
			Name:        "repo1",
			DisplayName: "Repository 1",
			URL:         "https://repo1.com",
			Kind:        hub.Helm,
		}
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, getRepoByNameDBQ, "repo1", false).Return([]byte(`
		{
			"repository_id": "00000000-0000-0000-0000-000000000001",
			"name": "repo1",
			"organization_name": "orgName"
		}
		`), nil)
		az := &authz.AuthorizerMock{}
		az.On("Authorize", ctx, &hub.AuthorizeInput{
			OrganizationName: "orgName",
			UserID:           "userID",
			Action:           hub.UpdateOrganizationRepository,
		}).Return(tests.ErrFake)
		l := &HelmIndexLoaderMock{}
		l.On("LoadIndex", r).Return(nil, "", nil)
		m := NewManager(cfg, db, az, nil, WithHelmIndexLoader(l))

		err := m.Update(ctx, r)
		assert.Equal(t, tests.ErrFake, err)
		az.AssertExpectations(t)
		l.AssertExpectations(t)
	})

	t.Run("database error", func(t *testing.T) {
		testCases := []struct {
			r             *hub.Repository
			dbErr         error
			expectedError error
		}{
			{
				&hub.Repository{
					Name:        "repo1",
					DisplayName: "Repository 1",
					URL:         "https://repo1.com",
					Kind:        hub.Helm,
				},
				tests.ErrFakeDB,
				tests.ErrFakeDB,
			},
			{
				&hub.Repository{
					Name:        "repo1",
					DisplayName: "Repository 1",
					URL:         "https://repo1.com",
					Kind:        hub.Helm,
				},
				util.ErrDBInsufficientPrivilege,
				hub.ErrInsufficientPrivilege,
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.dbErr.Error(), func(t *testing.T) {
				t.Parallel()
				db := &tests.DBMock{}
				db.On("QueryRow", ctx, getRepoByNameDBQ, "repo1", false).Return([]byte(`
				{
					"repository_id": "00000000-0000-0000-0000-000000000001",
					"name": "repo1",
					"organization_name": "orgName"
				}
				`), nil)
				db.On("Exec", ctx, updateRepoDBQ, "userID", mock.Anything).Return(tc.dbErr)
				az := &authz.AuthorizerMock{}
				az.On("Authorize", ctx, &hub.AuthorizeInput{
					OrganizationName: "orgName",
					UserID:           "userID",
					Action:           hub.UpdateOrganizationRepository,
				}).Return(nil)

				l := &HelmIndexLoaderMock{}
				l.On("LoadIndex", tc.r).Return(nil, "", nil)
				m := NewManager(cfg, db, az, nil, WithHelmIndexLoader(l))

				err := m.Update(ctx, tc.r)
				assert.Equal(t, tc.expectedError, err)
				db.AssertExpectations(t)
				az.AssertExpectations(t)
				l.AssertExpectations(t)
			})
		}
	})

	t.Run("update repository succeeded", func(t *testing.T) {
		testCases := []struct {
			r *hub.Repository
		}{
			{
				&hub.Repository{
					Name:        "repo1",
					DisplayName: "Repository 1",
					URL:         "https://repo1.com",
					Kind:        hub.Helm,
				},
			},
			{
				&hub.Repository{
					Name:        "repo2",
					DisplayName: "Repository 2",
					URL:         "https://github.com/org2/repo2/path",
					Kind:        hub.OLM,
				},
			},
		}
		for i, tc := range testCases {
			tc := tc
			t.Run(strconv.Itoa(i), func(t *testing.T) {
				t.Parallel()
				repoJSON, _ := json.Marshal(tc.r)
				db := &tests.DBMock{}
				db.On("QueryRow", ctx, getRepoByNameDBQ, tc.r.Name, false).Return(repoJSON, nil)
				db.On("Exec", ctx, updateRepoDBQ, "userID", mock.Anything).Return(nil)
				l := &HelmIndexLoaderMock{}
				if tc.r.Kind == hub.Helm {
					l.On("LoadIndex", tc.r).Return(nil, "", nil)
				}
				m := NewManager(cfg, db, nil, nil, WithHelmIndexLoader(l))

				err := m.Update(ctx, tc.r)
				assert.NoError(t, err)
				db.AssertExpectations(t)
				l.AssertExpectations(t)
			})
		}
	})
}

func TestUpdateDigest(t *testing.T) {
	ctx := context.Background()
	repositoryID := "00000000-0000-0000-0000-000000000001"
	digest := "digest"

	t.Run("database update succeeded", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("Exec", ctx, updateRepoDigestDBQ, repositoryID, digest).Return(nil)
		m := NewManager(cfg, db, nil, nil)

		err := m.UpdateDigest(ctx, repositoryID, digest)
		assert.NoError(t, err)
		db.AssertExpectations(t)
	})

	t.Run("database error", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("Exec", ctx, updateRepoDigestDBQ, repositoryID, digest).Return(tests.ErrFakeDB)
		m := NewManager(cfg, db, nil, nil)

		err := m.UpdateDigest(ctx, repositoryID, digest)
		assert.Equal(t, tests.ErrFakeDB, err)
		db.AssertExpectations(t)
	})
}

func withRepositoryCloner(rc hub.RepositoryCloner) func(m *Manager) {
	return func(m *Manager) {
		m.rc = rc
	}
}
