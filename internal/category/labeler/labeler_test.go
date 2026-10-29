package labeler

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"slices"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/artifacthub/hub/internal/category/catalog"
	"github.com/artifacthub/hub/internal/category/dataset"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// fakeRunner is a Runner implementation used in the labeler tests.
type fakeRunner struct{}

func (r *fakeRunner) Agent() string  { return "fake" }
func (r *fakeRunner) Binary() string { return "fake" }
func (r *fakeRunner) BuildArgs(inv *Invocation) []string {
	return []string{
		"label",
		"--available-tools", copilotNoTools,
		"--deny-tool", "shell",
		"--deny-tool", "write",
		"--deny-tool", "url",
	}
}
func (r *fakeRunner) BuildEnv(inv *Invocation) []string { return []string{"HOME=" + inv.Home} }
func (r *fakeRunner) BuildStdin(prompt []byte) []byte   { return prompt }
func (r *fakeRunner) LoginHint() string                 { return "log in again" }
func (r *fakeRunner) ClassifyError(res *Result) error   { return classifyFake(res) }
func (r *fakeRunner) ParseOutput(res *Result, inv *Invocation) ([]byte, error) {
	if len(res.Stdout) == 0 {
		return nil, &ExecError{Agent: r.Agent(), Msg: "exited without a reply"}
	}
	return res.Stdout, nil
}

func (r *fakeRunner) CheckAuth(ctx context.Context, run RunFunc) (string, error) {
	res, err := run("auth")
	if err != nil {
		return "", err
	}
	if res.ExitCode != 0 {
		return "", &ExecError{Agent: r.Agent(), Msg: "not logged in", Err: ErrAuth}
	}
	return string(res.Stdout), nil
}

// classifyFake classifies the errors of the fake agent.
func classifyFake(res *Result) error {
	switch {
	case bytes.Contains(res.Stderr, []byte("LIMIT")):
		return ErrUsageLimit
	case bytes.Contains(res.Stderr, []byte("AUTH")):
		return ErrAuth
	}
	return nil
}

// fakeHandler represents a function that handles a label call made to the
// fake agent. It receives the call number (starting at 1) and the items in
// the prompt.
type fakeHandler func(call int, items []PromptItem) (*Result, error)

// fakeAgent is an Executor implementation that simulates an agent CLI.
type fakeAgent struct {
	t       *testing.T
	handler fakeHandler
	auth    *Result

	mu    sync.Mutex
	calls [][]string
}

// Execute implements the Executor interface.
func (f *fakeAgent) Execute(ctx context.Context, cmd *Command) (*Result, error) {
	switch cmd.Args[0] {
	case "--version":
		return &Result{Stdout: []byte("fake 1.2.3\n")}, nil
	case "auth":
		if f.auth != nil {
			return f.auth, nil
		}
		return &Result{Stdout: []byte("test-auth")}, nil
	case "label":
		items := promptItems(f.t, cmd.Stdin)
		names := make([]string, 0, len(items))
		for _, item := range items {
			names = append(names, item.Name)
		}
		f.mu.Lock()
		f.calls = append(f.calls, names)
		call := len(f.calls)
		f.mu.Unlock()
		return f.handler(call, items)
	default:
		f.t.Fatalf("unexpected command: %v", cmd.Args)
		return nil, nil
	}
}

// labelCalls returns the names of the packages in each label call.
func (f *fakeAgent) labelCalls() [][]string {
	f.mu.Lock()
	defer f.mu.Unlock()
	return slices.Clone(f.calls)
}

// testLabels represents the labels assigned by the fake agent by default.
var testLabels = map[string]string{
	"redis":    "database",
	"postgres": "database",
	"kafka":    "streaming-messaging",
	"grafana":  "monitoring-logging",
	"vault":    "security",
	"minio":    "storage",
}

// replyWith returns a successful result with a reply that labels the items
// provided using the function provided.
func replyWith(items []PromptItem, fn func(item PromptItem) (string, bool)) *Result {
	type label struct {
		ID         string `json:"id"`
		Category   string `json:"category"`
		Confidence string `json:"confidence"`
		Suspicious bool   `json:"suspicious"`
	}
	labels := make([]label, 0, len(items))
	for _, item := range items {
		category, suspicious := fn(item)
		labels = append(labels, label{ID: item.ID, Category: category, Confidence: "high", Suspicious: suspicious})
	}
	data, _ := json.Marshal(map[string]any{"labels": labels})
	return &Result{Stdout: data}
}

// defaultLabel returns the label assigned by default to the item provided.
func defaultLabel(item PromptItem) (string, bool) {
	if category, ok := testLabels[item.Name]; ok {
		return category, false
	}
	return catalog.None, false
}

// defaultHandler labels every item using the default labels.
func defaultHandler(call int, items []PromptItem) (*Result, error) {
	return replyWith(items, defaultLabel), nil
}

