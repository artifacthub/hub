package model

import (
	"math"
)

// fitComplementNB fits a Complement Naive Bayes model (Rennie et al., 2003)
// using binary features, Laplace smoothing and weight normalization.
//
// The weight of feature i for category c derives from the smoothed
// probability of the feature in the rows of all the other categories (the
// complement): w[c][i] = -log((N[¬c][i] + α) / (N[¬c] + α·V)). Each
// category's weights are then normalized so that their mean absolute value
// is 1, which keeps the softmax of the scores in a useful range. Those
// confidences are only used to rank and threshold predictions; they are not
// calibrated probabilities.
func fitComplementNB(d *fitData, cfg *Config) *linear {
	numCategories, numFeatures := len(d.categories), len(d.vocabulary)

	// Count the weighted occurrences of each feature in each category
	counts := make([][]float64, numCategories)
	for c := range counts {
		counts[c] = make([]float64, numFeatures)
	}
	totals := make([]float64, numFeatures)
	for n, idx := range d.x {
		c, sw := d.y[n], d.sw[n]
		for _, i := range idx {
			counts[c][i] += sw
			totals[i] += sw
		}
	}

	// Compute normalized complement weights
	p := &linear{
		weights: make([][]float32, numCategories),
		bias:    make([]float32, numCategories),
	}
	complement := make([]float64, numFeatures)
	for c := range numCategories {
		var complementTotal float64
		for i := range numFeatures {
			complement[i] = max(totals[i]-counts[c][i], 0)
			complementTotal += complement[i]
		}
		logs := make([]float64, numFeatures)
		var sumAbs float64
		for i := range numFeatures {
			logs[i] = math.Log((complement[i] + cfg.CNBAlpha) / (complementTotal + cfg.CNBAlpha*float64(numFeatures)))
			sumAbs += math.Abs(logs[i])
		}
		p.weights[c] = make([]float32, numFeatures)
		if sumAbs == 0 {
			continue
		}
		meanAbs := sumAbs / float64(numFeatures)
		for i := range numFeatures {
			p.weights[c][i] = float32(-logs[i] / meanAbs)
		}
	}

	return p
}
