import type { Locale } from '@/types/content';
import { query } from '@/db/client';
import { generateEmbedding } from '@/ingestion/embeddings';
import { QueryConfig, RetrievedChunk } from '@/query/types';
import { logger } from '@/utils/logger';

/**
 * Retrieve relevant chunks using vector similarity search
 * @param queryText - The text of the query
 * @param locale - The locale of the query
 * @param config - The configuration for the retrieval
 * @returns The retrieved chunks
 */
export async function retrieveRelevantChunks(
  queryText: string,
  locale: Locale | undefined,
  config: QueryConfig
): Promise<RetrievedChunk[]> {
  const startTime = Date.now();
  
  try {
    logger.info('Generating query embedding...');
    const queryEmbedding = await generateEmbedding(queryText);
    
    let sql = `
      SELECT 
        c.id as chunk_id,
        c.content,
        c.chunk_index,
        c.token_count,
        a.id as article_id,
        a.slug as article_slug,
        a.title as article_title,
        a.locale,
        1 - (e.embedding <=> $1::vector) as similarity
      FROM embeddings e
      JOIN chunks c ON e.chunk_id = c.id
      JOIN articles a ON c.article_id = a.id
      WHERE 1 - (e.embedding <=> $1::vector) >= $2
    `;

    const params: any[] = [JSON.stringify(queryEmbedding), config.similarityThreshold];
    let paramIndex = 3;
    
    if (locale) {
      sql += ` AND a.locale = $${paramIndex}`;
      params.push(locale);
      paramIndex++;
    }
    
    sql += `
      ORDER BY similarity DESC
      LIMIT $${paramIndex}
    `;
    params.push(config.topK);
    
    logger.info(`Searching for top ${config.topK} chunks...`);
    const result = await query(sql, params);
    
    const chunks: RetrievedChunk[] = result.rows.map(row => ({
      chunkId: row.chunk_id,
      articleId: row.article_id,
      articleSlug: row.article_slug,
      articleTitle: row.article_title,
      content: row.content,
      similarity: parseFloat(row.similarity),
      locale: row.locale,
      chunkIndex: row.chunk_index,
      tokenCount: row.token_count,
    }));
    
    const elapsed = Date.now() - startTime;
    logger.info(`Retrieved ${chunks.length} chunks in ${elapsed}ms`);
    
    if (chunks.length === 0) {
      logger.warn('No chunks found with threshold. Trying without threshold...');
      const debugSql = `
        SELECT 
          1 - (e.embedding <=> $1::vector) as similarity
        FROM embeddings e
        ORDER BY similarity DESC
        LIMIT 5
      `;
      const debugResult = await query(debugSql, [JSON.stringify(queryEmbedding)]);
      logger.info('Top 5 similarities without threshold:', 
        debugResult.rows.map(r => r.similarity)
      );

    } else {
      logger.info(`Similarity range: ${chunks[chunks.length - 1].similarity.toFixed(3)} - ${chunks[0].similarity.toFixed(3)}`);
    }
    
    return chunks;
    
  } catch (error) {
    logger.error('Error retrieving chunks:', error);
    throw new Error(`Retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
