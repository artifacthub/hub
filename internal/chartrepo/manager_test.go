package chartrepo

import (
	"context"
	"errors"
	"fmt"
	"testing"

	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/tests"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

func TestAdd(t *testing.T) {
	dbQuery := "select add_chart_repository($1::uuid, $2::text, $3::jsonb)"
	ctx := context.WithValue(context.Background(), hub.UserIDKey, "userID")

	r := &hub.ChartRepository{
		Name:        "repo1",
		DisplayName: "Repository 1",
		URL:         "https://repo1.com",
	}

	t.Run("user id not found in ctx", func(t *testing.T) {
		m := NewManager(nil)
		assert.Panics(t, func() {
			_ = m.Add(context.Background(), "orgName", r)
		})
	})

	t.Run("invalid input", func(t *testing.T) {
		testCases := []struct {
			errMsg  string
			orgName string
			r       *hub.ChartRepository
			lErr    error
		}{
			{
				"name not provided",
				"org1",
				&hub.ChartRepository{
					Name: "",
				},
				nil,
			},
			{
				"url not provided",
				"org1",
				&hub.ChartRepository{
					Name: "repo1",
					URL:  "",
				},
				nil,
			},
			{
				"invalid name",
				"org1",
				&hub.ChartRepository{
					Name: "1repo",
					URL:  "https://repo1.com",
				},
				nil,
			},
			{
				"invalid name",
				"org1",
				&hub.ChartRepository{
					Name: "repo_underscore",
					URL:  "https://repo1.com",
				},
				nil,
			},
			{
				"invalid name",
				"org1",
				&hub.ChartRepository{
					Name: "REPO_UPPERCASE",
					URL:  "https://repo1.com",
				},
				nil,
			},
			{
				"invalid url",
				"org1",
				&hub.ChartRepository{
					Name: "repo1",
					URL:  "https://repo1.com",
				},
				errors.New("invalid url"),
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.errMsg, func(t *testing.T) {
				l := &IndexLoaderMock{}
				if tc.lErr != nil {
					l.On("LoadIndex", mock.Anything).Return(nil, tc.lErr)
				}
				m := NewManager(nil, WithIndexLoader(l))

				err := m.Add(ctx, tc.orgName, tc.r)
				assert.True(t, errors.Is(err, ErrInvalidInput))
				assert.Contains(t, err.Error(), tc.errMsg)
				l.AssertExpectations(t)
			})
		}
	})

	t.Run("database error", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("Exec", dbQuery, "userID", "orgName", mock.Anything).Return(tests.ErrFakeDatabaseFailure)
		l := &IndexLoaderMock{}
		l.On("LoadIndex", mock.Anything).Return(nil, nil)
		m := NewManager(db, WithIndexLoader(l))

		err := m.Add(ctx, "orgName", r)
		assert.Equal(t, tests.ErrFakeDatabaseFailure, err)
		db.AssertExpectations(t)
		l.AssertExpectations(t)
	})

	t.Run("add chart repository succeeded", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("Exec", dbQuery, "userID", "orgName", mock.Anything).Return(nil)
		l := &IndexLoaderMock{}
		l.On("LoadIndex", mock.Anything).Return(nil, nil)
		m := NewManager(db, WithIndexLoader(l))

		err := m.Add(ctx, "orgName", r)
		assert.NoError(t, err)
		db.AssertExpectations(t)
		l.AssertExpectations(t)
	})
}

func TestCheckAvailability(t *testing.T) {
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
				"chartRepositoryName",
				"",
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.errMsg, func(t *testing.T) {
				m := NewManager(nil)
				_, err := m.CheckAvailability(context.Background(), tc.resourceKind, tc.value)
				assert.True(t, errors.Is(err, ErrInvalidInput))
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
				db := &tests.DBMock{}
				db.On("QueryRow", tc.dbQuery, "value").Return(tc.available, nil)
				m := NewManager(db)

				available, err := m.CheckAvailability(context.Background(), tc.resourceKind, "value")
				assert.NoError(t, err)
				assert.Equal(t, tc.available, available)
				db.AssertExpectations(t)
			})
		}
	})

	t.Run("database error", func(t *testing.T) {
		db := &tests.DBMock{}
		dbQuery := `select not exists (select chart_repository_id from chart_repository where name = $1)`
		db.On("QueryRow", dbQuery, "value").Return(false, tests.ErrFakeDatabaseFailure)
		m := NewManager(db)

		available, err := m.CheckAvailability(context.Background(), "chartRepositoryName", "value")
		assert.Equal(t, tests.ErrFakeDatabaseFailure, err)
		assert.False(t, available)
		db.AssertExpectations(t)
	})
}

