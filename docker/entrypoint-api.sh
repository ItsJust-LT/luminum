#!/bin/sh
set -e
cd /app/packages/database
npx prisma migrate deploy
cd /app
exec "$@"
