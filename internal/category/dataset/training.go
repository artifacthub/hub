package dataset

import (
	"bytes"
	"cmp"
	"encoding/json"
	"fmt"
	"slices"
	"strings"

	"github.com/artifacthub/hub/internal/category/catalog"
	"github.com/artifacthub/hub/internal/category/model"
)

// RepositoryCap represents the maximum number of effective samples a
// repository contributes to the training set per label. When a repository
// has more rows with a given label, their weights are reduced accordingly.
const RepositoryCap = 25

// TrainingSet represents a training set built from the LLM labelled dataset
// rows and the publisher labelled packages.
type TrainingSet struct {
	// Rows represents the training set rows, one per content key, sorted by
	// content key.
	Rows []model.Row

	// Digest represents the digest of the canonical form of the training set.
	Digest string

	// Counts represents the number of rows of the training set.
	Counts model.RowCounts

	// UnknownCategories represents the IDs of the publisher rows categories
	// that are not in the catalog (sorted). Those rows were skipped.
	UnknownCategories []int
}

// TrainInput returns the model training input for the training set, using
// the dataset digest provided (the digest of the embedded release dataset).
func (ts *TrainingSet) TrainInput(datasetDigest string) *model.TrainInput {
	return &model.TrainInput{
		Rows:              ts.Rows,
		DatasetDigest:     datasetDigest,
		TrainingSetDigest: ts.Digest,
		RowCounts:         ts.Counts,
	}
}

// candidate represents a labelled package that is a candidate to be part of
// the training set.
type candidate struct {
	contentKey     string
	source         string
	label          string
	repositoryKind int
	repositoryName string
	name           string
	keywords       []string
	description    string
}

// trainingSetRow represents the canonical encoding of a training set row,
// used to compute the training set digest.
type trainingSetRow struct {
	ContentKey     string   `json:"content_key"`
	RepositoryKind int      `json:"repository_kind"`
	RepositoryName string   `json:"repository_name"`
	Name           string   `json:"name"`
	Keywords       []string `json:"keywords"`
	Description    string   `json:"description"`
	Label          string   `json:"label"`
	Source         string   `json:"source"`
	Weight         float64  `json:"weight"`
}

