#!/bin/sh

# Build docker images
GIT_SHA=$(git rev-parse HEAD)
docker build -f cmd/hub/Dockerfile -t artifacthub/hub -t artifacthub/hub:$GIT_SHA .
docker build -f database/migrations/Dockerfile -t artifacthub/db-migrator -t artifacthub/db-migrator:$GIT_SHA .
docker build -f cmd/scanner/Dockerfile -t artifacthub/scanner -t artifacthub/scanner:$GIT_SHA .
docker build -f cmd/tracker/Dockerfile -t artifacthub/tracker -t artifacthub/tracker:$GIT_SHA .
