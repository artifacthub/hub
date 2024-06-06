package main

import (
	"bytes"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestLintCmd(t *testing.T) {
	testCases := []struct {
		kind          string
		path          string
		desc          string
		expectedError error
	}{
		{
			"helm",
			"test1",
			"one package found, no errors",
			nil,
		},
		{
			"helm",
			"test2",
			"two packages found, no errors",
			nil,
		},
		{
			"helm",
			"test3",
			"one package found, one with errors (invalid annotation)",
			errLintFailed,
		},
		{
			"helm",
			"test4",
			"no packages found",
			errNoPackagesFound,
		},
		{
			"opa",
			"test5",
			"one package found",
			nil,
		},
		{
			"opa",
			"test6",
			"two packages found, no errors",
			nil,
		},
		{
			"opa",
			"test7",
			"one package found, one with errors",
			errLintFailed,
		},
		{
			"helm-plugin",
			"test8",
			"one package found, no errors",
			nil,
		},
		{
			"helm-plugin",
			"test9",
			"one package found, one with errors",
			errLintFailed,
		},
		{
			"krew",
			"test10",
			"one package found, no errors",
			nil,
		},
		{
			"krew",
			"test11",
			"one package found, one with errors",
			errLintFailed,
		},
		{
			"tekton-task",
			"test12",
			"one package found, no errors",
			nil,
		},
		{
			"tekton-task",
			"test13",
			"one package found, one with errors",
			errLintFailed,
		},
		{
			"olm",
			"test14",
			"one package found, no errors",
			nil,
		},
		{
			"olm",
			"test15",
			"two packages found, no errors",
			nil,
		},
		{
			"olm",
			"test16",
			"one package found, one with errors",
			errLintFailed,
		},
		{
			"olm",
			"test17",
			"no packages found",
			errNoPackagesFound,
		},
		{
			"kyverno",
			"test18",
			"four packages found, two with errors",
			errLintFailed,
		},
	}

	for _, tc := range testCases {
		tc := tc
		t.Run(fmt.Sprintf("%s: %s", tc.kind, tc.desc), func(t *testing.T) {
			t.Parallel()

			// Prepare command and execute it
			var b bytes.Buffer
			cmd := newLintCmd()
			cmd.SilenceUsage = true
			cmd.SilenceErrors = true
			cmd.SetOut(&b)
			cmd.SetArgs([]string{"--kind", tc.kind, "--path", filepath.Join("testdata", "lint", tc.path, "pkgs")})
			cmdErr := cmd.Execute()

			// Read command output and check it matches what we expect
			cmdOutput, err := io.ReadAll(&b)
			require.NoError(t, err)
			goldenPath := filepath.Join("testdata", "lint", tc.path, "output.golden")
			if *update {
				// Update tests golden files
				golden, err := os.Create(goldenPath)
				require.NoError(t, err)
				_, err = golden.Write(cmdOutput)
				require.NoError(t, err)
			}
			expectedOutput, err := os.ReadFile(goldenPath)
			require.NoError(t, err)
			assert.Equal(t, expectedOutput, cmdOutput)
			assert.Equal(t, tc.expectedError, cmdErr)
		})
	}
}
