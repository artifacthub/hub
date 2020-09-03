package tracker

import (
	"context"
	"fmt"
	"io/ioutil"
	"net/http"
	"net/url"
	"sync"

	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/img"
	"github.com/artifacthub/hub/internal/repo"
	"github.com/spf13/viper"
	"gopkg.in/yaml.v2"
)

// HTTPGetter defines the methods an HTTPGetter implementation must provide.
type HTTPGetter interface {
	Get(url string) (*http.Response, error)
}

// Tracker is the interface that wraps the Track method, used to ask a tracker
// to start running and processing packages in a given repository. A call to
// wg.Done() is expected once the tracker has completed.
type Tracker interface {
	Track(wg *sync.WaitGroup) error
}

// New represents a function that creates new repository trackers. Each tracker
// is in charge of processing a given repository, and based on the concurrency
// configured, the tracker cmd may run multiple Tracker instances concurrently.
type New func(svc *Services, r *hub.Repository, opts ...func(t Tracker)) Tracker

// Services represents a set of services that must be provided to a Tracker
// instance so that it can perform its tasks.
type Services struct {
	Ctx context.Context
	Cfg *viper.Viper
	Rc  hub.RepositoryCloner
	Rm  hub.RepositoryManager
	Pm  hub.PackageManager
	Il  hub.HelmIndexLoader
	Is  img.Store
	Ec  ErrorsCollector
	Hg  HTTPGetter
}

// SetVerifiedPublisherFlag sets the repository verified publisher flag for the
// repository provided when needed.
func SetVerifiedPublisherFlag(svc *Services, r *hub.Repository, mdFile string) error {
	var verifiedPublisher bool
	md, err := readRepositoryMetadataFile(svc.Hg, mdFile)
	if err == nil {
		if r.RepositoryID == md.RepositoryID {
			verifiedPublisher = true
		}
	}
	if r.VerifiedPublisher != verifiedPublisher {
		err := svc.Rm.SetVerifiedPublisher(svc.Ctx, r.RepositoryID, verifiedPublisher)
		if err != nil {
			return fmt.Errorf("error setting verified publisher flag: %w", err)
		}
	}
	return nil
}

// readRepositoryMetadataFile is a helper function that reads the repository
// metadata file provided, which can be a remote URL or a local file path.
func readRepositoryMetadataFile(hg HTTPGetter, mdFile string) (*hub.RepositoryMetadata, error) {
	var data []byte
	u, err := url.Parse(mdFile)
	if err != nil || u.Scheme == "" || u.Host == "" {
		data, err = ioutil.ReadFile(mdFile)
		if err != nil {
			return nil, fmt.Errorf("error reading repository metadata file: %w", err)
		}
	} else {
		resp, err := hg.Get(mdFile)
		if err != nil {
			return nil, fmt.Errorf("error downloading repository metadata file: %w", err)
		}
		defer resp.Body.Close()
		if resp.StatusCode != http.StatusOK {
			return nil, fmt.Errorf("unexpected status code received: %d", resp.StatusCode)
		}
		data, err = ioutil.ReadAll(resp.Body)
		if err != nil {
			return nil, fmt.Errorf("error reading repository metadata file: %w", err)
		}
	}

	var md *hub.RepositoryMetadata
	if err = yaml.Unmarshal(data, &md); err != nil || md == nil {
		return nil, fmt.Errorf("error unmarshaling repository metadata file: %w", err)
	}
	if err = repo.ValidateMetadata(md); err != nil {
		return nil, fmt.Errorf("error validating repository metadata file: %w", err)
	}

	return md, nil
}
