package main

import (
	"context"
	"strings"

	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/tracker"
	"github.com/artifacthub/hub/internal/util"
	"github.com/rs/zerolog/log"
)

func main() {
	// Setup configuration
	cfg, err := util.SetupConfig("classifier")
	if err != nil {
		log.Fatal().Err(err).Msg("configuration setup failed")
	}

	// Setup database
	db, err := util.SetupDB(cfg)
	if err != nil {
		log.Fatal().Err(err).Msg("database setup failed")
	}

	// Get id and keywords of all packages with keywords
	ctx := context.Background()
	rows, err := db.Query(ctx, `
		select
			p.package_id,
			lower(array_to_string(s.keywords, ','))
		from package p
		join snapshot s using (package_id)
		where s.version = p.latest_version
		and s.keywords is not null;
	`)
	if err != nil {
		log.Fatal().Err(err).Msg("error getting packages keywords")
	}
	defer rows.Close()

	// Update packages' category with predictions from ML classifier
	modelPath := cfg.GetString("categoryModelPath")
	classifier := tracker.NewPackageCategoryClassifierML(modelPath)
	var packageID, keywords string
	for rows.Next() {
		err := rows.Scan(&packageID, &keywords)
		if err != nil {
			log.Error().Err(err).Str("packageID", packageID).Send()
		}

		// Update package category
		category := classifier.Predict(&hub.Package{Keywords: strings.Split(keywords, ",")})
		if _, err := db.Exec(
			ctx,
			"update package set package_category_id = nullif($1, 0) where package_id = $2",
			category,
			packageID,
		); err != nil {
			log.Error().Err(err).Str("packageID", packageID).Msg("error updating package category")
		}
	}
	err = rows.Err()
	if err != nil {
		log.Error().Err(err).Send()
	}
}