func TestDelete(t *testing.T) {
	dbQuery := "select delete_chart_repository($1::uuid, $2::text)"
	ctx := context.WithValue(context.Background(), hub.UserIDKey, "userID")

	t.Run("user id not found in ctx", func(t *testing.T) {
		m := NewManager(nil)
		assert.Panics(t, func() {
			_ = m.Delete(context.Background(), "repo1")
		})
	})

	t.Run("invalid input", func(t *testing.T) {
		m := NewManager(nil)
		err := m.Delete(ctx, "")
		assert.True(t, errors.Is(err, ErrInvalidInput))
	})

	t.Run("database error", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("Exec", dbQuery, "userID", "repo1").Return(tests.ErrFakeDatabaseFailure)
		m := NewManager(db)

		err := m.Delete(ctx, "repo1")
		assert.Equal(t, tests.ErrFakeDatabaseFailure, err)
		db.AssertExpectations(t)
	})

	t.Run("delete chart repository succeeded", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("Exec", dbQuery, "userID", "repo1").Return(nil)
		m := NewManager(db)

		err := m.Delete(ctx, "repo1")
		assert.NoError(t, err)
		db.AssertExpectations(t)
	})
}

func TestGetAll(t *testing.T) {
	dbQuery := "select get_chart_repositories()"
	db := &tests.DBMock{}
	db.On("QueryRow", dbQuery).Return([]byte(`
	[{
        "chart_repository_id": "00000000-0000-0000-0000-000000000001",
        "name": "repo1",
        "display_name": "Repo 1",
        "url": "https://repo1.com"
    }, {
        "chart_repository_id": "00000000-0000-0000-0000-000000000002",
        "name": "repo2",
        "display_name": "Repo 2",
        "url": "https://repo2.com"
    }, {
        "chart_repository_id": "00000000-0000-0000-0000-000000000003",
        "name": "repo3",
        "display_name": "Repo 3",
        "url": "https://repo3.com"
    }]
	`), nil)
	m := NewManager(db)

	r, err := m.GetAll(context.Background())
	require.NoError(t, err)
	assert.Len(t, r, 3)
	assert.Equal(t, "00000000-0000-0000-0000-000000000001", r[0].ChartRepositoryID)
	assert.Equal(t, "repo1", r[0].Name)
	assert.Equal(t, "Repo 1", r[0].DisplayName)
	assert.Equal(t, "https://repo1.com", r[0].URL)
	assert.Equal(t, "00000000-0000-0000-0000-000000000002", r[1].ChartRepositoryID)
	assert.Equal(t, "repo2", r[1].Name)
	assert.Equal(t, "Repo 2", r[1].DisplayName)
	assert.Equal(t, "https://repo2.com", r[1].URL)
	assert.Equal(t, "00000000-0000-0000-0000-000000000003", r[2].ChartRepositoryID)
	assert.Equal(t, "repo3", r[2].Name)
	assert.Equal(t, "Repo 3", r[2].DisplayName)
	assert.Equal(t, "https://repo3.com", r[2].URL)
	db.AssertExpectations(t)
}

