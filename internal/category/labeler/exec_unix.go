//go:build unix

package labeler

import (
	"errors"
	"os"
	"syscall"
)

// processGroupAttr returns the attributes that make a command run in its own
// process group.
func processGroupAttr() *syscall.SysProcAttr {
	return &syscall.SysProcAttr{Setpgid: true}
}

// killProcessGroup kills the process group whose leader is the process
// provided. Errors caused by the group not existing anymore are ignored.
func killProcessGroup(p *os.Process) error {
	err := syscall.Kill(-p.Pid, syscall.SIGKILL)
	if errors.Is(err, syscall.ESRCH) {
		return nil
	}
	return err
}
