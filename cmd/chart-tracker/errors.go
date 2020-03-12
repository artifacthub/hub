package main

import (
	"context"
	"strings"
	"sync"

	"github.com/cncf/hub/internal/hub"
	"github.com/rs/zerolog/log"
)

const (
	// maxErrorsPerChartRepository represents the maximum number of errors we
	// want to collect for a given chart repository.
	maxErrorsPerChartRepository = 100
)

// errorsCollector is in charge of collecting errors that happen while chart
// repositories are being processed. Once all the processing is done, the
// collected errors can be flushed, which will store them in the database.
type errorsCollector struct {
	ctx    context.Context
	hubAPI *hub.Hub

	mu     sync.Mutex
	errors map[string][]error // K: chart repository id
}

// newErrorsCollector creates a new errorsCollector instance.
func newErrorsCollector(ctx context.Context, hubAPI *hub.Hub) *errorsCollector {
	return &errorsCollector{
		ctx:    ctx,
		hubAPI: hubAPI,
		errors: make(map[string][]error),
	}
}

// appends adds the error provided to the chart repository's list of errors.
func (c *errorsCollector) append(chartRepositoryID string, err error) {
	c.mu.Lock()
	defer c.mu.Unlock()

	if len(c.errors[chartRepositoryID]) < maxErrorsPerChartRepository {
		c.errors[chartRepositoryID] = append(c.errors[chartRepositoryID], err)
	}
}

// flush aggregates all errors collected per chart repository as a single text
// and stores it in the database.
func (c *errorsCollector) flush() {
	for chartRepositoryID, errors := range c.errors {
		var errStr strings.Builder
		for _, err := range errors {
			errStr.WriteString(err.Error())
			errStr.WriteString("\n")
		}
		err := c.hubAPI.SetChartRepositoryLastTrackingErrors(c.ctx, chartRepositoryID, errStr.String())
		if err != nil {
			log.Error().Err(err).Str("repoID", chartRepositoryID).Send()
		}
	}
}
