package repo

import (
	"errors"
	"strconv"
	"testing"

	"github.com/artifacthub/hub/internal/hub"
	"github.com/stretchr/testify/assert"
)

func TestValidateMetadata(t *testing.T) {
	t.Run("invalid metadata", func(t *testing.T) {
		testCases := []struct {
			md     *hub.RepositoryMetadata
			errMsg string
		}{
			{
				&hub.RepositoryMetadata{
					RepositoryID: "invalid",
				},
				"invalid repository id",
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.errMsg, func(t *testing.T) {
				err := ValidateMetadata(tc.md)
				assert.True(t, errors.Is(err, ErrInvalidMetadata))
				assert.Contains(t, err.Error(), tc.errMsg)
			})
		}
	})

	t.Run("valid metadata", func(t *testing.T) {
		testCases := []*hub.RepositoryMetadata{
			{},
			{RepositoryID: ""},
			{RepositoryID: "00000000-0000-0000-0000-000000000001"},
		}
		for i, md := range testCases {
			md := md
			t.Run(strconv.Itoa(i), func(t *testing.T) {
				err := ValidateMetadata(md)
				assert.Nil(t, err)
			})
		}
	})
}
