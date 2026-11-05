package scanner

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strings"
	"sync"
	"syscall"
	"time"

	trivyname "github.com/aquasecurity/trivy/pkg/fanal/image/name"
	trivy "github.com/aquasecurity/trivy/pkg/types"
	"github.com/artifacthub/hub/internal/oci"
	"github.com/google/go-containerregistry/pkg/name"
	v1 "github.com/google/go-containerregistry/pkg/v1"
	"github.com/google/go-containerregistry/pkg/v1/remote"
	"github.com/google/go-containerregistry/pkg/v1/remote/transport"
	"github.com/rs/zerolog/log"
	"github.com/spf13/viper"
)

const (
	// imageLayout is the name of the OCI layout scanned, relative to the working
	// directory of the Trivy process so that temporary paths never reach reports.
	imageLayout = "image"

	// maxStoredReportsSize is the maximum size of the reports kept during a run.
	maxStoredReportsSize = 1 << 30

	// scanDiskMargin is the disk space a scan can use in addition to the maximum
	// image size, for the temporary files created by Trivy. The default size limit
	// of the temporary directory in the Helm chart depends on this value, and adds
	// 1GiB per scan for what can be written between two checks of the disk used.
	scanDiskMargin = 2 << 30

	// maxScanEntries is the maximum number of files and directories a scan can
	// have. Empty files use no disk blocks, but they still use inodes, which are
	// not covered by any size limit, and they slow down the disk checks.
	maxScanEntries = 1 << 20

	// diskCheckInterval is the time between checks of the disk used by a scan. It
	// must be short, as Trivy can write more than 1GiB per second.
	diskCheckInterval = 500 * time.Millisecond

	// pullTimeout is the maximum time allowed to pull an image.
	pullTimeout = 15 * time.Minute

	// scanTimeout is the maximum time allowed for each Trivy run.
	scanTimeout = 15 * time.Minute

	// javaDBTimeout is the maximum time allowed to download the Java DB of Trivy,
	// which is close to 1GiB.
	javaDBTimeout = 30 * time.Minute

	// trivyStopDelay is the time Trivy gets to exit by itself, first once its
	// timeout expires, and again after being asked to stop. It may take a while
	// to notice its timeout, and it cannot clean up if it is killed.
	trivyStopDelay = time.Minute

	// trivyRetryDelay is the time to wait before running Trivy again after a
	// failure, which must be enough for the Trivy server to restart.
	trivyRetryDelay = 5 * time.Second

	// trivyTmpDir is the name of the directory used by Trivy to store temporary
	// files, relative to the directory of the scan so that they are removed with
	// it no matter how Trivy exits.
	trivyTmpDir = "tmp"
)

var (
	// errScanAborted is the result of a scan that did not run to completion.
	errScanAborted = errors.New("scan aborted")

	// missingBlobRE is a regexp used to find blobs in the output of Trivy. Any
	// algorithm is matched, as v1.NewHash checks it is supported and the digest
	// has the right length.
	missingBlobRE = regexp.MustCompile(`blobs/([a-z0-9]+)/([0-9a-f]+)`)
)

// TrivyScanner is an ImageScanner implementation that uses Trivy to scan
// containers images for security vulnerabilities.
//
// Images are pulled by this process, so that all connections to registries are
// subject to the address restrictions no matter who chooses the destination
// (registries can redirect requests or point to token servers, and images can
// list foreign layers). Trivy only gets a local OCI layout. It starts with just
// the manifest and the config, as it only reads the layers the Trivy server does
// not know about. If it needs any, all layers are pulled at once.
//
// The disk used by each scan is limited too. The size of the layers says nothing
// about the size of the files extracted from them by Trivy, and running out of
// space would affect all the scans in progress.
//
// Results are reused during a run: a reference reaches the registry once, and
// references sharing a digest are scanned once. To do this, a TrivyScanner must
// not be used for more than a single run.
type TrivyScanner struct {
	ctx               context.Context
	cfg               *viper.Viper
	maxImageSize      int64
	maxDiskUsage      int64
	maxEntries        int64
	diskCheckInterval time.Duration
	pullTimeout       time.Duration
	scanTimeout       time.Duration
	stopDelay         time.Duration
	retryDelay        time.Duration
	reports           *reportStore

	// restricted indicates that errors returned must not include details from
	// the registries or Trivy, as they are visible to users and may contain data
	// from the destinations contacted.
	restricted bool

	mu          sync.Mutex
	refs        map[string]*scanState
	digests     map[string]*scanState
	rateLimited map[string]struct{}
}

