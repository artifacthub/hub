package main

import (
	"bytes"
	"errors"
	"fmt"
	"io"
	"io/fs"
	"os"
	"path/filepath"
	"strings"

	"github.com/artifacthub/hub/internal/category/catalog"
	"github.com/artifacthub/hub/internal/category/dataset"
	"github.com/artifacthub/hub/internal/category/labeler"
	"github.com/artifacthub/hub/internal/category/model"
	"github.com/spf13/cobra"
)

const (
	// defaultDataDir represents the default directory where the packed
	// dataset and publisher rows and the baseline model are written
	// (relative to the repository root).
	defaultDataDir = "internal/category/data"

	// packedDatasetFile represents the name of the packed dataset file.
	packedDatasetFile = "dataset.jsonl.gz"

	// packedPublisherRowsFile represents the name of the packed publisher
	// rows file.
	packedPublisherRowsFile = "publisher.jsonl.gz"

	// baselineModelFile represents the name of the baseline model file.
	baselineModelFile = "baseline.json"
)

// trainDesc represents the long description of the train command.
var trainDesc = `Train the baseline package category model

Use this command to train the baseline package category model from the reviewed
dataset and the publisher rows provided (packages whose category was set by
their publisher, exported with the get_category_training_data database
function). The dataset and the publisher rows are canonicalized and packed, and
the baseline model is trained on them. All of them are written to the data
directory: the baseline model is embedded in the tracker, and the dataset and
the publisher rows are embedded in this tool, to evaluate the model and check
that it can be reproduced. Nothing is written when training fails.

The evaluation metrics of the model and a summary of the label changes compared
with the dataset currently in the data directory are printed, so that they can
be included in the pull request description.`

// trainOptions represents the options that can be passed to the train
// command.
type trainOptions struct {
	// dataset represents the path of the reviewed dataset (JSONL).
	dataset string

	// publisherRows represents the path of the publisher rows (JSONL). No
	// publisher rows are used when it's empty.
	publisherRows string

	// dataDir represents the directory where the packed dataset and
	// publisher rows and the baseline model are written.
	dataDir string
}

// newTrainCmd creates a new train command.
func newTrainCmd() *cobra.Command {
	opts := &trainOptions{}
	trainCmd := &cobra.Command{
		Use:   "train",
		Short: "Train the baseline package category model",
		Long:  trainDesc,
		RunE: func(cmd *cobra.Command, args []string) error {
			return train(opts, cmd.OutOrStdout())
		},
	}
	trainCmd.Flags().StringVarP(&opts.dataset, "dataset", "d", "", "reviewed dataset file (JSONL)")
	trainCmd.Flags().StringVarP(&opts.publisherRows, "publisher-rows", "p", "", "publisher rows file (JSONL), none are used when not provided")
	trainCmd.Flags().StringVarP(&opts.dataDir, "data-dir", "", defaultDataDir, "directory where the packed dataset and publisher rows and the baseline model are written")
	_ = trainCmd.MarkFlagRequired("dataset")
	return trainCmd
}

