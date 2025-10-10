import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { hybridRetrieveChunks, DEFAULT_HYBRID_CONFIG, HybridSearchConfig } from './hybride';
import { DEFAULT_QUERY_CONFIG } from '@/query/constants';
import * as dbClient from '@/db/client';
import * as embeddings from '@/ingestion/embeddings';
import * as logger from '@/utils/logger';

// Mock dependencies
vi.mock('@/db/client');
vi.mock('@/ingestion/embeddings');
vi.mock('@/utils/logger');

const mockQuery = vi.mocked(dbClient.query);
const mockGenerateEmbedding = vi.mocked(embeddings.generateEmbedding);
const mockLogger = vi.mocked(logger.logger);

describe('hybridRetrieveChunks', () => {
  const mockEmbedding = [0.1, 0.2, 0.3];
  
  const mockDbRows = [
    {
      chunk_id: '1',
      content: 'First chunk about machine learning',
      chunk_index: 0,
      token_count: 100,
      article_id: 'a1',
      article_slug: 'ml-basics',
      article_title: 'Machine Learning Basics',
      locale: 'en',
      similarity: 0.85,
      weighted_vector: 0.6,
      weighted_keyword: 0.25,
      vector_similarity: 0.8
    },
    {
      chunk_id: '2',
      content: 'Second chunk about deep learning',
      chunk_index: 1,
      token_count: 150,
      article_id: 'a2',
      article_slug: 'deep-learning',
      article_title: 'Deep Learning Guide',
      locale: 'en',
      similarity: 0.75,
      weighted_vector: 0.5,
      weighted_keyword: 0.25,
      vector_similarity: 0.7
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockGenerateEmbedding.mockResolvedValue(mockEmbedding);
    mockQuery.mockResolvedValue({ rows: mockDbRows });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should successfully perform hybrid search with default config', async () => {
    const queryText = 'machine learning algorithms';
    const locale = 'en';
    const config = DEFAULT_HYBRID_CONFIG;

    const result = await hybridRetrieveChunks(queryText, locale, config);

    expect(mockGenerateEmbedding).toHaveBeenCalledWith(queryText);
    
    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toContain('WITH vector_scores AS');
    expect(sql).toContain('keyword_scores AS');
    expect(sql).toContain('combined_scores AS');
    expect(sql).toContain('FULL OUTER JOIN');
    
    expect(params).toEqual([
      JSON.stringify(mockEmbedding),
      'machine & learning & algorithms',
      config.vectorWeight,
      config.keywordWeight,
      config.similarityThreshold,
      locale,
      config.topK
    ]);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      chunkId: '1',
      articleId: 'a1',
      articleSlug: 'ml-basics',
      articleTitle: 'Machine Learning Basics',
      content: 'First chunk about machine learning',
      similarity: 0.85,
      locale: 'en',
      chunkIndex: 0,
      tokenCount: 100
    });
  });

  it('should process text query correctly for keyword search', async () => {
    const queryText = 'natural language processing and machine learning';
    
    await hybridRetrieveChunks(queryText, 'en', DEFAULT_HYBRID_CONFIG);

    const [sql, params] = mockQuery.mock.calls[0];
    expect(params[1]).toBe('natural & language & processing & machine & learning');
  });

  it('should filter out short words from text query', async () => {
    const queryText = 'AI is a big topic in ML';
    
    await hybridRetrieveChunks(queryText, 'en', DEFAULT_HYBRID_CONFIG);

    const [sql, params] = mockQuery.mock.calls[0];
    expect(params[1]).toBe('big & topic');
  });

  it('should handle queries without locale filter', async () => {
    await hybridRetrieveChunks('test query', undefined, DEFAULT_HYBRID_CONFIG);

    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).not.toContain('AND a.locale =');
    expect(params).toEqual([
      JSON.stringify(mockEmbedding),
      'test & query',
      DEFAULT_HYBRID_CONFIG.vectorWeight,
      DEFAULT_HYBRID_CONFIG.keywordWeight,
      DEFAULT_HYBRID_CONFIG.similarityThreshold,
      DEFAULT_HYBRID_CONFIG.topK
    ]);
  });

  it('should handle custom hybrid search configurations', async () => {
    const customConfig: HybridSearchConfig = {
      ...DEFAULT_QUERY_CONFIG,
      keywordWeight: 0.8,
      vectorWeight: 0.2,
      topK: 10,
      similarityThreshold: 0.5
    };

    await hybridRetrieveChunks('test', 'zh', customConfig);

    const [sql, params] = mockQuery.mock.calls[0];
    expect(params).toEqual([
      JSON.stringify(mockEmbedding),
      'test',
      0.2, // vectorWeight
      0.8, // keywordWeight
      0.5, // similarityThreshold
      'zh',
      10  // topK
    ]);
  });

  it('should handle empty results and perform debug query', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ 
        rows: [
          { similarity: 0.6 },
          { similarity: 0.4 },
          { similarity: 0.2 }
        ] 
      });

    const result = await hybridRetrieveChunks('test', 'en', DEFAULT_HYBRID_CONFIG);

    expect(result).toHaveLength(0);
    expect(mockQuery).toHaveBeenCalledTimes(2);
    expect(mockLogger.warn).toHaveBeenCalledWith('No chunks found with hybrid search');
    expect(mockLogger.info).toHaveBeenCalledWith(
      'Top 3 vector similarities:',
      [0.6, 0.4, 0.2]
    );
  });

  it('should log detailed scoring information for top result', async () => {
    await hybridRetrieveChunks('test', 'en', DEFAULT_HYBRID_CONFIG);

    expect(mockLogger.info).toHaveBeenCalledWith(
      'Top result: similarity=0.850 (vector=0.600, keyword=0.250)'
    );
  });

  it('should log hybrid search configuration', async () => {
    const config = {
      ...DEFAULT_HYBRID_CONFIG,
      topK: 8,
      vectorWeight: 0.6,
      keywordWeight: 0.4
    };

    await hybridRetrieveChunks('test', 'en', config);

    expect(mockLogger.info).toHaveBeenCalledWith(
      'Hybrid search: topK=8, weights=[vector:0.6, keyword:0.4]'
    );
  });

  it('should handle embedding generation errors', async () => {
    const error = new Error('Embedding service unavailable');
    mockGenerateEmbedding.mockRejectedValue(error);

    await expect(
      hybridRetrieveChunks('test', 'en', DEFAULT_HYBRID_CONFIG)
    ).rejects.toThrow('Hybrid retrieval failed: Embedding service unavailable');

    expect(mockLogger.error).toHaveBeenCalledWith('Hybrid retrieval error:', error);
  });

  it('should handle database query errors', async () => {
    const error = new Error('Database timeout');
    mockQuery.mockRejectedValue(error);

    await expect(
      hybridRetrieveChunks('test', 'en', DEFAULT_HYBRID_CONFIG)
    ).rejects.toThrow('Hybrid retrieval failed: Database timeout');

    expect(mockLogger.error).toHaveBeenCalledWith('Hybrid retrieval error:', error);
  });

  it('should handle unknown errors', async () => {
    mockQuery.mockRejectedValue('Unknown error type');

    await expect(
      hybridRetrieveChunks('test', 'en', DEFAULT_HYBRID_CONFIG)
    ).rejects.toThrow('Hybrid retrieval failed: Unknown error');
  });

  it('should log performance metrics', async () => {
    const startTime = Date.now();
    vi.spyOn(Date, 'now')
      .mockReturnValueOnce(startTime)
      .mockReturnValueOnce(startTime + 750);

    await hybridRetrieveChunks('test', 'en', DEFAULT_HYBRID_CONFIG);

    expect(mockLogger.info).toHaveBeenCalledWith('Generating query embedding...');
    expect(mockLogger.info).toHaveBeenCalledWith('Retrieved 2 chunks in 750ms');
  });

  it('should correctly parse numeric scores', async () => {
    const mockRowsWithStringScores = [{
      ...mockDbRows[0],
      similarity: '0.789123',
      weighted_vector: '0.456789',
      weighted_keyword: '0.123456'
    }];
    
    mockQuery.mockResolvedValue({ rows: mockRowsWithStringScores });

    const result = await hybridRetrieveChunks('test', 'en', DEFAULT_HYBRID_CONFIG);

    expect(result[0].similarity).toBe(0.789123);
    expect(typeof result[0].similarity).toBe('number');
    
    expect(mockLogger.info).toHaveBeenCalledWith(
      'Top result: similarity=0.789 (vector=0.457, keyword=0.123)'
    );
  });

  it('should handle empty or whitespace-only queries', async () => {
    await hybridRetrieveChunks('   ', 'en', DEFAULT_HYBRID_CONFIG);

    const [sql, params] = mockQuery.mock.calls[0];
    expect(params[1]).toBe('');
  });

  it('should build correct SQL with complex CTE structure', async () => {
    await hybridRetrieveChunks('test query', 'zh', DEFAULT_HYBRID_CONFIG);

    const [sql, params] = mockQuery.mock.calls[0];
    
    // Check CTE structure
    expect(sql).toContain('WITH vector_scores AS');
    expect(sql).toContain('keyword_scores AS');
    expect(sql).toContain('combined_scores AS');
    
    // Check vector similarity calculation
    expect(sql).toContain('1 - (e.embedding <=> $1::vector) as vector_similarity');
    
    // Check keyword scoring
    expect(sql).toContain('ts_rank_cd(c.content_tsv, to_tsquery(\'english\', $2))');
    expect(sql).toContain('c.content_tsv @@ to_tsquery(\'english\', $2)');
    
    // Check hybrid scoring
    expect(sql).toContain('COALESCE(v.vector_similarity, 0) * $3');
    expect(sql).toContain('COALESCE(k.keyword_score, 0) * $4');
    
    // Check joins and filtering
    expect(sql).toContain('FULL OUTER JOIN keyword_scores k');
    expect(sql).toContain('WHERE cs.hybrid_score >= $5');
    expect(sql).toContain('AND a.locale = $6');
    expect(sql).toContain('ORDER BY hybrid_score DESC');
  });

  it('should validate DEFAULT_HYBRID_CONFIG values', () => {
    expect(DEFAULT_HYBRID_CONFIG.keywordWeight).toBe(0.3);
    expect(DEFAULT_HYBRID_CONFIG.vectorWeight).toBe(0.7);
    expect(DEFAULT_HYBRID_CONFIG.minKeywordScore).toBe(0.1);
    expect(DEFAULT_HYBRID_CONFIG.topK).toBe(DEFAULT_QUERY_CONFIG.topK);
    expect(DEFAULT_HYBRID_CONFIG.similarityThreshold).toBe(DEFAULT_QUERY_CONFIG.similarityThreshold);
  });

  it('should handle queries with special characters', async () => {
    const queryText = 'test@query & special-chars';
    
    await hybridRetrieveChunks(queryText, 'en', DEFAULT_HYBRID_CONFIG);

    const [sql, params] = mockQuery.mock.calls[0];
    expect(params[1]).toBe('test@query & special-chars');
  });
});