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

	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/tests"
	"github.com/artifacthub/hub/internal/util"
	"github.com/spf13/viper"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

var (
	cfg     = viper.New()
	errFake = errors.New("fake error for tests")
)

func TestAdd(t *testing.T) {
	dbQuery := "select add_repository($1::uuid, $2::text, $3::jsonb)"
	ctx := context.WithValue(context.Background(), hub.UserIDKey, "userID")

	t.Run("user id not found in ctx", func(t *testing.T) {
		m := NewManager(cfg, nil)
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
					Kind: hub.RepositoryKind(9),
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
				"invalid url",
				"org1",
				&hub.Repository{
					Kind: hub.OLM,
					Name: "repo1",
					URL:  "https://repo1.com",
				},
				nil,
			},
			{
				"invalid url",
				"org1",
				&hub.Repository{
					Kind: hub.OLM,
					Name: "repo1",
					URL:  "https://github.com/incomplete",
				},
				nil,
			},
			{
				"invalid url",
				"org1",
				&hub.Repository{
					Kind: hub.Helm,
					Name: "repo1",
					URL:  "https://repo1.com",
				},
				errors.New("invalid url"),
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.errMsg, func(t *testing.T) {
				l := &HelmIndexLoaderMock{}
				if tc.lErr != nil {
					l.On("LoadIndex", mock.Anything).Return(nil, tc.lErr)
				}
				m := NewManager(cfg, nil, WithHelmIndexLoader(l))

				err := m.Add(ctx, tc.orgName, tc.r)
				assert.True(t, errors.Is(err, hub.ErrInvalidInput))
				assert.Contains(t, err.Error(), tc.errMsg)
				l.AssertExpectations(t)
			})
		}
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
				tests.ErrFakeDatabaseFailure,
				tests.ErrFakeDatabaseFailure,
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
				db := &tests.DBMock{}
				db.On("Exec", ctx, dbQuery, "userID", "orgName", mock.Anything).Return(tc.dbErr)
				l := &HelmIndexLoaderMock{}
				l.On("LoadIndex", tc.r).Return(nil, nil)
				m := NewManager(cfg, db, WithHelmIndexLoader(l))

				err := m.Add(ctx, "orgName", tc.r)
				assert.Equal(t, tc.expectedError, err)
				db.AssertExpectations(t)
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
				db := &tests.DBMock{}
				db.On("Exec", ctx, dbQuery, "userID", "orgName", mock.Anything).Return(nil)
				l := &HelmIndexLoaderMock{}
				if tc.r.Kind == hub.Helm {
					l.On("LoadIndex", tc.r).Return(nil, nil)
				}
				m := NewManager(cfg, db, WithHelmIndexLoader(l))

				err := m.Add(ctx, "orgName", tc.r)
				assert.NoError(t, err)
				db.AssertExpectations(t)
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
				m := NewManager(cfg, nil)
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
				`select repository_id from repository where name = $1`,
				true,
			},
			{
				"repositoryURL",
				`select repository_id from repository where url = $1`,
				false,
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(fmt.Sprintf("resource kind: %s", tc.resourceKind), func(t *testing.T) {
				tc.dbQuery = fmt.Sprintf("select not exists (%s)", tc.dbQuery)
				db := &tests.DBMock{}
				db.On("QueryRow", ctx, tc.dbQuery, "value").Return(tc.available, nil)
				m := NewManager(cfg, db)

				available, err := m.CheckAvailability(ctx, tc.resourceKind, "value")
				assert.NoError(t, err)
				assert.Equal(t, tc.available, available)
				db.AssertExpectations(t)
			})
		}
	})

	t.Run("database error", func(t *testing.T) {
		db := &tests.DBMock{}
		dbQuery := `select not exists (select repository_id from repository where name = $1)`
		db.On("QueryRow", ctx, dbQuery, "value").Return(false, tests.ErrFakeDatabaseFailure)
		m := NewManager(cfg, db)

		available, err := m.CheckAvailability(ctx, "repositoryName", "value")
		assert.Equal(t, tests.ErrFakeDatabaseFailure, err)
		assert.False(t, available)
		db.AssertExpectations(t)
	})
}

