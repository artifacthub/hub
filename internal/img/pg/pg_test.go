package pg

import (
	"context"
	"errors"
	"io/ioutil"
	"testing"

	"github.com/cncf/hub/internal/tests"
	"github.com/jackc/pgx/v4"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

var testFakeError = errors.New("test fake error")

func TestNewImageStore(t *testing.T) {
	// Setup mock db and image store instance
	db := &tests.DBMock{}
	s := NewImageStore(db)

	// Check the image store instance was created as expected
	assert.IsType(t, &ImageStore{}, s)
	assert.Equal(t, db, s.db)
}

func TestSaveImage(t *testing.T) {
	// Setup mock db and image store instance
	db := &tests.DBMock{}
	s := NewImageStore(db)

	// Check we get the expected image id once the image is saved
	db.SetError(
		"select image_id from image where original_hash = $1",
		pgx.ErrNoRows,
	)
	db.SetData(
		"select register_image($1, $2, $3)",
		[]byte("imageID"),
	)
	imageData, err := ioutil.ReadFile("testdata/image.png")
	require.NoError(t, err)
	imageID, err := s.SaveImage(context.Background(), imageData)
	require.NoError(t, err)
	assert.Equal(t, "imageID", imageID)

	// Check if we try to register an existing image we get its id
	db.SetData(
		"select image_id from image where original_hash = $1",
		[]byte("existingImageID"),
	)
	db.SetError(
		"select image_id from image where original_hash = $1",
		nil,
	)
	db.SetError(
		"select register_image($1, $2, $3)",
		testFakeError, // register_image shouldn't even be called
	)
	imageID, err = s.SaveImage(context.Background(), imageData)
	require.NoError(t, err)
	assert.Equal(t, "existingImageID", imageID)

	// Introduce a fake db error registering an image
	db.SetError(
		"select image_id from image where original_hash = $1",
		pgx.ErrNoRows,
	)
	db.SetError(
		"select register_image($1, $2, $3)",
		testFakeError,
	)
	imageID, err = s.SaveImage(context.Background(), imageData)
	assert.Equal(t, testFakeError, err)
	assert.Empty(t, imageID)
}

func TestGetImage(t *testing.T) {
	// Setup mock db and image store instance
	db := &tests.DBMock{}
	db.SetData("", []byte("image2xData"))
	s := NewImageStore(db)

	// Check we get the expected image data
	data, err := s.GetImage(context.Background(), "imageID", "2x")
	assert.Equal(t, nil, err)
	assert.Equal(t, []byte("image2xData"), data)

	// Introduce a fake db error and check we get it when requesting the stats
	db.SetError("", testFakeError)
	data, err = s.GetImage(context.Background(), "imageID", "2x")
	assert.Equal(t, testFakeError, err)
	assert.Nil(t, data)
}
