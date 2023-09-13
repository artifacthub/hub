package util

import (
	"fmt"
	"os"
)

// ReadRegularFile is a wrapper around os.ReadFile that only operates on
// regular files.
func ReadRegularFile(name string) ([]byte, error) {
	info, err := os.Lstat(name)
	if err != nil {
		return nil, err
	}
	if !info.Mode().IsRegular() {
		return nil, fmt.Errorf("invalid file %s", name)
	}
	return os.ReadFile(name)
}
