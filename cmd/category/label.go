package main

import (
	"context"
	"fmt"
	"io"
	"os"
	"time"

	"github.com/artifacthub/hub/internal/category/labeler"
	"github.com/spf13/cobra"
)

// labelDesc represents the long description of the label command.
var labelDesc = `Label packages with their category using the Copilot CLI

Use this command to label the packages exported from the database (using the
get_packages_for_category_labelling function) with their category. Packages
are labelled in batches by the GitHub Copilot CLI, run non-interactively,
locked down and authenticated with a Copilot subscription.

Packages with the same name, keywords and description are labelled once. The
labels are appended to the output dataset, so the command can be run again to
resume the labelling. Packages whose replies were not valid are written to a
failures file next to the output, and they are retried on the next run unless
--skip-failures is used.

The agent home is a dedicated directory, separate from your normal Copilot
CLI configuration, that holds the GitHub token used. Please see the "Package
category classifier" section in docs/dev.md for how to set it up.`

// labelOptions represents the options that can be passed to the label
// command.
type labelOptions struct {
	// input represents the path of the packages file to label.
	input string

	// output represents the path of the dataset file the labels are
	// appended to.
	output string

	// model represents the model to use.
	model string

	// effort represents the reasoning effort level to use.
	effort string

	// agentHome represents the dedicated directory that holds the agent's
	// token.
	agentHome string

	// batchSize represents the number of packages labelled in each request.
	batchSize int

	// concurrency represents the number of concurrent requests.
	concurrency int

	// timeout represents the timeout of each agent call.
	timeout time.Duration

	// readmeMaxBytes represents the maximum size of the README excerpts.
	readmeMaxBytes int

	// noReadme indicates that README excerpts must not be sent.
	noReadme bool

	// sample represents the number of packages to label, selected
	// deterministically (0 means all).
	sample int

	// skipFailures indicates whether packages in the failures file are
	// skipped instead of retried.
	skipFailures bool
}

// labelDeps represents the dependencies of the label command.
type labelDeps struct {
	// environ represents the tool's environment.
	environ []string

	// executor represents the executor used to run the agent CLI.
	executor labeler.Executor

	// retryBackoff represents the time to wait before retrying a call that
	// failed to execute.
	retryBackoff time.Duration

	// stdout represents the writer where the summary is written.
	stdout io.Writer

	// stderr represents the writer where the progress is written.
	stderr io.Writer
}

// newLabelCmd creates a new label command.
func newLabelCmd() *cobra.Command {
	opts := &labelOptions{}
	labelCmd := &cobra.Command{
		Use:   "label",
		Short: "Label packages with their category using the Copilot CLI",
		Long:  labelDesc,
		RunE: func(cmd *cobra.Command, args []string) error {
			return label(cmd.Context(), opts, &labelDeps{
				environ:      os.Environ(),
				executor:     labeler.NewProcessExecutor(),
				retryBackoff: labeler.DefaultRetryBackoff,
				stdout:       cmd.OutOrStdout(),
				stderr:       cmd.ErrOrStderr(),
			})
		},
	}
	labelCmd.Flags().StringVarP(&opts.input, "input", "", "", "packages file to label (JSONL, exported with get_packages_for_category_labelling)")
	labelCmd.Flags().StringVarP(&opts.output, "output", "", "", "dataset file the labels are appended to (JSONL)")
	labelCmd.Flags().StringVarP(&opts.model, "model", "", "", "model to use")
	labelCmd.Flags().StringVarP(&opts.effort, "effort", "", "", "reasoning effort level to use (defaults to the model's default)")
	labelCmd.Flags().StringVarP(&opts.agentHome, "agent-home", "", "", "directory that holds the agent's token (default $XDG_STATE_HOME/artifacthub-category/copilot, or ~/.local/state/artifacthub-category/copilot)")
	labelCmd.Flags().IntVarP(&opts.batchSize, "batch-size", "", labeler.DefaultBatchSize, "number of packages labelled in each request")
	labelCmd.Flags().IntVarP(&opts.concurrency, "concurrency", "", labeler.DefaultConcurrency, "number of concurrent requests")
	labelCmd.Flags().DurationVarP(&opts.timeout, "timeout", "", labeler.DefaultTimeout, "timeout of each agent call")
	labelCmd.Flags().IntVarP(&opts.readmeMaxBytes, "readme-max-bytes", "", labeler.DefaultReadmeMaxBytes, "maximum size of the README excerpts sent to the agent")
	labelCmd.Flags().BoolVarP(&opts.noReadme, "no-readme", "", false, "don't send README excerpts (required when no package in the input has a readme)")
	labelCmd.Flags().IntVarP(&opts.sample, "sample", "", 0, "label only a deterministic sample of this number of distinct packages (used for agreement runs)")
	labelCmd.Flags().BoolVarP(&opts.skipFailures, "skip-failures", "", false, "skip the packages in the failures file instead of retrying them")
	for _, name := range []string{"input", "output", "model"} {
		_ = labelCmd.MarkFlagRequired(name)
	}
	return labelCmd
}

// label labels the packages in the input file using the Copilot CLI,
// appending the labels to the output file.
func label(ctx context.Context, opts *labelOptions, deps *labelDeps) error {
	// Setup runner
	agentHome := opts.agentHome
	if agentHome == "" {
		var err error
		agentHome, err = labeler.DefaultAgentHome(deps.environ)
		if err != nil {
			return fmt.Errorf("error getting default agent home: %w", err)
		}
	}
	runner, err := labeler.NewRunner(&labeler.RunnerOptions{
		Model:     opts.model,
		Effort:    opts.effort,
		AgentHome: agentHome,
		Environ:   deps.environ,
	})
	if err != nil {
		return err
	}

	// Run labeler
	l, err := labeler.New(&labeler.Config{
		Input:          opts.input,
		Output:         opts.output,
		Model:          opts.model,
		Effort:         opts.effort,
		BatchSize:      opts.batchSize,
		Concurrency:    opts.concurrency,
		Timeout:        opts.timeout,
		ReadmeMaxBytes: opts.readmeMaxBytes,
		NoReadme:       opts.noReadme,
		Sample:         opts.sample,
		SkipFailures:   opts.skipFailures,
		RetryBackoff:   deps.retryBackoff,
	}, runner, deps.executor, deps.stderr)
	if err != nil {
		return err
	}
	summary, err := l.Run(ctx)
	if summary != nil {
		if writeErr := summary.Write(deps.stdout); writeErr != nil && err == nil {
			err = writeErr
		}
	}
	return err
}
