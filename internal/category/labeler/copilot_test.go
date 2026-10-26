package labeler

import (
	"context"
	"errors"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// readCopilotSample reads a sample captured from a real Copilot CLI run.
func readCopilotSample(t *testing.T, name string) []byte {
	t.Helper()
	data, err := os.ReadFile(filepath.Join("testdata", "copilot", name))
	require.NoError(t, err)
	return data
}

func TestCopilotRunner(t *testing.T) {
	t.Parallel()

	t.Run("check auth reports the token kind without running anything", func(t *testing.T) {
		t.Parallel()

		testCases := []struct {
			token              string
			expectedAuthMethod string
		}{
			{"github_pat_x", "fine-grained-pat"},
			{"gho_x", "oauth-token"},
			{"ghu_x", "github-token"},
		}
		for _, tc := range testCases {
			home := newTestAgentHome(t, map[string]string{copilotTokenFile: tc.token})
			r, err := NewRunner(&RunnerOptions{Model: "m", AgentHome: home})
			require.NoError(t, err)
			authMethod, err := r.CheckAuth(context.Background(), func(args ...string) (*Result, error) {
				t.Fatal("unexpected run")
				return nil, nil
			})
			require.NoError(t, err)
			assert.Equal(t, tc.expectedAuthMethod, authMethod)
		}
	})

	t.Run("parse output", func(t *testing.T) {
		t.Parallel()

		testCases := []struct {
			desc          string
			stdout        string
			expectedReply string
		}{
			{"plain json", `{"labels":[]}`, `{"labels":[]}`},
			{"code block", "```json\n{\"labels\":[]}\n```\n", `{"labels":[]}`},
			{"surrounding text", "Here you go:\n{\"labels\":[]}\nDone.", `{"labels":[]}`},
			{"wrapped in the middle of a string", "{\"labels\":[{\"id\":\"p1\",\"category\":\"monitoring-log\nging\"}]}\n", `{"labels":[{"id":"p1","category":"monitoring-logging"}]}`},
			{"crlf line breaks", "{\"labels\":\r\n[]}\r\n", `{"labels":[]}`},
			{"no json", "I can't do that", "I can't do that"},
		}
		for _, tc := range testCases {
			t.Run(tc.desc, func(t *testing.T) {
				t.Parallel()
				r := newTestRunner(t, &RunnerOptions{Model: "m"})
				reply, err := r.ParseOutput(&Result{Stdout: []byte(tc.stdout)}, testInvocation)
				require.NoError(t, err)
				assert.Equal(t, tc.expectedReply, string(reply))
			})
		}

		t.Run("reply wrapped at 100 columns by copilot", func(t *testing.T) {
			t.Parallel()
			stdout := readCopilotSample(t, "stdout-wrapped-reply.txt")
			for _, line := range strings.Split(strings.TrimSpace(string(stdout)), "\n")[:5] {
				require.Len(t, line, 100, "the sample is wrapped")
			}
			r := newTestRunner(t, &RunnerOptions{Model: "m"})
			reply, err := r.ParseOutput(&Result{Stdout: stdout}, testInvocation)
			require.NoError(t, err)
			labels, err := ParseReply(reply, 25)
			require.NoError(t, err)
			assert.Len(t, labels, 25)
			assert.Equal(t, "monitoring-logging", labels[3].Category)
		})

		t.Run("no reply", func(t *testing.T) {
			t.Parallel()
			r := newTestRunner(t, &RunnerOptions{Model: "m"})
			var execErr *ExecError
			_, err := r.ParseOutput(&Result{Stdout: []byte(" \n")}, testInvocation)
			assert.ErrorAs(t, err, &execErr)
		})
	})

	t.Run("classify error", func(t *testing.T) {
		t.Parallel()

		// Samples captured from Copilot CLI 1.0.104
		testCases := []struct {
			desc        string
			stderr      []byte
			expectedErr error
		}{
			{"no token", readCopilotSample(t, "stderr-no-token.txt"), ErrAuth},
			{"invalid token", readCopilotSample(t, "stderr-invalid-token.txt"), ErrAuth},
			{"network failure", readCopilotSample(t, "stderr-network-failure.txt"), nil},
			// PROVISIONAL samples (see the comment on the copilot error
			// patterns): they must be replaced by a sample captured from a
			// real run.
			{"rate limit", []byte("Error: You have exceeded your rate limit. Please try again later."), ErrUsageLimit},
			{"premium requests", []byte("Error: You have no premium requests remaining this month."), ErrUsageLimit},
			{"quota", []byte("Error: Quota exceeded"), ErrUsageLimit},
			{"auth error followed by many lines", []byte("Error: Bad credentials\n" + repeatLines("x", classifyLines)), nil},
			{"auth error in echoed packages", []byte("<packages>\nBad credentials\n" + dataBlockEnd + "\nError: fetch failed\n"), nil},
		}
		for _, tc := range testCases {
			t.Run(tc.desc, func(t *testing.T) {
				t.Parallel()
				r := newTestRunner(t, &RunnerOptions{Model: "m"})
				err := r.ClassifyError(&Result{Stderr: tc.stderr, ExitCode: 1})
				if tc.expectedErr == nil {
					assert.NoError(t, err)
				} else {
					assert.ErrorIs(t, err, tc.expectedErr)
				}
			})
		}
	})

	t.Run("system prompt goes at the top of stdin", func(t *testing.T) {
		t.Parallel()
		r := newTestRunner(t, &RunnerOptions{Model: "m"})
		stdin := r.BuildStdin([]byte("prompt"))
		assert.Equal(t, SystemPrompt+"\nprompt", string(stdin))
	})

	t.Run("login hint", func(t *testing.T) {
		t.Parallel()
		r := newTestRunner(t, &RunnerOptions{Model: "m"})
		assert.Contains(t, r.LoginHint(), "Copilot Requests")
	})
}

func TestSession(t *testing.T) {
	t.Parallel()

	newSession := func(t *testing.T, fn func(cmd *Command) (*Result, error)) *session {
		t.Helper()
		r := newTestRunner(t, &RunnerOptions{Model: "m"})
		return &session{runner: r, ex: executorFunc(fn), timeout: DefaultTimeout}
	}

	t.Run("label runs the agent in a clean invocation", func(t *testing.T) {
		t.Parallel()
		var dirs []string
		s := newSession(t, func(cmd *Command) (*Result, error) {
			root := filepath.Dir(cmd.Dir)
			assert.Equal(t, "copilot", cmd.Path)
			assert.Equal(t, DefaultTimeout, cmd.Timeout)
			assert.Equal(t, SystemPrompt+"\nprompt", string(cmd.Stdin))
			assert.Equal(t, []string{"-C", cmd.Dir}, cmd.Args[:2])
			assert.Contains(t, cmd.Env, "HOME="+filepath.Join(root, "home"))
			assert.Contains(t, cmd.Env, "COPILOT_HOME="+filepath.Join(root, "config"))
			for _, dir := range []string{cmd.Dir, filepath.Join(root, "home"), filepath.Join(root, "config")} {
				entries, err := os.ReadDir(dir)
				require.NoError(t, err)
				assert.Empty(t, entries, dir)
			}
			assert.NoError(t, checkEnv(cmd.Env))
			assert.NoError(t, checkArgs(cmd.Args))
			dirs = append(dirs, root)
			return &Result{Stdout: []byte("{\"labels\":\n[]}\n")}, nil
		})
		for range 2 {
			reply, err := s.label(context.Background(), []byte("prompt"))
			require.NoError(t, err)
			assert.JSONEq(t, `{"labels":[]}`, string(reply))
		}
		require.Len(t, dirs, 2)
		assert.NotEqual(t, dirs[0], dirs[1], "every invocation starts clean")
		for _, dir := range dirs {
			assert.NoDirExists(t, dir)
		}
	})

	t.Run("label classifies failed runs", func(t *testing.T) {
		t.Parallel()
		s := newSession(t, func(cmd *Command) (*Result, error) {
			return &Result{Stderr: readCopilotSample(t, "stderr-invalid-token.txt"), ExitCode: 1}, nil
		})
		_, err := s.label(context.Background(), []byte("prompt"))
		var execErr *ExecError
		require.ErrorAs(t, err, &execErr)
		assert.ErrorIs(t, err, ErrAuth)
		assert.Contains(t, err.Error(), "exited with code 1")
	})

	t.Run("label timeout", func(t *testing.T) {
		t.Parallel()
		s := newSession(t, func(cmd *Command) (*Result, error) {
			return &Result{TimedOut: true, ExitCode: -1}, nil
		})
		_, err := s.label(context.Background(), []byte("prompt"))
		var execErr *ExecError
		require.ErrorAs(t, err, &execErr)
		assert.Contains(t, err.Error(), "timed out")
		assert.True(t, isExecError(err))
	})

	t.Run("label start error", func(t *testing.T) {
		t.Parallel()
		s := newSession(t, func(cmd *Command) (*Result, error) {
			return nil, errors.New("executable file not found in $PATH")
		})
		_, err := s.label(context.Background(), []byte("prompt"))
		assert.True(t, isExecError(err))
	})

	t.Run("label context canceled", func(t *testing.T) {
		t.Parallel()
		ctx, cancel := context.WithCancel(context.Background())
		s := newSession(t, func(cmd *Command) (*Result, error) {
			cancel()
			return nil, context.Canceled
		})
		_, err := s.label(ctx, []byte("prompt"))
		assert.ErrorIs(t, err, context.Canceled)
		assert.False(t, isExecError(err))
	})

	t.Run("check auth doesn't run anything", func(t *testing.T) {
		t.Parallel()
		s := newSession(t, func(cmd *Command) (*Result, error) {
			t.Fatal("unexpected run")
			return nil, nil
		})
		authMethod, err := s.checkAuth(context.Background())
		require.NoError(t, err)
		assert.Equal(t, "fine-grained-pat", authMethod)
	})

	t.Run("version", func(t *testing.T) {
		t.Parallel()

		testCases := []struct {
			stdout          string
			expectedVersion string
		}{
			{"GitHub Copilot CLI 1.0.104.\nRun 'copilot update' to check for updates.\n", "1.0.104"},
			{"GitHub Copilot CLI 1.1.0-beta.2.\n", "1.1.0-beta.2"},
		}
		for _, tc := range testCases {
			s := newSession(t, func(cmd *Command) (*Result, error) {
				assert.Equal(t, []string{"--version"}, cmd.Args)
				return &Result{Stdout: []byte(tc.stdout)}, nil
			})
			v, err := s.version(context.Background())
			require.NoError(t, err)
			assert.Equal(t, tc.expectedVersion, v)
		}

		s := newSession(t, func(cmd *Command) (*Result, error) {
			return &Result{Stdout: []byte("unknown\n")}, nil
		})
		_, err := s.version(context.Background())
		assert.Error(t, err)
	})
}

// executorFunc is an Executor implementation backed by a function.
type executorFunc func(cmd *Command) (*Result, error)

// Execute implements the Executor interface.
func (f executorFunc) Execute(ctx context.Context, cmd *Command) (*Result, error) {
	return f(cmd)
}

// repeatLines returns n lines with the text provided.
func repeatLines(text string, n int) string {
	var s string
	for range n {
		s += text + "\n"
	}
	return s
}
