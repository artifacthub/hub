package pkg

import (
	"context"
	"errors"
	"testing"

	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/tests"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

func TestGet(t *testing.T) {
	dbQuery := "select get_package($1::jsonb)"
	ctx := context.Background()

	t.Run("invalid input", func(t *testing.T) {
		m := NewManager(nil)
		_, err := m.Get(ctx, &hub.GetPackageInput{})
		assert.True(t, errors.Is(err, hub.ErrInvalidInput))
	})

	t.Run("database error", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, dbQuery, mock.Anything, mock.Anything).Return(nil, tests.ErrFakeDatabaseFailure)
		m := NewManager(db)

		p, err := m.Get(ctx, &hub.GetPackageInput{PackageName: "pkg1"})
		assert.Equal(t, tests.ErrFakeDatabaseFailure, err)
		assert.Nil(t, p)
		db.AssertExpectations(t)
	})

	t.Run("database query succeeded", func(t *testing.T) {
		expectedPackage := &hub.Package{
			PackageID:      "00000000-0000-0000-0000-000000000001",
			Name:           "Package 1",
			NormalizedName: "package-1",
			LogoImageID:    "00000000-0000-0000-0000-000000000001",
			IsOperator:     true,
			Channels: []*hub.Channel{
				{
					Name:    "stable",
					Version: "1.0.0",
				},
				{
					Name:    "alpha",
					Version: "1.1.0",
				},
			},
			DefaultChannel: "stable",
			DisplayName:    "Package 1",
			Description:    "description",
			Keywords:       []string{"kw1", "kw2"},
			HomeURL:        "home_url",
			Readme:         "readme-version-1.0.0",
			Install:        "install-version-1.0.0",
			Links: []*hub.Link{
				{
					Name: "link1",
					URL:  "https://link1",
				},
				{
					Name: "link2",
					URL:  "https://link2",
				},
			},
			Data: map[string]interface{}{
				"key": "value",
			},
			Version: "1.0.0",
			AvailableVersions: []*hub.Version{
				{
					Version:   "0.0.9",
					CreatedAt: 1592299233,
				},
				{
					Version:   "1.0.0",
					CreatedAt: 1592299234,
				},
			},
			AppVersion:     "12.1.0",
			Digest:         "digest-package1-1.0.0",
			Deprecated:     true,
			ContainerImage: "quay.io/org/img:1.0.0",
			Provider:       "Org Inc",
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
			Repository: &hub.Repository{
				RepositoryID:            "00000000-0000-0000-0000-000000000001",
				Kind:                    hub.Helm,
				Name:                    "repo1",
				DisplayName:             "Repo 1",
				URL:                     "https://repo1.com",
				UserAlias:               "user1",
				OrganizationName:        "org1",
				OrganizationDisplayName: "Organization 1",
			},
		}

		db := &tests.DBMock{}
		db.On("QueryRow", ctx, dbQuery, mock.Anything, mock.Anything).Return([]byte(`
		{
			"package_id": "00000000-0000-0000-0000-000000000001",
			"name": "Package 1",
			"normalized_name": "package-1",
			"logo_image_id": "00000000-0000-0000-0000-000000000001",
			"is_operator": true,
			"channels": [
				{
					"name": "stable",
					"version": "1.0.0"
				},
				{
					"name": "alpha",
					"version": "1.1.0"
				}
			],
			"default_channel": "stable",
			"display_name": "Package 1",
			"description": "description",
			"keywords": ["kw1", "kw2"],
			"home_url": "home_url",
			"readme": "readme-version-1.0.0",
			"install": "install-version-1.0.0",
			"links": [
				{
					"name": "link1",
					"url": "https://link1"
				},
				{
					"name": "link2",
					"url": "https://link2"
				}
			],
			"data": {
				"key": "value"
			},
			"version": "1.0.0",
			"available_versions": [
				{
					"version": "0.0.9",
					"created_at": 1592299233
				},
				{
					"version": "1.0.0",
					"created_at": 1592299234
				}
			],
			"app_version": "12.1.0",
			"digest": "digest-package1-1.0.0",
			"deprecated": true,
			"container_image": "quay.io/org/img:1.0.0",
    		"provider": "Org Inc",
			"maintainers": [
				{
					"name": "name1",
					"email": "email1"
				},
				{
					"name": "name2",
					"email": "email2"
				}
			],
			"repository": {
				"repository_id": "00000000-0000-0000-0000-000000000001",
				"kind": 0,
				"name": "repo1",
				"display_name": "Repo 1",
				"url": "https://repo1.com",
				"user_alias": "user1",
				"organization_name": "org1",
				"organization_display_name": "Organization 1"
			}
		}
		`), nil)
		m := NewManager(db)

		p, err := m.Get(ctx, &hub.GetPackageInput{PackageName: "package-1"})
		assert.NoError(t, err)
		assert.Equal(t, expectedPackage, p)
		db.AssertExpectations(t)
	})
}

