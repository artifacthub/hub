// Command category is the package category classifier development tool. It
// labels packages using the Copilot CLI (label), compares label sets
// (agreement), and trains (train) and evaluates (evaluate) the baseline model
// embedded in the tracker.
//
// This is a dev-only tool used by maintainers: it's not released and it
// never connects to the database. Please see the "Package category
// classifier" section in docs/dev.md for more details.
package main

import (
	"context"
	"os"
	"os/signal"
	"syscall"

	"github.com/spf13/cobra"
)

func main() {
	// Setup root command
	rootCmd := &cobra.Command{
		Use:   "category",
		Short: "Artifact Hub package category classifier development tool",
		CompletionOptions: cobra.CompletionOptions{
			DisableDefaultCmd: true,
		},
		SilenceUsage: true,
	}
	rootCmd.AddCommand(
		newLabelCmd(),
		newAgreementCmd(),
		newTrainCmd(),
		newEvaluateCmd(),
	)

	// Execute root command (canceled on interrupt, so that the agents
	// processes are killed and the labels obtained are kept)
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	err := rootCmd.ExecuteContext(ctx)
	stop()
	if err != nil {
		os.Exit(1)
	}
}
