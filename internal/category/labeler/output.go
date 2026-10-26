package labeler

import (
	"bufio"
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"slices"
	"strings"
	"text/tabwriter"

	"github.com/artifacthub/hub/internal/category/catalog"
	"github.com/artifacthub/hub/internal/category/dataset"
)

// Failure represents a package whose labels failed the reply validation,
// even after retrying and splitting its batch down to that single package.
type Failure struct {
	ContentKey     string `json:"content_key"`
	RepositoryKind int    `json:"repository_kind"`
	RepositoryName string `json:"repository_name"`
	Name           string `json:"name"`
	Error          string `json:"error"`
}

// Summary represents a summary of a labelling run.
type Summary struct {
	// Output represents the path of the output file.
	Output string

	// Failures represents the path of the failures file.
	Failures string

	// Packages represents the number of packages in the input.
	Packages int

	// ContentKeys represents the number of distinct content keys in the
	// input.
	ContentKeys int

	// Selected represents the number of content keys selected (all of them,
	// unless a sample was requested).
	Selected int

	// AlreadyLabelled represents the number of selected content keys that
	// were already in the output.
	AlreadyLabelled int

	// SkippedFailures represents the number of selected content keys skipped
	// because they were in the failures file.
	SkippedFailures int

	// Labelled represents the number of content keys labelled in this run.
	Labelled int

	// Failed represents the number of content keys that failed in this run.
	Failed int

	// Unprocessed represents the number of content keys left unprocessed.
	Unprocessed int

	// Suspicious represents the number of rows written flagged as
	// suspicious.
	Suspicious int

	// NeedsReview represents the number of rows written that need review.
	NeedsReview int

	// Labels represents the number of rows written for each label.
	Labels map[string]int
}

// Write writes the summary to the writer provided.
func (s *Summary) Write(w io.Writer) error {
	tw := tabwriter.NewWriter(w, 0, 0, 2, ' ', 0)
	fmt.Fprintf(tw, "Packages in input:\t%d\n", s.Packages)
	fmt.Fprintf(tw, "Content keys:\t%d\n", s.ContentKeys)
	fmt.Fprintf(tw, "Selected:\t%d\n", s.Selected)
	fmt.Fprintf(tw, "Already labelled:\t%d\n", s.AlreadyLabelled)
	fmt.Fprintf(tw, "Skipped failures:\t%d\n", s.SkippedFailures)
	fmt.Fprintf(tw, "Labelled in this run:\t%d\n", s.Labelled)
	fmt.Fprintf(tw, "  Suspicious:\t%d\n", s.Suspicious)
	fmt.Fprintf(tw, "  Needs review:\t%d\n", s.NeedsReview)
	fmt.Fprintf(tw, "Failed in this run:\t%d\n", s.Failed)
	fmt.Fprintf(tw, "Unprocessed:\t%d\n", s.Unprocessed)
	fmt.Fprintf(tw, "Output:\t%s\n", s.Output)
	if s.Failed > 0 {
		fmt.Fprintf(tw, "Failures:\t%s\n", s.Failures)
	}
	if len(s.Labels) > 0 {
		fmt.Fprintf(tw, "Labels in this run:\t\n")
		for _, label := range append(catalog.Names(), catalog.None) {
			if n := s.Labels[label]; n > 0 {
				fmt.Fprintf(tw, "  %s\t%d\n", label, n)
			}
		}
	}
	return tw.Flush()
}

// state represents the state of a labelling run: the output file, the
// failures and the summary.
type state struct {
	out          *os.File
	summary      *Summary
	done         map[string]bool
	prevFailures map[string]*Failure
	failures     map[string]*Failure
	resolved     map[string]bool
}

// write appends the rows of the batch result provided to the output (in a
// single write, followed by a sync), and records its failures. If the rows
// can't be written, the output is truncated to its previous size, so that it
// only holds whole batches.
func (st *state) write(res *batchResult) error {
	if len(res.rows) > 0 {
		var buf bytes.Buffer
		for _, row := range res.rows {
			data, err := json.Marshal(row)
			if err != nil {
				return err
			}
			buf.Write(data)
			buf.WriteByte('\n')
		}
		prevSize, err := st.out.Seek(0, io.SeekEnd)
		if err != nil {
			return fmt.Errorf("error writing output: %w", err)
		}
		_, err = st.out.Write(buf.Bytes())
		if err == nil {
			err = st.out.Sync()
		}
		if err != nil {
			if terr := st.out.Truncate(prevSize); terr != nil {
				err = errors.Join(err, terr)
			}
			return fmt.Errorf("error writing output: %w", err)
		}
	}
	if st.resolved == nil {
		st.resolved = make(map[string]bool)
	}
	for _, row := range res.rows {
		st.resolved[row.ContentKey] = true
		st.summary.Labelled++
		st.summary.Labels[row.Label]++
		if row.Suspicious {
			st.summary.Suspicious++
		}
		if row.NeedsReview {
			st.summary.NeedsReview++
		}
	}
	for _, f := range res.failures {
		st.resolved[f.ContentKey] = true
		st.failures[f.ContentKey] = f
		st.summary.Failed++
	}
	if len(res.failures) > 0 {
		return st.writeFailures()
	}
	return nil
}