// scanState represents a scan shared by all the requests of a reference or a
// digest, which wait on it when it is in progress. Its fields can be read once
// it is done.
type scanState struct {
	done   chan struct{}
	digest v1.Hash
	report []byte // Only set when the report did not make it to the store
	err    error
}

// newTrivyScanner creates a new TrivyScanner instance.
func newTrivyScanner(ctx context.Context, cfg *viper.Viper) *TrivyScanner {
	maxImageSize := cfg.GetInt64("scanner.maxImageSize")
	return &TrivyScanner{
		ctx:               ctx,
		cfg:               cfg,
		maxImageSize:      maxImageSize,
		maxDiskUsage:      maxImageSize + scanDiskMargin,
		maxEntries:        maxScanEntries,
		diskCheckInterval: diskCheckInterval,
		pullTimeout:       pullTimeout,
		scanTimeout:       scanTimeout,
		stopDelay:         trivyStopDelay,
		retryDelay:        trivyRetryDelay,
		reports:           newReportStore(maxStoredReportsSize),
		restricted:        cfg.GetBool("restrictedHTTPClient"),
		refs:              make(map[string]*scanState),
		digests:           make(map[string]*scanState),
		rateLimited:       make(map[string]struct{}),
	}
}

// Close implements the ImageScanner interface.
func (s *TrivyScanner) Close() error {
	return s.reports.close()
}

// Prepare implements the ImageScanner interface. It downloads (or updates) the
// Java DB, which Trivy uses to identify jar files, and scans are told not to do
// it. Otherwise the first scan needing it would download it, into its temporary
// directory: the database takes more space than the disk margin of a scan, so
// the scan could be killed. The database is kept in the cache of Trivy, and the
// download uses the temporary directory of this process.
func (s *TrivyScanner) Prepare() error {
	ctx, cancel := context.WithTimeout(s.ctx, javaDBTimeout)
	defer cancel()

	cmd := s.trivyCommand(ctx, os.TempDir(), "--quiet", "image", "--download-java-db-only", "--skip-version-check", "--disable-telemetry")
	var stderr bytes.Buffer
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		if s.ctx.Err() != nil {
			return ErrScanCanceled
		}
		return fmt.Errorf("error downloading trivy java db: %w: %s", err, stderr.String())
	}
	return nil
}

// ScanImage implements the ImageScanner interface.
func (s *TrivyScanner) ScanImage(image string) ([]byte, error) {
	ref, err := name.ParseReference(image)
	if err != nil {
		return nil, fmt.Errorf("error parsing image %s ref: %w", image, err)
	}

	// Only the first request of a reference reaches the registry
	state, first := s.track(s.refs, ref.Name())
	if first {
		s.scanReference(state, ref, image)
	} else if err := s.wait(state); err != nil {
		return nil, err
	}
	if state.err != nil {
		return nil, state.err
	}

	// Prepare the report for the reference requested (Trivy has run, so failures
	// at this point are caused by its report)
	report := state.report
	if report == nil {
		if report, err = s.reports.get(state.digest); err != nil {
			return nil, s.failureError(image, trivyError(image), err)
		}
	}
	report, err = normalizeReport(report, image, ref, state.digest)
	if err != nil {
		return nil, s.failureError(image, trivyError(image), err)
	}
	return report, nil
}

// scanReference gets the manifest of the reference provided and scans the image,
// unless its digest has been seen already, updating the state provided.
func (s *TrivyScanner) scanReference(state *scanState, ref name.Reference, image string) {
	var (
		digest v1.Hash
		report []byte
	)
	err := errScanAborted
	defer func() {
		s.settle(s.refs, ref.Name(), state, digest, report, err, s.ctx.Err() == nil)
	}()

	if s.registryIsRateLimited(ref) {
		err = ErrRateLimited
		return
	}
	pull := newPullTimer(s.ctx, s.pullTimeout, oci.NewRateLimitTracker(ref))
	defer pull.close()
	pull.start()
	desc, getErr := oci.GetDescriptor(pull.ctx, s.cfg, ref, pull.rateLimits)
	pull.stop()
	if getErr != nil {
		err = s.translateError(ref, image, getErr)
		return
	}
	digest = desc.Digest
	report, scanErr := s.scanDigest(pull, ref, desc)
	err = s.translateError(ref, image, scanErr)
}

