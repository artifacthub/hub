package main

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"os"
	"path/filepath"
	"slices"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/artifacthub/hub/internal/category/dataset"
	"github.com/artifacthub/hub/internal/category/labeler"
	"github.com/spf13/cobra"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// fakeGitHubToken represents a fake GitHub token.
const fakeGitHubToken = "github_pat_test" // #nosec G101 -- fake test token

// fakeCopilot is a labeler.Executor implementation that simulates the Copilot
// CLI, labelling every package as a database. Like the real CLI, it wraps its
// output at 100 columns.
type fakeCopilot struct {
	t *testing.T

	mu    sync.Mutex
	calls []*labeler.Command
}

// Execute implements the labeler.Executor interface.
func (f *fakeCopilot) Execute(ctx context.Context, cmd *labeler.Command) (*labeler.Result, error) {
	f.mu.Lock()
	f.calls = append(f.calls, cmd)
	f.mu.Unlock()

	assert.Equal(f.t, "copilot", cmd.Path)
	assert.Contains(f.t, cmd.Env, "COPILOT_GITHUB_TOKEN="+fakeGitHubToken)
	switch {
	case slices.Equal(cmd.Args, []string{"--version"}):
		return &labeler.Result{Stdout: []byte("GitHub Copilot CLI 1.0.104.\nRun 'copilot update' to check for updates.\n")}, nil
	case len(cmd.Args) > 0 && cmd.Args[0] == "-C":
		// Extract the items from the prompt's data block
		_, rest, _ := strings.Cut(string(cmd.Stdin), "\n<packages>\n")
		data, _, _ := strings.Cut(rest, "\n</packages>\n")
		var items []labeler.PromptItem
		require.NoError(f.t, json.Unmarshal([]byte(data), &items))
		labels := make([]map[string]any, 0, len(items))
		for _, item := range items {
			labels = append(labels, map[string]any{
				"id":         item.ID,
				"category":   "database",
				"confidence": "high",
				"suspicious": false,
			})
		}
		out, _ := json.Marshal(map[string]any{"labels": labels})
		var wrapped bytes.Buffer
		for len(out) > 100 {
			wrapped.Write(out[:100])
			wrapped.WriteByte('\n')
			out = out[100:]
		}
		wrapped.Write(out)
		wrapped.WriteByte('\n')
		return &labeler.Result{Stdout: wrapped.Bytes()}, nil
	default:
		f.t.Errorf("unexpected command: %v", cmd.Args)
		return &labeler.Result{ExitCode: 1}, nil
	}
}

// writeLabelTestInput writes a packages file with the names provided and
// returns its path.
func writeLabelTestInput(t *testing.T, dir string, names ...string) string {
	t.Helper()
	var b bytes.Buffer
	for _, name := range names {
		data, err := json.Marshal(map[string]any{
			"package_id":      "id-" + name,
			"repository_kind": 0,
			"repository_name": "repo",
			"name":            name,
			"description":     name + " database",
			"keywords":        []string{name},
			"readme":          "# " + name,
		})
		require.NoError(t, err)
		b.Write(data)
		b.WriteByte('\n')
	}
	path := filepath.Join(dir, "packages.jsonl")
	require.NoError(t, os.WriteFile(path, b.Bytes(), 0o600))
	return path
}

// newLabelTestSetup returns valid label options and dependencies, using a
// temporary directory for the input, output and agent home.
func newLabelTestSetup(t *testing.T) (*labelOptions, *labelDeps, *fakeCopilot, *bytes.Buffer) {
	t.Helper()
	dir := t.TempDir()
	stateHome := filepath.Join(dir, "state")
	agentHome := filepath.Join(stateHome, "artifacthub-category", "copilot")
	require.NoError(t, os.MkdirAll(agentHome, 0o700))
	require.NoError(t, os.WriteFile(filepath.Join(agentHome, "github-token"), []byte(fakeGitHubToken+"\n"), 0o600))

	opts := &labelOptions{
		input:          writeLabelTestInput(t, dir, "redis", "postgres", "mysql", "mongodb"),
		output:         filepath.Join(dir, "dataset.jsonl"),
		model:          "claude-sonnet-5.5",
		effort:         "high",
		batchSize:      2,
		concurrency:    1,
		timeout:        time.Minute,
		readmeMaxBytes: labeler.DefaultReadmeMaxBytes,
	}
	ex := &fakeCopilot{t: t}
	var stdout bytes.Buffer
	deps := &labelDeps{
		environ: []string{
			"PATH=/usr/bin:/bin",
			"HOME=" + dir,
			"XDG_STATE_HOME=" + stateHome,
			"COPILOT_GITHUB_TOKEN=github_pat_other",
			"COPILOT_HOME=" + filepath.Join(dir, ".copilot"),
			"GH_TOKEN=token",
		},
		executor: ex,
		stdout:   &stdout,
		stderr:   io.Discard,
	}
	return opts, deps, ex, &stdout
}