func TestGetJSON(t *testing.T) {
	dbQuery := "select get_package($1::jsonb)"
	ctx := context.Background()

	t.Run("invalid input", func(t *testing.T) {
		m := NewManager(nil)
		_, err := m.GetJSON(ctx, &hub.GetPackageInput{})
		assert.True(t, errors.Is(err, hub.ErrInvalidInput))
	})

	t.Run("database query succeeded", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, dbQuery, mock.Anything, mock.Anything).Return([]byte("dataJSON"), nil)
		m := NewManager(db)

		dataJSON, err := m.GetJSON(ctx, &hub.GetPackageInput{PackageName: "pkg1"})
		assert.NoError(t, err)
		assert.Equal(t, []byte("dataJSON"), dataJSON)
		db.AssertExpectations(t)
	})

	t.Run("database error", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, dbQuery, mock.Anything, mock.Anything).Return(nil, tests.ErrFakeDatabaseFailure)
		m := NewManager(db)

		dataJSON, err := m.GetJSON(ctx, &hub.GetPackageInput{PackageName: "pkg1"})
		assert.Equal(t, tests.ErrFakeDatabaseFailure, err)
		assert.Nil(t, dataJSON)
		db.AssertExpectations(t)
	})
}

func TestGetRandomJSON(t *testing.T) {
	dbQuery := "select get_random_packages()"
	ctx := context.Background()

	t.Run("database query succeeded", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, dbQuery).Return([]byte("dataJSON"), nil)
		m := NewManager(db)

		dataJSON, err := m.GetRandomJSON(ctx)
		assert.NoError(t, err)
		assert.Equal(t, []byte("dataJSON"), dataJSON)
		db.AssertExpectations(t)
	})

	t.Run("database error", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, dbQuery).Return(nil, tests.ErrFakeDatabaseFailure)
		m := NewManager(db)

		dataJSON, err := m.GetRandomJSON(ctx)
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
		db.On("QueryRow", ctx, dbQuery, "userID").Return([]byte("dataJSON"), nil)
		m := NewManager(db)

		dataJSON, err := m.GetStarredByUserJSON(ctx)
		assert.NoError(t, err)
		assert.Equal(t, []byte("dataJSON"), dataJSON)
		db.AssertExpectations(t)
	})

	t.Run("database error", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, dbQuery, "userID").Return(nil, tests.ErrFakeDatabaseFailure)
		m := NewManager(db)

		dataJSON, err := m.GetStarredByUserJSON(ctx)
		assert.Equal(t, tests.ErrFakeDatabaseFailure, err)
		assert.Nil(t, dataJSON)
		db.AssertExpectations(t)
	})
}

func TestGetStarsJSON(t *testing.T) {
	dbQuery := "select get_package_stars($1::uuid, $2::uuid)"
	ctx := context.WithValue(context.Background(), hub.UserIDKey, "userID")
	pkgID := "00000000-0000-0000-0000-000000000001"

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
				_, err := m.GetStarsJSON(ctx, tc.packageID)
				assert.True(t, errors.Is(err, hub.ErrInvalidInput))
				assert.Contains(t, err.Error(), tc.errMsg)
			})
		}
	})

	t.Run("database error", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, dbQuery, mock.Anything, pkgID).Return(nil, tests.ErrFakeDatabaseFailure)
		m := NewManager(db)

		_, err := m.GetStarsJSON(ctx, pkgID)
		assert.Equal(t, tests.ErrFakeDatabaseFailure, err)
		db.AssertExpectations(t)
	})

	t.Run("database query succeeded", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, dbQuery, mock.Anything, pkgID).Return([]byte("dataJSON"), nil)
		m := NewManager(db)

		dataJSON, err := m.GetStarsJSON(ctx, pkgID)
		assert.NoError(t, err)
		assert.Equal(t, []byte("dataJSON"), dataJSON)
		db.AssertExpectations(t)
	})
}