// writeTestInput writes an input file with packages with the names provided
// (all with a readme) and returns its path.
func writeTestInput(t *testing.T, dir string, names ...string) string {
	t.Helper()
	var b bytes.Buffer
	for _, name := range names {
		data, err := json.Marshal(Package{
			RepositoryKind: 0,
			RepositoryName: "repo",
			Name:           name,
			Description:    name + " description",
			Keywords:       []string{name},
			Readme:         "# " + name,
		})
		require.NoError(t, err)
		b.Write(data)
		b.WriteByte('\n')
	}
	path := filepath.Join(dir, "packages.jsonl")
	require.NoError(t, os.WriteFile(path, b.Bytes(), 0o600))
	return path
}

// testConfig returns a labeler configuration for tests.
func testConfig(t *testing.T, names ...string) *Config {
	t.Helper()
	dir := t.TempDir()
	return &Config{
		Input:          writeTestInput(t, dir, names...),
		Output:         filepath.Join(dir, "dataset.jsonl"),
		Model:          "model",
		Effort:         "high",
		BatchSize:      2,
		Concurrency:    1,
		Timeout:        time.Minute,
		ReadmeMaxBytes: 1000,
	}
}

// runLabeler runs a labeler with the configuration and fake agent provided.
func runLabeler(t *testing.T, cfg *Config, agent *fakeAgent) (*Summary, string, error) {
	t.Helper()
	agent.t = t
	var progress bytes.Buffer
	l, err := New(cfg, &fakeRunner{}, agent, &progress)
	require.NoError(t, err)
	s, err := l.Run(context.Background())
	return s, progress.String(), err
}

// readOutput reads the dataset rows in the output file provided, indexed by
// package name.
func readOutput(t *testing.T, path string) map[string]dataset.Row {
	t.Helper()
	f, err := os.Open(path)
	if errors.Is(err, os.ErrNotExist) {
		return nil
	}
	require.NoError(t, err)
	defer f.Close()
	rows, err := dataset.Read(f)
	require.NoError(t, err)
	byName := make(map[string]dataset.Row, len(rows))
	for _, row := range rows {
		byName[row.Name] = row
	}
	return byName
}

// readFailuresFile reads the failures file provided, returning the names of
// the packages in it.
func readFailuresFile(t *testing.T, path string) []string {
	t.Helper()
	failures, err := readFailures(path)
	require.NoError(t, err)
	names := make([]string, 0, len(failures))
	for _, f := range failures {
		names = append(names, f.Name)
	}
	slices.Sort(names)
	return names
}

func TestNew(t *testing.T) {
	t.Parallel()

	valid := Config{Input: "in", Output: "out", Model: "m", BatchSize: 1, Concurrency: 1, Timeout: time.Second, ReadmeMaxBytes: 1}
	testCases := []struct {
		desc   string
		modify func(c *Config)
	}{
		{"input not provided", func(c *Config) { c.Input = "" }},
		{"output not provided", func(c *Config) { c.Output = "" }},
		{"same input and output", func(c *Config) { c.Output = c.Input }},
		{"model not provided", func(c *Config) { c.Model = "" }},
		{"invalid batch size", func(c *Config) { c.BatchSize = 0 }},
		{"invalid concurrency", func(c *Config) { c.Concurrency = 0 }},
		{"invalid timeout", func(c *Config) { c.Timeout = 0 }},
		{"invalid readme max bytes", func(c *Config) { c.ReadmeMaxBytes = 0 }},
		{"invalid sample", func(c *Config) { c.Sample = -1 }},
		{"invalid retry backoff", func(c *Config) { c.RetryBackoff = -1 }},
	}
	for _, tc := range testCases {
		t.Run(tc.desc, func(t *testing.T) {
			t.Parallel()
			cfg := valid
			tc.modify(&cfg)
			_, err := New(&cfg, &fakeRunner{}, &fakeAgent{}, nil)
			assert.Error(t, err)
		})
	}

	t.Run("readme max bytes not needed without readmes", func(t *testing.T) {
		t.Parallel()
		cfg := valid
		cfg.ReadmeMaxBytes = 0
		cfg.NoReadme = true
		_, err := New(&cfg, &fakeRunner{}, &fakeAgent{}, nil)
		assert.NoError(t, err)
	})
}

func TestFailuresPath(t *testing.T) {
	t.Parallel()

	assert.Equal(t, "/data/dataset.failures.jsonl", FailuresPath("/data/dataset.jsonl"))
	assert.Equal(t, "/data/dataset.failures.jsonl", FailuresPath("/data/dataset"))
}

