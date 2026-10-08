package hub

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestRepositoryMetadataIgnoresPackage(t *testing.T) {
	t.Parallel()

	testCases := []struct {
		desc           string
		md             *RepositoryMetadata
		name           string
		version        string
		expectedResult bool
	}{
		{
			"name only entry, empty version",
			&RepositoryMetadata{Ignore: []*RepositoryIgnoreEntry{{Name: "pkg1"}}},
			"pkg1",
			"",
			true,
		},
		{
			"name only entry, any version",
			&RepositoryMetadata{Ignore: []*RepositoryIgnoreEntry{{Name: "pkg1"}}},
			"pkg1",
			"1.0.0",
			true,
		},
		{
			"version entry, empty version",
			&RepositoryMetadata{Ignore: []*RepositoryIgnoreEntry{{Name: "pkg1", Version: ".*"}}},
			"pkg1",
			"",
			false,
		},
		{
			"version and name only entries, empty version",
			&RepositoryMetadata{Ignore: []*RepositoryIgnoreEntry{
				{Name: "pkg1", Version: ".*"},
				{Name: "pkg1"},
			}},
			"pkg1",
			"",
			true,
		},
		{
			"different name",
			&RepositoryMetadata{Ignore: []*RepositoryIgnoreEntry{{Name: "pkg2"}}},
			"pkg1",
			"1.0.0",
			false,
		},
		{
			"empty ignore list",
			&RepositoryMetadata{Ignore: []*RepositoryIgnoreEntry{}},
			"pkg1",
			"1.0.0",
			false,
		},
		{
			"nil metadata",
			nil,
			"pkg1",
			"1.0.0",
			false,
		},
		{
			"unanchored regex matches prerelease",
			&RepositoryMetadata{Ignore: []*RepositoryIgnoreEntry{{Name: "pkg1", Version: "beta"}}},
			"pkg1",
			"1.0.0-beta1",
			true,
		},
		{
			"unanchored regex does not match",
			&RepositoryMetadata{Ignore: []*RepositoryIgnoreEntry{{Name: "pkg1", Version: "beta"}}},
			"pkg1",
			"1.0.0",
			false,
		},
		{
			"same version",
			&RepositoryMetadata{Ignore: []*RepositoryIgnoreEntry{{Name: "pkg1", Version: "1.0.0"}}},
			"pkg1",
			"1.0.0",
			true,
		},
		{
			"different version",
			&RepositoryMetadata{Ignore: []*RepositoryIgnoreEntry{{Name: "pkg1", Version: "1.0.0"}}},
			"pkg1",
			"1.0.1",
			false,
		},
		{
			"only second entry matches",
			&RepositoryMetadata{Ignore: []*RepositoryIgnoreEntry{
				{Name: "pkg1", Version: "^2\\.0\\.0$"},
				{Name: "pkg1", Version: "^1\\.0\\.0$"},
			}},
			"pkg1",
			"1.0.0",
			true,
		},
		{
			"anchored regex matches",
			&RepositoryMetadata{Ignore: []*RepositoryIgnoreEntry{{Name: "pkg1", Version: "^(1\\.0\\.0|1\\.0\\.1)$"}}},
			"pkg1",
			"1.0.1",
			true,
		},
		{
			"anchored regex does not match a longer version",
			&RepositoryMetadata{Ignore: []*RepositoryIgnoreEntry{{Name: "pkg1", Version: "^1\\.0\\.0$"}}},
			"pkg1",
			"11.0.0",
			false,
		},
		{
			"invalid regex",
			&RepositoryMetadata{Ignore: []*RepositoryIgnoreEntry{{Name: "pkg1", Version: "["}}},
			"pkg1",
			"1.0.0",
			false,
		},
		{
			"nil entry",
			&RepositoryMetadata{Ignore: []*RepositoryIgnoreEntry{nil}},
			"pkg1",
			"1.0.0",
			false,
		},
	}
	for _, tc := range testCases {
		t.Run(tc.desc, func(t *testing.T) {
			t.Parallel()

			result := tc.md.IgnoresPackage(tc.name, tc.version)
			assert.Equal(t, tc.expectedResult, result)
		})
	}
}