func TestGetStatsJSON(t *testing.T) {
	dbQuery := "select get_packages_stats()"
	ctx := context.Background()

	t.Run("packages stats data returned successfully", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, dbQuery).Return([]byte("dataJSON"), nil)
		m := NewManager(db)

		dataJSON, err := m.GetStatsJSON(ctx)
		assert.NoError(t, err)
		assert.Equal(t, []byte("dataJSON"), dataJSON)
		db.AssertExpectations(t)
	})

	t.Run("database error", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, dbQuery).Return(nil, tests.ErrFakeDatabaseFailure)
		m := NewManager(db)

		dataJSON, err := m.GetStatsJSON(ctx)
		assert.Equal(t, tests.ErrFakeDatabaseFailure, err)
		assert.Nil(t, dataJSON)
		db.AssertExpectations(t)
	})
}

func TestRegister(t *testing.T) {
	dbQuery := "select register_package($1::jsonb)"
	ctx := context.Background()

	p := &hub.Package{
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
		Repository: &hub.Repository{
			RepositoryID: "00000000-0000-0000-0000-000000000001",
		},
	}

	t.Run("invalid input", func(t *testing.T) {
		testCases := []struct {
			errMsg string
			p      *hub.Package
		}{
			{
				"name not provided",
				&hub.Package{},
			},
			{
				"version not provided",
				&hub.Package{
					Name: "package1",
				},
			},
			{
				"invalid version (semver expected)",
				&hub.Package{
					Name:    "package1",
					Version: "invalid",
				},
			},
			{
				"invalid content url",
				&hub.Package{
					Name:       "package1",
					Version:    "1.0.0",
					ContentURL: "invalid",
				},
			},
			{
				"repository not provided",
				&hub.Package{
					Name:    "package1",
					Version: "1.0.0",
				},
			},
			{
				"repository id not provided",
				&hub.Package{
					Name:    "package1",
					Version: "1.0.0",
					Repository: &hub.Repository{
						RepositoryID: "",
					},
				},
			},
			{
				"invalid repository id",
				&hub.Package{
					Name:    "package1",
					Version: "1.0.0",
					Repository: &hub.Repository{
						RepositoryID: "invalid",
					},
				},
			},
			{
				"maintainer email not provided",
				&hub.Package{
					Name:    "package1",
					Version: "1.0.0",
					Repository: &hub.Repository{
						RepositoryID: "00000000-0000-0000-0000-000000000001",
					},
					Maintainers: []*hub.Maintainer{
						{
							Name: "name",
						},
					},
				},
			},
			{
				"channel name not provided",
				&hub.Package{
					Name:    "package1",
					Version: "1.0.0",
					Repository: &hub.Repository{
						RepositoryID: "00000000-0000-0000-0000-000000000001",
					},
					Channels: []*hub.Channel{
						{
							Version: "1.0.0",
						},
					},
				},
			},
			{
				"channel version not provided",
				&hub.Package{
					Name:    "package1",
					Version: "1.0.0",
					Repository: &hub.Repository{
						RepositoryID: "00000000-0000-0000-0000-000000000001",
					},
					Channels: []*hub.Channel{
						{
							Name: "stable",
						},
					},
				},
			},
			{
				"invalid channel version (semver expected)",
				&hub.Package{
					Name:    "package1",
					Version: "1.0.0",
					Repository: &hub.Repository{
						RepositoryID: "00000000-0000-0000-0000-000000000001",
					},
					Channels: []*hub.Channel{
						{
							Name:    "stable",
							Version: "invalid",
						},
					},
				},
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.errMsg, func(t *testing.T) {
				m := NewManager(nil)
				err := m.Register(ctx, tc.p)
				assert.True(t, errors.Is(err, hub.ErrInvalidInput))
				assert.Contains(t, err.Error(), tc.errMsg)
			})
		}
	})

	t.Run("successful package registration", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("Exec", ctx, dbQuery, mock.Anything).Return(nil)
		m := NewManager(db)

		err := m.Register(ctx, p)
		assert.NoError(t, err)
		db.AssertExpectations(t)
	})

	t.Run("database error", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("Exec", ctx, dbQuery, mock.Anything).Return(tests.ErrFakeDatabaseFailure)
		m := NewManager(db)

		err := m.Register(ctx, p)
		assert.Equal(t, tests.ErrFakeDatabaseFailure, err)
		db.AssertExpectations(t)
	})
}

