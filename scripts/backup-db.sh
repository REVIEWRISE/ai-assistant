#!/bin/bash
# Postgres backup for the production deployment (SOC 2 A1.2 — availability/DR).
#
# Usage: ./backup-db.sh <APP_DIR> [RETENTION_DAYS]
#
# Dumps the `postgres` compose service to a timestamped, gzip-compressed file
# under <APP_DIR>/backups/, then prunes dumps older than RETENTION_DAYS (default 14).
#
# Intended to run from a host crontab, e.g. nightly at 2am:
#   0 2 * * * /var/www/ai-assistant/scripts/backup-db.sh /var/www/ai-assistant >> /var/log/db-backup.log 2>&1
#
# Off-host copy (optional): a backup that only lives on the host it was taken
# from doesn't survive that host being lost. If BACKUP_REMOTE_HOST is set, the
# dump is also scp'd to another host over a dedicated key — see
# docs/policies/business-continuity-dr-plan.md §4.
#   BACKUP_REMOTE_HOST=<user@host>
#   BACKUP_REMOTE_PATH=<absolute path to the remote backups directory>
#   BACKUP_REMOTE_KEY=<path to the dedicated backup-relay private key>
set -e

APP_DIR=$1
RETENTION_DAYS=${2:-14}

if [ -z "$APP_DIR" ]; then
    echo "Usage: ./backup-db.sh <APP_DIR> [RETENTION_DAYS]"
    exit 1
fi

cd "$APP_DIR"

if [ ! -f ".env.production" ]; then
    echo "No .env.production found in $APP_DIR — aborting."
    exit 1
fi

POSTGRES_USER=$(grep -E '^POSTGRES_USER=' .env.production | cut -d '=' -f2-)
POSTGRES_DB=$(grep -E '^POSTGRES_DB=' .env.production | cut -d '=' -f2-)

if [ -z "$POSTGRES_USER" ] || [ -z "$POSTGRES_DB" ]; then
    echo "POSTGRES_USER / POSTGRES_DB missing from .env.production — aborting."
    exit 1
fi

BACKUP_DIR="$APP_DIR/backups"
mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
OUT_FILE="$BACKUP_DIR/${POSTGRES_DB}_${TIMESTAMP}.sql.gz"

echo "Backing up database '$POSTGRES_DB' to $OUT_FILE ..."
docker compose -f docker-compose.prod.yml exec -T postgres \
    pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > "$OUT_FILE"

if [ ! -s "$OUT_FILE" ]; then
    echo "Backup failed — output file is empty."
    rm -f "$OUT_FILE"
    exit 1
fi

echo "Backup complete: $(du -h "$OUT_FILE" | cut -f1)"

if [ -n "${BACKUP_REMOTE_HOST:-}" ] && [ -n "${BACKUP_REMOTE_PATH:-}" ] && [ -n "${BACKUP_REMOTE_KEY:-}" ]; then
    echo "Copying backup off-host to $BACKUP_REMOTE_HOST:$BACKUP_REMOTE_PATH ..."
    if scp -i "$BACKUP_REMOTE_KEY" -o StrictHostKeyChecking=accept-new -o ConnectTimeout=15 \
        "$OUT_FILE" "$BACKUP_REMOTE_HOST:$BACKUP_REMOTE_PATH/"; then
        echo "Off-host copy complete."
    else
        echo "WARNING: off-host copy failed — backup only exists locally on this host." >&2
    fi
else
    echo "BACKUP_REMOTE_HOST/PATH/KEY not set — skipping off-host copy (backup only exists locally)."
fi

echo "Pruning backups older than $RETENTION_DAYS days..."
find "$BACKUP_DIR" -name "${POSTGRES_DB}_*.sql.gz" -mtime "+$RETENTION_DAYS" -print -delete

echo "Done."
