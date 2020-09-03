package repo

import (
	"errors"
	"fmt"

	"github.com/artifacthub/hub/internal/hub"
	"github.com/satori/uuid"
)

var (
	// ErrInvalidMetadata indicates that the metadata provided is not valid.
	ErrInvalidMetadata = errors.New("invalid metadata")
)

// ValidateMetadata validates if the repository metadata provided is valid.
func ValidateMetadata(md *hub.RepositoryMetadata) error {
	if md.RepositoryID != "" {
		if _, err := uuid.FromString(md.RepositoryID); err != nil {
			return fmt.Errorf("%w: %s", ErrInvalidMetadata, "invalid repository id")
		}
	}
	return nil
}
