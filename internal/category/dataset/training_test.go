package dataset

import (
	"fmt"
	"slices"
	"strings"
	"testing"

	"github.com/artifacthub/hub/internal/category/catalog"
	"github.com/artifacthub/hub/internal/category/model"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// publisherRow returns a publisher row with the information provided.
func publisherRow(repository, name string, keywords []string, description string, category int) PublisherRow {
	return PublisherRow{
		RepositoryKind: 0,
		RepositoryName: repository,
		Name:           name,
		Keywords:       keywords,
		Description:    description,
		Category:       category,
	}
}

// labels returns the labels of the training set rows, indexed by package
// name.
func labels(ts *TrainingSet) map[string]string {
	m := make(map[string]string, len(ts.Rows))
	for _, r := range ts.Rows {
		m[r.Input.Name] = r.Label
	}
	return m
}

func TestBuildTrainingSet(t *testing.T) {
	t.Parallel()

	t.Run("merge, exclusions and deduplication", func(t *testing.T) {
		t.Parallel()

		// LLM rows
		suspicious := newRow("r1", "suspicious", nil, "", "database")
		suspicious.Suspicious = true
		needsReview := newRow("r1", "needs-review", nil, "", "database")
		needsReview.NeedsReview = true
		lowConfidence := newRow("r1", "low-confidence", nil, "", "database")
		lowConfidence.Confidence = ConfidenceLow
		mediumConfidence := newRow("r1", "medium-confidence", nil, "", "database")
		mediumConfidence.Confidence = ConfidenceMedium
		llmRows := []Row{
			suspicious,
			needsReview,
			lowConfidence,
			mediumConfidence,
			newRow("r1", "llm-only", []string{"kw"}, "Description", "storage"),
			newRow("r1", "llm-none", nil, "Nothing", catalog.None),
			newRow("r2", "publisher-beats-llm", nil, "", catalog.None),
			newRow("r2", "excluded-llm-with-publisher", nil, "", "database"),
		}
		llmRows[7].Suspicious = true

		// Publisher rows (categories: 2 database, 5 networking, 6 security,
		// 7 storage)
		publisherRows := []PublisherRow{
			publisherRow("r3", "publisher-beats-llm", nil, "", 5),
			publisherRow("r3", "excluded-llm-with-publisher", nil, "", 6),
			// Majority wins
			publisherRow("r3", "majority", nil, "", 2),
			publisherRow("r4", "majority", nil, "", 7),
			publisherRow("r5", "majority", nil, "", 7),
			// Ties drop the group
			publisherRow("r3", "tie", nil, "", 2),
			publisherRow("r4", "tie", nil, "", 7),
			// Unknown categories are skipped
			publisherRow("r3", "unknown-category", nil, "", 99),
			publisherRow("r3", "unknown-category-2", nil, "", 99),
			publisherRow("r3", "unknown-category-3", nil, "", 0),
			// Copies of the same package in different repositories
			publisherRow("r6", "copy", []string{"a", "b"}, "Same content", 5),
			publisherRow("r4", "COPY", []string{"B", "a"}, "  Same   content ", 5),
		}

		ts, err := BuildTrainingSet(llmRows, publisherRows)
		require.NoError(t, err)

		assert.Equal(t, map[string]string{
			"medium-confidence":           "database",
			"llm-only":                    "storage",
			"llm-none":                    catalog.None,
			"publisher-beats-llm":         "networking",
			"excluded-llm-with-publisher": "security",
			"majority":                    "storage",
			"COPY":                        "networking",
		}, labels(ts))
		assert.Equal(t, model.RowCounts{
			RawLLM:          8,
			RawPublisher:    12,
			Excluded:        4,
			UnknownCategory: 3,
			Conflicts:       1,
			Deduplicated:    7,
			LLM:             2,
			Publisher:       4,
			None:            1,
		}, ts.Counts)
		assert.Equal(t, []int{0, 99}, ts.UnknownCategories)

		// Rows are sorted by content key and attributed to their
		// representative repository
		keys := make([]string, 0, len(ts.Rows))
		for _, r := range ts.Rows {
			keys = append(keys, model.ContentKey(r.Input.Name, r.Input.Keywords, r.Input.Description))
			assert.Equal(t, 1.0, r.Weight)
			assert.NotNil(t, r.Input.Keywords)
			switch r.Input.Name {
			case "publisher-beats-llm":
				assert.Equal(t, model.SourcePublisher, r.Source)
				assert.Equal(t, "r3", r.Repository)
			case "majority":
				assert.Equal(t, "r4", r.Repository)
			case "COPY":
				assert.Equal(t, "r4", r.Repository)
				assert.Equal(t, []string{"B", "a"}, r.Input.Keywords)
			case "llm-only":
				assert.Equal(t, model.SourceLLM, r.Source)
				assert.Equal(t, model.Input{Name: "llm-only", Keywords: []string{"kw"}, Description: "Description"}, r.Input)
			}
		}
		assert.True(t, slices.IsSorted(keys))
		assert.Equal(t, ts.Digest, ts.TrainInput("sha256:dataset").TrainingSetDigest)
	})

	t.Run("llm conflicts within a content key", func(t *testing.T) {
		t.Parallel()

		llmRows := []Row{
			newRow("r1", "app", nil, "", "database"),
			newRow("r2", "app", nil, "", "database"),
			newRow("r3", "app", nil, "", "storage"),
		}
		ts, err := BuildTrainingSet(llmRows, nil)
		require.NoError(t, err)
		require.Len(t, ts.Rows, 1)
		assert.Equal(t, "database", ts.Rows[0].Label)
		assert.Equal(t, "r1", ts.Rows[0].Repository)

		ts, err = BuildTrainingSet(llmRows[1:], nil)
		require.NoError(t, err)
		assert.Empty(t, ts.Rows)
		assert.Equal(t, 1, ts.Counts.Conflicts)
	})

	t.Run("repository cap", func(t *testing.T) {
		t.Parallel()

		llmRows := make([]Row, 0, 70)
		for i := range 50 {
			llmRows = append(llmRows, newRow("big", fmt.Sprintf("db-%d", i), nil, "", "database"))
		}
		for i := range 10 {
			llmRows = append(llmRows, newRow("big", fmt.Sprintf("storage-%d", i), nil, "", "storage"))
			llmRows = append(llmRows, newRow("small", fmt.Sprintf("other-db-%d", i), nil, "", "database"))
		}
		publisherRows := make([]PublisherRow, 0, 30)
		for i := range 30 {
			publisherRows = append(publisherRows, publisherRow("big", fmt.Sprintf("pub-db-%d", i), nil, "", 2))
		}

		ts, err := BuildTrainingSet(llmRows, publisherRows)
		require.NoError(t, err)
		effective := make(map[string]float64)
		for _, r := range ts.Rows {
			effective[r.Repository+"/"+r.Label] += r.Weight
			switch {
			case r.Repository == "big" && r.Label == "database":
				assert.InDelta(t, 25.0/80, r.Weight, 1e-12)
			default:
				assert.Equal(t, 1.0, r.Weight)
			}
		}
		assert.InDelta(t, 25, effective["big/database"], 1e-9)
		assert.Equal(t, 10.0, effective["big/storage"])
		assert.Equal(t, 10.0, effective["small/database"])
	})

	t.Run("digest", func(t *testing.T) {
		t.Parallel()

		llmRows := []Row{
			newRow("r1", "redis", []string{"cache"}, "In-memory store", "database"),
			newRow("r1", "nginx", nil, "Web server", "networking"),
			newRow("r2", "app", nil, "Something", catalog.None),
		}
		publisherRows := []PublisherRow{
			publisherRow("r3", "vault", []string{"secrets"}, "Secrets manager", 6),
			publisherRow("r3", "minio", nil, "Object storage", 7),
		}
		ts1, err := BuildTrainingSet(llmRows, publisherRows)
		require.NoError(t, err)
		assert.Regexp(t, `^sha256:[0-9a-f]{64}$`, ts1.Digest)

		// Same input in a different order
		reversedLLM := slices.Clone(llmRows)
		slices.Reverse(reversedLLM)
		reversedPublisher := slices.Clone(publisherRows)
		slices.Reverse(reversedPublisher)
		ts2, err := BuildTrainingSet(reversedLLM, reversedPublisher)
		require.NoError(t, err)
		assert.Equal(t, ts1, ts2)

		// Changes in the training set change the digest
		llmRows[0].Label = "storage"
		ts3, err := BuildTrainingSet(llmRows, publisherRows)
		require.NoError(t, err)
		assert.NotEqual(t, ts1.Digest, ts3.Digest)

		// Changes outside the training set don't
		excluded := newRow("r9", "excluded", nil, "", "database")
		excluded.Suspicious = true
		ts4, err := BuildTrainingSet(append(slices.Clone(llmRows), excluded), publisherRows)
		require.NoError(t, err)
		assert.Equal(t, ts3.Digest, ts4.Digest)
	})

	t.Run("publisher descriptions are truncated", func(t *testing.T) {
		t.Parallel()

		description := strings.Repeat("a", model.MaxDescriptionLength+10)
		ts, err := BuildTrainingSet(nil, []PublisherRow{publisherRow("r1", "app", nil, description, 2)})
		require.NoError(t, err)
		require.Len(t, ts.Rows, 1)
		assert.Equal(t, model.TruncateDescription(description), ts.Rows[0].Input.Description)
	})

	t.Run("invalid rows", func(t *testing.T) {
		t.Parallel()

		invalid := newRow("r1", "app", nil, "", "database")
		invalid.Label = "games"
		_, err := BuildTrainingSet([]Row{invalid}, nil)
		assert.ErrorIs(t, err, ErrInvalidRow)
		assert.ErrorContains(t, err, "llm row 0")

		_, err = BuildTrainingSet(nil, []PublisherRow{publisherRow("", "app", nil, "", 2)})
		assert.ErrorIs(t, err, ErrInvalidRow)
		assert.ErrorContains(t, err, "publisher row 0")
	})

	t.Run("training set can be used to train a model", func(t *testing.T) {
		t.Parallel()

		llmRows := make([]Row, 0, 60)
		publisherRows := make([]PublisherRow, 0, 30)
		for i := range 30 {
			repository := fmt.Sprintf("repo-%d", i%10)
			llmRows = append(llmRows,
				newRow(repository, fmt.Sprintf("postgres-%d", i), []string{"database", "sql"}, "PostgreSQL database", "database"),
				newRow(repository, fmt.Sprintf("app-%d", i), []string{"app"}, "Generic application", catalog.None),
			)
			publisherRows = append(publisherRows,
				publisherRow(repository, fmt.Sprintf("nginx-%d", i), []string{"proxy", "ingress"}, "Ingress controller", 5),
			)
		}
		ts, err := BuildTrainingSet(llmRows, publisherRows)
		require.NoError(t, err)
		m, err := model.Train(ts.TrainInput("sha256:dataset"), model.DefaultConfig())
		require.NoError(t, err)
		assert.Equal(t, []string{"database", "networking"}, m.Categories)
		assert.Equal(t, ts.Digest, m.TrainingSetDigest)
		assert.Equal(t, "sha256:dataset", m.DatasetDigest)
		assert.Equal(t, ts.Counts, m.Metrics.RowCounts)
	})
}
