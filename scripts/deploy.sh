#!/bin/bash
set -e

APP_DIR=$1

if [ -z "$APP_DIR" ]; then
    echo "Usage: ./deploy.sh <APP_DIR>"
    exit 1
fi

cd "$APP_DIR"

# .env.production is already created by GitHub Action from secrets

# Backup current state for rollback
echo $(date +%s) > .last_version

# Build and restart containers
echo "Building and starting containers..."
docker compose -f docker-compose.prod.yml pull || true
docker compose -f docker-compose.prod.yml down --remove-orphans
docker compose -f docker-compose.prod.yml up -d --build

# Health check
echo "Waiting for app to be healthy..."
MAX_RETRIES=20
RETRY_COUNT=0
UNTIL_HEALTHY=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -sf http://localhost:3015/api/health | grep -q '"status":"healthy"'; then
        echo "App is healthy!"
        UNTIL_HEALTHY=1
        break
    fi
    echo "Waiting... ($RETRY_COUNT/$MAX_RETRIES)"
    sleep 10
    RETRY_COUNT=$((RETRY_COUNT+1))
done

if [ $UNTIL_HEALTHY -eq 0 ]; then
    echo "App failed to become healthy after ${MAX_RETRIES} attempts."
    echo "Stopping containers for safety..."
    docker compose -f docker-compose.prod.yml down
    exit 1
fi

echo "Deployment successful!"
