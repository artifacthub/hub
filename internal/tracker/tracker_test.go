package tracker

import (
	"context"
	"errors"
	"net/http"
	"os"
	"testing"

	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/repo"
	"github.com/stretchr/testify/assert"
)

var errFake = errors.New("fake error for tests")

func TestSetVerifiedPublisherFlag(t *testing.T) {
	// Setup some services required by tests
	repo1ID := "00000000-0000-0000-0000-000000000001"

	t.Run("verified publisher flag set to true successfully (local file)", func(t *testing.T) {
		// Setup expectations
		r := &hub.Repository{
			RepositoryID:      repo1ID,
			VerifiedPublisher: false,
		}
		sw := newServicesWrapper()
		sw.rm.On("SetVerifiedPublisher", sw.ctx, r.RepositoryID, true).Return(nil)

		// Run test and check expectations
		err := SetVerifiedPublisherFlag(sw.svc, r, "testdata/artifacthub-repo.yml")
		assert.Nil(t, err)
		sw.assertExpectations(t)
	})

	t.Run("verified publisher flag set to true successfully (remote url)", func(t *testing.T) {
		// Setup expectations
		r := &hub.Repository{
			RepositoryID:      repo1ID,
			VerifiedPublisher: false,
		}
		sw := newServicesWrapper()
		sw.rm.On("SetVerifiedPublisher", sw.ctx, r.RepositoryID, true).Return(nil)
		mdFile, _ := os.Open("testdata/artifacthub-repo.yml")
		sw.hg.On("Get", "http://remote.url/artifacthub-repo.yml").Return(&http.Response{
			Body:       mdFile,
			StatusCode: http.StatusOK,
		}, nil)

		// Run test and check expectations
		err := SetVerifiedPublisherFlag(sw.svc, r, "http://remote.url/artifacthub-repo.yml")
		assert.Nil(t, err)
		sw.assertExpectations(t)
	})

	t.Run("verified publisher flag not set as it was already true", func(t *testing.T) {
		// Setup expectations
		r := &hub.Repository{
			RepositoryID:      repo1ID,
			VerifiedPublisher: true,
		}
		sw := newServicesWrapper()

		// Run test and check expectations
		err := SetVerifiedPublisherFlag(sw.svc, r, "testdata/artifacthub-repo.yml")
		assert.Nil(t, err)
		sw.assertExpectations(t)
	})

	t.Run("verified publisher flag not set: it was false and md file did not exist", func(t *testing.T) {
		// Setup expectations
		r := &hub.Repository{
			RepositoryID:      repo1ID,
			VerifiedPublisher: false,
		}
		sw := newServicesWrapper()

		// Run test and check expectations
		err := SetVerifiedPublisherFlag(sw.svc, r, "testdata/artifacthub-repo-inexistent.yml")
		assert.Nil(t, err)
		sw.assertExpectations(t)
	})

	t.Run("verified publisher flag set to false: it was true and md file did not exist", func(t *testing.T) {
		// Setup expectations
		r := &hub.Repository{
			RepositoryID:      repo1ID,
			VerifiedPublisher: true,
		}
		sw := newServicesWrapper()
		sw.rm.On("SetVerifiedPublisher", sw.ctx, r.RepositoryID, false).Return(nil)

		// Run test and check expectations
		err := SetVerifiedPublisherFlag(sw.svc, r, "testdata/artifacthub-repo-inexistent.yml")
		assert.Nil(t, err)
		sw.assertExpectations(t)
	})

	t.Run("set verified publisher flag failed", func(t *testing.T) {
		// Setup expectations
		r := &hub.Repository{
			RepositoryID:      repo1ID,
			VerifiedPublisher: false,
		}
		sw := newServicesWrapper()
		sw.rm.On("SetVerifiedPublisher", sw.ctx, r.RepositoryID, true).Return(errFake)

		// Run test and check expectations
		err := SetVerifiedPublisherFlag(sw.svc, r, "testdata/artifacthub-repo.yml")
		assert.True(t, errors.Is(err, errFake))
		sw.assertExpectations(t)
	})
}

type servicesWrapper struct {
	ctx context.Context
	rm  *repo.ManagerMock
	hg  *HTTPGetterMock
	svc *Services
}

func newServicesWrapper() *servicesWrapper {
	ctx := context.Background()
	rm := &repo.ManagerMock{}
	hg := &HTTPGetterMock{}
	svc := &Services{
		Ctx: ctx,
		Rm:  rm,
		Hg:  hg,
	}
	return &servicesWrapper{
		ctx: ctx,
		rm:  rm,
		hg:  hg,
		svc: svc,
	}
}

func (sw *servicesWrapper) assertExpectations(t *testing.T) {
	sw.rm.AssertExpectations(t)
	sw.hg.AssertExpectations(t)
}
