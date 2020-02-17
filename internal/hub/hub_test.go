package hub

import (
	"context"
	"errors"
	"testing"

	"github.com/jackc/pgconn"
	"github.com/jackc/pgproto3"
	"github.com/jackc/pgx/v4"
	"github.com/stretchr/testify/assert"
)

func TestNew(t *testing.T) {
	// Setup mock db and hub instance
	db := &DBMock{}
	h := New(db)

	// Check the hub instance was created as expected
	assert.IsType(t, &Hub{}, h)
	assert.Equal(t, db, h.db)
}

func TestGetChartRepositoryByName(t *testing.T) {
	// Setup mock db and hub instance
	db := &DBMock{}
	db.setData([]byte(`
	{
        "chart_repository_id": "00000000-0000-0000-0000-000000000001",
        "name": "repo1",
        "display_name": "Repo 1",
        "url": "https://repo1.com"
    }
	`))
	h := New(db)

	// Check we get the expected chart repository
	r, err := h.GetChartRepositoryByName(context.Background(), "repo1")
	assert.NoError(t, err)
	assert.Equal(t, "00000000-0000-0000-0000-000000000001", r.ChartRepositoryID)
	assert.Equal(t, "repo1", r.Name)
	assert.Equal(t, "Repo 1", r.DisplayName)
	assert.Equal(t, "https://repo1.com", r.URL)

	// Introduce a fake error and check we get it when requesting the repository
	db.setError(errors.New("fake error"))
	r, err = h.GetChartRepositoryByName(context.Background(), "repo1")
	assert.Equal(t, db.err, err)
	assert.Nil(t, r)

	// Update mock repository data to an invalid json and check we get an error
	db.setData([]byte("invalid json"))
	db.setError(nil)
	r, err = h.GetChartRepositoryByName(context.Background(), "repo1")
	assert.Error(t, err)
	assert.Nil(t, r)
}

func TestGetChartRepositories(t *testing.T) {
	// Setup mock db and hub instance
	db := &DBMock{}
	db.setData([]byte(`
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
	`))
	h := New(db)

	// Check we get the expected chart repositories
	r, err := h.GetChartRepositories(context.Background())
	assert.NoError(t, err)
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
}

func TestGetChartRepositoryPackagesDigest(t *testing.T) {
	// Setup mock db and hub instance
	db := &DBMock{}
	db.setData([]byte(`
	{
        "package1@1.0.0": "digest-package1-1.0.0",
        "package1@0.0.9": "digest-package1-0.0.9",
        "package2@1.0.0": "digest-package2-1.0.0",
        "package2@0.0.9": "digest-package2-0.0.9"
    }
	`))
	h := New(db)

	// Check we get the expected chart repository packages digest
	pd, err := h.GetChartRepositoryPackagesDigest(context.Background(), "00000000-0000-0000-0000-000000000001")
	assert.NoError(t, err)
	assert.Len(t, pd, 4)
	assert.Equal(t, "digest-package1-1.0.0", pd["package1@1.0.0"])
	assert.Equal(t, "digest-package1-0.0.9", pd["package1@0.0.9"])
	assert.Equal(t, "digest-package2-1.0.0", pd["package2@1.0.0"])
	assert.Equal(t, "digest-package2-0.0.9", pd["package2@0.0.9"])
}

func TestGetStatsJSON(t *testing.T) {
	// Setup mock db and hub instance
	db := &DBMock{}
	db.setData([]byte(`{"packages": 10, "releases": 100}`))
	h := New(db)

	// Check we get the expected stats json and error
	data, err := h.GetStatsJSON(context.Background())
	assert.Equal(t, db.err, err)
	assert.Equal(t, db.data, data)

	// Introduce a fake error and check we get it when requesting the stats
	db.setError(errors.New("fake error"))
	data, err = h.GetStatsJSON(context.Background())
	assert.Equal(t, db.err, err)
	assert.Nil(t, data)
}

