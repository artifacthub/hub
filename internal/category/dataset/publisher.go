package dataset

import (
	"bytes"
	"cmp"
	"encoding/json"
	"fmt"
	"io"
	"slices"
	"strings"
	"unicode/utf8"

	"github.com/artifacthub/hub/internal/category/model"
)

// PublisherRow represents a package whose category was set by its publisher.
// Publisher rows are exported from the database with the
// get_category_training_data function.
type PublisherRow struct {
	RepositoryKind int      `json:"repository_kind"`
	RepositoryName string   `json:"repository_name"`
	Name           string   `json:"name"`
	Keywords       []string `json:"keywords"`
	Description    string   `json:"description"`
	Category       int      `json:"category"`
}

// Validate checks that the publisher row is valid. Categories that are not in
// the catalog are valid: they are skipped when the training set is built.
func (r *PublisherRow) Validate() error {
	invalid := func(format string, a ...any) error {
		return fmt.Errorf("%w: %s", ErrInvalidRow, fmt.Sprintf(format, a...))
	}
	if r.RepositoryName == "" {
		return invalid("repository name not provided")
	}
	if r.Name == "" {
		return invalid("name not provided")
	}
	if !utf8.ValidString(r.Description) {
		return invalid("description is not valid utf-8")
	}
	if utf8.RuneCountInString(r.Description) > model.MaxDescriptionLength {
		return invalid("description longer than %d characters", model.MaxDescriptionLength)
	}
	if r.Category < 1 {
		return invalid("invalid category %d", r.Category)
	}
	return nil
}

// ReadPublisherRows reads publisher rows in JSONL format (one row per line).
// Unknown fields and duplicate keys are not allowed, every row must be valid
// and packages (repository name and name) must be unique.
// Errors include the number of the line that caused them.
func ReadPublisherRows(r io.Reader) ([]PublisherRow, error) {
	var rows []PublisherRow
	packages := make(map[[2]string]int)
	err := readLines(r, "publisher rows", func(line int, data []byte) error {
		var row PublisherRow
		if err := decodeStrict(data, &row); err != nil {
			return fmt.Errorf("line %d: %w: %w", line, ErrInvalidRow, err)
		}
		if err := row.Validate(); err != nil {
			return fmt.Errorf("line %d: %w", line, err)
		}
		pkg := [2]string{row.RepositoryName, row.Name}
		if prev, ok := packages[pkg]; ok {
			return fmt.Errorf("line %d: %w: duplicate package %s/%s (first seen on line %d)",
				line, ErrInvalidRow, row.RepositoryName, row.Name, prev)
		}
		packages[pkg] = line
		rows = append(rows, row)
		return nil
	})
	if err != nil {
		return nil, err
	}
	return rows, nil
}

// CanonicalPublisherRows returns the canonical form of the publisher rows
// provided: rows sorted by repository name and name, each encoded with
// json.Marshal on its own line. All rows must be valid and packages must be
// unique.
func CanonicalPublisherRows(rows []PublisherRow) ([]byte, error) {
	sorted := slices.Clone(rows)
	slices.SortFunc(sorted, func(a, b PublisherRow) int {
		return cmp.Or(
			strings.Compare(a.RepositoryName, b.RepositoryName),
			strings.Compare(a.Name, b.Name),
		)
	})

	var buf bytes.Buffer
	for i := range sorted {
		r := &sorted[i]
		if err := r.Validate(); err != nil {
			return nil, fmt.Errorf("publisher row %s/%s: %w", r.RepositoryName, r.Name, err)
		}
		if i > 0 && sorted[i-1].RepositoryName == r.RepositoryName && sorted[i-1].Name == r.Name {
			return nil, fmt.Errorf("%w: duplicate package %s/%s", ErrInvalidRow, r.RepositoryName, r.Name)
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

// PackPublisherRows writes the canonical form of the publisher rows provided
// to the writer compressed with gzip, returning its digest. The output is
// deterministic, as the one of Pack.
func PackPublisherRows(w io.Writer, rows []PublisherRow) (string, error) {
	data, err := CanonicalPublisherRows(rows)
	if err != nil {
		return "", err
	}
	if err := pack(w, data); err != nil {
		return "", err
	}
	return digest(data), nil
}

// ReadPackedPublisherRows reads publisher rows packed with PackPublisherRows,
// returning the rows and their digest. An error wrapping ErrNotCanonical is
// returned when the content is not in canonical form.
func ReadPackedPublisherRows(r io.Reader) ([]PublisherRow, string, error) {
	data, err := unpack(r)
	if err != nil {
		return nil, "", fmt.Errorf("error reading packed publisher rows: %w", err)
	}
	rows, err := ReadPublisherRows(bytes.NewReader(data))
	if err != nil {
		return nil, "", err
	}
	canonical, err := CanonicalPublisherRows(rows)
	if err != nil {
		return nil, "", err
	}
	if !bytes.Equal(data, canonical) {
		return nil, "", ErrNotCanonical
	}
	return rows, digest(data), nil
}
