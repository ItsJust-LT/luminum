#!/bin/sh
set -e

# Ensure DATABASE_URL is set for Prisma migrations.
# Fall back to the same connection string used in docker-compose.prod.yml.
: "${POSTGRES_USER:=${POSTGRES_USER:-luminum}}"
: "${POSTGRES_PASSWORD:=${POSTGRES_PASSWORD:-luminum_internal}}"
: "${POSTGRES_DB:=${POSTGRES_DB:-luminum}}"

if [ -z "$DATABASE_URL" ]; then
  export DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}"
fi

cd /app/packages/database
# Apply migrations if any
npx prisma migrate deploy
# Ensure schema is in sync (creates missing tables when there are no migrations)
npx prisma db push --accept-data-loss
cd /app
exec "$@"
