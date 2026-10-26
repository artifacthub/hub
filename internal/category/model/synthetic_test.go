package model

import (
	"fmt"
	"math/rand/v2"

	"github.com/artifacthub/hub/internal/category/catalog"
)

// syntheticConfig represents the configuration used to generate a synthetic
// training set.
type syntheticConfig struct {
	categories      []string
	rowsPerCategory int
	noneRows        int
	repositories    int
	noise           float64
	seed            uint64
}

// syntheticVocabularies represents the distinctive words of the categories
// used in the synthetic training sets.
var syntheticVocabularies = map[string][]string{
	"database":           {"postgres", "mysql", "sql", "replica", "query", "schema", "table", "mongodb"},
	"networking":         {"ingress", "proxy", "dns", "loadbalancer", "mesh", "envoy", "nginx", "routing"},
	"security":           {"vault", "secrets", "certificate", "oauth", "policy", "scanner", "tls", "rbac"},
	"storage":            {"volume", "minio", "ceph", "backup", "s3", "filesystem", "nfs", "snapshot"},
	"monitoring-logging": {"prometheus", "grafana", "metrics", "alerts", "logs", "tracing", "loki", "exporter"},
}

// syntheticGenericWords represents the words shared by all the categories.
var syntheticGenericWords = []string{
	"kubernetes", "helm", "chart", "operator", "deploy", "cluster", "simple",
	"cloud", "native", "service", "application", "container", "open", "source",
	"platform", "tool", "manage", "fast", "scalable", "lightweight",
}

// syntheticRows generates a synthetic training set.
func syntheticRows(cfg syntheticConfig) []Row {
	rng := rand.New(rand.NewPCG(cfg.seed, cfg.seed)) // #nosec G404 -- deterministic test data
	pick := func(words []string) string { return words[rng.IntN(len(words))] }
	repository := func() string { return fmt.Sprintf("repo-%d", rng.IntN(cfg.repositories)) }
	words := func(category string, n int) []string {
		ws := make([]string, 0, n)
		for range n {
			c := category
			if rng.Float64() < cfg.noise {
				c = cfg.categories[rng.IntN(len(cfg.categories))]
			}
			ws = append(ws, pick(syntheticVocabularies[c]))
		}
		return ws
	}

	rows := make([]Row, 0, len(cfg.categories)*cfg.rowsPerCategory+cfg.noneRows)
	for _, category := range cfg.categories {
		for range cfg.rowsPerCategory {
			distinctive := words(category, 5)
			rows = append(rows, Row{
				Input: Input{
					Name:     distinctive[0] + "-" + pick(syntheticGenericWords),
					Keywords: []string{distinctive[1], pick(syntheticGenericWords)},
					Description: fmt.Sprintf("A %s %s for %s %s with %s and %s.",
						pick(syntheticGenericWords), distinctive[2], pick(syntheticGenericWords),
						distinctive[3], distinctive[4], pick(syntheticGenericWords)),
				},
				Label:      category,
				Weight:     1,
				Source:     SourceLLM,
				Repository: repository(),
			})
		}
	}
	for range cfg.noneRows {
		rows = append(rows, Row{
			Input: Input{
				Name:     pick(syntheticGenericWords) + "-" + pick(syntheticGenericWords),
				Keywords: []string{pick(syntheticGenericWords)},
				Description: fmt.Sprintf("A %s %s %s.",
					pick(syntheticGenericWords), pick(syntheticGenericWords), pick(syntheticGenericWords)),
			},
			Label:      catalog.None,
			Weight:     1,
			Source:     SourceLLM,
			Repository: repository(),
		})
	}
	return rows
}

// defaultSyntheticConfig returns the configuration of a synthetic training
// set the default training configuration handles well.
func defaultSyntheticConfig() syntheticConfig {
	return syntheticConfig{
		categories:      []string{"database", "monitoring-logging", "networking", "security", "storage"},
		rowsPerCategory: 60,
		noneRows:        40,
		repositories:    25,
		noise:           0.1,
		seed:            1,
	}
}

// trainInput returns a training input for the rows provided.
func trainInput(rows []Row) *TrainInput {
	return &TrainInput{
		Rows:              rows,
		DatasetDigest:     "sha256:dataset",
		TrainingSetDigest: "sha256:training-set",
		RowCounts:         RowCounts{Deduplicated: len(rows)},
	}
}
