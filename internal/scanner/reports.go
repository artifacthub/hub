package scanner

import (
	"fmt"
	"os"
	"path/filepath"
	"sync"

	v1 "github.com/google/go-containerregistry/pkg/v1"
	"github.com/rs/zerolog/log"
)

// reportStore is a bounded store that keeps on disk the reports generated during
// a run, so that they can be reused without keeping them in memory. Reports that
// do not fit in the store are not added to it.
type reportStore struct {
	maxSize int64

	mu      sync.Mutex
	dir     string
	size    int64
	reports map[v1.Hash]struct{}
}

// newReportStore creates a new reportStore instance. The directory where the
// reports are kept is created when the first report is added.
func newReportStore(maxSize int64) *reportStore {
	return &reportStore{
		maxSize: maxSize,
		reports: make(map[v1.Hash]struct{}),
	}
}

// add adds the report provided to the store, returning if it was added.
func (rs *reportStore) add(digest v1.Hash, report []byte) bool {
	size := int64(len(report))
	dir, err := rs.reserve(size)
	if err != nil {
		log.Error().Err(err).Msg("error preparing reports store")
		return false
	}
	if dir == "" {
		return false
	}
	path := filepath.Join(dir, digest.Hex)
	err = os.WriteFile(path, report, 0o600)

	rs.mu.Lock()
	defer rs.mu.Unlock()
	if err != nil {
		_ = os.Remove(path) // The report may have been partially written
		rs.size -= size
		log.Error().Err(err).Msg("error storing report")
		return false
	}
	rs.reports[digest] = struct{}{}
	return true
}

// reserve reserves the size provided in the store, returning the directory where
// the report can be written or an empty string if it does not fit.
func (rs *reportStore) reserve(size int64) (string, error) {
	rs.mu.Lock()
	defer rs.mu.Unlock()

	if size > rs.maxSize-rs.size {
		return "", nil
	}
	if rs.dir == "" {
		dir, err := os.MkdirTemp("", "artifact-hub-reports")
		if err != nil {
			return "", err
		}
		rs.dir = dir
	}
	rs.size += size
	return rs.dir, nil
}

// close removes all the reports from the store.
func (rs *reportStore) close() error {
	rs.mu.Lock()
	defer rs.mu.Unlock()

	if rs.dir == "" {
		return nil
	}
	err := os.RemoveAll(rs.dir)
	rs.dir, rs.size = "", 0
	clear(rs.reports)
	return err
}

// get returns the report with the digest provided.
func (rs *reportStore) get(digest v1.Hash) ([]byte, error) {
	rs.mu.Lock()
	dir := rs.dir
	_, ok := rs.reports[digest]
	rs.mu.Unlock()

	if !ok {
		return nil, fmt.Errorf("report %s not found", digest)
	}
	return os.ReadFile(filepath.Join(dir, digest.Hex))
}
