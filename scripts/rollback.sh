#!/bin/bash
set -e

APP_DIR=$1

if [ -z "$APP_DIR" ]; then
    echo "Usage: ./rollback.sh <APP_DIR>"
    exit 1
fi

cd "$APP_DIR"

if [ -f ".last_version" ]; then
    LAST_VERSION=$(cat .last_version)
    echo "Rolling back to version $LAST_VERSION..."
    git checkout "$LAST_VERSION"
    docker compose -f docker-compose.prod.yml up -d --build
    echo "Rollback complete!"
else
    echo "No previous version found to rollback to."
    exit 1
fi
