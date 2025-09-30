import { getDatabaseStats } from '@/ingestion';
import { pool } from '@/db/client';
import { logger } from '@/utils/logger';

async function main() {
  logger.section('Database Statistics');

  const stats = await getDatabaseStats();

  console.log(`Total Articles: ${stats.totalArticles}`);
  console.log(`Total Chunks: ${stats.totalChunks}`);
  console.log(`Total Embeddings: ${stats.totalEmbeddings}`);

  if (stats.byLocale.length > 0) {
    console.log('\nBy Locale:');
    stats.byLocale.forEach(row => {
      console.log(`  ${row.locale}: ${row.count} articles`);
    });
  }

  if (stats.bySeries.length > 0) {
    console.log('\nBy Series:');
    stats.bySeries.forEach(row => {
      console.log(`  [${row.locale}] ${row.seriesName}: ${row.count} articles`);
    });
  }

  await pool.end();
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    logger.error('Error:', error);
    process.exit(1);
  });
