package source

import (
	"strconv"
	"testing"

	"github.com/artifacthub/hub/internal/hub"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestParseChangesAnnotation(t *testing.T) {
	testCases := []struct {
		annotation      string
		expectedChanges []*hub.Change
		expectedErrMsg  string
	}{
		{
			`
1234
`,
			nil,
			"invalid changes annotation",
		},
		{
			`
- invalid: entry
`,
			nil,
			"invalid change: description not provided",
		},
		{
			`
- cool feature
- bug fixed
`,
			[]*hub.Change{
				{
					Description: "cool feature",
				},
				{
					Description: "bug fixed",
				},
			},
			"",
		},
		{
			`
- kind: added
  description: feature 1
- kind: fixed
  description: issue 1
`,
			[]*hub.Change{
				{
					Kind:        "added",
					Description: "feature 1",
				},
				{
					Kind:        "fixed",
					Description: "issue 1",
				},
			},
			"",
		},
		{
			`
- kind: Added
  description: feature 1
- kind: FIXED
  description: issue 1
`,
			[]*hub.Change{
				{
					Kind:        "added",
					Description: "feature 1",
				},
				{
					Kind:        "fixed",
					Description: "issue 1",
				},
			},
			"",
		},
		{
			`
- kind: invalid
  description: feature 1
`,
			nil,
			"invalid change: invalid kind: invalid",
		},
	}
	for i, tc := range testCases {
		tc := tc
		t.Run(strconv.Itoa(i), func(t *testing.T) {
			t.Parallel()
			changes, err := ParseChangesAnnotation(tc.annotation)
			if tc.expectedErrMsg == "" {
				assert.Nil(t, err)
			} else {
				require.Error(t, err)
				assert.Contains(t, err.Error(), tc.expectedErrMsg)
			}
			assert.Equal(t, tc.expectedChanges, changes)
		})
	}
}
