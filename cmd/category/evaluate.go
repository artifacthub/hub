package main

import (
	"fmt"
	"io"

	"github.com/artifacthub/hub/internal/category"
	"github.com/artifacthub/hub/internal/category/dataset"
	"github.com/spf13/cobra"
)

// evaluateDesc represents the long description of the evaluate command.
var evaluateDesc = `Evaluate the package category model

Use this command to train and evaluate a package category model on the reviewed
dataset and the publisher rows provided, printing its evaluation metrics.
Nothing is written.

When no dataset is provided, the dataset embedded in this binary is used, along
with the embedded publisher rows unless other ones are provided, so that the
baseline model is reproduced. When a dataset is provided, only the publisher
rows provided are used, as in the train command.`

// evaluateOptions represents the options that can be passed to the evaluate
// command.
type evaluateOptions struct {
	// dataset represents the path of the reviewed dataset (JSONL). The
	// embedded dataset is used when it's empty.
	dataset string

	// publisherRows represents the path of the publisher rows (JSONL). When
	// it's empty, the embedded publisher rows are used with the embedded
	// dataset, and none are used otherwise.
	publisherRows string
}

// newEvaluateCmd creates a new evaluate command.
func newEvaluateCmd() *cobra.Command {
	opts := &evaluateOptions{}
	evaluateCmd := &cobra.Command{
		Use:   "evaluate",
		Short: "Evaluate the package category model",
		Long:  evaluateDesc,
		RunE: func(cmd *cobra.Command, args []string) error {
			return evaluate(opts, cmd.OutOrStdout())
		},
	}
	evaluateCmd.Flags().StringVarP(&opts.dataset, "dataset", "d", "", "reviewed dataset file (JSONL), defaults to the embedded dataset")
	evaluateCmd.Flags().StringVarP(&opts.publisherRows, "publisher-rows", "p", "", "publisher rows file (JSONL), defaults to the embedded publisher rows when the embedded dataset is used")
	return evaluateCmd
}

// evaluate trains and evaluates a model on the dataset and publisher rows
// provided, printing its evaluation metrics.
func evaluate(opts *evaluateOptions, w io.Writer) error {
	// Read dataset
	var (
		rows          []dataset.Row
		datasetDigest string
		source        string
		err           error
	)
	if opts.dataset != "" {
		rows, err = readReviewedDataset(opts.dataset)
		if err != nil {
			return err
		}
		datasetDigest, err = dataset.Digest(rows)
		if err != nil {
			return fmt.Errorf("error computing dataset digest: %w", err)
		}
		source = opts.dataset
	} else {
		rows, datasetDigest, err = category.EmbeddedDataset()
		if err != nil {
			return err
		}
		source = "embedded"
	}

	// Read publisher rows
	var (
		publisherRows       []dataset.PublisherRow
		publisherRowsSource = "not provided"
	)
	switch {
	case opts.publisherRows != "":
		publisherRows, err = readPublisherRows(opts.publisherRows)
		if err != nil {
			return err
		}
		publisherRowsSource = opts.publisherRows
	case opts.dataset == "":
		publisherRows, _, err = category.EmbeddedPublisherRows()
		if err != nil {
			return err
		}
		publisherRowsSource = "embedded"
	}

	// Train and evaluate model
	m, ts, err := trainCategoryModel(rows, publisherRows, datasetDigest)
	if err != nil {
		return err
	}

	// Print report
	p := &reportPrinter{w: w}
	p.printf("# Package category model evaluation\n\n")
	p.printf("- Dataset: %s\n", source)
	p.printf("- Dataset digest: `%s`\n", datasetDigest)
	p.printf("- Dataset rows: %d\n", len(rows))
	p.printf("- Publisher rows: %d (%s)\n", len(publisherRows), publisherRowsSource)
	printUnknownCategories(p, ts)
	p.printf("\n")
	printModelMetrics(p, m)
	return p.err
}
