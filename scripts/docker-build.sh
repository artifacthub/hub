#!/bin/sh

# Build docker images
GIT_SHA=$(git rev-parse HEAD)
docker build -f cmd/hub/Dockerfile -t artifacthub/hub -t artifacthub/hub:$GIT_SHA .
docker build -f cmd/helm-tracker/Dockerfile -t artifacthub/helm-tracker -t artifacthub/helm-tracker:$GIT_SHA .
docker build -f cmd/olm-tracker/Dockerfile -t artifacthub/olm-tracker -t artifacthub/olm-tracker:$GIT_SHA .
docker build -f database/migrations/Dockerfile -t artifacthub/db-migrator -t artifacthub/db-migrator:$GIT_SHA .
