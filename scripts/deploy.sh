#!/bin/bash
set -e

APP_DIR=$1

if [ -z "$APP_DIR" ]; then
    echo "Usage: ./deploy.sh <APP_DIR>"
    exit 1
fi

cd "$APP_DIR"

# Persist provider logos and other uploads across container rebuilds
mkdir -p "$APP_DIR/data/uploads/providers" "$APP_DIR/data/uploads/organizations"
chmod -R 775 "$APP_DIR/data/uploads" 2>/dev/null || true

# .env.production is already created by GitHub Action from secrets

# Backup current state for rollback
echo $(date +%s) > .last_version

# The image is built once in CI and pushed to ghcr.io (see .github/workflows/pipeline.yml) —
# this box only pulls and runs it, never runs `next build` itself. Log in if credentials were
# passed (CI always passes these; a manual rerun on an already-logged-in box can omit them).
if [ -n "${GHCR_USER:-}" ] && [ -n "${GHCR_PAT:-}" ]; then
  echo "$GHCR_PAT" | docker login ghcr.io -u "$GHCR_USER" --password-stdin
fi

echo "Pulling image and restarting containers..."
COMPOSE_PROFILES=""
if grep -qE '^RETELL_USE_CUSTOM_LLM=(true|1|on)' .env.production 2>/dev/null \
  || grep -qE '^RETELL_CUSTOM_LLM_WS_URL=.+' .env.production 2>/dev/null; then
  COMPOSE_PROFILES="--profile retell-custom-llm"
  echo "Custom LLM enabled — starting retell-llm service."
fi
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml down --remove-orphans
docker compose -f docker-compose.prod.yml $COMPOSE_PROFILES up -d

# Give the app time to start and run db migrations before polling
echo "Waiting 30s for app startup and DB migration..."
sleep 30

# Health check
echo "Waiting for app to be healthy..."
MAX_RETRIES=30
RETRY_COUNT=0
UNTIL_HEALTHY=0

# /api/health only returns schema details when X-Health-Token matches HEALTH_CHECK_TOKEN.
# Without a token (production), the body is minimal — but HTTP 200 + status healthy still
# means schema is in sync (see src/app/api/health/route.ts).
HEALTH_CHECK_TOKEN=$(grep -E '^HEALTH_CHECK_TOKEN=' .env.production 2>/dev/null | cut -d '=' -f2- | tr -d '\r')
if [ -z "$HEALTH_CHECK_TOKEN" ]; then
  echo "WARNING: HEALTH_CHECK_TOKEN is empty — accepting HTTP 200 + status healthy (no schemaInSync field)."
fi

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    HTTP_RESPONSE=$(curl -s -o /tmp/health_body -w "%{http_code}" -H "X-Health-Token: ${HEALTH_CHECK_TOKEN}" http://localhost:3015/api/health || echo "000")
    BODY=$(cat /tmp/health_body 2>/dev/null || echo "")
    echo "Attempt $RETRY_COUNT/$MAX_RETRIES — HTTP $HTTP_RESPONSE — $BODY"

    if [ "$HTTP_RESPONSE" = "200" ] && echo "$BODY" | grep -q '"status":"healthy"'; then
      # Detailed response: require schemaInSync when present.
      if echo "$BODY" | grep -q 'schemaInSync'; then
        if echo "$BODY" | grep -q '"schemaInSync":true'; then
          echo "App is healthy and database schema is in sync!"
          UNTIL_HEALTHY=1
          break
        fi
      else
        echo "App is healthy (schema details omitted without HEALTH_CHECK_TOKEN)."
        UNTIL_HEALTHY=1
        break
      fi
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
    echo "Stopping containers for safety..."
    docker compose -f docker-compose.prod.yml down
    exit 1
fi

echo "Seeding database..."
docker compose -f docker-compose.prod.yml exec -T app node dist/seed.js

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
  else
    echo "Syncing Retell agents to the production Custom LLM endpoint..."
    docker compose -f docker-compose.prod.yml exec -T app node dist/migrate-retell-to-custom-llm.js
  fi
fi

echo "Deployment successful!"