func TestClaimOwnership(t *testing.T) {
	getRepoQuery := `select get_repository_by_name($1::text)`
	userEmailQuery := `select email from "user" where user_id = $1`
	transferRepoQuery := "select transfer_repository($1::text, $2::uuid, $3::text, $4::boolean)"
	userID := "userID"
	userIDP := &userID
	org := "org1"
	orgP := &org
	helmRepoJSON := []byte(`{"kind": 0, "url": "http://repo.url"}`)
	opaRepoJSON := []byte(`{"kind": 2, "url": "http://repo.url"}`)
	ctx := context.WithValue(context.Background(), hub.UserIDKey, userID)

	t.Run("user id not found in ctx", func(t *testing.T) {
		m := NewManager(cfg, nil)
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
				m := NewManager(cfg, nil)

				err := m.ClaimOwnership(ctx, tc.repoName, "")
				assert.True(t, errors.Is(err, hub.ErrInvalidInput))
			})
		}
	})

	t.Run("ownership claim failed: database error getting repository", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, getRepoQuery, "repo1").Return(nil, tests.ErrFakeDatabaseFailure)
		m := NewManager(cfg, db)

		err := m.ClaimOwnership(ctx, "repo1", org)
		assert.Equal(t, tests.ErrFakeDatabaseFailure, err)
		db.AssertExpectations(t)
	})

	t.Run("ownership claim failed: error getting repository metadata", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, getRepoQuery, "repo1").Return(helmRepoJSON, nil)
		hg := &tests.HTTPGetterMock{}
		hg.On("Get", "http://repo.url/artifacthub-repo.yml").Return(&http.Response{
			Body:       ioutil.NopCloser(strings.NewReader("")),
			StatusCode: http.StatusNotFound,
		}, nil)
		m := NewManager(cfg, db, withHTTPGetter(hg))

		err := m.ClaimOwnership(ctx, "repo1", org)
		assert.Error(t, err)
		db.AssertExpectations(t)
	})

	t.Run("ownership claim failed: database error getting user email", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, getRepoQuery, "repo1").Return(helmRepoJSON, nil)
		db.On("QueryRow", ctx, userEmailQuery, userID).Return("", tests.ErrFakeDatabaseFailure)
		hg := &tests.HTTPGetterMock{}
		mdFile, _ := os.Open("testdata/artifacthub-repo.yml")
		hg.On("Get", "http://repo.url/artifacthub-repo.yml").Return(&http.Response{
			Body:       mdFile,
			StatusCode: http.StatusOK,
		}, nil)
		m := NewManager(cfg, db, withHTTPGetter(hg))

		err := m.ClaimOwnership(ctx, "repo1", org)
		assert.Equal(t, tests.ErrFakeDatabaseFailure, err)
		db.AssertExpectations(t)
	})

	t.Run("ownership claim failed: user not in repository owners list", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, getRepoQuery, "repo1").Return(helmRepoJSON, nil)
		db.On("QueryRow", ctx, userEmailQuery, userID).Return("user1@email.com", nil)
		hg := &tests.HTTPGetterMock{}
		mdFile, _ := os.Open("testdata/artifacthub-repo.yml")
		hg.On("Get", "http://repo.url/artifacthub-repo.yml").Return(&http.Response{
			Body:       mdFile,
			StatusCode: http.StatusOK,
		}, nil)
		m := NewManager(cfg, db, withHTTPGetter(hg))

		err := m.ClaimOwnership(ctx, "repo1", org)
		assert.Equal(t, hub.ErrInsufficientPrivilege, err)
		db.AssertExpectations(t)
	})

	t.Run("ownership claim succeeded (helm)", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, getRepoQuery, "repo1").Return(helmRepoJSON, nil)
		db.On("QueryRow", ctx, userEmailQuery, userID).Return("owner1@email.com", nil)
		db.On("Exec", ctx, transferRepoQuery, "repo1", userIDP, orgP, true).Return(nil)
		hg := &tests.HTTPGetterMock{}
		mdFile, _ := os.Open("testdata/artifacthub-repo.yml")
		hg.On("Get", "http://repo.url/artifacthub-repo.yml").Return(&http.Response{
			Body:       mdFile,
			StatusCode: http.StatusOK,
		}, nil)
		m := NewManager(cfg, db, withHTTPGetter(hg))

		err := m.ClaimOwnership(ctx, "repo1", org)
		assert.Nil(t, err)
		db.AssertExpectations(t)
	})

	t.Run("ownership claim failed (opa): error cloning repository", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, getRepoQuery, "repo1").Return(opaRepoJSON, nil)
		rc := &ClonerMock{}
		var r *hub.Repository
		_ = json.Unmarshal(opaRepoJSON, &r)
		rc.On("CloneRepository", ctx, r).Return("", "", errFake)
		m := NewManager(cfg, db, withRepositoryCloner(rc))

		err := m.ClaimOwnership(ctx, "repo1", org)
		assert.Equal(t, errFake, err)
		db.AssertExpectations(t)
	})

	t.Run("ownership claim succeeded (opa)", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, getRepoQuery, "repo1").Return(opaRepoJSON, nil)
		db.On("QueryRow", ctx, userEmailQuery, userID).Return("owner1@email.com", nil)
		db.On("Exec", ctx, transferRepoQuery, "repo1", userIDP, orgP, true).Return(nil)
		rc := &ClonerMock{}
		var r *hub.Repository
		_ = json.Unmarshal(opaRepoJSON, &r)
		rc.On("CloneRepository", ctx, r).Return(".", "testdata", nil)
		m := NewManager(cfg, db, withRepositoryCloner(rc))

		err := m.ClaimOwnership(ctx, "repo1", org)
		assert.Nil(t, err)
		db.AssertExpectations(t)
	})
}

