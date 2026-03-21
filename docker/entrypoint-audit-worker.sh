#!/bin/sh
set -e
cd /app
exec node apps/api/dist/site-audit/worker.js
