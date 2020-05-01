package pkg

import (
	"context"
	"errors"
	"fmt"
	"testing"

	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/tests"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

func TestGetJSON(t *testing.T) {
	dbQuery := "select get_package($1::jsonb)"

	t.Run("invalid input", func(t *testing.T) {
		m := NewManager(nil)
		_, err := m.GetJSON(context.Background(), &hub.GetPackageInput{})
		assert.True(t, errors.Is(err, ErrInvalidInput))
	})

	t.Run("database query succeeded", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("QueryRow", dbQuery, mock.Anything, mock.Anything).Return([]byte("dataJSON"), nil)
		m := NewManager(db)

		dataJSON, err := m.GetJSON(context.Background(), &hub.GetPackageInput{PackageName: "pkg1"})
		assert.NoError(t, err)
		assert.Equal(t, []byte("dataJSON"), dataJSON)
		db.AssertExpectations(t)
	})

	t.Run("database error", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("QueryRow", dbQuery, mock.Anything, mock.Anything).Return(nil, tests.ErrFakeDatabaseFailure)
		m := NewManager(db)

		dataJSON, err := m.GetJSON(context.Background(), &hub.GetPackageInput{PackageName: "pkg1"})
		assert.Equal(t, tests.ErrFakeDatabaseFailure, err)
		assert.Nil(t, dataJSON)
		db.AssertExpectations(t)
	})
}

func TestGetStarredByUserJSON(t *testing.T) {
	dbQuery := "select get_packages_starred_by_user($1::uuid)"
	ctx := context.WithValue(context.Background(), hub.UserIDKey, "userID")

	t.Run("user id not found in ctx", func(t *testing.T) {
		m := NewManager(nil)
		assert.Panics(t, func() {
			_, _ = m.GetStarredByUserJSON(context.Background())
		})
	})

	t.Run("database query succeeded", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("QueryRow", dbQuery, "userID").Return([]byte("dataJSON"), nil)
		m := NewManager(db)

		dataJSON, err := m.GetStarredByUserJSON(ctx)
		assert.NoError(t, err)
		assert.Equal(t, []byte("dataJSON"), dataJSON)
		db.AssertExpectations(t)
	})

	t.Run("database error", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("QueryRow", dbQuery, "userID").Return(nil, tests.ErrFakeDatabaseFailure)
		m := NewManager(db)

		dataJSON, err := m.GetStarredByUserJSON(ctx)
		assert.Equal(t, tests.ErrFakeDatabaseFailure, err)
		assert.Nil(t, dataJSON)
		db.AssertExpectations(t)
	})
}

func TestGetStatsJSON(t *testing.T) {
	dbQuery := "select get_packages_stats()"

	t.Run("packages stats data returned successfully", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("QueryRow", dbQuery).Return([]byte("dataJSON"), nil)
		m := NewManager(db)

		dataJSON, err := m.GetStatsJSON(context.Background())
		assert.NoError(t, err)
		assert.Equal(t, []byte("dataJSON"), dataJSON)
		db.AssertExpectations(t)
	})

	t.Run("database error", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("QueryRow", dbQuery).Return(nil, tests.ErrFakeDatabaseFailure)
		m := NewManager(db)

		dataJSON, err := m.GetStatsJSON(context.Background())
		assert.Equal(t, tests.ErrFakeDatabaseFailure, err)
		assert.Nil(t, dataJSON)
		db.AssertExpectations(t)
	})
}

func TestGetUpdatesJSON(t *testing.T) {
	dbQuery := "select get_packages_updates()"

	t.Run("database query succeeded", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("QueryRow", dbQuery).Return([]byte("dataJSON"), nil)
		m := NewManager(db)

		dataJSON, err := m.GetUpdatesJSON(context.Background())
		assert.NoError(t, err)
		assert.Equal(t, []byte("dataJSON"), dataJSON)
		db.AssertExpectations(t)
	})

	t.Run("database error", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("QueryRow", dbQuery).Return(nil, tests.ErrFakeDatabaseFailure)
		m := NewManager(db)

		dataJSON, err := m.GetUpdatesJSON(context.Background())
		assert.Equal(t, tests.ErrFakeDatabaseFailure, err)
		assert.Nil(t, dataJSON)
		db.AssertExpectations(t)
	})
}

