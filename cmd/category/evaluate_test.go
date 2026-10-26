package main

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/artifacthub/hub/internal/category"
	"github.com/artifacthub/hub/internal/category/dataset"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestEvaluateCmd(t *testing.T) {
	t.Parallel()

	t.Run("dataset not found", func(t *testing.T) {
		t.Parallel()
		_, err := executeTrainCmd(newEvaluateCmd(), "--dataset", "not-found.jsonl")
		assert.ErrorContains(t, err, "error opening dataset")
	})

	t.Run("publisher rows not found", func(t *testing.T) {
		t.Parallel()
		_, err := executeTrainCmd(newEvaluateCmd(), "--dataset", trainTestDatasetPath, "--publisher-rows", "not-found.jsonl")
		assert.ErrorContains(t, err, "error opening publisher rows")
	})

	t.Run("invalid publisher rows", func(t *testing.T) {
		t.Parallel()
		publisherRowsPath := filepath.Join(t.TempDir(), "publisher.jsonl")
		require.NoError(t, os.WriteFile(publisherRowsPath, []byte("{}\n"), 0o600))
		_, err := executeTrainCmd(newEvaluateCmd(), "--dataset", trainTestDatasetPath, "--publisher-rows", publisherRowsPath)
		assert.EqualError(t, err, "error reading publisher rows: line 1: invalid row: repository name not provided")
	})

	t.Run("dataset provided evaluated", func(t *testing.T) {
		t.Parallel()
		datasetDigest, err := dataset.Digest(readTrainTestDataset(t))
		require.NoError(t, err)

		output, err := executeTrainCmd(newEvaluateCmd(), "--dataset", trainTestDatasetPath)
		require.NoError(t, err)
		assert.Contains(t, output, "- Dataset: "+trainTestDatasetPath+"\n")
		assert.Contains(t, output, "- Dataset digest: `"+datasetDigest+"`")
		assert.Contains(t, output, fmtPublisherRowsLine(0, "not provided"))
		assert.Contains(t, output, "## Cross-fitted metrics")
		assert.Contains(t, output, "## Confusion matrix")
	})

	t.Run("dataset and publisher rows provided evaluated", func(t *testing.T) {
		t.Parallel()
		publisherRowsPath := filepath.Join(t.TempDir(), "publisher.jsonl")
		writeTrainPublisherRows(t, publisherRowsPath, trainTestPublisherRows)
		ts, err := dataset.BuildTrainingSet(readTrainTestDataset(t), trainTestPublisherRows)
		require.NoError(t, err)

		output, err := executeTrainCmd(newEvaluateCmd(), "--dataset", trainTestDatasetPath, "--publisher-rows", publisherRowsPath)
		require.NoError(t, err)
		assert.Contains(t, output, fmtPublisherRowsLine(len(trainTestPublisherRows), publisherRowsPath))
		assert.Contains(t, output, "- **Publisher rows with categories not in the catalog (skipped): 2 (categories 98, 99)**\n")
		assert.Contains(t, output, "- Training set digest: `"+ts.Digest+"`")
	})

	t.Run("embedded dataset and publisher rows evaluated", func(t *testing.T) {
		t.Parallel()
		_, datasetDigest, err := category.EmbeddedDataset()
		require.NoError(t, err)
		publisherRows, _, err := category.EmbeddedPublisherRows()
		require.NoError(t, err)
		baseline, err := category.EmbeddedBaseline()
		require.NoError(t, err)

		output, err := executeTrainCmd(newEvaluateCmd())
		require.NoError(t, err)
		assert.Contains(t, output, "- Dataset: embedded\n")
		assert.Contains(t, output, "- Dataset digest: `"+datasetDigest+"`")
		assert.Contains(t, output, fmtPublisherRowsLine(len(publisherRows), "embedded"))
		assert.Contains(t, output, "- Training set digest: `"+baseline.TrainingSetDigest+"`")
		assert.Contains(t, output, "## Cross-fitted metrics")
	})

	t.Run("embedded dataset and publisher rows provided evaluated", func(t *testing.T) {
		t.Parallel()
		rows, _, err := category.EmbeddedDataset()
		require.NoError(t, err)
		publisherRowsPath := filepath.Join(t.TempDir(), "publisher.jsonl")
		writeTrainPublisherRows(t, publisherRowsPath, trainTestPublisherRows)
		ts, err := dataset.BuildTrainingSet(rows, trainTestPublisherRows)
		require.NoError(t, err)

		output, err := executeTrainCmd(newEvaluateCmd(), "--publisher-rows", publisherRowsPath)
		require.NoError(t, err)
		assert.Contains(t, output, "- Dataset: embedded\n")
		assert.Contains(t, output, fmtPublisherRowsLine(len(trainTestPublisherRows), publisherRowsPath))
		assert.Contains(t, output, "- Training set digest: `"+ts.Digest+"`")
	})
}

// fmtPublisherRowsLine returns the report line of the publisher rows used.
func fmtPublisherRowsLine(n int, source string) string {
	return "- Publisher rows: " + fmtInt(n) + " (" + source + ")\n"
}