func TestDelete(t *testing.T) {
	dbQuery := "select delete_repository($1::uuid, $2::text)"
	ctx := context.WithValue(context.Background(), hub.UserIDKey, "userID")

	t.Run("user id not found in ctx", func(t *testing.T) {
		m := NewManager(cfg, nil)
		assert.Panics(t, func() {
			_ = m.Delete(context.Background(), "repo1")
		})
	})

	t.Run("invalid input", func(t *testing.T) {
		m := NewManager(cfg, nil)
		err := m.Delete(ctx, "")
		assert.True(t, errors.Is(err, hub.ErrInvalidInput))
	})

	t.Run("database error", func(t *testing.T) {
		testCases := []struct {
			dbErr         error
			expectedError error
		}{
			{
				tests.ErrFakeDatabaseFailure,
				tests.ErrFakeDatabaseFailure,
			},
			{
				util.ErrDBInsufficientPrivilege,
				hub.ErrInsufficientPrivilege,
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.dbErr.Error(), func(t *testing.T) {
				db := &tests.DBMock{}
				db.On("Exec", ctx, dbQuery, "userID", "repo1").Return(tc.dbErr)
				m := NewManager(cfg, db)

				err := m.Delete(ctx, "repo1")
				assert.Equal(t, tc.expectedError, err)
				db.AssertExpectations(t)
			})
		}
	})

	t.Run("delete repository succeeded", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("Exec", ctx, dbQuery, "userID", "repo1").Return(nil)
		m := NewManager(cfg, db)

		err := m.Delete(ctx, "repo1")
		assert.NoError(t, err)
		db.AssertExpectations(t)
	})
}

