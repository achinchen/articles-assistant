// Parse command line arguments FIRST, before any imports
const args = process.argv.slice(2);
const useSupabase = args.includes('--supabase') || args.includes('-s');
const useLocal = args.includes('--local') || args.includes('-l');

// Set environment flag BEFORE importing modules that use the database
if (useSupabase) {
  process.env.USE_SUPABASE = 'true';
  console.log('🚀 Running ingestion with Supabase database');
} else if (useLocal) {
  process.env.USE_SUPABASE = 'false';
  console.log('🚀 Running ingestion with local database');
} else {
  console.log('🚀 Running ingestion (auto-detecting database)');
  console.log('💡 Use --supabase or --local to force a specific database');
}

// Import AFTER setting environment variables
import { ingestAllArticles } from '@/ingestion';

async function main() {
  try {
    const result = await ingestAllArticles();
    
    if (result.errorCount > 0) {
      process.exit(1);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

main();
