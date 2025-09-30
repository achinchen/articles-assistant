#!/bin/bash

set -e

if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

echo "🗄️  Setting up database..."

if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL not set in .env"
  echo "Please create .env file with DATABASE_URL"
  exit 1
fi

DOCKER_CONTAINER=$(docker ps --filter "name=$DB_CONTAINER_NAME" --format "{{.Names}}" 2>/dev/null || echo "")

if [ -n "$DOCKER_CONTAINER" ]; then
  echo "📦 Using Docker container: $DOCKER_CONTAINER"
  
  echo "Creating schema..."
  docker exec -i $DOCKER_CONTAINER psql -U postgres -d $POSTGRES_DB < src/db/schema.sql
  
else
  echo "💻 Using local PostgreSQL"
  
  echo "Creating schema..."
  psql $DATABASE_URL < src/db/schema.sql
fi

echo "✅ Database setup complete!"