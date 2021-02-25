package hub

import (
	"context"

	"github.com/artifacthub/hub/internal/img"
	"github.com/rs/zerolog"
	"github.com/spf13/viper"
	"golang.org/x/time/rate"
)

// TrackerServices represents a set of services that must be provided to a
// Tracker instance so that it can perform its tasks.
type TrackerServices struct {
	Ctx                context.Context
	Cfg                *viper.Viper
	Rm                 RepositoryManager
	Pm                 PackageManager
	Rc                 RepositoryCloner
	Oe                 OLMOCIExporter
	Ec                 ErrorsCollector
	Hc                 HTTPClient
	Is                 img.Store
	GithubRL           *rate.Limiter
	SetupTrackerSource TrackerSourceLoader
}

// TrackerSource defines the methods a TrackerSource implementation must
// provide.
type TrackerSource interface {
	// GetPackagesAvailable represents a function that returns a list of
	// available packages in a given repository. Each repository kind will
	// require using a specific TrackerSource implementation that will know
	// best how to get the available packages in the repository. The key used
	// in the returned map is expected to be built using the BuildKey helper
	// function in the pkg package.
	GetPackagesAvailable() (map[string]*Package, error)
}

// TrackerSourceInput represents the input provided to a TrackerSource to get
// the packages available in a repository when tracking it.
type TrackerSourceInput struct {
	Repository         *Repository
	PackagesRegistered map[string]string
	BasePath           string
	Svc                *TrackerSourceServices
}

// TrackerSourceLoader represents a function that sets up the appropriate
// tracker source for a given repository.
type TrackerSourceLoader func(i *TrackerSourceInput) TrackerSource

// TrackerSourceServices represents a set of services that will be provided to
// a TrackerSource instance so that it can perform its tasks.
type TrackerSourceServices struct {
	Ctx      context.Context
	Cfg      *viper.Viper
	Ec       ErrorsCollector
	Hc       HTTPClient
	Is       img.Store
	Logger   zerolog.Logger
	GithubRL *rate.Limiter
}