// BuildTrainingSet builds a training set from the LLM labelled dataset rows
// and the publisher labelled packages provided:
//
//   - LLM rows flagged as suspicious or needing review, or with a low
//     confidence label, are excluded.
//   - Publisher rows whose category is not in the catalog are skipped.
//   - Rows are deduplicated by content key. When labels conflict within a
//     content key, publisher labels beat LLM labels and the majority label
//     wins. Ties drop the content key.
//   - Each row is attributed to a representative repository (the first one
//     in order among the rows with the winning label). Each repository
//     contributes at most RepositoryCap effective samples per label.
func BuildTrainingSet(llmRows []Row, publisherRows []PublisherRow) (*TrainingSet, error) {
	ts := &TrainingSet{
		Counts: model.RowCounts{
			RawLLM:       len(llmRows),
			RawPublisher: len(publisherRows),
		},
		UnknownCategories: []int{},
	}

	// Collect candidates, grouped by content key
	groups := make(map[string][]*candidate)
	for i := range llmRows {
		r := &llmRows[i]
		if err := r.Validate(); err != nil {
			return nil, fmt.Errorf("llm row %d: %w", i, err)
		}
		if r.Suspicious || r.NeedsReview || r.Confidence == ConfidenceLow {
			ts.Counts.Excluded++
			continue
		}
		groups[r.ContentKey] = append(groups[r.ContentKey], &candidate{
			contentKey:     r.ContentKey,
			source:         model.SourceLLM,
			label:          r.Label,
			repositoryKind: r.RepositoryKind,
			repositoryName: r.RepositoryName,
			name:           r.Name,
			keywords:       r.Keywords,
			description:    r.Description,
		})
	}
	for i := range publisherRows {
		r := &publisherRows[i]
		if r.RepositoryName == "" || r.Name == "" {
			return nil, fmt.Errorf("publisher row %d: %w: repository name and name are required", i, ErrInvalidRow)
		}
		c, ok := catalog.ByID(r.Category)
		if !ok {
			ts.Counts.UnknownCategory++
			if !slices.Contains(ts.UnknownCategories, r.Category) {
				ts.UnknownCategories = append(ts.UnknownCategories, r.Category)
			}
			continue
		}
		key := model.ContentKey(r.Name, r.Keywords, r.Description)
		groups[key] = append(groups[key], &candidate{
			contentKey:     key,
			source:         model.SourcePublisher,
			label:          c.Name,
			repositoryKind: r.RepositoryKind,
			repositoryName: r.RepositoryName,
			name:           r.Name,
			keywords:       r.Keywords,
			description:    model.TruncateDescription(r.Description),
		})
	}
	slices.Sort(ts.UnknownCategories)

	// Pick one representative per content key
	keys := make([]string, 0, len(groups))
	for key := range groups {
		keys = append(keys, key)
	}
	slices.Sort(keys)
	representatives := make([]*candidate, 0, len(keys))
	for _, key := range keys {
		rep := pickRepresentative(groups[key])
		if rep == nil {
			ts.Counts.Conflicts++
			continue
		}
		representatives = append(representatives, rep)
	}

	// Apply repository cap
	type repositoryLabel struct{ repository, label string }
	counts := make(map[repositoryLabel]int)
	for _, rep := range representatives {
		counts[repositoryLabel{rep.repositoryName, rep.label}]++
	}

	// Build training set rows and compute their digest
	ts.Rows = make([]model.Row, 0, len(representatives))
	var buf bytes.Buffer
	for _, rep := range representatives {
		weight := 1.0
		if n := counts[repositoryLabel{rep.repositoryName, rep.label}]; n > RepositoryCap {
			weight = float64(RepositoryCap) / float64(n)
		}
		keywords := slices.Clone(rep.keywords)
		if keywords == nil {
			keywords = []string{}
		}
		ts.Rows = append(ts.Rows, model.Row{
			Input: model.Input{
				Name:        rep.name,
				Keywords:    keywords,
				Description: rep.description,
			},
			Label:      rep.label,
			Weight:     weight,
			Source:     rep.source,
			Repository: rep.repositoryName,
		})
		data, err := json.Marshal(trainingSetRow{
			ContentKey:     rep.contentKey,
			RepositoryKind: rep.repositoryKind,
			RepositoryName: rep.repositoryName,
			Name:           rep.name,
			Keywords:       keywords,
			Description:    rep.description,
			Label:          rep.label,
			Source:         rep.source,
			Weight:         weight,
		})
		if err != nil {
			return nil, err
		}
		buf.Write(data)
		buf.WriteByte('\n')

		switch {
		case rep.source == model.SourcePublisher:
			ts.Counts.Publisher++
		case rep.label == catalog.None:
			ts.Counts.None++
		default:
			ts.Counts.LLM++
		}
	}
	ts.Counts.Deduplicated = len(ts.Rows)
	ts.Digest = digest(buf.Bytes())

	return ts, nil
}

// pickRepresentative returns the representative of the candidates provided,
// which share the same content key. Publisher labels beat LLM labels, and
// the majority label wins. When the top labels are tied, nil is returned.
func pickRepresentative(candidates []*candidate) *candidate {
	// Only consider publisher candidates if there are any
	if slices.ContainsFunc(candidates, func(c *candidate) bool { return c.source == model.SourcePublisher }) {
		candidates = slices.DeleteFunc(slices.Clone(candidates), func(c *candidate) bool {
			return c.source != model.SourcePublisher
		})
	}

	// Find majority label
	votes := make(map[string]int)
	for _, c := range candidates {
		votes[c.label]++
	}
	var winner string
	var winnerVotes int
	tied := false
	for _, c := range candidates {
		switch n := votes[c.label]; {
		case c.label == winner:
		case n > winnerVotes:
			winner, winnerVotes, tied = c.label, n, false
		case n == winnerVotes:
			tied = true
		}
	}
	if tied {
		return nil
	}

	// Pick the first candidate with the winning label
	var rep *candidate
	for _, c := range candidates {
		if c.label == winner && (rep == nil || compareCandidates(c, rep) < 0) {
			rep = c
		}
	}
	return rep
}

// compareCandidates compares two candidates by repository, name and model
// inputs.
func compareCandidates(a, b *candidate) int {
	return cmp.Or(
		strings.Compare(a.repositoryName, b.repositoryName),
		cmp.Compare(a.repositoryKind, b.repositoryKind),
		strings.Compare(a.name, b.name),
		slices.Compare(a.keywords, b.keywords),
		strings.Compare(a.description, b.description),
	)
}
