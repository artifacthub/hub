package model

import (
	"github.com/artifacthub/hub/internal/category/catalog"
)

// Metrics represents the cross-fitted evaluation metrics of a model (see
// Train for details about how they are computed).
type Metrics struct {
	// Summary represents the overall metrics.
	Summary

	// Categories represents the metrics of each of the categories in the
	// catalog, sorted by category ID.
	Categories []CategoryMetrics `json:"categories"`

	// SuppressedCategories represents the categories whose predictions are
	// not used because their precision was below the per-category floor,
	// even with their own threshold.
	SuppressedCategories []string `json:"suppressed_categories"`

	// LowEvidenceCategories represents the model categories that weren't
	// suppressed but had too few predictions to evaluate their precision.
	LowEvidenceCategories []string `json:"low_evidence_categories"`

	// ExcludedCategories represents the catalog categories left out of the
	// model because they didn't have enough training examples.
	ExcludedCategories []string `json:"excluded_categories"`

	// ConfusionMatrix represents the confusion matrix of the predictions.
	ConfusionMatrix ConfusionMatrix `json:"confusion_matrix"`

	// Publisher represents the metrics restricted to the rows labelled by
	// publishers. It's only set when there are enough publisher rows.
	Publisher *Summary `json:"publisher,omitempty"`

	// RowCounts represents the number of rows of the training set.
	RowCounts RowCounts `json:"row_counts"`

	// Algorithms represents the evaluation results of each algorithm.
	Algorithms []AlgorithmMetrics `json:"algorithms"`
}

// Summary represents the metrics of a set of rows.
type Summary struct {
	// Rows represents the number of rows evaluated.
	Rows int `json:"rows"`

	// LabelledRows represents the number of rows labelled with a category.
	LabelledRows int `json:"labelled_rows"`

	// NoneRows represents the number of rows labelled as none.
	NoneRows int `json:"none_rows"`

	// Predictions represents the number of rows that got a prediction.
	Predictions int `json:"predictions"`

	// CorrectPredictions represents the number of correct predictions.
	CorrectPredictions int `json:"correct_predictions"`

	// Precision represents the share of predictions that were correct. Any
	// prediction for a none row is a false positive.
	Precision float64 `json:"precision"`

	// Coverage represents the share of rows labelled with a category that
	// got a prediction.
	Coverage float64 `json:"coverage"`

	// NoneFalsePositiveRate represents the share of none rows that got a
	// prediction.
	NoneFalsePositiveRate float64 `json:"none_false_positive_rate"`
}

// CategoryMetrics represents the metrics of a category.
type CategoryMetrics struct {
	// Name represents the name of the category.
	Name string `json:"name"`

	// Support represents the number of rows labelled with the category.
	Support int `json:"support"`

	// Predictions represents the number of rows predicted as the category.
	Predictions int `json:"predictions"`

	// CorrectPredictions represents the number of rows correctly predicted
	// as the category.
	CorrectPredictions int `json:"correct_predictions"`

	// Precision represents the share of the category predictions that were
	// correct (0 when there were no predictions).
	Precision float64 `json:"precision"`

	// Recall represents the share of the rows labelled with the category that
	// were predicted as such (0 when there is no support).
	Recall float64 `json:"recall"`
}

// ConfusionMatrix represents a confusion matrix. Labels contains the names
// of all the catalog categories (sorted by ID) followed by none. Counts[i][j]
// is the number of rows labelled Labels[i] predicted as Labels[j], where the
// none column holds the rows that got no prediction.
type ConfusionMatrix struct {
	Labels []string `json:"labels"`
	Counts [][]int  `json:"counts"`
}

// AlgorithmMetrics represents the evaluation results of an algorithm.
type AlgorithmMetrics struct {
	// Algorithm represents the name of the algorithm.
	Algorithm string `json:"algorithm"`

	// Selected indicates whether the algorithm was the one selected.
	Selected bool `json:"selected"`

	// Threshold represents the threshold tuned on all out-of-fold scores.
	Threshold float64 `json:"threshold"`

	// CategoryThresholds represents the thresholds of the categories that use
	// their own threshold, tuned on all out-of-fold scores.
	CategoryThresholds map[string]float64 `json:"category_thresholds"`

	// Precision represents the cross-fitted precision.
	Precision float64 `json:"precision"`

	// Coverage represents the cross-fitted coverage.
	Coverage float64 `json:"coverage"`

	// SuppressedCategories represents the categories suppressed.
	SuppressedCategories []string `json:"suppressed_categories"`

	// Error represents the error that made the algorithm's evaluation fail,
	// if any.
	Error string `json:"error,omitempty"`
}

