// Sync local database data to Supabase
import { createClient } from '@supabase/supabase-js';
import { pool } from '@/db/client';
import { logger } from '@/utils/logger';

async function syncToSupabase() {
  // Initialize Supabase client
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  logger.info('🚀 Starting sync to Supabase...');

  try {
    // 1. Get articles from local database
    logger.info('📖 Fetching articles from local database...');
    const articlesResult = await pool.query(`
      SELECT id, slug, title, content, locale, frontmatter, source_file, source_commit, created_at, updated_at
      FROM articles 
      ORDER BY id
    `);
    
    logger.info(`Found ${articlesResult.rows.length} articles`);

    // 2. Clear existing data in Supabase (optional)
    logger.info('🧹 Clearing existing Supabase data...');
    await supabase.from('embeddings').delete().neq('id', 0);
    await supabase.from('chunks').delete().neq('id', 0);
    await supabase.from('articles').delete().neq('id', 0);

    // 3. Insert articles to Supabase
    logger.info('📝 Inserting articles to Supabase...');
    const articleIdMap = new Map();

    for (const article of articlesResult.rows) {
      const { data, error } = await supabase
        .from('articles')
        .insert({
          slug: article.slug,
          title: article.title,
          content: article.content,
          locale: article.locale,
          frontmatter: article.frontmatter,
          source_file: article.source_file,
          source_commit: article.source_commit
        })
        .select()
        .single();

      if (error) {
        logger.error(`Error inserting article ${article.id}:`, error);
        continue;
      }

      articleIdMap.set(article.id, data.id);
      logger.info(`✅ Article ${article.id} -> ${data.id}: ${article.title}`);
    }

    // 4. Get chunks from local database
    logger.info('📄 Fetching chunks from local database...');
    const chunksResult = await pool.query(`
      SELECT id, article_id, chunk_index, content, token_count, metadata, created_at
      FROM chunks 
      ORDER BY article_id, chunk_index
    `);

    logger.info(`Found ${chunksResult.rows.length} chunks`);

    // 5. Insert chunks to Supabase
    logger.info('📝 Inserting chunks to Supabase...');
    const chunkIdMap = new Map();

    for (const chunk of chunksResult.rows) {
      const newArticleId = articleIdMap.get(chunk.article_id);
      if (!newArticleId) {
        logger.error(`Article ID ${chunk.article_id} not found in mapping`);
        continue;
      }

      const { data, error } = await supabase
        .from('chunks')
        .insert({
          article_id: newArticleId,
          chunk_index: chunk.chunk_index,
          content: chunk.content,
          token_count: chunk.token_count,
          metadata: chunk.metadata
        })
        .select()
        .single();

      if (error) {
        logger.error(`Error inserting chunk ${chunk.id}:`, error);
        continue;
      }

      chunkIdMap.set(chunk.id, data.id);
    }

    logger.info(`✅ Inserted ${chunkIdMap.size} chunks`);

    // 6. Get embeddings from local database
    logger.info('🔮 Fetching embeddings from local database...');
    const embeddingsResult = await pool.query(`
      SELECT id, chunk_id, embedding, created_at
      FROM embeddings 
      ORDER BY chunk_id
    `);

    logger.info(`Found ${embeddingsResult.rows.length} embeddings`);

    // 7. Insert embeddings to Supabase (in batches)
    logger.info('📝 Inserting embeddings to Supabase...');
    let embeddingCount = 0;
    const batchSize = 10; // Smaller batches to avoid timeouts

    for (let i = 0; i < embeddingsResult.rows.length; i += batchSize) {
      const batch = embeddingsResult.rows.slice(i, i + batchSize);
      const batchData = [];

      for (const embedding of batch) {
        const newChunkId = chunkIdMap.get(embedding.chunk_id);
        if (!newChunkId) {
          logger.error(`Chunk ID ${embedding.chunk_id} not found in mapping`);
          continue;
        }

        batchData.push({
          chunk_id: newChunkId,
          embedding: embedding.embedding
        });
      }

      if (batchData.length > 0) {
        try {
          const { error } = await supabase
            .from('embeddings')
            .insert(batchData);

          if (error) {
            logger.error(`Error inserting embedding batch ${i / batchSize + 1}:`, error);
            // Try individual inserts for this batch
            for (const item of batchData) {
              try {
                await supabase.from('embeddings').insert(item);
                embeddingCount++;
              } catch (individualError) {
                logger.error(`Error inserting individual embedding:`, individualError);
              }
            }
          } else {
            embeddingCount += batchData.length;
            logger.info(`✅ Inserted batch ${i / batchSize + 1}/${Math.ceil(embeddingsResult.rows.length / batchSize)} (${batchData.length} embeddings)`);
          }
          
          // Small delay between batches
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          logger.error(`Batch insert failed:`, error);
        }
      }
    }

    logger.info(`✅ Inserted ${embeddingCount} embeddings`);

    // 8. Verify sync
    logger.info('🔍 Verifying sync...');
    const { count: supabaseArticleCount } = await supabase
      .from('articles')
      .select('*', { count: 'exact', head: true });

    const { count: supabaseChunkCount } = await supabase
      .from('chunks')
      .select('*', { count: 'exact', head: true });

    const { count: supabaseEmbeddingCount } = await supabase
      .from('embeddings')
      .select('*', { count: 'exact', head: true });

    logger.info('📊 Sync Summary:');
    logger.info(`   Articles: ${supabaseArticleCount}`);
    logger.info(`   Chunks: ${supabaseChunkCount}`);
    logger.info(`   Embeddings: ${supabaseEmbeddingCount}`);

    logger.info('🎉 Sync to Supabase completed successfully!');

  } catch (error) {
    logger.error('❌ Sync failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  syncToSupabase()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Sync failed:', error);
      process.exit(1);
    });
}

export { syncToSupabase };