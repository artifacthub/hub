#!/bin/sh

# Build docker images
GIT_SHA=$(git rev-parse HEAD)
docker build -f cmd/hub/Dockerfile -t artifacthub/hub -t artifacthub/hub:$GIT_SHA .
docker build -f cmd/chart-tracker/Dockerfile -t artifacthub/chart-tracker -t artifacthub/chart-tracker:$GIT_SHA .
docker build -f database/migrations/Dockerfile -t artifacthub/db-migrator -t artifacthub/db-migrator:$GIT_SHA .
