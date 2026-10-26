// Package labeler implements the package category labelling tool, which
// labels the packages exported from the database using the GitHub Copilot
// CLI through its subscription. The labels produced form the dataset used to
// train the package category classifier.
//
// The agent CLI is run non-interactively, locked down as far as possible: no
// tools, a temporary HOME, configuration directory and working directory, an
// allowlisted environment and arguments built only by the tool. The package data is
// untrusted, so only labels are read from the replies.
//
// This package doesn't access the database and must not import internal/hub.
package labeler

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/artifacthub/hub/internal/category/catalog"
	"github.com/artifacthub/hub/internal/category/dataset"
	"github.com/artifacthub/hub/internal/category/model"
)

// Default configuration values.
const (
	// DefaultBatchSize represents the default number of packages labelled in
	// each request.
	DefaultBatchSize = 25

	// DefaultConcurrency represents the default number of concurrent
	// requests. Subscriptions have usage limits, so it's 1 by default.
	DefaultConcurrency = 1

	// DefaultTimeout represents the default timeout of each agent call. A
	// batch usually takes a few seconds, but Copilot sometimes stalls
	// waiting for a reply that never arrives, so stalled calls are killed
	// quickly and retried.
	DefaultTimeout = 2 * time.Minute

	// DefaultReadmeMaxBytes represents the default maximum size of the
	// README excerpts.
	DefaultReadmeMaxBytes = 3000

	// DefaultRetryBackoff represents the default time to wait before
	// retrying a call that failed to execute.
	DefaultRetryBackoff = 30 * time.Second
)

// maxConsecutiveExecFailures represents the number of consecutive batches
// that can fail to execute before the run is stopped.
const maxConsecutiveExecFailures = 3

// Config represents the labeler configuration.
type Config struct {
	// Input represents the path of the packages file (packages.jsonl).
	Input string

	// Output represents the path of the dataset file the labels are
	// appended to. Content keys already present in it are skipped.
	Output string

	// Model represents the model used (recorded in the dataset rows).
	Model string

	// Effort represents the reasoning effort used (recorded in the dataset
	// rows).
	Effort string

	// BatchSize represents the number of packages labelled in each request.
	BatchSize int

	// Concurrency represents the number of concurrent requests.
	Concurrency int

	// Timeout represents the timeout of each agent call.
	Timeout time.Duration

	// ReadmeMaxBytes represents the maximum size of the README excerpts.
	ReadmeMaxBytes int

	// NoReadme indicates that README excerpts must not be sent. It's
	// required when no package in the input has a readme.
	NoReadme bool

	// Sample represents the number of content keys to label, selected
	// deterministically (0 means all).
	Sample int

	// SkipFailures indicates whether packages in the failures file are
	// skipped instead of retried.
	SkipFailures bool

	// RetryBackoff represents the time to wait before retrying a call that
	// failed to execute.
	RetryBackoff time.Duration
}

// FailuresPath returns the path of the failures file for the output path
// provided: the output path with its .jsonl extension replaced by
// .failures.jsonl.
func FailuresPath(output string) string {
	base, _ := strings.CutSuffix(output, ".jsonl")
	return base + ".failures.jsonl"
}

// Labeler labels packages using an agent CLI.
type Labeler struct {
	cfg      Config
	runner   Runner
	session  *session
	progress io.Writer
	meta     dataset.Labeler
}

// New creates a new Labeler instance. Progress messages and warnings are
// written to the progress writer provided.
func New(cfg *Config, runner Runner, ex Executor, progress io.Writer) (*Labeler, error) {
	if progress == nil {
		progress = io.Discard
	}
	c := *cfg
	switch {
	case c.Input == "":
		return nil, errors.New("input not provided")
	case c.Output == "":
		return nil, errors.New("output not provided")
	case c.Input == c.Output:
		return nil, errors.New("input and output must be different files")
	case c.Model == "":
		return nil, errors.New("model not provided")
	case c.BatchSize < 1:
		return nil, errors.New("batch size must be at least 1")
	case c.Concurrency < 1:
		return nil, errors.New("concurrency must be at least 1")
	case c.Timeout <= 0:
		return nil, errors.New("timeout must be positive")
	case c.ReadmeMaxBytes <= 0 && !c.NoReadme:
		return nil, errors.New("readme max bytes must be positive")
	case c.Sample < 0:
		return nil, errors.New("sample must not be negative")
	case c.RetryBackoff < 0:
		return nil, errors.New("retry backoff must not be negative")
	}
	return &Labeler{
		cfg:      c,
		runner:   runner,
		session:  &session{runner: runner, ex: ex, timeout: c.Timeout},
		progress: progress,
	}, nil
}

