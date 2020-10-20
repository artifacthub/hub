package tracker

import (
	"context"
	"errors"
	"testing"

	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/repo"
)

func TestDBErrorsCollector(t *testing.T) {
	// Setup errors collector
	rm := &repo.ManagerMock{}
	repos := []*hub.Repository{
		{
			RepositoryID: "repo1",
		},
		{
			RepositoryID: "repo2",
		},
	}
	ec := NewDBErrorsCollector(rm, repos)

	// Append some errors for both repositories
	ec.Append("repo1", errors.New("error1"))
	ec.Append("repo1", errors.New("error2"))
	ec.Append("repo2", errors.New("error2"))
	ec.Append("repo2", errors.New("error1"))

	// Flush errors and check the results were set as expected
	rm.On("SetLastTrackingResults", context.Background(), "repo1", "error1\nerror2").Return(nil)
	rm.On("SetLastTrackingResults", context.Background(), "repo2", "error1\nerror2").Return(nil)
	ec.Flush()
	rm.AssertExpectations(t)
}