func TestGetByName(t *testing.T) {
	dbQuery := "select get_chart_repository_by_name($1::text)"

	t.Run("invalid input", func(t *testing.T) {
		m := NewManager(nil)
		_, err := m.GetByName(context.Background(), "")
		assert.True(t, errors.Is(err, ErrInvalidInput))
	})

	t.Run("get existing repository by name", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("QueryRow", dbQuery, "repo1").Return([]byte(`
		{
			"chart_repository_id": "00000000-0000-0000-0000-000000000001",
			"name": "repo1",
			"display_name": "Repo 1",
			"url": "https://repo1.com"
		}
		`), nil)
		m := NewManager(db)

		r, err := m.GetByName(context.Background(), "repo1")
		require.NoError(t, err)
		assert.Equal(t, "00000000-0000-0000-0000-000000000001", r.ChartRepositoryID)
		assert.Equal(t, "repo1", r.Name)
		assert.Equal(t, "Repo 1", r.DisplayName)
		assert.Equal(t, "https://repo1.com", r.URL)
		db.AssertExpectations(t)
	})

	t.Run("database error calling get_chart_repository_by_name", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("QueryRow", dbQuery, "repo1").Return(nil, tests.ErrFakeDatabaseFailure)
		m := NewManager(db)

		r, err := m.GetByName(context.Background(), "repo1")
		assert.Equal(t, tests.ErrFakeDatabaseFailure, err)
		assert.Nil(t, r)
		db.AssertExpectations(t)
	})

	t.Run("invalid json data returned from database", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("QueryRow", dbQuery, "repo1").Return([]byte("invalid json"), nil)
		m := NewManager(db)

		r, err := m.GetByName(context.Background(), "repo1")
		assert.Error(t, err)
		assert.Nil(t, r)
		db.AssertExpectations(t)
	})
}

func TestGetPackagesDigest(t *testing.T) {
	t.Run("invalid input", func(t *testing.T) {
		m := NewManager(nil)
		_, err := m.GetPackagesDigest(context.Background(), "invalid")
		assert.True(t, errors.Is(err, ErrInvalidInput))
	})

	t.Run("database query succeeded", func(t *testing.T) {
		dbQuery := "select get_chart_repository_packages_digest($1::uuid)"
		db := &tests.DBMock{}
		db.On("QueryRow", dbQuery, "00000000-0000-0000-0000-000000000001").Return([]byte(`
		{
			"package1@1.0.0": "digest-package1-1.0.0",
			"package1@0.0.9": "digest-package1-0.0.9",
			"package2@1.0.0": "digest-package2-1.0.0",
			"package2@0.0.9": "digest-package2-0.0.9"
		}
		`), nil)
		m := NewManager(db)

		pd, err := m.GetPackagesDigest(context.Background(), "00000000-0000-0000-0000-000000000001")
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
	dbQuery := "select get_org_chart_repositories($1::uuid, $2::text)"
	ctx := context.WithValue(context.Background(), hub.UserIDKey, "userID")

	t.Run("user id not found in ctx", func(t *testing.T) {
		m := NewManager(nil)
		assert.Panics(t, func() {
			_, _ = m.GetOwnedByOrgJSON(context.Background(), "orgName")
		})
	})

	t.Run("invalid input", func(t *testing.T) {
		m := NewManager(nil)
		_, err := m.GetOwnedByOrgJSON(ctx, "")
		assert.True(t, errors.Is(err, ErrInvalidInput))
	})

	t.Run("database error", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("QueryRow", dbQuery, "userID", "orgName").Return(nil, tests.ErrFakeDatabaseFailure)
		m := NewManager(db)

		dataJSON, err := m.GetOwnedByOrgJSON(ctx, "orgName")
		assert.Equal(t, tests.ErrFakeDatabaseFailure, err)
		assert.Nil(t, dataJSON)
		db.AssertExpectations(t)
	})

	t.Run("user chart repositories data returned successfully", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("QueryRow", dbQuery, "userID", "orgName").Return([]byte("dataJSON"), nil)
		m := NewManager(db)

		dataJSON, err := m.GetOwnedByOrgJSON(ctx, "orgName")
		assert.NoError(t, err)
		assert.Equal(t, []byte("dataJSON"), dataJSON)
		db.AssertExpectations(t)
	})
}

func TestGetOwnedByUserJSON(t *testing.T) {
	dbQuery := "select get_user_chart_repositories($1::uuid)"
	ctx := context.WithValue(context.Background(), hub.UserIDKey, "userID")

	t.Run("user id not found in ctx", func(t *testing.T) {
		m := NewManager(nil)
		assert.Panics(t, func() {
			_, _ = m.GetOwnedByUserJSON(context.Background())
		})
	})

	t.Run("database error", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("QueryRow", dbQuery, "userID").Return(nil, tests.ErrFakeDatabaseFailure)
		m := NewManager(db)

		dataJSON, err := m.GetOwnedByUserJSON(ctx)
		assert.Equal(t, tests.ErrFakeDatabaseFailure, err)
		assert.Nil(t, dataJSON)
		db.AssertExpectations(t)
	})

	t.Run("user chart repositories data returned successfully", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("QueryRow", dbQuery, "userID").Return([]byte("dataJSON"), nil)
		m := NewManager(db)

		dataJSON, err := m.GetOwnedByUserJSON(ctx)
		assert.NoError(t, err)
		assert.Equal(t, []byte("dataJSON"), dataJSON)
		db.AssertExpectations(t)
	})
}

