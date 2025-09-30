import { generateEmbedding } from '@/ingestion/embeddings';
import { searchSimilarChunks } from '@/db/query';
import { pool } from '@/db/client';

async function main() {
  const queryText = process.argv[2];

  if (!queryText) {
    console.error('Usage: npm run query "<your question>"');
    console.info('Example: npm run query "如何成為 Staff Engineer？"');
    process.exit(1);
  }

  console.info('Semantic Search');
  console.info(`Query: "${queryText}"\n`);

  console.info('Generating query embedding...');
  const queryEmbedding = await generateEmbedding(queryText);
  console.info('Embedding generated\n');

  console.info('Searching similar chunks...\n');
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
    console.error('Error:', error);
    process.exit(1);
  });
