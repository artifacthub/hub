package catalog

import (
	"bytes"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gopkg.in/yaml.v3"
)

const (
	// migrationsPath represents the path to the database schema migrations.
	migrationsPath = "../../../database/migrations/schema"

	// openAPIPath represents the path to the OpenAPI specification.
	openAPIPath = "../../../docs/api/openapi.yaml"
)

func TestParse(t *testing.T) {
	t.Parallel()

	t.Run("invalid input", func(t *testing.T) {
		t.Parallel()

		testCases := []struct {
			desc        string
			data        string
			expectedErr string
		}{
			{
				"empty file",
				"",
				"no categories found",
			},
			{
				"empty list",
				"[]",
				"no categories found",
			},
			{
				"invalid yaml",
				"- id: 1\n  name: [",
				"error decoding categories",
			},
			{
				"unknown field",
				"- id: 1\n  name: a\n  display_name: A\n  description: A\n  extra: x\n",
				"field extra not found",
			},
			{
				"multiple documents",
				"- id: 1\n  name: a\n  display_name: A\n  description: A\n---\n- id: 2\n",
				"single document",
			},
			{
				"id not provided",
				"- name: a\n  display_name: A\n  description: A\n",
				"id must be positive",
			},
			{
				"negative id",
				"- id: -1\n  name: a\n  display_name: A\n  description: A\n",
				"id must be positive",
			},
			{
				"duplicate id",
				"- id: 1\n  name: a\n  display_name: A\n  description: A\n- id: 1\n  name: b\n  display_name: B\n  description: B\n",
				"duplicate id 1",
			},
			{
				"name not provided",
				"- id: 1\n  display_name: A\n  description: A\n",
				"must be kebab-case",
			},
			{
				"name with uppercase letters",
				"- id: 1\n  name: Database\n  display_name: A\n  description: A\n",
				"must be kebab-case",
			},
			{
				"name with underscores",
				"- id: 1\n  name: data_processing\n  display_name: A\n  description: A\n",
				"must be kebab-case",
			},
			{
				"name with trailing dash",
				"- id: 1\n  name: data-\n  display_name: A\n  description: A\n",
				"must be kebab-case",
			},
			{
				"reserved name skip-prediction",
				"- id: 1\n  name: skip-prediction\n  display_name: A\n  description: A\n",
				`name "skip-prediction" is reserved`,
			},
			{
				"reserved name none",
				"- id: 1\n  name: none\n  display_name: A\n  description: A\n",
				`name "none" is reserved`,
			},
			{
				"duplicate name",
				"- id: 1\n  name: a\n  display_name: A\n  description: A\n- id: 2\n  name: a\n  display_name: B\n  description: B\n",
				`duplicate name "a"`,
			},
			{
				"display name not provided",
				"- id: 1\n  name: a\n  display_name: ' '\n  description: A\n",
				"display name not provided",
			},
			{
				"description not provided",
				"- id: 1\n  name: a\n  display_name: A\n",
				"description not provided",
			},
		}
		for _, tc := range testCases {
			t.Run(tc.desc, func(t *testing.T) {
				t.Parallel()
				cs, err := Parse([]byte(tc.data))
				assert.Nil(t, cs)
				require.Error(t, err)
				assert.Contains(t, err.Error(), tc.expectedErr)
			})
		}
	})

	t.Run("valid input, categories sorted by id", func(t *testing.T) {
		t.Parallel()

		data := `
- id: 10
  name: data-processing
  display_name: Data processing
  description: Data processing description.
- id: 2
  name: database
  display_name: Database
  description: Database description.
`
		cs, err := Parse([]byte(data))
		require.NoError(t, err)
		assert.Equal(t, []Category{
			{
				ID:          2,
				Name:        "database",
				DisplayName: "Database",
				Description: "Database description.",
			},
			{
				ID:          10,
				Name:        "data-processing",
				DisplayName: "Data processing",
				Description: "Data processing description.",
			},
		}, cs)
	})
}

func TestEmbeddedCatalog(t *testing.T) {
	t.Parallel()

	t.Run("all categories sorted by id", func(t *testing.T) {
		t.Parallel()

		cs := All()
		require.NotEmpty(t, cs)
		for i := 1; i < len(cs); i++ {
			assert.Less(t, cs[i-1].ID, cs[i].ID)
		}
		assert.Equal(t, Category{
			ID:          1,
			Name:        "ai-machine-learning",
			DisplayName: "AI / Machine learning",
			Description: "Tools to build, train, serve and operate machine learning and AI models.",
		}, cs[0])
	})

	t.Run("all returns a copy", func(t *testing.T) {
		t.Parallel()

		cs := All()
		cs[0].Name = "modified"
		assert.Equal(t, "ai-machine-learning", All()[0].Name)
	})

	t.Run("names sorted by id", func(t *testing.T) {
		t.Parallel()

		assert.Equal(t, []string{
			"ai-machine-learning",
			"database",
			"integration-delivery",
			"monitoring-logging",
			"networking",
			"security",
			"storage",
			"streaming-messaging",
			"analytics",
			"data-processing",
			"web-applications",
		}, Names())
	})
}