func TestSearchPackagesJSON(t *testing.T) {
	// Setup mock db and hub instance
	db := &DBMock{}
	db.setData([]byte(`
	{
		"data": {
			"packages": [{
				"kind": 0,
				"name": "package1",
				"logo_image_id": "image_id",
				"package_id": "00000000-0000-0000-0000-000000000001",
				"app_version": "12.1.0",
				"description": "description",
				"display_name": "Package 1",
				"chart_repository": {
					"chart_repository_id": "00000000-0000-0000-0000-000000000001",
					"name": "repo1",
					"display_name": "Repo 1"
				}
			}, {
				"kind": 0,
				"name": "package2",
				"logo_image_id": "image_id",
				"package_id": "00000000-0000-0000-0000-000000000002",
				"app_version": "12.1.0",
				"description": "description",
				"display_name": "Package 2",
				"chart_repository": {
					"chart_repository_id": "00000000-0000-0000-0000-000000000001",
					"name": "repo1",
					"display_name": "Repo 1"
				}
			}],
			"facets": [{
				"title": "Kind",
				"filter_key": "kind",
				"options": [{
					"id": 0,
					"name": "Chart",
					"total": 2
				}]
			}, {
				"title": "Repository",
				"filter_key": "repo",
				"options": [{
					"id": "00000000-0000-0000-0000-000000000001",
					"name": "Repo1",
					"total": 2
				}]
			}]
        },
        "metadata": {
            "limit": null,
            "offset": null,
            "total": 2
        }
    }
	`))
	h := New(db)

	// Check we get the expected search results json and error
	query := &Query{Text: "kw1"}
	data, err := h.SearchPackagesJSON(context.Background(), query)
	assert.Equal(t, db.err, err)
	assert.Equal(t, db.data, data)
}

func TestRegisterPackage(t *testing.T) {
	// Setup mock db and hub instance
	db := &DBMock{}
	h := New(db)

	// Register package and check we get the expected error
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
	err := h.RegisterPackage(context.Background(), p)
	assert.Equal(t, db.err, err)

	// Introduce a fake error and check we get it when requesting the repository
	db.setError(errors.New("fake error"))
	err = h.RegisterPackage(context.Background(), p)
	assert.Equal(t, db.err, err)
}

func TestGetPackageJSON(t *testing.T) {
	// Setup mock db and hub instance
	db := &DBMock{}
	db.setData([]byte(`
	{
        "package_id": "00000000-0000-0000-0000-000000000001",
        "kind": 0,
        "name": "package1",
        "display_name": "Package 1",
        "description": "description",
        "home_url": "home_url",
        "logo_image_id": "image_id",
        "keywords": ["kw1", "kw2"],
        "readme": "readme-version-1.0.0",
        "links": {
            "link1": "https://link1",
            "link2": "https://link2"
        },
        "version": "1.0.0",
        "available_versions": ["0.0.9", "1.0.0"],
        "app_version": "12.1.0",
        "digest": "digest-package1-1.0.0",
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
        "chart_repository": {
			"chart_repository_id": "00000000-0000-0000-0000-000000000001",
            "name": "repo1",
            "display_name": "Repo 1",
            "url": "https://repo1.com"
        }
    }
	`))
	h := New(db)

	// Check we get the expected package json and error
	data, err := h.GetPackageJSON(context.Background(), "00000000-0000-0000-0000-000000000001")
	assert.Equal(t, db.err, err)
	assert.Equal(t, db.data, data)
}

