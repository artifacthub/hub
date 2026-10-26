// Package dataset provides the category labelling dataset: the rows type,
// strict JSONL reading, the canonical form and its digest, deterministic
// gzip packing and the training set builder.
//
// This package doesn't access the database and must not import internal/hub.
package dataset

import (
	"bufio"
	"bytes"
	"compress/gzip"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"regexp"
	"slices"
	"strings"
	"unicode"
	"unicode/utf8"

	"github.com/artifacthub/hub/internal/category/catalog"
	"github.com/artifacthub/hub/internal/category/model"
)

// Labels confidence levels.
const (
	// ConfidenceHigh represents a high confidence label.
	ConfidenceHigh = "high"

	// ConfidenceMedium represents a medium confidence label.
	ConfidenceMedium = "medium"

	// ConfidenceLow represents a low confidence label.
	ConfidenceLow = "low"
)

const (
	// MaxLineSize represents the maximum size of a dataset line, including
	// its trailing newline.
	MaxLineSize = 1 << 20

	// packCompressionLevel represents the compression level used to pack
	// datasets. It must not change, so that packing remains deterministic.
	packCompressionLevel = gzip.BestCompression
)

var (
	// ErrDuplicateKey indicates that a JSON object contains a duplicate key.
	ErrDuplicateKey = errors.New("duplicate key")

	// ErrInvalidRow indicates that a dataset row is not valid.
	ErrInvalidRow = errors.New("invalid row")

	// ErrNotCanonical indicates that a packed dataset is not in canonical
	// form (it was not produced by Pack).
	ErrNotCanonical = errors.New("dataset not in canonical form")

	// digestRE is the regular expression used to validate content keys.
	digestRE = regexp.MustCompile(`^sha256:[0-9a-f]{64}$`)
)

// Row represents a dataset row: a package and the category label assigned
// to it by an LLM.
type Row struct {
	// ContentKey represents the content key of the package's model inputs
	// (see model.ContentKey). It's unique within a dataset.
	ContentKey string `json:"content_key"`

	// RepositoryKind represents the kind of the representative package's
	// repository.
	RepositoryKind int `json:"repository_kind"`

	// RepositoryName represents the name of the representative package's
	// repository.
	RepositoryName string `json:"repository_name"`

	// Name represents the name of the package.
	Name string `json:"name"`

	// Duplicates represents the number of packages with this content key.
	Duplicates int `json:"duplicates"`

	// Keywords represents the keywords of the package.
	Keywords []string `json:"keywords"`

	// Description represents the description of the package, truncated to
	// model.MaxDescriptionLength characters.
	Description string `json:"description"`

	// Label represents the label assigned: a catalog category name or none.
	Label string `json:"label"`

	// Confidence represents the confidence of the label (high, medium or
	// low).
	Confidence string `json:"confidence"`

	// Suspicious indicates whether the package was flagged as suspicious
	// (for example, because it looks like a prompt injection attempt).
	Suspicious bool `json:"suspicious"`

	// NeedsReview indicates whether the label must be reviewed.
	NeedsReview bool `json:"needs_review"`

	// Labeler represents information about how the label was obtained.
	Labeler Labeler `json:"labeler"`
}

// Labeler represents information about how a label was obtained.
type Labeler struct {
	Agent            string `json:"agent"`
	AgentVersion     string `json:"agent_version"`
	Model            string `json:"model"`
	Effort           string `json:"effort"`
	Auth             string `json:"auth"`
	AuthMethod       string `json:"auth_method"`
	GuidelinesDigest string `json:"guidelines_digest"`
	LabelingDigest   string `json:"labeling_digest"`
}

