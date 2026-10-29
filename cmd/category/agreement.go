package main

import (
	"fmt"
	"io"

	"github.com/artifacthub/hub/internal/category/labeler"
	"github.com/spf13/cobra"
)

// agreementDesc represents the long description of the agreement command.
var agreementDesc = `Compare two package category label sets

Use this command to compare the labels of two datasets produced by the label
command (for example, by two different agents on the same sample), on the
packages they have in common. It reports the overall agreement, Cohen's kappa,
a confusion matrix and the most frequent disagreements, which point at fuzzy
category boundaries that the labelling guidelines should clarify.`

// agreementOptions represents the options that can be passed to the
// agreement command.
type agreementOptions struct {
	// a represents the path of the first dataset.
	a string

	// b represents the path of the second dataset.
	b string
}

// newAgreementCmd creates a new agreement command.
func newAgreementCmd() *cobra.Command {
	opts := &agreementOptions{}
	agreementCmd := &cobra.Command{
		Use:   "agreement",
		Short: "Compare two package category label sets",
		Long:  agreementDesc,
		RunE: func(cmd *cobra.Command, args []string) error {
			return agreement(opts, cmd.OutOrStdout())
		},
	}
	agreementCmd.Flags().StringVarP(&opts.a, "a", "", "", "first dataset file (JSONL)")
	agreementCmd.Flags().StringVarP(&opts.b, "b", "", "", "second dataset file (JSONL)")
	_ = agreementCmd.MarkFlagRequired("a")
	_ = agreementCmd.MarkFlagRequired("b")
	return agreementCmd
}

// agreement compares the labels of the two datasets provided and writes the
// report to the writer provided.
func agreement(opts *agreementOptions, w io.Writer) error {
	a, err := readReviewedDataset(opts.a)
	if err != nil {
		return err
	}
	b, err := readReviewedDataset(opts.b)
	if err != nil {
		return err
	}
	r, err := labeler.Agreement(a, b)
	if err != nil {
		return err
	}
	fmt.Fprintf(w, "A: %s\n", opts.a)
	fmt.Fprintf(w, "B: %s\n\n", opts.b)
	return r.Write(w)
}
