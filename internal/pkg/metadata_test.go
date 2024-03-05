package pkg

import (
	"errors"
	"os"
	"strconv"
	"testing"

	"github.com/artifacthub/hub/internal/hub"
	"github.com/stretchr/testify/assert"
)

func TestGetPackageMetadata(t *testing.T) {
	t.Run("error reading package metadata file", func(t *testing.T) {
		t.Parallel()
		_, err := GetPackageMetadata(hub.Keptn, "testdata/not-exists")
		assert.Error(t, err)
		assert.Equal(t, "error reading package metadata file: open testdata/not-exists.yaml: no such file or directory", err.Error())
		assert.True(t, errors.Is(err, os.ErrNotExist))
	})

	t.Run("error unmarshaling package metadata file", func(t *testing.T) {
		t.Parallel()
		_, err := GetPackageMetadata(hub.Keptn, "testdata/invalid")
		assert.Error(t, err)
		assert.Equal(t, "error unmarshaling package metadata file: yaml: line 2: found unexpected end of stream", err.Error())
	})

	t.Run("error validating package metadata file", func(t *testing.T) {
		t.Parallel()
		_, err := GetPackageMetadata(hub.Keptn, "testdata/no-version")
		assert.Error(t, err)
		assert.Equal(t, "error validating package metadata file: 5 errors occurred:\n\t* invalid metadata: version not provided\n\t* invalid metadata: name not provided\n\t* invalid metadata: display name not provided\n\t* invalid metadata: createdAt not provided\n\t* invalid metadata: description not provided\n\n", err.Error())
	})

	t.Run("success with .yml", func(t *testing.T) {
		t.Parallel()
		_, err := GetPackageMetadata(hub.Keptn, "testdata/valid1")
		assert.NoError(t, err)
	})

	t.Run("success with .yaml", func(t *testing.T) {
		t.Parallel()
		_, err := GetPackageMetadata(hub.Keptn, "testdata/valid2")
		assert.NoError(t, err)
	})
}

