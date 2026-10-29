package model

import (
	"errors"
	"math"
	"slices"
	"sort"

	"github.com/artifacthub/hub/internal/category/catalog"
)

// ErrTargetPrecisionUnreachable indicates that no confidence threshold
// achieves the target precision.
var ErrTargetPrecisionUnreachable = errors.New("target precision unreachable")

// scoredRow represents the out-of-fold score of a training row.
type scoredRow struct {
	// label represents the row's label (a category name or none).
	label string

	// publisher indicates whether the row was labelled by a publisher.
	publisher bool

	// fold represents the cross-validation fold the row belongs to.
	fold int

	// top represents the name of the top category predicted by the model
	// trained without the row's fold (empty when there was no prediction).
	top string

	// confidence represents the confidence of the top category.
	confidence float64
}

// cutoffs represents the confidence thresholds a prediction must reach to be
// used, and the categories whose predictions are never used.
type cutoffs struct {
	// threshold represents the threshold shared by the categories.
	threshold float64

	// categoryThresholds represents the thresholds of the categories that use
	// their own threshold instead of the shared one.
	categoryThresholds map[string]float64

	// suppressed represents the categories whose predictions are treated as
	// unknown.
	suppressed []string
}

// evaluation represents the result of the evaluation of an algorithm's
// out-of-fold scores.
type evaluation struct {
	threshold          float64
	categoryThresholds map[string]float64
	suppressed         []string
	lowEvidence        []string
	summary            Summary
	categories         []CategoryMetrics
	confusionMatrix    ConfusionMatrix
	publisher          *Summary
}

// evaluate evaluates the out-of-fold scores provided:
//
//  1. The shared threshold is tuned on all the out-of-fold scores.
//  2. Cross-fitted predictions are made: the rows of each fold are predicted
//     using the thresholds tuned on the other folds' scores.
//  3. Categories with enough cross-fitted predictions and a precision below
//     the per-category floor are moved one step further: the ones using the
//     shared threshold get their own threshold, tuned on their predictions to
//     reach the target precision, and the ones with their own threshold are
//     suppressed (their predictions are treated as unknown). Categories whose
//     own threshold can't reach the target are suppressed too. The shared
//     threshold is tuned again without the categories moved, and steps 2 and
//     3 are repeated until no category is below the floor.
//
// The metrics returned are computed from the final cross-fitted predictions.
// modelCategories represents the categories of the model trained on all the
// rows, used to report the low evidence ones.
func evaluate(rows []scoredRow, modelCategories []string, cfg *Config) (*evaluation, error) {
	c, err := tuneCutoffs(rows, nil, nil, nil, cfg)
	if err != nil {
		return nil, err
	}
	preds := crossFit(rows, nil, nil, cfg)

	// Move the categories below the per-category floor one step further
	// until none is below it. Suppressed categories have no predictions, so
	// each iteration moves at least one category, and the loop ends after at
	// most two iterations per category.
	var own, suppressed []string
	for {
		below := belowFloor(rows, preds, cfg)
		if len(below) == 0 {
			break
		}
		for _, name := range below {
			if slices.Contains(own, name) {
				suppressed = append(suppressed, name)
			} else {
				own = append(own, name)
			}
		}
		suppressed = sortedByCatalog(suppressed)
		own = sortedByCatalog(withoutCategories(own, suppressed))
		c, err = tuneCutoffs(rows, nil, own, suppressed, cfg)
		if err != nil {
			return nil, err
		}
		suppressed = c.suppressed
		own = withoutCategories(own, suppressed)
		preds = crossFit(rows, own, suppressed, cfg)
	}

	// Compute metrics
	e := &evaluation{
		threshold:          c.threshold,
		categoryThresholds: c.categoryThresholds,
		suppressed:         c.suppressed,
		lowEvidence:        []string{},
		summary:            computeSummary(rows, preds, nil),
		categories:         computeCategoriesMetrics(rows, preds),
		confusionMatrix:    computeConfusionMatrix(rows, preds),
	}
	for _, cm := range e.categories {
		if !slices.Contains(modelCategories, cm.Name) || slices.Contains(e.suppressed, cm.Name) {
			continue
		}
		if cm.Predictions < cfg.MinCategoryPredictions {
			e.lowEvidence = append(e.lowEvidence, cm.Name)
		}
	}
	isPublisher := func(r *scoredRow) bool { return r.publisher }
	if publisher := computeSummary(rows, preds, isPublisher); publisher.Rows >= cfg.MinPublisherRows {
		e.publisher = &publisher
	}
	return e, nil
}

// belowFloor returns the categories with enough predictions whose precision
// is below the per-category floor, sorted by category ID.
func belowFloor(rows []scoredRow, preds []string, cfg *Config) []string {
	var names []string
	for _, cm := range computeCategoriesMetrics(rows, preds) {
		if cm.Predictions >= cfg.MinCategoryPredictions && cm.Precision < cfg.MinCategoryPrecision {
			names = append(names, cm.Name)
		}
	}
	return names
}

