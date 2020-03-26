package hub

import (
	"context"
	"errors"
	"fmt"
	"testing"
	"time"

	"github.com/artifacthub/hub/internal/tests"
	"github.com/jackc/pgx/v4"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
	"golang.org/x/crypto/bcrypt"
)

var (
	errFakeDatabaseFailure    = errors.New("fake database failure")
	errFakeEmailSenderFailure = errors.New("fake email sender failure")
)

func TestNew(t *testing.T) {
	db := &tests.DBMock{}
	es := &tests.EmailSenderMock{}
	h := New(db, es)

	assert.IsType(t, &Hub{}, h)
	assert.Equal(t, db, h.db)
	assert.Equal(t, es, h.es)
}

func TestGetChartRepositoryByName(t *testing.T) {
	dbQuery := "select get_chart_repository_by_name($1::text)"

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
		h := New(db, nil)

		r, err := h.GetChartRepositoryByName(context.Background(), "repo1")
		require.NoError(t, err)
		assert.Equal(t, "00000000-0000-0000-0000-000000000001", r.ChartRepositoryID)
		assert.Equal(t, "repo1", r.Name)
		assert.Equal(t, "Repo 1", r.DisplayName)
		assert.Equal(t, "https://repo1.com", r.URL)
		db.AssertExpectations(t)
	})

	t.Run("database error calling get_chart_repository_by_name", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("QueryRow", dbQuery, "repo1").Return(nil, errFakeDatabaseFailure)
		h := New(db, nil)

		r, err := h.GetChartRepositoryByName(context.Background(), "repo1")
		assert.Equal(t, errFakeDatabaseFailure, err)
		assert.Nil(t, r)
		db.AssertExpectations(t)
	})

	t.Run("invalid json data returned from database", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("QueryRow", dbQuery, "repo1").Return([]byte("invalid json"), nil)
		h := New(db, nil)

		r, err := h.GetChartRepositoryByName(context.Background(), "repo1")
		assert.Error(t, err)
		assert.Nil(t, r)
		db.AssertExpectations(t)
	})
}

func TestGetChartRepositoryPackagesDigest(t *testing.T) {
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
	h := New(db, nil)

	pd, err := h.GetChartRepositoryPackagesDigest(context.Background(), "00000000-0000-0000-0000-000000000001")
	require.NoError(t, err)
	assert.Len(t, pd, 4)
	assert.Equal(t, "digest-package1-1.0.0", pd["package1@1.0.0"])
	assert.Equal(t, "digest-package1-0.0.9", pd["package1@0.0.9"])
	assert.Equal(t, "digest-package2-1.0.0", pd["package2@1.0.0"])
	assert.Equal(t, "digest-package2-0.0.9", pd["package2@0.0.9"])
	db.AssertExpectations(t)
}

func TestGetChartRepositories(t *testing.T) {
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
	h := New(db, nil)

	r, err := h.GetChartRepositories(context.Background())
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

func TestGetUserChartRepositoriesJSON(t *testing.T) {
	dbQuery := "select get_user_chart_repositories($1::uuid)"
	ctx := context.WithValue(context.Background(), UserIDKey, "userID")

	t.Run("user id not found in ctx", func(t *testing.T) {
		h := New(nil, nil)
		assert.Panics(t, func() {
			_, _ = h.GetUserChartRepositoriesJSON(context.Background())
		})
	})

	t.Run("database error", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("QueryRow", dbQuery, "userID").Return(nil, errFakeDatabaseFailure)
		h := New(db, nil)

		dataJSON, err := h.GetUserChartRepositoriesJSON(ctx)
		assert.Equal(t, errFakeDatabaseFailure, err)
		assert.Nil(t, dataJSON)
		db.AssertExpectations(t)
	})

	t.Run("user chart repositories data returned successfully", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("QueryRow", dbQuery, "userID").Return([]byte("dataJSON"), nil)
		h := New(db, nil)

		dataJSON, err := h.GetUserChartRepositoriesJSON(ctx)
		assert.NoError(t, err)
		assert.Equal(t, []byte("dataJSON"), dataJSON)
		db.AssertExpectations(t)
	})
}