func TestGetPackageVersionJSON(t *testing.T) {
	// Setup mock db and hub instance
	db := &DBMock{}
	db.setData([]byte(`
	{
        "package_id": "00000000-0000-0000-0000-000000000001",
        "kind": 0,
        "name": "package1",
        "display_name": "Package 1",
        "description": "description",
        "home_url": "home_url",
        "logo_image_id": "image_id",
        "keywords": ["kw1", "kw2"],
        "readme": "readme-version-1.0.0",
        "links": {
            "link1": "https://link1",
            "link2": "https://link2"
        },
        "version": "1.0.0",
        "available_versions": ["0.0.9", "1.0.0"],
        "app_version": "12.1.0",
        "digest": "digest-package1-1.0.0",
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
        "chart_repository": {
			"chart_repository_id": "00000000-0000-0000-0000-000000000001",
            "name": "repo1",
            "display_name": "Repo 1",
            "url": "https://repo1.com"
        }
    }
	`))
	h := New(db)

	// Check we get the expected package json and error
	data, err := h.GetPackageVersionJSON(context.Background(), "00000000-0000-0000-0000-000000000001", "1.0.0")
	assert.Equal(t, db.err, err)
	assert.Equal(t, db.data, data)
}

func TestGetPackagesUpdatesJSON(t *testing.T) {
	// Setup mock db and hub instance
	db := &DBMock{}
	db.setData([]byte(`
	{
        "latest_packages_added": [{
            "package_id": "00000000-0000-0000-0000-000000000001",
            "kind": 0,
            "name": "package1",
            "display_name": "Package 1",
            "logo_image_id": "image_id",
            "app_version": "12.1.0",
            "chart_repository": {
				"chart_repository_id": "00000000-0000-0000-0000-000000000001",
                "name": "repo1",
                "display_name": "Repo 1"
            }
        }, {
            "package_id": "00000000-0000-0000-0000-000000000002",
            "kind": 0,
            "name": "package2",
            "display_name": "Package 2 v2",
            "logo_image_id": "image_id",
            "app_version": "13.0.0",
            "chart_repository": {
				"chart_repository_id": "00000000-0000-0000-0000-000000000002",
                "name": "repo2",
                "display_name": "Repo 2"
            }
        }],
        "packages_recently_updated": [{
            "package_id": "00000000-0000-0000-0000-000000000002",
            "kind": 0,
            "name": "package2",
            "display_name": "Package 2 v2",
            "logo_image_id": "image_id",
            "app_version": "13.0.0",
            "chart_repository": {
				"chart_repository_id": "00000000-0000-0000-0000-000000000002",
                "name": "repo2",
                "display_name": "Repo 2"
            }
        }, {
            "package_id": "00000000-0000-0000-0000-000000000001",
            "kind": 0,
            "name": "package1",
            "display_name": "Package 1",
            "logo_image_id": "image_id",
            "app_version": "12.1.0",
            "chart_repository": {
				"chart_repository_id": "00000000-0000-0000-0000-000000000001",
                "name": "repo1",
                "display_name": "Repo 1"
            }
        }]
    }
	`))
	h := New(db)

	// Check we get the expected packages updates json and error
	data, err := h.GetPackagesUpdatesJSON(context.Background())
	assert.Equal(t, db.err, err)
	assert.Equal(t, db.data, data)
}

type DBMock struct {
	data []byte
	err  error
}

func (m *DBMock) setData(data []byte) {
	m.data = data
}

func (m *DBMock) setError(err error) {
	m.err = err
}

func (m *DBMock) QueryRow(ctx context.Context, sql string, args ...interface{}) pgx.Row {
	return &RowMock{
		data: m.data,
		err:  m.err,
	}
}

func (m *DBMock) Exec(ctx context.Context, sql string, arguments ...interface{}) (pgconn.CommandTag, error) {
	return nil, m.err
}

type RowMock struct {
	data []byte
	err  error
}

// Implement pgx.Row interface
func (m *RowMock) Close()                                         {}
func (m *RowMock) Err() error                                     { return nil }
func (m *RowMock) CommandTag() pgconn.CommandTag                  { return nil }
func (m *RowMock) FieldDescriptions() []pgproto3.FieldDescription { return nil }
func (m *RowMock) Next() bool                                     { return false }
func (m *RowMock) Values() ([]interface{}, error)                 { return nil, nil }
func (m *RowMock) RawValues() [][]byte                            { return nil }

func (m *RowMock) Scan(dest ...interface{}) error {
	d := dest[0].(*[]byte)
	*d = m.data
	return m.err
}
