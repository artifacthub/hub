package tracker

import (
	"context"
	"sort"
	"strings"
	"sync"

	"github.com/artifacthub/hub/internal/hub"
	"github.com/rs/zerolog/log"
)

// ErrorsCollector interface defines the methods that an errors collector
// implementation should provide.
type ErrorsCollector interface {
	Append(repositoryID string, err error)
	Flush()
}

const (
	// maxErrorsPerRepository represents the maximum number of errors we want
	// to collect for a given repository.
	maxErrorsPerRepository = 100
)

// DBErrorsCollector is in charge of collecting errors that happen while
// repositories are being processed. Once all the processing is done, the
// collected errors can be flushed, which will store them in the database.
type DBErrorsCollector struct {
	ctx context.Context
	rm  hub.RepositoryManager

	mu     sync.Mutex
	errors map[string][]error // K: repository id
}

// NewDBErrorsCollector creates a new DBErrorsCollector instance.
func NewDBErrorsCollector(
	ctx context.Context,
	repoManager hub.RepositoryManager,
	repos []*hub.Repository,
) *DBErrorsCollector {
	ec := &DBErrorsCollector{
		ctx:    ctx,
		rm:     repoManager,
		errors: make(map[string][]error),
	}
	for _, r := range repos {
		ec.errors[r.RepositoryID] = nil
	}
	return ec
}

// Append adds the error provided to the repository's list of errors.
func (c *DBErrorsCollector) Append(repositoryID string, err error) {
	c.mu.Lock()
	defer c.mu.Unlock()

	if len(c.errors[repositoryID]) < maxErrorsPerRepository {
		c.errors[repositoryID] = append(c.errors[repositoryID], err)
	}
}

// Flush aggregates all errors collected per repository as a single text and
// stores it in the database.
func (c *DBErrorsCollector) Flush() {
	c.mu.Lock()
	defer c.mu.Unlock()

	for repositoryID, errors := range c.errors {
		// Sort error lines before flushing them. Trackers can process packages in
		// a repository concurrently, and the order the errors are produced is not
		// guaranteed. In order to be able to notify users when something goes
		// wrong during repositories tracking, we need to be able to compare the
		// errors produced among tracker executions.
		errors := errors
		sort.Slice(errors, func(i, j int) bool {
			return errors[i].Error() < errors[j].Error()
		})

		var errStr strings.Builder
		for i, err := range errors {
			errStr.WriteString(err.Error())
			if i < len(errors)-1 {
				errStr.WriteString("\n")
			}
		}
		err := c.rm.SetLastTrackingResults(c.ctx, repositoryID, errStr.String())
		if err != nil {
			log.Error().Err(err).Str("repoID", repositoryID).Send()
		}
	}
}