func TestGetOrgChartRepositoriesJSON(t *testing.T) {
	dbQuery := "select get_org_chart_repositories($1::uuid, $2::text)"
	ctx := context.WithValue(context.Background(), UserIDKey, "userID")

	t.Run("user id not found in ctx", func(t *testing.T) {
		h := New(nil, nil)
		assert.Panics(t, func() {
			_, _ = h.GetOrgChartRepositoriesJSON(context.Background(), "orgName")
		})
	})

	t.Run("database error", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("QueryRow", dbQuery, "userID", "orgName").Return(nil, errFakeDatabaseFailure)
		h := New(db, nil)

		dataJSON, err := h.GetOrgChartRepositoriesJSON(ctx, "orgName")
		assert.Equal(t, errFakeDatabaseFailure, err)
		assert.Nil(t, dataJSON)
		db.AssertExpectations(t)
	})

	t.Run("user chart repositories data returned successfully", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("QueryRow", dbQuery, "userID", "orgName").Return([]byte("dataJSON"), nil)
		h := New(db, nil)

		dataJSON, err := h.GetOrgChartRepositoriesJSON(ctx, "orgName")
		assert.NoError(t, err)
		assert.Equal(t, []byte("dataJSON"), dataJSON)
		db.AssertExpectations(t)
	})
}

func TestAddChartRepository(t *testing.T) {
	dbQuery := "select add_chart_repository($1::uuid, $2::text, $3::jsonb)"
	ctx := context.WithValue(context.Background(), UserIDKey, "userID")

	r := &ChartRepository{
		Name:        "repo1",
		DisplayName: "Repository 1",
		URL:         "https://repo1.com",
	}

	t.Run("user id not found in ctx", func(t *testing.T) {
		h := New(nil, nil)
		assert.Panics(t, func() {
			_ = h.AddChartRepository(context.Background(), "orgName", r)
		})
	})

	t.Run("database error", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("Exec", dbQuery, "userID", "orgName", mock.Anything).Return(errFakeDatabaseFailure)
		h := New(db, nil)

		err := h.AddChartRepository(ctx, "orgName", r)
		assert.Equal(t, errFakeDatabaseFailure, err)
		db.AssertExpectations(t)
	})

	t.Run("add chart repository succeeded", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("Exec", dbQuery, "userID", "orgName", mock.Anything).Return(nil)
		h := New(db, nil)

		err := h.AddChartRepository(ctx, "orgName", r)
		assert.NoError(t, err)
		db.AssertExpectations(t)
	})
}

func TestUpdateChartRepository(t *testing.T) {
	dbQuery := "select update_chart_repository($1::uuid, $2::jsonb)"
	ctx := context.WithValue(context.Background(), UserIDKey, "userID")

	r := &ChartRepository{
		Name:        "repo1",
		DisplayName: "Repository 1",
		URL:         "https://repo1.com",
	}

	t.Run("user id not found in ctx", func(t *testing.T) {
		h := New(nil, nil)
		assert.Panics(t, func() {
			_ = h.UpdateChartRepository(context.Background(), r)
		})
	})

	t.Run("database error", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("Exec", dbQuery, "userID", mock.Anything).Return(errFakeDatabaseFailure)
		h := New(db, nil)

		err := h.UpdateChartRepository(ctx, r)
		assert.Equal(t, errFakeDatabaseFailure, err)
		db.AssertExpectations(t)
	})

	t.Run("update chart repository succeeded", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("Exec", dbQuery, "userID", mock.Anything).Return(nil)
		h := New(db, nil)

		err := h.UpdateChartRepository(ctx, r)
		assert.NoError(t, err)
		db.AssertExpectations(t)
	})
}

func TestDeleteChartRepository(t *testing.T) {
	dbQuery := "select delete_chart_repository($1::uuid, $2::text)"
	ctx := context.WithValue(context.Background(), UserIDKey, "userID")

	t.Run("user id not found in ctx", func(t *testing.T) {
		h := New(nil, nil)
		assert.Panics(t, func() {
			_ = h.DeleteChartRepository(context.Background(), "repo1")
		})
	})

	t.Run("database error", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("Exec", dbQuery, "userID", "repo1").Return(errFakeDatabaseFailure)
		h := New(db, nil)

		err := h.DeleteChartRepository(ctx, "repo1")
		assert.Equal(t, errFakeDatabaseFailure, err)
		db.AssertExpectations(t)
	})

	t.Run("delete chart repository succeeded", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("Exec", dbQuery, "userID", "repo1").Return(nil)
		h := New(db, nil)

		err := h.DeleteChartRepository(ctx, "repo1")
		assert.NoError(t, err)
		db.AssertExpectations(t)
	})
}

