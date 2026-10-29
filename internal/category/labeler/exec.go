package labeler

import (
	"bytes"
	"context"
	"errors"
	"os/exec"
	"time"
)

const (
	// maxCommandOutputSize represents the maximum number of bytes of a
	// command's stdout or stderr that are kept. The rest is discarded.
	maxCommandOutputSize = 16 << 20

	// waitDelay represents how long to wait for the command's output to be
	// closed once it has exited (or been killed), so that a background
	// process that inherited it can't block forever.
	waitDelay = 5 * time.Second
)

// Command represents a command to execute.
type Command struct {
	// Path represents the name or path of the binary to execute.
	Path string

	// Args represents the command's arguments (without the binary).
	Args []string

	// Env represents the command's whole environment. Nothing else is
	// inherited.
	Env []string

	// Dir represents the command's working directory.
	Dir string

	// Stdin represents the data written to the command's stdin.
	Stdin []byte

	// Timeout represents the maximum duration of the command. When it's
	// exceeded the command is killed.
	Timeout time.Duration
}

// Result represents the result of executing a command.
type Result struct {
	// Stdout represents the command's stdout.
	Stdout []byte

	// Stderr represents the command's stderr.
	Stderr []byte

	// ExitCode represents the command's exit code (-1 when it was killed).
	ExitCode int

	// TimedOut indicates whether the command was killed because it exceeded
	// its timeout.
	TimedOut bool
}

// Executor describes the methods an Executor implementation must provide.
// An executor runs commands. It's an interface so that the agents CLIs
// execution can be faked in tests.
type Executor interface {
	// Execute executes the command provided. An error is returned when the
	// command can't be started or the context provided is canceled. When the
	// command runs, its result is returned whatever its exit code is.
	Execute(ctx context.Context, cmd *Command) (*Result, error)
}

// ProcessExecutor is an Executor implementation that runs commands as child
// processes. On Unix systems, each command runs in its own process group,
// which is killed when the command times out or the context is canceled, and
// again once the command exits to clean up anything left in it. On other
// systems, only the command's process is killed.
type ProcessExecutor struct{}

// NewProcessExecutor creates a new ProcessExecutor instance.
func NewProcessExecutor() *ProcessExecutor {
	return &ProcessExecutor{}
}

// Execute implements the Executor interface.
func (e *ProcessExecutor) Execute(ctx context.Context, c *Command) (*Result, error) {
	callCtx := ctx
	if c.Timeout > 0 {
		var cancel context.CancelFunc
		callCtx, cancel = context.WithTimeout(ctx, c.Timeout)
		defer cancel()
	}

	// Prepare command
	cmd := exec.CommandContext(callCtx, c.Path, c.Args...) // #nosec G204 -- fixed binary, args built by the tool
	cmd.Env = c.Env
	if cmd.Env == nil {
		cmd.Env = []string{}
	}
	cmd.Dir = c.Dir
	cmd.Stdin = bytes.NewReader(c.Stdin)
	stdout := &cappedBuffer{limit: maxCommandOutputSize}
	stderr := &cappedBuffer{limit: maxCommandOutputSize}
	cmd.Stdout = stdout
	cmd.Stderr = stderr
	cmd.SysProcAttr = processGroupAttr()
	cmd.Cancel = func() error {
		return killProcessGroup(cmd.Process)
	}
	cmd.WaitDelay = waitDelay

	// Run it and kill anything left in its process group
	err := cmd.Run()
	if cmd.Process != nil {
		_ = killProcessGroup(cmd.Process)
	}
	if ctx.Err() != nil {
		return nil, ctx.Err()
	}
	if cmd.ProcessState == nil {
		return nil, err
	}
	return &Result{
		Stdout:   stdout.Bytes(),
		Stderr:   stderr.Bytes(),
		ExitCode: cmd.ProcessState.ExitCode(),
		TimedOut: errors.Is(callCtx.Err(), context.DeadlineExceeded),
	}, nil
}

// cappedBuffer is a bytes.Buffer that keeps up to limit bytes. Anything
// written beyond that limit is discarded.
type cappedBuffer struct {
	bytes.Buffer
	limit int
}

// Write implements the io.Writer interface.
func (b *cappedBuffer) Write(p []byte) (int, error) {
	if room := b.limit - b.Len(); room > 0 {
		if len(p) > room {
			b.Buffer.Write(p[:room])
		} else {
			b.Buffer.Write(p)
		}
	}
	return len(p), nil
}