// scanDigest returns the report of the image in the descriptor provided, which
// is only scanned if its digest has not been seen already. The report returned
// is nil when it is available in the store.
func (s *TrivyScanner) scanDigest(pull *pullTimer, ref name.Reference, desc *remote.Descriptor) ([]byte, error) {
	for {
		state, first := s.track(s.digests, desc.Digest.String())
		if first {
			return s.scanNewDigest(state, pull, ref, desc)
		}
		if err := s.wait(state); err != nil {
			return nil, err
		}
		if state.err == nil || isImageFailure(state.err) {
			return state.report, state.err
		}

		// The scan failed because of the reference used, so try with this one
	}
}

// scanNewDigest scans the image in the descriptor provided, updating the state
// provided. Failures specific to the reference used are not kept in the state,
// as the same image may be available in other repositories.
func (s *TrivyScanner) scanNewDigest(
	state *scanState,
	pull *pullTimer,
	ref name.Reference,
	desc *remote.Descriptor,
) (report []byte, err error) {
	err = errScanAborted
	defer func() {
		keep := isImageFailure(err) && s.ctx.Err() == nil
		s.settle(s.digests, desc.Digest.String(), state, desc.Digest, report, err, keep)
	}()

	report, err = s.scanImage(pull, ref, desc)
	if err == nil && s.reports.add(desc.Digest, report) {
		return nil, nil
	}
	return report, err
}

// scanImage pulls the image in the descriptor provided as needed, and returns the
// report generated by Trivy.
func (s *TrivyScanner) scanImage(pull *pullTimer, ref name.Reference, desc *remote.Descriptor) ([]byte, error) {
	if s.registryIsRateLimited(ref) {
		return nil, ErrRateLimited
	}
	tmpDir, err := os.MkdirTemp("", "artifact-hub-scan")
	if err != nil {
		return nil, fmt.Errorf("error creating temp dir: %w", err)
	}
	defer os.RemoveAll(tmpDir)
	layoutPath := filepath.Join(tmpDir, imageLayout)

	// Scan the image with no layers
	pull.start()
	image, err := oci.NewImage(desc, s.maxImageSize)
	if err == nil {
		err = image.WriteLayout(layoutPath)
	}
	pull.stop()
	if err != nil {
		return nil, s.pullError(ref, pull, err)
	}
	report, stderr, err := s.scanLayout(tmpDir, image)
	if err == nil {
		return report, nil
	}
	if !missingLayer(image, stderr) {
		return nil, trivyRunError(stderr, err)
	}

	// The Trivy server needs some layers, so get them all and try again
	if s.registryIsRateLimited(ref) {
		return nil, ErrRateLimited
	}
	pull.start()
	err = image.WriteLayers(layoutPath, func(err error) {
		_ = s.pullError(ref, pull, err)
		pull.cancel()
	})
	pull.stop()
	if err != nil {
		return nil, s.pullError(ref, pull, err)
	}
	report, stderr, err = s.scanLayout(tmpDir, image)
	if err != nil {
		return nil, trivyRunError(stderr, err)
	}
	return report, nil
}

// pullError returns the error to report for a failed pull. Registries rate
// limiting requests are stopped right away, as other workers may be about to call
// them. The error received may not reflect it: foreign layers replace the response
// of the registry, and failures in other layers can take precedence.
func (s *TrivyScanner) pullError(ref name.Reference, pull *pullTimer, err error) error {
	if !isRateLimited(err) && !pull.rateLimits.Limited() {
		return err
	}
	s.setRateLimited(ref)
	return ErrRateLimited
}

// scanLayout runs Trivy on the layout available in the directory provided. Runs
// that fail are repeated once, as failures are remembered during the run for all
// references sharing the image, and they may have been caused by a transient
// issue. There is no need to do it when Trivy has just asked for the layers, it
// ran out of time or disk space, or the scanner is shutting down.
func (s *TrivyScanner) scanLayout(dir string, image *oci.Image) ([]byte, string, error) {
	startedAt := time.Now()
	report, stderr, err := s.runTrivy(dir)
	if err == nil ||
		missingLayer(image, stderr) ||
		errors.Is(err, oci.ErrImageTooLarge) ||
		time.Since(startedAt) >= s.scanTimeout ||
		s.ctx.Err() != nil {
		return report, stderr, err
	}
	log.Warn().Err(err).Str("stderr", stderr).Msg("trivy failed: trying again")
	select {
	case <-time.After(s.retryDelay):
		return s.runTrivy(dir)
	case <-s.ctx.Done():
		return report, stderr, err
	}
}

