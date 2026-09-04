#!/usr/bin/env bash
set -euo pipefail
readonly APP_DIR=/opt/pullit/docs
readonly COMPOSE_FILE="$APP_DIR/docker-compose.prod.yml"
readonly ENV_FILE="$APP_DIR/pullit-docs-production.env"
cd "$APP_DIR"
chmod 600 "$ENV_FILE"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" config --quiet
docs_image="$(sed -n 's/^PULLIT_DOCS_IMAGE=//p' "$ENV_FILE" | tail -n 1)"
if [ -z "$docs_image" ]; then
  echo "PULLIT_DOCS_IMAGE가 비어 있습니다." >&2
  exit 1
fi
if ! docker image inspect "$docs_image" >/dev/null 2>&1; then
  docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" pull pullit-docs
fi
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d pullit-docs-db
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" run --rm --no-deps pullit-docs npx prisma migrate deploy
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" run --rm --no-deps pullit-docs node prisma/seed.js
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d pullit-docs
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T pullit-docs \
  node -e "fetch('http://localhost:3000/healthz').then(response => process.exit(response.ok ? 0 : 1))"
