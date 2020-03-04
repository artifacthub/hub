package hub

import (
	"context"
	"errors"
	"testing"

	"github.com/cncf/hub/internal/tests"
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
	t.Run("get existing repository by name", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On(
			"QueryRow",
			"select get_chart_repository_by_name($1::text)", "repo1",
		).Return([]byte(`
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
		db.On(
			"QueryRow",
			"select get_chart_repository_by_name($1::text)", "repo1",
		).Return(nil, errFakeDatabaseFailure)
		h := New(db, nil)

		r, err := h.GetChartRepositoryByName(context.Background(), "repo1")
		assert.Equal(t, errFakeDatabaseFailure, err)
		assert.Nil(t, r)
		db.AssertExpectations(t)
	})

	t.Run("invalid json data returned from database", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On(
			"QueryRow",
			"select get_chart_repository_by_name($1::text)", "repo1",
		).Return([]byte("invalid json"), nil)
		h := New(db, nil)

		r, err := h.GetChartRepositoryByName(context.Background(), "repo1")
		assert.Error(t, err)
		assert.Nil(t, r)
		db.AssertExpectations(t)
	})
}

func TestGetChartRepositories(t *testing.T) {
	db := &tests.DBMock{}
	db.On(
		"QueryRow",
		"select get_chart_repositories()",
	).Return([]byte(`
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

func TestGetChartRepositoryPackagesDigest(t *testing.T) {
	db := &tests.DBMock{}
	db.On(
		"QueryRow",
		"select get_chart_repository_packages_digest($1::uuid)", mock.Anything,
	).Return([]byte(`
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

func TestGetStatsJSON(t *testing.T) {
	t.Run("chart repositories data returned successfully", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On(
			"QueryRow",
			"select get_stats()",
		).Return([]byte("statsDataJSON"), nil)
		h := New(db, nil)

		data, err := h.GetStatsJSON(context.Background())
		assert.Equal(t, nil, err)
		assert.Equal(t, []byte("statsDataJSON"), data)
		db.AssertExpectations(t)
	})

	t.Run("database error", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On(
			"QueryRow",
			"select get_stats()",
		).Return(nil, errFakeDatabaseFailure)
		h := New(db, nil)

		data, err := h.GetStatsJSON(context.Background())
		assert.Equal(t, errFakeDatabaseFailure, err)
		assert.Nil(t, data)
		db.AssertExpectations(t)
	})
}

func TestSearchPackagesJSON(t *testing.T) {
	db := &tests.DBMock{}
	db.On(
		"QueryRow",
		"select search_packages($1::jsonb)", mock.Anything,
	).Return([]byte("searchResultsDataJSON"), nil)
	h := New(db, nil)

	query := &Query{Text: "kw1"}
	data, err := h.SearchPackagesJSON(context.Background(), query)
	assert.Equal(t, nil, err)
	assert.Equal(t, []byte("searchResultsDataJSON"), data)
	db.AssertExpectations(t)
}

func TestRegisterPackage(t *testing.T) {
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
		db.On(
			"Exec",
			"select register_package($1::jsonb)", mock.Anything,
		).Return(nil)
		h := New(db, nil)

		err := h.RegisterPackage(context.Background(), p)
		assert.Equal(t, nil, err)
		db.AssertExpectations(t)
	})

	t.Run("database error", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On(
			"Exec",
			"select register_package($1::jsonb)", mock.Anything,
		).Return(errFakeDatabaseFailure)
		h := New(db, nil)

		err := h.RegisterPackage(context.Background(), p)
		assert.Equal(t, errFakeDatabaseFailure, err)
		db.AssertExpectations(t)
	})
}

func TestGetPackageJSON(t *testing.T) {
	db := &tests.DBMock{}
	db.On(
		"QueryRow",
		"select get_package($1::jsonb)", mock.Anything,
	).Return([]byte("packageDataJSON"), nil)
	h := New(db, nil)

	data, err := h.GetPackageJSON(context.Background(), &GetPackageInput{})
	assert.Equal(t, nil, err)
	assert.Equal(t, []byte("packageDataJSON"), data)
	db.AssertExpectations(t)
}

func TestGetPackagesUpdatesJSON(t *testing.T) {
	db := &tests.DBMock{}
	db.On(
		"QueryRow",
		"select get_packages_updates()",
	).Return([]byte("packagesUpdatesDataJSON"), nil)
	h := New(db, nil)

	data, err := h.GetPackagesUpdatesJSON(context.Background())
	assert.Equal(t, nil, err)
	assert.Equal(t, []byte("packagesUpdatesDataJSON"), data)
	db.AssertExpectations(t)
}

func TestRegisterUser(t *testing.T) {
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
				db.On(
					"QueryRow",
					"select register_user($1::jsonb)", mock.Anything,
				).Return("emailVerificationCode", nil)
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
				err := h.RegisterUser(context.Background(), u)
				assert.Equal(t, tc.emailSenderResponse, err)
				assert.NoError(t, bcrypt.CompareHashAndPassword([]byte(u.Password), []byte("password")))
				db.AssertExpectations(t)
				es.AssertExpectations(t)
			})
		}
	})

	t.Run("database error registering user", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On(
			"QueryRow",
			"select register_user($1::jsonb)", mock.Anything,
		).Return("", errFakeDatabaseFailure)
		h := New(db, nil)

		u := &User{}
		err := h.RegisterUser(context.Background(), u)
		assert.Equal(t, errFakeDatabaseFailure, err)
		db.AssertExpectations(t)
	})
}

func TestVerifyEmail(t *testing.T) {
	t.Run("successful email verification", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On(
			"QueryRow",
			"select verify_email($1::uuid)", mock.Anything,
		).Return(true, nil)
		h := New(db, nil)

		verified, err := h.VerifyEmail(context.Background(), "emailVerificationCode")
		assert.Equal(t, nil, err)
		assert.Equal(t, true, verified)
		db.AssertExpectations(t)
	})

	t.Run("database error verifying email", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On(
			"QueryRow",
			"select verify_email($1::uuid)", mock.Anything,
		).Return(false, errFakeDatabaseFailure)
		h := New(db, nil)

		verified, err := h.VerifyEmail(context.Background(), "emailVerificationCode")
		assert.Equal(t, errFakeDatabaseFailure, err)
		assert.Equal(t, false, verified)
		db.AssertExpectations(t)
	})
}
