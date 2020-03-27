package pkg

import (
	"context"
	"testing"

	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/tests"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

func TestGetJSON(t *testing.T) {
	dbQuery := "select get_package($1::jsonb)"

	t.Run("database query succeeded", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("QueryRow", dbQuery, mock.Anything).Return([]byte("dataJSON"), nil)
		m := NewManager(db)

		dataJSON, err := m.GetJSON(context.Background(), &GetInput{})
		assert.NoError(t, err)
		assert.Equal(t, []byte("dataJSON"), dataJSON)
		db.AssertExpectations(t)
	})

	t.Run("database error", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("QueryRow", dbQuery, mock.Anything).Return(nil, tests.ErrFakeDatabaseFailure)
		m := NewManager(db)

		dataJSON, err := m.GetJSON(context.Background(), &GetInput{})
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
	input := &SearchInput{Text: "kw1"}

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
