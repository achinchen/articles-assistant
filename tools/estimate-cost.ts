import { scanArticles } from '@/ingestion/scanner/posts';
import { calculateWorkload } from '@/ingestion';
import { logger } from '@/utils/logger';

async function main() {
  logger.section('Cost Estimation');

  const articles = scanArticles();

  if (articles.length === 0) {
    logger.warn('No articles found');
    process.exit(0);
  }

  const workload = calculateWorkload(articles);

  console.log('\nBreakdown:');
  console.log(`  Model: text-embedding-3-small`);
  console.log(`  Price: $0.00002 per 1K tokens`);
  console.log(`  Total cost: $${workload.estimatedCost.toFixed(6)}`);

  if (workload.estimatedCost > 0.01) {
    logger.warn('Cost exceeds $0.01 - consider filtering');
  } else {
    logger.success('Cost is acceptable');
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    logger.error('Error:', error);
    process.exit(1);
  });