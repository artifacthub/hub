package errors

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

// Collector is in charge of collecting errors that happen while repositories
// are being processed. Once all the processing is done, the collected errors
// can be flushed, which will store them in the database.
type Collector struct {
	rm hub.RepositoryManager

	mu     sync.Mutex
	errors map[string][]string // K: repository id
}

// NewCollector creates a new Collector instance.
func NewCollector(repoManager hub.RepositoryManager) *Collector {
	return &Collector{
		rm:     repoManager,
		errors: make(map[string][]string),
	}
}

// Append adds the error provided to the repository's list of errors.
func (c *Collector) Append(repositoryID string, err string) {
	c.mu.Lock()
	defer c.mu.Unlock()

	if len(c.errors[repositoryID]) < maxErrorsPerRepository {
		c.errors[repositoryID] = append(c.errors[repositoryID], err)
	}
}

// Flush aggregates all errors collected per repository as a single text and
// stores it in the database.
func (c *Collector) Flush() {
	c.mu.Lock()
	defer c.mu.Unlock()

	for repositoryID, errors := range c.errors {
		// Sort error lines before flushing them. Packages can be processed in
		// a repository concurrently, and the order the errors are produced is
		// not guaranteed. In order to be able to notify users when something
		// goes wrong during repositories tracking, we need to be able to
		// compare the errors produced among tracker executions.
		sort.Strings(errors)

		var allErrors strings.Builder
		for i, err := range errors {
			allErrors.WriteString(err)
			if i < len(errors)-1 {
				allErrors.WriteString("\n")
			}
		}
		err := c.rm.SetLastTrackingResults(context.Background(), repositoryID, allErrors.String())
		if err != nil {
			log.Error().Err(err).Str("repoID", repositoryID).Send()
		}
	}
}

// Init initializes the list of errors for the repository provided. This will
// allow the errors collector to reset the errors from a previous tracker run
// when no errors have been collected from the current run.
func (c *Collector) Init(repositoryID string) {
	c.mu.Lock()
	defer c.mu.Unlock()

	c.errors[repositoryID] = nil
}