func TestSetChartRepositoryLastTrackingResults(t *testing.T) {
	dbQuery := `
	update chart_repository set
		last_tracking_ts = current_timestamp,
		last_tracking_errors = nullif($2, '')
	where chart_repository_id = $1`

	t.Run("database update succeeded", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("Exec", dbQuery, "repoID", "errors").Return(nil)
		h := New(db, nil)

		err := h.SetChartRepositoryLastTrackingResults(context.Background(), "repoID", "errors")
		assert.NoError(t, err)
		db.AssertExpectations(t)
	})

	t.Run("database error", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("Exec", dbQuery, "repoID", "errors").Return(errFakeDatabaseFailure)
		h := New(db, nil)

		err := h.SetChartRepositoryLastTrackingResults(context.Background(), "repoID", "errors")
		assert.Equal(t, errFakeDatabaseFailure, err)
		db.AssertExpectations(t)
	})
}

func TestGetPackagesStatsJSON(t *testing.T) {
	dbQuery := "select get_packages_stats()"

	t.Run("packages stats data returned successfully", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("QueryRow", dbQuery).Return([]byte("dataJSON"), nil)
		h := New(db, nil)

		dataJSON, err := h.GetPackagesStatsJSON(context.Background())
		assert.NoError(t, err)
		assert.Equal(t, []byte("dataJSON"), dataJSON)
		db.AssertExpectations(t)
	})

	t.Run("database error", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("QueryRow", dbQuery).Return(nil, errFakeDatabaseFailure)
		h := New(db, nil)

		dataJSON, err := h.GetPackagesStatsJSON(context.Background())
		assert.Equal(t, errFakeDatabaseFailure, err)
		assert.Nil(t, dataJSON)
		db.AssertExpectations(t)
	})
}

func TestSearchPackagesJSON(t *testing.T) {
	dbQuery := "select search_packages($1::jsonb)"
	input := &SearchPackageInput{Text: "kw1"}

	t.Run("database query succeeded", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("QueryRow", dbQuery, mock.Anything).Return([]byte("dataJSON"), nil)
		h := New(db, nil)

		dataJSON, err := h.SearchPackagesJSON(context.Background(), input)
		assert.NoError(t, err)
		assert.Equal(t, []byte("dataJSON"), dataJSON)
		db.AssertExpectations(t)
	})

	t.Run("database error", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("QueryRow", dbQuery, mock.Anything).Return(nil, errFakeDatabaseFailure)
		h := New(db, nil)

		dataJSON, err := h.SearchPackagesJSON(context.Background(), input)
		assert.Equal(t, errFakeDatabaseFailure, err)
		assert.Nil(t, dataJSON)
		db.AssertExpectations(t)
	})
}

func TestRegisterPackage(t *testing.T) {
	dbQuery := "select register_package($1::jsonb)"

	p := &Package{
		Kind:        Chart,
		Name:        "package1",
		Description: "description",
		HomeURL:     "home_url",
		LogoImageID: "image_id",
		Keywords:    []string{"kw1", "kw2"},
		Readme:      "readme-version-1.0.0",
		Links: []*Link{
			{
				Name: "Source",
				URL:  "source_url",
			},
		},
		Version:    "1.0.0",
		AppVersion: "12.1.0",
		Digest:     "digest-package1-1.0.0",
		Maintainers: []*Maintainer{
			{
				Name:  "name1",
				Email: "email1",
			},
			{
				Name:  "name2",
				Email: "email2",
			},
		},
		ChartRepository: &ChartRepository{
			ChartRepositoryID: "00000000-0000-0000-0000-000000000001",
		},
	}

	t.Run("successful package registration", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("Exec", dbQuery, mock.Anything).Return(nil)
		h := New(db, nil)

		err := h.RegisterPackage(context.Background(), p)
		assert.NoError(t, err)
		db.AssertExpectations(t)
	})

	t.Run("database error", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("Exec", dbQuery, mock.Anything).Return(errFakeDatabaseFailure)
		h := New(db, nil)

		err := h.RegisterPackage(context.Background(), p)
		assert.Equal(t, errFakeDatabaseFailure, err)
		db.AssertExpectations(t)
	})
}

