package labeler

import (
	"context"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// shell represents the shell used in the executor tests.
const shell = "/bin/sh"

func TestProcessExecutor(t *testing.T) {
	t.Parallel()
	if _, err := os.Stat(shell); err != nil {
		t.Skip("shell not available")
	}
	ex := NewProcessExecutor()

	t.Run("output, exit code, stdin and environment", func(t *testing.T) {
		t.Parallel()
		dir := t.TempDir()
		res, err := ex.Execute(context.Background(), &Command{
			Path:    shell,
			Args:    []string{"-c", `cat; echo "$FOO|$HOME|$(pwd)"; echo err >&2; env | grep -c SECRET; exit 3`},
			Env:     []string{"FOO=bar", "HOME=/nonexistent", "PATH=/usr/bin:/bin"},
			Dir:     dir,
			Stdin:   []byte("input\n"),
			Timeout: time.Minute,
		})
		require.NoError(t, err)
		resolvedDir, err := filepath.EvalSymlinks(dir)
		require.NoError(t, err)
		assert.Equal(t, "input\nbar|/nonexistent|"+resolvedDir+"\n0\n", string(res.Stdout))
		assert.Equal(t, "err\n", string(res.Stderr))
		assert.Equal(t, 3, res.ExitCode)
		assert.False(t, res.TimedOut)
	})

	t.Run("nothing is inherited when no environment is provided", func(t *testing.T) {
		t.Parallel()
		require.NotEmpty(t, os.Getenv("HOME"))
		res, err := ex.Execute(context.Background(), &Command{
			Path:    shell,
			Args:    []string{"-c", "echo \"[$HOME]\""},
			Timeout: time.Minute,
		})
		require.NoError(t, err)
		assert.Equal(t, "[]\n", string(res.Stdout))
	})

	t.Run("timeout kills the whole process group", func(t *testing.T) {
		t.Parallel()
		dir := t.TempDir()
		marker := filepath.Join(dir, "marker")
		start := time.Now()
		res, err := ex.Execute(context.Background(), &Command{
			Path:    shell,
			Args:    []string{"-c", "(sleep 2; touch " + marker + ") & sleep 30"},
			Env:     []string{"PATH=/usr/bin:/bin"},
			Timeout: 200 * time.Millisecond,
		})
		require.NoError(t, err)
		assert.True(t, res.TimedOut)
		assert.Equal(t, -1, res.ExitCode)
		assert.Less(t, time.Since(start), 10*time.Second)

		// The background process was killed too
		time.Sleep(2500 * time.Millisecond)
		assert.NoFileExists(t, marker)
	})

	t.Run("leftover background processes are killed", func(t *testing.T) {
		t.Parallel()
		dir := t.TempDir()
		marker := filepath.Join(dir, "marker")
		start := time.Now()
		res, err := ex.Execute(context.Background(), &Command{
			Path:    shell,
			Args:    []string{"-c", "(sleep 1; touch " + marker + ") >/dev/null 2>&1 & echo done"},
			Env:     []string{"PATH=/usr/bin:/bin"},
			Timeout: time.Minute,
		})
		require.NoError(t, err)
		assert.Equal(t, "done\n", string(res.Stdout))
		assert.Equal(t, 0, res.ExitCode)
		assert.Less(t, time.Since(start), 10*time.Second)
		time.Sleep(1500 * time.Millisecond)
		assert.NoFileExists(t, marker)
	})

	t.Run("context canceled", func(t *testing.T) {
		t.Parallel()
		ctx, cancel := context.WithCancel(context.Background())
		go func() {
			time.Sleep(100 * time.Millisecond)
			cancel()
		}()
		_, err := ex.Execute(ctx, &Command{
			Path:    shell,
			Args:    []string{"-c", "sleep 30"},
			Env:     []string{"PATH=/usr/bin:/bin"},
			Timeout: time.Minute,
		})
		assert.ErrorIs(t, err, context.Canceled)
	})

	t.Run("binary not found", func(t *testing.T) {
		t.Parallel()
		_, err := ex.Execute(context.Background(), &Command{
			Path:    "artifacthub-category-nonexistent-binary",
			Timeout: time.Minute,
		})
		assert.Error(t, err)
	})
}

func TestCappedBuffer(t *testing.T) {
	t.Parallel()

	b := &cappedBuffer{limit: 5}
	n, err := b.Write([]byte("abc"))
	require.NoError(t, err)
	assert.Equal(t, 3, n)
	n, err = b.Write([]byte("defgh"))
	require.NoError(t, err)
	assert.Equal(t, 5, n)
	n, err = b.Write([]byte("ijk"))
	require.NoError(t, err)
	assert.Equal(t, 3, n)
	assert.Equal(t, "abcde", b.String())
}

func TestTail(t *testing.T) {
	t.Parallel()

	assert.Equal(t, "abc", tail([]byte("  abc \n")))
	long := strings.Repeat("a", maxErrorOutputLength) + "end"
	assert.Equal(t, strings.Repeat("a", maxErrorOutputLength-3)+"end", tail([]byte(long)))
}