// Run labels the packages in the input that are not in the output yet. The
// summary returned is filled in even when an error is returned, as the
// labels obtained until then are kept.
func (l *Labeler) Run(ctx context.Context) (*Summary, error) {
	s := &Summary{
		Output:   l.cfg.Output,
		Failures: FailuresPath(l.cfg.Output),
		Labels:   make(map[string]int),
	}

	// Read input and select the content keys to label
	pkgs, err := readPackagesFile(l.cfg.Input)
	if err != nil {
		return s, err
	}
	s.Packages = len(pkgs)
	if !l.cfg.NoReadme && !anyReadme(pkgs) {
		fmt.Fprintln(l.progress, "warning: no package in the input has a readme, please check the export (use --no-readme to label without readmes)")
		return s, ErrNoReadme
	}
	groups := GroupPackages(pkgs)
	s.ContentKeys = len(groups)
	groups = Sample(groups, l.cfg.Sample)
	s.Selected = len(groups)

	// Skip the content keys already labelled (and the failed ones, if
	// requested)
	discarded, err := discardIncompleteLastRow(l.cfg.Output)
	if err != nil {
		return s, err
	}
	if discarded {
		fmt.Fprintf(l.progress, "warning: discarding incomplete last row in %s\n", l.cfg.Output)
	}
	done, err := readOutputKeys(l.cfg.Output)
	if err != nil {
		return s, err
	}
	prevFailures, err := readFailures(s.Failures)
	if err != nil {
		return s, err
	}
	var pending []*Group
	for _, g := range groups {
		switch {
		case done[g.ContentKey]:
			s.AlreadyLabelled++
		case l.cfg.SkipFailures && prevFailures[g.ContentKey] != nil:
			s.SkippedFailures++
		default:
			pending = append(pending, g)
		}
	}
	st := &state{
		summary:      s,
		done:         done,
		prevFailures: prevFailures,
		failures:     make(map[string]*Failure),
	}
	if len(pending) == 0 {
		fmt.Fprintln(l.progress, "nothing to label")
		return s, st.writeFailures()
	}
	defer func() {
		s.Unprocessed = len(pending) - s.Labelled - s.Failed
	}()

	// Open output
	st.out, err = openOutput(l.cfg.Output)
	if err != nil {
		return s, err
	}
	defer st.out.Close()

	// Check the agent's version and auth
	version, err := l.session.version(ctx)
	if err != nil {
		return s, l.fatal(err)
	}
	authMethod, err := l.session.checkAuth(ctx)
	if err != nil {
		return s, l.fatal(err)
	}
	l.meta = dataset.Labeler{
		Agent:            l.runner.Agent(),
		AgentVersion:     version,
		Model:            l.cfg.Model,
		Effort:           l.cfg.Effort,
		Auth:             AuthSubscription,
		AuthMethod:       authMethod,
		GuidelinesDigest: GuidelinesDigest(),
		LabelingDigest:   catalog.LabelingDigest(),
	}
	fmt.Fprintf(l.progress, "labelling %d content keys with %s %s (model: %s, auth: %s)\n",
		len(pending), l.runner.Agent(), version, l.cfg.Model, authMethod)

	// Preflight: label a single package, so that a wrong model or an
	// unsupported flag fails within seconds
	res, err := l.processBatch(ctx, pending[:1], false)
	if err != nil {
		return s, fmt.Errorf("preflight failed: %w", l.fatal(err))
	}
	if err := st.write(res); err != nil {
		return s, err
	}
	fmt.Fprintf(l.progress, "preflight: %d labelled, %d failed\n", len(res.rows), len(res.failures))

	// Label the remaining packages in batches
	err = l.processBatches(ctx, st, chunk(pending[1:], l.cfg.BatchSize))
	if err == nil {
		err = st.writeFailures()
	} else {
		_ = st.writeFailures()
	}
	return s, err
}

// batchOutcome represents the outcome of processing a batch.
type batchOutcome struct {
	n   int
	res *batchResult
	err error
}