// runTrivy runs Trivy on the layout available in the directory provided. The Java
// DB is not updated, as it is done by Prepare.
func (s *TrivyScanner) runTrivy(dir string) ([]byte, string, error) {
	// Trivy cannot clean up when it crashes, and whatever it leaves behind must not
	// count against the disk limit of this run
	tmpDir := filepath.Join(dir, trivyTmpDir)
	if err := os.RemoveAll(tmpDir); err != nil {
		return nil, "", fmt.Errorf("error cleaning trivy temp dir: %w", err)
	}
	if err := os.Mkdir(tmpDir, 0o700); err != nil {
		return nil, "", fmt.Errorf("error creating trivy temp dir: %w", err)
	}

	ctx, cancel := context.WithTimeout(s.ctx, s.scanTimeout+s.stopDelay)
	defer cancel()

	trivyURL := s.cfg.GetString("scanner.trivyURL")
	cmd := s.trivyCommand(ctx, tmpDir, "--quiet", "image", "--list-all-pkgs", "--security-checks", "vuln", "--server", trivyURL, "--timeout", s.scanTimeout.String(), "--skip-version-check", "--disable-telemetry", "--skip-java-db-update", "-f", "json", "--input", imageLayout)
	var stdout, stderr bytes.Buffer
	cmd.Dir = dir
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr
	if err := cmd.Start(); err != nil {
		return nil, "", err
	}
	stopDiskLimit := s.limitDiskUsage(dir, cmd.Process)
	err := cmd.Wait()
	if stopDiskLimit() {
		return nil, "", oci.ErrImageTooLarge
	}
	return stdout.Bytes(), stderr.String(), err
}

// trivyCommand returns the command to run Trivy with the arguments provided,
// using the temporary directory provided. Trivy is asked to stop when the context
// provided is done. It does not get any address chosen by a third party, so it
// does not need to be restricted, and it does not need credentials.
func (s *TrivyScanner) trivyCommand(ctx context.Context, tmpDir string, args ...string) *exec.Cmd {
	cmd := exec.CommandContext(ctx, "trivy", args...) // #nosec
	cmd.Cancel = func() error { return cmd.Process.Signal(syscall.SIGTERM) }
	cmd.WaitDelay = s.stopDelay
	cmd.Env = []string{
		"PATH=" + os.Getenv("PATH"),
		"USER=" + os.Getenv("USER"),
		"HOME=" + os.Getenv("HOME"),
		"TMPDIR=" + tmpDir,
		"TRIVY_CACHE_DIR=" + os.Getenv("TRIVY_CACHE_DIR"),
		"TRIVY_NEW_JSON_SCHEMA=true", // Not needed in Trivy >= 0.20.0
	}
	return cmd
}

// limitDiskUsage kills the process provided if the directory provided grows over
// the limit. There is no need to ask it to stop: it may take a while, and its files
// are in that directory, so they will be removed anyway. The function returned must
// be called once the process has finished, and reports if the limit was exceeded.
func (s *TrivyScanner) limitDiskUsage(dir string, process *os.Process) func() bool {
	stop := make(chan struct{})
	exceeded := make(chan bool, 1)
	go func() {
		ticker := time.NewTicker(s.diskCheckInterval)
		defer ticker.Stop()
		for {
			select {
			case <-stop:
				exceeded <- false
				return
			case <-ticker.C:
				if usage, entries := diskUsage(dir); usage > s.maxDiskUsage || entries > s.maxEntries {
					log.Warn().Int64("usage", usage).Int64("entries", entries).Msg("scan exceeded its disk limit: killing trivy")
					_ = process.Kill()
					exceeded <- true
					return
				}
			}
		}
	}()
	return func() bool {
		close(stop)
		return <-exceeded
	}
}

// diskUsage returns the disk space allocated to the directory provided, and the
// number of entries in it. The size of the files would not do: a tiny file uses a
// whole block, so a large number of them can take far more space than they report.
// The size of the files is only used on systems where the space allocated is not
// available (the scanner only runs on Linux, but this package is built for other
// systems too). Trivy creates and removes files all the time, so those that cannot
// be read are ignored.
func diskUsage(dir string) (usage, entries int64) {
	_ = filepath.WalkDir(dir, func(_ string, entry os.DirEntry, err error) error {
		if err != nil {
			return nil
		}
		entries++
		if info, err := entry.Info(); err == nil {
			usage += allocatedSize(info)
		}
		return nil
	})
	return usage, entries
}