// train trains the baseline model using the reviewed dataset and publisher
// rows provided, and writes it to the data directory along with the packed
// dataset and publisher rows.
func train(opts *trainOptions, w io.Writer) error {
	// Read reviewed dataset and pack it
	rows, err := readReviewedDataset(opts.dataset)
	if err != nil {
		return err
	}
	var packed bytes.Buffer
	datasetDigest, err := dataset.Pack(&packed, rows)
	if err != nil {
		return fmt.Errorf("error packing dataset: %w", err)
	}

	// Read publisher rows and pack them (packed even when there are none, so
	// that the data directory is always complete)
	var publisherRows []dataset.PublisherRow
	if opts.publisherRows != "" {
		publisherRows, err = readPublisherRows(opts.publisherRows)
		if err != nil {
			return err
		}
	}
	var packedPublisherRows bytes.Buffer
	publisherRowsDigest, err := dataset.PackPublisherRows(&packedPublisherRows, publisherRows)
	if err != nil {
		return fmt.Errorf("error packing publisher rows: %w", err)
	}

	// Train baseline model
	m, ts, err := trainCategoryModel(rows, publisherRows, datasetDigest)
	if err != nil {
		return err
	}
	modelJSON, err := m.Marshal()
	if err != nil {
		return fmt.Errorf("error encoding model: %w", err)
	}

	// Compare with the current dataset before replacing it
	datasetPath := filepath.Join(opts.dataDir, packedDatasetFile)
	currentRows, currentErr := readPackedDataset(datasetPath)

	// Write packed dataset and publisher rows and baseline model
	if err := os.MkdirAll(opts.dataDir, 0o750); err != nil {
		return fmt.Errorf("error creating data directory: %w", err)
	}
	if err := writeFilesAtomically(map[string][]byte{
		datasetPath: packed.Bytes(),
		filepath.Join(opts.dataDir, packedPublisherRowsFile): packedPublisherRows.Bytes(),
		filepath.Join(opts.dataDir, baselineModelFile):       append(modelJSON, '\n'),
	}); err != nil {
		return err
	}

	// Print report
	p := &reportPrinter{w: w}
	p.printf("# Package category baseline model\n\n")
	p.printf("- Dataset digest: `%s`\n", datasetDigest)
	p.printf("- Dataset rows: %d\n", len(rows))
	staleCategories, staleGuidelines := countStaleLabels(rows)
	if staleCategories > 0 {
		p.printf("- **Rows labelled with a different categories file: %d**\n", staleCategories)
	}
	if staleGuidelines > 0 {
		p.printf("- **Rows labelled with different labelling guidelines: %d**\n", staleGuidelines)
	}
	p.printf("- Publisher rows digest: `%s`\n", publisherRowsDigest)
	p.printf("- Publisher rows: %d\n", len(publisherRows))
	printUnknownCategories(p, ts)
	p.printf("\n")
	printModelMetrics(p, m)
	switch {
	case currentErr != nil:
		p.printf("## Label changes\n\nCurrent dataset could not be read: %v\n", currentErr)
	default:
		printLabelChanges(p, dataset.Compare(currentRows, rows))
	}
	return p.err
}

// countStaleLabels returns the number of dataset rows provided that were
// labelled with a categories file and with labelling guidelines different
// from the current ones.
func countStaleLabels(rows []dataset.Row) (categories, guidelines int) {
	for _, row := range rows {
		if row.Labeler.LabelingDigest != catalog.LabelingDigest() {
			categories++
		}
		if row.Labeler.GuidelinesDigest != labeler.GuidelinesDigest() {
			guidelines++
		}
	}
	return categories, guidelines
}

// readReviewedDataset reads the dataset in JSONL format in the path provided.
func readReviewedDataset(path string) ([]dataset.Row, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, fmt.Errorf("error opening dataset: %w", err)
	}
	defer f.Close()
	rows, err := dataset.Read(f)
	if err != nil {
		return nil, fmt.Errorf("error reading dataset: %w", err)
	}
	return rows, nil
}

// readPublisherRows reads the publisher rows in JSONL format in the path
// provided.
func readPublisherRows(path string) ([]dataset.PublisherRow, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, fmt.Errorf("error opening publisher rows: %w", err)
	}
	defer f.Close()
	rows, err := dataset.ReadPublisherRows(f)
	if err != nil {
		return nil, fmt.Errorf("error reading publisher rows: %w", err)
	}
	return rows, nil
}

// readPackedDataset reads the packed dataset in the path provided. No
// rows are returned when the file doesn't exist.
func readPackedDataset(path string) ([]dataset.Row, error) {
	f, err := os.Open(path)
	if err != nil {
		if errors.Is(err, fs.ErrNotExist) {
			return nil, nil
		}
		return nil, err
	}
	defer f.Close()
	rows, _, err := dataset.ReadPacked(f)
	return rows, err
}

// trainCategoryModel trains a model on the dataset and publisher rows
// provided, returning it along with the training set used. The dataset digest
// provided is recorded in the model.
func trainCategoryModel(
	rows []dataset.Row,
	publisherRows []dataset.PublisherRow,
	datasetDigest string,
) (*model.Model, *dataset.TrainingSet, error) {
	ts, err := dataset.BuildTrainingSet(rows, publisherRows)
	if err != nil {
		return nil, nil, fmt.Errorf("error building training set: %w", err)
	}
	m, err := model.Train(ts.TrainInput(datasetDigest), model.DefaultConfig())
	if err != nil {
		return nil, nil, fmt.Errorf("error training model: %w", err)
	}
	return m, ts, nil
}

