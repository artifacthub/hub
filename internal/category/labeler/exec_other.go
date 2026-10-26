//go:build !unix

package labeler

import (
	"errors"
	"os"
	"syscall"
)

// processGroupAttr returns no attributes, as process groups are only used on
// Unix systems.
func processGroupAttr() *syscall.SysProcAttr {
	return nil
}

// killProcessGroup kills the process provided (only the process itself, as
// process groups are only used on Unix systems). Errors caused by the process
// having exited already are ignored.
func killProcessGroup(p *os.Process) error {
	err := p.Kill()
	if errors.Is(err, os.ErrProcessDone) {
		return nil
	}
	return err
}