// track returns the state of the key provided from the table, creating it when
// it does not exist. In that case the caller must settle it.
func (s *TrivyScanner) track(table map[string]*scanState, key string) (*scanState, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if state, ok := table[key]; ok {
		return state, false
	}
	state := &scanState{done: make(chan struct{})}
	table[key] = state
	return state, true
}

// settle sets the result of the scan provided, waking up those waiting for it.
// Successful scans remain in the table while their report is in the store, and
// failures do if keep is true. The rest will be run again if requested later.
func (s *TrivyScanner) settle(
	table map[string]*scanState,
	key string,
	state *scanState,
	digest v1.Hash,
	report []byte,
	err error,
	keep bool,
) {
	s.mu.Lock()
	defer s.mu.Unlock()

	state.digest, state.report, state.err = digest, report, err
	if err == nil {
		keep = report == nil
	}
	if !keep {
		delete(table, key)
	}
	close(state.done)
}

// wait waits for the scan provided to be done.
func (s *TrivyScanner) wait(state *scanState) error {
	select {
	case <-state.done:
		return nil
	case <-s.ctx.Done():
		return ErrScanCanceled
	}
}

// registryIsRateLimited checks if the registry of the reference provided has been
// rate limiting requests during this run.
func (s *TrivyScanner) registryIsRateLimited(ref name.Reference) bool {
	s.mu.Lock()
	defer s.mu.Unlock()

	_, ok := s.rateLimited[ref.Context().RegistryStr()]
	return ok
}

// translateError returns the error to report for a failed scan, which is visible
// to users. Failures not caused by Trivy happened while preparing or pulling the
// image, as it only runs once the image is ready, and are reported as pull errors.
func (s *TrivyScanner) translateError(ref name.Reference, image string, err error) error {
	var failure *trivyFailure
	switch {
	case err == nil:
		return nil
	case isRateLimited(err):
		s.setRateLimited(ref)
		return ErrRateLimited
	case s.ctx.Err() != nil:
		return ErrScanCanceled
	case errors.Is(err, remote.ErrSchema1):
		return ErrSchemaV1NotSupported
	case isImageNotFound(err):
		return ErrImageNotFound
	case errors.Is(err, oci.ErrImageTooLarge):
		// Images too large are skipped, this is not an error
		if s.restricted {
			return oci.ErrImageTooLarge
		}
		return err
	case errors.As(err, &failure):
		return s.failureError(image, trivyError(image), err)
	}
	return s.failureError(image, pullImageError(image), err)
}

// failureError returns the failure provided, adding the details of the error
// that caused it when not restricted. Otherwise they are only logged.
func (s *TrivyScanner) failureError(image string, failure, err error) error {
	if s.restricted {
		log.Error().Err(err).Str("image", image).Msg("image scan failed")
		return failure
	}
	return fmt.Errorf("%w: %w", failure, err)
}

// setRateLimited stops the requests to the registry of the reference provided
// for the rest of the run.
func (s *TrivyScanner) setRateLimited(ref name.Reference) {
	s.mu.Lock()
	defer s.mu.Unlock()

	registry := ref.Context().RegistryStr()
	if _, ok := s.rateLimited[registry]; !ok {
		s.rateLimited[registry] = struct{}{}
		log.Warn().Str("registry", registry).Msg("rate limited: registry skipped for the rest of the run")
	}
}

// pullTimer limits the time spent pulling an image. A regular timeout cannot be
// used because go-containerregistry uses the context the descriptor was created
// with for all requests, and the time between the pull stages (running Trivy or
// waiting for other scans) must not count.
type pullTimer struct {
	ctx        context.Context
	cancel     context.CancelFunc
	timer      *time.Timer
	remaining  time.Duration
	startedAt  time.Time
	rateLimits *oci.RateLimitTracker
}

// newPullTimer creates a new pullTimer instance. Its context is canceled when
// the time available runs out during a stage.
func newPullTimer(parent context.Context, timeout time.Duration, rateLimits *oci.RateLimitTracker) *pullTimer {
	ctx, cancel := context.WithCancel(parent)
	timer := time.AfterFunc(timeout, cancel)
	timer.Stop()
	return &pullTimer{ctx: ctx, cancel: cancel, timer: timer, remaining: timeout, rateLimits: rateLimits}
}

// start starts a pull stage.
func (p *pullTimer) start() {
	p.startedAt = time.Now()
	p.timer.Reset(p.remaining)
}

