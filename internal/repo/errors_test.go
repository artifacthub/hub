package repo

import (
	"context"
	"testing"
)

func TestCollector(t *testing.T) {
	testCases := []struct {
		kind         ErrorsCollectorKind
		expectedCall string
	}{
		{
			Scanner,
			"SetLastScanningResults",
		},
		{
			Tracker,
			"SetLastTrackingResults",
		},
	}
	for _, tc := range testCases {
		tc := tc
		t.Run(tc.expectedCall, func(t *testing.T) {
			t.Parallel()

			// Setup errors collector
			rm := &ManagerMock{}
			ec := NewErrorsCollector(rm, tc.kind)

			// Initialize list of errors for repo1 (repo2 will be implicitly initialized)
			ec.Init("repo1")

			// Append some errors for both repositories
			ec.Append("repo1", "error1")
			ec.Append("repo1", "error2")
			ec.Append("repo2", "error2")
			ec.Append("repo2", "error1")

			// Flush errors and check the results were set as expected
			rm.On(tc.expectedCall, context.Background(), "repo1", "error1\nerror2").Return(nil)
			rm.On(tc.expectedCall, context.Background(), "repo2", "error1\nerror2").Return(nil)
			ec.Flush()
			rm.AssertExpectations(t)
		})
	}
}
