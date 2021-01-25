package pg

import (
	"context"
	"crypto/sha256"
	"errors"

	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/img"
	svg "github.com/h2non/go-is-svg"
	"github.com/jackc/pgx/v4"
)

const (
	// Database queries
	getImageDBQ      = `select get_image($1::uuid, $2::text)`
	getImageIDDBQ    = `select image_id from image where original_hash = $1`
	registerImageDBQ = `select register_image($1::bytea, $2::text, $3::bytea)`
)

// DB defines the methods the database handler must provide.
type DB interface {
	QueryRow(ctx context.Context, sql string, args ...interface{}) pgx.Row
}

// ImageStore is an image.Store implementation that uses PostgreSQL as the
// underlying storage.
type ImageStore struct {
	db DB
}

// NewImageStore creates a new ImageStore instance.
func NewImageStore(db DB) *ImageStore {
	return &ImageStore{
		db: db,
	}
}

// GetImage returns an image stored in the database.
func (s *ImageStore) GetImage(ctx context.Context, imageID, version string) ([]byte, error) {
	var data []byte
	err := s.db.QueryRow(ctx, getImageDBQ, imageID, version).Scan(&data)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, hub.ErrNotFound
		}
		return nil, err
	}
	return data, nil
}

// SaveImage implements the image.Store interface.
func (s *ImageStore) SaveImage(ctx context.Context, data []byte) (string, error) {
	// Compute image hash using sha256
	sum := sha256.Sum256(data)
	originalHash := sum[:]

	// If image is already registered we just return its id
	imageID, err := s.getImageID(ctx, originalHash)
	if err != nil {
		return "", err
	}
	if imageID != "" {
		return imageID, nil
	}

	// If image format is svg register it as is in database, as this format
	// doesn't require to store additional size specific versions
	if svg.Is(data) {
		return s.registerImage(ctx, originalHash, "svg", data)
	}

	// Generate image versions of different sizes and store them
	imageVersions, err := img.GenerateVersions(data)
	if err != nil {
		return "", err
	}
	for _, v := range imageVersions {
		imageID, err = s.registerImage(ctx, originalHash, v.Version, v.Data)
		if err != nil {
			return "", err
		}
	}

	return imageID, nil
}

// getImageID checks if the database contains an image with the hash provided,
// returning its id when found.
func (s *ImageStore) getImageID(ctx context.Context, hash []byte) (string, error) {
	var imageID string
	err := s.db.QueryRow(ctx, getImageIDDBQ, hash).Scan(&imageID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return "", nil
		}
		return "", err
	}
	return imageID, nil
}

// registerImage stores the image provided in the database.
func (s *ImageStore) registerImage(ctx context.Context, hash []byte, version string, data []byte) (string, error) {
	var imageID string
	err := s.db.QueryRow(ctx, registerImageDBQ, hash, version, data).Scan(&imageID)
	if err != nil {
		return "", err
	}
	return imageID, nil
}
