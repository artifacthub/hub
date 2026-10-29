package model

import (
	"math"
	"math/rand/v2"
)

// minLRScale represents the minimum value of the logistic regression weights
// scale factor before it's folded into the weights.
const minLRScale = 1e-6

// fitLogisticRegression fits a softmax (multinomial) logistic regression
// model using mini-batch stochastic gradient descent with L2 regularization
// on sparse binary features.
//
// Rows are shuffled deterministically on each epoch using a seeded random
// numbers generator, and the learning rate decays with the square root of
// the epoch number. The L2 weight decay is applied lazily through a scale
// factor shared by all the weights, so that each step only updates the
// weights of the features present in the batch.
func fitLogisticRegression(d *fitData, cfg *Config) *linear {
	numCategories, numFeatures, numRows := len(d.categories), len(d.vocabulary), len(d.x)

	// Weights are stored by feature ([feature*numCategories+category]) to
	// keep the weights updated together close in memory. The actual weights
	// are the stored ones multiplied by scale.
	w := make([]float64, numFeatures*numCategories)
	b := make([]float64, numCategories)
	scale := 1.0

	rng := rand.New(rand.NewPCG(cfg.Seed, cfg.Seed)) // #nosec G404 -- deterministic shuffling, not security sensitive
	order := make([]int, numRows)
	for i := range order {
		order[i] = i
	}
	scores := make([]float64, numCategories)
	grads := make([]float64, cfg.LRBatchSize*numCategories)

	for epoch := range cfg.LREpochs {
		lr := cfg.LRLearningRate / math.Sqrt(float64(epoch+1))
		rng.Shuffle(numRows, func(i, j int) { order[i], order[j] = order[j], order[i] })

		for start := 0; start < numRows; start += cfg.LRBatchSize {
			batch := order[start:min(start+cfg.LRBatchSize, numRows)]

			// Compute the gradients of the batch rows with the current weights
			for j, n := range batch {
				for c := range numCategories {
					s := 0.0
					for _, i := range d.x[n] {
						s += w[i*numCategories+c]
					}
					scores[c] = b[c] + scale*s
				}
				softmax(scores)
				for c := range numCategories {
					g := scores[c]
					if c == d.y[n] {
						g--
					}
					grads[j*numCategories+c] = g * d.sw[n]
				}
			}

			// Apply weight decay and gradients
			step := lr / float64(len(batch))
			scale *= 1 - lr*cfg.LRL2
			for j, n := range batch {
				for c := range numCategories {
					g := grads[j*numCategories+c]
					b[c] -= step * g
					for _, i := range d.x[n] {
						w[i*numCategories+c] -= step * g / scale
					}
				}
			}
			if scale < minLRScale {
				for i := range w {
					w[i] *= scale
				}
				scale = 1
			}
		}
	}

	// Build parameters
	p := &linear{
		weights: make([][]float32, numCategories),
		bias:    make([]float32, numCategories),
	}
	for c := range numCategories {
		p.weights[c] = make([]float32, numFeatures)
		for i := range numFeatures {
			p.weights[c][i] = float32(scale * w[i*numCategories+c])
		}
		p.bias[c] = float32(b[c])
	}
	return p
}

// softmax replaces the scores provided by their softmax.
func softmax(scores []float64) {
	maxScore := math.Inf(-1)
	for _, s := range scores {
		maxScore = max(maxScore, s)
	}
	var sum float64
	for i, s := range scores {
		scores[i] = math.Exp(s - maxScore)
		sum += scores[i]
	}
	for i := range scores {
		scores[i] /= sum
	}
}
