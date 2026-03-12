#!/bin/sh
set -e
cd /app/packages/database
npx prisma migrate deploy 2>/dev/null || npx prisma db push --skip-generate 2>/dev/null || true
cd /app
exec "$@"
