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
