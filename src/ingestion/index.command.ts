import { query, pool } from '@/db/client';
import { getDatabaseStats, checkDataIntegrity } from '@/db/query';
import { logger } from '@/utils/logger';

async function main() {
  logger.section('Data Verification');

  logger.info('Test 1: Articles');
  const articles = await query(`
    SELECT id, title, slug, locale 
    FROM articles 
    ORDER BY locale, slug
  `);
  
  logger.success(`Found ${articles.rows.length} articles`);
  articles.rows.slice(0, 3).forEach(row => {
    console.log(`  - [${row.locale}] ${row.title}`);
  });
  if (articles.rows.length > 3) {
    console.log(`  ... and ${articles.rows.length - 3} more`);
  }
  console.log('');

  logger.info('Test 2: Chunks');
  const chunks = await query(`
    SELECT a.title, a.locale, COUNT(c.id) as chunk_count
    FROM articles a
    LEFT JOIN chunks c ON a.id = c.article_id
    GROUP BY a.id, a.title, a.locale
    ORDER BY a.locale, a.title
  `);
  
  logger.success('Chunks per article:');
  chunks.rows.slice(0, 3).forEach(row => {
    console.log(`  - [${row.locale}] ${row.title}: ${row.chunk_count} chunks`);
  });
  if (chunks.rows.length > 3) {
    console.log(`  ... and ${chunks.rows.length - 3} more`);
  }
  console.log('');

  logger.info('Test 3: Embeddings');
  const stats = await getDatabaseStats();
  logger.success(`Total embeddings: ${stats.totalEmbeddings}`);
  
  const dimensions = await query(`
    SELECT vector_dims(embedding) as dimensions
    FROM embeddings
    LIMIT 1
  `);
  logger.success(`Embedding dimensions: ${dimensions.rows[0].dimensions}`);
  console.log('');

  logger.info('Test 4: Vector Similarity Search');
  const randomEmbedding = await query(`
    SELECT e.embedding, c.content, a.title
    FROM embeddings e
    JOIN chunks c ON e.chunk_id = c.id
    JOIN articles a ON c.article_id = a.id
    ORDER BY RANDOM()
    LIMIT 1
  `);

  if (randomEmbedding.rows.length > 0) {
    const queryVector = randomEmbedding.rows[0].embedding;
    console.log(`Query: "${randomEmbedding.rows[0].content.substring(0, 60)}..."`);
    console.log(`From: ${randomEmbedding.rows[0].title}\n`);

    const similar = await query(`
      SELECT 
        c.content, 
        a.title,
        a.locale,
        1 - (e.embedding <=> $1::vector) as similarity
      FROM embeddings e
      JOIN chunks c ON e.chunk_id = c.id
      JOIN articles a ON c.article_id = a.id
      ORDER BY e.embedding <=> $1::vector
      LIMIT 3
    `, [queryVector]);

    similar.rows.forEach((row, i) => {
      console.log(`  ${i + 1}. Similarity: ${row.similarity.toFixed(4)} [${row.locale}]`);
      console.log(`     ${row.title}`);
      console.log(`     ${row.content.substring(0, 80)}...\n`);
    });
  }

  // Test 5: Data integrity
  logger.info('Test 5: Data Integrity');
  const integrity = await checkDataIntegrity();
  
  if (integrity.articlesWithoutChunks > 0) {
    logger.warn(`Found ${integrity.articlesWithoutChunks} articles without chunks`);
  } else {
    logger.success('All articles have chunks');
  }

  if (integrity.chunksWithoutEmbeddings > 0) {
    logger.warn(`Found ${integrity.chunksWithoutEmbeddings} chunks without embeddings`);
  } else {
    logger.success('All chunks have embeddings');
  }

  logger.success('Verification complete!');
  await pool.end();
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    logger.error('Verification failed:', error);
    process.exit(1);
  });