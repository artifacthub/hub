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

// newRow returns a valid dataset row with the information provided.
func newRow(repository, name string, keywords []string, description, label string) Row {
	return Row{
		ContentKey:     model.ContentKey(name, keywords, description),
		RepositoryKind: 0,
		RepositoryName: repository,
		Name:           name,
		Duplicates:     1,
		Keywords:       keywords,
		Description:    description,
		Label:          label,
		Confidence:     ConfidenceHigh,
		Labeler: Labeler{
			Agent:            "claude",
			AgentVersion:     "2.1.310",
			Model:            "model",
			Effort:           "high",
			Auth:             "subscription",
			AuthMethod:       "oauth",
			GuidelinesDigest: "sha256:guidelines",
			LabelingDigest:   "sha256:labeling",
		},
	}
}

// marshalLines returns the JSONL encoding of the rows provided.
func marshalLines(t *testing.T, rows ...Row) string {
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

func TestRowValidate(t *testing.T) {
	t.Parallel()

	t.Run("valid rows", func(t *testing.T) {
		t.Parallel()

		r := newRow("bitnami", "redis", []string{"database"}, "In-memory data store", "database")
		assert.NoError(t, r.Validate())
		r = newRow("bitnami", "app", nil, strings.Repeat("ñ", model.MaxDescriptionLength), "none")
		r.Confidence = ConfidenceLow
		assert.NoError(t, r.Validate())
	})

	t.Run("invalid rows", func(t *testing.T) {
		t.Parallel()

		testCases := []struct {
			desc        string
			mutate      func(r *Row)
			expectedErr string
		}{
			{"missing content key", func(r *Row) { r.ContentKey = "" }, `invalid content key ""`},
			{"malformed content key", func(r *Row) { r.ContentKey = "sha256:ABC" }, "invalid content key"},
			{"content key mismatch", func(r *Row) { r.Name = "redis-ha" }, "content key doesn't match"},
			{"missing repository name", func(r *Row) { r.RepositoryName = "" }, "repository name not provided"},
			{"missing name", func(r *Row) { r.Name = "" }, "name not provided"},
			{"zero duplicates", func(r *Row) { r.Duplicates = 0 }, "duplicates must be at least 1"},
			{"description too long", func(r *Row) {
				r.Description = strings.Repeat("a", model.MaxDescriptionLength+1)
			}, "description longer than 1000 characters"},
			{"invalid utf-8 description", func(r *Row) { r.Description = "\xff" }, "not valid utf-8"},
			{"missing label", func(r *Row) { r.Label = "" }, `invalid label ""`},
			{"unknown label", func(r *Row) { r.Label = "games" }, `invalid label "games"`},
			{"skip prediction label", func(r *Row) { r.Label = "skip-prediction" }, `invalid label "skip-prediction"`},
			{"missing confidence", func(r *Row) { r.Confidence = "" }, `invalid confidence ""`},
			{"invalid confidence", func(r *Row) { r.Confidence = "certain" }, `invalid confidence "certain"`},
		}
		for _, tc := range testCases {
			t.Run(tc.desc, func(t *testing.T) {
				t.Parallel()
				r := newRow("bitnami", "redis", []string{"database"}, "In-memory data store", "database")
				tc.mutate(&r)
				err := r.Validate()
				assert.ErrorIs(t, err, ErrInvalidRow)
				assert.ErrorContains(t, err, tc.expectedErr)
			})
		}
	})
}

func TestRead(t *testing.T) {
	t.Parallel()

	r1 := newRow("bitnami", "redis", []string{"database"}, "In-memory data store", "database")
	r2 := newRow("bitnami", "nginx", nil, "Web server", "networking")
	r3 := newRow("other", "wordpress", []string{"cms"}, "Blogging platform", "web-applications")

	t.Run("valid dataset", func(t *testing.T) {
		t.Parallel()

		testCases := []struct {
			desc string
			data string
		}{
			{"trailing newline", marshalLines(t, r1, r2, r3)},
			{"no trailing newline", strings.TrimSuffix(marshalLines(t, r1, r2, r3), "\n")},
			{"crlf line endings", strings.ReplaceAll(marshalLines(t, r1, r2, r3), "\n", "\r\n")},
		}
		for _, tc := range testCases {
			t.Run(tc.desc, func(t *testing.T) {
				t.Parallel()
				rows, err := Read(strings.NewReader(tc.data))
				require.NoError(t, err)
				assert.Equal(t, []Row{r1, r2, r3}, rows)
			})
		}
	})

	t.Run("empty dataset", func(t *testing.T) {
		t.Parallel()

		rows, err := Read(strings.NewReader(""))
		require.NoError(t, err)
		assert.Empty(t, rows)
	})

	t.Run("invalid dataset", func(t *testing.T) {
		t.Parallel()

		valid := marshalLines(t, r1, r2)
		r1Line := strings.TrimSuffix(marshalLines(t, r1), "\n")
		invalidRow := r3
		invalidRow.Label = "games"

		testCases := []struct {
			desc        string
			data        string
			expectedErr string
		}{
			{"malformed json", valid + "{\"content_key\":\n", "line 3: invalid row: unexpected EOF"},
			{"unknown field", valid + strings.Replace(r1Line, "{", `{"extra":1,`, 1) + "\n", `line 3: invalid row: json: unknown field "extra"`},
			{"unknown nested field", strings.Replace(r1Line, `"labeler":{`, `"labeler":{"extra":1,`, 1), `line 1: invalid row: json: unknown field "extra"`},
			{"empty line", marshalLines(t, r1) + "\n" + marshalLines(t, r2), "line 2: empty line"},
			{"whitespace line", marshalLines(t, r1) + "  \n", "line 2: empty line"},
			{"trailing data", r1Line + " {}\n", "line 1: invalid row: unexpected data after row"},
			{"not an object", "[]\n", "line 1: invalid row: json: cannot unmarshal array into Go value of type dataset.Row"},
			{"invalid row", valid + marshalLines(t, invalidRow), `line 3: invalid row: invalid label "games"`},
			{"duplicate content key", valid + marshalLines(t, r3, r1), "line 4: invalid row: duplicate content key " + r1.ContentKey + " (first seen on line 1)"},
			{"duplicate key", valid + strings.Replace(r1Line, "{", `{"suspicious":false,`, 1) + "\n", `line 3: invalid row: duplicate key "suspicious"`},
			{"case-variant key", valid + strings.Replace(r1Line, "{", `{"Label":"none",`, 1) + "\n", `line 3: invalid row: duplicate key "label"`},
			{"line too long", strings.Repeat(" ", MaxLineSize+1), "line 1: error reading dataset: bufio.Scanner: token too long"},
		}
		for _, tc := range testCases {
			t.Run(tc.desc, func(t *testing.T) {
				t.Parallel()
				_, err := Read(strings.NewReader(tc.data))
				assert.EqualError(t, err, tc.expectedErr)
			})
		}
	})
}

func TestCheckDuplicateKeys(t *testing.T) {
	t.Parallel()

	testCases := []struct {
		desc        string
		data        string
		expectedErr string
	}{
		{"no duplicates", `{"a":1,"b":{"a":2},"c":[{"a":3},{"a":4}]}`, ""},
		{"duplicate key", `{"a":1,"b":2,"a":3}`, `duplicate key "a"`},
		{"case-variant key", `{"label":"x","LABEL":"y"}`, `duplicate key "LABEL"`},
		{"unicode case folding", `{"k":1,"\u212a":2}`, "duplicate key \"\u212a\""},
		{"duplicate nested key", `{"a":{"b":1,"b":2}}`, `duplicate key "b"`},
		{"duplicate key in array", `[{"a":1},{"a":1,"a":2}]`, `duplicate key "a"`},
		{"syntax errors are ignored", `{"a":1,`, ""},
	}
	for _, tc := range testCases {
		t.Run(tc.desc, func(t *testing.T) {
			t.Parallel()
			err := CheckDuplicateKeys([]byte(tc.data))
			if tc.expectedErr == "" {
				assert.NoError(t, err)
			} else {
				assert.ErrorIs(t, err, ErrDuplicateKey)
				assert.EqualError(t, err, tc.expectedErr)
			}
		})
	}
}

func TestCanonical(t *testing.T) {
	t.Parallel()

	r1 := newRow("bitnami", "redis", []string{"database"}, "In-memory <data> store", "database")
	r2 := newRow("bitnami", "nginx", nil, "Web server", "networking")
	r3 := newRow("other", "wordpress", []string{"cms"}, "Blogging platform", "web-applications")

	t.Run("canonical form", func(t *testing.T) {
		t.Parallel()

		data, err := Canonical([]Row{r1, r2, r3})
		require.NoError(t, err)
		lines := strings.Split(strings.TrimSuffix(string(data), "\n"), "\n")
		require.Len(t, lines, 3)

		// Rows are sorted by content key and encoded with json.Marshal
		rows, err := Read(bytes.NewReader(data))
		require.NoError(t, err)
		for i := 1; i < len(rows); i++ {
			assert.Less(t, rows[i-1].ContentKey, rows[i].ContentKey)
		}
		for i, r := range rows {
			expected, err := json.Marshal(r)
			require.NoError(t, err)
			assert.Equal(t, string(expected), lines[i])
		}

		// Fields order and encoding are part of the canonical form
		expectedR1 := `{"content_key":"` + r1.ContentKey + `","repository_kind":0,"repository_name":"bitnami",` +
			`"name":"redis","duplicates":1,"keywords":["database"],"description":"In-memory ` + "\\u003cdata\\u003e" + ` store",` +
			`"label":"database","confidence":"high","suspicious":false,"needs_review":false,` +
			`"labeler":{"agent":"claude","agent_version":"2.1.310","model":"model","effort":"high",` +
			`"auth":"subscription","auth_method":"oauth","guidelines_digest":"sha256:guidelines",` +
			`"labeling_digest":"sha256:labeling"}}`
		assert.Contains(t, lines, expectedR1)

		// Missing keywords are encoded as an empty list
		assert.Contains(t, string(data), `"name":"nginx","duplicates":1,"keywords":[]`)

		// The input rows are not modified
		assert.Nil(t, r2.Keywords)
	})

	t.Run("digest doesn't depend on the input order or empty keywords encoding", func(t *testing.T) {
		t.Parallel()

		d1, err := Digest([]Row{r1, r2, r3})
		require.NoError(t, err)
		assert.Regexp(t, `^sha256:[0-9a-f]{64}$`, d1)

		r2WithEmptyKeywords := r2
		r2WithEmptyKeywords.Keywords = []string{}
		d2, err := Digest([]Row{r3, r2WithEmptyKeywords, r1})
		require.NoError(t, err)
		assert.Equal(t, d1, d2)

		// Any change produces a different digest
		r3Relabelled := r3
		r3Relabelled.Label = "none"
		d3, err := Digest([]Row{r1, r2, r3Relabelled})
		require.NoError(t, err)
		assert.NotEqual(t, d1, d3)
	})

	t.Run("invalid rows", func(t *testing.T) {
		t.Parallel()

		_, err := Canonical([]Row{r1, r2, r1})
		assert.ErrorIs(t, err, ErrInvalidRow)
		assert.ErrorContains(t, err, "duplicate content key")

		invalid := r3
		invalid.Confidence = ""
		_, err = Canonical([]Row{r1, invalid})
		assert.ErrorIs(t, err, ErrInvalidRow)
		assert.ErrorContains(t, err, "invalid confidence")
	})
}

func TestPack(t *testing.T) {
	t.Parallel()

	r1 := newRow("bitnami", "redis", []string{"database"}, "In-memory data store", "database")
	r2 := newRow("bitnami", "nginx", nil, "Web server", "networking")
	r3 := newRow("other", "wordpress", []string{"cms"}, "Blogging platform", "web-applications")

	t.Run("pack and read packed dataset", func(t *testing.T) {
		t.Parallel()

		var buf1, buf2 bytes.Buffer
		digest1, err := Pack(&buf1, []Row{r1, r2, r3})
		require.NoError(t, err)
		digest2, err := Pack(&buf2, []Row{r3, r1, r2})
		require.NoError(t, err)

		// Packing is deterministic
		assert.Equal(t, buf1.Bytes(), buf2.Bytes())
		assert.Equal(t, digest1, digest2)
		expectedDigest, err := Digest([]Row{r1, r2, r3})
		require.NoError(t, err)
		assert.Equal(t, expectedDigest, digest1)

		// The gzip header is empty
		zr, err := gzip.NewReader(bytes.NewReader(buf1.Bytes()))
		require.NoError(t, err)
		assert.Empty(t, zr.Name)
		assert.Empty(t, zr.Comment)
		assert.Empty(t, zr.Extra)
		assert.True(t, zr.ModTime.IsZero())

		// Reading the packed dataset returns the canonical rows and digest
		rows, digest, err := ReadPacked(bytes.NewReader(buf1.Bytes()))
		require.NoError(t, err)
		assert.Equal(t, expectedDigest, digest)
		canonical, err := Canonical([]Row{r1, r2, r3})
		require.NoError(t, err)
		expectedRows, err := Read(bytes.NewReader(canonical))
		require.NoError(t, err)
		assert.Equal(t, expectedRows, rows)
	})

	t.Run("packed dataset not in canonical form", func(t *testing.T) {
		t.Parallel()

		canonical, err := Canonical([]Row{r1, r2, r3})
		require.NoError(t, err)

		testCases := []struct {
			desc string
			data string
		}{
			{"rows not sorted", marshalLines(t, r3, r1, r2)},
			{"null keywords", marshalLines(t, r2)},
			{"missing trailing newline", strings.TrimSuffix(string(canonical), "\n")},
			{"crlf line endings", strings.ReplaceAll(string(canonical), "\n", "\r\n")},
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
				_, _, err = ReadPacked(&buf)
				assert.ErrorIs(t, err, ErrNotCanonical)
			})
		}
	})

	t.Run("invalid packed dataset", func(t *testing.T) {
		t.Parallel()

		_, _, err := ReadPacked(strings.NewReader("not gzip"))
		assert.ErrorContains(t, err, "error reading packed dataset")

		var buf bytes.Buffer
		zw := gzip.NewWriter(&buf)
		_, err = zw.Write([]byte("{}\n"))
		require.NoError(t, err)
		require.NoError(t, zw.Close())
		_, _, err = ReadPacked(&buf)
		assert.ErrorIs(t, err, ErrInvalidRow)
	})

	t.Run("invalid rows are not packed", func(t *testing.T) {
		t.Parallel()

		var buf bytes.Buffer
		_, err := Pack(&buf, []Row{r1, r1})
		assert.ErrorIs(t, err, ErrInvalidRow)
		assert.Zero(t, buf.Len())
	})
}
