#!/bin/sh

docker build -f cmd/hub/Dockerfile -t tegioz/hub .
docker build -f cmd/chart-tracker/Dockerfile -t tegioz/chart-tracker .
docker build -f database/migrations/Dockerfile -t tegioz/db-migrator .
docker build -f database/tests/Dockerfile-db-tests -t tegioz/db-tests .
docker build -f database/tests/Dockerfile-postgres-pgtap -t tegioz/postgres-pgtap .