func TestGetAll(t *testing.T) {
	dbQuery := "select get_all_repositories()"
	ctx := context.Background()

	db := &tests.DBMock{}
	db.On("QueryRow", ctx, dbQuery).Return([]byte(`
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
	m := NewManager(cfg, db)

	r, err := m.GetAll(ctx)
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
	dbQuery := "select get_all_repositories()"
	ctx := context.WithValue(context.Background(), hub.UserIDKey, "userID")

	t.Run("database error", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, dbQuery).Return(nil, tests.ErrFakeDatabaseFailure)
		m := NewManager(cfg, db)

		dataJSON, err := m.GetAllJSON(ctx)
		assert.Equal(t, tests.ErrFakeDatabaseFailure, err)
		assert.Nil(t, dataJSON)
		db.AssertExpectations(t)
	})

	t.Run("all repositories data returned successfully", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, dbQuery).Return([]byte("dataJSON"), nil)
		m := NewManager(cfg, db)

		dataJSON, err := m.GetAllJSON(ctx)
		assert.NoError(t, err)
		assert.Equal(t, []byte("dataJSON"), dataJSON)
		db.AssertExpectations(t)
	})
}

func TestGetByID(t *testing.T) {
	dbQuery := "select get_repository_by_id($1::uuid)"
	ctx := context.Background()
	repoID := "00000000-0000-0000-0000-000000000001"

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
				m := NewManager(cfg, nil)

				_, err := m.GetByID(ctx, tc.repoID)
				assert.True(t, errors.Is(err, hub.ErrInvalidInput))
				assert.Contains(t, err.Error(), tc.errStr)
			})
		}
	})

	t.Run("database error", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, dbQuery, repoID).Return(nil, tests.ErrFakeDatabaseFailure)
		m := NewManager(cfg, db)

		r, err := m.GetByID(context.Background(), repoID)
		assert.Equal(t, tests.ErrFakeDatabaseFailure, err)
		assert.Nil(t, r)
		db.AssertExpectations(t)
	})

	t.Run("database query succeeded", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, dbQuery, repoID).Return([]byte(`
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
		m := NewManager(cfg, db)

		r, err := m.GetByID(context.Background(), repoID)
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
	dbQuery := "select get_repositories_by_kind($1::int)"
	ctx := context.Background()

	db := &tests.DBMock{}
	db.On("QueryRow", ctx, dbQuery, hub.Helm).Return([]byte(`
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
	m := NewManager(cfg, db)

	r, err := m.GetByKind(ctx, hub.Helm)
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
	dbQuery := "select get_repositories_by_kind($1::int)"
	ctx := context.WithValue(context.Background(), hub.UserIDKey, "userID")

	t.Run("database error", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, dbQuery, hub.OLM).Return(nil, tests.ErrFakeDatabaseFailure)
		m := NewManager(cfg, db)

		dataJSON, err := m.GetByKindJSON(ctx, hub.OLM)
		assert.Equal(t, tests.ErrFakeDatabaseFailure, err)
		assert.Nil(t, dataJSON)
		db.AssertExpectations(t)
	})

	t.Run("all repositories data returned successfully", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, dbQuery, hub.OLM).Return([]byte("dataJSON"), nil)
		m := NewManager(cfg, db)

		dataJSON, err := m.GetByKindJSON(ctx, hub.OLM)
		assert.NoError(t, err)
		assert.Equal(t, []byte("dataJSON"), dataJSON)
		db.AssertExpectations(t)
	})
}

func TestGetByName(t *testing.T) {
	dbQuery := "select get_repository_by_name($1::text)"
	ctx := context.Background()

	t.Run("invalid input", func(t *testing.T) {
		m := NewManager(cfg, nil)
		_, err := m.GetByName(ctx, "")
		assert.True(t, errors.Is(err, hub.ErrInvalidInput))
	})

	t.Run("get existing repository by name", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, dbQuery, "repo1").Return([]byte(`
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
		m := NewManager(cfg, db)

		r, err := m.GetByName(context.Background(), "repo1")
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
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, dbQuery, "repo1").Return(nil, tests.ErrFakeDatabaseFailure)
		m := NewManager(cfg, db)

		r, err := m.GetByName(context.Background(), "repo1")
		assert.Equal(t, tests.ErrFakeDatabaseFailure, err)
		assert.Nil(t, r)
		db.AssertExpectations(t)
	})

	t.Run("invalid json data returned from database", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, dbQuery, "repo1").Return([]byte("invalid json"), nil)
		m := NewManager(cfg, db)

		r, err := m.GetByName(context.Background(), "repo1")
		assert.Error(t, err)
		assert.Nil(t, r)
		db.AssertExpectations(t)
	})
}

func TestGetPackagesDigest(t *testing.T) {
	ctx := context.Background()

	t.Run("invalid input", func(t *testing.T) {
		m := NewManager(cfg, nil)
		_, err := m.GetPackagesDigest(context.Background(), "invalid")
		assert.True(t, errors.Is(err, hub.ErrInvalidInput))
	})

	t.Run("database query succeeded", func(t *testing.T) {
		dbQuery := "select get_repository_packages_digest($1::uuid)"
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, dbQuery, "00000000-0000-0000-0000-000000000001").Return([]byte(`
		{
			"package1@1.0.0": "digest-package1-1.0.0",
			"package1@0.0.9": "digest-package1-0.0.9",
			"package2@1.0.0": "digest-package2-1.0.0",
			"package2@0.0.9": "digest-package2-0.0.9"
		}
		`), nil)
		m := NewManager(cfg, db)

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
	dbQuery := "select get_org_repositories($1::uuid, $2::text)"
	ctx := context.WithValue(context.Background(), hub.UserIDKey, "userID")

	t.Run("user id not found in ctx", func(t *testing.T) {
		m := NewManager(cfg, nil)
		assert.Panics(t, func() {
			_, _ = m.GetOwnedByOrgJSON(context.Background(), "orgName")
		})
	})

	t.Run("invalid input", func(t *testing.T) {
		m := NewManager(cfg, nil)
		_, err := m.GetOwnedByOrgJSON(ctx, "")
		assert.True(t, errors.Is(err, hub.ErrInvalidInput))
	})

	t.Run("database error", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, dbQuery, "userID", "orgName").Return(nil, tests.ErrFakeDatabaseFailure)
		m := NewManager(cfg, db)

		dataJSON, err := m.GetOwnedByOrgJSON(ctx, "orgName")
		assert.Equal(t, tests.ErrFakeDatabaseFailure, err)
		assert.Nil(t, dataJSON)
		db.AssertExpectations(t)
	})

	t.Run("org repositories data returned successfully", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, dbQuery, "userID", "orgName").Return([]byte("dataJSON"), nil)
		m := NewManager(cfg, db)

		dataJSON, err := m.GetOwnedByOrgJSON(ctx, "orgName")
		assert.NoError(t, err)
		assert.Equal(t, []byte("dataJSON"), dataJSON)
		db.AssertExpectations(t)
	})
}