func TestLabelerRun(t *testing.T) {
	t.Parallel()

	t.Run("labels every content key once and resumes", func(t *testing.T) {
		t.Parallel()
		cfg := testConfig(t, "redis", "kafka", "grafana", "unknown", "vault")

		// Add a copy of redis in another repository (same content key)
		f, err := os.OpenFile(cfg.Input, os.O_APPEND|os.O_WRONLY, 0)
		require.NoError(t, err)
		_, err = f.WriteString(`{"repository_kind":0,"repository_name":"another","name":"redis","description":"redis description","keywords":["Redis"]}` + "\n")
		require.NoError(t, err)
		require.NoError(t, f.Close())

		agent := &fakeAgent{handler: defaultHandler}
		s, progress, err := runLabeler(t, cfg, agent)
		require.NoError(t, err)

		// Preflight with a single package, then batches of 2
		calls := agent.labelCalls()
		require.Len(t, calls, 3)
		assert.Len(t, calls[0], 1)
		assert.Len(t, calls[1], 2)
		assert.Len(t, calls[2], 2)
		assert.Contains(t, progress, "preflight: 1 labelled, 0 failed")

		// Output
		rows := readOutput(t, cfg.Output)
		require.Len(t, rows, 5)
		for name, row := range rows {
			expected, ok := testLabels[name]
			if !ok {
				expected = catalog.None
			}
			assert.Equal(t, expected, row.Label, name)
			assert.Equal(t, dataset.ConfidenceHigh, row.Confidence)
			assert.False(t, row.Suspicious)
			assert.False(t, row.NeedsReview)
			assert.Equal(t, dataset.Labeler{
				Agent:            "fake",
				AgentVersion:     "1.2.3",
				Model:            "model",
				Effort:           "high",
				Auth:             AuthSubscription,
				AuthMethod:       "test-auth",
				GuidelinesDigest: GuidelinesDigest(),
				LabelingDigest:   catalog.LabelingDigest(),
			}, row.Labeler)
		}
		assert.Equal(t, 2, rows["redis"].Duplicates)
		assert.Equal(t, "repo", rows["redis"].RepositoryName, "the package with a readme is the representative")
		assert.Equal(t, 1, rows["kafka"].Duplicates)
		assert.NoFileExists(t, FailuresPath(cfg.Output))

		// Summary
		assert.Equal(t, &Summary{
			Output:      cfg.Output,
			Failures:    FailuresPath(cfg.Output),
			Packages:    6,
			ContentKeys: 5,
			Selected:    5,
			Labelled:    5,
			Labels: map[string]int{
				"database":            1,
				"streaming-messaging": 1,
				"monitoring-logging":  1,
				"security":            1,
				"none":                1,
			},
		}, s)

		// Resume: nothing left to label, the agent is not run at all
		agent2 := &fakeAgent{handler: func(call int, items []PromptItem) (*Result, error) {
			t.Error("unexpected call")
			return nil, nil
		}}
		s, _, err = runLabeler(t, cfg, agent2)
		require.NoError(t, err)
		assert.Equal(t, 5, s.AlreadyLabelled)
		assert.Equal(t, 0, s.Labelled)
		assert.Len(t, readOutput(t, cfg.Output), 5)
	})

	t.Run("resume labels only the missing content keys", func(t *testing.T) {
		t.Parallel()
		cfg := testConfig(t, "redis", "kafka", "grafana")
		cfg.Sample = 1
		agent := &fakeAgent{handler: defaultHandler}
		s, _, err := runLabeler(t, cfg, agent)
		require.NoError(t, err)
		assert.Equal(t, 1, s.Selected)
		assert.Equal(t, 1, s.Labelled)
		first := readOutput(t, cfg.Output)
		require.Len(t, first, 1)

		// Drop the trailing newline to check that appending still works
		data, err := os.ReadFile(cfg.Output)
		require.NoError(t, err)
		require.NoError(t, os.WriteFile(cfg.Output, bytes.TrimSuffix(data, []byte("\n")), 0o600)) // #nosec G703 -- test path is under t.TempDir()

		cfg.Sample = 0
		agent = &fakeAgent{handler: defaultHandler}
		s, _, err = runLabeler(t, cfg, agent)
		require.NoError(t, err)
		assert.Equal(t, 1, s.AlreadyLabelled)
		assert.Equal(t, 2, s.Labelled)
		for _, call := range agent.labelCalls() {
			for name := range first {
				assert.NotContains(t, call, name)
			}
		}
		assert.Len(t, readOutput(t, cfg.Output), 3)
	})

	t.Run("resume discards an incomplete last row", func(t *testing.T) {
		t.Parallel()
		cfg := testConfig(t, "redis", "kafka", "grafana")
		cfg.Sample = 1
		s, _, err := runLabeler(t, cfg, &fakeAgent{handler: defaultHandler})
		require.NoError(t, err)
		assert.Equal(t, 1, s.Labelled)

		// Append part of a row, as left by a write interrupted midway
		data, err := os.ReadFile(cfg.Output)
		require.NoError(t, err)
		fragment := data[:len(data)/2]
		require.NoError(t, os.WriteFile(cfg.Output, append(slices.Clone(data), fragment...), 0o600)) // #nosec G703 -- test path is under t.TempDir()

		cfg.Sample = 0
		s, progress, err := runLabeler(t, cfg, &fakeAgent{handler: defaultHandler})
		require.NoError(t, err)
		assert.Contains(t, progress, "warning: discarding incomplete last row in "+cfg.Output)
		assert.Equal(t, 1, s.AlreadyLabelled)
		assert.Equal(t, 2, s.Labelled)
		assert.Len(t, readOutput(t, cfg.Output), 3)
	})

	t.Run("complete last row without a newline is kept", func(t *testing.T) {
		t.Parallel()
		cfg := testConfig(t, "redis")
		_, _, err := runLabeler(t, cfg, &fakeAgent{handler: defaultHandler})
		require.NoError(t, err)
		data, err := os.ReadFile(cfg.Output)
		require.NoError(t, err)
		require.NoError(t, os.WriteFile(cfg.Output, bytes.TrimSuffix(data, []byte("\n")), 0o600)) // #nosec G703 -- test path is under t.TempDir()

		discarded, err := discardIncompleteLastRow(cfg.Output)
		require.NoError(t, err)
		assert.False(t, discarded)
		assert.Len(t, readOutput(t, cfg.Output), 1)
	})

	t.Run("resume into an output labelled with a different categories file fails", func(t *testing.T) {
		t.Parallel()
		cfg := testConfig(t, "redis", "kafka")
		cfg.Sample = 1
		_, _, err := runLabeler(t, cfg, &fakeAgent{handler: defaultHandler})
		require.NoError(t, err)

		// Change the labelling digest of the row, as if the categories file
		// had changed since it was labelled
		data, err := os.ReadFile(cfg.Output)
		require.NoError(t, err)
		data = bytes.Replace(data, []byte(catalog.LabelingDigest()), []byte("sha256:other"), 1)
		require.NoError(t, os.WriteFile(cfg.Output, data, 0o600)) // #nosec G703 -- test path is under t.TempDir()

		cfg.Sample = 0
		agent := &fakeAgent{handler: defaultHandler}
		_, _, err = runLabeler(t, cfg, agent)
		assert.ErrorIs(t, err, ErrOutputCategoriesChanged)
		assert.ErrorContains(t, err, "row 1")
		assert.Empty(t, agent.labelCalls())
	})

	t.Run("complete but invalid last row without a newline is kept", func(t *testing.T) {
		t.Parallel()
		cfg := testConfig(t, "redis")
		_, _, err := runLabeler(t, cfg, &fakeAgent{handler: defaultHandler})
		require.NoError(t, err)

		// Edit the label of the last row, as a reviewer could do by mistake
		data, err := os.ReadFile(cfg.Output)
		require.NoError(t, err)
		var row map[string]any
		require.NoError(t, json.Unmarshal(data, &row))
		row["label"] = "databse"
		data, err = json.Marshal(row)
		require.NoError(t, err)
		require.NoError(t, os.WriteFile(cfg.Output, data, 0o600)) // #nosec G703 -- test path is under t.TempDir()

		discarded, err := discardIncompleteLastRow(cfg.Output)
		require.NoError(t, err)
		assert.False(t, discarded)
		_, _, err = runLabeler(t, cfg, &fakeAgent{handler: defaultHandler})
		assert.ErrorContains(t, err, `invalid label "databse"`)
		after, err := os.ReadFile(cfg.Output)
		require.NoError(t, err)
		assert.Equal(t, data, after)
	})

	t.Run("rows too large to be read back are recorded as failures", func(t *testing.T) {
		t.Parallel()
		cfg := testConfig(t, "redis", "kafka")

		// Add a package whose keywords exceed the maximum dataset line size
		// once encoded (json.Marshal escapes < as \u003c)
		data, err := json.Marshal(Package{
			RepositoryName: "repo",
			Name:           "huge",
			Keywords:       []string{strings.Repeat("<", dataset.MaxLineSize/5)},
			Readme:         "# huge",
		})
		require.NoError(t, err)
		f, err := os.OpenFile(cfg.Input, os.O_APPEND|os.O_WRONLY, 0)
		require.NoError(t, err)
		_, err = f.Write(append(data, '\n'))
		require.NoError(t, err)
		require.NoError(t, f.Close())

		s, _, err := runLabeler(t, cfg, &fakeAgent{handler: defaultHandler})
		require.NoError(t, err)
		assert.Equal(t, 2, s.Labelled)
		assert.Equal(t, 1, s.Failed)
		assert.Equal(t, []string{"huge"}, readFailuresFile(t, FailuresPath(cfg.Output)))
		failures, err := readFailures(FailuresPath(cfg.Output))
		require.NoError(t, err)
		for _, f := range failures {
			assert.Contains(t, f.Error, "dataset row too large")
		}
		rows := readOutput(t, cfg.Output)
		assert.Len(t, rows, 2)
		assert.NotContains(t, rows, "huge")

		// The output can be read back, so the run can be resumed
		s, _, err = runLabeler(t, cfg, &fakeAgent{handler: defaultHandler})
		require.NoError(t, err)
		assert.Equal(t, 2, s.AlreadyLabelled)
		assert.Equal(t, 1, s.Failed)
	})

	t.Run("sample is deterministic", func(t *testing.T) {
		t.Parallel()
		names := []string{"a", "b", "c", "d", "e", "f", "g", "h"}
		labelled := make([][]string, 0, 2)
		for range 2 {
			cfg := testConfig(t, names...)
			cfg.Sample = 3
			s, _, err := runLabeler(t, cfg, &fakeAgent{handler: defaultHandler})
			require.NoError(t, err)
			assert.Equal(t, 8, s.ContentKeys)
			assert.Equal(t, 3, s.Selected)
			rows := readOutput(t, cfg.Output)
			rowNames := make([]string, 0, len(rows))
			for name := range rows {
				rowNames = append(rowNames, name)
			}
			slices.Sort(rowNames)
			labelled = append(labelled, rowNames)
			names = slices.Concat(names[4:], names[:4])
		}
		assert.Len(t, labelled[0], 3)
		assert.Equal(t, labelled[0], labelled[1])
	})

	t.Run("invalid replies are retried, split and recorded as failures", func(t *testing.T) {
		t.Parallel()
		cfg := testConfig(t, "redis", "bad", "kafka", "grafana")
		cfg.BatchSize = 4
		badHandler := func(call int, items []PromptItem) (*Result, error) {
			return replyWith(items, func(item PromptItem) (string, bool) {
				if item.Name == "bad" {
					return "Bad Category", false
				}
				return defaultLabel(item)
			}), nil
		}
		s, _, err := runLabeler(t, cfg, &fakeAgent{handler: badHandler})
		require.NoError(t, err)
		assert.Equal(t, 3, s.Labelled)
		assert.Equal(t, 1, s.Failed)
		assert.Len(t, readOutput(t, cfg.Output), 3)
		assert.Equal(t, []string{"bad"}, readFailuresFile(t, FailuresPath(cfg.Output)))

		// The failures are retried in the next run by default
		failures, err := os.ReadFile(FailuresPath(cfg.Output))
		require.NoError(t, err)
		assert.Contains(t, string(failures), `invalid category \"Bad Category\"`)
		agent := &fakeAgent{handler: defaultHandler}
		s, _, err = runLabeler(t, cfg, agent)
		require.NoError(t, err)
		assert.Equal(t, [][]string{{"bad"}}, agent.labelCalls())
		assert.Equal(t, 1, s.Labelled)
		assert.Equal(t, catalog.None, readOutput(t, cfg.Output)["bad"].Label)
		assert.NoFileExists(t, FailuresPath(cfg.Output))
	})

	t.Run("failures are skipped when requested", func(t *testing.T) {
		t.Parallel()
		cfg := testConfig(t, "bad", "redis")
		handler := func(call int, items []PromptItem) (*Result, error) {
			return replyWith(items, func(item PromptItem) (string, bool) {
				if item.Name == "bad" {
					return "Bad", false
				}
				return defaultLabel(item)
			}), nil
		}
		_, _, err := runLabeler(t, cfg, &fakeAgent{handler: handler})
		require.NoError(t, err)
		require.Equal(t, []string{"bad"}, readFailuresFile(t, FailuresPath(cfg.Output)))

		cfg.SkipFailures = true
		agent := &fakeAgent{handler: defaultHandler}
		s, _, err := runLabeler(t, cfg, agent)
		require.NoError(t, err)
		assert.Equal(t, 1, s.SkippedFailures)
		assert.Equal(t, 1, s.AlreadyLabelled)
		assert.Empty(t, agent.labelCalls())
		assert.Equal(t, []string{"bad"}, readFailuresFile(t, FailuresPath(cfg.Output)))
	})

	t.Run("usage limit stops the run keeping the labels obtained", func(t *testing.T) {
		t.Parallel()
		cfg := testConfig(t, "a", "b", "c", "d", "e", "f", "g")
		handler := func(call int, items []PromptItem) (*Result, error) {
			if call == 3 {
				return &Result{Stderr: []byte("LIMIT"), ExitCode: 1}, nil
			}
			return replyWith(items, defaultLabel), nil
		}
		agent := &fakeAgent{handler: handler}
		s, _, err := runLabeler(t, cfg, agent)
		require.ErrorIs(t, err, ErrUsageLimit)
		assert.Contains(t, err.Error(), "rerun after it resets")
		assert.Len(t, agent.labelCalls(), 3, "usage limits are not retried")
		assert.Equal(t, 3, s.Labelled)
		assert.Equal(t, 4, s.Unprocessed)
		assert.Len(t, readOutput(t, cfg.Output), 3)
		assert.NoFileExists(t, FailuresPath(cfg.Output))
	})

	t.Run("auth error stops the run", func(t *testing.T) {
		t.Parallel()
		cfg := testConfig(t, "a", "b", "c")
		handler := func(call int, items []PromptItem) (*Result, error) {
			if call == 2 {
				return &Result{Stderr: []byte("AUTH"), ExitCode: 1}, nil
			}
			return replyWith(items, defaultLabel), nil
		}
		s, _, err := runLabeler(t, cfg, &fakeAgent{handler: handler})
		require.ErrorIs(t, err, ErrAuth)
		assert.Contains(t, err.Error(), "log in again")
		assert.Equal(t, 1, s.Labelled)
	})

	t.Run("auth check failure", func(t *testing.T) {
		t.Parallel()
		cfg := testConfig(t, "a")
		agent := &fakeAgent{handler: defaultHandler, auth: &Result{ExitCode: 1}}
		_, _, err := runLabeler(t, cfg, agent)
		require.ErrorIs(t, err, ErrAuth)
		assert.Contains(t, err.Error(), "log in again")
		assert.Empty(t, agent.labelCalls())
	})

	t.Run("execution errors are retried once", func(t *testing.T) {
		t.Parallel()
		cfg := testConfig(t, "a", "b", "c")
		handler := func(call int, items []PromptItem) (*Result, error) {
			if call == 2 {
				return &Result{Stderr: []byte("connection reset"), ExitCode: 1}, nil
			}
			return replyWith(items, defaultLabel), nil
		}
		agent := &fakeAgent{handler: handler}
		s, progress, err := runLabeler(t, cfg, agent)
		require.NoError(t, err)
		assert.Equal(t, 3, s.Labelled)
		assert.Len(t, agent.labelCalls(), 3)
		assert.Contains(t, progress, "execution error, retrying")
	})

	t.Run("batches that fail to execute are left unprocessed", func(t *testing.T) {
		t.Parallel()
		cfg := testConfig(t, "a", "b", "c", "d", "e")
		handler := func(call int, items []PromptItem) (*Result, error) {
			if call == 2 || call == 3 {
				return &Result{Stderr: []byte("connection reset"), ExitCode: 1}, nil
			}
			return replyWith(items, defaultLabel), nil
		}
		s, progress, err := runLabeler(t, cfg, &fakeAgent{handler: handler})
		require.NoError(t, err)
		assert.Equal(t, 3, s.Labelled)
		assert.Equal(t, 0, s.Failed)
		assert.Equal(t, 2, s.Unprocessed)
		assert.Contains(t, progress, "batch 1/2 left unprocessed")
		assert.NoFileExists(t, FailuresPath(cfg.Output))
	})

	t.Run("run stops after 3 consecutive execution failures", func(t *testing.T) {
		t.Parallel()
		cfg := testConfig(t, "a", "b", "c", "d", "e", "f", "g", "h", "i")
		handler := func(call int, items []PromptItem) (*Result, error) {
			if call > 1 {
				return &Result{ExitCode: 1}, nil
			}
			return replyWith(items, defaultLabel), nil
		}
		agent := &fakeAgent{handler: handler}
		s, _, err := runLabeler(t, cfg, agent)
		require.ErrorIs(t, err, ErrTooManyFailures)
		assert.Len(t, agent.labelCalls(), 1+3*2)
		assert.Equal(t, 1, s.Labelled)
		assert.Equal(t, 8, s.Unprocessed)
	})

	t.Run("agent exiting without a reply is an execution error", func(t *testing.T) {
		t.Parallel()
		cfg := testConfig(t, "a", "b", "c")
		handler := func(call int, items []PromptItem) (*Result, error) {
			if call > 1 {
				return &Result{}, nil
			}
			return replyWith(items, defaultLabel), nil
		}
		agent := &fakeAgent{handler: handler}
		s, _, err := runLabeler(t, cfg, agent)
		require.NoError(t, err)
		assert.Len(t, agent.labelCalls(), 3, "never split")
		assert.Equal(t, 2, s.Unprocessed)
		assert.Equal(t, 0, s.Failed)
	})

	t.Run("preflight execution errors are fatal and not retried", func(t *testing.T) {
		t.Parallel()
		cfg := testConfig(t, "a", "b", "c")
		agent := &fakeAgent{handler: func(call int, items []PromptItem) (*Result, error) {
			return &Result{Stderr: []byte("unknown model"), ExitCode: 1}, nil
		}}
		s, _, err := runLabeler(t, cfg, agent)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "preflight failed")
		assert.Contains(t, err.Error(), "unknown model")
		assert.Len(t, agent.labelCalls(), 1)
		assert.Equal(t, 3, s.Unprocessed)
	})

	t.Run("no readme in input", func(t *testing.T) {
		t.Parallel()
		dir := t.TempDir()
		input := filepath.Join(dir, "packages.jsonl")
		require.NoError(t, os.WriteFile(input, []byte(
			`{"repository_kind":0,"repository_name":"r","name":"redis"}`+"\n"+
				`{"repository_kind":0,"repository_name":"r","name":"kafka","readme":" "}`+"\n",
		), 0o600))
		cfg := &Config{
			Input:          input,
			Output:         filepath.Join(dir, "dataset.jsonl"),
			Model:          "model",
			BatchSize:      10,
			Concurrency:    1,
			Timeout:        time.Minute,
			ReadmeMaxBytes: 1000,
		}
		agent := &fakeAgent{handler: defaultHandler}
		_, progress, err := runLabeler(t, cfg, agent)
		require.ErrorIs(t, err, ErrNoReadme)
		assert.Contains(t, progress, "--no-readme")
		assert.Empty(t, agent.labelCalls())

		cfg.NoReadme = true
		s, _, err := runLabeler(t, cfg, agent)
		require.NoError(t, err)
		assert.Equal(t, 2, s.Labelled)
	})

	t.Run("invalid input", func(t *testing.T) {
		t.Parallel()
		dir := t.TempDir()
		input := filepath.Join(dir, "packages.jsonl")
		require.NoError(t, os.WriteFile(input, []byte(`{"name":"a"}`+"\n"), 0o600))
		cfg := &Config{
			Input:          input,
			Output:         filepath.Join(dir, "dataset.jsonl"),
			Model:          "model",
			BatchSize:      10,
			Concurrency:    1,
			Timeout:        time.Minute,
			ReadmeMaxBytes: 1000,
		}
		_, _, err := runLabeler(t, cfg, &fakeAgent{handler: defaultHandler})
		require.Error(t, err)
		assert.Contains(t, err.Error(), "line 1: repository_kind not provided")
	})

	t.Run("invalid existing output", func(t *testing.T) {
		t.Parallel()
		cfg := testConfig(t, "a")
		require.NoError(t, os.WriteFile(cfg.Output, []byte("{}\n"), 0o600))
		_, _, err := runLabeler(t, cfg, &fakeAgent{handler: defaultHandler})
		require.Error(t, err)
		assert.Contains(t, err.Error(), "error reading existing output")
	})

	t.Run("concurrency", func(t *testing.T) {
		t.Parallel()
		names := make([]string, 0, 41)
		for i := range 41 {
			names = append(names, fmt.Sprintf("pkg%02d", i))
		}
		cfg := testConfig(t, names...)
		cfg.BatchSize = 3
		cfg.Concurrency = 4
		agent := &fakeAgent{handler: func(call int, items []PromptItem) (*Result, error) {
			time.Sleep(time.Millisecond)
			return replyWith(items, defaultLabel), nil
		}}
		s, _, err := runLabeler(t, cfg, agent)
		require.NoError(t, err)
		assert.Equal(t, 41, s.Labelled)
		assert.Len(t, readOutput(t, cfg.Output), 41)
		assert.Len(t, agent.labelCalls(), 1+14)
	})

	t.Run("context canceled", func(t *testing.T) {
		t.Parallel()
		cfg := testConfig(t, "a", "b", "c", "d", "e")
		ctx, cancel := context.WithCancel(context.Background())
		agent := &fakeAgent{t: t, handler: func(call int, items []PromptItem) (*Result, error) {
			if call == 2 {
				cancel()
				return nil, context.Canceled
			}
			return replyWith(items, defaultLabel), nil
		}}
		l, err := New(cfg, &fakeRunner{}, agent, nil)
		require.NoError(t, err)
		s, err := l.Run(ctx)
		require.ErrorIs(t, err, context.Canceled)
		assert.Equal(t, 1, s.Labelled)
		assert.Len(t, agent.labelCalls(), 2)
	})
}

