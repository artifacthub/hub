package labeler

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestParseReply(t *testing.T) {
	t.Parallel()

	t.Run("valid reply", func(t *testing.T) {
		t.Parallel()
		reply := `{"labels": [
			{"id": "p2", "category": "none", "confidence": "low", "suspicious": true},
			{"id": "p1", "category": "database", "confidence": "high", "suspicious": false}
		]}`
		labels, err := ParseReply([]byte(reply), 2)
		require.NoError(t, err)
		assert.Equal(t, []Label{
			{Category: "database", Confidence: "high", Suspicious: false},
			{Category: "none", Confidence: "low", Suspicious: true},
		}, labels)
	})

	t.Run("invalid reply", func(t *testing.T) {
		t.Parallel()

		testCases := []struct {
			desc        string
			reply       string
			expectedErr string
		}{
			{
				"empty",
				"",
				"error decoding reply",
			},
			{
				"not json",
				"Sure! Here are the labels",
				"error decoding reply",
			},
			{
				"not an object",
				`[{"id": "p1"}]`,
				"error decoding reply",
			},
			{
				"unknown field",
				`{"labels": [], "notes": "x"}`,
				"error decoding reply",
			},
			{
				"unknown label field",
				`{"labels": [{"id": "p1", "category": "database", "confidence": "high", "suspicious": false, "reason": "x"}]}`,
				"error decoding reply",
			},
			{
				"trailing data",
				`{"labels": [{"id": "p1", "category": "database", "confidence": "high", "suspicious": false}]} {}`,
				"unexpected data after reply",
			},
			{
				"labels not provided",
				`{}`,
				"labels not provided",
			},
			{
				"label missing",
				`{"labels": []}`,
				"label for p1 not provided",
			},
			{
				"id missing",
				`{"labels": [{"category": "database", "confidence": "high", "suspicious": false}]}`,
				"label id not provided",
			},
			{
				"category missing",
				`{"labels": [{"id": "p1", "confidence": "high", "suspicious": false}]}`,
				"p1: category not provided",
			},
			{
				"confidence missing",
				`{"labels": [{"id": "p1", "category": "database", "suspicious": false}]}`,
				"p1: confidence not provided",
			},
			{
				"suspicious missing",
				`{"labels": [{"id": "p1", "category": "database", "confidence": "high"}]}`,
				"p1: suspicious not provided",
			},
			{
				"unknown id",
				`{"labels": [{"id": "p2", "category": "database", "confidence": "high", "suspicious": false}]}`,
				`unknown id "p2"`,
			},
			{
				"package name as id",
				`{"labels": [{"id": "redis", "category": "database", "confidence": "high", "suspicious": false}]}`,
				`unknown id "redis"`,
			},
			{
				"duplicate id",
				`{"labels": [
					{"id": "p1", "category": "database", "confidence": "high", "suspicious": false},
					{"id": "p1", "category": "storage", "confidence": "high", "suspicious": false}
				]}`,
				`duplicate id "p1"`,
			},
			{
				"invalid category",
				`{"labels": [{"id": "p1", "category": "Database", "confidence": "high", "suspicious": false}]}`,
				`p1: invalid category "Database"`,
			},
			{
				"skip prediction is not a category",
				`{"labels": [{"id": "p1", "category": "skip-prediction", "confidence": "high", "suspicious": false}]}`,
				`p1: invalid category "skip-prediction"`,
			},
			{
				"invalid confidence",
				`{"labels": [{"id": "p1", "category": "database", "confidence": "0.9", "suspicious": false}]}`,
				`p1: invalid confidence "0.9"`,
			},
			{
				"invalid suspicious",
				`{"labels": [{"id": "p1", "category": "database", "confidence": "high", "suspicious": "no"}]}`,
				"error decoding reply",
			},
		}
		for _, tc := range testCases {
			t.Run(tc.desc, func(t *testing.T) {
				t.Parallel()
				labels, err := ParseReply([]byte(tc.reply), 1)
				require.ErrorIs(t, err, ErrInvalidReply)
				assert.Contains(t, err.Error(), tc.expectedErr)
				assert.Nil(t, labels)
			})
		}
	})
}
