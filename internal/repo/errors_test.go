package repo

import (
	"context"
	"fmt"
	"strings"
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

func TestCollectorTruncation(t *testing.T) {
	// Expected text: the first maxErrorsPerRepository errors once sorted
	expectedErrors := make([]string, 0, maxErrorsPerRepository)
	for i := range maxErrorsPerRepository {
		expectedErrors = append(expectedErrors, fmt.Sprintf("error%03d", i))
	}
	expectedText := strings.Join(expectedErrors, "\n")

	kinds := []struct {
		kind         ErrorsCollectorKind
		expectedCall string
	}{
		{Scanner, "SetLastScanningResults"},
		{Tracker, "SetLastTrackingResults"},
	}
	orders := []struct {
		name       string
		descending bool
	}{
		{"ascending", false},
		{"descending", true},
	}
	for _, k := range kinds {
		for _, o := range orders {
			t.Run(fmt.Sprintf("%s %s", k.expectedCall, o.name), func(t *testing.T) {
				t.Parallel()

				// Setup errors collector
				rm := &ManagerMock{}
				ec := NewErrorsCollector(rm, k.kind)

				// Append more errors than the maximum allowed
				const numErrors = 150
				for i := range numErrors {
					n := i
					if o.descending {
						n = numErrors - 1 - i
					}
					ec.Append("repo1", fmt.Sprintf("error%03d", n))
				}

				// Flush errors and check only the first ones were stored
				rm.On(k.expectedCall, context.Background(), "repo1", expectedText).Return(nil)
				ec.Flush()
				rm.AssertExpectations(t)
			})
		}
	}
}
