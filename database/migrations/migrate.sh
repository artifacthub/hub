#!/bin/sh

schemaVersionTable=version_schema
functionsVersionTable=version_functions

passwordOverride=""
if [ -n "$DBMIGRATOR_DB_PASSWORD" ]; then
    passwordOverride="--password $DBMIGRATOR_DB_PASSWORD"
fi

echo "- Applying schema migrations.."
cd schema
tern status --config $TERN_CONF --version-table $schemaVersionTable $passwordOverride
tern migrate --config $TERN_CONF --version-table $schemaVersionTable $passwordOverride
if [ $? -ne 0 ]; then exit 1; fi
echo "Done"
cd ..

echo "- Loading functions.."
cd functions
tern status --config $TERN_CONF --version-table $functionsVersionTable $passwordOverride | grep "version:  1 of 1"
if [ $? -eq 0 ]; then
    tern migrate --config $TERN_CONF --version-table $functionsVersionTable --destination -+1 $passwordOverride
else
    tern migrate --config $TERN_CONF --version-table $functionsVersionTable $passwordOverride
fi
if [ $? -ne 0 ]; then exit 1; fi
echo "Done"