func TestPreparePackageFromMetadata(t *testing.T) {
	testCases := []struct {
		md          *hub.PackageMetadata
		expectedPkg *hub.Package
		expectedErr error
	}{
		{
			&hub.PackageMetadata{
				Version:     "v1.0.0",
				Name:        "pkg1",
				DisplayName: "Package 1",
				CreatedAt:   "2006-01-02T15:04:05Z",
				Description: "Package description",
				Category:    "security",
				Digest:      "0123456789",
				License:     "Apache-2.0",
				HomeURL:     "https://home.url",
				AppVersion:  "10.0.0",
				PublisherID: "1234",
				ContainersImages: []*hub.ContainerImage{
					{
						Image: "registry/org/image:tag",
					},
				},
				Operator:   false,
				Deprecated: false,
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
				Changes: []*hub.Change{
					{
						Kind:        "Added",
						Description: "feature 1",
					},
					{
						Kind:        "Fixed",
						Description: "issue 1",
					},
				},
				ContainsSecurityUpdates: true,
				Prerelease:              true,
				Maintainers: []*hub.Maintainer{
					{
						Name:  "maintainer1",
						Email: "maintainer1@email.com",
					},
				},
				Provider: &hub.Provider{
					Name: "Package provider",
				},
				Recommendations: []*hub.Recommendation{
					{
						URL: "https://artifacthub.io/packages/helm/artifact-hub/artifact-hub",
					},
				},
				Screenshots: []*hub.Screenshot{
					{
						Title: "Screenshot 1",
						URL:   "https://artifacthub.io/screenshot1.jpg",
					},
				},
				Annotations: map[string]string{
					"key": "value",
				},
			},
			&hub.Package{
				Name:        "pkg1",
				IsOperator:  false,
				DisplayName: "Package 1",
				Description: "Package description",
				Category:    hub.Security,
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
				Version:    "1.0.0",
				AppVersion: "10.0.0",
				Digest:     "0123456789",
				Deprecated: false,
				License:    "Apache-2.0",
				ContainersImages: []*hub.ContainerImage{
					{
						Image: "registry/org/image:tag",
					},
				},
				Provider: "Package provider",
				Changes: []*hub.Change{
					{
						Kind:        "added",
						Description: "feature 1",
					},
					{
						Kind:        "fixed",
						Description: "issue 1",
					},
				},
				ContainsSecurityUpdates: true,
				Prerelease:              true,
				Maintainers: []*hub.Maintainer{
					{
						Name:  "maintainer1",
						Email: "maintainer1@email.com",
					},
				},
				Recommendations: []*hub.Recommendation{
					{
						URL: "https://artifacthub.io/packages/helm/artifact-hub/artifact-hub",
					},
				},
				Screenshots: []*hub.Screenshot{
					{
						Title: "Screenshot 1",
						URL:   "https://artifacthub.io/screenshot1.jpg",
					},
				},
				Data: map[string]interface{}{
					"key": "value",
				},
				TS: 1136214245,
			},
			nil,
		},
	}
	for i, tc := range testCases {
		tc := tc
		t.Run(strconv.Itoa(i), func(t *testing.T) {
			t.Parallel()
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
			kind           hub.RepositoryKind
			md             *hub.PackageMetadata
			expectedErrors []string
		}{
			{
				hub.Keptn,
				&hub.PackageMetadata{},
				[]string{
					"invalid metadata: version not provided",
					"invalid metadata: name not provided",
					"invalid metadata: display name not provided",
					"invalid metadata: createdAt not provided",
					"invalid metadata: description not provided",
				},
			},
			{
				hub.Keptn,
				&hub.PackageMetadata{
					Version: "invalid",
				},
				[]string{
					"invalid metadata: invalid version (semver expected)",
					"invalid metadata: name not provided",
					"invalid metadata: display name not provided",
					"invalid metadata: createdAt not provided",
					"invalid metadata: description not provided",
				},
			},
			{
				hub.Keptn,
				&hub.PackageMetadata{
					Version: "1.0.0",
				},
				[]string{
					"invalid metadata: name not provided",
					"invalid metadata: display name not provided",
					"invalid metadata: createdAt not provided",
					"invalid metadata: description not provided",
				},
			},
			{
				hub.Keptn,
				&hub.PackageMetadata{
					Version:         "1.0.0",
					Name:            "pkg1",
					AlternativeName: "something else",
				},
				[]string{
					"invalid alternative name (must be a subset or superset of the name)",
					"invalid metadata: display name not provided",
					"invalid metadata: createdAt not provided",
					"invalid metadata: description not provided",
				},
			},
			{
				hub.Keptn,
				&hub.PackageMetadata{
					Version:     "1.0.0",
					Name:        "pkg1",
					DisplayName: "Package 1",
				},
				[]string{
					"invalid metadata: createdAt not provided",
					"invalid metadata: description not provided",
				},
			},
			{
				hub.Keptn,
				&hub.PackageMetadata{
					Version:     "1.0.0",
					Name:        "pkg1",
					DisplayName: "Package 1",
					CreatedAt:   "2006-01-02  15:04",
				},
				[]string{
					"invalid metadata: invalid createdAt (RFC3339 expected)",
					"invalid metadata: description not provided",
				},
			},
			{
				hub.Keptn,
				&hub.PackageMetadata{
					Version:     "1.0.0",
					Name:        "pkg1",
					DisplayName: "Package 1",
					CreatedAt:   "2006-01-02T15:04:05Z",
				},
				[]string{
					"invalid metadata: description not provided",
				},
			},
			{
				hub.Keptn,
				&hub.PackageMetadata{
					Version:     "1.0.0",
					Name:        "pkg1",
					DisplayName: "Package 1",
					CreatedAt:   "2006-01-02T15:04:05Z",
					Description: "description",
					Category:    "invalid",
				},
				[]string{
					"invalid category name",
				},
			},
			{
				hub.Keptn,
				&hub.PackageMetadata{
					Version:     "1.0.0",
					Name:        "pkg1",
					DisplayName: "Package 1",
					CreatedAt:   "2006-01-02T15:04:05Z",
					Description: "description",
					Maintainers: []*hub.Maintainer{
						{
							Name: "test",
						},
					},
				},
				[]string{
					"invalid metadata: maintainer email not provided",
				},
			},
			{
				hub.Keptn,
				&hub.PackageMetadata{
					Version:     "1.0.0",
					Name:        "pkg1",
					DisplayName: "Package 1",
					CreatedAt:   "2006-01-02T15:04:05Z",
					Description: "description",
					Changes: []*hub.Change{
						nil,
					},
				},
				[]string{
					"invalid change entry",
				},
			},
			{
				hub.Keptn,
				&hub.PackageMetadata{
					Version:     "1.0.0",
					Name:        "pkg1",
					DisplayName: "Package 1",
					CreatedAt:   "2006-01-02T15:04:05Z",
					Description: "description",
					Changes: []*hub.Change{
						{
							Kind:        "test",
							Description: "description",
						},
					},
				},
				[]string{
					"invalid change: invalid kind: test",
				},
			},
			{
				hub.Keptn,
				&hub.PackageMetadata{
					Version:     "1.0.0",
					Name:        "pkg1",
					DisplayName: "Package 1",
					CreatedAt:   "2006-01-02T15:04:05Z",
					Description: "description",
					Changes: []*hub.Change{
						{
							Kind: "added",
						},
					},
				},
				[]string{
					"invalid change: description not provided",
				},
			},
			{
				hub.Keptn,
				&hub.PackageMetadata{
					Version:     "1.0.0",
					Name:        "pkg1",
					DisplayName: "Package 1",
					CreatedAt:   "2006-01-02T15:04:05Z",
					Description: "description",
					Changes: []*hub.Change{
						{
							Kind: "added",
							Links: []*hub.Link{
								{
									URL: "https://link1.url",
								},
							},
						},
					},
				},
				[]string{
					"invalid change: description not provided",
					"invalid change: link name not provided",
				},
			},
			{
				hub.Keptn,
				&hub.PackageMetadata{
					Version:     "1.0.0",
					Name:        "pkg1",
					DisplayName: "Package 1",
					CreatedAt:   "2006-01-02T15:04:05Z",
					Description: "description",
					Changes: []*hub.Change{
						{
							Kind:        "added",
							Description: "feature 1",
							Links: []*hub.Link{
								{
									Name: "link1",
								},
							},
						},
					},
				},
				[]string{
					"invalid change: link url not provided",
				},
			},
			{
				hub.Keptn,
				&hub.PackageMetadata{
					Version:     "1.0.0",
					Name:        "pkg1",
					DisplayName: "Package 1",
					CreatedAt:   "2006-01-02T15:04:05Z",
					Description: "description",
					ContainersImages: []*hub.ContainerImage{
						{
							Image: ":",
						},
					},
				},
				[]string{
					"invalid image reference: could not parse reference",
				},
			},
			{
				hub.Kubewarden,
				&hub.PackageMetadata{
					Version:     "1.0.0",
					Name:        "pkg1",
					DisplayName: "Package 1",
					CreatedAt:   "2006-01-02T15:04:05Z",
					Description: "description",
				},
				[]string{
					`"policy" image not provided`,
				},
			},
			{
				hub.Kubewarden,
				&hub.PackageMetadata{
					Version:     "1.0.0",
					Name:        "pkg1",
					DisplayName: "Package 1",
					CreatedAt:   "2006-01-02T15:04:05Z",
					Description: "description",
					ContainersImages: []*hub.ContainerImage{
						{
							Name:  "something",
							Image: "registry.io/namespace/something:tag",
						},
					},
				},
				[]string{
					`"policy" image not provided`,
				},
			},
			{
				hub.Kubewarden,
				&hub.PackageMetadata{
					Version:     "1.0.0",
					Name:        "pkg1",
					DisplayName: "Package 1",
					CreatedAt:   "2006-01-02T15:04:05Z",
					Description: "description",
					ContainersImages: []*hub.ContainerImage{
						{
							Name:  "policy",
							Image: "registry.io/namespace/policy:tag",
						},
						{
							Name:  "something",
							Image: "registry.io/namespace/something:tag",
						},
					},
				},
				[]string{
					`only "policy" and "policy-alternative-location" images can be provided`,
				},
			},
			{
				hub.Kubewarden,
				&hub.PackageMetadata{
					Version:     "1.0.0",
					Name:        "pkg1",
					DisplayName: "Package 1",
					CreatedAt:   "2006-01-02T15:04:05Z",
					Description: "description",
					ContainersImages: []*hub.ContainerImage{
						{
							Name:  "policy",
							Image: "registry.io/namespace/policy:tag",
						},
						{
							Name:  "policy-alternative-location",
							Image: "registry2.io/namespace/policy:tag",
						},
						{
							Name:  "something",
							Image: "registry.io/namespace/something:tag",
						},
					},
				},
				[]string{
					`only "policy" and "policy-alternative-location" images can be provided`,
				},
			},
			{
				hub.InspektorGadget,
				&hub.PackageMetadata{
					Version:     "1.0.0",
					Name:        "pkg1",
					DisplayName: "Package 1",
					CreatedAt:   "2006-01-02T15:04:05Z",
					Description: "description",
				},
				[]string{
					`"gadget" image not provided`,
				},
			},
			{
				hub.InspektorGadget,
				&hub.PackageMetadata{
					Version:     "1.0.0",
					Name:        "pkg1",
					DisplayName: "Package 1",
					CreatedAt:   "2006-01-02T15:04:05Z",
					Description: "description",
					ContainersImages: []*hub.ContainerImage{
						{
							Name:  "something",
							Image: "registry.io/namespace/something:tag",
						},
					},
				},
				[]string{
					`"gadget" image not provided`,
				},
			},
			{
				hub.InspektorGadget,
				&hub.PackageMetadata{
					Version:     "1.0.0",
					Name:        "pkg1",
					DisplayName: "Package 1",
					CreatedAt:   "2006-01-02T15:04:05Z",
					Description: "description",
					ContainersImages: []*hub.ContainerImage{
						{
							Name:  "gadget",
							Image: "registry.io/namespace/gadget:tag",
						},
						{
							Name:  "something",
							Image: "registry.io/namespace/something:tag",
						},
					},
				},
				[]string{
					`only "gadget" and "gadget-alternative-location" images can be provided`,
				},
			},
			{
				hub.InspektorGadget,
				&hub.PackageMetadata{
					Version:     "1.0.0",
					Name:        "pkg1",
					DisplayName: "Package 1",
					CreatedAt:   "2006-01-02T15:04:05Z",
					Description: "description",
					ContainersImages: []*hub.ContainerImage{
						{
							Name:  "gadget",
							Image: "registry.io/namespace/gadget:tag",
						},
						{
							Name:  "gadget-alternative-location",
							Image: "registry2.io/namespace/gadget:tag",
						},
						{
							Name:  "something",
							Image: "registry.io/namespace/something:tag",
						},
					},
				},
				[]string{
					`only "gadget" and "gadget-alternative-location" images can be provided`,
				},
			},
		}
		for i, tc := range testCases {
			tc := tc
			t.Run(strconv.Itoa(i), func(t *testing.T) {
				t.Parallel()
				err := ValidatePackageMetadata(tc.kind, tc.md)
				assert.True(t, errors.Is(err, ErrInvalidMetadata))
				for _, expectedErr := range tc.expectedErrors {
					assert.Contains(t, err.Error(), expectedErr)
				}
			})
		}
	})

	t.Run("valid metadata", func(t *testing.T) {
		testCases := []struct {
			kind hub.RepositoryKind
			md   *hub.PackageMetadata
		}{
			{
				hub.Keptn,
				&hub.PackageMetadata{
					Version:     "1.0.0",
					Name:        "pkg1",
					DisplayName: "Package 1",
					CreatedAt:   "2006-01-02T15:04:05Z",
					Description: "Package description",
					Category:    "security",
					Changes: []*hub.Change{
						{
							Kind:        "Added",
							Description: "feature 1",
							Links: []*hub.Link{
								{
									Name: "link1",
									URL:  "https://link1.url",
								},
							},
						},
					},
				},
			},
			{
				hub.Kubewarden,
				&hub.PackageMetadata{
					Version:     "1.0.0",
					Name:        "pkg1",
					DisplayName: "Package 1",
					CreatedAt:   "2006-01-02T15:04:05Z",
					Description: "description",
					Category:    "security",
					ContainersImages: []*hub.ContainerImage{
						{
							Name:  "policy",
							Image: "registry.io/namespace/policy:tag",
						},
					},
				},
			},
			{
				hub.Kubewarden,
				&hub.PackageMetadata{
					Version:     "1.0.0",
					Name:        "pkg1",
					DisplayName: "Package 1",
					CreatedAt:   "2006-01-02T15:04:05Z",
					Description: "description",
					Category:    "security",
					ContainersImages: []*hub.ContainerImage{
						{
							Name:  "policy",
							Image: "registry.io/namespace/policy:tag",
						},
						{
							Name:  "policy-alternative-location",
							Image: "registry2.io/namespace/policy:tag",
						},
					},
				},
			},
			{
				hub.Kubewarden,
				&hub.PackageMetadata{
					Version:     "1.0.0",
					Name:        "pkg1",
					DisplayName: "Package 1",
					CreatedAt:   "2006-01-02T15:04:05Z",
					Description: "description",
					Category:    "security",
					ContainersImages: []*hub.ContainerImage{
						{
							Name:  "policy-alternative-location",
							Image: "registry2.io/namespace/policy:tag",
						},
						{
							Name:  "policy",
							Image: "registry.io/namespace/policy:tag",
						},
					},
				},
			},
			{
				hub.InspektorGadget,
				&hub.PackageMetadata{
					Version:     "1.0.0",
					Name:        "pkg1",
					DisplayName: "Package 1",
					CreatedAt:   "2006-01-02T15:04:05Z",
					Description: "description",
					Category:    "security",
					ContainersImages: []*hub.ContainerImage{
						{
							Name:  "gadget",
							Image: "registry.io/namespace/gadget:tag",
						},
					},
				},
			},
			{
				hub.InspektorGadget,
				&hub.PackageMetadata{
					Version:     "1.0.0",
					Name:        "pkg1",
					DisplayName: "Package 1",
					CreatedAt:   "2006-01-02T15:04:05Z",
					Description: "description",
					Category:    "security",
					ContainersImages: []*hub.ContainerImage{
						{
							Name:  "gadget",
							Image: "registry.io/namespace/gadget:tag",
						},
						{
							Name:  "gadget-alternative-location",
							Image: "registry2.io/namespace/gadget:tag",
						},
					},
				},
			},
			{
				hub.InspektorGadget,
				&hub.PackageMetadata{
					Version:     "1.0.0",
					Name:        "pkg1",
					DisplayName: "Package 1",
					CreatedAt:   "2006-01-02T15:04:05Z",
					Description: "description",
					Category:    "security",
					ContainersImages: []*hub.ContainerImage{
						{
							Name:  "gadget-alternative-location",
							Image: "registry2.io/namespace/gadget:tag",
						},
						{
							Name:  "gadget",
							Image: "registry.io/namespace/gadget:tag",
						},
					},
				},
			},
		}
		for i, tc := range testCases {
			tc := tc
			t.Run(strconv.Itoa(i), func(t *testing.T) {
				t.Parallel()
				err := ValidatePackageMetadata(tc.kind, tc.md)
				assert.Nil(t, err)
			})
		}
	})
}
