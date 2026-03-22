#!/bin/sh
# Remove all BullMQ keys for the site-audit queue (e.g. after stuck active locks).
# Run on the host: sh scripts/redis-del-bull-site-audit.sh [container_name]
set -e
C="${1:-luminum-redis-1}"
docker exec "$C" sh -c 'for k in $(redis-cli --scan --pattern "bull:site-audit:*"); do redis-cli DEL "$k"; done'
