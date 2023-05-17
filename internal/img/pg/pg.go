package pg

import (
	"context"
	"crypto/sha256"
	"errors"
	"sync"

	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/img"
	svg "github.com/h2non/go-is-svg"
	lru "github.com/hashicorp/golang-lru/v2"
	"github.com/jackc/pgx/v4"
	"github.com/spf13/viper"
)

const (
	// Database queries
	getImageDBQ      = `select get_image($1::uuid, $2::text)`
	getImageIDDBQ    = `select image_id from image where original_hash = $1`
	registerImageDBQ = `select register_image($1::bytea, $2::text, $3::bytea)`

	// Cache
	cacheSize = 250
)

// DB defines the methods the database handler must provide.
type DB interface {
	QueryRow(ctx context.Context, sql string, args ...interface{}) pgx.Row
}

// ImageStore is an image.Store implementation that uses PostgreSQL as the
// underlying storage.
type ImageStore struct {
	cfg         *viper.Viper
	db          DB
	hc          img.HTTPClient
	imagesCache *lru.Cache[string, []byte]
	errorsCache *lru.Cache[string, error]
	mutexes     sync.Map
}

// NewImageStore creates a new ImageStore instance.
func NewImageStore(
	cfg *viper.Viper,
	db DB,
	hc img.HTTPClient,
) *ImageStore {
	imagesCache, _ := lru.New[string, []byte](cacheSize)
	errorsCache, _ := lru.New[string, error](cacheSize)
	return &ImageStore{
		cfg:         cfg,
		db:          db,
		hc:          hc,
		imagesCache: imagesCache,
		errorsCache: errorsCache,
	}
}

// DownloadAndSaveImage implements the image.Store interface.
func (s *ImageStore) DownloadAndSaveImage(ctx context.Context, imageURL string) (string, error) {
	// Make sure we only process the same image once at a time
	cachedImage, _ := s.mutexes.LoadOrStore(imageURL, &sync.Mutex{})
	imageMu := cachedImage.(*sync.Mutex)
	imageMu.Lock()
	defer imageMu.Unlock()

	// Try to get image data from the cache to avoid hitting the source
	data, ok := s.imagesCache.Get(imageURL)
	if !ok {
		// Image not found in the cache. Check if we've tried downloading it
		// already, returning the cached error if available.
		cachedError, ok := s.errorsCache.Get(imageURL)
		if ok {
			return "", cachedError
		}

		// Download it from source and store it in the cache.
		var err error
		data, err = img.Download(ctx, s.hc, imageURL)
		if err != nil {
			s.errorsCache.Add(imageURL, err)
			return "", err
		}
		s.imagesCache.Add(imageURL, data)
	}

	// Store image in the database
	return s.SaveImage(ctx, data)
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
