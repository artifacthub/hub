package pkg

import (
	"errors"
	"strconv"
	"testing"

	"github.com/artifacthub/hub/internal/hub"
	"github.com/stretchr/testify/assert"
)

func TestPreparePackageFromMetadata(t *testing.T) {
	testCases := []struct {
		md          *hub.PackageMetadata
		expectedPkg *hub.Package
		expectedErr error
	}{
		{
			&hub.PackageMetadata{},
			nil,
			ErrInvalidMetadata,
		},
		{
			&hub.PackageMetadata{
				Version:        "1.0.0",
				Name:           "pkg1",
				DisplayName:    "Package 1",
				CreatedAt:      "2006-01-02T15:04:05Z",
				Description:    "Package description",
				Digest:         "0123456789",
				License:        "Apache-2.0",
				HomeURL:        "https://home.url",
				AppVersion:     "10.0.0",
				PublisherID:    "1234",
				ContainerImage: "registry/org/image:tag",
				Operator:       false,
				Deprecated:     false,
				Keywords: []string{
					"kw1",
					"kw2",
				},
				Links: []*hub.Link{
					{
						Name: "link1",
						URL:  "https://link1.url",
					},
				},
				Readme:  "Package readme",
				Install: "Package install",
				Maintainers: []*hub.Maintainer{
					{
						Name:  "maintainer1",
						Email: "maintainer1@email.com",
					},
				},
				Provider: &hub.Provider{
					Name: "Package provider",
				},
			},
			&hub.Package{
				Name:        "pkg1",
				IsOperator:  false,
				DisplayName: "Package 1",
				Description: "Package description",
				Keywords: []string{
					"kw1",
					"kw2",
				},
				HomeURL: "https://home.url",
				Readme:  "Package readme",
				Install: "Package install",
				Links: []*hub.Link{
					{
						Name: "link1",
						URL:  "https://link1.url",
					},
				},
				Version:        "1.0.0",
				AppVersion:     "10.0.0",
				Digest:         "0123456789",
				Deprecated:     false,
				License:        "Apache-2.0",
				ContainerImage: "registry/org/image:tag",
				Provider:       "Package provider",
				Maintainers: []*hub.Maintainer{
					{
						Name:  "maintainer1",
						Email: "maintainer1@email.com",
					},
				},
				CreatedAt: 1136214245,
			},
			nil,
		},
	}
	for i, tc := range testCases {
		tc := tc
		t.Run(strconv.Itoa(i), func(t *testing.T) {
			pkg, err := PreparePackageFromMetadata(tc.md)
			if tc.expectedErr == nil {
				assert.Nil(t, err)
			} else {
				assert.True(t, errors.Is(err, tc.expectedErr))
			}
			assert.Equal(t, tc.expectedPkg, pkg)
		})
	}
}

func TestValidatePackageMetadata(t *testing.T) {
	t.Run("invalid metadata", func(t *testing.T) {
		testCases := []struct {
			md     *hub.PackageMetadata
			errMsg string
		}{
			{
				&hub.PackageMetadata{},
				"version not provided",
			},
			{
				&hub.PackageMetadata{
					Version: "invalid",
				},
				"invalid version (semver expected)",
			},
			{
				&hub.PackageMetadata{
					Version: "1.0.0",
				},
				"name not provided",
			},
			{
				&hub.PackageMetadata{
					Version: "1.0.0",
					Name:    "pkg1",
				},
				"display name not provided",
			},
			{
				&hub.PackageMetadata{
					Version:     "1.0.0",
					Name:        "pkg1",
					DisplayName: "Package 1",
				},
				"createdAt not provided",
			},
			{
				&hub.PackageMetadata{
					Version:     "1.0.0",
					Name:        "pkg1",
					DisplayName: "Package 1",
					CreatedAt:   "2006-01-02  15:04",
				},
				"invalid createdAt (RFC3339 expected)",
			},
			{
				&hub.PackageMetadata{
					Version:     "1.0.0",
					Name:        "pkg1",
					DisplayName: "Package 1",
					CreatedAt:   "2006-01-02T15:04:05Z",
				},
				"description not provided",
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.errMsg, func(t *testing.T) {
				err := ValidatePackageMetadata(tc.md)
				assert.True(t, errors.Is(err, ErrInvalidMetadata))
				assert.Contains(t, err.Error(), tc.errMsg)
			})
		}
	})

	t.Run("valid metadata", func(t *testing.T) {
		md := &hub.PackageMetadata{
			Version:     "1.0.0",
			Name:        "pkg1",
			DisplayName: "Package 1",
			CreatedAt:   "2006-01-02T15:04:05Z",
			Description: "Package description",
		}
		err := ValidatePackageMetadata(md)
		assert.Nil(t, err)
	})
}
