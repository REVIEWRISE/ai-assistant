#!/bin/sh
set -eu

echo "[db-sync] Pushing Prisma schema (prisma/schema.prisma)..."
if [ "${PRISMA_DB_PUSH_ACCEPT_DATA_LOSS:-}" = "1" ]; then
  npx prisma db push --skip-generate --accept-data-loss
else
  npx prisma db push --skip-generate
fi

echo "[db-sync] Done."
