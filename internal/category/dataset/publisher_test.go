package dataset

import (
	"bytes"
	"compress/gzip"
	"encoding/json"
	"strings"
	"testing"

	"github.com/artifacthub/hub/internal/category/model"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// marshalPublisherLines returns the JSONL encoding of the publisher rows
// provided.
func marshalPublisherLines(t *testing.T, rows ...PublisherRow) string {
	t.Helper()
	var b strings.Builder
	for _, r := range rows {
		data, err := json.Marshal(r)
		require.NoError(t, err)
		b.Write(data)
		b.WriteByte('\n')
	}
	return b.String()
}

func TestPublisherRowValidate(t *testing.T) {
	t.Parallel()

	t.Run("valid rows", func(t *testing.T) {
		t.Parallel()

		r := publisherRow("bitnami", "redis", []string{"database"}, "In-memory data store", 2)
		assert.NoError(t, r.Validate())
		r = publisherRow("bitnami", "app", nil, strings.Repeat("ñ", model.MaxDescriptionLength), 99)
		assert.NoError(t, r.Validate())
	})

	t.Run("invalid rows", func(t *testing.T) {
		t.Parallel()

		testCases := []struct {
			desc        string
			mutate      func(r *PublisherRow)
			expectedErr string
		}{
			{"missing repository name", func(r *PublisherRow) { r.RepositoryName = "" }, "repository name not provided"},
			{"missing name", func(r *PublisherRow) { r.Name = "" }, "name not provided"},
			{"description too long", func(r *PublisherRow) {
				r.Description = strings.Repeat("a", model.MaxDescriptionLength+1)
			}, "description longer than 1000 characters"},
			{"invalid utf-8 description", func(r *PublisherRow) { r.Description = "\xff" }, "not valid utf-8"},
			{"missing category", func(r *PublisherRow) { r.Category = 0 }, "invalid category 0"},
			{"negative category", func(r *PublisherRow) { r.Category = -1 }, "invalid category -1"},
		}
		for _, tc := range testCases {
			t.Run(tc.desc, func(t *testing.T) {
				t.Parallel()
				r := publisherRow("bitnami", "redis", []string{"database"}, "In-memory data store", 2)
				tc.mutate(&r)
				err := r.Validate()
				assert.ErrorIs(t, err, ErrInvalidRow)
				assert.ErrorContains(t, err, tc.expectedErr)
			})
		}
	})
}

func TestReadPublisherRows(t *testing.T) {
	t.Parallel()

	r1 := publisherRow("bitnami", "redis", []string{"database"}, "In-memory data store", 2)
	r2 := publisherRow("bitnami", "nginx", nil, "Web server", 5)
	r3 := publisherRow("other", "redis", nil, "", 99)

	t.Run("valid publisher rows", func(t *testing.T) {
		t.Parallel()

		testCases := []struct {
			desc string
			data string
		}{
			{"trailing newline", marshalPublisherLines(t, r1, r2, r3)},
			{"no trailing newline", strings.TrimSuffix(marshalPublisherLines(t, r1, r2, r3), "\n")},
			{"crlf line endings", strings.ReplaceAll(marshalPublisherLines(t, r1, r2, r3), "\n", "\r\n")},
		}
		for _, tc := range testCases {
			t.Run(tc.desc, func(t *testing.T) {
				t.Parallel()
				rows, err := ReadPublisherRows(strings.NewReader(tc.data))
				require.NoError(t, err)
				assert.Equal(t, []PublisherRow{r1, r2, r3}, rows)
			})
		}
	})

	t.Run("database export format", func(t *testing.T) {
		t.Parallel()

		// Null fields are omitted by get_category_training_data
		data := `{"repository_kind":0,"repository_name":"repo1","name":"package7","category":7}` + "\n" +
			`{"repository_kind":3,"repository_name":"repo2","name":"package1","description":"desc","keywords":["kw1","kw2"],"category":2}` + "\n"
		rows, err := ReadPublisherRows(strings.NewReader(data))
		require.NoError(t, err)
		assert.Equal(t, []PublisherRow{
			{RepositoryKind: 0, RepositoryName: "repo1", Name: "package7", Category: 7},
			{RepositoryKind: 3, RepositoryName: "repo2", Name: "package1", Keywords: []string{"kw1", "kw2"}, Description: "desc", Category: 2},
		}, rows)
	})

	t.Run("empty publisher rows", func(t *testing.T) {
		t.Parallel()

		rows, err := ReadPublisherRows(strings.NewReader(""))
		require.NoError(t, err)
		assert.Empty(t, rows)
	})

	t.Run("invalid publisher rows", func(t *testing.T) {
		t.Parallel()

		valid := marshalPublisherLines(t, r1, r2)
		r1Line := strings.TrimSuffix(marshalPublisherLines(t, r1), "\n")
		invalidRow := r3
		invalidRow.Name = ""

		testCases := []struct {
			desc        string
			data        string
			expectedErr string
		}{
			{"malformed json", valid + "{\"name\":\n", "line 3: invalid row: unexpected EOF"},
			{"unknown field", valid + strings.Replace(r1Line, "{", `{"package_id":"1",`, 1) + "\n", `line 3: invalid row: json: unknown field "package_id"`},
			{"empty line", marshalPublisherLines(t, r1) + "\n" + marshalPublisherLines(t, r2), "line 2: empty line"},
			{"trailing data", r1Line + " {}\n", "line 1: invalid row: unexpected data after row"},
			{"not an object", "[]\n", "line 1: invalid row: json: cannot unmarshal array into Go value of type dataset.PublisherRow"},
			{"invalid category type", strings.Replace(r1Line, `"category":2`, `"category":"database"`, 1), "line 1: invalid row: json: cannot unmarshal string into Go struct field PublisherRow.category of type int"},
			{"invalid row", valid + marshalPublisherLines(t, invalidRow), "line 3: invalid row: name not provided"},
			{"duplicate package", valid + marshalPublisherLines(t, r3, r1), "line 4: invalid row: duplicate package bitnami/redis (first seen on line 1)"},
			{"duplicate key", valid + strings.Replace(r1Line, "{", `{"category":5,`, 1) + "\n", `line 3: invalid row: duplicate key "category"`},
			{"line too long", strings.Repeat(" ", MaxLineSize+1), "line 1: error reading publisher rows: bufio.Scanner: token too long"},
		}
		for _, tc := range testCases {
			t.Run(tc.desc, func(t *testing.T) {
				t.Parallel()
				_, err := ReadPublisherRows(strings.NewReader(tc.data))
				assert.EqualError(t, err, tc.expectedErr)
			})
		}
	})
}

func TestCanonicalPublisherRows(t *testing.T) {
	t.Parallel()

	r1 := publisherRow("bitnami", "redis", []string{"database"}, "In-memory <data> store", 2)
	r2 := publisherRow("bitnami", "nginx", nil, "Web server", 5)
	r3 := publisherRow("other", "redis", nil, "", 99)

	t.Run("canonical form", func(t *testing.T) {
		t.Parallel()

		data, err := CanonicalPublisherRows([]PublisherRow{r3, r1, r2})
		require.NoError(t, err)

		// Rows are sorted by repository name and name, fields order and
		// encoding are part of the canonical form and missing keywords are
		// encoded as an empty list
		expected := `{"repository_kind":0,"repository_name":"bitnami","name":"nginx","keywords":[],"description":"Web server","category":5}` + "\n" +
			`{"repository_kind":0,"repository_name":"bitnami","name":"redis","keywords":["database"],"description":"In-memory ` + "\\u003cdata\\u003e" + ` store","category":2}` + "\n" +
			`{"repository_kind":0,"repository_name":"other","name":"redis","keywords":[],"description":"","category":99}` + "\n"
		assert.Equal(t, expected, string(data))

		// The input rows are not modified
		assert.Nil(t, r2.Keywords)
	})

	t.Run("no rows", func(t *testing.T) {
		t.Parallel()

		data, err := CanonicalPublisherRows(nil)
		require.NoError(t, err)
		assert.Empty(t, data)
	})

	t.Run("invalid rows", func(t *testing.T) {
		t.Parallel()

		_, err := CanonicalPublisherRows([]PublisherRow{r1, r2, r1})
		assert.ErrorIs(t, err, ErrInvalidRow)
		assert.ErrorContains(t, err, "duplicate package bitnami/redis")

		invalid := r3
		invalid.Category = 0
		_, err = CanonicalPublisherRows([]PublisherRow{r1, invalid})
		assert.ErrorIs(t, err, ErrInvalidRow)
		assert.ErrorContains(t, err, "publisher row other/redis: invalid row: invalid category 0")
	})
}

func TestPackPublisherRows(t *testing.T) {
	t.Parallel()

	r1 := publisherRow("bitnami", "redis", []string{"database"}, "In-memory data store", 2)
	r2 := publisherRow("bitnami", "nginx", nil, "Web server", 5)
	r3 := publisherRow("other", "redis", nil, "", 99)

	t.Run("pack and read packed publisher rows", func(t *testing.T) {
		t.Parallel()

		var buf1, buf2 bytes.Buffer
		digest1, err := PackPublisherRows(&buf1, []PublisherRow{r1, r2, r3})
		require.NoError(t, err)
		digest2, err := PackPublisherRows(&buf2, []PublisherRow{r3, r1, r2})
		require.NoError(t, err)

		// Packing is deterministic
		assert.Equal(t, buf1.Bytes(), buf2.Bytes())
		assert.Equal(t, digest1, digest2)
		assert.Regexp(t, `^sha256:[0-9a-f]{64}$`, digest1)

		// The gzip header is empty
		zr, err := gzip.NewReader(bytes.NewReader(buf1.Bytes()))
		require.NoError(t, err)
		assert.Empty(t, zr.Name)
		assert.Empty(t, zr.Comment)
		assert.Empty(t, zr.Extra)
		assert.True(t, zr.ModTime.IsZero())

		// Reading the packed rows returns the canonical rows and digest
		rows, digest, err := ReadPackedPublisherRows(bytes.NewReader(buf1.Bytes()))
		require.NoError(t, err)
		assert.Equal(t, digest1, digest)
		e2, e3 := r2, r3
		e2.Keywords = []string{}
		e3.Keywords = []string{}
		assert.Equal(t, []PublisherRow{e2, r1, e3}, rows)
	})

	t.Run("pack and read no publisher rows", func(t *testing.T) {
		t.Parallel()

		var buf bytes.Buffer
		digest1, err := PackPublisherRows(&buf, nil)
		require.NoError(t, err)
		assert.NotZero(t, buf.Len())

		rows, digest2, err := ReadPackedPublisherRows(bytes.NewReader(buf.Bytes()))
		require.NoError(t, err)
		assert.Empty(t, rows)
		assert.Equal(t, digest1, digest2)
	})

	t.Run("packed publisher rows not in canonical form", func(t *testing.T) {
		t.Parallel()

		canonical, err := CanonicalPublisherRows([]PublisherRow{r1, r2, r3})
		require.NoError(t, err)

		testCases := []struct {
			desc string
			data string
		}{
			{"rows not sorted", marshalPublisherLines(t, r3, r1, r2)},
			{"null keywords", marshalPublisherLines(t, r3)},
			{"missing trailing newline", strings.TrimSuffix(string(canonical), "\n")},
			{"different encoding", strings.ReplaceAll(string(canonical), `"keywords":`, `"keywords": `)},
		}
		for _, tc := range testCases {
			t.Run(tc.desc, func(t *testing.T) {
				t.Parallel()
				var buf bytes.Buffer
				zw := gzip.NewWriter(&buf)
				_, err := zw.Write([]byte(tc.data))
				require.NoError(t, err)
				require.NoError(t, zw.Close())
				_, _, err = ReadPackedPublisherRows(&buf)
				assert.ErrorIs(t, err, ErrNotCanonical)
			})
		}
	})

	t.Run("invalid packed publisher rows", func(t *testing.T) {
		t.Parallel()

		_, _, err := ReadPackedPublisherRows(strings.NewReader("not gzip"))
		assert.ErrorContains(t, err, "error reading packed publisher rows")

		var buf bytes.Buffer
		zw := gzip.NewWriter(&buf)
		_, err = zw.Write([]byte("{}\n"))
		require.NoError(t, err)
		require.NoError(t, zw.Close())
		_, _, err = ReadPackedPublisherRows(&buf)
		assert.ErrorIs(t, err, ErrInvalidRow)
	})

	t.Run("invalid rows are not packed", func(t *testing.T) {
		t.Parallel()

		var buf bytes.Buffer
		_, err := PackPublisherRows(&buf, []PublisherRow{r1, r1})
		assert.ErrorIs(t, err, ErrInvalidRow)
		assert.Zero(t, buf.Len())
	})
}
