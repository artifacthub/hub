package hub

import (
	"context"
	"errors"
	"testing"

	"github.com/cncf/hub/internal/tests"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

var testFakeError = errors.New("test fake error")

func TestNew(t *testing.T) {
	// Setup mock db and hub instance
	db := &tests.DBMock{}
	h := New(db)

	// Check the hub instance was created as expected
	assert.IsType(t, &Hub{}, h)
	assert.Equal(t, db, h.db)
}

func TestGetChartRepositoryByName(t *testing.T) {
	// Setup mock db and hub instance
	db := &tests.DBMock{}
	db.SetData("", []byte(`
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
	require.NoError(t, err)
	assert.Equal(t, "00000000-0000-0000-0000-000000000001", r.ChartRepositoryID)
	assert.Equal(t, "repo1", r.Name)
	assert.Equal(t, "Repo 1", r.DisplayName)
	assert.Equal(t, "https://repo1.com", r.URL)

	// Introduce a fake db error and check we get it when requesting the repository
	db.SetError("", testFakeError)
	r, err = h.GetChartRepositoryByName(context.Background(), "repo1")
	assert.Equal(t, testFakeError, err)
	assert.Nil(t, r)

	// Update mock repository data to an invalid json and check we get an error
	db.SetData("", []byte("invalid json"))
	db.SetError("", nil)
	r, err = h.GetChartRepositoryByName(context.Background(), "repo1")
	assert.Error(t, err)
	assert.Nil(t, r)
}

func TestGetChartRepositories(t *testing.T) {
	// Setup mock db and hub instance
	db := &tests.DBMock{}
	db.SetData("", []byte(`
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
}

func TestGetChartRepositoryPackagesDigest(t *testing.T) {
	// Setup mock db and hub instance
	db := &tests.DBMock{}
	db.SetData("", []byte(`
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
	require.NoError(t, err)
	assert.Len(t, pd, 4)
	assert.Equal(t, "digest-package1-1.0.0", pd["package1@1.0.0"])
	assert.Equal(t, "digest-package1-0.0.9", pd["package1@0.0.9"])
	assert.Equal(t, "digest-package2-1.0.0", pd["package2@1.0.0"])
	assert.Equal(t, "digest-package2-0.0.9", pd["package2@0.0.9"])
}

func TestGetStatsJSON(t *testing.T) {
	// Setup mock db and hub instance
	db := &tests.DBMock{}
	db.SetData("", []byte("statsDataJSON"))
	h := New(db)

	// Check we get the expected stats json and error
	data, err := h.GetStatsJSON(context.Background())
	assert.Equal(t, nil, err)
	assert.Equal(t, []byte("statsDataJSON"), data)

	// Introduce a fake db error and check we get it when requesting the stats
	db.SetError("", testFakeError)
	data, err = h.GetStatsJSON(context.Background())
	assert.Equal(t, testFakeError, err)
	assert.Nil(t, data)
}

func TestSearchPackagesJSON(t *testing.T) {
	// Setup mock db and hub instance
	db := &tests.DBMock{}
	db.SetData("", []byte("searchResultsDataJSON"))
	h := New(db)

	// Check we get the expected search results json and error
	query := &Query{Text: "kw1"}
	data, err := h.SearchPackagesJSON(context.Background(), query)
	assert.Equal(t, nil, err)
	assert.Equal(t, []byte("searchResultsDataJSON"), data)
}

func TestRegisterPackage(t *testing.T) {
	// Setup mock db and hub instance
	db := &tests.DBMock{}
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
	assert.Equal(t, nil, err)

	// Introduce a fake db error and check we get it when requesting the repository
	db.SetError("", testFakeError)
	err = h.RegisterPackage(context.Background(), p)
	assert.Equal(t, testFakeError, err)
}

func TestGetPackageJSON(t *testing.T) {
	// Setup mock db and hub instance
	db := &tests.DBMock{}
	db.SetData("", []byte("packageDataJSON"))
	h := New(db)

	// Check we get the expected package json and error
	data, err := h.GetPackageJSON(context.Background(), "00000000-0000-0000-0000-000000000001")
	assert.Equal(t, nil, err)
	assert.Equal(t, []byte("packageDataJSON"), data)
}

func TestGetPackageVersionJSON(t *testing.T) {
	// Setup mock db and hub instance
	db := &tests.DBMock{}
	db.SetData("", []byte("packageVersionDataJSON"))
	h := New(db)

	// Check we get the expected package json and error
	data, err := h.GetPackageVersionJSON(context.Background(), "00000000-0000-0000-0000-000000000001", "1.0.0")
	assert.Equal(t, nil, err)
	assert.Equal(t, []byte("packageVersionDataJSON"), data)
}

func TestGetPackagesUpdatesJSON(t *testing.T) {
	// Setup mock db and hub instance
	db := &tests.DBMock{}
	db.SetData("", []byte("packagesUpdatesDataJSON"))
	h := New(db)

	// Check we get the expected packages updates json and error
	data, err := h.GetPackagesUpdatesJSON(context.Background())
	assert.Equal(t, nil, err)
	assert.Equal(t, []byte("packagesUpdatesDataJSON"), data)
}
