package main

import (
	"bytes"
	"io"
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestVersionCmd(t *testing.T) {
	testCases := []struct {
		name      string
		version   string
		gitCommit string
	}{
		{
			"test1",
			"0.0.1",
			"aaabbbcccdddeeefff",
		},
		{
			"test2",
			"",
			"",
		},
	}

	for _, tc := range testCases {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			// Prepare command and execute it
			version = tc.version
			gitCommit = tc.gitCommit
			var b bytes.Buffer
			cmd := newVersionCmd()
			cmd.SilenceUsage = true
			cmd.SilenceErrors = true
			cmd.SetOut(&b)
			cmd.SetArgs([]string{})
			cmdErr := cmd.Execute()

			// Read command output and check it matches what we expect
			cmdOutput, err := io.ReadAll(&b)
			require.NoError(t, err)
			goldenPath := filepath.Join("testdata", "version", tc.name, "output.golden")
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
			assert.Equal(t, nil, cmdErr)
		})
	}
}
