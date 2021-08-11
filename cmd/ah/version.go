package main

import (
	"fmt"
	"io"

	"github.com/spf13/cobra"
)

var (
	// These vars represent some version information and they are meant to be
	// overwritten with LDFLAGS.
	version   string
	gitCommit string
)

// newVersionCmd creates a new version command.
func newVersionCmd() *cobra.Command {
	versionCmd := &cobra.Command{
		Use:   "version",
		Short: "Print version information",
		Run: func(cmd *cobra.Command, args []string) {
			printVersion(cmd.OutOrStdout())
		},
	}
	return versionCmd
}

// printVersion prints some version information to the writer provided.
func printVersion(out io.Writer) {
	fmt.Fprintf(out, "Version: %s\n", version)
	fmt.Fprintf(out, "Git commit: %s\n", gitCommit)
}