func TestSetLastTrackingResults(t *testing.T) {
	repoID := "00000000-0000-0000-0000-000000000001"
	dbQuery := `
	update chart_repository set
		last_tracking_ts = current_timestamp,
		last_tracking_errors = nullif($2, '')
	where chart_repository_id = $1`

	t.Run("invalid input", func(t *testing.T) {
		m := NewManager(nil)
		err := m.SetLastTrackingResults(context.Background(), "invalid", "errors")
		assert.True(t, errors.Is(err, ErrInvalidInput))
	})

	t.Run("database update succeeded", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("Exec", dbQuery, repoID, "errors").Return(nil)
		m := NewManager(db)

		err := m.SetLastTrackingResults(context.Background(), repoID, "errors")
		assert.NoError(t, err)
		db.AssertExpectations(t)
	})

	t.Run("database error", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("Exec", dbQuery, repoID, "errors").Return(tests.ErrFakeDatabaseFailure)
		m := NewManager(db)

		err := m.SetLastTrackingResults(context.Background(), repoID, "errors")
		assert.Equal(t, tests.ErrFakeDatabaseFailure, err)
		db.AssertExpectations(t)
	})
}

func TestUpdate(t *testing.T) {
	dbQuery := "select update_chart_repository($1::uuid, $2::jsonb)"
	ctx := context.WithValue(context.Background(), hub.UserIDKey, "userID")

	r := &hub.ChartRepository{
		Name:        "repo1",
		DisplayName: "Repository 1",
		URL:         "https://repo1.com",
	}

	t.Run("user id not found in ctx", func(t *testing.T) {
		m := NewManager(nil)
		assert.Panics(t, func() {
			_ = m.Update(context.Background(), r)
		})
	})

	t.Run("invalid input", func(t *testing.T) {
		testCases := []struct {
			errMsg string
			r      *hub.ChartRepository
			lErr   error
		}{
			{
				"name not provided",
				&hub.ChartRepository{
					Name: "",
				},
				nil,
			},
			{
				"url not provided",
				&hub.ChartRepository{
					Name: "repo1",
					URL:  "",
				},
				nil,
			},
			{
				"invalid url",
				&hub.ChartRepository{
					Name: "repo1",
					URL:  "https://repo1.com",
				},
				errors.New("invalid url"),
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.errMsg, func(t *testing.T) {
				l := &IndexLoaderMock{}
				if tc.lErr != nil {
					l.On("LoadIndex", mock.Anything).Return(nil, tc.lErr)
				}
				m := NewManager(nil, WithIndexLoader(l))

				err := m.Update(ctx, tc.r)
				assert.True(t, errors.Is(err, ErrInvalidInput))
				l.AssertExpectations(t)
			})
		}
	})

	t.Run("database error", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("Exec", dbQuery, "userID", mock.Anything).Return(tests.ErrFakeDatabaseFailure)
		l := &IndexLoaderMock{}
		l.On("LoadIndex", mock.Anything).Return(nil, nil)
		m := NewManager(db, WithIndexLoader(l))

		err := m.Update(ctx, r)
		assert.Equal(t, tests.ErrFakeDatabaseFailure, err)
		db.AssertExpectations(t)
		l.AssertExpectations(t)
	})

	t.Run("update chart repository succeeded", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("Exec", dbQuery, "userID", mock.Anything).Return(nil)
		l := &IndexLoaderMock{}
		l.On("LoadIndex", mock.Anything).Return(nil, nil)
		m := NewManager(db, WithIndexLoader(l))

		err := m.Update(ctx, r)
		assert.NoError(t, err)
		db.AssertExpectations(t)
		l.AssertExpectations(t)
	})
}