// Validate checks that the row is valid.
func (r *Row) Validate() error {
	invalid := func(format string, a ...any) error {
		return fmt.Errorf("%w: %s", ErrInvalidRow, fmt.Sprintf(format, a...))
	}
	if !digestRE.MatchString(r.ContentKey) {
		return invalid("invalid content key %q", r.ContentKey)
	}
	if r.RepositoryName == "" {
		return invalid("repository name not provided")
	}
	if r.Name == "" {
		return invalid("name not provided")
	}
	if r.Duplicates < 1 {
		return invalid("duplicates must be at least 1")
	}
	if !utf8.ValidString(r.Description) {
		return invalid("description is not valid utf-8")
	}
	if utf8.RuneCountInString(r.Description) > model.MaxDescriptionLength {
		return invalid("description longer than %d characters", model.MaxDescriptionLength)
	}
	if _, ok := catalog.ByName(r.Label); !ok && r.Label != catalog.None {
		return invalid("invalid label %q", r.Label)
	}
	switch r.Confidence {
	case ConfidenceHigh, ConfidenceMedium, ConfidenceLow:
	default:
		return invalid("invalid confidence %q", r.Confidence)
	}
	if key := model.ContentKey(r.Name, r.Keywords, r.Description); r.ContentKey != key {
		return invalid("content key doesn't match the row's name, keywords and description (expected %s)", key)
	}
	return nil
}

// Read reads a dataset in JSONL format (one row per line). Unknown fields
// and duplicate keys are not allowed, every row must be valid and content
// keys must be unique.
// Errors include the number of the line that caused them.
func Read(r io.Reader) ([]Row, error) {
	var rows []Row
	keys := make(map[string]int)
	err := readLines(r, "dataset", func(line int, data []byte) error {
		var row Row
		if err := decodeStrict(data, &row); err != nil {
			return fmt.Errorf("line %d: %w: %w", line, ErrInvalidRow, err)
		}
		if err := row.Validate(); err != nil {
			return fmt.Errorf("line %d: %w", line, err)
		}
		if prev, ok := keys[row.ContentKey]; ok {
			return fmt.Errorf("line %d: %w: duplicate content key %s (first seen on line %d)",
				line, ErrInvalidRow, row.ContentKey, prev)
		}
		keys[row.ContentKey] = line
		rows = append(rows, row)
		return nil
	})
	if err != nil {
		return nil, err
	}
	return rows, nil
}

// Canonical returns the canonical form of the dataset rows provided: rows
// sorted by content key, each encoded with json.Marshal on its own line. All
// rows must be valid and content keys must be unique.
func Canonical(rows []Row) ([]byte, error) {
	sorted := make([]Row, len(rows))
	copy(sorted, rows)
	slices.SortFunc(sorted, func(a, b Row) int { return strings.Compare(a.ContentKey, b.ContentKey) })

	var buf bytes.Buffer
	for i := range sorted {
		r := &sorted[i]
		if err := r.Validate(); err != nil {
			return nil, fmt.Errorf("row %s: %w", r.ContentKey, err)
		}
		if i > 0 && sorted[i-1].ContentKey == r.ContentKey {
			return nil, fmt.Errorf("%w: duplicate content key %s", ErrInvalidRow, r.ContentKey)
		}
		if r.Keywords == nil {
			r.Keywords = []string{}
		}
		data, err := json.Marshal(r)
		if err != nil {
			return nil, err
		}
		buf.Write(data)
		buf.WriteByte('\n')
	}
	return buf.Bytes(), nil
}

// Digest returns the digest of the canonical form of the dataset rows
// provided.
func Digest(rows []Row) (string, error) {
	data, err := Canonical(rows)
	if err != nil {
		return "", err
	}
	return digest(data), nil
}

// Pack writes the canonical form of the dataset rows provided to the writer
// compressed with gzip, returning its digest. The output is deterministic:
// the gzip header is left empty (no name or modification time) and the
// compression level is fixed.
func Pack(w io.Writer, rows []Row) (string, error) {
	data, err := Canonical(rows)
	if err != nil {
		return "", err
	}
	if err := pack(w, data); err != nil {
		return "", err
	}
	return digest(data), nil
}

// ReadPacked reads a dataset packed with Pack, returning its rows and its
// digest. An error wrapping ErrNotCanonical is returned when the content is
// not in canonical form.
func ReadPacked(r io.Reader) ([]Row, string, error) {
	data, err := unpack(r)
	if err != nil {
		return nil, "", fmt.Errorf("error reading packed dataset: %w", err)
	}
	rows, err := Read(bytes.NewReader(data))
	if err != nil {
		return nil, "", err
	}
	canonical, err := Canonical(rows)
	if err != nil {
		return nil, "", err
	}
	if !bytes.Equal(data, canonical) {
		return nil, "", ErrNotCanonical
	}
	return rows, digest(data), nil
}

