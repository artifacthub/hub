package dataset

import (
	"cmp"
	"slices"
	"strings"

	"github.com/artifacthub/hub/internal/category/catalog"
)

// Diff represents the differences between two datasets.
type Diff struct {
	// Added represents the rows only present in the new dataset, sorted by
	// content key.
	Added []Row

	// Removed represents the rows only present in the old dataset, sorted
	// by content key.
	Removed []Row

	// Changed represents the rows present in both datasets whose label
	// changed, sorted by content key.
	Changed []LabelChange

	// Labels represents the number of rows of each label in both datasets.
	// Only labels present in any of them are included, sorted by category ID
	// (none goes last).
	Labels []LabelDiff
}

// LabelChange represents a change of the label of a row.
type LabelChange struct {
	ContentKey     string
	RepositoryName string
	Name           string
	From           string
	To             string
}

// LabelDiff represents the changes in the number of rows of a label.
type LabelDiff struct {
	// Label represents the label (a category name or none).
	Label string

	// Before represents the number of rows with the label in the old
	// dataset.
	Before int

	// After represents the number of rows with the label in the new dataset.
	After int

	// ChangedFrom represents the number of rows present in both datasets
	// whose label changed from this label to another one.
	ChangedFrom int

	// ChangedTo represents the number of rows present in both datasets whose
	// label changed from another label to this one.
	ChangedTo int
}

// Compare returns the differences between the old and new datasets
// provided. Rows are matched by content key.
func Compare(oldRows, newRows []Row) *Diff {
	d := &Diff{
		Added:   []Row{},
		Removed: []Row{},
		Changed: []LabelChange{},
		Labels:  []LabelDiff{},
	}
	labels := make(map[string]*LabelDiff)
	labelDiff := func(label string) *LabelDiff {
		ld, ok := labels[label]
		if !ok {
			ld = &LabelDiff{Label: label}
			labels[label] = ld
		}
		return ld
	}

	oldByKey := make(map[string]*Row, len(oldRows))
	for i := range oldRows {
		r := &oldRows[i]
		oldByKey[r.ContentKey] = r
		labelDiff(r.Label).Before++
	}
	newByKey := make(map[string]*Row, len(newRows))
	for i := range newRows {
		r := &newRows[i]
		newByKey[r.ContentKey] = r
		labelDiff(r.Label).After++
		oldRow, ok := oldByKey[r.ContentKey]
		switch {
		case !ok:
			d.Added = append(d.Added, *r)
		case oldRow.Label != r.Label:
			d.Changed = append(d.Changed, LabelChange{
				ContentKey:     r.ContentKey,
				RepositoryName: r.RepositoryName,
				Name:           r.Name,
				From:           oldRow.Label,
				To:             r.Label,
			})
			labelDiff(oldRow.Label).ChangedFrom++
			labelDiff(r.Label).ChangedTo++
		}
	}
	for i := range oldRows {
		if _, ok := newByKey[oldRows[i].ContentKey]; !ok {
			d.Removed = append(d.Removed, oldRows[i])
		}
	}

	// Sort results
	byKey := func(a, b Row) int { return strings.Compare(a.ContentKey, b.ContentKey) }
	slices.SortFunc(d.Added, byKey)
	slices.SortFunc(d.Removed, byKey)
	slices.SortFunc(d.Changed, func(a, b LabelChange) int { return strings.Compare(a.ContentKey, b.ContentKey) })
	for _, ld := range labels {
		d.Labels = append(d.Labels, *ld)
	}
	slices.SortFunc(d.Labels, func(a, b LabelDiff) int { return compareLabels(a.Label, b.Label) })

	return d
}

// compareLabels compares two labels by category ID. None goes after all the
// categories, followed by any unknown labels sorted by name.
func compareLabels(a, b string) int {
	rank := func(label string) int {
		if c, ok := catalog.ByName(label); ok {
			return c.ID
		}
		if label == catalog.None {
			return 1 << 30
		}
		return 1<<30 + 1
	}
	return cmp.Or(cmp.Compare(rank(a), rank(b)), strings.Compare(a, b))
}
