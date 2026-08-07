#!/bin/bash
set -e

APP_DIR=$1

if [ -z "$APP_DIR" ]; then
    echo "Usage: ./deploy.sh <APP_DIR>"
    exit 1
fi

cd "$APP_DIR"

# SCP deploy does not delete removed repo files. Drop superseded logout page/action
# so Next.js does not see both /logout/page and /logout/route.
rm -f "$APP_DIR/src/app/logout/page.tsx" "$APP_DIR/src/app/logout/actions.ts"

# Persist provider logos and other uploads across container rebuilds
mkdir -p "$APP_DIR/data/uploads/providers" "$APP_DIR/data/uploads/organizations"
chmod -R 775 "$APP_DIR/data/uploads" 2>/dev/null || true

# .env.production is already created by GitHub Action from secrets

# Backup current state for rollback
echo $(date +%s) > .last_version

# Build and restart containers
echo "Building and starting containers..."
COMPOSE_PROFILES=""
if grep -qE '^RETELL_USE_CUSTOM_LLM=(true|1|on)' .env.production 2>/dev/null \
  || grep -qE '^RETELL_CUSTOM_LLM_WS_URL=.+' .env.production 2>/dev/null; then
  COMPOSE_PROFILES="--profile retell-custom-llm"
  echo "Custom LLM enabled — starting retell-llm service."
fi
docker compose -f docker-compose.prod.yml pull || true
docker compose -f docker-compose.prod.yml down --remove-orphans
docker compose -f docker-compose.prod.yml $COMPOSE_PROFILES up -d --build

# Give the app time to start and run db migrations before polling
echo "Waiting 30s for app startup and DB migration..."
sleep 30

# Health check
echo "Waiting for app to be healthy..."
MAX_RETRIES=30
RETRY_COUNT=0
UNTIL_HEALTHY=0

# /api/health only returns schema details to callers presenting HEALTH_CHECK_TOKEN (SOC 2 CC6.6)
HEALTH_CHECK_TOKEN=$(grep -E '^HEALTH_CHECK_TOKEN=' .env.production 2>/dev/null | cut -d '=' -f2-)

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    HTTP_RESPONSE=$(curl -s -o /tmp/health_body -w "%{http_code}" -H "X-Health-Token: ${HEALTH_CHECK_TOKEN}" http://localhost:3015/api/health || echo "000")
    BODY=$(cat /tmp/health_body 2>/dev/null || echo "")
    echo "Attempt $RETRY_COUNT/$MAX_RETRIES — HTTP $HTTP_RESPONSE — $BODY"
    if echo "$BODY" | grep -q '"status":"healthy"' \
      && echo "$BODY" | grep -q '"schemaInSync":true'; then
        echo "App is healthy and database schema is in sync!"
        UNTIL_HEALTHY=1
        break
    fi
    sleep 10
    RETRY_COUNT=$((RETRY_COUNT+1))
done

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

if [ -n "$COMPOSE_PROFILES" ]; then
  echo "Checking retell-llm WebSocket server..."
  RETELL_RETRIES=0
  RETELL_HTTP="000"
  until [ $RETELL_RETRIES -ge 10 ]; do
    RETELL_HTTP=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3017/ || echo "000")
    if [ "$RETELL_HTTP" = "200" ]; then
      echo "retell-llm is healthy."
      break
    fi
    sleep 5
    RETELL_RETRIES=$((RETELL_RETRIES+1))
  done
  if [ "$RETELL_HTTP" != "200" ]; then
    echo "WARNING: retell-llm did not respond on :3017. Check nginx and docker logs."
    docker compose -f docker-compose.prod.yml logs --tail=50 retell-llm || true
  fi
fi

echo "Deployment successful!"
