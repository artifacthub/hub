package img

import (
	"bytes"
	"context"

	"github.com/disintegration/imaging"
)

// Store describes the methods an image.Store implementation must provide.
type Store interface {
	// GetImage returns the image identified by the ID and version provided.
	GetImage(ctx context.Context, imageID, version string) (datd []byte, err error)

	// SaveImage stores an image returning the image ID.
	SaveImage(ctx context.Context, data []byte) (imageID string, err error)
}

// ImageVersion represents a specific size version of an image.
type ImageVersion struct {
	Version string
	Data    []byte
}

// GenerateImageVersions generates multiple versions of different sizes for the
// image provided.
func GenerateImageVersions(data []byte) ([]*ImageVersion, error) {
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
	imgVersions := make([]*ImageVersion, 0, len(spec))
	for _, e := range spec {
		imgVersion := imaging.Fit(img, e.width, e.height, imaging.Lanczos)
		var buf bytes.Buffer
		if err := imaging.Encode(&buf, imgVersion, imaging.PNG); err != nil {
			return nil, err
		}
		imgVersions = append(imgVersions, &ImageVersion{
			Version: e.version,
			Data:    buf.Bytes(),
		})
	}

	return imgVersions, nil
}
