#!/bin/sh

# Build docker images
GIT_SHA=$(git rev-parse HEAD)
docker build -f cmd/hub/Dockerfile -t cncf/hub -t cncf/hub:$GIT_SHA .
docker build -f cmd/chart-tracker/Dockerfile -t cncf/chart-tracker -t cncf/chart-tracker:$GIT_SHA .
docker build -f database/migrations/Dockerfile -t cncf/db-migrator -t cncf/db-migrator:$GIT_SHA .
