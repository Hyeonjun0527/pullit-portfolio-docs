#!/usr/bin/env bash
set -euo pipefail
readonly APP_DIR=/opt/pullit/docs
readonly COMPOSE_FILE="$APP_DIR/docker-compose.prod.yml"
readonly ENV_FILE="$APP_DIR/pullit-docs-production.env"
cd "$APP_DIR"
chmod 600 "$ENV_FILE"
docker network inspect yeon-edge >/dev/null
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" config --quiet
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" pull pullit-docs
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d pullit-docs-db
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" run --rm --no-deps pullit-docs npx prisma migrate deploy
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" run --rm --no-deps pullit-docs node prisma/seed.js
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d pullit-docs
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T pullit-docs \
  node -e "fetch('http://localhost:3000/healthz').then(response => process.exit(response.ok ? 0 : 1))"
