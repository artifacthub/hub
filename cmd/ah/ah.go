package main

import (
	"os"

	"github.com/spf13/cobra"
)

func main() {
	// Setup root command
	rootCmd := &cobra.Command{
		Use:   "ah",
		Short: "Artifact Hub command line tool",
		CompletionOptions: cobra.CompletionOptions{
			DisableDefaultCmd: true,
		},
		SilenceUsage: true,
	}
	rootCmd.AddCommand(
		newLintCmd(),
		newVersionCmd(),
	)

	// Execute root command
	if err := rootCmd.Execute(); err != nil {
		os.Exit(1)
	}
}