func TestGetPackageJSON(t *testing.T) {
	dbQuery := "select get_package($1::jsonb)"

	t.Run("database query succeeded", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("QueryRow", dbQuery, mock.Anything).Return([]byte("dataJSON"), nil)
		h := New(db, nil)

		dataJSON, err := h.GetPackageJSON(context.Background(), &GetPackageInput{})
		assert.NoError(t, err)
		assert.Equal(t, []byte("dataJSON"), dataJSON)
		db.AssertExpectations(t)
	})

	t.Run("database error", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("QueryRow", dbQuery, mock.Anything).Return(nil, errFakeDatabaseFailure)
		h := New(db, nil)

		dataJSON, err := h.GetPackageJSON(context.Background(), &GetPackageInput{})
		assert.Equal(t, errFakeDatabaseFailure, err)
		assert.Nil(t, dataJSON)
		db.AssertExpectations(t)
	})
}

func TestGetPackagesUpdatesJSON(t *testing.T) {
	dbQuery := "select get_packages_updates()"

	t.Run("database query succeeded", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("QueryRow", dbQuery).Return([]byte("dataJSON"), nil)
		h := New(db, nil)

		dataJSON, err := h.GetPackagesUpdatesJSON(context.Background())
		assert.NoError(t, err)
		assert.Equal(t, []byte("dataJSON"), dataJSON)
		db.AssertExpectations(t)
	})

	t.Run("database error", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("QueryRow", dbQuery).Return(nil, errFakeDatabaseFailure)
		h := New(db, nil)

		dataJSON, err := h.GetPackagesUpdatesJSON(context.Background())
		assert.Equal(t, errFakeDatabaseFailure, err)
		assert.Nil(t, dataJSON)
		db.AssertExpectations(t)
	})
}

func TestRegisterUser(t *testing.T) {
	dbQuery := "select register_user($1::jsonb)"

	t.Run("successful user registration in database", func(t *testing.T) {
		testCases := []struct {
			description         string
			emailSenderResponse error
		}{
			{
				"email verification code sent successfully",
				nil,
			},
			{
				"error sending email verification code",
				errFakeEmailSenderFailure,
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.description, func(t *testing.T) {
				db := &tests.DBMock{}
				db.On("QueryRow", dbQuery, mock.Anything).Return("emailVerificationCode", nil)
				es := &tests.EmailSenderMock{}
				es.On("SendEmail", mock.Anything).Return(tc.emailSenderResponse)
				h := New(db, es)

				u := &User{
					Alias:     "alias",
					FirstName: "first_name",
					LastName:  "last_name",
					Email:     "email@email.com",
					Password:  "password",
				}
				err := h.RegisterUser(context.Background(), u, "")
				assert.Equal(t, tc.emailSenderResponse, err)
				assert.NoError(t, bcrypt.CompareHashAndPassword([]byte(u.Password), []byte("password")))
				db.AssertExpectations(t)
				es.AssertExpectations(t)
			})
		}
	})

	t.Run("database error registering user", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("QueryRow", dbQuery, mock.Anything).Return("", errFakeDatabaseFailure)
		h := New(db, nil)

		u := &User{}
		err := h.RegisterUser(context.Background(), u, "")
		assert.Equal(t, errFakeDatabaseFailure, err)
		db.AssertExpectations(t)
	})
}

func TestVerifyEmail(t *testing.T) {
	dbQuery := "select verify_email($1::uuid)"

	t.Run("successful email verification", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("QueryRow", dbQuery, "emailVerificationCode").Return(true, nil)
		h := New(db, nil)

		verified, err := h.VerifyEmail(context.Background(), "emailVerificationCode")
		assert.NoError(t, err)
		assert.True(t, verified)
		db.AssertExpectations(t)
	})

	t.Run("database error verifying email", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("QueryRow", dbQuery, "emailVerificationCode").Return(false, errFakeDatabaseFailure)
		h := New(db, nil)

		verified, err := h.VerifyEmail(context.Background(), "emailVerificationCode")
		assert.Equal(t, errFakeDatabaseFailure, err)
		assert.False(t, verified)
		db.AssertExpectations(t)
	})
}

