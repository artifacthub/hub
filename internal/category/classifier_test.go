package category

import (
	"sync"
	"testing"

	"github.com/artifacthub/hub/internal/category/catalog"
	"github.com/artifacthub/hub/internal/category/model"
	"github.com/artifacthub/hub/internal/hub"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNewClassifier(t *testing.T) {
	t.Parallel()

	t.Run("model not provided", func(t *testing.T) {
		t.Parallel()
		c, err := NewClassifier(nil)
		assert.Error(t, err)
		assert.Nil(t, c)
	})

	t.Run("model category not found in catalog", func(t *testing.T) {
		t.Parallel()
		m := newTestModel()
		m.Categories = []string{"database", "unknown"}
		c, err := NewClassifier(m)
		assert.Error(t, err)
		assert.Nil(t, c)
	})

	t.Run("classifier created", func(t *testing.T) {
		t.Parallel()
		c, err := NewClassifier(newTestModel())
		require.NoError(t, err)
		assert.Equal(t, map[string]hub.PackageCategory{
			"database":   2,
			"networking": 5,
			"security":   6,
		}, c.ids)
	})
}

func TestClassifierPredict(t *testing.T) {
	t.Parallel()

	testCases := []struct {
		desc             string
		p                *hub.Package
		suppressed       []string
		expectedCategory hub.PackageCategory
	}{
		{
			"nil package",
			nil,
			nil,
			hub.UnknownCategory,
		},
		{
			"package without features",
			&hub.Package{},
			nil,
			hub.UnknownCategory,
		},
		{
			"package without known features",
			&hub.Package{Name: "something", Keywords: []string{"else"}, Description: "Nothing known here."},
			nil,
			hub.UnknownCategory,
		},
		{
			"category predicted from keywords",
			&hub.Package{Name: "pkg", Keywords: []string{"postgres"}},
			nil,
			2,
		},
		{
			"category predicted from name",
			&hub.Package{Name: "nginx"},
			nil,
			5,
		},
		{
			"category predicted from description",
			&hub.Package{Name: "pkg", Description: "Manages certificates and secrets."},
			nil,
			6,
		},
		{
			"confidence below threshold",
			&hub.Package{Name: "nginx", Keywords: []string{"postgres"}},
			nil,
			hub.UnknownCategory,
		},
		{
			"suppressed category",
			&hub.Package{Name: "nginx"},
			[]string{"networking"},
			hub.UnknownCategory,
		},
	}
	for _, tc := range testCases {
		t.Run(tc.desc, func(t *testing.T) {
			t.Parallel()
			m := newTestModel()
			m.SuppressedCategories = tc.suppressed
			c, err := NewClassifier(m)
			require.NoError(t, err)
			assert.Equal(t, tc.expectedCategory, c.Predict(tc.p))
		})
	}

	t.Run("nil classifier", func(t *testing.T) {
		t.Parallel()
		var c *Classifier
		assert.Equal(t, hub.UnknownCategory, c.Predict(&hub.Package{Name: "nginx"}))
	})

	t.Run("classifier with invalid parameters never panics", func(t *testing.T) {
		t.Parallel()
		m := newTestModel()
		m.Weights = m.Weights[:1]
		c, err := NewClassifier(m)
		require.NoError(t, err)
		assert.Equal(t, hub.UnknownCategory, c.Predict(&hub.Package{Name: "nginx"}))
	})

	t.Run("concurrent predictions", func(t *testing.T) {
		t.Parallel()
		c, err := NewClassifier(newTestModel())
		require.NoError(t, err)
		packages := []*hub.Package{
			{Name: "pkg", Keywords: []string{"postgres"}},
			{Name: "nginx"},
			{Name: "pkg", Description: "Manages certificates and secrets."},
			{Name: "something"},
		}
		expected := []hub.PackageCategory{2, 5, 6, hub.UnknownCategory}

		var wg sync.WaitGroup
		results := make([][]hub.PackageCategory, 8)
		for i := range results {
			wg.Add(1)
			go func() {
				defer wg.Done()
				for range 100 {
					results[i] = results[i][:0]
					for _, p := range packages {
						results[i] = append(results[i], c.Predict(p))
					}
				}
			}()
		}
		wg.Wait()
		for _, r := range results {
			assert.Equal(t, expected, r)
		}
	})
}

// newTestModel returns a small hand-crafted model for the tests, using the
// test dataset digest. Each category has a distinctive feature, so that
// it's predicted with high confidence when the feature is present.
func newTestModel() *model.Model {
	return &model.Model{
		FormatVersion:        model.FormatVersion,
		FeaturesVersion:      model.FeaturesVersion,
		Algorithm:            model.AlgorithmLogisticRegression,
		Categories:           []string{"database", "networking", "security"},
		SuppressedCategories: []string{},
		Vocabulary:           []string{"desc:certificates", "kw:postgres", "name:nginx"},
		Weights: [][]float32{
			{0, 5, 0},
			{0, 0, 5},
			{5, 0, 0},
		},
		Bias:              []float32{0, 0, 0},
		Threshold:         0.8,
		DatasetDigest:     "sha256:dataset",
		CatalogDigest:     catalog.ModelDigest(),
		TrainingSetDigest: "sha256:training-set",
	}
}
