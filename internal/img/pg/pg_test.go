package pg

import (
	"bytes"
	"context"
	"crypto/sha256"
	"io"
	"net/http"
	"os"
	"sync"
	"testing"

	"github.com/artifacthub/hub/internal/tests"
	"github.com/jackc/pgx/v4"
	"github.com/spf13/viper"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

func TestNewImageStore(t *testing.T) {
	t.Parallel()
	db := &tests.DBMock{}
	hc := &tests.HTTPClientMock{}
	s := NewImageStore(nil, db, hc)

	assert.IsType(t, &ImageStore{}, s)
	assert.Equal(t, db, s.db)
	assert.Equal(t, hc, s.hc)
}

func TestDownloadAndSaveImage(t *testing.T) {
	cfg := viper.New()
	ctx := context.Background()
	svgImgURL := "https://raw.githubusercontent.com/image.svg"
	svgImgData, err := os.ReadFile("testdata/image.svg")
	require.NoError(t, err)
	sumSvgImg := sha256.Sum256(svgImgData)
	svgImgHash := sumSvgImg[:]

	t.Run("image not found in cache, it needs to be downloaded", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, getImageIDDBQ, svgImgHash).Return(nil, pgx.ErrNoRows)
		db.On("QueryRow", ctx, registerImageDBQ, svgImgHash, "svg", svgImgData).Return("svgImgID", nil)
		hc := &tests.HTTPClientMock{}
		req, _ := http.NewRequest("GET", svgImgURL, nil)
		hc.On("Do", req).Return(&http.Response{
			Body:       io.NopCloser(bytes.NewReader(svgImgData)),
			StatusCode: http.StatusOK,
		}, nil)
		s := NewImageStore(cfg, db, hc)

		imageID, err := s.DownloadAndSaveImage(ctx, svgImgURL)
		assert.Equal(t, nil, err)
		assert.Equal(t, "svgImgID", imageID)
		db.AssertExpectations(t)
		hc.AssertExpectations(t)
	})

	t.Run("error downloading image", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		hc := &tests.HTTPClientMock{}
		req, _ := http.NewRequest("GET", svgImgURL, nil)
		hc.On("Do", req).Return(nil, tests.ErrFake)
		s := NewImageStore(cfg, db, hc)

		imageID, err := s.DownloadAndSaveImage(ctx, svgImgURL)
		assert.Equal(t, tests.ErrFake, err)
		assert.Equal(t, "", imageID)
		db.AssertExpectations(t)
		hc.AssertExpectations(t)
	})

	t.Run("image found in cache, no need to download it", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, getImageIDDBQ, svgImgHash).Return(nil, pgx.ErrNoRows)
		db.On("QueryRow", ctx, registerImageDBQ, svgImgHash, "svg", svgImgData).Return("svgImgID", nil)
		hc := &tests.HTTPClientMock{}
		s := NewImageStore(cfg, db, hc)
		s.imagesCache.Add(svgImgURL, svgImgData)

		imageID, err := s.DownloadAndSaveImage(ctx, svgImgURL)
		assert.Equal(t, nil, err)
		assert.Equal(t, "svgImgID", imageID)
		db.AssertExpectations(t)
		hc.AssertExpectations(t)
	})

	t.Run("multiple goroutines calling simultaneously, image is downloaded and saved once", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, getImageIDDBQ, svgImgHash).Return("svgImgID", nil).Times(2)
		db.On("QueryRow", ctx, getImageIDDBQ, svgImgHash).Return(nil, pgx.ErrNoRows).Once()
		db.On("QueryRow", ctx, registerImageDBQ, svgImgHash, "svg", svgImgData).Return("svgImgID", nil).Once()
		hc := &tests.HTTPClientMock{}
		req, _ := http.NewRequest("GET", svgImgURL, nil)
		hc.On("Do", req).Return(&http.Response{
			Body:       io.NopCloser(bytes.NewReader(svgImgData)),
			StatusCode: http.StatusOK,
		}, nil).Once()
		s := NewImageStore(cfg, db, hc)

		var wg sync.WaitGroup
		for i := 0; i < 3; i++ {
			wg.Add(1)
			go func() {
				defer wg.Done()
				imageID, err := s.DownloadAndSaveImage(ctx, svgImgURL)
				assert.Equal(t, nil, err)
				assert.Equal(t, "svgImgID", imageID)
			}()
		}
		wg.Wait()
		db.AssertExpectations(t)
		hc.AssertExpectations(t)
	})

	t.Run("multiple goroutines calling simultaneously, image download failed (only tried once)", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		hc := &tests.HTTPClientMock{}
		req, _ := http.NewRequest("GET", svgImgURL, nil)
		hc.On("Do", req).Return(nil, tests.ErrFake).Once()
		s := NewImageStore(cfg, db, hc)

		var wg sync.WaitGroup
		for i := 0; i < 3; i++ {
			wg.Add(1)
			go func() {
				defer wg.Done()
				imageID, err := s.DownloadAndSaveImage(ctx, svgImgURL)
				assert.Equal(t, tests.ErrFake, err)
				assert.Equal(t, "", imageID)
			}()
		}
		wg.Wait()
		db.AssertExpectations(t)
		hc.AssertExpectations(t)
	})
}

