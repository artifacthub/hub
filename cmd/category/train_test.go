package main

import (
	"bytes"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/artifacthub/hub/internal/category/catalog"
	"github.com/artifacthub/hub/internal/category/dataset"
	"github.com/artifacthub/hub/internal/category/labeler"
	"github.com/artifacthub/hub/internal/category/model"
	"github.com/spf13/cobra"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// trainTestDatasetPath represents the path of the reviewed dataset used in the
// tests. It's a synthetic dataset.
var trainTestDatasetPath = filepath.Join("testdata", "train", "dataset.jsonl")

func TestTrainCmd(t *testing.T) {
	t.Parallel()

	t.Run("dataset not provided", func(t *testing.T) {
		t.Parallel()
		_, err := executeTrainCmd(newTrainCmd(), "--data-dir", t.TempDir())
		assert.ErrorContains(t, err, `required flag(s) "dataset" not set`)
	})

	t.Run("dataset not found", func(t *testing.T) {
		t.Parallel()
		dataDir := t.TempDir()
		_, err := executeTrainCmd(newTrainCmd(), "--dataset", "not-found.jsonl", "--data-dir", dataDir)
		assert.ErrorContains(t, err, "error opening dataset")
		assertTrainDirEmpty(t, dataDir)
	})

	t.Run("invalid dataset", func(t *testing.T) {
		t.Parallel()
		dataDir := t.TempDir()
		datasetPath := filepath.Join(t.TempDir(), "dataset.jsonl")
		require.NoError(t, os.WriteFile(datasetPath, []byte("{}\n"), 0o600))
		_, err := executeTrainCmd(newTrainCmd(), "--dataset", datasetPath, "--data-dir", dataDir)
		assert.ErrorContains(t, err, "error reading dataset: line 1")
		assertTrainDirEmpty(t, dataDir)
	})

	t.Run("publisher rows not found", func(t *testing.T) {
		t.Parallel()
		dataDir := t.TempDir()
		_, err := executeTrainCmd(newTrainCmd(),
			"--dataset", trainTestDatasetPath, "--publisher-rows", "not-found.jsonl", "--data-dir", dataDir)
		assert.ErrorContains(t, err, "error opening publisher rows")
		assertTrainDirEmpty(t, dataDir)
	})

	t.Run("invalid publisher rows", func(t *testing.T) {
		t.Parallel()

		testCases := []struct {
			desc        string
			data        string
			expectedErr string
		}{
			{
				"unknown field",
				`{"package_id":"1","repository_kind":0,"repository_name":"repo1","name":"pkg1","category":2}` + "\n",
				`error reading publisher rows: line 1: invalid row: json: unknown field "package_id"`,
			},
			{
				"invalid row",
				`{"repository_kind":0,"repository_name":"repo1","name":"pkg1","category":2}` + "\n" +
					`{"repository_kind":0,"repository_name":"repo1","name":"","category":2}` + "\n",
				"error reading publisher rows: line 2: invalid row: name not provided",
			},
		}
		for _, tc := range testCases {
			t.Run(tc.desc, func(t *testing.T) {
				t.Parallel()
				dataDir := t.TempDir()
				publisherRowsPath := filepath.Join(t.TempDir(), "publisher.jsonl")
				require.NoError(t, os.WriteFile(publisherRowsPath, []byte(tc.data), 0o600))
				_, err := executeTrainCmd(newTrainCmd(),
					"--dataset", trainTestDatasetPath, "--publisher-rows", publisherRowsPath, "--data-dir", dataDir)
				assert.EqualError(t, err, tc.expectedErr)
				assertTrainDirEmpty(t, dataDir)
			})
		}
	})

	t.Run("training failed: nothing written", func(t *testing.T) {
		t.Parallel()
		dataDir := t.TempDir()
		datasetPath := filepath.Join(t.TempDir(), "dataset.jsonl")
		writeTrainDataset(t, datasetPath, readTrainTestDataset(t)[:10])
		publisherRowsPath := filepath.Join(t.TempDir(), "publisher.jsonl")
		writeTrainPublisherRows(t, publisherRowsPath, trainTestPublisherRows)
		_, err := executeTrainCmd(newTrainCmd(),
			"--dataset", datasetPath, "--publisher-rows", publisherRowsPath, "--data-dir", dataDir)
		assert.ErrorIs(t, err, model.ErrNotEnoughData)
		assertTrainDirEmpty(t, dataDir)
	})

	t.Run("model trained: dataset, publisher rows and baseline written", func(t *testing.T) {
		t.Parallel()
		dataDir := t.TempDir()
		rows := readTrainTestDataset(t)

		output, err := executeTrainCmd(newTrainCmd(), "--dataset", trainTestDatasetPath, "--data-dir", dataDir)
		require.NoError(t, err)

		// Check files written (publisher rows are written even when there
		// are none)
		packedRows, datasetDigest, baseline := readTrainDataDir(t, dataDir)
		expectedDigest, err := dataset.Digest(rows)
		require.NoError(t, err)
		assert.Equal(t, expectedDigest, datasetDigest)
		assert.Equal(t, expectedDigest, baseline.DatasetDigest)
		assert.Equal(t, catalog.ModelDigest(), baseline.CatalogDigest)
		assert.Len(t, packedRows, len(rows))
		packedPublisherRows, publisherRowsDigest := readTrainDataDirPublisherRows(t, dataDir)
		assert.Empty(t, packedPublisherRows)
		var emptyPublisherRows bytes.Buffer
		_, err = dataset.PackPublisherRows(&emptyPublisherRows, nil)
		require.NoError(t, err)
		data, err := os.ReadFile(filepath.Join(dataDir, packedPublisherRowsFile))
		require.NoError(t, err)
		assert.Equal(t, emptyPublisherRows.Bytes(), data)
		assert.Zero(t, baseline.Metrics.RowCounts.RawPublisher)

		// Check output
		assert.Contains(t, output, "- Dataset digest: `"+datasetDigest+"`")
		assert.Contains(t, output, "- Publisher rows digest: `"+publisherRowsDigest+"`\n- Publisher rows: 0\n")
		assert.NotContains(t, output, "categories not in the catalog")
		assert.Contains(t, output, "- Category thresholds: ")
		assert.Contains(t, output, "## Cross-fitted metrics")
		assert.Contains(t, output, "## Confusion matrix")
		assert.Contains(t, output, "- Added rows: "+fmtInt(len(rows)))
		assert.Contains(t, output, fmt.Sprintf("- **Rows labelled with a different categories file: %d**\n", len(rows)))
		assert.Contains(t, output, fmt.Sprintf("- **Rows labelled with different labelling guidelines: %d**\n", len(rows)))
	})

	t.Run("model trained with publisher rows: publisher rows written and used", func(t *testing.T) {
		t.Parallel()
		dataDir := t.TempDir()
		publisherRowsPath := filepath.Join(t.TempDir(), "publisher.jsonl")
		writeTrainPublisherRows(t, publisherRowsPath, trainTestPublisherRows)

		output, err := executeTrainCmd(newTrainCmd(),
			"--dataset", trainTestDatasetPath, "--publisher-rows", publisherRowsPath, "--data-dir", dataDir)
		require.NoError(t, err)

		// Check files written
		packedPublisherRows, publisherRowsDigest := readTrainDataDirPublisherRows(t, dataDir)
		assert.Len(t, packedPublisherRows, len(trainTestPublisherRows))
		ts, err := dataset.BuildTrainingSet(readTrainTestDataset(t), packedPublisherRows)
		require.NoError(t, err)
		_, _, baseline := readTrainDataDir(t, dataDir)
		assert.Equal(t, ts.Digest, baseline.TrainingSetDigest)
		assert.Equal(t, len(trainTestPublisherRows), baseline.Metrics.RowCounts.RawPublisher)
		assert.Equal(t, 2, baseline.Metrics.RowCounts.Publisher)
		assert.Equal(t, 2, baseline.Metrics.RowCounts.UnknownCategory)

		// Check output
		assert.Contains(t, output, "- Publisher rows digest: `"+publisherRowsDigest+"`\n- Publisher rows: 4\n")
		assert.Contains(t, output, "- **Publisher rows with categories not in the catalog (skipped): 2 (categories 98, 99)**\n")
	})

	t.Run("model trained again: label changes printed", func(t *testing.T) {
		t.Parallel()
		dataDir := t.TempDir()
		_, err := executeTrainCmd(newTrainCmd(), "--dataset", trainTestDatasetPath, "--data-dir", dataDir)
		require.NoError(t, err)

		// Change the label of a row and train again
		rows := readTrainTestDataset(t)
		var changed *dataset.Row
		for i := range rows {
			if rows[i].Label == "database" {
				rows[i].Label = "storage"
				changed = &rows[i]
				break
			}
		}
		require.NotNil(t, changed)
		datasetPath := filepath.Join(t.TempDir(), "dataset.jsonl")
		writeTrainDataset(t, datasetPath, rows)
		output, err := executeTrainCmd(newTrainCmd(), "--dataset", datasetPath, "--data-dir", dataDir)
		require.NoError(t, err)

		// Check output
		assert.Contains(t, output, "- Added rows: 0\n- Removed rows: 0\n- Rows with label changes: 1\n")
		assert.Contains(t, output, "| database | 50 | 49 | 1 | 0 |")
		assert.Contains(t, output, "| storage | 0 | 1 | 0 | 1 |")
		assert.Contains(t, output, "| "+changed.RepositoryName+" | "+changed.Name+" | database | storage |")
	})

	t.Run("rows labelled with the current categories and guidelines: no warnings", func(t *testing.T) {
		t.Parallel()
		rows := readTrainTestDataset(t)
		for i := range rows {
			rows[i].Labeler.LabelingDigest = catalog.LabelingDigest()
			rows[i].Labeler.GuidelinesDigest = labeler.GuidelinesDigest()
		}
		datasetPath := filepath.Join(t.TempDir(), "dataset.jsonl")
		writeTrainDataset(t, datasetPath, rows)

		output, err := executeTrainCmd(newTrainCmd(), "--dataset", datasetPath, "--data-dir", t.TempDir())
		require.NoError(t, err)
		assert.NotContains(t, output, "Rows labelled with")
	})

	t.Run("current dataset can't be read: label changes not printed", func(t *testing.T) {
		t.Parallel()
		dataDir := t.TempDir()
		require.NoError(t, os.WriteFile(filepath.Join(dataDir, packedDatasetFile), []byte("invalid"), 0o600))

		output, err := executeTrainCmd(newTrainCmd(), "--dataset", trainTestDatasetPath, "--data-dir", dataDir)
		require.NoError(t, err)
		assert.Contains(t, output, "Current dataset could not be read")
		_, _, baseline := readTrainDataDir(t, dataDir)
		assert.NotNil(t, baseline)
	})
}

// trainTestPublisherRows represents the publisher rows used in the tests. Two
// of them have a category that is not in the catalog.
var trainTestPublisherRows = []dataset.PublisherRow{
	{RepositoryName: "publisher-repo", Name: "publisher-db", Description: "Synthetic publisher package: a sql database.", Category: 2},
	{RepositoryName: "publisher-repo", Name: "publisher-proxy", Keywords: []string{"proxy"}, Description: "Synthetic publisher package: a proxy.", Category: 5},
	{RepositoryName: "publisher-repo", Name: "publisher-unknown", Category: 99},
	{RepositoryName: "publisher-repo", Name: "publisher-unknown-2", Category: 98},
}

// executeTrainCmd executes the command provided with the arguments
// provided, returning its output.
func executeTrainCmd(cmd *cobra.Command, args ...string) (string, error) {
	var b bytes.Buffer
	cmd.SilenceUsage = true
	cmd.SilenceErrors = true
	cmd.SetOut(&b)
	cmd.SetErr(io.Discard)
	cmd.SetArgs(args)
	err := cmd.Execute()
	return b.String(), err
}

// assertTrainDirEmpty checks that the directory provided is empty.
func assertTrainDirEmpty(t *testing.T, dir string) {
	t.Helper()
	entries, err := os.ReadDir(dir)
	require.NoError(t, err)
	assert.Empty(t, entries)
}

// readTrainTestDataset reads the test dataset.
func readTrainTestDataset(t *testing.T) []dataset.Row {
	t.Helper()
	rows, err := readReviewedDataset(trainTestDatasetPath)
	require.NoError(t, err)
	return rows
}

// writeTrainPublisherRows writes the publisher rows provided to the path
// provided.
func writeTrainPublisherRows(t *testing.T, path string, rows []dataset.PublisherRow) {
	t.Helper()
	data, err := dataset.CanonicalPublisherRows(rows)
	require.NoError(t, err)
	require.NoError(t, os.WriteFile(path, data, 0o600))
}

// writeTrainDataset writes the dataset rows provided to the path provided.
func writeTrainDataset(t *testing.T, path string, rows []dataset.Row) {
	t.Helper()
	data, err := dataset.Canonical(rows)
	require.NoError(t, err)
	require.NoError(t, os.WriteFile(path, data, 0o600))
}

func TestFmtCategoryThresholds(t *testing.T) {
	t.Parallel()

	assert.Equal(t, "-", fmtCategoryThresholds(nil))
	assert.Equal(t, "storage 0.1500, analytics 0.1234", fmtCategoryThresholds(map[string]float64{
		"analytics": 0.12341,
		"storage":   0.15,
	}))
}

// readTrainDataDir reads the packed dataset and the baseline model in the data
// directory provided.
func readTrainDataDir(t *testing.T, dataDir string) ([]dataset.Row, string, *model.Model) {
	t.Helper()
	f, err := os.Open(filepath.Join(dataDir, packedDatasetFile))
	require.NoError(t, err)
	defer f.Close()
	rows, datasetDigest, err := dataset.ReadPacked(f)
	require.NoError(t, err)
	data, err := os.ReadFile(filepath.Join(dataDir, baselineModelFile))
	require.NoError(t, err)
	require.True(t, strings.HasSuffix(string(data), "}\n"))
	baseline, err := model.Unmarshal(data)
	require.NoError(t, err)
	return rows, datasetDigest, baseline
}

// readTrainDataDirPublisherRows reads the packed publisher rows in the data
// directory provided, returning them along with their digest.
func readTrainDataDirPublisherRows(t *testing.T, dataDir string) ([]dataset.PublisherRow, string) {
	t.Helper()
	f, err := os.Open(filepath.Join(dataDir, packedPublisherRowsFile))
	require.NoError(t, err)
	defer f.Close()
	rows, digest, err := dataset.ReadPackedPublisherRows(f)
	require.NoError(t, err)
	return rows, digest
}