func TestSummaryWrite(t *testing.T) {
	t.Parallel()

	s := &Summary{
		Output:      "dataset.jsonl",
		Failures:    "dataset.failures.jsonl",
		Packages:    10,
		ContentKeys: 8,
		Selected:    8,
		Labelled:    6,
		Failed:      1,
		Unprocessed: 1,
		Labels:      map[string]int{"database": 4, "none": 2},
	}
	var b strings.Builder
	require.NoError(t, s.Write(&b))
	out := b.String()
	assert.Contains(t, out, "Labelled in this run:  6\n")
	assert.Contains(t, out, "Failures:              dataset.failures.jsonl\n")
	assert.Contains(t, out, "  database")
	assert.Less(t, strings.Index(out, "  database"), strings.Index(out, "  none"))
}

// testGroups returns a group for each of the package names provided, in the
// same order.
func testGroups(names ...string) []*Group {
	groups := make([]*Group, 0, len(names))
	for _, name := range names {
		groups = append(groups, GroupPackages([]*Package{{RepositoryName: "repo", Name: name}})[0])
	}
	return groups
}

// itemNames returns the names of the items provided.
func itemNames(items []PromptItem) []string {
	names := make([]string, 0, len(items))
	for _, item := range items {
		names = append(names, item.Name)
	}
	return names
}

