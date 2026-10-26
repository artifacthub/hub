package model

import (
	"encoding/json"
	"strings"
	"testing"

	"github.com/artifacthub/hub/internal/category/catalog"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// testModel returns a small valid model.
func testModel() *Model {
	return &Model{
		FormatVersion:        FormatVersion,
		FeaturesVersion:      FeaturesVersion,
		Algorithm:            AlgorithmLogisticRegression,
		Categories:           []string{"database", "networking", "security"},
		SuppressedCategories: []string{"security"},
		Vocabulary:           []string{"desc:postgres", "kw:nginx", "kw:vault", "name:proxy"},
		Weights: [][]float32{
			{3, 0, 0, 0},
			{0, 3, 0, 1},
			{0, 0, 3, 0},
		},
		Bias:               []float32{0, 0, 0},
		Threshold:          0.6,
		CategoryThresholds: map[string]float64{"database": 0.7},
		DatasetDigest:      "sha256:dataset",
		CatalogDigest:      catalog.ModelDigest(),
		TrainingSetDigest:  "sha256:training-set",
		Metrics: Metrics{
			Categories:            []CategoryMetrics{},
			SuppressedCategories:  []string{"security"},
			LowEvidenceCategories: []string{},
			ExcludedCategories:    []string{},
			ConfusionMatrix:       ConfusionMatrix{Labels: []string{}, Counts: [][]int{}},
			Algorithms:            []AlgorithmMetrics{},
		},
	}
}

func TestModelPredict(t *testing.T) {
	t.Parallel()

	m := testModel()

	t.Run("predictions", func(t *testing.T) {
		t.Parallel()

		testCases := []struct {
			desc               string
			input              Input
			expectedCategory   string
			expectedConfidence float64
		}{
			{
				"confident prediction",
				Input{Name: "pg", Description: "Postgres database"},
				"database",
				0.9094,
			},
			{
				"confident prediction using several features",
				Input{Name: "proxy", Keywords: []string{"nginx"}},
				"networking",
				0.9647,
			},
			{
				"below threshold",
				Input{Name: "proxy"},
				"",
				0.5761,
			},
			{
				"suppressed category",
				Input{Keywords: []string{"vault"}},
				"",
				0.9094,
			},
			{
				"no known features",
				Input{Name: "something", Keywords: []string{"else"}},
				"",
				0,
			},
			{
				"no features",
				Input{},
				"",
				0,
			},
		}
		for _, tc := range testCases {
			t.Run(tc.desc, func(t *testing.T) {
				t.Parallel()
				category, confidence := m.Predict(tc.input)
				assert.Equal(t, tc.expectedCategory, category)
				assert.InDelta(t, tc.expectedConfidence, confidence, 1e-4)
			})
		}
	})

	t.Run("categories with their own threshold", func(t *testing.T) {
		t.Parallel()

		m := testModel()
		m.CategoryThresholds = map[string]float64{"database": 0.95, "networking": 0.5}
		category, confidence := m.Predict(Input{Name: "pg", Description: "Postgres database"})
		assert.Empty(t, category)
		assert.InDelta(t, 0.9094, confidence, 1e-4)
		category, confidence = m.Predict(Input{Name: "proxy"})
		assert.Equal(t, "networking", category)
		assert.InDelta(t, 0.5761, confidence, 1e-4)
	})

	t.Run("invalid models never panic", func(t *testing.T) {
		t.Parallel()

		input := Input{Name: "proxy", Keywords: []string{"nginx", "vault"}, Description: "postgres"}
		testCases := []struct {
			desc   string
			mutate func(m *Model) *Model
		}{
			{"nil model", func(m *Model) *Model { return nil }},
			{"zero model", func(m *Model) *Model { return &Model{} }},
			{"missing weights rows", func(m *Model) *Model { m.Weights = m.Weights[:1]; return m }},
			{"short weights row", func(m *Model) *Model { m.Weights[1] = m.Weights[1][:2]; return m }},
			{"missing bias", func(m *Model) *Model { m.Bias = nil; return m }},
			{"missing categories", func(m *Model) *Model { m.Categories = m.Categories[:1]; return m }},
			{"vocabulary longer than weights", func(m *Model) *Model {
				m.Vocabulary = append(m.Vocabulary, "zzz:extra")
				return m
			}},
		}
		for _, tc := range testCases {
			t.Run(tc.desc, func(t *testing.T) {
				t.Parallel()
				m := tc.mutate(testModel())
				assert.NotPanics(t, func() {
					category, _ := m.Predict(input)
					assert.Empty(t, category)
				})
			})
		}
	})
}

func TestUnmarshal(t *testing.T) {
	t.Parallel()

	t.Run("round trip", func(t *testing.T) {
		t.Parallel()

		data, err := testModel().Marshal()
		require.NoError(t, err)
		m, err := Unmarshal(data)
		require.NoError(t, err)
		assert.Equal(t, testModel(), m)
		data2, err := m.Marshal()
		require.NoError(t, err)
		assert.Equal(t, data, data2)
	})

	t.Run("invalid models", func(t *testing.T) {
		t.Parallel()

		testCases := []struct {
			desc        string
			mutate      func(m *Model)
			expectedErr string
		}{
			{"format version", func(m *Model) { m.FormatVersion = FormatVersion + 1 }, "format version 2"},
			{"features version", func(m *Model) { m.FeaturesVersion = FeaturesVersion + 1 }, "features version 2"},
			{"unknown algorithm", func(m *Model) { m.Algorithm = "svm" }, `unknown algorithm "svm"`},
			{"no categories", func(m *Model) {
				m.Categories, m.Weights, m.Bias, m.SuppressedCategories = nil, nil, nil, nil
			}, "no categories"},
			{"unknown category", func(m *Model) { m.Categories[0] = "unknown" }, `unknown category "unknown"`},
			{"reserved category", func(m *Model) { m.Categories[0] = catalog.None }, `unknown category "none"`},
			{"duplicate category", func(m *Model) { m.Categories[1] = "database" }, `duplicate category "database"`},
			{"unknown suppressed category", func(m *Model) {
				m.SuppressedCategories = []string{"storage"}
			}, `suppressed category "storage" is not a model category`},
			{"duplicate suppressed category", func(m *Model) {
				m.SuppressedCategories = []string{"security", "security"}
			}, `duplicate suppressed category "security"`},
			{"empty feature", func(m *Model) { m.Vocabulary[0] = "" }, "empty vocabulary feature"},
			{"unsorted vocabulary", func(m *Model) {
				m.Vocabulary[0], m.Vocabulary[1] = m.Vocabulary[1], m.Vocabulary[0]
			}, "vocabulary not sorted"},
			{"duplicate feature", func(m *Model) { m.Vocabulary[1] = m.Vocabulary[0] }, "vocabulary not sorted or with duplicates"},
			{"weights rows mismatch", func(m *Model) { m.Weights = m.Weights[:2] }, "weights rows (2) don't match categories (3)"},
			{"weights row length mismatch", func(m *Model) { m.Weights[2] = m.Weights[2][:3] }, "weights row 2 length (3)"},
			{"bias length mismatch", func(m *Model) { m.Bias = m.Bias[:1] }, "bias length (1)"},
			{"negative threshold", func(m *Model) { m.Threshold = -0.1 }, "threshold must be between 0 and 1"},
			{"threshold above one", func(m *Model) { m.Threshold = 1.1 }, "threshold must be between 0 and 1"},
			{"unknown threshold category", func(m *Model) {
				m.CategoryThresholds = map[string]float64{"storage": 0.7}
			}, `threshold category "storage" is not a model category`},
			{"suppressed threshold category", func(m *Model) {
				m.CategoryThresholds = map[string]float64{"security": 0.7}
			}, `threshold category "security" is suppressed`},
			{"negative category threshold", func(m *Model) {
				m.CategoryThresholds = map[string]float64{"database": -0.1}
			}, `threshold of category "database" must be between 0 and 1`},
			{"category threshold above one", func(m *Model) {
				m.CategoryThresholds = map[string]float64{"database": 1.1}
			}, `threshold of category "database" must be between 0 and 1`},
			{"dataset digest", func(m *Model) { m.DatasetDigest = "" }, "dataset digest not provided"},
			{"catalog digest", func(m *Model) { m.CatalogDigest = "" }, "catalog digest not provided"},
			{"training set digest", func(m *Model) { m.TrainingSetDigest = "" }, "training set digest not provided"},
		}
		for _, tc := range testCases {
			t.Run(tc.desc, func(t *testing.T) {
				t.Parallel()
				m := testModel()
				tc.mutate(m)
				data, err := json.Marshal(m)
				require.NoError(t, err)
				_, err = Unmarshal(data)
				assert.ErrorIs(t, err, ErrInvalidModel)
				assert.ErrorContains(t, err, tc.expectedErr)
			})
		}
	})

	t.Run("invalid json", func(t *testing.T) {
		t.Parallel()

		data, err := testModel().Marshal()
		require.NoError(t, err)
		valid := string(data)

		testCases := []struct {
			desc        string
			data        string
			expectedErr string
		}{
			{"malformed", `{"format_version": 1`, "unexpected EOF"},
			{"unknown field", strings.Replace(valid, `{`, `{"extra":1,`, 1), `unknown field "extra"`},
			{"unknown nested field", strings.Replace(valid, `"metrics":{`, `"metrics":{"extra":1,`, 1), `unknown field "extra"`},
			{"trailing data", valid + `{}`, "unexpected data after model"},
			{"float32 overflow", strings.Replace(valid, `"bias":[0,0,0]`, `"bias":[1e40,0,0]`, 1), "cannot unmarshal"},
		}
		for _, tc := range testCases {
			t.Run(tc.desc, func(t *testing.T) {
				t.Parallel()
				_, err := Unmarshal([]byte(tc.data))
				assert.ErrorIs(t, err, ErrInvalidModel)
				assert.ErrorContains(t, err, tc.expectedErr)
			})
		}
	})
}
