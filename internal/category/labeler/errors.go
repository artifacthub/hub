package labeler

import (
	"errors"
	"fmt"
	"strings"
)

// maxErrorOutputLength represents the maximum number of bytes of a command's
// output included in errors.
const maxErrorOutputLength = 2048

var (
	// ErrUsageLimit indicates that the agent's subscription usage limit (or
	// rate limit) was reached. Labelling can be resumed once it resets.
	ErrUsageLimit = errors.New("usage limit reached")

	// ErrAuth indicates that the agent is not authenticated, or that its
	// login or token is no longer valid.
	ErrAuth = errors.New("authentication failed")

	// ErrInvalidReply indicates that the agent ran successfully, but its
	// reply is not valid (invalid JSON, missing, duplicated or unknown ids,
	// or invalid categories).
	ErrInvalidReply = errors.New("invalid reply")

	// ErrNoReadme indicates that no package in the input has a readme, so the
	// input was probably not exported correctly.
	ErrNoReadme = errors.New("no package in the input has a readme")

	// ErrTooManyFailures indicates that the run was stopped because too many
	// consecutive batches failed to execute.
	ErrTooManyFailures = errors.New("too many consecutive execution failures")

	// ErrOutputCategoriesChanged indicates that the existing output was
	// labelled with a different categories file, so labelling can't be
	// resumed into it.
	ErrOutputCategoriesChanged = errors.New("existing output labelled with a different categories file")
)

// ExecError represents an error executing an agent CLI: a non-zero exit, a
// timeout, the process being killed, an error reported in the CLI output or
// the CLI exiting without a reply. Usage limits and authentication errors
// are execution errors that wrap ErrUsageLimit or ErrAuth.
type ExecError struct {
	// Agent represents the agent that failed.
	Agent string

	// Msg describes what failed.
	Msg string

	// Err represents the underlying error, if any.
	Err error

	// Output represents an excerpt of the command's output (usually stderr).
	Output string
}

// Error implements the error interface.
func (e *ExecError) Error() string {
	var b strings.Builder
	b.WriteString(e.Agent)
	b.WriteString(": ")
	b.WriteString(e.Msg)
	if e.Err != nil {
		b.WriteString(": ")
		b.WriteString(e.Err.Error())
	}
	if e.Output != "" {
		fmt.Fprintf(&b, " (output: %s)", e.Output)
	}
	return b.String()
}

// Unwrap returns the underlying error.
func (e *ExecError) Unwrap() error {
	return e.Err
}

// isExecError checks if the error provided is an execution error that is not
// a usage limit or an authentication error (those stop the run).
func isExecError(err error) bool {
	var execErr *ExecError
	return errors.As(err, &execErr) && !errors.Is(err, ErrUsageLimit) && !errors.Is(err, ErrAuth)
}

// tail returns the last maxErrorOutputLength bytes of the output provided,
// trimmed and with its invalid UTF-8 sequences replaced.
func tail(output []byte) string {
	if len(output) > maxErrorOutputLength {
		output = output[len(output)-maxErrorOutputLength:]
	}
	return strings.TrimSpace(strings.ToValidUTF8(string(output), "�"))
}