func TestRegister(t *testing.T) {
	dbQuery := "select register_package($1::jsonb)"

	p := &hub.Package{
		Kind:        hub.Chart,
		Name:        "package1",
		Description: "description",
		HomeURL:     "home_url",
		LogoImageID: "image_id",
		Keywords:    []string{"kw1", "kw2"},
		Readme:      "readme-version-1.0.0",
		Links: []*hub.Link{
			{
				Name: "Source",
				URL:  "source_url",
			},
		},
		Version:    "1.0.0",
		AppVersion: "12.1.0",
		Digest:     "digest-package1-1.0.0",
		Maintainers: []*hub.Maintainer{
			{
				Name:  "name1",
				Email: "email1",
			},
			{
				Name:  "name2",
				Email: "email2",
			},
		},
		ChartRepository: &hub.ChartRepository{
			ChartRepositoryID: "00000000-0000-0000-0000-000000000001",
		},
	}

	t.Run("invalid input", func(t *testing.T) {
		testCases := []struct {
			errMsg string
			p      *hub.Package
		}{
			{
				"invalid kind",
				&hub.Package{
					Kind: hub.PackageKind(99),
				},
			},
			{
				"name not provided",
				&hub.Package{
					Kind: hub.Chart,
				},
			},
			{
				"version not provided",
				&hub.Package{
					Kind: hub.Chart,
					Name: "package1",
				},
			},
			{
				"invalid version (semantic version expected)",
				&hub.Package{
					Kind:    hub.Chart,
					Name:    "package1",
					Version: "1.0",
				},
			},
			{
				"chart repository not provided",
				&hub.Package{
					Kind:    hub.Chart,
					Name:    "package1",
					Version: "1.0.0",
				},
			},
			{
				"chart repository id not provided",
				&hub.Package{
					Kind:    hub.Chart,
					Name:    "package1",
					Version: "1.0.0",
					ChartRepository: &hub.ChartRepository{
						ChartRepositoryID: "",
					},
				},
			},
			{
				"invalid chart repository id",
				&hub.Package{
					Kind:    hub.Chart,
					Name:    "package1",
					Version: "1.0.0",
					ChartRepository: &hub.ChartRepository{
						ChartRepositoryID: "invalid",
					},
				},
			},
			{
				"unexpected user id provided",
				&hub.Package{
					Kind:    hub.Chart,
					Name:    "package1",
					Version: "1.0.0",
					ChartRepository: &hub.ChartRepository{
						ChartRepositoryID: "00000000-0000-0000-0000-000000000001",
					},
					UserID: "unexpected",
				},
			},
			{
				"unexpected organization id provided",
				&hub.Package{
					Kind:    hub.Chart,
					Name:    "package1",
					Version: "1.0.0",
					ChartRepository: &hub.ChartRepository{
						ChartRepositoryID: "00000000-0000-0000-0000-000000000001",
					},
					OrganizationID: "unexpected",
				},
			},
			{
				"user id or organization id not provided",
				&hub.Package{
					Kind:    hub.Falco,
					Name:    "package1",
					Version: "1.0.0",
				},
			},
			{
				"both user id and organization id provided",
				&hub.Package{
					Kind:           hub.Falco,
					Name:           "package1",
					Version:        "1.0.0",
					UserID:         "unexpected",
					OrganizationID: "unexpected",
				},
			},
			{
				"invalid user id",
				&hub.Package{
					Kind:    hub.Falco,
					Name:    "package1",
					Version: "1.0.0",
					UserID:  "invalid",
				},
			},
			{
				"invalid organization id",
				&hub.Package{
					Kind:           hub.Falco,
					Name:           "package1",
					Version:        "1.0.0",
					OrganizationID: "invalid",
				},
			},
			{
				"unexpected chart repository provided",
				&hub.Package{
					Kind:           hub.Falco,
					Name:           "package1",
					Version:        "1.0.0",
					OrganizationID: "00000000-0000-0000-0000-000000000001",
					ChartRepository: &hub.ChartRepository{
						ChartRepositoryID: "unexpected",
					},
				},
			},
			{
				"maintainer name not provided",
				&hub.Package{
					Kind:    hub.Chart,
					Name:    "package1",
					Version: "1.0.0",
					ChartRepository: &hub.ChartRepository{
						ChartRepositoryID: "00000000-0000-0000-0000-000000000001",
					},
					Maintainers: []*hub.Maintainer{
						{
							Email: "email",
						},
					},
				},
			},
			{
				"maintainer email not provided",
				&hub.Package{
					Kind:    hub.Chart,
					Name:    "package1",
					Version: "1.0.0",
					ChartRepository: &hub.ChartRepository{
						ChartRepositoryID: "00000000-0000-0000-0000-000000000001",
					},
					Maintainers: []*hub.Maintainer{
						{
							Name: "name",
						},
					},
				},
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.errMsg, func(t *testing.T) {
				m := NewManager(nil)
				err := m.Register(context.Background(), tc.p)
				assert.True(t, errors.Is(err, ErrInvalidInput))
				assert.Contains(t, err.Error(), tc.errMsg)
			})
		}
	})

	t.Run("successful package registration", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("Exec", dbQuery, mock.Anything).Return(nil)
		m := NewManager(db)

		err := m.Register(context.Background(), p)
		assert.NoError(t, err)
		db.AssertExpectations(t)
	})

	t.Run("database error", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("Exec", dbQuery, mock.Anything).Return(tests.ErrFakeDatabaseFailure)
		m := NewManager(db)

		err := m.Register(context.Background(), p)
		assert.Equal(t, tests.ErrFakeDatabaseFailure, err)
		db.AssertExpectations(t)
	})
}

