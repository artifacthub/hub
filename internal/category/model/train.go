package model

import (
	"cmp"
	"crypto/sha256"
	"encoding/binary"
	"errors"
	"fmt"
	"slices"
	"strings"

	"github.com/artifacthub/hub/internal/category/catalog"
)

// Default training configuration values.
const (
	// DefaultTargetPrecision represents the precision the thresholds are
	// tuned for. The cross-fitted precision usually lands slightly below it,
	// so it's set a bit above the minimum precision expected from a model.
	DefaultTargetPrecision = 0.86

	// DefaultMinThresholdPredictions represents the minimum number of
	// predictions above a threshold for its precision to be checked against
	// the target while tuning it. This prevents a few wrong labels among the
	// most confident predictions from making the target unreachable.
	DefaultMinThresholdPredictions = 30

	// DefaultMinCategoryExamples represents the minimum number of effective
	// examples (sum of weights) a category needs to be part of a model.
	DefaultMinCategoryExamples = 20

	// DefaultMinCategoryPredictions represents the minimum number of
	// cross-fitted predictions a category needs for its precision to be
	// checked against the per-category floor.
	DefaultMinCategoryPredictions = 10

	// DefaultMinCategoryPrecision represents the per-category precision
	// floor. Categories below it get their own threshold, tuned to reach the
	// target precision, and they are suppressed when it can't be reached.
	DefaultMinCategoryPrecision = 0.70

	// DefaultMinPublisherRows represents the minimum number of publisher rows
	// needed to report publisher metrics.
	DefaultMinPublisherRows = 200

	// DefaultFolds represents the number of cross-validation folds.
	DefaultFolds = 5

	// DefaultMinDocumentFrequency represents the minimum number of training
	// rows a feature must appear in to be part of the vocabulary.
	DefaultMinDocumentFrequency = 2

	// DefaultMaxVocabularySize represents the maximum number of features in
	// the vocabulary (the most frequent ones are kept).
	DefaultMaxVocabularySize = 50000

	// DefaultCNBAlpha represents the Complement Naive Bayes Laplace
	// smoothing parameter.
	DefaultCNBAlpha = 0.5

	// DefaultLREpochs represents the number of logistic regression training
	// epochs.
	DefaultLREpochs = 30

	// DefaultLRBatchSize represents the logistic regression mini-batch size.
	DefaultLRBatchSize = 32

	// DefaultLRLearningRate represents the logistic regression initial
	// learning rate.
	DefaultLRLearningRate = 0.5

	// DefaultLRL2 represents the logistic regression L2 regularization
	// strength.
	DefaultLRL2 = 1e-4

	// DefaultSeed represents the seed of the random numbers generator used
	// to shuffle the logistic regression training rows.
	DefaultSeed = 1
)

// Rows sources.
const (
	// SourceLLM represents rows labelled by an LLM.
	SourceLLM = "llm"

	// SourcePublisher represents rows labelled by the package publisher.
	SourcePublisher = "publisher"
)

var (
	// ErrInvalidInput indicates that the training input is not valid.
	ErrInvalidInput = errors.New("invalid training input")

	// ErrNotEnoughData indicates that there are fewer than two categories
	// with enough examples to train a model.
	ErrNotEnoughData = errors.New("not enough training data")
)

// Config represents the training configuration.
type Config struct {
	TargetPrecision         float64
	MinThresholdPredictions int
	MinCategoryExamples     float64
	MinCategoryPredictions  int
	MinCategoryPrecision    float64
	MinPublisherRows        int
	Folds                   int
	MinDocumentFrequency    int
	MaxVocabularySize       int
	CNBAlpha                float64
	LREpochs                int
	LRBatchSize             int
	LRLearningRate          float64
	LRL2                    float64
	Seed                    uint64
}

