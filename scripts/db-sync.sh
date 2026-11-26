#!/bin/sh
set -eu

echo "[db-sync] Ensuring database exists..."
npx tsx scripts/db-create.ts

echo "[db-sync] Applying pre-push SQL (prisma/pre-push)..."
# Idempotent SQL for changes db push would refuse without --accept-data-loss
# (for example a unique index on a new column of an existing table).
for f in prisma/pre-push/*.sql; do
  [ -e "$f" ] || continue
  echo "[db-sync]   $f"
  npx prisma db execute --schema prisma/schema.prisma --file "$f"
done

echo "[db-sync] Pushing Prisma schema (prisma/schema.prisma)..."
if [ "${PRISMA_DB_PUSH_ACCEPT_DATA_LOSS:-}" = "1" ]; then
  npx prisma db push --skip-generate --accept-data-loss
else
  npx prisma db push --skip-generate
fi

echo "[db-sync] Regenerating Prisma client..."
npx prisma generate

echo "[db-sync] Ensuring menu seeds (subscription + role grants)..."
node scripts/ensure-menus.cjs

echo "[db-sync] Done."
