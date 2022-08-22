package img

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"

	"github.com/disintegration/imaging"
	"github.com/vincent-petithory/dataurl"
)

// HTTPClient defines the methods an HTTPClient implementation must provide.
type HTTPClient interface {
	Do(req *http.Request) (*http.Response, error)
}

// Store describes the methods an image.Store implementation must provide.
type Store interface {
	// DownloadAndSaveImage downloads the image located at the url provided and
	// stores it returning the image ID.
	DownloadAndSaveImage(ctx context.Context, imageURL string) (imageID string, err error)

	// GetImage returns the image identified by the ID and version provided.
	GetImage(ctx context.Context, imageID, version string) (datd []byte, err error)

	// SaveImage stores an image returning the image ID.
	SaveImage(ctx context.Context, data []byte) (imageID string, err error)
}

// Version represents a specific size version of an image.
type Version struct {
	Version string
	Data    []byte
}

// Download downloads the image located at the url provided. If it's a data url
// the image is extracted from it. Otherwise it's downloaded using the url.
func Download(
	ctx context.Context,
	hc HTTPClient,
	imageURL string,
) ([]byte, error) {
	// Image in data url
	if strings.HasPrefix(imageURL, "data:") {
		dataURL, err := dataurl.DecodeString(imageURL)
		if err != nil {
			return nil, err
		}
		return dataURL.Data, nil
	}

	// Download image using url provided
	req, _ := http.NewRequest("GET", imageURL, nil)
	if _, err := url.Parse(imageURL); err != nil {
		return nil, err
	}
	resp, err := hc.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode == http.StatusOK {
		return io.ReadAll(resp.Body)
	}
	return nil, fmt.Errorf("unexpected status code received: %d", resp.StatusCode)
}

// GenerateVersions generates multiple versions of different sizes for the
// image provided.
func GenerateVersions(data []byte) ([]*Version, error) {
	// Define versions spec
	spec := []struct {
		version string
		width   int
		height  int
	}{
		{"1x", 80, 80},
		{"2x", 160, 160},
		{"3x", 240, 240},
		{"4x", 320, 320},
	}

	// Decode original image data
	img, err := imaging.Decode(bytes.NewReader(data))
	if err != nil {
		return nil, err
	}

	// Generate image versions
	imgVersions := make([]*Version, 0, len(spec))
	for _, e := range spec {
		imgVersion := imaging.Fit(img, e.width, e.height, imaging.Lanczos)
		var buf bytes.Buffer
		if err := imaging.Encode(&buf, imgVersion, imaging.PNG); err != nil {
			return nil, err
		}
		imgVersions = append(imgVersions, &Version{
			Version: e.version,
			Data:    buf.Bytes(),
		})
	}

	return imgVersions, nil
}