func TestGetImage(t *testing.T) {
	ctx := context.Background()

	t.Run("existing image", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, getImageDBQ, "imageID", "2x").Return([]byte("image2xData"), nil)
		s := NewImageStore(nil, db, nil)

		data, err := s.GetImage(ctx, "imageID", "2x")
		assert.Equal(t, nil, err)
		assert.Equal(t, []byte("image2xData"), data)
		db.AssertExpectations(t)
	})

	t.Run("database error", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, getImageDBQ, "imageID", "2x").Return(nil, tests.ErrFakeDB)
		s := NewImageStore(nil, db, nil)

		data, err := s.GetImage(ctx, "imageID", "2x")
		assert.Equal(t, tests.ErrFakeDB, err)
		assert.Nil(t, data)
		db.AssertExpectations(t)
	})
}

func TestSaveImage(t *testing.T) {
	pngImgData, err := os.ReadFile("testdata/image.png")
	require.NoError(t, err)
	sumPngImg := sha256.Sum256(pngImgData)
	pngImgHash := sumPngImg[:]
	svgImgData, err := os.ReadFile("testdata/image.svg")
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
		s := NewImageStore(nil, db, nil)

		imageID, err := s.SaveImage(ctx, pngImgData)
		require.NoError(t, err)
		assert.Equal(t, "pngImgID", imageID)
		db.AssertExpectations(t)
	})

	t.Run("successful svg image registration", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, getImageIDDBQ, svgImgHash).Return(nil, pgx.ErrNoRows)
		db.On("QueryRow", ctx, registerImageDBQ, svgImgHash, "svg", svgImgData).Return("svgImgID", nil)
		s := NewImageStore(nil, db, nil)

		imageID, err := s.SaveImage(ctx, svgImgData)
		require.NoError(t, err)
		assert.Equal(t, "svgImgID", imageID)
		db.AssertExpectations(t)
	})

	t.Run("try to register existing png image", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, getImageIDDBQ, pngImgHash).Return("existingImageID", nil)
		s := NewImageStore(nil, db, nil)

		imageID, err := s.SaveImage(ctx, pngImgData)
		require.NoError(t, err)
		assert.Equal(t, "existingImageID", imageID)
		db.AssertExpectations(t)
	})

	t.Run("database error calling get_image_id", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, getImageIDDBQ, pngImgHash).Return(nil, tests.ErrFakeDB)
		s := NewImageStore(nil, db, nil)

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
		s := NewImageStore(nil, db, nil)

		imageID, err := s.SaveImage(ctx, pngImgData)
		assert.Equal(t, tests.ErrFakeDB, err)
		assert.Empty(t, imageID)
		db.AssertExpectations(t)
	})
}
