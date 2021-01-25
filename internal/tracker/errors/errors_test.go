package errors

import (
	"context"
	"testing"

	"github.com/artifacthub/hub/internal/repo"
)

func TestCollector(t *testing.T) {
	t.Parallel()

	// Setup errors collector
	rm := &repo.ManagerMock{}
	ec := NewCollector(rm)

	// Initialize list of errors for repo1 (repo2 will be implicitly initialized)
	ec.Init("repo1")

	// Append some errors for both repositories
	ec.Append("repo1", "error1")
	ec.Append("repo1", "error2")
	ec.Append("repo2", "error2")
	ec.Append("repo2", "error1")

	// Flush errors and check the results were set as expected
	rm.On("SetLastTrackingResults", context.Background(), "repo1", "error1\nerror2").Return(nil)
	rm.On("SetLastTrackingResults", context.Background(), "repo2", "error1\nerror2").Return(nil)
	ec.Flush()
	rm.AssertExpectations(t)
}
