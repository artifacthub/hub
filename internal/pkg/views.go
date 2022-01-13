package pkg

import (
	"context"
	"encoding/json"
	"fmt"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/util"
	"github.com/rs/zerolog/log"
	"github.com/satori/uuid"
)

const (
	// Database queries
	updatePackagesViewsDBQ = `select update_packages_views($1::bigint, $2::jsonb)`

	// defaultFlushFrequency represents how often packages views will be
	// written to the database.
	defaultFlushFrequency = 5 * time.Minute

	// sep is the separator used in the total map keys.
	sep = "##"
)

// ViewsTracker aggregates packages views that are periodically flushed to the
// database.
type ViewsTracker struct {
	db             hub.DB
	flushFrequency time.Duration

	mu    sync.Mutex
	total map[string]int
}

// New creates a new ViewsTracker instance.
func NewViewsTracker(db hub.DB, opts ...func(t *ViewsTracker)) *ViewsTracker {
	t := &ViewsTracker{
		db:             db,
		flushFrequency: defaultFlushFrequency,
		total:          make(map[string]int),
	}
	for _, o := range opts {
		o(t)
	}
	return t
}

// WithFlushFrequency allows configuring the views tracker flush frequency.
func WithFlushFrequency(d time.Duration) func(t *ViewsTracker) {
	return func(t *ViewsTracker) {
		t.flushFrequency = d
	}
}

// Flusher handles the periodic flushes of packages views. It'll keep running
// until the context provided is done.
func (t *ViewsTracker) Flusher(ctx context.Context, wg *sync.WaitGroup) {
	defer wg.Done()

	doFlush := func() {
		t.mu.Lock()
		if len(t.total) == 0 {
			t.mu.Unlock()
			return
		}
		t.mu.Unlock()
		if err := t.flush(); err != nil {
			log.Error().Err(err).Msg("error flushing packages views")
		}
	}
	for {
		select {
		case <-time.After(t.flushFrequency):
			doFlush()
		case <-ctx.Done():
			doFlush()
			return
		}
	}
}

// TrackView tracks a single view for a given package version.
func (t *ViewsTracker) TrackView(packageID, version string) error {
	// Validate input
	if _, err := uuid.FromString(packageID); err != nil {
		return fmt.Errorf("%w: invalid package id", hub.ErrInvalidInput)
	}

	// Track view
	key := buildTrackerKey(packageID, version)
	t.mu.Lock()
	t.total[key]++
	t.mu.Unlock()

	return nil
}

// flush writes the aggregated packages views to the database.
func (t *ViewsTracker) flush() error {
	// Prepare data for database update
	t.mu.Lock()
	keys := make([]string, 0, len(t.total))
	for k := range t.total {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	data := make([][]interface{}, 0, len(t.total))
	for _, key := range keys {
		packageID, version, date := parseTrackerKey(key)
		data = append(data, []interface{}{packageID, version, date, t.total[key]})
	}
	t.total = make(map[string]int) // TODO(tegioz): if the db write fails, data would be lost
	t.mu.Unlock()
	dataJSON, _ := json.Marshal(data)

	// Write data to database
	_, err := t.db.Exec(
		context.Background(),
		updatePackagesViewsDBQ,
		util.DBLockKeyUpdatePackagesViews,
		dataJSON,
	)
	return err
}

// buildTrackerKey creates a key used to track the views for a given package
// version.
func buildTrackerKey(packageID, version string) string {
	return fmt.Sprintf("%s%s%s%s%s", packageID, sep, version, sep, time.Now().Format("2006-01-02"))
}

// parseTrackerKey parses a key used to track the views for a given package
// version, returning the package id, version and date.
func parseTrackerKey(key string) (string, string, string) {
	parts := strings.Split(key, sep)
	return parts[0], parts[1], parts[2]
}
