#!/bin/sh
set -e
cd /app/packages/database
# Apply migrations if any
npx prisma migrate deploy
# Ensure schema is in sync (creates missing tables when there are no migrations)
npx prisma db push --accept-data-loss --skip-generate
cd /app
exec "$@"
