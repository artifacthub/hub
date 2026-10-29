package labeler

import (
	"os"
	"path/filepath"
	"slices"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// fakeGitHubToken represents the fake token used in the tests.
const fakeGitHubToken = "github_pat_token" // #nosec G101 -- fake test token

// testInvocation represents the invocation used in the runner tests.
var testInvocation = &Invocation{
	Dir:       "/tmp/inv/work",
	Home:      "/tmp/inv/home",
	ConfigDir: "/tmp/inv/config",
}

// testEnviron represents the tool's environment used in the runner tests. It
// contains variables that must never reach the agent.
var testEnviron = []string{
	"PATH=/usr/bin:/bin",
	"HOME=/home/user",
	"XDG_CONFIG_HOME=/home/user/.config",
	"COPILOT_GITHUB_TOKEN=github_pat_other",
	"COPILOT_HOME=/home/user/.copilot",
	"COPILOT_MODEL=model",
	"COPILOT_CUSTOM_INSTRUCTIONS_DIRS=/home/user/instructions",
	"GH_TOKEN=token",
	"GITHUB_TOKEN=token",
	"DBUS_SESSION_BUS_ADDRESS=unix:path=/run/user/1000/bus",
	"SSH_AUTH_SOCK=/tmp/ssh",
}

// newTestAgentHome creates an agent home with the files provided (path
// relative to the agent home and content), using mode 0600.
func newTestAgentHome(t *testing.T, files map[string]string) string {
	t.Helper()
	dir := t.TempDir()
	for name, content := range files {
		path := filepath.Join(dir, name)
		require.NoError(t, os.MkdirAll(filepath.Dir(path), 0o700))
		require.NoError(t, os.WriteFile(path, []byte(content), 0o600))
	}
	return dir
}

// newTestRunner creates a runner using a valid agent home.
func newTestRunner(t *testing.T, opts *RunnerOptions) Runner {
	t.Helper()
	opts.AgentHome = newTestAgentHome(t, map[string]string{copilotTokenFile: fakeGitHubToken + "\n"})
	if opts.Environ == nil {
		opts.Environ = testEnviron
	}
	r, err := NewRunner(opts)
	require.NoError(t, err)
	return r
}

// envNames returns the names of the environment variables provided.
func envNames(env []string) []string {
	names := make([]string, 0, len(env))
	for _, kv := range env {
		name, _, _ := strings.Cut(kv, "=")
		names = append(names, name)
	}
	slices.Sort(names)
	return names
}

func TestRunnerGolden(t *testing.T) {
	t.Parallel()

	// Any change in the arguments or environment variables used must be
	// reviewed explicitly, as they are what keeps the agent locked down
	tail := []string{
		"--no-custom-instructions",
		"--disable-builtin-mcps",
		"--no-ask-user",
		"--available-tools", "artifacthub-no-tools",
		"--deny-tool", "shell",
		"--deny-tool", "write",
		"--deny-tool", "url",
		"--disallow-temp-dir",
		"--disable-client-telemetry",
		"--no-auto-update",
		"--log-level", "none",
		"--stream", "off",
		"--sync-session=off",
	}
	expectedEnv := []string{"COPILOT_AUTO_UPDATE", "COPILOT_GITHUB_TOKEN", "COPILOT_HOME", "HOME", "PATH"}

	testCases := []struct {
		desc         string
		opts         *RunnerOptions
		expectedArgs []string
	}{
		{
			"without effort",
			&RunnerOptions{Model: "claude-sonnet-5.5"},
			slices.Concat([]string{"-C", "/tmp/inv/work", "-s", "--model", "claude-sonnet-5.5"}, tail),
		},
		{
			"with effort",
			&RunnerOptions{Model: "claude-sonnet-5.5", Effort: "low"},
			slices.Concat([]string{"-C", "/tmp/inv/work", "-s", "--model", "claude-sonnet-5.5", "--reasoning-effort", "low"}, tail),
		},
	}
	for _, tc := range testCases {
		t.Run(tc.desc, func(t *testing.T) {
			t.Parallel()
			r := newTestRunner(t, tc.opts)
			args := r.BuildArgs(testInvocation)
			env := r.BuildEnv(testInvocation)
			assert.Equal(t, tc.expectedArgs, args)
			assert.Equal(t, expectedEnv, envNames(env))
			assert.NoError(t, checkArgs(args))
			assert.NoError(t, checkEnv(env))
		})
	}
}

func TestRunnerEnvValues(t *testing.T) {
	t.Parallel()

	t.Run("clean start with the agent home token", func(t *testing.T) {
		t.Parallel()
		r := newTestRunner(t, &RunnerOptions{Model: "m"})
		env := r.BuildEnv(testInvocation)
		assert.Equal(t, []string{
			"COPILOT_AUTO_UPDATE=false",
			"COPILOT_GITHUB_TOKEN=github_pat_token",
			"COPILOT_HOME=/tmp/inv/config",
			"HOME=/tmp/inv/home",
			"PATH=/usr/bin:/bin",
		}, env)
	})

	t.Run("proxy and ca variables are passed only when set", func(t *testing.T) {
		t.Parallel()
		environ := []string{
			"PATH=/bin",
			"HTTPS_PROXY=http://proxy:3128",
			"NO_PROXY=localhost",
			"SSL_CERT_FILE=/etc/ca.pem",
			"NODE_EXTRA_CA_CERTS=",
			"HTTP_PROXY=http://proxy:3128",
		}
		r := newTestRunner(t, &RunnerOptions{Model: "m", Environ: environ})
		env := r.BuildEnv(testInvocation)
		assert.Equal(t, []string{
			"COPILOT_AUTO_UPDATE", "COPILOT_GITHUB_TOKEN", "COPILOT_HOME", "HOME", "HTTPS_PROXY", "NO_PROXY", "PATH", "SSL_CERT_FILE",
		}, envNames(env))
		assert.Contains(t, env, "HTTPS_PROXY=http://proxy:3128")
	})
}

func TestRunnerDenylist(t *testing.T) {
	t.Parallel()

	// Arguments and environment variables that must never be used
	deniedArgs := []string{
		"--allow-all",
		"--yolo",
		"--allow-all-paths",
		"--allow-all-urls",
		"--allow-all-tools",
		"--allow-tool",
		"--allow-url",
		"--trust-folder",
		"--share",
		"--share-gist",
		"--add-dir",
		"--plugin-dir",
		"--additional-mcp-config",
		"--enable-mcp-server",
		"--enable-all-github-mcp-tools",
		"--agent",
		"--enable-memory",
		"--autopilot",
		"--fleet",
		"--mode",
		"--assisted-approval",
		"--experimental",
		"--resume",
		"--continue",
		"--session-id",
		"--interactive",
		"--acp",
		"--prompt",
		"--excluded-tools",
	}
	deniedEnv := []string{"COPILOT_ALLOW_ALL", "COPILOT_MODEL", "COPILOT_OFFLINE", "GH_TOKEN", "GITHUB_TOKEN"}

	for _, effort := range []string{"", "high"} {
		r := newTestRunner(t, &RunnerOptions{Model: "model", Effort: effort})
		args := r.BuildArgs(testInvocation)
		env := r.BuildEnv(testInvocation)
		require.NoError(t, checkArgs(args))

		// Check the arguments and environment built
		for _, arg := range args {
			for _, d := range deniedArgs {
				assert.False(t, arg == d || strings.HasPrefix(arg, d+"="), "denied argument %s", arg)
			}
		}
		for _, name := range envNames(env) {
			assert.NotContains(t, deniedEnv, name)
			assert.False(t, strings.HasPrefix(name, "COPILOT_PROVIDER_"))
		}

		// Check that the runtime checks reject every denied argument and
		// variable
		for _, d := range slices.Concat(deniedArgs, []string{"-r", "-i", "-p"}) {
			assert.Error(t, checkArgs(append(slices.Clone(args), d)), d)
			assert.Error(t, checkArgs(append(slices.Clone(args), d+"=x")), d+"=x")
		}
		for _, name := range deniedEnv {
			assert.Error(t, checkEnv(append(slices.Clone(env), name+"=x")), name)
		}
		assert.Error(t, checkEnv(append(slices.Clone(env), "COPILOT_PROVIDER_BASE_URL=x")))
	}
}

func TestCheckArgsToolFilter(t *testing.T) {
	t.Parallel()

	r := newTestRunner(t, &RunnerOptions{Model: "model"})
	args := r.BuildArgs(testInvocation)
	require.NoError(t, checkArgs(args))

	removeSequence := func(args []string, seq ...string) []string {
		for i := 0; i+len(seq) <= len(args); i++ {
			if slices.Equal(args[i:i+len(seq)], seq) {
				return slices.Concat(args[:i], args[i+len(seq):])
			}
		}
		t.Fatalf("sequence %v not found", seq)
		return nil
	}
	withoutFilter := removeSequence(args, "--available-tools", copilotNoTools)

	testCases := []struct {
		desc string
		args []string
	}{
		{"filter missing", withoutFilter},
		{"empty filter (exposes all tools)", append(slices.Clone(withoutFilter), "--available-tools", "")},
		{"empty filter with equals", append(slices.Clone(withoutFilter), "--available-tools=")},
		{"filter with a tool", append(slices.Clone(withoutFilter), "--available-tools", "view")},
		{"filter at the end without a value", append(slices.Clone(withoutFilter), "--available-tools")},
		{"filter passed twice", append(slices.Clone(args), "--available-tools", copilotNoTools)},
		{"filter with equals", append(slices.Clone(withoutFilter), "--available-tools="+copilotNoTools)},
		{"shell not denied", removeSequence(args, "--deny-tool", "shell")},
		{"write not denied", removeSequence(args, "--deny-tool", "write")},
		{"url not denied", removeSequence(args, "--deny-tool", "url")},
	}
	for _, tc := range testCases {
		t.Run(tc.desc, func(t *testing.T) {
			t.Parallel()
			assert.Error(t, checkArgs(tc.args))
		})
	}
}

func TestNewRunner(t *testing.T) {
	t.Parallel()

	testCases := []struct {
		desc        string
		files       map[string]string
		mode        os.FileMode
		opts        RunnerOptions
		expectedErr string
	}{
		{
			desc:        "model not provided",
			files:       map[string]string{copilotTokenFile: fakeGitHubToken},
			opts:        RunnerOptions{},
			expectedErr: "invalid model",
		},
		{
			desc:        "model that looks like a flag",
			files:       map[string]string{copilotTokenFile: fakeGitHubToken},
			opts:        RunnerOptions{Model: "--yolo"},
			expectedErr: "invalid model",
		},
		{
			desc:        "invalid effort",
			files:       map[string]string{copilotTokenFile: fakeGitHubToken},
			opts:        RunnerOptions{Model: "m", Effort: "high --yolo"},
			expectedErr: "invalid effort",
		},
		{
			desc:        "effort not supported",
			files:       map[string]string{copilotTokenFile: fakeGitHubToken},
			opts:        RunnerOptions{Model: "m", Effort: "ultra"},
			expectedErr: "invalid effort",
		},
		{
			desc:        "copilot allow all set in the environment",
			files:       map[string]string{copilotTokenFile: fakeGitHubToken},
			opts:        RunnerOptions{Model: "m", Environ: []string{"COPILOT_ALLOW_ALL=false"}},
			expectedErr: "COPILOT_ALLOW_ALL is set",
		},
		{
			desc:        "copilot provider variable set in the environment",
			files:       map[string]string{copilotTokenFile: fakeGitHubToken},
			opts:        RunnerOptions{Model: "m", Environ: []string{"COPILOT_PROVIDER_BASE_URL=http://x"}},
			expectedErr: "COPILOT_PROVIDER_BASE_URL is set",
		},
		{
			desc:        "token file missing",
			opts:        RunnerOptions{Model: "m"},
			expectedErr: "Copilot Requests",
		},
		{
			desc:        "token file readable by the group",
			files:       map[string]string{copilotTokenFile: fakeGitHubToken},
			mode:        0o640,
			opts:        RunnerOptions{Model: "m"},
			expectedErr: "must be mode 0600",
		},
		{
			desc:        "token file empty",
			files:       map[string]string{copilotTokenFile: " \n"},
			opts:        RunnerOptions{Model: "m"},
			expectedErr: "is empty",
		},
		{
			desc:        "token file with more than the token",
			files:       map[string]string{copilotTokenFile: fakeGitHubToken + " " + fakeGitHubToken},
			opts:        RunnerOptions{Model: "m"},
			expectedErr: "must contain only the token",
		},
		{
			desc:        "classic token",
			files:       map[string]string{copilotTokenFile: "ghp_classic"},
			opts:        RunnerOptions{Model: "m"},
			expectedErr: "classic personal access token",
		},
		{
			desc:  "valid agent home",
			files: map[string]string{copilotTokenFile: fakeGitHubToken + "\n"},
			mode:  0o400,
			opts:  RunnerOptions{Model: "claude-sonnet-5.5", Effort: "none"},
		},
	}
	for _, tc := range testCases {
		t.Run(tc.desc, func(t *testing.T) {
			t.Parallel()
			opts := tc.opts
			opts.AgentHome = newTestAgentHome(t, tc.files)
			if tc.mode != 0 {
				for name := range tc.files {
					require.NoError(t, os.Chmod(filepath.Join(opts.AgentHome, name), tc.mode))
				}
			}
			r, err := NewRunner(&opts)
			if tc.expectedErr != "" {
				require.Error(t, err)
				assert.Contains(t, err.Error(), tc.expectedErr)
				assert.Nil(t, r)
			} else {
				require.NoError(t, err)
				assert.Equal(t, AgentCopilot, r.Agent())
			}
		})
	}

	t.Run("agent home does not exist", func(t *testing.T) {
		t.Parallel()
		_, err := NewRunner(&RunnerOptions{Model: "m", AgentHome: filepath.Join(t.TempDir(), "missing")})
		require.Error(t, err)
		assert.Contains(t, err.Error(), "does not exist")
	})

	t.Run("agent home is a file", func(t *testing.T) {
		t.Parallel()
		home := newTestAgentHome(t, map[string]string{"file": "x"})
		_, err := NewRunner(&RunnerOptions{Model: "m", AgentHome: filepath.Join(home, "file")})
		require.Error(t, err)
		assert.Contains(t, err.Error(), "not a directory")
	})
}

// This test can't run in parallel, as it changes the working directory.
func TestNewRunnerRelativeAgentHome(t *testing.T) {
	parent := t.TempDir()
	t.Chdir(parent)
	require.NoError(t, os.Mkdir("copilot-home", 0o700))
	require.NoError(t, os.WriteFile(filepath.Join("copilot-home", copilotTokenFile), []byte(fakeGitHubToken), 0o600))

	opts := &RunnerOptions{Model: "m", AgentHome: "copilot-home"}
	r, err := NewRunner(opts)
	require.NoError(t, err)
	assert.Equal(t, "copilot-home", opts.AgentHome, "the caller's options are not modified")
	assert.Contains(t, r.LoginHint(), filepath.Join(parent, "copilot-home", copilotTokenFile))
}

func TestDefaultAgentHome(t *testing.T) {
	t.Parallel()

	testCases := []struct {
		desc         string
		environ      []string
		expectedHome string
		expectedErr  bool
	}{
		{
			"xdg state home set",
			[]string{"XDG_STATE_HOME=/state", "HOME=/home/user"},
			"/state/artifacthub-category/copilot",
			false,
		},
		{
			"xdg state home empty",
			[]string{"XDG_STATE_HOME=", "HOME=/home/user"},
			"/home/user/.local/state/artifacthub-category/copilot",
			false,
		},
		{
			"xdg state home not set",
			[]string{"HOME=/home/user"},
			"/home/user/.local/state/artifacthub-category/copilot",
			false,
		},
		{
			"nothing set",
			nil,
			"",
			true,
		},
	}
	for _, tc := range testCases {
		t.Run(tc.desc, func(t *testing.T) {
			t.Parallel()
			home, err := DefaultAgentHome(tc.environ)
			if tc.expectedErr {
				assert.Error(t, err)
			} else {
				require.NoError(t, err)
				assert.Equal(t, tc.expectedHome, home)
			}
		})
	}
}

func TestNewInvocation(t *testing.T) {
	t.Parallel()

	// Every invocation gets its own empty working directory, HOME and
	// COPILOT_HOME, so the agent always starts clean
	inv, cleanup, err := newInvocation()
	require.NoError(t, err)
	dirs := []string{inv.Dir, inv.Home, inv.ConfigDir}
	for _, dir := range dirs {
		entries, err := os.ReadDir(dir)
		require.NoError(t, err)
		assert.Empty(t, entries, dir)
		info, err := os.Stat(dir)
		require.NoError(t, err)
		assert.Equal(t, os.FileMode(0o700), info.Mode().Perm(), dir)
	}
	assert.Len(t, slices.Compact(slices.Sorted(slices.Values(dirs))), 3)

	inv2, cleanup2, err := newInvocation()
	require.NoError(t, err)
	defer cleanup2()
	assert.NotEqual(t, inv.ConfigDir, inv2.ConfigDir)

	cleanup()
	assert.NoDirExists(t, filepath.Dir(inv.Dir))
}