func TestCheckCredentials(t *testing.T) {
	dbQuery := `select user_id, password from "user" where email = $1`

	t.Run("credentials provided not found in database", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("QueryRow", dbQuery, "email").Return(nil, pgx.ErrNoRows)
		h := New(db, nil)

		output, err := h.CheckCredentials(context.Background(), "email", "pass")
		assert.NoError(t, err)
		assert.False(t, output.Valid)
		assert.Empty(t, output.UserID)
		db.AssertExpectations(t)
	})

	t.Run("error getting credentials from database", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("QueryRow", dbQuery, "email").Return(nil, errFakeDatabaseFailure)
		h := New(db, nil)

		output, err := h.CheckCredentials(context.Background(), "email", "pass")
		assert.Equal(t, errFakeDatabaseFailure, err)
		assert.Nil(t, output)
		db.AssertExpectations(t)
	})

	t.Run("invalid credentials provided", func(t *testing.T) {
		pw, _ := bcrypt.GenerateFromPassword([]byte("pass"), bcrypt.DefaultCost)
		db := &tests.DBMock{}
		db.On("QueryRow", dbQuery, "email").Return([]interface{}{"userID", string(pw)}, nil)
		h := New(db, nil)

		output, err := h.CheckCredentials(context.Background(), "email", "pass2")
		assert.NoError(t, err)
		assert.False(t, output.Valid)
		assert.Empty(t, output.UserID)
		db.AssertExpectations(t)
	})

	t.Run("valid credentials provided", func(t *testing.T) {
		pw, _ := bcrypt.GenerateFromPassword([]byte("pass"), bcrypt.DefaultCost)
		db := &tests.DBMock{}
		db.On("QueryRow", dbQuery, "email").Return([]interface{}{"userID", string(pw)}, nil)
		h := New(db, nil)

		output, err := h.CheckCredentials(context.Background(), "email", "pass")
		assert.NoError(t, err)
		assert.True(t, output.Valid)
		assert.Equal(t, "userID", output.UserID)
		db.AssertExpectations(t)
	})
}

func TestRegisterSession(t *testing.T) {
	dbQuery := "select register_session($1::jsonb)"

	s := &Session{
		UserID:    "00000000-0000-0000-0000-000000000001",
		IP:        "192.168.1.100",
		UserAgent: "Safari 13.0.5",
	}

	t.Run("successful session registration", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("QueryRow", dbQuery, mock.Anything).Return([]byte("sessionID"), nil)
		h := New(db, nil)

		sessionID, err := h.RegisterSession(context.Background(), s)
		assert.NoError(t, err)
		assert.Equal(t, []byte("sessionID"), sessionID)
		db.AssertExpectations(t)
	})

	t.Run("database error", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("QueryRow", dbQuery, mock.Anything).Return(nil, errFakeDatabaseFailure)
		h := New(db, nil)

		sessionID, err := h.RegisterSession(context.Background(), s)
		assert.Equal(t, errFakeDatabaseFailure, err)
		assert.Nil(t, sessionID)
		db.AssertExpectations(t)
	})
}