// DefaultConfig returns the default training configuration.
func DefaultConfig() Config {
	return Config{
		TargetPrecision:         DefaultTargetPrecision,
		MinThresholdPredictions: DefaultMinThresholdPredictions,
		MinCategoryExamples:     DefaultMinCategoryExamples,
		MinCategoryPredictions:  DefaultMinCategoryPredictions,
		MinCategoryPrecision:    DefaultMinCategoryPrecision,
		MinPublisherRows:        DefaultMinPublisherRows,
		Folds:                   DefaultFolds,
		MinDocumentFrequency:    DefaultMinDocumentFrequency,
		MaxVocabularySize:       DefaultMaxVocabularySize,
		CNBAlpha:                DefaultCNBAlpha,
		LREpochs:                DefaultLREpochs,
		LRBatchSize:             DefaultLRBatchSize,
		LRLearningRate:          DefaultLRLearningRate,
		LRL2:                    DefaultLRL2,
		Seed:                    DefaultSeed,
	}
}

// validate checks that the configuration is valid.
func (cfg *Config) validate() error {
	switch {
	case cfg.TargetPrecision <= 0 || cfg.TargetPrecision > 1:
		return errors.New("target precision must be in (0, 1]")
	case cfg.MinThresholdPredictions < 1:
		return errors.New("min threshold predictions must be positive")
	case cfg.MinCategoryExamples <= 0:
		return errors.New("min category examples must be positive")
	case cfg.MinCategoryPredictions < 1:
		return errors.New("min category predictions must be positive")
	case cfg.MinCategoryPrecision < 0 || cfg.MinCategoryPrecision > 1:
		return errors.New("min category precision must be in [0, 1]")
	case cfg.MinPublisherRows < 1:
		return errors.New("min publisher rows must be positive")
	case cfg.Folds < 2:
		return errors.New("folds must be at least 2")
	case cfg.MinDocumentFrequency < 1:
		return errors.New("min document frequency must be positive")
	case cfg.MaxVocabularySize < 1:
		return errors.New("max vocabulary size must be positive")
	case cfg.CNBAlpha <= 0:
		return errors.New("cnb alpha must be positive")
	case cfg.LREpochs < 1:
		return errors.New("lr epochs must be positive")
	case cfg.LRBatchSize < 1:
		return errors.New("lr batch size must be positive")
	case cfg.LRLearningRate <= 0:
		return errors.New("lr learning rate must be positive")
	case cfg.LRL2 < 0:
		return errors.New("lr l2 must not be negative")
	}
	return nil
}

// Row represents a training row.
type Row struct {
	// Input represents the model inputs of the row's package.
	Input Input

	// Label represents the row's label: a catalog category name or none.
	Label string

	// Weight represents the weight of the row in training (it doesn't
	// affect the evaluation metrics). It must be positive.
	Weight float64

	// Source represents who labelled the row (SourceLLM or SourcePublisher).
	Source string

	// Repository represents the name of the row's representative repository.
	// Rows of the same repository always land in the same fold.
	Repository string
}

// TrainInput represents the input of the training.
type TrainInput struct {
	// Rows represents the training set rows, with one row per content key.
	Rows []Row

	// DatasetDigest represents the digest of the embedded release dataset the
	// model derives from. It's stored in the model as is.
	DatasetDigest string

	// TrainingSetDigest represents the digest of the training set rows.
	TrainingSetDigest string

	// RowCounts represents the number of rows of the training set, recorded
	// in the model metrics.
	RowCounts RowCounts
}

// algorithm represents a training algorithm.
type algorithm struct {
	name string
	fit  func(d *fitData, cfg *Config) *linear
}

// algorithms represents the training algorithms available, in order of
// preference when their results are tied.
var algorithms = []algorithm{
	{name: AlgorithmComplementNB, fit: fitComplementNB},
	{name: AlgorithmLogisticRegression, fit: fitLogisticRegression},
}

// preparedRow represents a training row with its features extracted.
type preparedRow struct {
	Row
	contentKey string
	features   []string
	fold       int
}

