package repo

import (
	"context"
	"sort"
	"strings"
	"sync"

	"github.com/artifacthub/hub/internal/hub"
	"github.com/rs/zerolog/log"
)

const (
	// maxErrorsPerRepository represents the maximum number of errors we want
	// to collect for a given repository.
	maxErrorsPerRepository = 100
)

// ErrorsCollectorKind represents the kind of a given errors collector.
type ErrorsCollectorKind int64

const (
	// Scanner represents an errors collector for a scanner instance.
	Scanner ErrorsCollectorKind = 0

	// Tracker represents an errors collector for a tracker instance.
	Tracker ErrorsCollectorKind = 1
)

// ErrorsCollector is in charge of collecting errors that happen while
// repositories are being processed. Once all the processing is done, the
// collected errors can be flushed, which will store them in the database.
type ErrorsCollector struct {
	rm   hub.RepositoryManager
	kind ErrorsCollectorKind

	mu     sync.Mutex
	errors map[string][]string // K: repository id
}

// NewErrorsCollector creates a new ErrorsCollector instance.
func NewErrorsCollector(repoManager hub.RepositoryManager, kind ErrorsCollectorKind) *ErrorsCollector {
	return &ErrorsCollector{
		rm:     repoManager,
		kind:   kind,
		errors: make(map[string][]string),
	}
}

// Append adds the error provided to the repository's list of errors.
func (c *ErrorsCollector) Append(repositoryID string, err string) {
	c.mu.Lock()
	defer c.mu.Unlock()

	if len(c.errors[repositoryID]) < maxErrorsPerRepository {
		c.errors[repositoryID] = append(c.errors[repositoryID], err)
	}
}

// Flush aggregates all errors collected per repository as a single text and
// stores it in the database.
func (c *ErrorsCollector) Flush() {
	c.mu.Lock()
	defer c.mu.Unlock()

	for repositoryID, errors := range c.errors {
		// Sort error lines before flushing them. Packages can be processed in
		// a repository concurrently, and the order the errors are produced is
		// not guaranteed. In order to be able to notify users when something
		// goes wrong during repositories tracking or scanning, we need to be
		// able to compare the errors produced among executions.
		sort.Strings(errors)

		var allErrors strings.Builder
		for i, err := range errors {
			allErrors.WriteString(err)
			if i < len(errors)-1 {
				allErrors.WriteString("\n")
			}
		}
		var err error
		switch c.kind {
		case Scanner:
			err = c.rm.SetLastScanningResults(context.Background(), repositoryID, allErrors.String())
		case Tracker:
			err = c.rm.SetLastTrackingResults(context.Background(), repositoryID, allErrors.String())
		}
		if err != nil {
			log.Error().Err(err).Str("repoID", repositoryID).Send()
		}
	}
}

// Init initializes the list of errors for the repository provided. This will
// allow the errors collector to reset the errors from a previous tracker or
// scanner run when no errors have been collected from the current run.
func (c *ErrorsCollector) Init(repositoryID string) {
	c.mu.Lock()
	defer c.mu.Unlock()

	if _, ok := c.errors[repositoryID]; !ok {
		c.errors[repositoryID] = nil
	}
}
