#!/bin/bash

set -e

if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

echo "⚠️  This will DELETE ALL DATA in the database!"
read -p "Are you sure? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
  echo "Cancelled"
  exit 0
fi

if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL not set in .env"
  exit 1
fi

echo "🗑️  Resetting database..."

DOCKER_CONTAINER=$(docker ps --filter "name=$DB_CONTAINER_NAME" --format "{{.Names}}" 2>/dev/null || echo "")

if [ -n "$DOCKER_CONTAINER" ]; then
  echo "📦 Using Docker container: $DOCKER_CONTAINER"
  
  docker exec -i $DOCKER_CONTAINER psql -U postgres -d $POSTGRES_DB << EOF
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
CREATE EXTENSION IF NOT EXISTS vector;
EOF
  
  echo "Creating schema..."
  docker exec -i $DOCKER_CONTAINER psql -U postgres -d $POSTGRES_DB < src/db/schema.sql
  
else
  echo "💻 Using local PostgreSQL"
  
  psql $DATABASE_URL << EOF
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
CREATE EXTENSION IF NOT EXISTS vector;
EOF
  
  echo "Creating schema..."
  psql $DATABASE_URL < src/db/schema.sql
fi

echo "✅ Database reset complete!"