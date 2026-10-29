package labeler

import (
	"strings"
	"testing"

	"github.com/artifacthub/hub/internal/category/model"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestReadPackages(t *testing.T) {
	t.Parallel()

	t.Run("valid input", func(t *testing.T) {
		t.Parallel()
		input := `{"package_id":"00000000-0000-0000-0000-000000000001","repository_kind":0,"repository_name":"bitnami","name":"redis","description":"Redis","keywords":["redis","database"],"readme":"# Redis"}
{"package_id":"00000000-0000-0000-0000-000000000002","repository_kind":3,"repository_name":"krew","name":"ctx"}
`
		pkgs, err := ReadPackages(strings.NewReader(input))
		require.NoError(t, err)
		assert.Equal(t, []*Package{
			{
				PackageID:      "00000000-0000-0000-0000-000000000001",
				RepositoryKind: 0,
				RepositoryName: "bitnami",
				Name:           "redis",
				Description:    "Redis",
				Keywords:       []string{"redis", "database"},
				Readme:         "# Redis",
			},
			{
				PackageID:      "00000000-0000-0000-0000-000000000002",
				RepositoryKind: 3,
				RepositoryName: "krew",
				Name:           "ctx",
			},
		}, pkgs)
	})

	t.Run("crlf and no trailing newline", func(t *testing.T) {
		t.Parallel()
		input := "{\"repository_kind\":0,\"repository_name\":\"r\",\"name\":\"a\"}\r\n{\"repository_kind\":0,\"repository_name\":\"r\",\"name\":\"b\"}"
		pkgs, err := ReadPackages(strings.NewReader(input))
		require.NoError(t, err)
		assert.Len(t, pkgs, 2)
	})

	t.Run("empty input", func(t *testing.T) {
		t.Parallel()
		pkgs, err := ReadPackages(strings.NewReader(""))
		require.NoError(t, err)
		assert.Empty(t, pkgs)
	})

	t.Run("invalid input", func(t *testing.T) {
		t.Parallel()

		valid := `{"repository_kind":0,"repository_name":"r","name":"a"}` + "\n"
		testCases := []struct {
			desc        string
			input       string
			expectedErr string
		}{
			{
				"malformed json",
				valid + `{"repository_kind":0,` + "\n",
				"line 2: invalid package",
			},
			{
				"psql header",
				" get_packages_for_category_labelling \n" + valid,
				"line 1: invalid package",
			},
			{
				"unknown field",
				valid + `{"repository_kind":0,"repository_name":"r","name":"b","category":1}` + "\n",
				`line 2: invalid package: json: unknown field "category"`,
			},
			{
				"duplicate key",
				`{"repository_kind":0,"repository_name":"r","name":"a","name":"b"}` + "\n",
				`line 1: duplicate key "name"`,
			},
			{
				"case-variant duplicate key",
				`{"repository_kind":0,"repository_name":"r","name":"a","Name":"b"}` + "\n",
				`line 1: duplicate key "Name"`,
			},
			{
				"repository kind not provided",
				`{"repository_name":"r","name":"a"}` + "\n",
				"line 1: repository_kind not provided",
			},
			{
				"repository kind null",
				`{"repository_kind":null,"repository_name":"r","name":"a"}` + "\n",
				"line 1: repository_kind not provided",
			},
			{
				"negative repository kind",
				`{"repository_kind":-1,"repository_name":"r","name":"a"}` + "\n",
				"line 1: invalid repository_kind",
			},
			{
				"repository name not provided",
				`{"repository_kind":0,"name":"a"}` + "\n",
				"line 1: repository_name not provided",
			},
			{
				"name not provided",
				`{"repository_kind":0,"repository_name":"r"}` + "\n",
				"line 1: name not provided",
			},
			{
				"empty name",
				`{"repository_kind":0,"repository_name":"r","name":"  "}` + "\n",
				"line 1: name not provided",
			},
			{
				"invalid type",
				`{"repository_kind":"0","repository_name":"r","name":"a"}` + "\n",
				"line 1: invalid package",
			},
			{
				"invalid keywords",
				`{"repository_kind":0,"repository_name":"r","name":"a","keywords":"redis"}` + "\n",
				"line 1: invalid package",
			},
			{
				"trailing data",
				`{"repository_kind":0,"repository_name":"r","name":"a"} {}` + "\n",
				"line 1: invalid package: unexpected data",
			},
			{
				"empty line",
				valid + "\n" + valid,
				"line 2: empty line",
			},
			{
				"duplicate package",
				valid + valid,
				"line 2: duplicate package r/a (first seen on line 1)",
			},
			{
				"duplicate package id",
				`{"package_id":"x","repository_kind":0,"repository_name":"r","name":"a"}` + "\n" +
					`{"package_id":"x","repository_kind":0,"repository_name":"r","name":"b"}` + "\n",
				"line 2: duplicate package id x (first seen on line 1)",
			},
		}
		for _, tc := range testCases {
			t.Run(tc.desc, func(t *testing.T) {
				t.Parallel()
				pkgs, err := ReadPackages(strings.NewReader(tc.input))
				require.Error(t, err)
				assert.Contains(t, err.Error(), tc.expectedErr)
				assert.Nil(t, pkgs)
			})
		}
	})
}

func TestGroupPackages(t *testing.T) {
	t.Parallel()

	redis1 := &Package{RepositoryName: "zeta", Name: "redis", Keywords: []string{"Redis", "cache"}, Description: "Redis  chart"}
	redis2 := &Package{RepositoryName: "alpha", Name: "Redis", Keywords: []string{"cache", "redis"}, Description: "redis chart"}
	redis3 := &Package{RepositoryName: "omega", Name: "redis", Keywords: []string{"cache", "redis", "redis"}, Description: "Redis chart", Readme: "# Redis"}
	nginx := &Package{RepositoryName: "alpha", Name: "nginx", Description: "Web server"}

	groups := GroupPackages([]*Package{redis1, nginx, redis2, redis3})
	require.Len(t, groups, 2)
	for i := 1; i < len(groups); i++ {
		assert.Less(t, groups[i-1].ContentKey, groups[i].ContentKey)
	}
	for _, g := range groups {
		assert.Equal(t, model.ContentKey(g.Representative().Name, g.Representative().Keywords, g.Representative().Description), g.ContentKey)
		switch g.Representative().Name {
		case "nginx":
			assert.Equal(t, []*Package{nginx}, g.Packages)
		default:
			// Packages with a readme go first, then sorted by repository
			assert.Equal(t, []*Package{redis3, redis2, redis1}, g.Packages)
		}
	}
}

func TestSample(t *testing.T) {
	t.Parallel()

	pkgs := make([]*Package, 0, 6)
	for _, name := range []string{"a", "b", "c", "d", "e", "f"} {
		pkgs = append(pkgs, &Package{RepositoryName: "r", Name: name})
	}
	groups := GroupPackages(pkgs)

	// The sample doesn't depend on the order of the groups
	reversed := make([]*Group, len(groups))
	for i, g := range groups {
		reversed[len(groups)-1-i] = g
	}
	sample := Sample(groups, 3)
	assert.Equal(t, groups[:3], sample)
	assert.Equal(t, sample, Sample(reversed, 3))

	// All groups are returned when n is not positive or too large
	assert.Equal(t, groups, Sample(reversed, 0))
	assert.Equal(t, groups, Sample(reversed, 10))
}
