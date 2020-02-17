#!/bin/sh

# Build docker images
docker build -f cmd/hub/Dockerfile -t cncf/hub .
docker build -f cmd/chart-tracker/Dockerfile -t cncf/chart-tracker .
docker build -f database/migrations/Dockerfile -t cncf/db-migrator .
docker build -f database/tests/Dockerfile-db-tests -t tegioz/db-tests .
docker build -f database/tests/Dockerfile-postgres-pgtap -t tegioz/postgres-pgtap .
