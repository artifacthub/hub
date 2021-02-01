package img

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"io/ioutil"
	"net/http"
	"strings"
	"testing"

	"github.com/artifacthub/hub/internal/tests"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

var update = flag.Bool("update", false, "Write image versions to testdata directory")

func TestGenerateVersions(t *testing.T) {
	t.Parallel()

	// Read sample images
	validImgData, err := ioutil.ReadFile("testdata/valid.png")
	require.NoError(t, err)
	invalidImgData, err := ioutil.ReadFile("testdata/invalid.png")
	require.NoError(t, err)

	// Check the data provided must be a valid image
	_, err = GenerateVersions(invalidImgData)
	require.Error(t, err)

	// Generate image1 versions and check we get the expected results
	imgVersions, err := GenerateVersions(validImgData)
	require.NoError(t, err)
	if *update {
		// Update image1 versions in testdata
		for _, iv := range imgVersions {
			name := fmt.Sprintf("testdata/valid@%s.png", iv.Version)
			err := ioutil.WriteFile(name, iv.Data, 0600)
			require.NoError(t, err)
		}
	}
	for _, iv := range imgVersions {
		name := fmt.Sprintf("testdata/valid@%s.png", iv.Version)
		ivGolden, err := ioutil.ReadFile(name)
		require.NoError(t, err)
		assert.Equal(t, ivGolden, iv.Data)
	}
}

func TestDownload(t *testing.T) {
	ctx := context.Background()
	imageURL := "https://raw.githubusercontent.com/image1.png"

	t.Run("invalid data url", func(t *testing.T) {
		t.Parallel()
		hc := &tests.HTTPClientMock{}

		data, err := Download(ctx, hc, "", nil, "data:invalid")
		assert.Nil(t, data)
		assert.Error(t, err)
		hc.AssertExpectations(t)
	})

	t.Run("invalid image url", func(t *testing.T) {
		t.Parallel()
		hc := &tests.HTTPClientMock{}

		data, err := Download(ctx, hc, "", nil, "invalid \n url")
		assert.Nil(t, data)
		assert.Error(t, err)
		hc.AssertExpectations(t)
	})

	t.Run("request failed", func(t *testing.T) {
		t.Parallel()
		hc := &tests.HTTPClientMock{}
		req, _ := http.NewRequest("GET", imageURL, nil)
		hc.On("Do", req).Return(nil, tests.ErrFake)

		data, err := Download(ctx, hc, "", nil, imageURL)
		assert.Nil(t, data)
		assert.Equal(t, tests.ErrFake, err)
		hc.AssertExpectations(t)
	})

	t.Run("unexpected status code received", func(t *testing.T) {
		t.Parallel()
		hc := &tests.HTTPClientMock{}
		req, _ := http.NewRequest("GET", imageURL, nil)
		hc.On("Do", req).Return(&http.Response{
			Body:       ioutil.NopCloser(strings.NewReader("")),
			StatusCode: http.StatusNotFound,
		}, nil)

		data, err := Download(ctx, hc, "", nil, imageURL)
		assert.Nil(t, data)
		assert.Equal(t, errors.New("unexpected status code received: 404"), err)
		hc.AssertExpectations(t)
	})

	t.Run("request succeeded", func(t *testing.T) {
		t.Parallel()
		hc := &tests.HTTPClientMock{}
		req, _ := http.NewRequest("GET", imageURL, nil)
		hc.On("Do", req).Return(&http.Response{
			Body:       ioutil.NopCloser(strings.NewReader("")),
			StatusCode: http.StatusOK,
		}, nil)

		data, err := Download(ctx, hc, "", nil, imageURL)
		assert.NotNil(t, data)
		assert.Nil(t, err)
		hc.AssertExpectations(t)
	})
}