func TestCheckSession(t *testing.T) {
	dbQuery := `
	select user_id, floor(extract(epoch from created_at))
	from session where session_id = $1
	`

	t.Run("session not found in database", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("QueryRow", dbQuery, []byte("sessionID")).Return(nil, pgx.ErrNoRows)
		h := New(db, nil)

		output, err := h.CheckSession(context.Background(), []byte("sessionID"), 1*time.Hour)
		assert.NoError(t, err)
		assert.False(t, output.Valid)
		assert.Empty(t, output.UserID)
		db.AssertExpectations(t)
	})

	t.Run("error getting session from database", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("QueryRow", dbQuery, []byte("sessionID")).Return(nil, errFakeDatabaseFailure)
		h := New(db, nil)

		output, err := h.CheckSession(context.Background(), []byte("sessionID"), 1*time.Hour)
		assert.Equal(t, errFakeDatabaseFailure, err)
		assert.Nil(t, output)
		db.AssertExpectations(t)
	})

	t.Run("session has expired", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("QueryRow", dbQuery, []byte("sessionID")).Return([]interface{}{"userID", int64(1)}, nil)
		h := New(db, nil)

		output, err := h.CheckSession(context.Background(), []byte("sessionID"), 1*time.Hour)
		assert.NoError(t, err)
		assert.False(t, output.Valid)
		assert.Empty(t, output.UserID)
		db.AssertExpectations(t)
	})

	t.Run("valid session", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("QueryRow", dbQuery, []byte("sessionID")).Return([]interface{}{
			"userID",
			time.Now().Unix(),
		}, nil)
		h := New(db, nil)

		output, err := h.CheckSession(context.Background(), []byte("sessionID"), 1*time.Hour)
		assert.NoError(t, err)
		assert.True(t, output.Valid)
		assert.Equal(t, "userID", output.UserID)
		db.AssertExpectations(t)
	})
}

func TestDeleteSession(t *testing.T) {
	dbQuery := "delete from session where session_id = $1"

	t.Run("delete session", func(t *testing.T) {
		testCases := []struct {
			description string
			dbResponse  interface{}
		}{
			{
				"session deleted successfully",
				nil,
			},
			{
				"error deleting session from database",
				errFakeDatabaseFailure,
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.description, func(t *testing.T) {
				db := &tests.DBMock{}
				db.On("Exec", dbQuery, []byte("sessionID")).Return(tc.dbResponse)
				h := New(db, nil)

				err := h.DeleteSession(context.Background(), []byte("sessionID"))
				assert.Equal(t, tc.dbResponse, err)
				db.AssertExpectations(t)
			})
		}
	})
}

func TestGetUserAlias(t *testing.T) {
	dbQuery := `select alias from "user" where user_id = $1`
	ctx := context.WithValue(context.Background(), UserIDKey, "userID")

	t.Run("database query succeeded", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("QueryRow", dbQuery, "userID").Return("alias", nil)
		h := New(db, nil)

		alias, err := h.GetUserAlias(ctx)
		assert.NoError(t, err)
		assert.Equal(t, "alias", alias)
		db.AssertExpectations(t)
	})

	t.Run("database error", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("QueryRow", dbQuery, "userID").Return("", errFakeDatabaseFailure)
		h := New(db, nil)

		alias, err := h.GetUserAlias(ctx)
		assert.Equal(t, errFakeDatabaseFailure, err)
		assert.Empty(t, alias)
		db.AssertExpectations(t)
	})
}

func TestGetUserOrganizationsJSON(t *testing.T) {
	dbQuery := `select get_user_organizations($1::uuid)`
	ctx := context.WithValue(context.Background(), UserIDKey, "userID")

	t.Run("user id not found in ctx", func(t *testing.T) {
		h := New(nil, nil)
		assert.Panics(t, func() {
			_, _ = h.GetUserOrganizationsJSON(context.Background())
		})
	})

	t.Run("database query succeeded", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("QueryRow", dbQuery, "userID").Return([]byte("dataJSON"), nil)
		h := New(db, nil)

		dataJSON, err := h.GetUserOrganizationsJSON(ctx)
		assert.NoError(t, err)
		assert.Equal(t, []byte("dataJSON"), dataJSON)
		db.AssertExpectations(t)
	})

	t.Run("database error", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("QueryRow", dbQuery, "userID").Return(nil, errFakeDatabaseFailure)
		h := New(db, nil)

		dataJSON, err := h.GetUserOrganizationsJSON(ctx)
		assert.Equal(t, errFakeDatabaseFailure, err)
		assert.Nil(t, dataJSON)
		db.AssertExpectations(t)
	})
}

