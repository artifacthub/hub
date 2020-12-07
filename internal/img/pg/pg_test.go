package pg

import (
	"context"
	"crypto/sha256"
	"io/ioutil"
	"testing"

	"github.com/artifacthub/hub/internal/tests"
	"github.com/jackc/pgx/v4"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

func TestNewImageStore(t *testing.T) {
	t.Parallel()
	db := &tests.DBMock{}
	s := NewImageStore(db)

	assert.IsType(t, &ImageStore{}, s)
	assert.Equal(t, db, s.db)
}

func TestGetImage(t *testing.T) {
	ctx := context.Background()

	t.Run("existing image", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, getImageDBQ, "imageID", "2x").Return([]byte("image2xData"), nil)
		s := NewImageStore(db)

		data, err := s.GetImage(ctx, "imageID", "2x")
		assert.Equal(t, nil, err)
		assert.Equal(t, []byte("image2xData"), data)
		db.AssertExpectations(t)
	})

	t.Run("database error", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, getImageDBQ, "imageID", "2x").Return(nil, tests.ErrFakeDB)
		s := NewImageStore(db)

		data, err := s.GetImage(ctx, "imageID", "2x")
		assert.Equal(t, tests.ErrFakeDB, err)
		assert.Nil(t, data)
		db.AssertExpectations(t)
	})
}

func TestSaveImage(t *testing.T) {
	pngImgData, err := ioutil.ReadFile("testdata/image.png")
	require.NoError(t, err)
	sumPngImg := sha256.Sum256(pngImgData)
	pngImgHash := sumPngImg[:]
	svgImgData, err := ioutil.ReadFile("testdata/image.svg")
	require.NoError(t, err)
	sumSvgImg := sha256.Sum256(svgImgData)
	svgImgHash := sumSvgImg[:]
	ctx := context.Background()

	t.Run("successful png image registration", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, getImageIDDBQ, pngImgHash).Return(nil, pgx.ErrNoRows)
		for _, version := range []string{"1x", "2x", "3x", "4x"} {
			db.On("QueryRow", ctx, registerImageDBQ, pngImgHash, version, mock.Anything).Return("pngImgID", nil)
		}
		s := NewImageStore(db)

		imageID, err := s.SaveImage(ctx, pngImgData)
		require.NoError(t, err)
		assert.Equal(t, "pngImgID", imageID)
		db.AssertExpectations(t)
	})

	t.Run("successful svg image registration", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, getImageIDDBQ, svgImgHash).Return(nil, pgx.ErrNoRows)
		db.On("QueryRow", ctx, registerImageDBQ, svgImgHash, "svg", mock.Anything).Return("svgImgID", nil)
		s := NewImageStore(db)

		imageID, err := s.SaveImage(ctx, svgImgData)
		require.NoError(t, err)
		assert.Equal(t, "svgImgID", imageID)
		db.AssertExpectations(t)
	})

	t.Run("try to register existing png image", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, getImageIDDBQ, pngImgHash).Return("existingImageID", nil)
		s := NewImageStore(db)

		imageID, err := s.SaveImage(ctx, pngImgData)
		require.NoError(t, err)
		assert.Equal(t, "existingImageID", imageID)
		db.AssertExpectations(t)
	})

	t.Run("database error calling get_image_id", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, getImageIDDBQ, pngImgHash).Return(nil, tests.ErrFakeDB)
		s := NewImageStore(db)

		imageID, err := s.SaveImage(ctx, pngImgData)
		assert.Equal(t, tests.ErrFakeDB, err)
		assert.Empty(t, imageID)
		db.AssertExpectations(t)
	})

	t.Run("database error calling register_image", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, getImageIDDBQ, pngImgHash).Return(nil, pgx.ErrNoRows)
		db.On("QueryRow", ctx, registerImageDBQ, pngImgHash, "1x", mock.Anything).Return(nil, tests.ErrFakeDB)
		s := NewImageStore(db)

		imageID, err := s.SaveImage(ctx, pngImgData)
		assert.Equal(t, tests.ErrFakeDB, err)
		assert.Empty(t, imageID)
		db.AssertExpectations(t)
	})
}
