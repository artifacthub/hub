package labeler

import (
	"bytes"
	"fmt"
	"testing"

	"github.com/artifacthub/hub/internal/category/catalog"
	"github.com/artifacthub/hub/internal/category/dataset"
	"github.com/artifacthub/hub/internal/category/model"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// newTestRow returns a dataset row for the package and label provided.
func newTestRow(name, label string) dataset.Row {
	return dataset.Row{
		ContentKey:     model.ContentKey(name, nil, ""),
		RepositoryName: "repo",
		Name:           name,
		Duplicates:     1,
		Keywords:       []string{},
		Label:          label,
		Confidence:     dataset.ConfidenceHigh,
	}
}

func TestAgreement(t *testing.T) {
	t.Parallel()

	t.Run("report", func(t *testing.T) {
		t.Parallel()

		// 10 common rows: 8 agreements, 2 disagreements
		a := make([]dataset.Row, 0, 11)
		b := make([]dataset.Row, 0, 11)
		for i := range 4 {
			a = append(a, newTestRow(fmt.Sprintf("db%d", i), "database"))
			b = append(b, newTestRow(fmt.Sprintf("db%d", i), "database"))
		}
		for i := range 4 {
			a = append(a, newTestRow(fmt.Sprintf("none%d", i), "none"))
			b = append(b, newTestRow(fmt.Sprintf("none%d", i), "none"))
		}
		a = append(a, newTestRow("x1", "database"), newTestRow("x2", "database"))
		b = append(b, newTestRow("x1", "none"), newTestRow("x2", "none"))

		// Rows only present in one of the datasets are ignored
		a = append(a, newTestRow("only-a", "storage"))
		b = append(b, newTestRow("only-b", "storage"))

		r, err := Agreement(a, b)
		require.NoError(t, err)
		assert.Equal(t, 11, r.RowsA)
		assert.Equal(t, 11, r.RowsB)
		assert.Equal(t, 10, r.Common)
		assert.Equal(t, 8, r.Agreements)
		assert.InDelta(t, 0.8, r.Agreement, 1e-9)

		// po = 0.8, A: database 0.6, none 0.4, B: database 0.4, none 0.6
		// pe = 0.6*0.4 + 0.4*0.6 = 0.48, kappa = (0.8-0.48)/(1-0.48)
		assert.InDelta(t, (0.8-0.48)/(1-0.48), r.Kappa, 1e-9)

		assert.Equal(t, append(catalog.Names(), catalog.None), r.Labels)
		db, none := 1, len(r.Labels)-1
		assert.Equal(t, 4, r.Matrix[db][db])
		assert.Equal(t, 2, r.Matrix[db][none])
		assert.Equal(t, 4, r.Matrix[none][none])
		assert.Equal(t, 0, r.Matrix[none][db])
		assert.Equal(t, []Confusion{
			{A: "database", B: "none", Count: 2, Examples: []string{"repo/x1", "repo/x2"}},
		}, r.Confusions)

		var out bytes.Buffer
		require.NoError(t, r.Write(&out))
		assert.Contains(t, out.String(), "Content keys in common: 10\n")
		assert.Contains(t, out.String(), "Agreement: 80.0% (8/10)\n")
		assert.Contains(t, out.String(), "Cohen's kappa: 0.615\n")
		assert.Contains(t, out.String(), "2\tdatabase -> none (e.g. repo/x1, repo/x2)\n")
	})

	t.Run("perfect agreement on a single label", func(t *testing.T) {
		t.Parallel()
		a := []dataset.Row{newTestRow("a", "database"), newTestRow("b", "database")}
		r, err := Agreement(a, a)
		require.NoError(t, err)
		assert.InDelta(t, 1.0, r.Agreement, 1e-9)
		assert.InDelta(t, 1.0, r.Kappa, 1e-9)
		assert.Empty(t, r.Confusions)
	})

	t.Run("no agreement beyond chance", func(t *testing.T) {
		t.Parallel()
		a := []dataset.Row{newTestRow("a", "database"), newTestRow("b", "storage")}
		b := []dataset.Row{newTestRow("a", "storage"), newTestRow("b", "database")}
		r, err := Agreement(a, b)
		require.NoError(t, err)
		assert.InDelta(t, 0.0, r.Agreement, 1e-9)
		assert.InDelta(t, -1.0, r.Kappa, 1e-9)
	})

	t.Run("no common rows", func(t *testing.T) {
		t.Parallel()
		_, err := Agreement([]dataset.Row{newTestRow("a", "database")}, []dataset.Row{newTestRow("b", "database")})
		assert.ErrorIs(t, err, ErrNoCommonRows)
	})

	t.Run("invalid label", func(t *testing.T) {
		t.Parallel()
		_, err := Agreement([]dataset.Row{newTestRow("a", "databases")}, []dataset.Row{newTestRow("a", "database")})
		assert.Error(t, err)
	})
}
