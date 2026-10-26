package labeler

import (
	"context"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"slices"
	"strings"
	"time"
)

// AgentCopilot represents the GitHub Copilot CLI, the only agent supported.
const AgentCopilot = "copilot"

// AuthSubscription represents the only auth mode supported: the agent is
// used through its subscription, never with API keys.
const AuthSubscription = "subscription"

// Runner describes the methods a Runner implementation must provide. A
// runner knows how to invoke an agent CLI non-interactively and locked down
// as far as possible, and how to interpret its output.
type Runner interface {
	// Agent returns the name of the agent.
	Agent() string

	// Binary returns the name of the agent's CLI binary.
	Binary() string

	// BuildArgs returns the arguments used to label packages. Every argument
	// is built by the runner: nothing is passed through from the user.
	BuildArgs(inv *Invocation) []string

	// BuildEnv returns the whole environment of the agent's process. Only
	// allowlisted variables are included.
	BuildEnv(inv *Invocation) []string

	// BuildStdin returns the agent's stdin from the prompt provided.
	BuildStdin(prompt []byte) []byte

	// CheckAuth checks that the agent is authenticated with a subscription,
	// returning the auth method reported. The function provided runs the
	// agent's binary with the arguments provided and exactly the same
	// environment used to label packages.
	CheckAuth(ctx context.Context, run RunFunc) (string, error)

	// ParseOutput returns the reply from the output of a successful run. An
	// ExecError is returned when the agent reported an error or exited
	// without a reply.
	ParseOutput(res *Result, inv *Invocation) ([]byte, error)

	// ClassifyError returns ErrUsageLimit or ErrAuth (wrapped) when the
	// failed run provided was caused by a usage limit or an authentication
	// problem. It returns nil otherwise.
	ClassifyError(res *Result) error

	// LoginHint returns a message explaining how to authenticate the agent
	// again.
	LoginHint() string
}

// RunFunc represents a function that runs the agent's binary with the
// arguments provided.
type RunFunc func(args ...string) (*Result, error)

// Invocation represents the temporary files and directories used by an
// agent's invocation.
type Invocation struct {
	// Dir represents the working directory: a fresh, empty directory that is
	// not a git repository.
	Dir string

	// Home represents the temporary directory used as HOME, so that the
	// agent can't see the user's settings, instructions, skills, plugins,
	// hooks or MCP servers.
	Home string

	// ConfigDir represents an empty temporary directory the agent uses for
	// its configuration and state, so that every invocation starts clean.
	ConfigDir string
}

// newInvocation creates the temporary files and directories of a new
// invocation. The function returned removes them.
func newInvocation() (*Invocation, func(), error) {
	root, err := os.MkdirTemp("", "artifacthub-category-")
	if err != nil {
		return nil, nil, err
	}
	cleanup := func() { _ = os.RemoveAll(root) }
	inv := &Invocation{
		Dir:       filepath.Join(root, "work"),
		Home:      filepath.Join(root, "home"),
		ConfigDir: filepath.Join(root, "config"),
	}
	for _, dir := range []string{inv.Dir, inv.Home, inv.ConfigDir} {
		if err := os.Mkdir(dir, 0o700); err != nil {
			cleanup()
			return nil, nil, err
		}
	}
	return inv, cleanup, nil
}

// RunnerOptions represents the options used to create a runner.
type RunnerOptions struct {
	// Model represents the model to use (required).
	Model string

	// Effort represents the reasoning effort level to use (optional).
	Effort string

	// AgentHome represents the dedicated directory that holds the agent's
	// login or token.
	AgentHome string

	// Environ represents the tool's environment (as returned by
	// os.Environ). Only allowlisted variables are passed to the agent.
	Environ []string
}

var (
	// modelRE is the regular expression used to validate model ids. They
	// can't start with a dash, so they can't be confused with flags.
	modelRE = regexp.MustCompile(`^[A-Za-z0-9][A-Za-z0-9._:/@\[\]+-]*$`)

	// effortRE is the regular expression used to validate effort levels.
	effortRE = regexp.MustCompile(`^[a-z]+$`)
)

// NewRunner creates a new Copilot runner. It refuses to create it when the
// environment or the agent home are not safe to use, or when the agent's
// credentials are not valid.
func NewRunner(opts *RunnerOptions) (Runner, error) {
	if err := checkEnviron(opts.Environ); err != nil {
		return nil, err
	}
	if !modelRE.MatchString(opts.Model) {
		return nil, fmt.Errorf("invalid model %q", opts.Model)
	}
	if opts.Effort != "" && !effortRE.MatchString(opts.Effort) {
		return nil, fmt.Errorf("invalid effort %q", opts.Effort)
	}
	if opts.AgentHome == "" {
		return nil, errors.New("agent home not provided")
	}

	// The agent is run in a temporary working directory, so the agent home
	// must be absolute
	agentHome, err := filepath.Abs(opts.AgentHome)
	if err != nil {
		return nil, fmt.Errorf("error resolving agent home: %w", err)
	}
	o := *opts
	o.AgentHome = agentHome
	opts = &o

	info, err := os.Stat(opts.AgentHome)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return nil, fmt.Errorf("agent home %s does not exist (see the setup instructions in docs/dev.md)", opts.AgentHome)
		}
		return nil, fmt.Errorf("error checking agent home: %w", err)
	}
	if !info.IsDir() {
		return nil, fmt.Errorf("agent home %s is not a directory", opts.AgentHome)
	}

	return newCopilotRunner(opts)
}