// crossFit returns the cross-fitted predictions of the rows provided. The
// rows of each fold are predicted using the thresholds tuned on the scores of
// the rows in the other folds, with the categories in own using their own
// threshold. When tuning the shared threshold fails for a fold, its rows get
// no predictions.
func crossFit(rows []scoredRow, own, suppressed []string, cfg *Config) []string {
	preds := make([]string, len(rows))
	for k := range cfg.Folds {
		notInFold := func(r *scoredRow) bool { return r.fold != k }
		c, err := tuneCutoffs(rows, notInFold, own, suppressed, cfg)
		if err != nil {
			continue
		}
		for i := range rows {
			if rows[i].fold == k {
				preds[i] = predict(&rows[i], c)
			}
		}
	}
	return preds
}

// tuneCutoffs tunes the shared threshold on the predictions of the categories
// not in own or suppressed, and the threshold of each category in own on its
// predictions, to reach the target precision. Categories in own whose
// threshold can't reach it are suppressed. Rows can be filtered using the
// include function (nil includes all rows). When the shared threshold can't
// reach the target precision, the error ErrTargetPrecisionUnreachable is
// returned.
func tuneCutoffs(
	rows []scoredRow,
	include func(r *scoredRow) bool,
	own []string,
	suppressed []string,
	cfg *Config,
) (*cutoffs, error) {
	threshold, err := tuneThreshold(rows, include, slices.Concat(own, suppressed), cfg.TargetPrecision, cfg.MinThresholdPredictions)
	if err != nil {
		return nil, err
	}
	c := &cutoffs{
		threshold:          threshold,
		categoryThresholds: make(map[string]float64, len(own)),
		suppressed:         append([]string{}, suppressed...),
	}
	for _, name := range own {
		isCategory := func(r *scoredRow) bool { return (include == nil || include(r)) && r.top == name }
		t, err := tuneThreshold(rows, isCategory, nil, cfg.TargetPrecision, cfg.MinThresholdPredictions)
		if err != nil {
			c.suppressed = append(c.suppressed, name)
			continue
		}
		c.categoryThresholds[name] = t
	}
	c.suppressed = sortedByCatalog(c.suppressed)
	return c, nil
}

// tuneThreshold returns the lowest confidence threshold t such that the
// precision of the predictions is at least the target precision for every
// threshold greater than or equal to t with at least minPredictions
// predictions above it. Thresholds with fewer predictions are not checked, so
// that a few wrong labels among the most confident predictions don't make the
// target unreachable (they still count towards the precision of the lower
// thresholds). Rows can be filtered using the include function (nil includes
// all rows), and predictions of suppressed categories are treated as unknown.
// When no threshold qualifies, the error ErrTargetPrecisionUnreachable is
// returned.
func tuneThreshold(
	rows []scoredRow,
	include func(r *scoredRow) bool,
	suppressed []string,
	targetPrecision float64,
	minPredictions int,
) (float64, error) {
	// Collect the rows that would get a prediction with a zero threshold
	candidates := make([]*scoredRow, 0, len(rows))
	for i := range rows {
		r := &rows[i]
		if include != nil && !include(r) {
			continue
		}
		if r.top == "" || slices.Contains(suppressed, r.top) {
			continue
		}
		candidates = append(candidates, r)
	}
	sort.SliceStable(candidates, func(i, j int) bool {
		return candidates[i].confidence > candidates[j].confidence
	})

	// Lower the threshold one distinct confidence value at a time, as long as
	// the precision stays at or above the target once there are enough
	// predictions to check it
	threshold := math.NaN()
	var predictions, correct int
	for i := 0; i < len(candidates); {
		confidence := candidates[i].confidence
		for ; i < len(candidates) && candidates[i].confidence == confidence; i++ {
			predictions++
			if candidates[i].top == candidates[i].label {
				correct++
			}
		}
		if predictions < minPredictions {
			continue
		}
		if float64(correct)/float64(predictions) < targetPrecision {
			break
		}
		threshold = confidence
	}
	if math.IsNaN(threshold) {
		return 0, ErrTargetPrecisionUnreachable
	}
	return threshold, nil
}

// predict returns the prediction for the scored row provided, using the
// cutoffs provided.
func predict(r *scoredRow, c *cutoffs) string {
	if r.top == "" || slices.Contains(c.suppressed, r.top) {
		return ""
	}
	threshold := c.threshold
	if t, ok := c.categoryThresholds[r.top]; ok {
		threshold = t
	}
	if r.confidence < threshold {
		return ""
	}
	return r.top
}

// withoutCategories returns the categories in names not in exclude.
func withoutCategories(names, exclude []string) []string {
	var result []string
	for _, name := range names {
		if !slices.Contains(exclude, name) {
			result = append(result, name)
		}
	}
	return result
}

// sortedByCatalog returns the catalog categories in names, sorted by
// category ID.
func sortedByCatalog(names []string) []string {
	sorted := []string{}
	for _, name := range catalog.Names() {
		if slices.Contains(names, name) {
			sorted = append(sorted, name)
		}
	}
	return sorted
}

// excludedCategories returns the names of the catalog categories not in the
// model categories provided, sorted by category ID.
func excludedCategories(modelCategories []string) []string {
	excluded := []string{}
	for _, name := range catalog.Names() {
		if !slices.Contains(modelCategories, name) {
			excluded = append(excluded, name)
		}
	}
	return excluded
}