func TestSearchJSON(t *testing.T) {
	dbQuery := "select search_packages($1::jsonb)"
	ctx := context.Background()
	input := &hub.SearchPackageInput{
		Limit:      10,
		TsQueryWeb: "kw1",
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
				"invalid repository name",
				&hub.SearchPackageInput{
					Limit:        10,
					Repositories: []string{""},
				},
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.errMsg, func(t *testing.T) {
				m := NewManager(nil)
				dataJSON, err := m.SearchJSON(ctx, tc.input)
				assert.True(t, errors.Is(err, hub.ErrInvalidInput))
				assert.Contains(t, err.Error(), tc.errMsg)
				assert.Nil(t, dataJSON)
			})
		}
	})

	t.Run("database query succeeded", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, dbQuery, mock.Anything).Return([]byte("dataJSON"), nil)
		m := NewManager(db)

		dataJSON, err := m.SearchJSON(ctx, input)
		assert.NoError(t, err)
		assert.Equal(t, []byte("dataJSON"), dataJSON)
		db.AssertExpectations(t)
	})

	t.Run("database error", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, dbQuery, mock.Anything).Return(nil, tests.ErrFakeDatabaseFailure)
		m := NewManager(db)

		dataJSON, err := m.SearchJSON(ctx, input)
		assert.Equal(t, tests.ErrFakeDatabaseFailure, err)
		assert.Nil(t, dataJSON)
		db.AssertExpectations(t)
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
				assert.True(t, errors.Is(err, hub.ErrInvalidInput))
				assert.Contains(t, err.Error(), tc.errMsg)
			})
		}
	})

	t.Run("database query succeeded", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("Exec", ctx, dbQuery, "userID", pkgID).Return(nil)
		m := NewManager(db)

		err := m.ToggleStar(ctx, pkgID)
		assert.NoError(t, err)
		db.AssertExpectations(t)
	})

	t.Run("database error", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("Exec", ctx, dbQuery, "userID", pkgID).Return(tests.ErrFakeDatabaseFailure)
		m := NewManager(db)

		err := m.ToggleStar(ctx, pkgID)
		assert.Equal(t, tests.ErrFakeDatabaseFailure, err)
		db.AssertExpectations(t)
	})
}

func TestUnregister(t *testing.T) {
	dbQuery := "select unregister_package($1::jsonb)"
	ctx := context.Background()

	p := &hub.Package{
		Name:    "package1",
		Version: "1.0.0",
		Repository: &hub.Repository{
			RepositoryID: "00000000-0000-0000-0000-000000000001",
		},
	}

	t.Run("invalid input", func(t *testing.T) {
		testCases := []struct {
			errMsg string
			p      *hub.Package
		}{
			{
				"name not provided",
				&hub.Package{},
			},
			{
				"version not provided",
				&hub.Package{
					Name: "package1",
				},
			},
			{
				"invalid version (semantic version expected)",
				&hub.Package{
					Name:    "package1",
					Version: "1.0",
				},
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.errMsg, func(t *testing.T) {
				m := NewManager(nil)
				err := m.Unregister(ctx, tc.p)
				assert.True(t, errors.Is(err, hub.ErrInvalidInput))
				assert.Contains(t, err.Error(), tc.errMsg)
			})
		}
	})

	t.Run("successful package unregistration", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("Exec", ctx, dbQuery, mock.Anything).Return(nil)
		m := NewManager(db)

		err := m.Unregister(ctx, p)
		assert.NoError(t, err)
		db.AssertExpectations(t)
	})

	t.Run("database error", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("Exec", ctx, dbQuery, mock.Anything).Return(tests.ErrFakeDatabaseFailure)
		m := NewManager(db)

		err := m.Unregister(ctx, p)
		assert.Equal(t, tests.ErrFakeDatabaseFailure, err)
		db.AssertExpectations(t)
	})
}
