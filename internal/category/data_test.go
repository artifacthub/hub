package category

import (
	"bytes"
	"testing"

	"github.com/artifacthub/hub/internal/category/catalog"
	"github.com/artifacthub/hub/internal/category/dataset"
	"github.com/artifacthub/hub/internal/category/model"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

const (
	// minBaselinePrecision represents the minimum cross-fitted precision of
	// the embedded baseline model. Predictions below it would assign too many
	// wrong categories.
	minBaselinePrecision = 0.85

	// minBaselineCoverage represents the minimum cross-fitted coverage of the
	// embedded baseline model. Below it, too many packages would be left
	// without category.
	minBaselineCoverage = 0.50

	// retrainingMetricsTolerance represents how much the cross-fitted metrics
	// of a model retrained on the embedded data can differ from the
	// baseline's.
	retrainingMetricsTolerance = 0.01
)

func TestEmbeddedBaseline(t *testing.T) {
	t.Parallel()

	rows, datasetDigest, err := EmbeddedDataset()
	require.NoError(t, err)
	publisherRows, _, err := EmbeddedPublisherRows()
	require.NoError(t, err)
	baseline, err := EmbeddedBaseline()
	require.NoError(t, err)

	t.Run("data files are packed as the train command writes them", func(t *testing.T) {
		t.Parallel()

		var packed bytes.Buffer
		_, err := dataset.Pack(&packed, rows)
		require.NoError(t, err)
		assert.True(t, bytes.Equal(embeddedDataset, packed.Bytes()), "packed dataset differs") // Not printed, it's too big

		var packedPublisherRows bytes.Buffer
		_, err = dataset.PackPublisherRows(&packedPublisherRows, publisherRows)
		require.NoError(t, err)
		assert.Equal(t, embeddedPublisherRows, packedPublisherRows.Bytes())
	})

	t.Run("baseline matches the embedded data and the catalog", func(t *testing.T) {
		t.Parallel()

		assert.Equal(t, datasetDigest, baseline.DatasetDigest)
		assert.Equal(t, model.FeaturesVersion, baseline.FeaturesVersion)
		assert.Equal(t, catalog.ModelDigest(), baseline.CatalogDigest)
		_, err := NewClassifier(baseline)
		assert.NoError(t, err)
	})

	t.Run("baseline training set is reproduced from the embedded data", func(t *testing.T) {
		t.Parallel()

		ts, err := dataset.BuildTrainingSet(rows, publisherRows)
		require.NoError(t, err)
		assert.Equal(t, baseline.TrainingSetDigest, ts.Digest)
		assert.Equal(t, baseline.Metrics.RowCounts, ts.Counts)
	})

	t.Run("retraining on the embedded data gives a model like the baseline", func(t *testing.T) {
		t.Parallel()

		// Retraining isn't reproducible bit for bit across architectures (the
		// compiler may fuse floating point operations on some of them), so
		// the metrics are compared with some tolerance
		ts, err := dataset.BuildTrainingSet(rows, publisherRows)
		require.NoError(t, err)
		m, err := model.Train(ts.TrainInput(datasetDigest), model.DefaultConfig())
		require.NoError(t, err)
		assert.Equal(t, baseline.Algorithm, m.Algorithm)
		assert.InDelta(t, baseline.Metrics.Precision, m.Metrics.Precision, retrainingMetricsTolerance)
		assert.InDelta(t, baseline.Metrics.Coverage, m.Metrics.Coverage, retrainingMetricsTolerance)
	})

	t.Run("baseline cross-fitted metrics are above the minimum", func(t *testing.T) {
		t.Parallel()

		assert.GreaterOrEqual(t, baseline.Metrics.Precision, minBaselinePrecision)
		assert.GreaterOrEqual(t, baseline.Metrics.Coverage, minBaselineCoverage)
	})
}