// RowCounts represents the number of rows of a training set.
type RowCounts struct {
	// RawLLM represents the number of LLM labelled rows provided.
	RawLLM int `json:"raw_llm"`

	// RawPublisher represents the number of publisher labelled rows provided.
	RawPublisher int `json:"raw_publisher"`

	// Excluded represents the number of LLM rows excluded because they were
	// flagged as suspicious, needed review or had low confidence.
	Excluded int `json:"excluded"`

	// UnknownCategory represents the number of publisher rows skipped
	// because their category isn't in the catalog.
	UnknownCategory int `json:"unknown_category"`

	// Conflicts represents the number of content groups dropped because
	// their labels were tied.
	Conflicts int `json:"conflicts"`

	// Deduplicated represents the number of rows in the training set (one
	// per content key).
	Deduplicated int `json:"deduplicated"`

	// LLM represents the number of training set rows labelled with a
	// category by the LLM.
	LLM int `json:"llm"`

	// Publisher represents the number of training set rows labelled by
	// publishers.
	Publisher int `json:"publisher"`

	// None represents the number of training set rows labelled as none.
	None int `json:"none"`
}

// computeSummary computes the summary metrics of the rows provided, which
// can be filtered using the include function (nil includes all rows).
func computeSummary(rows []scoredRow, preds []string, include func(r *scoredRow) bool) Summary {
	var s Summary
	var covered, noneFalsePositives int
	for i := range rows {
		r := &rows[i]
		if include != nil && !include(r) {
			continue
		}
		s.Rows++
		isNone := r.label == catalog.None
		if isNone {
			s.NoneRows++
		} else {
			s.LabelledRows++
		}
		if preds[i] == "" {
			continue
		}
		s.Predictions++
		switch {
		case isNone:
			noneFalsePositives++
		case preds[i] == r.label:
			s.CorrectPredictions++
			covered++
		default:
			covered++
		}
	}
	s.Precision = ratio(s.CorrectPredictions, s.Predictions)
	s.Coverage = ratio(covered, s.LabelledRows)
	s.NoneFalsePositiveRate = ratio(noneFalsePositives, s.NoneRows)
	return s
}

// computeCategoriesMetrics computes the metrics of each of the catalog
// categories for the rows and predictions provided.
func computeCategoriesMetrics(rows []scoredRow, preds []string) []CategoryMetrics {
	categories := catalog.All()
	index := make(map[string]int, len(categories))
	metrics := make([]CategoryMetrics, len(categories))
	for i, c := range categories {
		index[c.Name] = i
		metrics[i].Name = c.Name
	}
	for i := range rows {
		if j, ok := index[rows[i].label]; ok {
			metrics[j].Support++
		}
		if j, ok := index[preds[i]]; ok {
			metrics[j].Predictions++
			if preds[i] == rows[i].label {
				metrics[j].CorrectPredictions++
			}
		}
	}
	for i := range metrics {
		metrics[i].Precision = ratio(metrics[i].CorrectPredictions, metrics[i].Predictions)
		metrics[i].Recall = ratio(metrics[i].CorrectPredictions, metrics[i].Support)
	}
	return metrics
}

// computeConfusionMatrix computes the confusion matrix for the rows and
// predictions provided.
func computeConfusionMatrix(rows []scoredRow, preds []string) ConfusionMatrix {
	labels := append(catalog.Names(), catalog.None)
	index := make(map[string]int, len(labels))
	for i, l := range labels {
		index[l] = i
	}
	noneIndex := len(labels) - 1
	counts := make([][]int, len(labels))
	for i := range counts {
		counts[i] = make([]int, len(labels))
	}
	for i := range rows {
		actual, ok := index[rows[i].label]
		if !ok {
			continue
		}
		predicted := noneIndex
		if preds[i] != "" {
			predicted = index[preds[i]]
		}
		counts[actual][predicted]++
	}
	return ConfusionMatrix{Labels: labels, Counts: counts}
}

// ratio returns n/d, or 0 when d is 0.
func ratio(n, d int) float64 {
	if d == 0 {
		return 0
	}
	return float64(n) / float64(d)
}