// DefaultAgentHome returns the default agent home:
// $XDG_STATE_HOME/artifacthub-category/copilot, or
// ~/.local/state/artifacthub-category/copilot when XDG_STATE_HOME is not
// set.
func DefaultAgentHome(environ []string) (string, error) {
	if stateHome, _ := lookupEnv(environ, "XDG_STATE_HOME"); stateHome != "" {
		return filepath.Join(stateHome, "artifacthub-category", AgentCopilot), nil
	}
	home, _ := lookupEnv(environ, "HOME")
	if home == "" {
		return "", errors.New("neither XDG_STATE_HOME nor HOME are set")
	}
	return filepath.Join(home, ".local", "state", "artifacthub-category", AgentCopilot), nil
}

// passthroughEnvVars represents the variables of the tool's environment that
// are passed to the agent when they're set (proxy and CA settings).
var passthroughEnvVars = []string{
	"HTTPS_PROXY",
	"https_proxy",
	"NO_PROXY",
	"no_proxy",
	"SSL_CERT_FILE",
	"NODE_EXTRA_CA_CERTS",
}

// baseEnv returns the base environment of the agent: PATH, the temporary
// HOME and the proxy and CA variables that are set.
func baseEnv(inv *Invocation, environ []string) []string {
	env := []string{"HOME=" + inv.Home}
	if path, ok := lookupEnv(environ, "PATH"); ok {
		env = append(env, "PATH="+path)
	}
	for _, name := range passthroughEnvVars {
		if value, _ := lookupEnv(environ, name); value != "" {
			env = append(env, name+"="+value)
		}
	}
	return env
}

// lookupEnv returns the value of the variable provided in the environment
// provided, and whether it's set.
func lookupEnv(environ []string, name string) (string, bool) {
	for i := len(environ) - 1; i >= 0; i-- {
		if k, v, ok := strings.Cut(environ[i], "="); ok && k == name {
			return v, true
		}
	}
	return "", false
}

// checkEnviron checks that the tool's environment doesn't contain variables
// that would make the agent unsafe to use if they ever reached it.
func checkEnviron(environ []string) error {
	for _, kv := range environ {
		name, _, _ := strings.Cut(kv, "=")
		if name == "COPILOT_ALLOW_ALL" || strings.HasPrefix(name, "COPILOT_PROVIDER_") {
			return fmt.Errorf("refusing to start: %s is set, please unset it", name)
		}
	}
	return nil
}

// deniedArgs represents the arguments that must never be passed to the
// agent.
var deniedArgs = []string{
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
	"-r",
	"--continue",
	"--session-id",
	"--interactive",
	"-i",
	"--acp",
	"-p",
	"--prompt",
}

// deniedEnvVars represents the environment variables that must never be
// passed to the agent: other credentials (only the agent home's token is
// used) and variables that override the arguments used.
var deniedEnvVars = []string{
	"COPILOT_ALLOW_ALL",
	"COPILOT_MODEL",
	"COPILOT_OFFLINE",
	"GH_TOKEN",
	"GITHUB_TOKEN",
}

// copilotDeniedTools represents the tools always denied to Copilot.
var copilotDeniedTools = []string{"shell", "write", "url"}

// checkArgs checks that the arguments provided don't contain any denied
// argument, and that the tool filter that exposes no tools is used. It's run
// before every invocation.
func checkArgs(args []string) error {
	filters := 0
	for i, arg := range args {
		for _, d := range deniedArgs {
			if arg == d || strings.HasPrefix(arg, d+"=") {
				return fmt.Errorf("denied argument %q", arg)
			}
		}
		if arg == "--excluded-tools" || strings.HasPrefix(arg, "--excluded-tools=") ||
			strings.HasPrefix(arg, "--available-tools=") {
			return fmt.Errorf("denied argument %q", arg)
		}
		if arg == "--available-tools" {
			if i+1 >= len(args) || args[i+1] != copilotNoTools {
				return errors.New("the tool filter must expose no tools")
			}
			filters++
		}
	}
	if filters != 1 {
		return errors.New("the tool filter that exposes no tools is required")
	}
	for _, tool := range copilotDeniedTools {
		if !containsSequence(args, "--deny-tool", tool) {
			return fmt.Errorf("--deny-tool %s is required", tool)
		}
	}
	return nil
}

// checkEnv checks that the environment provided doesn't contain any denied
// variable. It's run before every invocation.
func checkEnv(env []string) error {
	for _, kv := range env {
		name, _, _ := strings.Cut(kv, "=")
		if slices.Contains(deniedEnvVars, name) || strings.HasPrefix(name, "COPILOT_PROVIDER_") {
			return fmt.Errorf("denied environment variable %s", name)
		}
	}
	return nil
}