// processBatches processes the batches provided concurrently, writing their
// results to the output as they complete.
func (l *Labeler) processBatches(ctx context.Context, st *state, batches [][]*Group) error {
	ctx, cancel := context.WithCancel(ctx)
	defer cancel()

	// Launch workers. A slot is taken for each batch dispatched and released
	// once its outcome has been handled, so that no new batch is started
	// after the run has been stopped
	jobs := make(chan int)
	outcomes := make(chan batchOutcome)
	slots := make(chan struct{}, l.cfg.Concurrency)
	var wg sync.WaitGroup
	for range l.cfg.Concurrency {
		wg.Go(func() {
			for n := range jobs {
				res, err := l.processBatch(ctx, batches[n], true)
				outcomes <- batchOutcome{n: n, res: res, err: err}
			}
		})
	}
	go func() {
		defer close(jobs)
		for n := range batches {
			select {
			case slots <- struct{}{}:
			case <-ctx.Done():
				return
			}
			if ctx.Err() != nil {
				return
			}
			jobs <- n
		}
	}()
	go func() {
		wg.Wait()
		close(outcomes)
	}()

	// Collect outcomes (in completion order)
	var fatalErr error
	consecutiveFailures := 0
	completed := 0
	for o := range outcomes {
		completed++
		if o.err != nil {
			switch {
			case fatalErr != nil || ctx.Err() != nil:
				// Stopping, the batch is left unprocessed
			case isExecError(o.err):
				consecutiveFailures++
				fmt.Fprintf(l.progress, "batch %d/%d left unprocessed: %v\n", o.n+1, len(batches), o.err)
				if consecutiveFailures >= maxConsecutiveExecFailures {
					fatalErr = fmt.Errorf("%w (%d in a row), stopping: %w", ErrTooManyFailures, consecutiveFailures, o.err)
					cancel()
				}
			default:
				fatalErr = l.fatal(o.err)
				cancel()
			}
		} else {
			consecutiveFailures = 0
			if err := st.write(o.res); err != nil {
				if fatalErr == nil {
					fatalErr = err
				}
				cancel()
			} else {
				fmt.Fprintf(l.progress, "batch %d/%d: %d labelled, %d failed (completed batches: %d/%d)\n",
					o.n+1, len(batches), len(o.res.rows), len(o.res.failures), completed, len(batches))
			}
		}
		<-slots
	}
	if fatalErr != nil {
		return fatalErr
	}
	return ctx.Err()
}

// batchResult represents the result of processing a batch.
type batchResult struct {
	rows     []dataset.Row
	failures []*Failure
}

// processBatch labels the groups provided, returning the dataset rows of the
// groups labelled and the groups that failed the reply validation. An error
// is returned when the batch couldn't be processed (it's left unprocessed).
//
// When any package in the batch is flagged as suspicious, the other packages
// are labelled again in a new batch without the flagged ones (batch
// quarantine), as the flagged content could have influenced their labels.
// Packages whose label changes get the second label and are marked for
// review.
func (l *Labeler) processBatch(ctx context.Context, groups []*Group, retryExec bool) (*batchResult, error) {
	labels, errs, err := l.labelGroups(ctx, groups, retryExec)
	if err != nil {
		return nil, err
	}

	// Batch quarantine
	needsReview := make([]bool, len(groups))
	var flagged, others []int
	for i, label := range labels {
		switch {
		case label == nil:
		case label.Suspicious:
			flagged = append(flagged, i)
		default:
			others = append(others, i)
		}
	}
	if len(flagged) > 0 && len(others) > 0 {
		subset := make([]*Group, 0, len(others))
		for _, i := range others {
			subset = append(subset, groups[i])
		}
		relabels, _, err := l.labelGroups(ctx, subset, retryExec)
		if err != nil {
			return nil, err
		}
		for j, i := range others {
			second := relabels[j]
			switch {
			case second == nil:
				// The label couldn't be confirmed
				needsReview[i] = true
			case second.Category != labels[i].Category:
				labels[i] = second
				needsReview[i] = true
			case second.Suspicious:
				labels[i].Suspicious = true
			}
		}
	}

	// Prepare result
	res := &batchResult{}
	addFailure := func(g *Group, err error) {
		p := g.Representative()
		res.failures = append(res.failures, &Failure{
			ContentKey:     g.ContentKey,
			RepositoryKind: p.RepositoryKind,
			RepositoryName: p.RepositoryName,
			Name:           p.Name,
			Error:          err.Error(),
		})
	}
	for i, g := range groups {
		if labels[i] == nil {
			addFailure(g, errs[i])
			continue
		}
		row := l.newRow(g, labels[i], needsReview[i])
		if err := row.Validate(); err != nil {
			return nil, fmt.Errorf("error preparing dataset row for %s/%s: %w", row.RepositoryName, row.Name, err)
		}

		// Rows that dataset.Read couldn't read back (the newline must fit
		// too) are recorded as failures instead
		data, err := json.Marshal(row)
		if err != nil {
			return nil, fmt.Errorf("error preparing dataset row for %s/%s: %w", row.RepositoryName, row.Name, err)
		}
		if len(data) >= dataset.MaxLineSize {
			addFailure(g, fmt.Errorf("dataset row too large (%d bytes, max %d)", len(data)+1, dataset.MaxLineSize))
			continue
		}
		res.rows = append(res.rows, row)
	}
	return res, nil
}