func TestByID(t *testing.T) {
	t.Parallel()

	testCases := []struct {
		id           int
		expectedName string
		expectedOK   bool
	}{
		{1, "ai-machine-learning", true},
		{6, "security", true},
		{11, "web-applications", true},
		{-1, "", false},
		{0, "", false},
		{1000, "", false},
	}
	for _, tc := range testCases {
		t.Run(strconv.Itoa(tc.id), func(t *testing.T) {
			t.Parallel()
			c, ok := ByID(tc.id)
			assert.Equal(t, tc.expectedOK, ok)
			assert.Equal(t, tc.expectedName, c.Name)
		})
	}
}

func TestByName(t *testing.T) {
	t.Parallel()

	testCases := []struct {
		name                string
		expectedID          int
		expectedDisplayName string
		expectedOK          bool
	}{
		{"ai-machine-learning", 1, "AI / Machine learning", true},
		{"streaming-messaging", 8, "Streaming and messaging", true},
		{"analytics", 9, "Analytics", true},
		{"data-processing", 10, "Data processing", true},
		{"web-applications", 11, "Web applications", true},
		{SkipPrediction, 0, "", false},
		{None, 0, "", false},
		{"", 0, "", false},
		{"Database", 0, "", false},
		{"unknown", 0, "", false},
	}
	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			c, ok := ByName(tc.name)
			assert.Equal(t, tc.expectedOK, ok)
			assert.Equal(t, tc.expectedID, c.ID)
			assert.Equal(t, tc.expectedDisplayName, c.DisplayName)
		})
	}
}

func TestDigests(t *testing.T) {
	t.Parallel()

	digestRE := regexp.MustCompile(`^sha256:[0-9a-f]{64}$`)
	base := []Category{
		{ID: 1, Name: "a", DisplayName: "A", Description: "A description."},
		{ID: 2, Name: "b", DisplayName: "B", Description: "B description."},
	}

	t.Run("embedded catalog digests", func(t *testing.T) {
		t.Parallel()

		assert.Regexp(t, digestRE, LabelingDigest())
		assert.Regexp(t, digestRE, ModelDigest())
		assert.Equal(t, digest(categoriesYAML), LabelingDigest())
		assert.Equal(t, computeModelDigest(All()), ModelDigest())
		assert.NotEqual(t, LabelingDigest(), ModelDigest())
	})

	t.Run("model digest is stable", func(t *testing.T) {
		t.Parallel()

		// sha256 of "1:a\n2:b\n"
		expected := "sha256:b173219e5a48cb2ef75498db207f085235147922fcad012c30bc977070a28a68"
		assert.Equal(t, expected, computeModelDigest(base))
	})

	t.Run("model digest unchanged when only descriptions or display names change", func(t *testing.T) {
		t.Parallel()

		modified := []Category{
			{ID: 1, Name: "a", DisplayName: "Other A", Description: "Fixed typo."},
			{ID: 2, Name: "b", DisplayName: "B", Description: "Another description."},
		}
		assert.Equal(t, computeModelDigest(base), computeModelDigest(modified))
	})

	t.Run("model digest changes when ids or names change", func(t *testing.T) {
		t.Parallel()

		testCases := []struct {
			desc string
			cs   []Category
		}{
			{
				"name changed",
				[]Category{{ID: 1, Name: "a"}, {ID: 2, Name: "c"}},
			},
			{
				"id changed",
				[]Category{{ID: 1, Name: "a"}, {ID: 3, Name: "b"}},
			},
			{
				"category added",
				[]Category{{ID: 1, Name: "a"}, {ID: 2, Name: "b"}, {ID: 3, Name: "c"}},
			},
			{
				"category removed",
				[]Category{{ID: 1, Name: "a"}},
			},
		}
		for _, tc := range testCases {
			t.Run(tc.desc, func(t *testing.T) {
				t.Parallel()
				assert.NotEqual(t, computeModelDigest(base), computeModelDigest(tc.cs))
			})
		}
	})

	t.Run("labeling digest covers the whole file", func(t *testing.T) {
		t.Parallel()

		data := bytes.Replace(categoriesYAML, []byte("description: "), []byte("description:  "), 1)
		cs, err := Parse(data)
		require.NoError(t, err)
		assert.Equal(t, ModelDigest(), computeModelDigest(cs))
		assert.NotEqual(t, LabelingDigest(), digest(data))
	})
}

