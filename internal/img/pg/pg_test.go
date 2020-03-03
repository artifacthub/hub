package pg

import (
	"context"
	"crypto/sha256"
	"errors"
	"io/ioutil"
	"testing"

	"github.com/cncf/hub/internal/tests"
	"github.com/jackc/pgx/v4"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

var errFakeDatabaseFailure = errors.New("fake database failure")

func TestNewImageStore(t *testing.T) {
	db := &tests.DBMock{}
	s := NewImageStore(db)

	assert.IsType(t, &ImageStore{}, s)
	assert.Equal(t, db, s.db)
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

	t.Run("successful png image registration", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On(
			"QueryRow",
			"select image_id from image where original_hash = $1", pngImgHash,
		).Return(nil, pgx.ErrNoRows)
		for _, version := range []string{"1x", "2x", "3x", "4x"} {
			db.On(
				"QueryRow",
				"select register_image($1::bytea, $2::text, $3::bytea)", pngImgHash, version, mock.Anything,
			).Return("pngImgID", nil)
		}
		s := NewImageStore(db)

		imageID, err := s.SaveImage(context.Background(), pngImgData)
		require.NoError(t, err)
		assert.Equal(t, "pngImgID", imageID)
		db.AssertExpectations(t)
	})

	t.Run("successful svg image registration", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On(
			"QueryRow",
			"select image_id from image where original_hash = $1", svgImgHash,
		).Return(nil, pgx.ErrNoRows)
		db.On(
			"QueryRow",
			"select register_image($1::bytea, $2::text, $3::bytea)", svgImgHash, "svg", mock.Anything,
		).Return("svgImgID", nil)
		s := NewImageStore(db)

		imageID, err := s.SaveImage(context.Background(), svgImgData)
		require.NoError(t, err)
		assert.Equal(t, "svgImgID", imageID)
		db.AssertExpectations(t)
	})

	t.Run("try to register existing png image", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On(
			"QueryRow",
			"select image_id from image where original_hash = $1", pngImgHash,
		).Return("existingImageID", nil)
		s := NewImageStore(db)

		imageID, err := s.SaveImage(context.Background(), pngImgData)
		require.NoError(t, err)
		assert.Equal(t, "existingImageID", imageID)
		db.AssertExpectations(t)
	})

	t.Run("database error calling get_image_id", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On(
			"QueryRow",
			"select image_id from image where original_hash = $1", pngImgHash,
		).Return(nil, errFakeDatabaseFailure)
		s := NewImageStore(db)

		imageID, err := s.SaveImage(context.Background(), pngImgData)
		assert.Equal(t, errFakeDatabaseFailure, err)
		assert.Empty(t, imageID)
		db.AssertExpectations(t)
	})

	t.Run("database error calling register_image", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On(
			"QueryRow",
			"select image_id from image where original_hash = $1", pngImgHash,
		).Return(nil, pgx.ErrNoRows)
		db.On(
			"QueryRow",
			"select register_image($1::bytea, $2::text, $3::bytea)", pngImgHash, "1x", mock.Anything,
		).Return(nil, errFakeDatabaseFailure)
		s := NewImageStore(db)

		imageID, err := s.SaveImage(context.Background(), pngImgData)
		assert.Equal(t, errFakeDatabaseFailure, err)
		assert.Empty(t, imageID)
		db.AssertExpectations(t)
	})
}

func TestGetImage(t *testing.T) {
	t.Run("existing image", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On(
			"QueryRow",
			mock.Anything, "imageID", "2x",
		).Return([]byte("image2xData"), nil)
		s := NewImageStore(db)

		data, err := s.GetImage(context.Background(), "imageID", "2x")
		assert.Equal(t, nil, err)
		assert.Equal(t, []byte("image2xData"), data)
		db.AssertExpectations(t)
	})

	t.Run("database error", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On(
			"QueryRow",
			mock.Anything, "imageID", "2x",
		).Return(nil, errFakeDatabaseFailure)
		s := NewImageStore(db)

		data, err := s.GetImage(context.Background(), "imageID", "2x")
		assert.Equal(t, errFakeDatabaseFailure, err)
		assert.Nil(t, data)
		db.AssertExpectations(t)
	})
}