func TestSearchJSON(t *testing.T) {
	dbQuery := "select search_packages($1::jsonb)"
	input := &hub.SearchPackageInput{
		Limit: 10,
		Text:  "kw1",
	}

	t.Run("invalid input", func(t *testing.T) {
		testCases := []struct {
			errMsg string
			input  *hub.SearchPackageInput
		}{
			{
				"invalid limit (0 < l <= 50)",
				&hub.SearchPackageInput{
					Limit: -1,
				},
			},
			{
				"invalid limit (0 < l <= 50)",
				&hub.SearchPackageInput{
					Limit: 0,
				},
			},
			{
				"invalid limit (0 < l <= 50)",
				&hub.SearchPackageInput{
					Limit: 100,
				},
			},
			{
				"invalid offset (o >= 0)",
				&hub.SearchPackageInput{
					Limit:  10,
					Offset: -1,
				},
			},
			{
				"invalid user alias",
				&hub.SearchPackageInput{
					Limit: 10,
					Users: []string{""},
				},
			},
			{
				"invalid organization name",
				&hub.SearchPackageInput{
					Limit: 10,
					Orgs:  []string{""},
				},
			},
			{
				"invalid chart repository name",
				&hub.SearchPackageInput{
					Limit:             10,
					ChartRepositories: []string{""},
				},
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.errMsg, func(t *testing.T) {
				m := NewManager(nil)
				dataJSON, err := m.SearchJSON(context.Background(), tc.input)
				assert.True(t, errors.Is(err, ErrInvalidInput))
				assert.Contains(t, err.Error(), tc.errMsg)
				assert.Nil(t, dataJSON)
			})
		}
	})

	t.Run("database query succeeded", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("QueryRow", dbQuery, mock.Anything).Return([]byte("dataJSON"), nil)
		m := NewManager(db)

		dataJSON, err := m.SearchJSON(context.Background(), input)
		assert.NoError(t, err)
		assert.Equal(t, []byte("dataJSON"), dataJSON)
		db.AssertExpectations(t)
	})

	t.Run("database error", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("QueryRow", dbQuery, mock.Anything).Return(nil, tests.ErrFakeDatabaseFailure)
		m := NewManager(db)

		dataJSON, err := m.SearchJSON(context.Background(), input)
		assert.Equal(t, tests.ErrFakeDatabaseFailure, err)
		assert.Nil(t, dataJSON)
		db.AssertExpectations(t)
	})
}

