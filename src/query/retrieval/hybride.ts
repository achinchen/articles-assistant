import { query } from '@/db/client';
import { generateEmbedding } from '@/ingestion/embeddings';
import { Locale } from '@/types/content';
import { QueryConfig, RetrievedChunk } from '@/query/types';
import { logger } from '@/utils/logger';
import { DEFAULT_QUERY_CONFIG } from '@/query/constants';

export interface HybridSearchConfig extends QueryConfig {
  keywordWeight: number;    // 0-1, weight for keyword search
  vectorWeight: number;      // 0-1, weight for vector search
  minKeywordScore?: number;  // Minimum keyword match score
}

export const DEFAULT_HYBRID_CONFIG: HybridSearchConfig = {
  ...DEFAULT_QUERY_CONFIG,
  keywordWeight: 0.3,
  vectorWeight: 0.7,
  minKeywordScore: 0.1,
};

/**
 * Hybrid search: combines keyword (BM25) and vector (cosine similarity) search
 * Score = (keywordWeight * keyword_score) + (vectorWeight * vector_score)
 */
export async function hybridRetrieveChunks(
  queryText: string,
  locale: Locale | undefined,
  config: HybridSearchConfig | unknown
): Promise<RetrievedChunk[]> {
  const startTime = Date.now();
  
  try {
    logger.info('Generating query embedding...');
    const queryEmbedding = await generateEmbedding(queryText);
    
    const tsQuery = queryText
      .trim()
      .split(/\s+/)
      .filter(word => word.length > 2)
      .join(' & ');
        
    let sql = `
      WITH vector_scores AS (
        SELECT 
          c.id as chunk_id,
          1 - (e.embedding <=> $1::vector) as vector_similarity
        FROM embeddings e
        JOIN chunks c ON e.chunk_id = c.id
      ),
      keyword_scores AS (
        SELECT 
          c.id as chunk_id,
          ts_rank_cd(c.content_tsv, to_tsquery('english', $2)) as keyword_score
        FROM chunks c
        WHERE c.content_tsv @@ to_tsquery('english', $2)
      ),
      combined_scores AS (
        SELECT 
          COALESCE(v.chunk_id, k.chunk_id) as chunk_id,
          COALESCE(v.vector_similarity, 0) * $3 as weighted_vector,
          COALESCE(k.keyword_score, 0) * $4 as weighted_keyword,
          (COALESCE(v.vector_similarity, 0) * $3 + COALESCE(k.keyword_score, 0) * $4) as hybrid_score,
          COALESCE(v.vector_similarity, 0) as vector_similarity
        FROM vector_scores v
        FULL OUTER JOIN keyword_scores k ON v.chunk_id = k.chunk_id
      )
      SELECT 
        c.id as chunk_id,
        c.content,
        c.chunk_index,
        c.token_count,
        a.id as article_id,
        a.slug as article_slug,
        a.title as article_title,
        a.locale,
        cs.hybrid_score as similarity,
        cs.weighted_vector,
        cs.weighted_keyword,
        cs.vector_similarity
      FROM combined_scores cs
      JOIN chunks c ON cs.chunk_id = c.id
      JOIN articles a ON c.article_id = a.id
      WHERE cs.hybrid_score >= $5
    `;
    
    const params: any[] = [
      JSON.stringify(queryEmbedding),  // $1: vector
      tsQuery,                          // $2: text query
      config.vectorWeight,              // $3: vector weight
      config.keywordWeight,             // $4: keyword weight
      config.similarityThreshold,       // $5: threshold
    ];
    let paramIndex = 6;
    
    if (locale) {
      sql += ` AND a.locale = $${paramIndex}`;
      params.push(locale);
      paramIndex++;
    }
    
    sql += `
      ORDER BY hybrid_score DESC
      LIMIT $${paramIndex}
    `;
    params.push(config.topK);
    
    logger.info(
      `Hybrid search: topK=${config.topK}, ` +
      `weights=[vector:${config.vectorWeight}, keyword:${config.keywordWeight}]`
    );
    
    const result = await query(sql, params);
    
    if (result.rows.length === 0) {
      logger.warn('No chunks found with hybrid search');
      
      const vectorOnlyResult = await query(`
        SELECT 1 - (e.embedding <=> $1::vector) as similarity
        FROM embeddings e
        ORDER BY similarity DESC
        LIMIT 3
      `, [JSON.stringify(queryEmbedding)]);
      
      logger.info('Top 3 vector similarities:', 
        vectorOnlyResult.rows.map(r => r.similarity)
      );
    }
    
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
    
    if (chunks.length > 0) {
      const top = chunks[0];
      const row = result.rows[0];
      logger.info(
        `Top result: similarity=${top.similarity.toFixed(3)} ` +
        `(vector=${parseFloat(row.weighted_vector).toFixed(3)}, ` +
        `keyword=${parseFloat(row.weighted_keyword).toFixed(3)})`
      );
    }
    
    return chunks;
    
  } catch (error) {
    logger.error('Hybrid retrieval error:', error);
    throw new Error(
      `Hybrid retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}