// writeFailures rewrites the failures file. It contains the failures of this
// run, plus the previous failures of the packages that were not labelled or
// retried in this run. The file is removed when there are no failures.
func (st *state) writeFailures() error {
	var failures []*Failure
	for key, f := range st.prevFailures {
		if !st.done[key] && !st.resolved[key] {
			failures = append(failures, f)
		}
	}
	for _, f := range st.failures {
		failures = append(failures, f)
	}
	slices.SortFunc(failures, func(a, b *Failure) int { return strings.Compare(a.ContentKey, b.ContentKey) })

	path := st.summary.Failures
	if len(failures) == 0 {
		if err := os.Remove(path); err != nil && !errors.Is(err, os.ErrNotExist) {
			return fmt.Errorf("error removing failures file: %w", err)
		}
		return nil
	}
	var buf bytes.Buffer
	for _, f := range failures {
		data, err := json.Marshal(f)
		if err != nil {
			return err
		}
		buf.Write(data)
		buf.WriteByte('\n')
	}
	if err := writeFileAtomically(path, buf.Bytes()); err != nil {
		return fmt.Errorf("error writing failures file: %w", err)
	}
	return nil
}

// writeFileAtomically writes the data provided to a temporary file in the
// same directory as the path provided, and then renames it.
func writeFileAtomically(path string, data []byte) error {
	tmp, err := os.CreateTemp(filepath.Dir(path), "."+filepath.Base(path)+".*")
	if err != nil {
		return err
	}
	defer os.Remove(tmp.Name())
	if _, err := tmp.Write(data); err != nil {
		tmp.Close()
		return err
	}
	if err := tmp.Close(); err != nil {
		return err
	}
	return os.Rename(tmp.Name(), path)
}

// openOutput opens the output file for appending, creating it if needed. If
// the file doesn't end with a newline, one is added so that the next row
// starts on its own line.
func openOutput(path string) (*os.File, error) {
	f, err := os.OpenFile(path, os.O_RDWR|os.O_APPEND|os.O_CREATE, 0o644)
	if err != nil {
		return nil, fmt.Errorf("error opening output: %w", err)
	}
	info, err := f.Stat()
	if err != nil {
		f.Close()
		return nil, fmt.Errorf("error opening output: %w", err)
	}
	if size := info.Size(); size > 0 {
		last := make([]byte, 1)
		if _, err := f.ReadAt(last, size-1); err != nil {
			f.Close()
			return nil, fmt.Errorf("error reading output: %w", err)
		}
		if last[0] != '\n' {
			if _, err := f.Write([]byte("\n")); err != nil {
				f.Close()
				return nil, fmt.Errorf("error writing output: %w", err)
			}
		}
	}
	return f, nil
}

// discardIncompleteLastRow removes the last line of the output file
// provided when it isn't terminated by a newline and isn't valid JSON. Such a
// line is left when the tool is killed while appending a batch. A complete
// JSON line is kept even if it isn't a valid row (for example, after a manual
// edit), so that reading the dataset reports it instead. It returns
// whether a line was discarded. A missing file is left as is.
func discardIncompleteLastRow(path string) (bool, error) {
	f, err := os.Open(path)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return false, nil
		}
		return false, fmt.Errorf("error opening output: %w", err)
	}
	defer f.Close()
	info, err := f.Stat()
	if err != nil {
		return false, fmt.Errorf("error reading output: %w", err)
	}

	// Read the end of the file (rows can't be longer than the maximum line
	// size, so the start of the last row is always in it)
	size := info.Size()
	if size == 0 {
		return false, nil
	}
	end := make([]byte, min(size, dataset.MaxLineSize+1))
	offset := size - int64(len(end))
	if _, err := f.ReadAt(end, offset); err != nil {
		return false, fmt.Errorf("error reading output: %w", err)
	}
	if end[len(end)-1] == '\n' {
		return false, nil
	}
	i := bytes.LastIndexByte(end, '\n')
	if i < 0 && offset > 0 {
		// The last line is too long, dataset.Read reports it
		return false, nil
	}
	lastLine := end[i+1:]
	if json.Valid(lastLine) {
		return false, nil
	}

	// Discard the incomplete last row
	if err := os.Truncate(path, offset+int64(i+1)); err != nil {
		return false, fmt.Errorf("error discarding incomplete last row: %w", err)
	}
	return true, nil
}

// readOutputKeys returns the content keys present in the output file
// provided, which must be a valid dataset labelled with the current
// categories file (labels obtained with other categories must not be mixed
// with new ones). A missing file has no keys.
func readOutputKeys(path string) (map[string]bool, error) {
	keys := make(map[string]bool)
	f, err := os.Open(path)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return keys, nil
		}
		return nil, fmt.Errorf("error opening output: %w", err)
	}
	defer f.Close()
	rows, err := dataset.Read(f)
	if err != nil {
		return nil, fmt.Errorf("error reading existing output %s: %w", path, err)
	}
	for i, row := range rows {
		if row.Labeler.LabelingDigest != catalog.LabelingDigest() {
			return nil, fmt.Errorf("%w (%s, row %d), please use a new output file", ErrOutputCategoriesChanged, path, i+1)
		}
		keys[row.ContentKey] = true
	}
	return keys, nil
}

// readFailures returns the failures in the failures file provided, indexed
// by content key. A missing file has no failures.
func readFailures(path string) (map[string]*Failure, error) {
	failures := make(map[string]*Failure)
	f, err := os.Open(path)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return failures, nil
		}
		return nil, fmt.Errorf("error opening failures file: %w", err)
	}
	defer f.Close()
	scanner := bufio.NewScanner(f)
	scanner.Buffer(make([]byte, 0, 64*1024), maxInputLineSize)
	line := 0
	for scanner.Scan() {
		line++
		var failure Failure
		dec := json.NewDecoder(bytes.NewReader(scanner.Bytes()))
		dec.DisallowUnknownFields()
		if err := dec.Decode(&failure); err != nil || failure.ContentKey == "" {
			return nil, fmt.Errorf("error reading failures file %s: line %d: invalid failure", path, line)
		}
		failures[failure.ContentKey] = &failure
	}
	if err := scanner.Err(); err != nil {
		return nil, fmt.Errorf("error reading failures file %s: %w", path, err)
	}
	return failures, nil
}