// Train trains a model using the training input and configuration provided.
//
// Both algorithms are evaluated with grouped cross-validation (rows are
// assigned to folds by hashing their repository), the confidence threshold
// is tuned on their out-of-fold scores to reach the target precision, and
// cross-fitted metrics are computed (each fold is predicted using the
// threshold tuned on the other folds). Categories with a precision below the
// per-category floor get their own threshold, tuned to reach the target
// precision on their predictions, and they are suppressed when it can't be
// reached (see evaluate for details). The algorithm with the highest
// cross-fitted coverage is selected, and the final model is trained on all
// the rows using the thresholds tuned on all the out-of-fold scores. Note that
// those scores come from models trained on a fraction of the rows, so the
// final model's precision may drift slightly.
//
// When no algorithm reaches the target precision, an error wrapping
// ErrTargetPrecisionUnreachable is returned. Training is deterministic: the
// same input produces the same model on the same architecture.
func Train(in *TrainInput, cfg Config) (*Model, error) {
	// Validate input
	if err := cfg.validate(); err != nil {
		return nil, fmt.Errorf("%w: %w", ErrInvalidInput, err)
	}
	if in.DatasetDigest == "" {
		return nil, fmt.Errorf("%w: dataset digest not provided", ErrInvalidInput)
	}
	if in.TrainingSetDigest == "" {
		return nil, fmt.Errorf("%w: training set digest not provided", ErrInvalidInput)
	}
	rows, err := prepareRows(in.Rows, cfg.Folds)
	if err != nil {
		return nil, err
	}

	// Prepare the data of each fold and of all the rows
	all := newFitData(rows, nil, &cfg)
	if all == nil {
		return nil, fmt.Errorf("%w: fewer than two categories with %v examples", ErrNotEnoughData, cfg.MinCategoryExamples)
	}
	folds := make([]*fitData, cfg.Folds)
	for k := range cfg.Folds {
		folds[k] = newFitData(rows, func(r *preparedRow) bool { return r.fold != k }, &cfg)
	}

	// Evaluate algorithms
	var (
		best        = -1
		evaluations = make([]*evaluation, len(algorithms))
		summaries   = make([]AlgorithmMetrics, len(algorithms))
		errs        = make([]error, 0, len(algorithms))
	)
	for i, alg := range algorithms {
		summaries[i] = AlgorithmMetrics{
			Algorithm:            alg.name,
			CategoryThresholds:   map[string]float64{},
			SuppressedCategories: []string{},
		}
		e, err := evaluate(outOfFoldScores(rows, folds, alg, &cfg), all.categories, &cfg)
		if err != nil {
			summaries[i].Error = err.Error()
			errs = append(errs, fmt.Errorf("%s: %w", alg.name, err))
			continue
		}
		evaluations[i] = e
		summaries[i].Threshold = e.threshold
		summaries[i].CategoryThresholds = e.categoryThresholds
		summaries[i].Precision = e.summary.Precision
		summaries[i].Coverage = e.summary.Coverage
		summaries[i].SuppressedCategories = e.suppressed
		if best < 0 || isBetter(e, evaluations[best]) {
			best = i
		}
	}
	if best < 0 {
		return nil, errors.Join(errs...)
	}
	summaries[best].Selected = true
	e := evaluations[best]

	// Train the final model on all the rows
	params := algorithms[best].fit(all, &cfg)
	m := &Model{
		FormatVersion:        FormatVersion,
		FeaturesVersion:      FeaturesVersion,
		Algorithm:            algorithms[best].name,
		Categories:           all.categories,
		SuppressedCategories: e.suppressed,
		Vocabulary:           all.vocabulary,
		Weights:              params.weights,
		Bias:                 params.bias,
		Threshold:            e.threshold,
		CategoryThresholds:   e.categoryThresholds,
		DatasetDigest:        in.DatasetDigest,
		CatalogDigest:        catalog.ModelDigest(),
		TrainingSetDigest:    in.TrainingSetDigest,
		Metrics: Metrics{
			Summary:               e.summary,
			Categories:            e.categories,
			SuppressedCategories:  e.suppressed,
			LowEvidenceCategories: e.lowEvidence,
			ExcludedCategories:    excludedCategories(all.categories),
			ConfusionMatrix:       e.confusionMatrix,
			Publisher:             e.publisher,
			RowCounts:             in.RowCounts,
			Algorithms:            summaries,
		},
	}
	if err := m.validate(); err != nil {
		return nil, err
	}
	return m, nil
}