func TestLabelCmd(t *testing.T) {
	t.Parallel()

	t.Run("flags", func(t *testing.T) {
		t.Parallel()
		cmd := newLabelCmd()
		defaults := map[string]string{
			"input":            "",
			"output":           "",
			"model":            "",
			"effort":           "",
			"agent-home":       "",
			"batch-size":       "25",
			"concurrency":      "1",
			"timeout":          "2m0s",
			"readme-max-bytes": "3000",
			"no-readme":        "false",
			"sample":           "0",
			"skip-failures":    "false",
		}
		lines := strings.Split(strings.TrimSpace(cmd.Flags().FlagUsages()), "\n")
		names := make([]string, 0, len(lines))
		for _, line := range lines {
			name, _, _ := strings.Cut(strings.TrimPrefix(strings.TrimSpace(line), "--"), " ")
			names = append(names, name)
		}
		for name, def := range defaults {
			f := cmd.Flags().Lookup(name)
			require.NotNil(t, f, name)
			assert.Equal(t, def, f.DefValue, name)
		}
		assert.ElementsMatch(t, keys(defaults), names, "no other flags (nothing is passed through to the agent)")
	})

	t.Run("required flags", func(t *testing.T) {
		t.Parallel()
		_, err := executeCmd(newLabelCmd())
		require.Error(t, err)
		for _, name := range []string{"input", "output", "model"} {
			assert.Contains(t, err.Error(), `"`+name+`"`)
		}
	})

	t.Run("agent home does not exist", func(t *testing.T) {
		t.Parallel()
		opts, deps, _, _ := newLabelTestSetup(t)
		opts.agentHome = filepath.Join(t.TempDir(), "missing")
		err := label(context.Background(), opts, deps)
		assert.ErrorContains(t, err, "does not exist")
	})

	t.Run("refuses to start with copilot allow all set", func(t *testing.T) {
		t.Parallel()
		opts, deps, ex, _ := newLabelTestSetup(t)
		deps.environ = append(deps.environ, "COPILOT_ALLOW_ALL=true")
		err := label(context.Background(), opts, deps)
		assert.ErrorContains(t, err, "COPILOT_ALLOW_ALL")
		assert.Empty(t, ex.calls)
	})

	t.Run("labels packages using the default agent home", func(t *testing.T) {
		t.Parallel()
		opts, deps, ex, stdout := newLabelTestSetup(t)
		require.NoError(t, label(context.Background(), opts, deps))

		// Calls: version, preflight and 2 batches. The agent starts clean
		// every time: its own COPILOT_HOME, and only the agent home's token
		require.Len(t, ex.calls, 4)
		for _, call := range ex.calls {
			env := strings.Join(call.Env, "\n")
			assert.NotContains(t, env, "GH_TOKEN")
			assert.NotContains(t, env, "github_pat_other")
			assert.NotContains(t, env, filepath.Join(filepath.Dir(opts.output), ".copilot"))
		}

		// Output
		f, err := os.Open(opts.output)
		require.NoError(t, err)
		defer f.Close()
		rows, err := dataset.Read(f)
		require.NoError(t, err)
		require.Len(t, rows, 4)
		for _, row := range rows {
			assert.Equal(t, "database", row.Label)
			assert.Equal(t, "copilot", row.Labeler.Agent)
			assert.Equal(t, "1.0.104", row.Labeler.AgentVersion)
			assert.Equal(t, "claude-sonnet-5.5", row.Labeler.Model)
			assert.Equal(t, "high", row.Labeler.Effort)
			assert.Equal(t, "subscription", row.Labeler.Auth)
			assert.Equal(t, "fine-grained-pat", row.Labeler.AuthMethod)
			assert.Equal(t, labeler.GuidelinesDigest(), row.Labeler.GuidelinesDigest)
		}

		// Summary
		assert.Contains(t, stdout.String(), "Labelled in this run:")
		assert.Contains(t, stdout.String(), "database")

		// Resume
		stdout.Reset()
		require.NoError(t, label(context.Background(), opts, deps))
		assert.Len(t, ex.calls, 4)
		assert.Contains(t, stdout.String(), "Already labelled:      4")
	})
}

// executeCmd executes the command provided with the arguments provided,
// returning its output.
func executeCmd(cmd *cobra.Command, args ...string) (string, error) {
	var b bytes.Buffer
	cmd.SilenceUsage = true
	cmd.SilenceErrors = true
	cmd.SetOut(&b)
	cmd.SetErr(io.Discard)
	cmd.SetArgs(args)
	err := cmd.Execute()
	return b.String(), err
}

// keys returns the keys of the map provided.
func keys(m map[string]string) []string {
	ks := make([]string, 0, len(m))
	for k := range m {
		ks = append(ks, k)
	}
	return ks
}
