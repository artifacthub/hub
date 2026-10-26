package labeler

import (
	"bytes"
	"context"
	"fmt"
	"path/filepath"
	"regexp"
	"slices"
	"strings"
)

const (
	// copilotTokenFile represents the name of the file in the agent home that
	// contains the GitHub token used by Copilot.
	copilotTokenFile = "github-token" // #nosec G101 -- file name, not a credential

	// copilotNoTools represents the only entry of the tool filter passed to
	// Copilot. It doesn't match any tool, so no tools are available to the
	// model. Passing an empty filter doesn't work: Copilot ignores it and
	// exposes all its tools.
	copilotNoTools = "artifacthub-no-tools"

	// classifyLines represents the number of lines at the end of stderr used
	// to classify errors.
	classifyLines = 10
)

// Patterns used to classify Copilot errors. They are only matched against
// the last lines of stderr.
//
// The authentication patterns match the samples captured from Copilot CLI
// 1.0.104 (missing token, and token rejected with a 401). Network failures
// report that the token "could not be validated" too, but they don't match
// them, so they're not reported as login problems. PROVISIONAL: no sample of
// a usage limit error has been captured yet, so the usage limit pattern is
// based on the documentation and must be replaced when one is captured.
var (
	copilotUsageLimitRE = regexp.MustCompile(`(?i)rate[ _-]?limit|too many requests|\b429\b|quota|premium requests|usage limit`)
	copilotAuthRE       = regexp.MustCompile(`(?i)\b401\b|unauthorized|bad credentials|not authenticated|no authentication information|authentication (failed|required)|invalid token|token (is |has )?expired|not authorized to use copilot`)
)

// copilotRunner is a Runner implementation for the GitHub Copilot CLI.
type copilotRunner struct {
	opts      *RunnerOptions
	token     string
	tokenFile string
}

// newCopilotRunner creates a new copilotRunner instance.
func newCopilotRunner(opts *RunnerOptions) (*copilotRunner, error) {
	switch opts.Effort {
	case "", "none", "minimal", "low", "medium", "high", "xhigh", "max":
	default:
		return nil, fmt.Errorf("invalid effort %q (copilot supports: none, minimal, low, medium, high, xhigh, max)", opts.Effort)
	}
	tokenFile := filepath.Join(opts.AgentHome, copilotTokenFile)
	token, err := readTokenFile(tokenFile)
	if err != nil {
		return nil, fmt.Errorf("%w (%s)", err, copilotTokenHint(tokenFile))
	}
	if strings.HasPrefix(token, "ghp_") {
		return nil, fmt.Errorf("%s contains a classic personal access token, which Copilot doesn't support (%s)", tokenFile, copilotTokenHint(tokenFile))
	}
	return &copilotRunner{
		opts:      opts,
		token:     token,
		tokenFile: tokenFile,
	}, nil
}

// copilotTokenHint returns a message explaining how to create the token used
// by Copilot.
func copilotTokenHint(tokenFile string) string {
	return fmt.Sprintf(`create a fine-grained personal access token with only the "Copilot Requests" permission and save it in %s (mode 0600)`, tokenFile)
}

// Agent implements the Runner interface.
func (r *copilotRunner) Agent() string {
	return AgentCopilot
}

// Binary implements the Runner interface.
func (r *copilotRunner) Binary() string {
	return "copilot"
}

// BuildArgs implements the Runner interface. Copilot is started clean: its
// working directory, HOME and COPILOT_HOME are empty temporary directories,
// so no instructions, skills, agents, plugins, MCP servers or settings are
// loaded.
func (r *copilotRunner) BuildArgs(inv *Invocation) []string {
	args := []string{
		"-C", inv.Dir,
		"-s",
		"--model", r.opts.Model,
	}
	if r.opts.Effort != "" {
		args = append(args, "--reasoning-effort", r.opts.Effort)
	}
	args = append(args,
		"--no-custom-instructions",
		"--disable-builtin-mcps",
		"--no-ask-user",
	)
	args = append(args, "--available-tools", copilotNoTools)
	for _, tool := range copilotDeniedTools {
		args = append(args, "--deny-tool", tool)
	}
	args = append(args,
		"--disallow-temp-dir",
		"--disable-client-telemetry",
		"--no-auto-update",
		"--log-level", "none",
		"--stream", "off",
		"--sync-session=off",
	)
	return args
}

