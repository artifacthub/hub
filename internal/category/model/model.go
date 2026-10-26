// Package model implements the packages category classification model: the
// features extraction, the training algorithms (Complement Naive Bayes and
// softmax logistic regression), their evaluation and the model JSON format.
//
// This package doesn't access the database and must not import internal/hub.
package model

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"math"
	"slices"

	"github.com/artifacthub/hub/internal/category/catalog"
)

const (
	// FormatVersion represents the version of the model JSON format. It must
	// be bumped whenever the format changes, so that model files written in
	// a different format are rejected instead of misread.
	FormatVersion = 1

	// AlgorithmComplementNB represents the Complement Naive Bayes algorithm.
	AlgorithmComplementNB = "complement-nb"

	// AlgorithmLogisticRegression represents the softmax logistic regression
	// algorithm.
	AlgorithmLogisticRegression = "logistic-regression"
)

// ErrInvalidModel indicates that the model provided is not valid.
var ErrInvalidModel = errors.New("invalid model")

// Model represents a package category classification model. Models are
// immutable once built, so they are safe for concurrent use.
type Model struct {
	// FormatVersion represents the version of the model JSON format.
	FormatVersion int `json:"format_version"`

	// FeaturesVersion represents the version of the features extraction used
	// to build the model.
	FeaturesVersion int `json:"features_version"`

	// Algorithm represents the algorithm used to build the model.
	Algorithm string `json:"algorithm"`

	// Categories represents the names of the categories the model can
	// predict, sorted by category ID.
	Categories []string `json:"categories"`

	// SuppressedCategories represents the names of the categories whose
	// predictions are not used (they return unknown).
	SuppressedCategories []string `json:"suppressed_categories"`

	// Vocabulary represents the features known by the model, sorted.
	Vocabulary []string `json:"vocabulary"`

	// Weights represents the weights of each feature of the vocabulary for
	// each of the categories ([category][feature]).
	Weights [][]float32 `json:"weights"`

	// Bias represents the bias of each of the categories.
	Bias []float32 `json:"bias"`

	// Threshold represents the minimum confidence a prediction must have to
	// be used, shared by the categories without their own threshold.
	Threshold float64 `json:"threshold"`

	// CategoryThresholds represents the thresholds of the categories that use
	// their own threshold instead of the shared one, because their precision
	// with it was below the per-category floor.
	CategoryThresholds map[string]float64 `json:"category_thresholds"`

	// DatasetDigest represents the digest of the embedded release dataset the
	// model derives from.
	DatasetDigest string `json:"dataset_digest"`

	// CatalogDigest represents the catalog model digest of the categories
	// used to build the model.
	CatalogDigest string `json:"catalog_digest"`

	// TrainingSetDigest represents the digest of the training set used to
	// build the model.
	TrainingSetDigest string `json:"training_set_digest"`

	// Metrics represents the cross-fitted evaluation metrics of the model.
	Metrics Metrics `json:"metrics"`
}

// Unmarshal parses and validates the model JSON provided. Unknown fields are
// not allowed.
func Unmarshal(data []byte) (*Model, error) {
	var m Model
	dec := json.NewDecoder(bytes.NewReader(data))
	dec.DisallowUnknownFields()
	if err := dec.Decode(&m); err != nil {
		return nil, fmt.Errorf("%w: %w", ErrInvalidModel, err)
	}
	if _, err := dec.Token(); !errors.Is(err, io.EOF) {
		return nil, fmt.Errorf("%w: unexpected data after model", ErrInvalidModel)
	}
	if err := m.validate(); err != nil {
		return nil, err
	}
	return &m, nil
}

// Marshal returns the JSON encoding of the model.
func (m *Model) Marshal() ([]byte, error) {
	return json.Marshal(m)
}

// Predict returns the name of the category predicted for the input provided
// and its confidence. An empty name is returned when the input has no known
// features, when the confidence is below the threshold of the category
// predicted or when it is suppressed. Predict never panics.
func (m *Model) Predict(in Input) (string, float64) {
	if m == nil {
		return "", 0
	}

	// Get the vocabulary indexes of the input features
	features := Features(in)
	idx := make([]int, 0, len(features))
	for _, f := range features {
		if i, ok := slices.BinarySearch(m.Vocabulary, f); ok {
			idx = append(idx, i)
		}
	}

	// Score categories and apply threshold and suppressed categories
	top, confidence := score(m.Weights, m.Bias, len(m.Vocabulary), idx)
	if top < 0 || top >= len(m.Categories) {
		return "", 0
	}
	category := m.Categories[top]
	threshold := m.Threshold
	if t, ok := m.CategoryThresholds[category]; ok {
		threshold = t
	}
	if confidence < threshold || slices.Contains(m.SuppressedCategories, category) {
		return "", confidence
	}
	return category, confidence
}

