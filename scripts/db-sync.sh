#!/bin/sh
set -eu

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RUN="$ROOT/scripts/with-env.sh"

echo "[db-sync] Pushing Prisma schema (prisma/schema.prisma)..."
if [ "${PRISMA_DB_PUSH_ACCEPT_DATA_LOSS:-}" = "1" ]; then
  sh "$RUN" npx prisma db push --skip-generate --accept-data-loss
else
  sh "$RUN" npx prisma db push --skip-generate
fi

echo "[db-sync] Regenerating Prisma client..."
sh "$RUN" npx prisma generate

echo "[db-sync] Done."
