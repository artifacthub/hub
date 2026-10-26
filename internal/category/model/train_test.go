package model

import (
	"math/rand/v2"
	"slices"
	"strings"
	"testing"

	"github.com/artifacthub/hub/internal/category/catalog"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestTrain(t *testing.T) {
	t.Parallel()

	t.Run("synthetic training set", func(t *testing.T) {
		t.Parallel()

		synthetic := defaultSyntheticConfig()
		rows := syntheticRows(synthetic)
		in := trainInput(rows)
		in.RowCounts = RowCounts{RawLLM: 400, Excluded: 60, Deduplicated: len(rows), LLM: 300, None: 40}
		m, err := Train(in, DefaultConfig())
		require.NoError(t, err)

		// Model
		assert.Equal(t, FormatVersion, m.FormatVersion)
		assert.Equal(t, FeaturesVersion, m.FeaturesVersion)
		assert.Contains(t, []string{AlgorithmComplementNB, AlgorithmLogisticRegression}, m.Algorithm)
		assert.Equal(t, synthetic.categories, m.Categories)
		assert.NotEmpty(t, m.Vocabulary)
		assert.True(t, slices.IsSorted(m.Vocabulary))
		assert.Greater(t, m.Threshold, 0.0)
		assert.Equal(t, "sha256:dataset", m.DatasetDigest)
		assert.Equal(t, catalog.ModelDigest(), m.CatalogDigest)
		assert.Equal(t, "sha256:training-set", m.TrainingSetDigest)

		// Metrics
		mt := m.Metrics
		assert.Equal(t, len(rows), mt.Rows)
		assert.Equal(t, 300, mt.LabelledRows)
		assert.Equal(t, 40, mt.NoneRows)
		assert.Greater(t, mt.Precision, 0.8)
		assert.Greater(t, mt.Coverage, 0.9)
		assert.Equal(t, in.RowCounts, mt.RowCounts)
		assert.Len(t, mt.Categories, len(catalog.All()))
		assert.Equal(t, m.SuppressedCategories, mt.SuppressedCategories)
		assert.NotNil(t, m.CategoryThresholds)
		assert.Empty(t, mt.LowEvidenceCategories)
		assert.Equal(t, []string{
			"ai-machine-learning", "integration-delivery", "streaming-messaging",
			"analytics", "data-processing", "web-applications",
		}, mt.ExcludedCategories)
		assert.Nil(t, mt.Publisher)
		require.Len(t, mt.Algorithms, 2)
		for _, am := range mt.Algorithms {
			assert.Empty(t, am.Error)
			assert.Equal(t, am.Algorithm == m.Algorithm, am.Selected)
			if am.Selected {
				assert.Equal(t, m.Threshold, am.Threshold)
				assert.Equal(t, m.CategoryThresholds, am.CategoryThresholds)
				assert.Equal(t, mt.Precision, am.Precision)
				assert.Equal(t, mt.Coverage, am.Coverage)
			}
		}

		// Predictions
		category, confidence := m.Predict(Input{
			Name:        "postgres-operator",
			Keywords:    []string{"sql", "replica"},
			Description: "Deploys a PostgreSQL cluster with replicas and schema migrations",
		})
		assert.Equal(t, "database", category)
		assert.GreaterOrEqual(t, confidence, m.Threshold)
		category, _ = m.Predict(Input{Name: "unrelated", Description: "Nothing to see here"})
		assert.Empty(t, category)
	})

	t.Run("training is deterministic", func(t *testing.T) {
		t.Parallel()

		rows := syntheticRows(defaultSyntheticConfig())
		m1, err := Train(trainInput(rows), DefaultConfig())
		require.NoError(t, err)
		data1, err := m1.Marshal()
		require.NoError(t, err)

		// Same rows in a different order
		shuffled := slices.Clone(rows)
		rng := rand.New(rand.NewPCG(2, 2)) // #nosec G404 -- deterministic test data
		rng.Shuffle(len(shuffled), func(i, j int) {
			shuffled[i], shuffled[j] = shuffled[j], shuffled[i]
		})
		m2, err := Train(trainInput(shuffled), DefaultConfig())
		require.NoError(t, err)
		data2, err := m2.Marshal()
		require.NoError(t, err)

		assert.Equal(t, string(data1), string(data2))
	})

	t.Run("json round trip", func(t *testing.T) {
		t.Parallel()

		rows := syntheticRows(defaultSyntheticConfig())
		m, err := Train(trainInput(rows), DefaultConfig())
		require.NoError(t, err)
		data, err := m.Marshal()
		require.NoError(t, err)
		m2, err := Unmarshal(data)
		require.NoError(t, err)
		data2, err := m2.Marshal()
		require.NoError(t, err)
		assert.Equal(t, string(data), string(data2))
		for _, r := range rows {
			c1, conf1 := m.Predict(r.Input)
			c2, conf2 := m2.Predict(r.Input)
			assert.Equal(t, c1, c2)
			assert.Equal(t, conf1, conf2)
		}
	})

	t.Run("none rows are only used in the evaluation", func(t *testing.T) {
		t.Parallel()

		cfg := DefaultConfig()
		synthetic := defaultSyntheticConfig()
		synthetic.noneRows = 0
		rows := syntheticRows(synthetic)
		synthetic.noneRows = 80
		rowsWithNone := syntheticRows(synthetic)

		prepared, err := prepareRows(rows, cfg.Folds)
		require.NoError(t, err)
		preparedWithNone, err := prepareRows(rowsWithNone, cfg.Folds)
		require.NoError(t, err)
		d := newFitData(prepared, nil, &cfg)
		dWithNone := newFitData(preparedWithNone, nil, &cfg)
		assert.Equal(t, d, dWithNone)
		for _, alg := range algorithms {
			assert.Equal(t, alg.fit(d, &cfg), alg.fit(dWithNone, &cfg), alg.name)
		}

		m, err := Train(trainInput(rows), cfg)
		require.NoError(t, err)
		mWithNone, err := Train(trainInput(rowsWithNone), cfg)
		require.NoError(t, err)
		assert.Equal(t, 0, m.Metrics.NoneRows)
		assert.Equal(t, 80, mWithNone.Metrics.NoneRows)
		assert.Greater(t, mWithNone.Metrics.NoneFalsePositiveRate, 0.0)
		assert.Greater(t, m.Metrics.Precision, mWithNone.Metrics.Precision)
	})

	t.Run("categories without enough effective examples are excluded", func(t *testing.T) {
		t.Parallel()

		synthetic := defaultSyntheticConfig()
		rows := syntheticRows(synthetic)

		// Halve the weight of the storage rows: 60 rows, 30 effective
		// examples, still enough
		for i := range rows {
			if rows[i].Label == "storage" {
				rows[i].Weight = 0.5
			}
		}
		m, err := Train(trainInput(rows), DefaultConfig())
		require.NoError(t, err)
		assert.Contains(t, m.Categories, "storage")

		// 60 rows, 15 effective examples: excluded
		for i := range rows {
			if rows[i].Label == "storage" {
				rows[i].Weight = 0.25
			}
		}
		m, err = Train(trainInput(rows), DefaultConfig())
		require.NoError(t, err)
		assert.NotContains(t, m.Categories, "storage")
		assert.Contains(t, m.Metrics.ExcludedCategories, "storage")
		for _, cm := range m.Metrics.Categories {
			if cm.Name == "storage" {
				assert.Equal(t, 60, cm.Support)
				assert.Equal(t, 0, cm.Predictions)
			}
		}
	})

	t.Run("publisher metrics", func(t *testing.T) {
		t.Parallel()

		rows := syntheticRows(defaultSyntheticConfig())
		for i := range rows {
			if rows[i].Label != catalog.None && i%2 == 0 {
				rows[i].Source = SourcePublisher
			}
		}
		m, err := Train(trainInput(rows), DefaultConfig())
		require.NoError(t, err)
		assert.Nil(t, m.Metrics.Publisher)

		cfg := DefaultConfig()
		cfg.MinPublisherRows = 150
		m, err = Train(trainInput(rows), cfg)
		require.NoError(t, err)
		require.NotNil(t, m.Metrics.Publisher)
		assert.Equal(t, 150, m.Metrics.Publisher.Rows)
		assert.Equal(t, 150, m.Metrics.Publisher.LabelledRows)
		assert.Equal(t, 0, m.Metrics.Publisher.NoneRows)
	})

	t.Run("a few wrong labels among the most confident predictions", func(t *testing.T) {
		t.Parallel()

		// A publisher row that clearly describes a database but is labelled
		// as storage gets one of the most confident (wrong) predictions
		rows := syntheticRows(defaultSyntheticConfig())
		rows = append(rows, Row{
			Input: Input{
				Name:        "postgres-mysql-sql",
				Keywords:    []string{"postgres", "mysql", "sql", "replica"},
				Description: "A postgres mysql sql replica query schema table mongodb.",
			},
			Label:      "storage",
			Weight:     1,
			Source:     SourcePublisher,
			Repository: "repo-mislabelled",
		})

		cfg := DefaultConfig()
		cfg.MinThresholdPredictions = 1
		_, err := Train(trainInput(rows), cfg)
		assert.ErrorIs(t, err, ErrTargetPrecisionUnreachable)

		m, err := Train(trainInput(rows), DefaultConfig())
		require.NoError(t, err)
		assert.GreaterOrEqual(t, m.Metrics.Precision, DefaultTargetPrecision)
	})

	t.Run("target precision unreachable", func(t *testing.T) {
		t.Parallel()

		// All rows have the same features, so labels can't be predicted
		categories := []string{"database", "networking", "security", "storage"}
		rows := make([]Row, 0, 200)
		for i := range 200 {
			rows = append(rows, Row{
				Input:      Input{Name: "app", Keywords: []string{"kubernetes"}, Description: "Some application"},
				Label:      categories[i%len(categories)],
				Weight:     1,
				Source:     SourceLLM,
				Repository: "repo" + strings.Repeat("x", i%10),
			})
		}
		_, err := Train(trainInput(rows), DefaultConfig())
		assert.ErrorIs(t, err, ErrTargetPrecisionUnreachable)
		assert.ErrorContains(t, err, AlgorithmComplementNB)
		assert.ErrorContains(t, err, AlgorithmLogisticRegression)
	})

	t.Run("not enough data", func(t *testing.T) {
		t.Parallel()

		synthetic := defaultSyntheticConfig()
		synthetic.categories = []string{"database"}
		_, err := Train(trainInput(syntheticRows(synthetic)), DefaultConfig())
		assert.ErrorIs(t, err, ErrNotEnoughData)

		_, err = Train(trainInput(nil), DefaultConfig())
		assert.ErrorIs(t, err, ErrNotEnoughData)
	})

	t.Run("invalid input", func(t *testing.T) {
		t.Parallel()

		testCases := []struct {
			desc        string
			mutate      func(in *TrainInput, cfg *Config)
			expectedErr string
		}{
			{"dataset digest", func(in *TrainInput, cfg *Config) { in.DatasetDigest = "" }, "dataset digest not provided"},
			{"training set digest", func(in *TrainInput, cfg *Config) { in.TrainingSetDigest = "" }, "training set digest not provided"},
			{"unknown label", func(in *TrainInput, cfg *Config) { in.Rows[3].Label = "unknown" }, `row 3: invalid label "unknown"`},
			{"skip prediction label", func(in *TrainInput, cfg *Config) {
				in.Rows[3].Label = catalog.SkipPrediction
			}, `row 3: invalid label "skip-prediction"`},
			{"zero weight", func(in *TrainInput, cfg *Config) { in.Rows[3].Weight = 0 }, "row 3: weight must be positive"},
			{"negative weight", func(in *TrainInput, cfg *Config) { in.Rows[3].Weight = -1 }, "row 3: weight must be positive"},
			{"invalid source", func(in *TrainInput, cfg *Config) { in.Rows[3].Source = "skip" }, `row 3: invalid source "skip"`},
			{"missing repository", func(in *TrainInput, cfg *Config) { in.Rows[3].Repository = "" }, "row 3: repository not provided"},
			{"invalid target precision", func(in *TrainInput, cfg *Config) { cfg.TargetPrecision = 1.5 }, "target precision"},
			{"invalid min threshold predictions", func(in *TrainInput, cfg *Config) { cfg.MinThresholdPredictions = 0 }, "min threshold predictions must be positive"},
			{"invalid folds", func(in *TrainInput, cfg *Config) { cfg.Folds = 1 }, "folds must be at least 2"},
			{"invalid epochs", func(in *TrainInput, cfg *Config) { cfg.LREpochs = 0 }, "lr epochs must be positive"},
		}
		for _, tc := range testCases {
			t.Run(tc.desc, func(t *testing.T) {
				t.Parallel()
				in := trainInput(syntheticRows(defaultSyntheticConfig()))
				cfg := DefaultConfig()
				tc.mutate(in, &cfg)
				_, err := Train(in, cfg)
				assert.ErrorIs(t, err, ErrInvalidInput)
				assert.ErrorContains(t, err, tc.expectedErr)
			})
		}
	})
}

func TestFolds(t *testing.T) {
	t.Parallel()

	t.Run("fold assignment is stable", func(t *testing.T) {
		t.Parallel()

		// Pinned values: changing the fold assignment changes the metrics
		assert.Equal(t, 2, foldOf("bitnami", DefaultFolds))
		assert.Equal(t, 3, foldOf("prometheus-community", DefaultFolds))
		assert.Equal(t, 2, foldOf("artifacthub", DefaultFolds))
		folds := make(map[int]int)
		for i := range 100 {
			fold := foldOf("repo-"+strings.Repeat("x", i), DefaultFolds)
			assert.GreaterOrEqual(t, fold, 0)
			assert.Less(t, fold, DefaultFolds)
			folds[fold]++
		}
		assert.Len(t, folds, DefaultFolds)
	})

	t.Run("rows of the same repository share a fold", func(t *testing.T) {
		t.Parallel()

		cfg := DefaultConfig()
		rows := syntheticRows(defaultSyntheticConfig())
		prepared, err := prepareRows(rows, cfg.Folds)
		require.NoError(t, err)
		repositoryFold := make(map[string]int)
		for _, r := range prepared {
			if fold, ok := repositoryFold[r.Repository]; ok {
				assert.Equal(t, fold, r.fold, r.Repository)
			}
			repositoryFold[r.Repository] = r.fold
		}

		// Fold models are never trained on rows of the fold's repositories
		for k := range cfg.Folds {
			d := newFitData(prepared, func(r *preparedRow) bool { return r.fold != k }, &cfg)
			require.NotNil(t, d)
			n := 0
			for _, r := range prepared {
				if r.fold != k && r.Label != catalog.None {
					n++
				}
			}
			assert.Len(t, d.y, n)
		}
	})
}

func TestFitData(t *testing.T) {
	t.Parallel()

	cfg := DefaultConfig()
	cfg.MinCategoryExamples = 2
	row := func(label string, weight float64, keywords ...string) *preparedRow {
		r := Row{Input: Input{Keywords: keywords}, Label: label, Weight: weight, Source: SourceLLM, Repository: "repo"}
		return &preparedRow{Row: r, features: Features(r.Input)}
	}
	rows := []*preparedRow{
		row("storage", 1, "s3", "common"),
		row("storage", 1, "s3", "rare"),
		row("database", 1, "sql", "common"),
		row("database", 1, "sql", "common"),
		row("database", 2, "sql"),
		row("security", 1, "tls", "tls-common"),
		row(catalog.None, 1, "common", "rare", "tls"),
	}

	d := newFitData(rows, nil, &cfg)
	require.NotNil(t, d)

	// Categories sorted by ID, security excluded (one effective example)
	assert.Equal(t, []string{"database", "storage"}, d.categories)

	// Features in at least two training rows (none and security rows are
	// not used)
	assert.Equal(t, []string{"kw:common", "kw:s3", "kw:sql"}, d.vocabulary)

	// Category weights are inversely proportional to their frequency:
	// database has 4 effective examples, storage 2, total 6
	assert.Equal(t, []int{1, 1, 0, 0, 0}, d.y)
	assert.Equal(t, []float64{1.5, 1.5, 0.75, 0.75, 1.5}, d.sw)
	assert.Equal(t, [][]int{{0, 1}, {1}, {0, 2}, {0, 2}, {2}}, d.x)

	t.Run("vocabulary size cap keeps the most frequent features", func(t *testing.T) {
		t.Parallel()

		cfg := cfg
		cfg.MaxVocabularySize = 2
		d := newFitData(rows, nil, &cfg)
		require.NotNil(t, d)
		assert.Equal(t, []string{"kw:common", "kw:sql"}, d.vocabulary)
	})

	t.Run("fewer than two categories", func(t *testing.T) {
		t.Parallel()

		cfg := cfg
		cfg.MinCategoryExamples = 3
		assert.Nil(t, newFitData(rows, nil, &cfg))
	})
}
