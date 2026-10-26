package labeler

import (
	"cmp"
	"errors"
	"fmt"
	"io"
	"slices"
	"strconv"
	"strings"
	"text/tabwriter"

	"github.com/artifacthub/hub/internal/category/catalog"
	"github.com/artifacthub/hub/internal/category/dataset"
)

// ErrNoCommonRows indicates that the datasets compared have no content keys
// in common.
var ErrNoCommonRows = errors.New("the datasets have no content keys in common")

// AgreementReport represents the agreement between two label sets (for
// example, two agents labelling the same sample), computed on the content
// keys they have in common.
type AgreementReport struct {
	// RowsA represents the number of rows in the first dataset.
	RowsA int

	// RowsB represents the number of rows in the second dataset.
	RowsB int

	// Common represents the number of content keys in both datasets.
	Common int

	// Agreements represents the number of common content keys with the same
	// label in both datasets.
	Agreements int

	// Agreement represents the observed agreement (Agreements / Common).
	Agreement float64

	// Kappa represents Cohen's kappa, which corrects the observed agreement
	// for the agreement expected by chance.
	Kappa float64

	// Labels represents the labels of the confusion matrix: the catalog
	// category names sorted by ID, followed by none.
	Labels []string

	// Matrix represents the confusion matrix: Matrix[i][j] is the number of
	// common content keys labelled Labels[i] in the first dataset and
	// Labels[j] in the second one.
	Matrix [][]int

	// Confusions represents the pairs of different labels assigned to the
	// same content keys, sorted by count (descending).
	Confusions []Confusion
}

// Confusion represents a pair of different labels assigned to the same
// content keys by the two datasets compared.
type Confusion struct {
	// A represents the label in the first dataset.
	A string

	// B represents the label in the second dataset.
	B string

	// Count represents the number of content keys with this pair of labels.
	Count int

	// Examples represents some of the packages with this pair of labels
	// (repository/name), sorted.
	Examples []string
}

// maxConfusionExamples represents the maximum number of examples per
// confusion.
const maxConfusionExamples = 5

// Agreement compares the labels of the two datasets provided on the content
// keys they have in common.
func Agreement(a, b []dataset.Row) (*AgreementReport, error) {
	labels := append(catalog.Names(), catalog.None)
	labelIndex := make(map[string]int, len(labels))
	for i, label := range labels {
		labelIndex[label] = i
	}
	r := &AgreementReport{
		RowsA:  len(a),
		RowsB:  len(b),
		Labels: labels,
		Matrix: make([][]int, len(labels)),
	}
	for i := range r.Matrix {
		r.Matrix[i] = make([]int, len(labels))
	}

	// Fill confusion matrix
	rowsB := make(map[string]*dataset.Row, len(b))
	for i := range b {
		rowsB[b[i].ContentKey] = &b[i]
	}
	examples := make(map[[2]int][]string)
	for i := range a {
		rowA := &a[i]
		rowB, ok := rowsB[rowA.ContentKey]
		if !ok {
			continue
		}
		ia, okA := labelIndex[rowA.Label]
		ib, okB := labelIndex[rowB.Label]
		if !okA || !okB {
			return nil, fmt.Errorf("invalid label in content key %s", rowA.ContentKey)
		}
		r.Common++
		r.Matrix[ia][ib]++
		if ia == ib {
			r.Agreements++
		} else {
			pair := [2]int{ia, ib}
			examples[pair] = append(examples[pair], rowA.RepositoryName+"/"+rowA.Name)
		}
	}
	if r.Common == 0 {
		return nil, ErrNoCommonRows
	}

	// Agreement and Cohen's kappa
	n := float64(r.Common)
	r.Agreement = float64(r.Agreements) / n
	var expected float64
	for k := range labels {
		var rowTotal, colTotal int
		for j := range labels {
			rowTotal += r.Matrix[k][j]
			colTotal += r.Matrix[j][k]
		}
		expected += (float64(rowTotal) / n) * (float64(colTotal) / n)
	}
	if expected < 1 {
		r.Kappa = (r.Agreement - expected) / (1 - expected)
	} else {
		// Both datasets use a single (and the same) label for all rows
		r.Kappa = 1
	}

	// Confusions
	for pair, ex := range examples {
		slices.Sort(ex)
		r.Confusions = append(r.Confusions, Confusion{
			A:        labels[pair[0]],
			B:        labels[pair[1]],
			Count:    len(ex),
			Examples: ex[:min(len(ex), maxConfusionExamples)],
		})
	}
	slices.SortFunc(r.Confusions, func(x, y Confusion) int {
		return cmp.Or(
			cmp.Compare(y.Count, x.Count),
			cmp.Compare(labelIndex[x.A], labelIndex[y.A]),
			cmp.Compare(labelIndex[x.B], labelIndex[y.B]),
		)
	})

	return r, nil
}

// Write writes the report to the writer provided.
func (r *AgreementReport) Write(w io.Writer) error {
	fmt.Fprintf(w, "Rows in A: %d\n", r.RowsA)
	fmt.Fprintf(w, "Rows in B: %d\n", r.RowsB)
	fmt.Fprintf(w, "Content keys in common: %d\n", r.Common)
	fmt.Fprintf(w, "Agreement: %.1f%% (%d/%d)\n", r.Agreement*100, r.Agreements, r.Common)
	fmt.Fprintf(w, "Cohen's kappa: %.3f\n", r.Kappa)

	// Confusion matrix (columns are identified by number to keep it narrow)
	fmt.Fprintf(w, "\nConfusion matrix (rows: A, columns: B):\n\n")
	tw := tabwriter.NewWriter(w, 0, 0, 2, ' ', 0)
	header := make([]string, 0, 2+len(r.Labels))
	header = append(header, "", "")
	for i := range r.Labels {
		header = append(header, strconv.Itoa(i+1))
	}
	fmt.Fprintln(tw, strings.Join(header, "\t")+"\t")
	for i, label := range r.Labels {
		cells := make([]string, 0, 2+len(r.Labels))
		cells = append(cells, strconv.Itoa(i+1)+".", label)
		for j := range r.Labels {
			cells = append(cells, strconv.Itoa(r.Matrix[i][j]))
		}
		fmt.Fprintln(tw, strings.Join(cells, "\t")+"\t")
	}
	if err := tw.Flush(); err != nil {
		return err
	}

	// Confusions
	if len(r.Confusions) > 0 {
		fmt.Fprintf(w, "\nDisagreements (A -> B):\n\n")
		for _, c := range r.Confusions {
			fmt.Fprintf(w, "%d\t%s -> %s (e.g. %s)\n", c.Count, c.A, c.B, strings.Join(c.Examples, ", "))
		}
	}
	return nil
}
