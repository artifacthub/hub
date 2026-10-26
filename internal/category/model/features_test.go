package model

import (
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestFeatures(t *testing.T) {
	t.Parallel()

	testCases := []struct {
		desc     string
		input    Input
		expected []string
	}{
		{
			"empty input",
			Input{},
			[]string{},
		},
		{
			"keywords and their parts",
			Input{Keywords: []string{"Kubernetes-Events", "  data   store ", "a_b.c/d", "", "  "}},
			[]string{
				"kw:a", "kw:a_b.c/d", "kw:b", "kw:c", "kw:d", "kw:data", "kw:data store",
				"kw:events", "kw:kubernetes", "kw:kubernetes-events", "kw:store",
			},
		},
		{
			"name parts",
			Input{Name: "Redis-Operator_v2.x"},
			[]string{"name:operator", "name:redis", "name:v2", "name:x"},
		},
		{
			"description words",
			Input{Description: "The Redis® operator: deploys 3 replicas (v2), in-memory DB & a cache!"},
			[]string{
				"desc:cache", "desc:db", "desc:deploys", "desc:memory", "desc:operator",
				"desc:redis", "desc:replicas", "desc:v2",
			},
		},
		{
			"unicode normalization",
			Input{Name: "Ｒｅｄｉｓ", Keywords: []string{"ＤＡＴＡＢＡＳＥ"}, Description: "ﬁle Ｓｔｏｒａｇｅ"},
			[]string{"desc:file", "desc:storage", "kw:database", "name:redis"},
		},
		{
			"duplicated features",
			Input{Name: "redis", Keywords: []string{"redis", "Redis", "redis-redis"}, Description: "redis redis REDIS"},
			[]string{"desc:redis", "kw:redis", "kw:redis-redis", "name:redis"},
		},
		{
			"description cut-off",
			Input{Description: strings.Repeat("x", MaxDescriptionLength-6) + " kafka postgres"},
			[]string{"desc:kafka", "desc:" + strings.Repeat("x", MaxDescriptionLength-6)},
		},
	}
	for _, tc := range testCases {
		t.Run(tc.desc, func(t *testing.T) {
			t.Parallel()
			assert.Equal(t, tc.expected, Features(tc.input))
		})
	}
}

func TestContentKey(t *testing.T) {
	t.Parallel()

	key := ContentKey("redis", []string{"database", "cache"}, "In-memory data store")
	assert.Regexp(t, `^sha256:[0-9a-f]{64}$`, key)

	t.Run("equivalent inputs", func(t *testing.T) {
		t.Parallel()

		testCases := []struct {
			desc        string
			name        string
			keywords    []string
			description string
		}{
			{"same inputs", "redis", []string{"database", "cache"}, "In-memory data store"},
			{"case", "REDIS", []string{"Database", "CACHE"}, "in-memory DATA store"},
			{"whitespace", "  redis ", []string{" database", "cache  "}, " In-memory\n data\tstore  "},
			{"keywords order", "redis", []string{"cache", "database"}, "In-memory data store"},
			{"duplicated and empty keywords", "redis", []string{"cache", "database", "Cache", " "}, "In-memory data store"},
			{"unicode normalization", "ｒｅｄｉｓ", []string{"database", "cache"}, "In-memory data store"},
		}
		for _, tc := range testCases {
			t.Run(tc.desc, func(t *testing.T) {
				t.Parallel()
				assert.Equal(t, key, ContentKey(tc.name, tc.keywords, tc.description))
			})
		}
	})

	t.Run("different inputs", func(t *testing.T) {
		t.Parallel()

		testCases := []struct {
			desc        string
			name        string
			keywords    []string
			description string
		}{
			{"name", "redis-ha", []string{"database", "cache"}, "In-memory data store"},
			{"keywords", "redis", []string{"database"}, "In-memory data store"},
			{"keyword split differently", "redis", []string{"database cache"}, "In-memory data store"},
			{"description", "redis", []string{"database", "cache"}, "In-memory data store!"},
			{"fields swapped", "database", []string{"redis", "cache"}, "In-memory data store"},
		}
		for _, tc := range testCases {
			t.Run(tc.desc, func(t *testing.T) {
				t.Parallel()
				assert.NotEqual(t, key, ContentKey(tc.name, tc.keywords, tc.description))
			})
		}
	})

	t.Run("description beyond the cut-off is ignored", func(t *testing.T) {
		t.Parallel()

		description := strings.Repeat("ñ", MaxDescriptionLength)
		assert.Equal(t,
			ContentKey("redis", nil, description),
			ContentKey("redis", nil, description+" extra content"),
		)
		assert.Equal(t,
			ContentKey("redis", nil, description),
			ContentKey("redis", []string{}, TruncateDescription(description+"extra")),
		)
	})
}

func TestTruncateDescription(t *testing.T) {
	t.Parallel()

	testCases := []struct {
		desc        string
		description string
		expected    string
	}{
		{"empty", "", ""},
		{"short", "short description", "short description"},
		{"exact length", strings.Repeat("a", MaxDescriptionLength), strings.Repeat("a", MaxDescriptionLength)},
		{"long", strings.Repeat("a", MaxDescriptionLength+5), strings.Repeat("a", MaxDescriptionLength)},
		{"multibyte characters", strings.Repeat("ñ", MaxDescriptionLength+5), strings.Repeat("ñ", MaxDescriptionLength)},
	}
	for _, tc := range testCases {
		t.Run(tc.desc, func(t *testing.T) {
			t.Parallel()
			assert.Equal(t, tc.expected, TruncateDescription(tc.description))
		})
	}
}

func TestStopWords(t *testing.T) {
	t.Parallel()

	assert.NotEmpty(t, stopWords)
	for word := range stopWords {
		assert.Equal(t, normalizeText(word), word)
		assert.NotContains(t, word, " ")
	}
	for _, word := range []string{"the", "and", "with", "for"} {
		assert.Contains(t, stopWords, word)
	}
	assert.NotContains(t, stopWords, "#")
}
