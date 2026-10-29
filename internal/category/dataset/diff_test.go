package dataset

import (
	"testing"

	"github.com/artifacthub/hub/internal/category/catalog"
	"github.com/stretchr/testify/assert"
)

func TestCompare(t *testing.T) {
	t.Parallel()

	redis := newRow("bitnami", "redis", nil, "In-memory data store", "database")
	nginx := newRow("bitnami", "nginx", nil, "Web server", "networking")
	wordpress := newRow("bitnami", "wordpress", nil, "Blogging platform", catalog.None)
	minio := newRow("minio", "minio", nil, "Object storage", "storage")
	vault := newRow("hashicorp", "vault", nil, "Secrets", "security")

	t.Run("no changes", func(t *testing.T) {
		t.Parallel()

		d := Compare([]Row{redis, nginx}, []Row{nginx, redis})
		assert.Empty(t, d.Added)
		assert.Empty(t, d.Removed)
		assert.Empty(t, d.Changed)
		assert.Equal(t, []LabelDiff{
			{Label: "database", Before: 1, After: 1},
			{Label: "networking", Before: 1, After: 1},
		}, d.Labels)
	})

	t.Run("changes", func(t *testing.T) {
		t.Parallel()

		nginxRelabelled := nginx
		nginxRelabelled.Label = "web-applications"
		nginxRelabelled.Confidence = ConfidenceMedium
		wordpressRelabelled := wordpress
		wordpressRelabelled.Label = "web-applications"
		redisFlagsChanged := redis
		redisFlagsChanged.NeedsReview = true

		d := Compare(
			[]Row{redis, nginx, wordpress, minio},
			[]Row{vault, wordpressRelabelled, redisFlagsChanged, nginxRelabelled},
		)
		assert.Equal(t, []Row{vault}, d.Added)
		assert.Equal(t, []Row{minio}, d.Removed)
		expectedChanged := []LabelChange{
			{
				ContentKey:     nginx.ContentKey,
				RepositoryName: "bitnami",
				Name:           "nginx",
				From:           "networking",
				To:             "web-applications",
			},
			{
				ContentKey:     wordpress.ContentKey,
				RepositoryName: "bitnami",
				Name:           "wordpress",
				From:           catalog.None,
				To:             "web-applications",
			},
		}
		if expectedChanged[0].ContentKey > expectedChanged[1].ContentKey {
			expectedChanged[0], expectedChanged[1] = expectedChanged[1], expectedChanged[0]
		}
		assert.Equal(t, expectedChanged, d.Changed)
		assert.Equal(t, []LabelDiff{
			{Label: "database", Before: 1, After: 1},
			{Label: "networking", Before: 1, After: 0, ChangedFrom: 1},
			{Label: "security", Before: 0, After: 1},
			{Label: "storage", Before: 1, After: 0},
			{Label: "web-applications", Before: 0, After: 2, ChangedTo: 2},
			{Label: catalog.None, Before: 1, After: 0, ChangedFrom: 1},
		}, d.Labels)
	})

	t.Run("empty datasets", func(t *testing.T) {
		t.Parallel()

		d := Compare(nil, nil)
		assert.Equal(t, &Diff{
			Added:   []Row{},
			Removed: []Row{},
			Changed: []LabelChange{},
			Labels:  []LabelDiff{},
		}, d)

		d = Compare(nil, []Row{redis})
		assert.Equal(t, []Row{redis}, d.Added)
		assert.Equal(t, []LabelDiff{{Label: "database", Before: 0, After: 1}}, d.Labels)
	})
}

func TestCompareLabels(t *testing.T) {
	t.Parallel()

	assert.Negative(t, compareLabels("ai-machine-learning", "web-applications"))
	assert.Negative(t, compareLabels("web-applications", catalog.None))
	assert.Negative(t, compareLabels(catalog.None, "unknown"))
	assert.Negative(t, compareLabels("unknown-a", "unknown-b"))
	assert.Zero(t, compareLabels("database", "database"))
	assert.Positive(t, compareLabels(catalog.None, "storage"))
}
