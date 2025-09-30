#!/bin/bash

set -e

# Load .env if exists
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

DOCKER_CONTAINER=$(docker ps --filter "name=$DB_CONTAINER_NAME" --format "{{.Names}}" 2>/dev/null || echo "")

if [ -n "$DOCKER_CONTAINER" ]; then
  echo "📦 Connecting to PostgreSQL via Docker..."
  docker exec -it $DOCKER_CONTAINER psql -U postgres -d $POSTGRES_DB
else
  echo "💻 Connecting to local PostgreSQL..."
  if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL not set"
    exit 1
  fi
  psql $DATABASE_URL
fi