// isBetter checks if evaluation a is better than evaluation b: it has a
// higher cross-fitted coverage or, when tied, a higher precision.
func isBetter(a, b *evaluation) bool {
	if a.summary.Coverage != b.summary.Coverage {
		return a.summary.Coverage > b.summary.Coverage
	}
	return a.summary.Precision > b.summary.Precision
}

// outOfFoldScores returns the out-of-fold scores of the rows provided: each
// row is scored by the model trained (using the algorithm provided) on the
// rows of the other folds.
func outOfFoldScores(rows []*preparedRow, folds []*fitData, alg algorithm, cfg *Config) []scoredRow {
	scores := make([]scoredRow, len(rows))
	params := make([]*linear, len(folds))
	for k, d := range folds {
		if d != nil {
			params[k] = alg.fit(d, cfg)
		}
	}
	for i, r := range rows {
		scores[i] = scoredRow{
			label:     r.Label,
			publisher: r.Source == SourcePublisher,
			fold:      r.fold,
		}
		d, p := folds[r.fold], params[r.fold]
		if d == nil || p == nil {
			continue
		}
		top, confidence := score(p.weights, p.bias, len(d.vocabulary), d.indexes(r.features))
		if top >= 0 {
			scores[i].top = d.categories[top]
			scores[i].confidence = confidence
		}
	}
	return scores
}

// prepareRows validates the rows provided and extracts their features. The
// rows returned are sorted by content key (so that the training doesn't
// depend on the input order) and assigned to a fold.
func prepareRows(rows []Row, numFolds int) ([]*preparedRow, error) {
	prepared := make([]*preparedRow, 0, len(rows))
	for i, r := range rows {
		invalid := func(format string, a ...any) error {
			return fmt.Errorf("%w: row %d: %s", ErrInvalidInput, i, fmt.Sprintf(format, a...))
		}
		if _, ok := catalog.ByName(r.Label); !ok && r.Label != catalog.None {
			return nil, invalid("invalid label %q", r.Label)
		}
		if !isFinite(r.Weight) || r.Weight <= 0 {
			return nil, invalid("weight must be positive")
		}
		if r.Source != SourceLLM && r.Source != SourcePublisher {
			return nil, invalid("invalid source %q", r.Source)
		}
		if r.Repository == "" {
			return nil, invalid("repository not provided")
		}
		prepared = append(prepared, &preparedRow{
			Row:        r,
			contentKey: ContentKey(r.Input.Name, r.Input.Keywords, r.Input.Description),
			features:   Features(r.Input),
			fold:       foldOf(r.Repository, numFolds),
		})
	}
	slices.SortStableFunc(prepared, func(a, b *preparedRow) int {
		return cmp.Or(
			strings.Compare(a.contentKey, b.contentKey),
			strings.Compare(a.Label, b.Label),
			strings.Compare(a.Source, b.Source),
			strings.Compare(a.Repository, b.Repository),
			cmp.Compare(a.Weight, b.Weight),
		)
	})
	return prepared, nil
}

// foldOf returns the cross-validation fold of the repository provided.
func foldOf(repository string, numFolds int) int {
	sum := sha256.Sum256([]byte(repository))
	return int(binary.BigEndian.Uint64(sum[:8]) % uint64(numFolds)) // #nosec G115 -- result is < numFolds
}
