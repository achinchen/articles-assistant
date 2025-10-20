// Parse command line arguments FIRST, before any imports
const args = process.argv.slice(2);
const useSupabase = args.includes('--supabase') || args.includes('-s');
const useLocal = args.includes('--local') || args.includes('-l');

// Set environment flag BEFORE importing modules that use the database
if (useSupabase) {
  process.env.USE_SUPABASE = 'true';
  console.log('🚀 Starting API server with Supabase database');
} else if (useLocal) {
  process.env.USE_SUPABASE = 'false';
  console.log('🚀 Starting API server with local database');
} else {
  // Default behavior - auto-detect
  console.log('🚀 Starting API server (auto-detecting database)');
  console.log('💡 Use --supabase or --local to force a specific database');
}

// Import AFTER setting environment variables
import { startServer } from '@/api/server';
import { env } from '@/utils/env';
import { logger } from '@/utils/logger';

const port = env.PORT;

try {
  startServer(port);
} catch (error) {
  logger.error('Failed to start server:', error);
  process.exit(1);
}