// writeFilesAtomically writes the files provided (path: content). Each file is written
// to a temporary file first, and then renamed once all have been written.
func writeFilesAtomically(files map[string][]byte) error {
	tmpFiles := make(map[string]string, len(files))
	defer func() {
		for _, tmpPath := range tmpFiles {
			_ = os.Remove(tmpPath)
		}
	}()
	for path, data := range files {
		f, err := os.CreateTemp(filepath.Dir(path), "."+filepath.Base(path)+".*")
		if err != nil {
			return fmt.Errorf("error writing %s: %w", path, err)
		}
		tmpFiles[path] = f.Name()
		if _, err := f.Write(data); err != nil {
			f.Close()
			return fmt.Errorf("error writing %s: %w", path, err)
		}
		if err := f.Close(); err != nil {
			return fmt.Errorf("error writing %s: %w", path, err)
		}
	}
	for path, tmpPath := range tmpFiles {
		if err := os.Rename(tmpPath, path); err != nil {
			return fmt.Errorf("error writing %s: %w", path, err)
		}
		delete(tmpFiles, path)
	}
	return nil
}

// reportPrinter is a helper to write formatted output, keeping the first error.
type reportPrinter struct {
	w   io.Writer
	err error
}

// printf writes the formatted output provided, unless a previous write
// failed.
func (p *reportPrinter) printf(format string, a ...any) {
	if p.err != nil {
		return
	}
	_, p.err = fmt.Fprintf(p.w, format, a...)
}

// table writes a Markdown table with the header and rows provided.
func (p *reportPrinter) table(header []string, rows [][]string) {
	p.printf("| %s |\n", strings.Join(header, " | "))
	sep := make([]string, len(header))
	for i := range sep {
		sep[i] = "---"
	}
	p.printf("| %s |\n", strings.Join(sep, " | "))
	for _, row := range rows {
		p.printf("| %s |\n", strings.Join(row, " | "))
	}
	p.printf("\n")
}

// printModelMetrics writes the evaluation metrics of the model provided.
func printModelMetrics(p *reportPrinter, m *model.Model) {
	mt := &m.Metrics

	// Model
	p.printf("## Model\n\n")
	p.printf("- Algorithm: %s\n", m.Algorithm)
	p.printf("- Threshold: %.4f\n", m.Threshold)
	p.printf("- Category thresholds: %s\n", fmtCategoryThresholds(m.CategoryThresholds))
	p.printf("- Vocabulary size: %d\n", len(m.Vocabulary))
	p.printf("- Categories: %s\n", joinOrDash(m.Categories))
	p.printf("- Suppressed categories: %s\n", joinOrDash(mt.SuppressedCategories))
	p.printf("- Low evidence categories: %s\n", joinOrDash(mt.LowEvidenceCategories))
	p.printf("- Excluded categories: %s\n", joinOrDash(mt.ExcludedCategories))
	p.printf("- Training set digest: `%s`\n\n", m.TrainingSetDigest)

	// Training set rows
	rc := &mt.RowCounts
	p.printf("## Training set\n\n")
	p.table([]string{"Raw LLM", "Raw publisher", "Excluded", "Unknown category", "Conflicts", "Deduplicated", "LLM", "Publisher", "None"},
		[][]string{{
			fmtInt(rc.RawLLM), fmtInt(rc.RawPublisher), fmtInt(rc.Excluded), fmtInt(rc.UnknownCategory), fmtInt(rc.Conflicts),
			fmtInt(rc.Deduplicated), fmtInt(rc.LLM), fmtInt(rc.Publisher), fmtInt(rc.None),
		}},
	)

	// Cross-fitted metrics
	p.printf("## Cross-fitted metrics\n\n")
	summaryHeader := []string{"Rows", "Labelled", "None", "Predictions", "Correct", "Precision", "Coverage", "None false positive rate"}
	summaryRow := func(s *model.Summary) []string {
		return []string{
			fmtInt(s.Rows), fmtInt(s.LabelledRows), fmtInt(s.NoneRows), fmtInt(s.Predictions), fmtInt(s.CorrectPredictions),
			fmtFloat(s.Precision), fmtFloat(s.Coverage), fmtFloat(s.NoneFalsePositiveRate),
		}
	}
	p.table(summaryHeader, [][]string{summaryRow(&mt.Summary)})
	if mt.Publisher != nil {
		p.printf("### Publisher rows\n\n")
		p.table(summaryHeader, [][]string{summaryRow(mt.Publisher)})
	}

	// Algorithms
	p.printf("## Algorithms\n\n")
	algorithms := make([][]string, 0, len(mt.Algorithms))
	for _, a := range mt.Algorithms {
		selected := ""
		if a.Selected {
			selected = "yes"
		}
		algorithms = append(algorithms, []string{
			a.Algorithm, selected, fmtFloat(a.Threshold), fmtCategoryThresholds(a.CategoryThresholds),
			fmtFloat(a.Precision), fmtFloat(a.Coverage), joinOrDash(a.SuppressedCategories), a.Error,
		})
	}
	p.table([]string{
		"Algorithm", "Selected", "Threshold", "Category thresholds", "Precision", "Coverage", "Suppressed", "Error",
	}, algorithms)

	// Categories
	p.printf("## Categories\n\n")
	categories := make([][]string, 0, len(mt.Categories))
	for _, c := range mt.Categories {
		categories = append(categories, []string{
			c.Name, fmtInt(c.Support), fmtInt(c.Predictions), fmtInt(c.CorrectPredictions), fmtFloat(c.Precision), fmtFloat(c.Recall),
		})
	}
	p.table([]string{"Category", "Support", "Predictions", "Correct", "Precision", "Recall"}, categories)

	// Confusion matrix
	p.printf("## Confusion matrix\n\n")
	p.printf("Rows are the labels and columns the predictions (`%s` means no prediction).\n\n", catalog.None)
	cm := &mt.ConfusionMatrix
	header := append([]string{""}, cm.Labels...)
	matrix := make([][]string, 0, len(cm.Counts))
	for i, counts := range cm.Counts {
		row := make([]string, 0, len(counts)+1)
		row = append(row, cm.Labels[i])
		for _, n := range counts {
			row = append(row, fmtInt(n))
		}
		matrix = append(matrix, row)
	}
	p.table(header, matrix)
}