func TestStarredByUser(t *testing.T) {
	dbQuery := `
	select exists (
		select * from user_starred_package where user_id = $1 and package_id = $2
	)`
	ctx := context.WithValue(context.Background(), hub.UserIDKey, "userID")
	pkgID := "00000000-0000-0000-0000-000000000001"

	t.Run("user id not found in ctx", func(t *testing.T) {
		m := NewManager(nil)
		assert.Panics(t, func() {
			_, _ = m.StarredByUser(context.Background(), "pkgID")
		})
	})

	t.Run("invalid input", func(t *testing.T) {
		testCases := []struct {
			errMsg    string
			packageID string
		}{
			{"package id not provided", ""},
			{"invalid package id", "pkgID"},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.errMsg, func(t *testing.T) {
				m := NewManager(nil)
				starred, err := m.StarredByUser(ctx, tc.packageID)
				assert.True(t, errors.Is(err, ErrInvalidInput))
				assert.Contains(t, err.Error(), tc.errMsg)
				assert.False(t, starred)
			})
		}
	})

	t.Run("database error", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("QueryRow", dbQuery, "userID", pkgID).Return(false, tests.ErrFakeDatabaseFailure)
		m := NewManager(db)

		starred, err := m.StarredByUser(ctx, pkgID)
		assert.Equal(t, tests.ErrFakeDatabaseFailure, err)
		assert.False(t, starred)
		db.AssertExpectations(t)
	})

	t.Run("database query succeeded", func(t *testing.T) {
		testCases := []struct {
			starred bool
		}{
			{false},
			{true},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(fmt.Sprintf("starred: %v", tc.starred), func(t *testing.T) {
				db := &tests.DBMock{}
				db.On("QueryRow", dbQuery, "userID", pkgID).Return(tc.starred, nil)
				m := NewManager(db)

				starred, err := m.StarredByUser(ctx, pkgID)
				assert.NoError(t, err)
				assert.Equal(t, tc.starred, starred)
				db.AssertExpectations(t)
			})
		}
	})
}

func TestToggleStar(t *testing.T) {
	dbQuery := "select toggle_star($1::uuid, $2::uuid)"
	ctx := context.WithValue(context.Background(), hub.UserIDKey, "userID")
	pkgID := "00000000-0000-0000-0000-000000000001"

	t.Run("user id not found in ctx", func(t *testing.T) {
		m := NewManager(nil)
		assert.Panics(t, func() {
			_ = m.ToggleStar(context.Background(), "pkgID")
		})
	})

	t.Run("invalid input", func(t *testing.T) {
		testCases := []struct {
			errMsg    string
			packageID string
		}{
			{"package id not provided", ""},
			{"invalid package id", "pkgID"},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.errMsg, func(t *testing.T) {
				m := NewManager(nil)
				err := m.ToggleStar(ctx, tc.packageID)
				assert.True(t, errors.Is(err, ErrInvalidInput))
				assert.Contains(t, err.Error(), tc.errMsg)
			})
		}
	})

	t.Run("database query succeeded", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("Exec", dbQuery, "userID", pkgID).Return(nil)
		m := NewManager(db)

		err := m.ToggleStar(ctx, pkgID)
		assert.NoError(t, err)
		db.AssertExpectations(t)
	})

	t.Run("database error", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("Exec", dbQuery, "userID", pkgID).Return(tests.ErrFakeDatabaseFailure)
		m := NewManager(db)

		err := m.ToggleStar(ctx, pkgID)
		assert.Equal(t, tests.ErrFakeDatabaseFailure, err)
		db.AssertExpectations(t)
	})
}

func TestUnregister(t *testing.T) {
	dbQuery := "select unregister_package($1::jsonb)"

	p := &hub.Package{
		Kind:    hub.Chart,
		Name:    "package1",
		Version: "1.0.0",
		ChartRepository: &hub.ChartRepository{
			ChartRepositoryID: "00000000-0000-0000-0000-000000000001",
		},
	}

	t.Run("invalid input", func(t *testing.T) {
		testCases := []struct {
			errMsg string
			p      *hub.Package
		}{
			{
				"invalid kind",
				&hub.Package{
					Kind: hub.PackageKind(99),
				},
			},
			{
				"name not provided",
				&hub.Package{
					Kind: hub.Chart,
				},
			},
			{
				"version not provided",
				&hub.Package{
					Kind: hub.Chart,
					Name: "package1",
				},
			},
			{
				"invalid version (semantic version expected)",
				&hub.Package{
					Kind:    hub.Chart,
					Name:    "package1",
					Version: "1.0",
				},
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.errMsg, func(t *testing.T) {
				m := NewManager(nil)
				err := m.Unregister(context.Background(), tc.p)
				assert.True(t, errors.Is(err, ErrInvalidInput))
				assert.Contains(t, err.Error(), tc.errMsg)
			})
		}
	})

	t.Run("successful package unregistration", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("Exec", dbQuery, mock.Anything).Return(nil)
		m := NewManager(db)

		err := m.Unregister(context.Background(), p)
		assert.NoError(t, err)
		db.AssertExpectations(t)
	})

	t.Run("database error", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("Exec", dbQuery, mock.Anything).Return(tests.ErrFakeDatabaseFailure)
		m := NewManager(db)

		err := m.Unregister(context.Background(), p)
		assert.Equal(t, tests.ErrFakeDatabaseFailure, err)
		db.AssertExpectations(t)
	})
}
