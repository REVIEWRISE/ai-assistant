#!/bin/sh
set -eu
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
sh "$ROOT/scripts/with-env.sh" npx prisma db push
sh "$ROOT/scripts/with-env.sh" npx prisma generate
