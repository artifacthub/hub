package source

import (
	"context"
	"encoding/json"
	"testing"

	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/img"
	"github.com/artifacthub/hub/internal/repo"
	"github.com/artifacthub/hub/internal/tests"
	"github.com/rs/zerolog"
	"github.com/spf13/viper"
	"golang.org/x/time/rate"
)

// TestsServicesWrapper is wrapper around a TrackerSourceServices instance used
// in tests.
type TestsServicesWrapper struct {
	Ec  *repo.ErrorsCollectorMock
	Hc  *tests.HTTPClientMock
	Is  *img.StoreMock
	Svc *hub.TrackerSourceServices
}

// NewTestsServicesWrapper creates a new TestsServicesWrapper instance.
func NewTestsServicesWrapper() *TestsServicesWrapper {
	// Setup mocks
	ec := &repo.ErrorsCollectorMock{}
	hc := &tests.HTTPClientMock{}
	is := &img.StoreMock{}

	// Setup tracker source services using mocks
	svc := &hub.TrackerSourceServices{
		Ctx:      context.Background(),
		Cfg:      viper.New(),
		Ec:       ec,
		Hc:       hc,
		Is:       is,
		Logger:   zerolog.Nop(),
		GithubRL: rate.NewLimiter(rate.Inf, 0),
	}

	// Setup tests services wrapper and return it
	return &TestsServicesWrapper{
		Ec:  ec,
		Hc:  hc,
		Is:  is,
		Svc: svc,
	}
}

// AssertExpectations asserts all expectations defined for the mocks in the
// services wrapper.
func (sw *TestsServicesWrapper) AssertExpectations(t *testing.T) {
	sw.Ec.AssertExpectations(t)
	sw.Hc.AssertExpectations(t)
	sw.Is.AssertExpectations(t)
}

// ClonePackage clones the provided package returning a new one.
func ClonePackage(p *hub.Package) *hub.Package {
	b, _ := json.Marshal(p)
	new := &hub.Package{}
	_ = json.Unmarshal(b, new)
	return new
}