func TestAddOrganization(t *testing.T) {
	dbQuery := `select add_organization($1::uuid, $2::jsonb)`
	ctx := context.WithValue(context.Background(), UserIDKey, "userID")

	t.Run("user id not found in ctx", func(t *testing.T) {
		h := New(nil, nil)
		assert.Panics(t, func() {
			_ = h.AddOrganization(context.Background(), &Organization{})
		})
	})

	t.Run("database query succeeded", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("Exec", dbQuery, "userID", mock.Anything).Return(nil)
		h := New(db, nil)

		err := h.AddOrganization(ctx, &Organization{})
		assert.NoError(t, err)
		db.AssertExpectations(t)
	})

	t.Run("database error", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("Exec", dbQuery, "userID", mock.Anything).Return(errFakeDatabaseFailure)
		h := New(db, nil)

		err := h.AddOrganization(ctx, &Organization{})
		assert.Equal(t, errFakeDatabaseFailure, err)
		db.AssertExpectations(t)
	})
}

func TestUpdateOrganization(t *testing.T) {
	dbQuery := `select update_organization($1::uuid, $2::jsonb)`
	ctx := context.WithValue(context.Background(), UserIDKey, "userID")

	t.Run("user id not found in ctx", func(t *testing.T) {
		h := New(nil, nil)
		assert.Panics(t, func() {
			_ = h.UpdateOrganization(context.Background(), &Organization{})
		})
	})

	t.Run("database query succeeded", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("Exec", dbQuery, "userID", mock.Anything).Return(nil)
		h := New(db, nil)

		err := h.UpdateOrganization(ctx, &Organization{})
		assert.NoError(t, err)
		db.AssertExpectations(t)
	})

	t.Run("database error", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("Exec", dbQuery, "userID", mock.Anything).Return(errFakeDatabaseFailure)
		h := New(db, nil)

		err := h.UpdateOrganization(ctx, &Organization{})
		assert.Equal(t, errFakeDatabaseFailure, err)
		db.AssertExpectations(t)
	})
}

func TestGetOrganizationMembersJSON(t *testing.T) {
	dbQuery := `select get_organization_members($1::uuid, $2::text)`
	ctx := context.WithValue(context.Background(), UserIDKey, "userID")

	t.Run("user id not found in ctx", func(t *testing.T) {
		h := New(nil, nil)
		assert.Panics(t, func() {
			_, _ = h.GetOrganizationMembersJSON(context.Background(), "orgName")
		})
	})

	t.Run("database query succeeded", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("QueryRow", dbQuery, "userID", "orgName").Return([]byte("dataJSON"), nil)
		h := New(db, nil)

		dataJSON, err := h.GetOrganizationMembersJSON(ctx, "orgName")
		assert.NoError(t, err)
		assert.Equal(t, []byte("dataJSON"), dataJSON)
		db.AssertExpectations(t)
	})

	t.Run("database error", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("QueryRow", dbQuery, "userID", "orgName").Return(nil, errFakeDatabaseFailure)
		h := New(db, nil)

		dataJSON, err := h.GetOrganizationMembersJSON(ctx, "orgName")
		assert.Equal(t, errFakeDatabaseFailure, err)
		assert.Nil(t, dataJSON)
		db.AssertExpectations(t)
	})
}

func TestAddOrganizationMember(t *testing.T) {
	dbQueryAddMember := `select add_organization_member($1::uuid, $2::text, $3::text)`
	dbQueryGetUserEmail := `select email from "user" where alias = $1`
	ctx := context.WithValue(context.Background(), UserIDKey, "userID")

	t.Run("user id not found in ctx", func(t *testing.T) {
		h := New(nil, nil)
		assert.Panics(t, func() {
			_ = h.AddOrganizationMember(context.Background(), "orgName", "userAlias", "")
		})
	})

	t.Run("database query succeeded", func(t *testing.T) {
		testCases := []struct {
			description         string
			emailSenderResponse error
		}{
			{
				"organization invitation email sent successfully",
				nil,
			},
			{
				"error sending organization invitation email",
				errFakeEmailSenderFailure,
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.description, func(t *testing.T) {
				db := &tests.DBMock{}
				db.On("Exec", dbQueryAddMember, "userID", "orgName", "userAlias").Return(nil)
				db.On("QueryRow", dbQueryGetUserEmail, mock.Anything).Return("email", nil)
				es := &tests.EmailSenderMock{}
				es.On("SendEmail", mock.Anything).Return(tc.emailSenderResponse)
				h := New(db, es)

				err := h.AddOrganizationMember(ctx, "orgName", "userAlias", "")
				assert.Equal(t, tc.emailSenderResponse, err)
				db.AssertExpectations(t)
				es.AssertExpectations(t)
			})
		}
	})

	t.Run("database error", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("Exec", dbQueryAddMember, "userID", "orgName", "userAlias").
			Return(errFakeDatabaseFailure)
		h := New(db, nil)

		err := h.AddOrganizationMember(ctx, "orgName", "userAlias", "")
		assert.Equal(t, errFakeDatabaseFailure, err)
		db.AssertExpectations(t)
	})
}

