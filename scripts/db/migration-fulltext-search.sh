
#!/bin/bash

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "🔄 Adding full-text search support..."

# Load environment
if [ -f "$PROJECT_ROOT/.env" ]; then
  source "$PROJECT_ROOT/.env"
fi

# Execute migration
docker exec -i articles-assistant-db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" < "$PROJECT_ROOT/src/db/schema-hybrid.sql"

echo "✅ Full-text search migration complete!"
echo ""
echo "You can now use hybrid search in queries."