#!/bin/bash
set -e

APP_DIR=$1

if [ -z "$APP_DIR" ]; then
    echo "Usage: ./deploy.sh <APP_DIR>"
    exit 1
fi

cd "$APP_DIR"

# .env.production is already created by GitHub Action from secrets
if [ -f .env.production ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env.production
  set +a
fi

# Ensure the app container talks to the compose postgres service (not localhost).
if [ -n "${POSTGRES_USER:-}" ] && [ -n "${POSTGRES_PASSWORD:-}" ] && [ -n "${POSTGRES_DB:-}" ]; then
  export DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}"
  printf "DATABASE_URL=%s\nOPENAI_API_KEY=%s\nSEED_ADMIN_EMAIL=%s\nSEED_ADMIN_NAME=%s\nSEED_ADMIN_PASSWORD=%s\nPOSTGRES_USER=%s\nPOSTGRES_PASSWORD=%s\nPOSTGRES_DB=%s\nNEXT_PUBLIC_APP_URL=%s\n" \
    "$DATABASE_URL" "${OPENAI_API_KEY:-}" "${SEED_ADMIN_EMAIL:-}" "${SEED_ADMIN_NAME:-}" "${SEED_ADMIN_PASSWORD:-}" \
    "$POSTGRES_USER" "$POSTGRES_PASSWORD" "$POSTGRES_DB" "${NEXT_PUBLIC_APP_URL:-}" > .env.production
fi

# Backup current state for rollback
echo $(date +%s) > .last_version

# Build and restart containers
echo "Building and starting containers..."
docker compose -f docker-compose.prod.yml pull || true
docker compose -f docker-compose.prod.yml down --remove-orphans
docker compose -f docker-compose.prod.yml up -d --build

# Give the app time to start and run db migrations before polling
echo "Waiting 30s for app startup and DB migration..."
sleep 30

# Health check
echo "Waiting for app to be healthy..."
MAX_RETRIES=30
RETRY_COUNT=0
UNTIL_HEALTHY=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    HTTP_RESPONSE=$(curl -s -o /tmp/health_body -w "%{http_code}" http://localhost:3015/api/health || echo "000")
    BODY=$(cat /tmp/health_body 2>/dev/null || echo "")
    echo "Attempt $RETRY_COUNT/$MAX_RETRIES — HTTP $HTTP_RESPONSE — $BODY"
    if echo "$BODY" | grep -q '"status":"healthy"'; then
        echo "App is healthy!"
        UNTIL_HEALTHY=1
        break
    fi
    sleep 10
    RETRY_COUNT=$((RETRY_COUNT+1))
done

MENU_COUNT=$(docker compose -f docker-compose.prod.yml exec -T postgres \
  psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -tAc "SELECT COUNT(*) FROM menu_items;" 2>/dev/null | tr -d '[:space:]' || echo "0")
echo "menu_items row count in postgres container: ${MENU_COUNT:-0}"
if [ "${MENU_COUNT:-0}" -lt 16 ]; then
  echo "WARNING: Expected at least 16 menu_items after seed. Check app startup logs for [seed] errors."
  docker compose -f docker-compose.prod.yml logs --tail=80 app | grep -E '\[seed\]|Error|error|seed' || true
fi

if [ $UNTIL_HEALTHY -eq 0 ]; then
    echo "=== App failed to become healthy after ${MAX_RETRIES} attempts. ==="
    echo "=== Last 100 lines of app logs ==="
    docker compose -f docker-compose.prod.yml logs --tail=100 app
    echo "=== Last 50 lines of postgres logs ==="
    docker compose -f docker-compose.prod.yml logs --tail=50 postgres
    echo "=== Container status ==="
    docker compose -f docker-compose.prod.yml ps
    echo "Stopping containers for safety..."
    docker compose -f docker-compose.prod.yml down
    exit 1
fi

echo "Deployment successful!"