func TestConfirmOrganizationMembership(t *testing.T) {
	dbQuery := `select confirm_organization_membership($1::uuid, $2::text)`
	ctx := context.WithValue(context.Background(), UserIDKey, "userID")

	t.Run("user id not found in ctx", func(t *testing.T) {
		h := New(nil, nil)
		assert.Panics(t, func() {
			_ = h.ConfirmOrganizationMembership(context.Background(), "orgName")
		})
	})

	t.Run("database query succeeded", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("Exec", dbQuery, "userID", "orgName").Return(nil)
		h := New(db, nil)

		err := h.ConfirmOrganizationMembership(ctx, "orgName")
		assert.NoError(t, err)
		db.AssertExpectations(t)
	})

	t.Run("database error", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("Exec", dbQuery, "userID", "orgName").Return(errFakeDatabaseFailure)
		h := New(db, nil)

		err := h.ConfirmOrganizationMembership(ctx, "orgName")
		assert.Equal(t, errFakeDatabaseFailure, err)
		db.AssertExpectations(t)
	})
}

func TestDeleteOrganizationMember(t *testing.T) {
	dbQuery := `select delete_organization_member($1::uuid, $2::text, $3::text)`
	ctx := context.WithValue(context.Background(), UserIDKey, "userID")

	t.Run("user id not found in ctx", func(t *testing.T) {
		h := New(nil, nil)
		assert.Panics(t, func() {
			_ = h.DeleteOrganizationMember(context.Background(), "orgName", "userAlias")
		})
	})

	t.Run("database query succeeded", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("Exec", dbQuery, "userID", "orgName", "userAlias").Return(nil)
		h := New(db, nil)

		err := h.DeleteOrganizationMember(ctx, "orgName", "userAlias")
		assert.NoError(t, err)
		db.AssertExpectations(t)
	})

	t.Run("database error", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("Exec", dbQuery, "userID", "orgName", "userAlias").Return(errFakeDatabaseFailure)
		h := New(db, nil)

		err := h.DeleteOrganizationMember(ctx, "orgName", "userAlias")
		assert.Equal(t, errFakeDatabaseFailure, err)
		db.AssertExpectations(t)
	})
}

func TestCheckAvailability(t *testing.T) {
	t.Run("resource kind not supported", func(t *testing.T) {
		h := New(nil, nil)
		_, err := h.CheckAvailability(context.Background(), "invalidKind", "value")
		assert.Error(t, err)
	})

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
			{
				"organizationName",
				`select organization_id from organization where name = $1`,
				false,
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(fmt.Sprintf("resource kind: %s", tc.resourceKind), func(t *testing.T) {
				tc.dbQuery = fmt.Sprintf("select not exists (%s)", tc.dbQuery)
				db := &tests.DBMock{}
				db.On("QueryRow", tc.dbQuery, "value").Return(tc.available, nil)
				h := New(db, nil)

				available, err := h.CheckAvailability(context.Background(), tc.resourceKind, "value")
				assert.NoError(t, err)
				assert.Equal(t, tc.available, available)
				db.AssertExpectations(t)
			})
		}
	})

	t.Run("database error", func(t *testing.T) {
		db := &tests.DBMock{}
		dbQuery := `select not exists (select user_id from "user" where alias = $1)`
		db.On("QueryRow", dbQuery, "value").Return(false, errFakeDatabaseFailure)
		h := New(db, nil)

		available, err := h.CheckAvailability(context.Background(), "userAlias", "value")
		assert.Equal(t, errFakeDatabaseFailure, err)
		assert.False(t, available)
		db.AssertExpectations(t)
	})
}
