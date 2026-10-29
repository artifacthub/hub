package main

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/artifacthub/hub/internal/category/dataset"
	"github.com/artifacthub/hub/internal/category/model"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// writeAgreementDataset writes a dataset with the labels provided (package
// name -> label) and returns its path.
func writeAgreementDataset(t *testing.T, dir, file string, labels map[string]string) string {
	t.Helper()
	var b strings.Builder
	for name, label := range labels {
		data, err := json.Marshal(dataset.Row{
			ContentKey:     model.ContentKey(name, nil, ""),
			RepositoryName: "repo",
			Name:           name,
			Duplicates:     1,
			Keywords:       []string{},
			Label:          label,
			Confidence:     dataset.ConfidenceHigh,
		})
		require.NoError(t, err)
		b.Write(data)
		b.WriteByte('\n')
	}
	path := filepath.Join(dir, file)
	require.NoError(t, os.WriteFile(path, []byte(b.String()), 0o600))
	return path
}

func TestAgreementCmd(t *testing.T) {
	t.Parallel()

	t.Run("required flags", func(t *testing.T) {
		t.Parallel()
		_, err := executeCmd(newAgreementCmd())
		require.Error(t, err)
		assert.Contains(t, err.Error(), `"a"`)
		assert.Contains(t, err.Error(), `"b"`)
	})

	t.Run("dataset not found", func(t *testing.T) {
		t.Parallel()
		dir := t.TempDir()
		a := writeAgreementDataset(t, dir, "a.jsonl", map[string]string{"redis": "database"})
		_, err := executeCmd(newAgreementCmd(), "--a", a, "--b", filepath.Join(dir, "missing.jsonl"))
		assert.ErrorContains(t, err, "error opening dataset")
	})

	t.Run("invalid dataset", func(t *testing.T) {
		t.Parallel()
		dir := t.TempDir()
		a := writeAgreementDataset(t, dir, "a.jsonl", map[string]string{"redis": "database"})
		b := filepath.Join(dir, "b.jsonl")
		require.NoError(t, os.WriteFile(b, []byte("{}\n"), 0o600))
		_, err := executeCmd(newAgreementCmd(), "--a", a, "--b", b)
		assert.Error(t, err)
	})

	t.Run("no common packages", func(t *testing.T) {
		t.Parallel()
		dir := t.TempDir()
		a := writeAgreementDataset(t, dir, "a.jsonl", map[string]string{"redis": "database"})
		b := writeAgreementDataset(t, dir, "b.jsonl", map[string]string{"kafka": "streaming-messaging"})
		_, err := executeCmd(newAgreementCmd(), "--a", a, "--b", b)
		assert.ErrorContains(t, err, "no content keys in common")
	})

	t.Run("report", func(t *testing.T) {
		t.Parallel()
		dir := t.TempDir()
		a := writeAgreementDataset(t, dir, "a.jsonl", map[string]string{
			"redis":   "database",
			"kafka":   "streaming-messaging",
			"flink":   "data-processing",
			"grafana": "monitoring-logging",
		})
		b := writeAgreementDataset(t, dir, "b.jsonl", map[string]string{
			"redis":   "database",
			"kafka":   "streaming-messaging",
			"flink":   "streaming-messaging",
			"grafana": "monitoring-logging",
			"other":   "none",
		})
		output, err := executeCmd(newAgreementCmd(), "--a", a, "--b", b)
		require.NoError(t, err)
		assert.Contains(t, output, "A: "+a+"\n")
		assert.Contains(t, output, "B: "+b+"\n")
		assert.Contains(t, output, "Content keys in common: 4\n")
		assert.Contains(t, output, "Agreement: 75.0% (3/4)\n")
		assert.Contains(t, output, "Cohen's kappa: ")
		assert.Contains(t, output, "Confusion matrix (rows: A, columns: B)")
		assert.Contains(t, output, "1\tdata-processing -> streaming-messaging (e.g. repo/flink)\n")
	})
}