func TestProcessBatch(t *testing.T) {
	t.Parallel()

	newLabeler := func(t *testing.T, handler fakeHandler) (*Labeler, *fakeAgent) {
		t.Helper()
		agent := &fakeAgent{t: t, handler: handler}
		cfg := &Config{Input: "in", Output: "out", Model: "m", BatchSize: 10, Concurrency: 1, Timeout: time.Minute, NoReadme: true}
		l, err := New(cfg, &fakeRunner{}, agent, nil)
		require.NoError(t, err)
		return l, agent
	}
	rowsByName := func(res *batchResult) map[string]dataset.Row {
		rows := make(map[string]dataset.Row)
		for _, row := range res.rows {
			rows[row.Name] = row
		}
		return rows
	}

	t.Run("invalid replies are retried once and then the batch is split", func(t *testing.T) {
		t.Parallel()
		l, agent := newLabeler(t, func(call int, items []PromptItem) (*Result, error) {
			return replyWith(items, func(item PromptItem) (string, bool) {
				if item.Name == "bad" {
					return "invalid", false
				}
				return defaultLabel(item)
			}), nil
		})
		res, err := l.processBatch(context.Background(), testGroups("redis", "bad", "kafka", "grafana"), true)
		require.NoError(t, err)
		assert.Equal(t, [][]string{
			{"redis", "bad", "kafka", "grafana"},
			{"redis", "bad", "kafka", "grafana"},
			{"redis", "bad"},
			{"redis", "bad"},
			{"redis"},
			{"bad"},
			{"bad"},
			{"kafka", "grafana"},
		}, agent.labelCalls())
		rows := rowsByName(res)
		assert.Len(t, rows, 3)
		assert.Equal(t, "database", rows["redis"].Label)
		require.Len(t, res.failures, 1)
		assert.Equal(t, "bad", res.failures[0].Name)
		assert.Contains(t, res.failures[0].Error, `invalid category "invalid"`)
	})

	t.Run("a valid retry is used", func(t *testing.T) {
		t.Parallel()
		l, agent := newLabeler(t, func(call int, items []PromptItem) (*Result, error) {
			if call == 1 {
				return &Result{Stdout: []byte("not json")}, nil
			}
			return replyWith(items, defaultLabel), nil
		})
		res, err := l.processBatch(context.Background(), testGroups("redis", "kafka"), true)
		require.NoError(t, err)
		assert.Len(t, agent.labelCalls(), 2)
		assert.Len(t, res.rows, 2)
		assert.Empty(t, res.failures)
	})

	t.Run("batch quarantine", func(t *testing.T) {
		t.Parallel()
		l, agent := newLabeler(t, func(call int, items []PromptItem) (*Result, error) {
			withEvil := slices.Contains(itemNames(items), "evil")
			return replyWith(items, func(item PromptItem) (string, bool) {
				switch {
				case item.Name == "evil":
					return "security", true
				case withEvil && item.Name == "redis":
					// Steered by the flagged package
					return "security", false
				case !withEvil && item.Name == "kafka":
					// Only flagged when labelled again
					return "streaming-messaging", true
				default:
					return defaultLabel(item)
				}
			}), nil
		})
		res, err := l.processBatch(context.Background(), testGroups("a", "evil", "redis", "kafka", "grafana"), true)
		require.NoError(t, err)

		// The other packages were labelled again without the flagged one
		assert.Equal(t, [][]string{
			{"a", "evil", "redis", "kafka", "grafana"},
			{"a", "redis", "kafka", "grafana"},
		}, agent.labelCalls())

		rows := rowsByName(res)
		require.Len(t, rows, 5)
		assert.Empty(t, res.failures)

		// The flagged package keeps its label
		assert.Equal(t, "security", rows["evil"].Label)
		assert.True(t, rows["evil"].Suspicious)
		assert.False(t, rows["evil"].NeedsReview)

		// A label that changed gets the second label and needs review
		assert.Equal(t, "database", rows["redis"].Label)
		assert.True(t, rows["redis"].NeedsReview)
		assert.False(t, rows["redis"].Suspicious)

		// A label that didn't change is kept, flagged if it was flagged the
		// second time
		assert.Equal(t, "streaming-messaging", rows["kafka"].Label)
		assert.True(t, rows["kafka"].Suspicious)
		assert.False(t, rows["kafka"].NeedsReview)
		for _, name := range []string{"a", "grafana"} {
			assert.False(t, rows[name].Suspicious, name)
			assert.False(t, rows[name].NeedsReview, name)
		}
	})

	t.Run("batch quarantine relabel failures need review", func(t *testing.T) {
		t.Parallel()
		l, _ := newLabeler(t, func(call int, items []PromptItem) (*Result, error) {
			if !slices.Contains(itemNames(items), "evil") {
				return &Result{Stdout: []byte("invalid")}, nil
			}
			return replyWith(items, func(item PromptItem) (string, bool) {
				category, _ := defaultLabel(item)
				return category, item.Name == "evil"
			}), nil
		})
		res, err := l.processBatch(context.Background(), testGroups("evil", "redis", "kafka"), true)
		require.NoError(t, err)
		rows := rowsByName(res)
		require.Len(t, rows, 3)
		assert.Empty(t, res.failures)
		assert.False(t, rows["evil"].NeedsReview)
		assert.Equal(t, "database", rows["redis"].Label)
		assert.True(t, rows["redis"].NeedsReview)
		assert.Equal(t, "streaming-messaging", rows["kafka"].Label)
		assert.True(t, rows["kafka"].NeedsReview)
	})

	t.Run("batch quarantine execution error leaves the batch unprocessed", func(t *testing.T) {
		t.Parallel()
		l, _ := newLabeler(t, func(call int, items []PromptItem) (*Result, error) {
			if !slices.Contains(itemNames(items), "evil") {
				return &Result{ExitCode: 1}, nil
			}
			return replyWith(items, func(item PromptItem) (string, bool) {
				category, _ := defaultLabel(item)
				return category, item.Name == "evil"
			}), nil
		})
		res, err := l.processBatch(context.Background(), testGroups("evil", "redis"), false)
		assert.True(t, isExecError(err))
		assert.Nil(t, res)
	})

	t.Run("no quarantine when every package is flagged", func(t *testing.T) {
		t.Parallel()
		l, agent := newLabeler(t, func(call int, items []PromptItem) (*Result, error) {
			return replyWith(items, func(item PromptItem) (string, bool) { return catalog.None, true }), nil
		})
		res, err := l.processBatch(context.Background(), testGroups("a", "b"), true)
		require.NoError(t, err)
		assert.Len(t, agent.labelCalls(), 1)
		for _, row := range res.rows {
			assert.True(t, row.Suspicious)
			assert.False(t, row.NeedsReview)
		}
	})
}
