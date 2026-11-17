//go:build !unix

package scanner

import "os"

// allocatedSize returns the size of the file provided, as the disk space
// allocated to files is only available on Unix systems.
func allocatedSize(info os.FileInfo) int64 {
	return info.Size()
}
