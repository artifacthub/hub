package tracker

import (
	"context"
	"errors"
	"testing"

	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/repo"
	"github.com/artifacthub/hub/internal/tests"
	"github.com/stretchr/testify/assert"
)

func TestSetVerifiedPublisherFlag(t *testing.T) {
	// Setup some services required by tests
	repo1ID := "00000000-0000-0000-0000-000000000001"

	t.Run("verified publisher flag set to true successfully (remote url)", func(t *testing.T) {
		// Setup expectations
		r := &hub.Repository{
			RepositoryID:      repo1ID,
			VerifiedPublisher: false,
		}
		sw := newServicesWrapper()
		sw.rm.On("SetVerifiedPublisher", sw.ctx, r.RepositoryID, true).Return(nil)
		sw.rm.On("GetMetadata", "mdFile").Return(&hub.RepositoryMetadata{RepositoryID: repo1ID}, nil)

		// Run test and check expectations
		err := SetVerifiedPublisherFlag(sw.svc, r, "mdFile")
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
		sw.rm.On("GetMetadata", "mdFile").Return(&hub.RepositoryMetadata{RepositoryID: repo1ID}, nil)

		// Run test and check expectations
		err := SetVerifiedPublisherFlag(sw.svc, r, "mdFile")
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
		sw.rm.On("GetMetadata", "mdFile").Return(nil, tests.ErrFake)

		// Run test and check expectations
		err := SetVerifiedPublisherFlag(sw.svc, r, "mdFile")
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
		sw.rm.On("GetMetadata", "mdFile").Return(nil, tests.ErrFake)
		sw.rm.On("SetVerifiedPublisher", sw.ctx, r.RepositoryID, false).Return(nil)

		// Run test and check expectations
		err := SetVerifiedPublisherFlag(sw.svc, r, "mdFile")
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
		sw.rm.On("GetMetadata", "mdFile").Return(&hub.RepositoryMetadata{RepositoryID: repo1ID}, nil)
		sw.rm.On("SetVerifiedPublisher", sw.ctx, r.RepositoryID, true).Return(tests.ErrFake)

		// Run test and check expectations
		err := SetVerifiedPublisherFlag(sw.svc, r, "mdFile")
		assert.True(t, errors.Is(err, tests.ErrFake))
		sw.assertExpectations(t)
	})
}

type servicesWrapper struct {
	ctx context.Context
	rm  *repo.ManagerMock
	hg  *tests.HTTPGetterMock
	svc *Services
}

func newServicesWrapper() *servicesWrapper {
	ctx := context.Background()
	rm := &repo.ManagerMock{}
	hg := &tests.HTTPGetterMock{}
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