// BuildEnv implements the Runner interface.
func (r *copilotRunner) BuildEnv(inv *Invocation) []string {
	env := append(baseEnv(inv, r.opts.Environ),
		"COPILOT_AUTO_UPDATE=false",
		"COPILOT_GITHUB_TOKEN="+r.token,
		"COPILOT_HOME="+inv.ConfigDir,
	)
	slices.Sort(env)
	return env
}

// BuildStdin implements the Runner interface. Copilot has no system prompt
// option, so the system prompt goes at the top of stdin.
func (r *copilotRunner) BuildStdin(prompt []byte) []byte {
	return slices.Concat([]byte(SystemPrompt), []byte("\n"), prompt)
}

// CheckAuth implements the Runner interface. Copilot has no login status
// command, so the single package preflight acts as the auth check. Only the
// kind of token used is reported.
func (r *copilotRunner) CheckAuth(ctx context.Context, run RunFunc) (string, error) {
	switch {
	case strings.HasPrefix(r.token, "github_pat_"):
		return "fine-grained-pat", nil
	case strings.HasPrefix(r.token, "gho_"):
		return "oauth-token", nil
	default:
		return "github-token", nil
	}
}

// ParseOutput implements the Runner interface. Copilot has no structured
// output option, so the reply is extracted from stdout. Copilot wraps its
// output at 100 columns, even when stdout is not a terminal, breaking lines
// in the middle of JSON strings, so line breaks are removed first. That
// never changes a valid JSON reply: JSON strings can't contain raw line
// breaks, and they're just whitespace elsewhere.
func (r *copilotRunner) ParseOutput(res *Result, inv *Invocation) ([]byte, error) {
	output := bytes.TrimSpace(res.Stdout)
	if len(output) == 0 {
		return nil, &ExecError{Agent: AgentCopilot, Msg: "exited without a reply", Output: tail(res.Stderr)}
	}
	output = bytes.ReplaceAll(output, []byte("\r"), nil)
	output = bytes.ReplaceAll(output, []byte("\n"), nil)
	return extractJSONObject(output), nil
}

// ClassifyError implements the Runner interface.
func (r *copilotRunner) ClassifyError(res *Result) error {
	return classifyStderr(res.Stderr, copilotUsageLimitRE, copilotAuthRE)
}

// LoginHint implements the Runner interface.
func (r *copilotRunner) LoginHint() string {
	return copilotTokenHint(r.tokenFile)
}

// classifyStderr classifies an error from the last lines of the stderr
// provided, using the usage limit and auth patterns provided. When the
// prompt is echoed to stderr, only what follows its data block is used, so
// that the packages content can't match the patterns.
func classifyStderr(stderr []byte, usageLimitRE, authRE *regexp.Regexp) error {
	if i := bytes.LastIndex(stderr, []byte("\n"+dataBlockEnd+"\n")); i >= 0 {
		stderr = stderr[i+len(dataBlockEnd)+2:]
	}
	lines := strings.Split(strings.TrimSpace(tail(stderr)), "\n")
	if len(lines) > classifyLines {
		lines = lines[len(lines)-classifyLines:]
	}
	text := strings.Join(lines, "\n")
	switch {
	case usageLimitRE.MatchString(text):
		return ErrUsageLimit
	case authRE.MatchString(text):
		return ErrAuth
	}
	return nil
}

// extractJSONObject extracts the JSON object from the text provided, which
// may be wrapped in a Markdown code block or surrounded by other text. When
// no object is found the text is returned as is (so that it fails the reply
// validation).
func extractJSONObject(text []byte) []byte {
	start := bytes.IndexByte(text, '{')
	end := bytes.LastIndexByte(text, '}')
	if start == -1 || end < start {
		return text
	}
	return text[start : end+1]
}