// labelGroups labels the groups provided. On reply validation errors the
// request is retried once, and then the groups are split in half
// recursively, down to a single group. The labels are returned in the same
// order as the groups; groups that failed have a nil label and the
// corresponding validation error. An error is returned when the agent failed
// to execute.
func (l *Labeler) labelGroups(ctx context.Context, groups []*Group, retryExec bool) ([]*Label, []error, error) {
	labels, err := l.labelWithRetry(ctx, groups, retryExec)
	if err == nil {
		res := make([]*Label, len(labels))
		for i := range labels {
			res[i] = &labels[i]
		}
		return res, make([]error, len(labels)), nil
	}
	if !errors.Is(err, ErrInvalidReply) {
		return nil, nil, err
	}
	if len(groups) == 1 {
		return []*Label{nil}, []error{err}, nil
	}
	mid := len(groups) / 2
	labels1, errs1, err := l.labelGroups(ctx, groups[:mid], retryExec)
	if err != nil {
		return nil, nil, err
	}
	labels2, errs2, err := l.labelGroups(ctx, groups[mid:], retryExec)
	if err != nil {
		return nil, nil, err
	}
	return append(labels1, labels2...), append(errs1, errs2...), nil
}

// labelWithRetry labels the groups provided, retrying once on reply
// validation errors.
func (l *Labeler) labelWithRetry(ctx context.Context, groups []*Group, retryExec bool) ([]Label, error) {
	var err error
	for range 2 {
		var labels []Label
		labels, err = l.label(ctx, groups, retryExec)
		if !errors.Is(err, ErrInvalidReply) {
			return labels, err
		}
	}
	return nil, err
}

// label makes a request to the agent to label the groups provided. When
// requested, execution errors (except usage limits and authentication
// errors) are retried once after a backoff.
func (l *Labeler) label(ctx context.Context, groups []*Group, retryExec bool) ([]Label, error) {
	prompt, err := BuildPrompt(groups, PromptOptions{
		ReadmeMaxBytes: l.cfg.ReadmeMaxBytes,
		NoReadme:       l.cfg.NoReadme,
	})
	if err != nil {
		return nil, err
	}
	reply, err := l.session.label(ctx, prompt)
	if err != nil && retryExec && isExecError(err) && ctx.Err() == nil {
		fmt.Fprintf(l.progress, "execution error, retrying in %s: %v\n", l.cfg.RetryBackoff, err)
		if err := sleep(ctx, l.cfg.RetryBackoff); err != nil {
			return nil, err
		}
		reply, err = l.session.label(ctx, prompt)
	}
	if err != nil {
		return nil, err
	}
	return ParseReply(reply, len(groups))
}

// newRow returns the dataset row for the group and label provided.
func (l *Labeler) newRow(g *Group, label *Label, needsReview bool) dataset.Row {
	p := g.Representative()
	keywords := p.Keywords
	if keywords == nil {
		keywords = []string{}
	}
	return dataset.Row{
		ContentKey:     g.ContentKey,
		RepositoryKind: p.RepositoryKind,
		RepositoryName: p.RepositoryName,
		Name:           p.Name,
		Duplicates:     len(g.Packages),
		Keywords:       keywords,
		Description:    model.TruncateDescription(p.Description),
		Label:          label.Category,
		Confidence:     label.Confidence,
		Suspicious:     label.Suspicious,
		NeedsReview:    needsReview,
		Labeler:        l.meta,
	}
}

// fatal returns the error provided with a message explaining what to do
// when it's a usage limit or an authentication error.
func (l *Labeler) fatal(err error) error {
	switch {
	case errors.Is(err, ErrUsageLimit):
		return fmt.Errorf("limit reached, rerun after it resets: %w", err)
	case errors.Is(err, ErrAuth):
		return fmt.Errorf("%w: %s (%w)", ErrAuth, l.runner.LoginHint(), err)
	default:
		return err
	}
}

// chunk splits the groups provided in batches of the size provided.
func chunk(groups []*Group, size int) [][]*Group {
	var batches [][]*Group
	for len(groups) > 0 {
		n := min(size, len(groups))
		batches = append(batches, groups[:n])
		groups = groups[n:]
	}
	return batches
}

// sleep waits for the duration provided or until the context is canceled.
func sleep(ctx context.Context, d time.Duration) error {
	if d <= 0 {
		return ctx.Err()
	}
	t := time.NewTimer(d)
	defer t.Stop()
	select {
	case <-t.C:
		return nil
	case <-ctx.Done():
		return ctx.Err()
	}
}

// anyReadme checks if any of the packages provided has a readme.
func anyReadme(pkgs []*Package) bool {
	for _, p := range pkgs {
		if strings.TrimSpace(p.Readme) != "" {
			return true
		}
	}
	return false
}

// readPackagesFile reads the packages from the file provided.
func readPackagesFile(path string) ([]*Package, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, fmt.Errorf("error opening input: %w", err)
	}
	defer f.Close()
	pkgs, err := ReadPackages(f)
	if err != nil {
		return nil, fmt.Errorf("error reading input %s: %w", path, err)
	}
	return pkgs, nil
}
