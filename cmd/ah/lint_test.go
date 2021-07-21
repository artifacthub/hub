package main

import (
	"bytes"
	"flag"
	"io"
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

var (
	update = flag.Bool("update", false, "Update tests golden files")
)

func TestMain(m *testing.M) {
	flag.Parse()
	os.Exit(m.Run())
}

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
	}

	for _, tc := range testCases {
		tc := tc
		t.Run(tc.desc, func(t *testing.T) {
			t.Parallel()

			// Prepare command and execute it
			var b bytes.Buffer
			cmd := newLintCmd()
			cmd.SilenceUsage = true
			cmd.SilenceErrors = true
			cmd.SetOut(&b)
			cmd.SetArgs([]string{"--kind", tc.kind, "--path", filepath.Join("testdata", tc.path, "pkgs")})
			cmdErr := cmd.Execute()

			// Read command output and check it matches what we expect
			cmdOutput, err := io.ReadAll(&b)
			require.NoError(t, err)
			goldenPath := filepath.Join("testdata", tc.path, "output.golden")
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