func TestGetOwnedByUserJSON(t *testing.T) {
	dbQuery := "select get_user_repositories($1::uuid)"
	ctx := context.WithValue(context.Background(), hub.UserIDKey, "userID")

	t.Run("user id not found in ctx", func(t *testing.T) {
		m := NewManager(cfg, nil)
		assert.Panics(t, func() {
			_, _ = m.GetOwnedByUserJSON(context.Background())
		})
	})

	t.Run("database error", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, dbQuery, "userID").Return(nil, tests.ErrFakeDatabaseFailure)
		m := NewManager(cfg, db)

		dataJSON, err := m.GetOwnedByUserJSON(ctx)
		assert.Equal(t, tests.ErrFakeDatabaseFailure, err)
		assert.Nil(t, dataJSON)
		db.AssertExpectations(t)
	})

	t.Run("user repositories data returned successfully", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, dbQuery, "userID").Return([]byte("dataJSON"), nil)
		m := NewManager(cfg, db)

		dataJSON, err := m.GetOwnedByUserJSON(ctx)
		assert.NoError(t, err)
		assert.Equal(t, []byte("dataJSON"), dataJSON)
		db.AssertExpectations(t)
	})
}

func TestSetLastTrackingResults(t *testing.T) {
	ctx := context.Background()
	repoID := "00000000-0000-0000-0000-000000000001"
	dbQuery := "select set_last_tracking_results($1::uuid, $2::text, $3::boolean)"

	t.Run("invalid input", func(t *testing.T) {
		m := NewManager(cfg, nil)
		err := m.SetLastTrackingResults(ctx, "invalid", "errors")
		assert.True(t, errors.Is(err, hub.ErrInvalidInput))
	})

	t.Run("database update succeeded", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("Exec", ctx, dbQuery, repoID, "errors", false).Return(nil)
		m := NewManager(cfg, db)

		err := m.SetLastTrackingResults(ctx, repoID, "errors")
		assert.NoError(t, err)
		db.AssertExpectations(t)
	})

	t.Run("database error", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("Exec", ctx, dbQuery, repoID, "errors", false).Return(tests.ErrFakeDatabaseFailure)
		m := NewManager(cfg, db)

		err := m.SetLastTrackingResults(ctx, repoID, "errors")
		assert.Equal(t, tests.ErrFakeDatabaseFailure, err)
		db.AssertExpectations(t)
	})
}

func TestSetVerifiedPublisher(t *testing.T) {
	ctx := context.Background()
	repoID := "00000000-0000-0000-0000-000000000001"
	dbQuery := "select set_verified_publisher($1::uuid, $2::boolean)"

	t.Run("invalid input", func(t *testing.T) {
		m := NewManager(cfg, nil)
		err := m.SetVerifiedPublisher(ctx, "invalid", true)
		assert.True(t, errors.Is(err, hub.ErrInvalidInput))
	})

	t.Run("database update succeeded", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("Exec", ctx, dbQuery, repoID, true).Return(nil)
		m := NewManager(cfg, db)

		err := m.SetVerifiedPublisher(ctx, repoID, true)
		assert.NoError(t, err)
		db.AssertExpectations(t)
	})

	t.Run("database error", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("Exec", ctx, dbQuery, repoID, true).Return(tests.ErrFakeDatabaseFailure)
		m := NewManager(cfg, db)

		err := m.SetVerifiedPublisher(ctx, repoID, true)
		assert.Equal(t, tests.ErrFakeDatabaseFailure, err)
		db.AssertExpectations(t)
	})
}