// stop finishes a pull stage.
func (p *pullTimer) stop() {
	p.timer.Stop()
	p.remaining -= time.Since(p.startedAt)
}

// close releases the resources used by the timer.
func (p *pullTimer) close() {
	p.timer.Stop()
	p.cancel()
}

// trivyFailure represents a failed Trivy run.
type trivyFailure struct {
	output string
}

// trivyRunError returns the error for a failed Trivy run.
func trivyRunError(stderr string, err error) error {
	if errors.Is(err, oci.ErrImageTooLarge) {
		return err
	}
	if stderr == "" {
		stderr = err.Error()
	}
	return &trivyFailure{output: stderr}
}

// Error implements the error interface.
func (e *trivyFailure) Error() string {
	return e.output
}

// isImageFailure checks if the error provided is caused by the image itself, so
// it also applies to other references with the same digest. Errors depending on
// data that is not covered by the digest, like the content type of the manifest,
// must not be included, as any registry can serve any manifest.
func isImageFailure(err error) bool {
	var failure *trivyFailure
	return errors.As(err, &failure) || errors.Is(err, oci.ErrImageTooLarge)
}

// isImageNotFound checks if the error provided indicates that the image is not
// available in the registry.
func isImageNotFound(err error) bool {
	var transportErr *transport.Error
	if errors.As(err, &transportErr) {
		for _, diagnostic := range transportErr.Errors {
			switch diagnostic.Code {
			case transport.ManifestUnknownErrorCode, transport.UnauthorizedErrorCode:
				return true
			}
		}
	}
	return false
}

// isRateLimited checks if the error provided indicates that the registry is
// limiting the requests received. By the time it gets here, the request has been
// retried by go-containerregistry.
func isRateLimited(err error) bool {
	if errors.Is(err, ErrRateLimited) {
		return true
	}
	var transportErr *transport.Error
	if errors.As(err, &transportErr) {
		if transportErr.StatusCode == http.StatusTooManyRequests {
			return true
		}
		for _, diagnostic := range transportErr.Errors {
			if diagnostic.Code == transport.TooManyRequestsErrorCode {
				return true
			}
		}
	}
	return false
}

// missingLayer checks if the output of Trivy provided mentions any of the layers
// of the image. Other blobs are not expected, so they are ignored.
func missingLayer(image *oci.Image, stderr string) bool {
	for _, match := range missingBlobRE.FindAllStringSubmatch(stderr, -1) {
		digest, err := v1.NewHash(match[1] + ":" + match[2])
		if err == nil && image.HasLayer(digest) {
			return true
		}
	}
	return false
}

// normalizeReport makes the names in the report of a scanned layout match the
// ones obtained when scanning the image from the registry, as stored reports are
// public and their targets are used in links.
func normalizeReport(reportJSON []byte, image string, ref name.Reference, digest v1.Hash) ([]byte, error) {
	var report trivy.Report
	if err := json.Unmarshal(reportJSON, &report); err != nil {
		return nil, fmt.Errorf("error unmarshalling report: %w", err)
	}
	report.ArtifactName = image
	repoDigest := repositoryName(ref) + "@" + digest.String()
	report.Metadata.RepoDigests = []string{repoDigest}
	reference := repoDigest
	if tag, ok := ref.(name.Tag); ok {
		reference = repositoryName(ref) + ":" + tag.TagStr()
		report.Metadata.RepoTags = []string{reference}
	}
	var err error
	if report.Metadata.Reference, err = trivyname.ParseReference(reference); err != nil {
		return nil, fmt.Errorf("error parsing report reference: %w", err)
	}
	for i := range report.Results {
		if report.Results[i].Class != trivy.ClassOSPkg {
			continue
		}
		if details, ok := strings.CutPrefix(report.Results[i].Target, imageLayout+" "); ok {
			report.Results[i].Target = image + " " + details
		}
	}
	return json.Marshal(report)
}

// repositoryName returns the name of the repository used by Trivy in reports.
func repositoryName(ref name.Reference) string {
	repository := ref.Context()
	if repository.RegistryStr() != name.DefaultRegistry {
		return repository.Name()
	}
	return strings.TrimPrefix(repository.RepositoryStr(), "library/")
}

// trivyError returns the error used when Trivy cannot scan an image.
func trivyError(image string) error {
	return fmt.Errorf("error running trivy on image %s", image)
}

// pullImageError returns the error used when an image cannot be pulled.
func pullImageError(image string) error {
	return fmt.Errorf("error pulling image %s", image)
}