// TestMigrationsInSync checks that the package_category rows inserted by the
// database schema migrations match the catalog.
func TestMigrationsInSync(t *testing.T) {
	t.Parallel()

	insertRE := regexp.MustCompile(`(?i)insert\s+into\s+package_category\s+values\s*\(\s*(\d+)\s*,\s*'([^']*)'\s*,\s*'([^']*)'\s*\)\s*;`)
	insertPrefixRE := regexp.MustCompile(`(?i)insert\s+into\s+package_category\b`)

	files, err := filepath.Glob(filepath.Join(migrationsPath, "*.sql"))
	require.NoError(t, err)
	require.NotEmpty(t, files)

	var rows []Category
	ids := make(map[int]string)
	for _, file := range files {
		data, err := os.ReadFile(file)
		require.NoError(t, err)

		// Only the part above the separator applies the migration
		up, _, _ := strings.Cut(string(data), "---- create above / drop below ----")

		// Make sure all inserts into package_category can be parsed
		matches := insertRE.FindAllStringSubmatch(up, -1)
		require.Len(t, matches, len(insertPrefixRE.FindAllString(up, -1)),
			"%s: unsupported package_category insert statement", file)

		for _, m := range matches {
			id, err := strconv.Atoi(m[1])
			require.NoError(t, err)
			prevFile, ok := ids[id]
			require.False(t, ok, "%s: category %d already inserted in %s", file, id, prevFile)
			ids[id] = file
			rows = append(rows, Category{ID: id, Name: m[2], DisplayName: m[3]})
		}
	}

	expected := make([]Category, 0, len(categories))
	for _, c := range All() {
		expected = append(expected, Category{ID: c.ID, Name: c.Name, DisplayName: c.DisplayName})
	}
	assert.ElementsMatch(t, expected, rows)
}

// TestOpenAPIInSync checks that the package category enums in the OpenAPI
// specification list exactly the catalog's categories.
func TestOpenAPIInSync(t *testing.T) {
	t.Parallel()

	data, err := os.ReadFile(openAPIPath)
	require.NoError(t, err)
	var spec struct {
		Components struct {
			Schemas struct {
				PackageCategoryID openAPIEnum `yaml:"PackageCategoryId"`
			} `yaml:"schemas"`
			Parameters struct {
				PackageCategoryListParam struct {
					Description string `yaml:"description"`
					Schema      struct {
						Items openAPIEnum `yaml:"items"`
					} `yaml:"schema"`
				} `yaml:"PackageCategoryListParam"`
			} `yaml:"parameters"`
		} `yaml:"components"`
	}
	require.NoError(t, yaml.Unmarshal(data, &spec))

	expectedIDs := make([]int, 0, len(categories))
	for _, c := range All() {
		expectedIDs = append(expectedIDs, c.ID)
	}

	testCases := []struct {
		name        string
		enum        []int
		description string
	}{
		{
			"PackageCategoryId",
			spec.Components.Schemas.PackageCategoryID.Enum,
			spec.Components.Schemas.PackageCategoryID.Description,
		},
		{
			"PackageCategoryListParam",
			spec.Components.Parameters.PackageCategoryListParam.Schema.Items.Enum,
			spec.Components.Parameters.PackageCategoryListParam.Description,
		},
	}
	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()

			// Enum values
			assert.ElementsMatch(t, expectedIDs, tc.enum)

			// Description entries
			entryRE := regexp.MustCompile("(?m)^\\s*\\* `(\\d+)` - (.+)$")
			entries := make(map[int]string)
			for _, m := range entryRE.FindAllStringSubmatch(tc.description, -1) {
				id, err := strconv.Atoi(m[1])
				require.NoError(t, err)
				entries[id] = strings.TrimSpace(m[2])
			}
			expectedEntries := make(map[int]string, len(categories))
			for _, c := range All() {
				expectedEntries[c.ID] = c.DisplayName
			}
			assert.Equal(t, expectedEntries, entries)
		})
	}
}

// openAPIEnum represents an OpenAPI integer enum schema.
type openAPIEnum struct {
	Enum        []int  `yaml:"enum"`
	Description string `yaml:"description"`
}
