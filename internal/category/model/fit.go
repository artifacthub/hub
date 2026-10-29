package model

import (
	"cmp"
	"slices"
	"strings"

	"github.com/artifacthub/hub/internal/category/catalog"
)

// fitData represents the data used to fit a model's parameters.
type fitData struct {
	// categories represents the names of the categories of the model, sorted
	// by category ID.
	categories []string

	// vocabulary represents the features of the model, sorted.
	vocabulary []string

	// vocabularyIndex represents the index of each vocabulary feature.
	vocabularyIndex map[string]int

	// x represents the vocabulary indexes of the features of each row.
	x [][]int

	// y represents the category index of each row.
	y []int

	// sw represents the sample weight of each row: the row weight multiplied
	// by its category weight (inversely proportional to the category's
	// frequency).
	sw []float64
}

// linear represents the parameters of a linear model: the score of a
// category is its bias plus the sum of the weights of the features present.
type linear struct {
	weights [][]float32
	bias    []float32
}

// newFitData prepares the data to fit a model using the rows provided, which
// can be filtered using the include function (nil includes all rows).
//
// Rows labelled as none are not used to fit the model (they are only used in
// the evaluation). Categories whose effective number of examples (the sum of
// their rows' weights) is below the minimum are excluded, and so are their
// rows. When fewer than two categories are left, nil is returned.
func newFitData(rows []*preparedRow, include func(r *preparedRow) bool, cfg *Config) *fitData {
	// Select categories with enough effective examples
	effective := make(map[string]float64)
	for _, r := range rows {
		if include == nil || include(r) {
			effective[r.Label] += r.Weight
		}
	}
	var categories []string
	for _, name := range catalog.Names() {
		if effective[name] >= cfg.MinCategoryExamples {
			categories = append(categories, name)
		}
	}
	if len(categories) < 2 {
		return nil
	}

	// Select training rows
	training := make([]*preparedRow, 0, len(rows))
	for _, r := range rows {
		if (include == nil || include(r)) && slices.Contains(categories, r.Label) {
			training = append(training, r)
		}
	}

	// Build vocabulary
	df := make(map[string]int)
	for _, r := range training {
		for _, f := range r.features {
			df[f]++
		}
	}
	vocabulary := make([]string, 0, len(df))
	for f, n := range df {
		if n >= cfg.MinDocumentFrequency {
			vocabulary = append(vocabulary, f)
		}
	}
	if len(vocabulary) > cfg.MaxVocabularySize {
		slices.SortFunc(vocabulary, func(a, b string) int {
			return cmp.Or(cmp.Compare(df[b], df[a]), strings.Compare(a, b))
		})
		vocabulary = vocabulary[:cfg.MaxVocabularySize]
	}
	slices.Sort(vocabulary)
	d := &fitData{
		categories:      categories,
		vocabulary:      vocabulary,
		vocabularyIndex: make(map[string]int, len(vocabulary)),
	}
	for i, f := range vocabulary {
		d.vocabularyIndex[f] = i
	}

	// Prepare rows features, categories and sample weights
	categoryWeights := make([]float64, len(categories))
	var total float64
	for i, name := range categories {
		total += effective[name]
		categoryWeights[i] = effective[name]
	}
	for i := range categoryWeights {
		categoryWeights[i] = total / (float64(len(categories)) * categoryWeights[i])
	}
	d.x = make([][]int, len(training))
	d.y = make([]int, len(training))
	d.sw = make([]float64, len(training))
	for i, r := range training {
		c := slices.Index(categories, r.Label)
		d.x[i] = d.indexes(r.features)
		d.y[i] = c
		d.sw[i] = r.Weight * categoryWeights[c]
	}

	return d
}

// indexes returns the vocabulary indexes of the features provided that are
// part of the vocabulary, in ascending order.
func (d *fitData) indexes(features []string) []int {
	idx := make([]int, 0, len(features))
	for _, f := range features {
		if i, ok := d.vocabularyIndex[f]; ok {
			idx = append(idx, i)
		}
	}
	return idx
}
