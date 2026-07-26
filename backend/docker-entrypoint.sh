#!/bin/sh
set -e
echo "Running migrations..."
node scripts/create_db_and_run_migrations.mjs
echo "Starting server..."
exec node index.js
