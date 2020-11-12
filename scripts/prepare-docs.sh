#!/bin/sh

cat docs/www/headers/authorization docs/authorization.md > docs/www/content/topics/authorization.md
cat docs/www/headers/dev docs/dev.md > docs/www/content/topics/dev.md
cat docs/www/headers/repositories docs/repositories.md > docs/www/content/topics/repositories.md
cat docs/www/headers/security_report docs/security_report.md > docs/www/content/topics/security_report.md
cat docs/www/headers/helm_annotations docs/helm_annotations.md > docs/www/content/topics/annotations/helm.md
cat docs/www/headers/olm_annotations docs/olm_annotations.md > docs/www/content/topics/annotations/olm.md
