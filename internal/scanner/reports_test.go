package scanner

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	v1 "github.com/google/go-containerregistry/pkg/v1"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestReportStore(t *testing.T) {
	t.Parallel()

	digest := func(char string) v1.Hash {
		hash, err := v1.NewHash("sha256:" + strings.Repeat(char, 64))
		require.NoError(t, err)
		return hash
	}

	t.Run("reports are available until the store is closed", func(t *testing.T) {
		t.Parallel()

		store := newReportStore(10)
		require.True(t, store.add(digest("a"), []byte("report")))

		report, err := store.get(digest("a"))
		require.NoError(t, err)
		assert.Equal(t, []byte("report"), report)
		dir := store.dir
		assert.DirExists(t, dir)

		require.NoError(t, store.close())
		assert.NoDirExists(t, dir)
		_, err = store.get(digest("a"))
		require.Error(t, err)
	})

	t.Run("reports going over the limit are not added", func(t *testing.T) {
		t.Parallel()

		store := newReportStore(10)
		defer store.close()

		require.True(t, store.add(digest("a"), []byte("123456")))
		require.False(t, store.add(digest("b"), []byte("12345")))
		require.True(t, store.add(digest("c"), []byte("1234")))
		require.False(t, store.add(digest("d"), []byte("1")))

		_, err := store.get(digest("b"))
		require.Error(t, err)
		entries, err := os.ReadDir(store.dir)
		require.NoError(t, err)
		assert.Len(t, entries, 2)
	})

	t.Run("reports that cannot be written are not kept", func(t *testing.T) {
		t.Parallel()

		if _, err := os.Stat("/dev/full"); err != nil {
			t.Skip("/dev/full not available")
		}
		store := newReportStore(10)
		defer store.close()
		require.True(t, store.add(digest("a"), []byte("123456")))
		require.NoError(t, os.Symlink("/dev/full", filepath.Join(store.dir, digest("b").Hex)))

		require.False(t, store.add(digest("b"), []byte("1234")))

		entries, err := os.ReadDir(store.dir)
		require.NoError(t, err)
		assert.Len(t, entries, 1)
		require.True(t, store.add(digest("c"), []byte("1234")))
	})

	t.Run("nothing is created until a report is added", func(t *testing.T) {
		t.Parallel()

		store := newReportStore(1)

		require.False(t, store.add(digest("a"), []byte("12")))
		assert.Empty(t, store.dir)
		require.NoError(t, store.close())
	})
}
