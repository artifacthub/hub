package model

import (
	"slices"
	"testing"

	"github.com/artifacthub/hub/internal/category/catalog"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// scored returns a scored row in fold 0 labelled as label and predicted as
// top with the confidence provided.
func scored(label, top string, confidence float64) scoredRow {
	return scoredRow{label: label, top: top, confidence: confidence}
}

func TestTuneThreshold(t *testing.T) {
	t.Parallel()

	testCases := []struct {
		desc              string
		rows              []scoredRow
		suppressed        []string
		targetPrecision   float64
		minPredictions    int
		expectedThreshold float64
		expectedErr       error
	}{
		{
			"no rows",
			nil,
			nil,
			0.85,
			1,
			0,
			ErrTargetPrecisionUnreachable,
		},
		{
			"no predictions",
			[]scoredRow{scored("database", "", 0), scored("none", "", 0)},
			nil,
			0.85,
			1,
			0,
			ErrTargetPrecisionUnreachable,
		},
		{
			"all predictions correct",
			[]scoredRow{
				scored("database", "database", 0.9),
				scored("storage", "storage", 0.4),
				scored("security", "security", 0.7),
			},
			nil,
			0.85,
			1,
			0.4,
			nil,
		},
		{
			"most confident prediction wrong",
			[]scoredRow{
				scored("database", "storage", 0.9),
				scored("storage", "storage", 0.8),
				scored("security", "security", 0.7),
			},
			nil,
			0.5,
			1,
			0,
			ErrTargetPrecisionUnreachable,
		},
		{
			"precision drops below target and recovers later",
			[]scoredRow{
				scored("database", "database", 0.9), // 1/1
				scored("database", "database", 0.8), // 2/2
				scored("database", "database", 0.7), // 3/3
				scored("database", "storage", 0.6),  // 3/4 = 0.75
				scored("none", "storage", 0.5),      // 3/5 = 0.6
				scored("storage", "storage", 0.4),   // 4/6 = 0.67
				scored("storage", "storage", 0.3),   // 5/7 = 0.71
				scored("storage", "storage", 0.2),   // 6/8 = 0.75
			},
			nil,
			0.75,
			1,
			0.6,
			nil,
		},
		{
			"precision exactly at target",
			[]scoredRow{
				scored("database", "database", 0.9),
				scored("database", "database", 0.8),
				scored("database", "database", 0.7),
				scored("database", "storage", 0.6),
			},
			nil,
			0.75,
			1,
			0.6,
			nil,
		},
		{
			"tied confidences are evaluated together",
			[]scoredRow{
				scored("database", "database", 0.9),
				scored("database", "database", 0.8),
				scored("database", "storage", 0.8),
				scored("storage", "storage", 0.7),
			},
			nil,
			0.75,
			1,
			0.9,
			nil,
		},
		{
			"none rows predicted are false positives",
			[]scoredRow{
				scored("database", "database", 0.9),
				scored(catalog.None, "database", 0.8),
				scored(catalog.None, "", 0.7),
			},
			nil,
			0.85,
			1,
			0.9,
			nil,
		},
		{
			"suppressed categories are ignored",
			[]scoredRow{
				scored("database", "storage", 0.9),
				scored("database", "database", 0.8),
				scored("storage", "database", 0.7),
				scored("database", "database", 0.6),
			},
			[]string{"storage"},
			0.5,
			1,
			0.6,
			nil,
		},
		{
			"wrong most confident prediction within the minimum predictions",
			[]scoredRow{
				scored("database", "storage", 0.9),  // not checked
				scored("storage", "storage", 0.8),   // not checked
				scored("security", "security", 0.7), // 2/3 = 0.67
				scored("database", "database", 0.6), // 3/4 = 0.75
			},
			nil,
			0.6,
			3,
			0.6,
			nil,
		},
		{
			"precision below target once the minimum predictions is reached",
			[]scoredRow{
				scored("database", "storage", 0.9),  // not checked
				scored("storage", "database", 0.8),  // not checked
				scored("security", "security", 0.7), // 1/3 = 0.33
				scored("database", "database", 0.6), // 2/4 = 0.5
				scored("database", "database", 0.5), // 3/5 = 0.6
			},
			nil,
			0.6,
			3,
			0,
			ErrTargetPrecisionUnreachable,
		},
		{
			"fewer predictions than the minimum",
			[]scoredRow{
				scored("database", "database", 0.9),
				scored("storage", "storage", 0.8),
			},
			nil,
			0.85,
			3,
			0,
			ErrTargetPrecisionUnreachable,
		},
	}
	for _, tc := range testCases {
		t.Run(tc.desc, func(t *testing.T) {
			t.Parallel()
			threshold, err := tuneThreshold(tc.rows, nil, tc.suppressed, tc.targetPrecision, tc.minPredictions)
			if tc.expectedErr != nil {
				assert.ErrorIs(t, err, tc.expectedErr)
				return
			}
			require.NoError(t, err)
			assert.Equal(t, tc.expectedThreshold, threshold)
		})
	}

	t.Run("include filter", func(t *testing.T) {
		t.Parallel()

		rows := []scoredRow{
			{label: "database", top: "storage", confidence: 0.9, fold: 1},
			{label: "database", top: "database", confidence: 0.8, fold: 0},
		}
		_, err := tuneThreshold(rows, nil, nil, 0.85, 1)
		assert.ErrorIs(t, err, ErrTargetPrecisionUnreachable)
		threshold, err := tuneThreshold(rows, func(r *scoredRow) bool { return r.fold == 0 }, nil, 0.85, 1)
		require.NoError(t, err)
		assert.Equal(t, 0.8, threshold)
	})
}

func TestCrossFit(t *testing.T) {
	t.Parallel()

	t.Run("each fold uses the threshold tuned on the other folds", func(t *testing.T) {
		t.Parallel()

		cfg := DefaultConfig()
		cfg.MinThresholdPredictions = 1
		cfg.Folds = 3
		cfg.TargetPrecision = 0.75
		rows := []scoredRow{
			// Fold 0: threshold tuned on folds 1 and 2 is 0.7
			{label: "database", top: "database", confidence: 0.9, fold: 0},
			{label: "storage", top: "storage", confidence: 0.5, fold: 0},
			// Fold 1: threshold tuned on folds 0 and 2 is 0.4
			{label: "database", top: "database", confidence: 0.8, fold: 1},
			{label: catalog.None, top: "database", confidence: 0.6, fold: 1},
			// Fold 2: threshold tuned on folds 0 and 1 is 0.8
			{label: "storage", top: "storage", confidence: 0.7, fold: 2},
			{label: "database", top: "storage", confidence: 0.4, fold: 2},
		}
		assert.Equal(t, []string{"database", "", "database", "database", "", ""}, crossFit(rows, nil, nil, &cfg))

		// Suppressing a category changes the thresholds too
		assert.Equal(t, []string{"", "", "", "", "storage", ""}, crossFit(rows, nil, []string{"database"}, &cfg))

		// Categories with their own threshold use the one tuned on their
		// predictions in the other folds (storage: 0.7, 0.5 and 0.5), and
		// the shared threshold is tuned without them (0.8, 0.9 and 0.8)
		assert.Equal(t, []string{"database", "", "", "", "storage", ""}, crossFit(rows, []string{"storage"}, nil, &cfg))
	})

	t.Run("folds whose tuning fails get no predictions", func(t *testing.T) {
		t.Parallel()

		cfg := DefaultConfig()
		cfg.MinThresholdPredictions = 1
		cfg.Folds = 2
		rows := []scoredRow{
			{label: "database", top: "storage", confidence: 0.9, fold: 0},
			{label: "database", top: "database", confidence: 0.8, fold: 1},
		}
		assert.Equal(t, []string{"storage", ""}, crossFit(rows, nil, nil, &cfg))
	})
}

func TestEvaluate(t *testing.T) {
	t.Parallel()

	// rows returns n rows with the label, prediction and confidence
	// provided, spread across the folds
	rows := func(n int, label, top string, confidence float64, publisher bool) []scoredRow {
		rs := make([]scoredRow, 0, n)
		for i := range n {
			rs = append(rs, scoredRow{
				label:      label,
				top:        top,
				confidence: confidence,
				fold:       i % DefaultFolds,
				publisher:  publisher,
			})
		}
		return rs
	}

	t.Run("precision unreachable", func(t *testing.T) {
		t.Parallel()

		cfg := DefaultConfig()
		rs := slices.Concat(
			rows(50, "database", "database", 0.9, false),
			rows(50, "storage", "database", 0.9, false),
		)
		_, err := evaluate(rs, []string{"database", "storage"}, &cfg)
		assert.ErrorIs(t, err, ErrTargetPrecisionUnreachable)
	})

	t.Run("metrics", func(t *testing.T) {
		t.Parallel()

		cfg := DefaultConfig()
		rs := slices.Concat(
			rows(50, "database", "database", 0.9, false),
			rows(20, "database", "storage", 0.4, false),
			rows(40, "storage", "storage", 0.8, false),
			rows(5, catalog.None, "storage", 0.7, false),
			rows(15, catalog.None, "database", 0.3, false),
			rows(5, "security", "", 0, false),
		)
		e, err := evaluate(rs, []string{"database", "storage", "security"}, &cfg)
		require.NoError(t, err)

		assert.Equal(t, 0.7, e.threshold)
		assert.Equal(t, Summary{
			Rows:                  135,
			LabelledRows:          115,
			NoneRows:              20,
			Predictions:           95,
			CorrectPredictions:    90,
			Precision:             90.0 / 95,
			Coverage:              90.0 / 115,
			NoneFalsePositiveRate: 5.0 / 20,
		}, e.summary)
		assert.Empty(t, e.categoryThresholds)
		assert.Empty(t, e.suppressed)
		assert.Equal(t, []string{"security"}, e.lowEvidence)
		assert.Nil(t, e.publisher)

		// Categories metrics
		require.Len(t, e.categories, len(catalog.All()))
		for _, cm := range e.categories {
			switch cm.Name {
			case "database":
				assert.Equal(t, CategoryMetrics{"database", 70, 50, 50, 1, 50.0 / 70}, cm)
			case "storage":
				assert.Equal(t, CategoryMetrics{"storage", 40, 45, 40, 40.0 / 45, 1}, cm)
			case "security":
				assert.Equal(t, CategoryMetrics{"security", 5, 0, 0, 0, 0}, cm)
			default:
				assert.Equal(t, CategoryMetrics{Name: cm.Name}, cm)
			}
		}

		// Confusion matrix
		cm := e.confusionMatrix
		require.Equal(t, append(catalog.Names(), catalog.None), cm.Labels)
		idx := func(name string) int {
			for i, l := range cm.Labels {
				if l == name {
					return i
				}
			}
			t.Fatalf("label %s not found", name)
			return -1
		}
		none := idx(catalog.None)
		assert.Equal(t, 50, cm.Counts[idx("database")][idx("database")])
		assert.Equal(t, 20, cm.Counts[idx("database")][none])
		assert.Equal(t, 40, cm.Counts[idx("storage")][idx("storage")])
		assert.Equal(t, 5, cm.Counts[none][idx("storage")])
		assert.Equal(t, 15, cm.Counts[none][none])
		assert.Equal(t, 5, cm.Counts[idx("security")][none])
		total := 0
		for _, row := range cm.Counts {
			for _, n := range row {
				total += n
			}
		}
		assert.Equal(t, 135, total)
	})

	t.Run("categories below the precision floor get their own threshold", func(t *testing.T) {
		t.Parallel()

		cfg := DefaultConfig()
		cfg.TargetPrecision = 0.85
		cfg.MinThresholdPredictions = 5
		rs := slices.Concat(
			rows(100, "database", "database", 0.9, false),
			rows(100, "database", "database", 0.5, false),
			// Storage precision is 0.5 with the shared threshold (0.5), and 1
			// with its own one (0.8)
			rows(20, "storage", "storage", 0.8, false),
			rows(20, "database", "storage", 0.6, false),
		)
		e, err := evaluate(rs, []string{"database", "storage"}, &cfg)
		require.NoError(t, err)

		assert.Equal(t, 0.5, e.threshold)
		assert.Equal(t, map[string]float64{"storage": 0.8}, e.categoryThresholds)
		assert.Empty(t, e.suppressed)
		assert.Equal(t, 220, e.summary.Predictions)
		assert.Equal(t, 220, e.summary.CorrectPredictions)
		for _, cm := range e.categories {
			if cm.Name == "storage" {
				assert.Equal(t, CategoryMetrics{"storage", 20, 20, 20, 1, 1}, cm)
			}
		}
	})

	t.Run("categories that fall below the precision floor when the shared threshold changes get their own threshold", func(t *testing.T) {
		t.Parallel()

		cfg := DefaultConfig()
		cfg.TargetPrecision = 0.85
		cfg.MinThresholdPredictions = 5
		rs := slices.Concat(
			rows(200, "database", "database", 0.9, false),
			// Storage precision is 0.5 with the shared threshold (0.6)
			rows(20, "storage", "storage", 0.8, false),
			rows(20, "database", "storage", 0.7, false),
			// Security precision is 1 with the shared threshold (0.6), and
			// 0.5 once it's tuned again without storage (0.5)
			rows(30, "security", "security", 0.6, false),
			rows(30, catalog.None, "security", 0.5, false),
		)
		e, err := evaluate(rs, []string{"database", "storage", "security"}, &cfg)
		require.NoError(t, err)

		assert.Equal(t, 0.9, e.threshold)
		assert.Equal(t, map[string]float64{"storage": 0.8, "security": 0.6}, e.categoryThresholds)
		assert.Empty(t, e.suppressed)
		assert.Equal(t, 250, e.summary.Predictions)
		assert.Equal(t, 250, e.summary.CorrectPredictions)
	})

	t.Run("categories whose own threshold can't reach the target precision are suppressed", func(t *testing.T) {
		t.Parallel()

		cfg := DefaultConfig()
		rs := slices.Concat(
			rows(100, "database", "database", 0.9, false),
			// Storage precision is 0.5 (10 of 20 predictions) at any threshold
			rows(10, "storage", "storage", 0.8, false),
			rows(10, "database", "storage", 0.8, false),
			// Security precision is 0.5 too, but with only 4 predictions
			rows(2, "security", "security", 0.85, false),
			rows(2, catalog.None, "security", 0.85, false),
		)
		e, err := evaluate(rs, []string{"database", "storage", "security"}, &cfg)
		require.NoError(t, err)

		assert.Empty(t, e.categoryThresholds)
		assert.Equal(t, []string{"storage"}, e.suppressed)
		assert.Equal(t, []string{"security"}, e.lowEvidence)

		// Metrics are recomputed with storage predictions treated as unknown
		assert.Equal(t, 104, e.summary.Predictions)
		assert.Equal(t, 102, e.summary.CorrectPredictions)
		assert.Equal(t, 0.85, e.threshold)
		for _, cm := range e.categories {
			if cm.Name == "storage" {
				assert.Equal(t, 0, cm.Predictions)
			}
		}
	})

	t.Run("categories still below the precision floor with their own threshold are suppressed", func(t *testing.T) {
		t.Parallel()

		// The floor is above the target precision, so that storage's own
		// threshold (0.8, with a precision of 40/45) doesn't reach it
		cfg := DefaultConfig()
		cfg.MinThresholdPredictions = 5
		cfg.MinCategoryPrecision = 0.95
		rs := slices.Concat(
			rows(100, "database", "database", 0.9, false),
			rows(200, "database", "database", 0.5, false),
			rows(40, "storage", "storage", 0.8, false),
			rows(5, "database", "storage", 0.8, false),
			rows(20, "database", "storage", 0.5, false),
		)
		e, err := evaluate(rs, []string{"database", "storage"}, &cfg)
		require.NoError(t, err)

		assert.Equal(t, 0.5, e.threshold)
		assert.Empty(t, e.categoryThresholds)
		assert.Equal(t, []string{"storage"}, e.suppressed)
		assert.Equal(t, 300, e.summary.Predictions)
		assert.Equal(t, 300, e.summary.CorrectPredictions)
	})

	t.Run("publisher metrics", func(t *testing.T) {
		t.Parallel()

		rs := slices.Concat(
			rows(50, "database", "database", 0.9, false),
			rows(20, "storage", "storage", 0.9, true),
			rows(5, "storage", "", 0, true),
		)

		cfg := DefaultConfig()
		cfg.MinPublisherRows = 25
		e, err := evaluate(rs, []string{"database", "storage"}, &cfg)
		require.NoError(t, err)
		require.NotNil(t, e.publisher)
		assert.Equal(t, Summary{
			Rows:               25,
			LabelledRows:       25,
			Predictions:        20,
			CorrectPredictions: 20,
			Precision:          1,
			Coverage:           0.8,
		}, *e.publisher)

		cfg.MinPublisherRows = 26
		e, err = evaluate(rs, []string{"database", "storage"}, &cfg)
		require.NoError(t, err)
		assert.Nil(t, e.publisher)
	})
}