// containsSequence checks if the arguments provided contain the sequence
// provided.
func containsSequence(args []string, seq ...string) bool {
	for i := 0; i+len(seq) <= len(args); i++ {
		if slices.Equal(args[i:i+len(seq)], seq) {
			return true
		}
	}
	return false
}

// readTokenFile reads a token from the file provided. The file must be a
// regular file that is not accessible by the group or others (mode 0600).
func readTokenFile(path string) (string, error) {
	info, err := os.Stat(path)
	if err != nil {
		return "", fmt.Errorf("error reading token file: %w", err)
	}
	if !info.Mode().IsRegular() {
		return "", fmt.Errorf("token file %s is not a regular file", path)
	}
	if info.Mode().Perm()&0o077 != 0 {
		return "", fmt.Errorf("token file %s must be mode 0600 (it's %#o)", path, info.Mode().Perm())
	}
	data, err := os.ReadFile(path)
	if err != nil {
		return "", fmt.Errorf("error reading token file: %w", err)
	}
	token := strings.TrimSpace(string(data))
	if token == "" {
		return "", fmt.Errorf("token file %s is empty", path)
	}
	if strings.ContainsFunc(token, func(r rune) bool { return r <= ' ' }) {
		return "", fmt.Errorf("token file %s must contain only the token", path)
	}
	return token, nil
}

// session runs the agent's invocations using a runner and an executor.
type session struct {
	runner  Runner
	ex      Executor
	timeout time.Duration
}

// label runs the agent to label packages with the prompt provided, returning
// its reply.
func (s *session) label(ctx context.Context, prompt []byte) ([]byte, error) {
	inv, cleanup, err := newInvocation()
	if err != nil {
		return nil, err
	}
	defer cleanup()

	args := s.runner.BuildArgs(inv)
	if err := checkArgs(args); err != nil {
		return nil, err
	}
	res, err := s.execute(ctx, inv, args, s.runner.BuildStdin(prompt))
	if err != nil {
		return nil, err
	}
	if err := s.checkResult(res); err != nil {
		return nil, err
	}
	reply, err := s.runner.ParseOutput(res, inv)
	if err != nil {
		var execErr *ExecError
		if errors.As(err, &execErr) && execErr.Err == nil {
			execErr.Err = s.runner.ClassifyError(res)
		}
		return nil, err
	}
	return reply, nil
}

// checkAuth checks that the agent is authenticated with a subscription,
// returning the auth method reported.
func (s *session) checkAuth(ctx context.Context) (string, error) {
	inv, cleanup, err := newInvocation()
	if err != nil {
		return "", err
	}
	defer cleanup()

	return s.runner.CheckAuth(ctx, func(args ...string) (*Result, error) {
		return s.execute(ctx, inv, args, nil)
	})
}

// versionRE is the regular expression used to extract the agent's version.
var versionRE = regexp.MustCompile(`\d+(?:\.\d+)+(?:-[0-9A-Za-z.]*[0-9A-Za-z])?`)

// version returns the version of the agent's CLI.
func (s *session) version(ctx context.Context) (string, error) {
	inv, cleanup, err := newInvocation()
	if err != nil {
		return "", err
	}
	defer cleanup()

	res, err := s.execute(ctx, inv, []string{"--version"}, nil)
	if err != nil {
		return "", err
	}
	if err := s.checkResult(res); err != nil {
		return "", err
	}
	firstLine, _, _ := strings.Cut(string(res.Stdout), "\n")
	v := versionRE.FindString(firstLine)
	if v == "" {
		return "", fmt.Errorf("%s: version not found in %q", s.runner.Agent(), firstLine)
	}
	return v, nil
}

// execute runs the agent's binary with the arguments and stdin provided,
// using the invocation's environment and working directory.
func (s *session) execute(ctx context.Context, inv *Invocation, args []string, stdin []byte) (*Result, error) {
	env := s.runner.BuildEnv(inv)
	if err := checkEnv(env); err != nil {
		return nil, err
	}
	res, err := s.ex.Execute(ctx, &Command{
		Path:    s.runner.Binary(),
		Args:    args,
		Env:     env,
		Dir:     inv.Dir,
		Stdin:   stdin,
		Timeout: s.timeout,
	})
	if err != nil {
		if ctx.Err() != nil {
			return nil, ctx.Err()
		}
		return nil, &ExecError{Agent: s.runner.Agent(), Msg: "error running " + s.runner.Binary(), Err: err}
	}
	return res, nil
}

// checkResult returns an ExecError when the result provided corresponds to a
// failed run (timed out, killed or a non-zero exit code).
func (s *session) checkResult(res *Result) error {
	switch {
	case res.TimedOut:
		return &ExecError{
			Agent:  s.runner.Agent(),
			Msg:    fmt.Sprintf("timed out after %s", s.timeout),
			Output: tail(res.Stderr),
		}
	case res.ExitCode != 0:
		return &ExecError{
			Agent:  s.runner.Agent(),
			Msg:    fmt.Sprintf("exited with code %d", res.ExitCode),
			Err:    s.runner.ClassifyError(res),
			Output: tail(res.Stderr),
		}
	}
	return nil
}