// printUnknownCategories writes the categories of the publisher rows of the
// training set provided that are not in the catalog, when there are any.
func printUnknownCategories(p *reportPrinter, ts *dataset.TrainingSet) {
	if len(ts.UnknownCategories) == 0 {
		return
	}
	ids := make([]string, 0, len(ts.UnknownCategories))
	for _, id := range ts.UnknownCategories {
		ids = append(ids, fmtInt(id))
	}
	p.printf("- **Publisher rows with categories not in the catalog (skipped): %d (categories %s)**\n",
		ts.Counts.UnknownCategory, strings.Join(ids, ", "))
}

// printLabelChanges writes the label changes provided.
func printLabelChanges(p *reportPrinter, d *dataset.Diff) {
	p.printf("## Label changes\n\n")
	p.printf("- Added rows: %d\n", len(d.Added))
	p.printf("- Removed rows: %d\n", len(d.Removed))
	p.printf("- Rows with label changes: %d\n\n", len(d.Changed))
	labels := make([][]string, 0, len(d.Labels))
	for _, l := range d.Labels {
		labels = append(labels, []string{
			l.Label, fmtInt(l.Before), fmtInt(l.After), fmtInt(l.ChangedFrom), fmtInt(l.ChangedTo),
		})
	}
	p.table([]string{"Label", "Before", "After", "Changed from", "Changed to"}, labels)
	if len(d.Changed) > 0 {
		p.printf("### Changed rows\n\n")
		changed := make([][]string, 0, len(d.Changed))
		for _, c := range d.Changed {
			changed = append(changed, []string{c.RepositoryName, c.Name, c.From, c.To})
		}
		p.table([]string{"Repository", "Package", "From", "To"}, changed)
	}
}

// joinOrDash returns the list of items provided as a comma separated string, or a
// dash when it's empty.
func joinOrDash(items []string) string {
	if len(items) == 0 {
		return "-"
	}
	return strings.Join(items, ", ")
}

// fmtCategoryThresholds returns the category thresholds provided as a comma
// separated list sorted by category ID, or a dash when there are none.
func fmtCategoryThresholds(thresholds map[string]float64) string {
	items := make([]string, 0, len(thresholds))
	for _, name := range catalog.Names() {
		if t, ok := thresholds[name]; ok {
			items = append(items, name+" "+fmtFloat(t))
		}
	}
	return joinOrDash(items)
}

// fmtInt returns the string representation of the integer provided.
func fmtInt(n int) string {
	return fmt.Sprintf("%d", n)
}

// fmtFloat returns the string representation of the float provided, rounded to
// four decimals.
func fmtFloat(f float64) string {
	return fmt.Sprintf("%.4f", f)
}
