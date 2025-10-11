#!/bin/bash
# scripts/db/migrate-analytics.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "🔄 Running analytics migration..."

# Load environment
if [ -f "$PROJECT_ROOT/.env" ]; then
  source "$PROJECT_ROOT/.env"
fi

# Execute migration
docker exec -i articles-assistant-db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" < "$PROJECT_ROOT/src/db/schema-analytics.sql"

echo "✅ Analytics migration complete!"
echo ""
echo "New tables created:"
echo "  - query_logs"
echo "  - feedback"
echo "  - performance_metrics"
echo "  - cost_tracking"
echo "  - popular_queries"
echo "  - failed_queries"
echo ""