// readLines calls fn with each line of the JSONL data provided and its
// number, stopping at the first error. Empty lines are not allowed. The name
// provided identifies the data in the read errors.
func readLines(r io.Reader, name string, fn func(line int, data []byte) error) error {
	scanner := bufio.NewScanner(r)
	scanner.Buffer(make([]byte, 0, 64*1024), MaxLineSize)
	line := 0
	for scanner.Scan() {
		line++
		data := scanner.Bytes()
		if len(bytes.TrimSpace(data)) == 0 {
			return fmt.Errorf("line %d: empty line", line)
		}
		if err := fn(line, data); err != nil {
			return err
		}
	}
	if err := scanner.Err(); err != nil {
		return fmt.Errorf("line %d: error reading %s: %w", line+1, name, err)
	}
	return nil
}

// pack writes the data provided to the writer compressed with gzip. The
// output is deterministic: the gzip header is left empty (no name or
// modification time) and the compression level is fixed.
func pack(w io.Writer, data []byte) error {
	zw, err := gzip.NewWriterLevel(w, packCompressionLevel)
	if err != nil {
		return err
	}
	if _, err := zw.Write(data); err != nil {
		return err
	}
	return zw.Close()
}

// unpack reads the data compressed with pack.
func unpack(r io.Reader) ([]byte, error) {
	zr, err := gzip.NewReader(r)
	if err != nil {
		return nil, err
	}
	defer zr.Close()
	return io.ReadAll(zr)
}

// decodeStrict decodes the JSON value in data into v. Unknown fields,
// duplicate keys and trailing data are not allowed.
func decodeStrict(data []byte, v any) error {
	if err := CheckDuplicateKeys(data); err != nil {
		return err
	}
	dec := json.NewDecoder(bytes.NewReader(data))
	dec.DisallowUnknownFields()
	if err := dec.Decode(v); err != nil {
		return err
	}
	if _, err := dec.Token(); !errors.Is(err, io.EOF) {
		return errors.New("unexpected data after row")
	}
	return nil
}

// CheckDuplicateKeys checks that the JSON objects in the data provided don't
// contain duplicate keys (encoding/json silently keeps the last one). Keys
// are compared case-insensitively, as encoding/json matches them to fields
// that way. Syntax errors are ignored here, they are reported when the data
// is decoded.
func CheckDuplicateKeys(data []byte) error {
	dec := json.NewDecoder(bytes.NewReader(data))
	var walk func() error
	walk = func() error {
		t, err := dec.Token()
		if err != nil {
			return err
		}
		switch t {
		case json.Delim('{'):
			keys := make(map[string]struct{})
			for dec.More() {
				t, err := dec.Token()
				if err != nil {
					return err
				}
				key, _ := t.(string)
				folded := foldKey(key)
				if _, ok := keys[folded]; ok {
					return fmt.Errorf("%w %q", ErrDuplicateKey, key)
				}
				keys[folded] = struct{}{}
				if err := walk(); err != nil {
					return err
				}
			}
			_, err = dec.Token()
			return err
		case json.Delim('['):
			for dec.More() {
				if err := walk(); err != nil {
					return err
				}
			}
			_, err = dec.Token()
			return err
		}
		return nil
	}
	if err := walk(); errors.Is(err, ErrDuplicateKey) {
		return err
	}
	return nil
}

// foldKey returns the key provided with each rune replaced by the smallest
// rune of its case folding orbit, so that two keys that encoding/json
// considers equal (as strings.EqualFold does) have the same folded key.
func foldKey(key string) string {
	var b strings.Builder
	b.Grow(len(key))
	for _, r := range key {
		folded := r
		for f := unicode.SimpleFold(r); f != r; f = unicode.SimpleFold(f) {
			folded = min(folded, f)
		}
		b.WriteRune(folded)
	}
	return b.String()
}

// digest returns the sha256 digest of the data provided, in the
// "sha256:<hex>" format.
func digest(data []byte) string {
	sum := sha256.Sum256(data)
	return "sha256:" + hex.EncodeToString(sum[:])
}