// validate checks that the model is valid.
func (m *Model) validate() error {
	invalid := func(format string, a ...any) error {
		return fmt.Errorf("%w: %s", ErrInvalidModel, fmt.Sprintf(format, a...))
	}

	if m.FormatVersion != FormatVersion {
		return invalid("format version %d (supported: %d)", m.FormatVersion, FormatVersion)
	}
	if m.FeaturesVersion != FeaturesVersion {
		return invalid("features version %d (supported: %d)", m.FeaturesVersion, FeaturesVersion)
	}
	switch m.Algorithm {
	case AlgorithmComplementNB, AlgorithmLogisticRegression:
	default:
		return invalid("unknown algorithm %q", m.Algorithm)
	}

	// Categories
	if len(m.Categories) == 0 {
		return invalid("no categories")
	}
	for i, name := range m.Categories {
		if _, ok := catalog.ByName(name); !ok {
			return invalid("unknown category %q", name)
		}
		if slices.Contains(m.Categories[:i], name) {
			return invalid("duplicate category %q", name)
		}
	}
	for i, name := range m.SuppressedCategories {
		if !slices.Contains(m.Categories, name) {
			return invalid("suppressed category %q is not a model category", name)
		}
		if slices.Contains(m.SuppressedCategories[:i], name) {
			return invalid("duplicate suppressed category %q", name)
		}
	}

	// Vocabulary
	for i, f := range m.Vocabulary {
		if f == "" {
			return invalid("empty vocabulary feature")
		}
		if i > 0 && m.Vocabulary[i-1] >= f {
			return invalid("vocabulary not sorted or with duplicates (%q)", f)
		}
	}

	// Parameters
	if len(m.Weights) != len(m.Categories) {
		return invalid("weights rows (%d) don't match categories (%d)", len(m.Weights), len(m.Categories))
	}
	for i, row := range m.Weights {
		if len(row) != len(m.Vocabulary) {
			return invalid("weights row %d length (%d) doesn't match vocabulary (%d)", i, len(row), len(m.Vocabulary))
		}
		for _, w := range row {
			if !isFinite(float64(w)) {
				return invalid("weights contain non-finite values")
			}
		}
	}
	if len(m.Bias) != len(m.Categories) {
		return invalid("bias length (%d) doesn't match categories (%d)", len(m.Bias), len(m.Categories))
	}
	for _, b := range m.Bias {
		if !isFinite(float64(b)) {
			return invalid("bias contains non-finite values")
		}
	}
	if !isFinite(m.Threshold) || m.Threshold < 0 || m.Threshold > 1 {
		return invalid("threshold must be between 0 and 1")
	}
	for name, t := range m.CategoryThresholds {
		if !slices.Contains(m.Categories, name) {
			return invalid("threshold category %q is not a model category", name)
		}
		if slices.Contains(m.SuppressedCategories, name) {
			return invalid("threshold category %q is suppressed", name)
		}
		if !isFinite(t) || t < 0 || t > 1 {
			return invalid("threshold of category %q must be between 0 and 1", name)
		}
	}

	// Digests
	if m.DatasetDigest == "" {
		return invalid("dataset digest not provided")
	}
	if m.CatalogDigest == "" {
		return invalid("catalog digest not provided")
	}
	if m.TrainingSetDigest == "" {
		return invalid("training set digest not provided")
	}

	return nil
}

// score returns the index of the top category for the features provided
// (vocabulary indexes) and its softmax confidence. It returns -1 when there
// are no features or the parameters are not consistent.
func score(weights [][]float32, bias []float32, vocabularySize int, idx []int) (int, float64) {
	if len(idx) == 0 || len(weights) == 0 || len(weights) != len(bias) {
		return -1, 0
	}
	scores := make([]float64, len(weights))
	for c, row := range weights {
		if len(row) != vocabularySize {
			return -1, 0
		}
		s := float64(bias[c])
		for _, i := range idx {
			if i < 0 || i >= len(row) {
				return -1, 0
			}
			s += float64(row[i])
		}
		scores[c] = s
	}
	top := 0
	for c := 1; c < len(scores); c++ {
		if scores[c] > scores[top] {
			top = c
		}
	}
	var sum float64
	for _, s := range scores {
		sum += math.Exp(s - scores[top])
	}
	confidence := 1 / sum
	if !isFinite(confidence) {
		return -1, 0
	}
	return top, confidence
}

// isFinite checks if the value provided is not NaN or infinite.
func isFinite(v float64) bool {
	return !math.IsNaN(v) && !math.IsInf(v, 0)
}