func TestTransfer(t *testing.T) {
	dbQuery := "select transfer_repository($1::text, $2::uuid, $3::text, $4::boolean)"
	ctx := context.WithValue(context.Background(), hub.UserIDKey, "userID")
	userID := "userID"
	userIDP := &userID
	org := "org1"
	orgP := &org

	t.Run("user id not found in ctx", func(t *testing.T) {
		m := NewManager(cfg, nil)
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
				m := NewManager(cfg, nil)

				err := m.Transfer(ctx, tc.repoName, "", false)
				assert.True(t, errors.Is(err, hub.ErrInvalidInput))
			})
		}
	})

	t.Run("database error", func(t *testing.T) {
		testCases := []struct {
			dbErr         error
			expectedError error
		}{
			{
				tests.ErrFakeDatabaseFailure,
				tests.ErrFakeDatabaseFailure,
			},
			{
				util.ErrDBInsufficientPrivilege,
				hub.ErrInsufficientPrivilege,
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.dbErr.Error(), func(t *testing.T) {
				db := &tests.DBMock{}
				db.On("Exec", ctx, dbQuery, "repo1", userIDP, orgP, false).Return(tc.dbErr)
				m := NewManager(cfg, db)

				err := m.Transfer(ctx, "repo1", org, false)
				assert.Equal(t, tc.expectedError, err)
				db.AssertExpectations(t)
			})
		}
	})

	t.Run("transfer repository succeeded", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("Exec", ctx, dbQuery, "repo1", userIDP, orgP, false).Return(nil)
		m := NewManager(cfg, db)

		err := m.Transfer(ctx, "repo1", org, false)
		assert.NoError(t, err)
		db.AssertExpectations(t)
	})
}

func TestUpdate(t *testing.T) {
	dbQuery := "select update_repository($1::uuid, $2::jsonb)"
	ctx := context.WithValue(context.Background(), hub.UserIDKey, "userID")

	t.Run("user id not found in ctx", func(t *testing.T) {
		m := NewManager(cfg, nil)
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
				"invalid url",
				&hub.Repository{
					Kind: hub.OLM,
					Name: "repo1",
					URL:  "https://repo1.com",
				},
				nil,
			},
			{
				"invalid url",
				&hub.Repository{
					Name: "repo1",
					URL:  "https://repo1.com",
					Kind: hub.Helm,
				},
				errors.New("invalid url"),
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.errMsg, func(t *testing.T) {
				l := &HelmIndexLoaderMock{}
				if tc.lErr != nil {
					l.On("LoadIndex", mock.Anything).Return(nil, tc.lErr)
				}
				m := NewManager(cfg, nil, WithHelmIndexLoader(l))

				err := m.Update(ctx, tc.r)
				assert.True(t, errors.Is(err, hub.ErrInvalidInput))
				l.AssertExpectations(t)
			})
		}
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
				tests.ErrFakeDatabaseFailure,
				tests.ErrFakeDatabaseFailure,
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
				db := &tests.DBMock{}
				db.On("Exec", ctx, dbQuery, "userID", mock.Anything).Return(tc.dbErr)
				l := &HelmIndexLoaderMock{}
				l.On("LoadIndex", tc.r).Return(nil, nil)
				m := NewManager(cfg, db, WithHelmIndexLoader(l))

				err := m.Update(ctx, tc.r)
				assert.Equal(t, tc.expectedError, err)
				db.AssertExpectations(t)
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
				db := &tests.DBMock{}
				db.On("Exec", ctx, dbQuery, "userID", mock.Anything).Return(nil)
				l := &HelmIndexLoaderMock{}
				if tc.r.Kind == hub.Helm {
					l.On("LoadIndex", tc.r).Return(nil, nil)
				}
				m := NewManager(cfg, db, WithHelmIndexLoader(l))

				err := m.Update(ctx, tc.r)
				assert.NoError(t, err)
				db.AssertExpectations(t)
				l.AssertExpectations(t)
			})
		}
	})
}

func withHTTPGetter(hg HTTPGetter) func(m *Manager) {
	return func(m *Manager) {
		m.hg = hg
	}
}

func withRepositoryCloner(rc hub.RepositoryCloner) func(m *Manager) {
	return func(m *Manager) {
		m.rc = rc
	}
}
