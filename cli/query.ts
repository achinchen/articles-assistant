import { generateEmbedding } from '@/ingestion/embeddings';
import { searchSimilarChunks } from '@/db/query';
import { pool } from '@/db/client';
import { logger } from '@/utils/logger';

async function main() {
  const queryText = process.argv[2];

  if (!queryText) {
    logger.error('Usage: npm run query "<your question>"');
    logger.info('Example: npm run query "如何成為 Staff Engineer？"');
    process.exit(1);
  }

  logger.section('Semantic Search');
  logger.info(`Query: "${queryText}"\n`);

  logger.info('Generating query embedding...');
  const queryEmbedding = await generateEmbedding(queryText);
  logger.success('Embedding generated\n');

  logger.info('Searching similar chunks...\n');
  const results = await searchSimilarChunks(queryEmbedding, 5);

  results.forEach((row, i) => {
    console.log(`${i + 1}. Similarity: ${row.similarity.toFixed(4)} [${row.locale}]`);
    console.log(`   Article: ${row.title}`);
    if (row.series_name) {
      console.log(`   Series: ${row.series_name}`);
    }
    console.log(`   Content: ${row.content.substring(0, 150).replace(/\n/g, ' ')}...`);
    console.log('');
  });

  await pool.end();
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    logger.error('Error:', error);
    process.exit(1);
  });
