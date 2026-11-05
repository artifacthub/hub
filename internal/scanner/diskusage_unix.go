//go:build unix

package scanner

import (
	"os"
	"syscall"
)

// allocatedSize returns the disk space allocated to the file provided, which is
// the number of blocks it uses (in 512-byte units, no matter the block size of
// the file system).
func allocatedSize(info os.FileInfo) int64 {
	if stat, ok := info.Sys().(*syscall.Stat_t); ok {
		return stat.Blocks * 512
	}
	return info.Size()
}
