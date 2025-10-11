import { retrieveRelevantChunks } from '.';
import { QueryConfig } from '@/query/types';
import { DEFAULT_QUERY_CONFIG } from '@/query/constants';
import * as dbClient from '@/db/client';
import * as embeddings from '@/ingestion/embeddings';
import * as logger from '@/utils/logger';

vi.mock('@/db/client');
vi.mock('@/ingestion/embeddings');
vi.mock('@/utils/logger');

const mockQuery = vi.mocked(dbClient.query);
const mockGenerateEmbedding = vi.mocked(embeddings.generateEmbedding);
const mockLogger = vi.mocked(logger.logger);

describe('retrieveRelevantChunks', () => {
  const mockEmbedding = [0.1, 0.2, 0.3];
  
  const mockDbRows = [
    {
      chunk_id: '1',
      content: 'First chunk content',
      chunk_index: 0,
      token_count: 100,
      article_id: 'a1',
      article_slug: 'article-1',
      article_title: 'First Article',
      locale: 'zh',
      similarity: 0.95
    },
    {
      chunk_id: '2',
      content: 'Second chunk content',
      chunk_index: 1,
      token_count: 150,
      article_id: 'a2',
      article_slug: 'article-2',
      article_title: 'Second Article',
      locale: 'en',
      similarity: 0.85
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

  it('should successfully retrieve relevant chunks with default config', async () => {
    const queryText = 'test query';
    const locale = 'zh';
    const config: QueryConfig = DEFAULT_QUERY_CONFIG;

    const result = await retrieveRelevantChunks(queryText, locale, config);

    expect(mockGenerateEmbedding).toHaveBeenCalledWith(queryText);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('SELECT'),
      expect.arrayContaining([
        JSON.stringify(mockEmbedding),
        config.similarityThreshold,
        locale,
        config.topK
      ])
    );

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      chunkId: '1',
      articleId: 'a1',
      articleSlug: 'article-1',
      articleTitle: 'First Article',
      content: 'First chunk content',
      similarity: 0.95,
      locale: 'zh',
      chunkIndex: 0,
      tokenCount: 100
    });
  });

  it('should handle queries without locale filter', async () => {
    const queryText = 'test query';
    const config: QueryConfig = DEFAULT_QUERY_CONFIG;

    await retrieveRelevantChunks(queryText, undefined, config);

    expect(mockQuery).toHaveBeenCalledWith(
      expect.not.stringContaining('AND a.locale ='),
      expect.arrayContaining([
        JSON.stringify(mockEmbedding),
        config.similarityThreshold,
        config.topK
      ])
    );
  });

  it('should handle custom query configurations', async () => {
    const customConfig: QueryConfig = {
      ...DEFAULT_QUERY_CONFIG,
      topK: 10,
      similarityThreshold: 0.7
    };

    await retrieveRelevantChunks('test', 'en', customConfig);

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('LIMIT'),
      expect.arrayContaining([
        JSON.stringify(mockEmbedding),
        0.7,
        'en',
        10
      ])
    );
  });

  it('should handle empty results and perform debug query', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ 
        rows: [
          { similarity: 0.2 },
          { similarity: 0.15 },
          { similarity: 0.1 }
        ] 
      });

    const result = await retrieveRelevantChunks('test', 'zh', DEFAULT_QUERY_CONFIG);

    expect(result).toHaveLength(0);
    expect(mockQuery).toHaveBeenCalledTimes(2);
    expect(mockLogger.warn).toHaveBeenCalledWith('No chunks found with threshold. Trying without threshold...');
    expect(mockLogger.info).toHaveBeenCalledWith(
      'Top 5 similarities without threshold:',
      [0.2, 0.15, 0.1]
    );
  });

  it('should log similarity range for successful results', async () => {
    await retrieveRelevantChunks('test', 'zh', DEFAULT_QUERY_CONFIG);

    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.stringContaining('Similarity range: 0.850 - 0.950')
    );
  });

  it('should handle embedding generation errors', async () => {
    const error = new Error('Embedding generation failed');
    mockGenerateEmbedding.mockRejectedValue(error);

    await expect(
      retrieveRelevantChunks('test', 'zh', DEFAULT_QUERY_CONFIG)
    ).rejects.toThrow('Retrieval failed: Embedding generation failed');

    expect(mockLogger.error).toHaveBeenCalledWith('Error retrieving chunks:', error);
  });

  it('should handle database query errors', async () => {
    const error = new Error('Database connection failed');
    mockQuery.mockRejectedValue(error);

    await expect(
      retrieveRelevantChunks('test', 'zh', DEFAULT_QUERY_CONFIG)
    ).rejects.toThrow('Retrieval failed: Database connection failed');

    expect(mockLogger.error).toHaveBeenCalledWith('Error retrieving chunks:', error);
  });

  it('should handle unknown errors', async () => {
    mockQuery.mockRejectedValue('Unknown error');

    await expect(
      retrieveRelevantChunks('test', 'zh', DEFAULT_QUERY_CONFIG)
    ).rejects.toThrow('Retrieval failed: Unknown error');
  });

  it('should log performance metrics', async () => {
    const startTime = Date.now();
    vi.spyOn(Date, 'now')
      .mockReturnValueOnce(startTime)
      .mockReturnValueOnce(startTime + 500);

    await retrieveRelevantChunks('test', 'zh', DEFAULT_QUERY_CONFIG);

    expect(mockLogger.info).toHaveBeenCalledWith('Generating query embedding...');
    expect(mockLogger.info).toHaveBeenCalledWith('Searching for top 5 chunks...');
    expect(mockLogger.info).toHaveBeenCalledWith('Retrieved 2 chunks in 500ms');
  });

  it('should correctly parse similarity scores', async () => {
    const mockRowsWithStringScores = [{
      ...mockDbRows[0],
      similarity: '0.123456789'
    }];
    
    mockQuery.mockResolvedValue({ rows: mockRowsWithStringScores });

    const result = await retrieveRelevantChunks('test', 'zh', DEFAULT_QUERY_CONFIG);

    expect(result[0].similarity).toBe(0.123456789);
    expect(typeof result[0].similarity).toBe('number');
  });

  it('should build correct SQL query with locale filter', async () => {
    await retrieveRelevantChunks('test', 'zh', DEFAULT_QUERY_CONFIG);

    const [sql, params] = mockQuery.mock.calls[0];
    
    expect(sql).toContain('WHERE 1 - (e.embedding <=> $1::vector) >= $2');
    expect(sql).toContain('AND a.locale = $3');
    expect(sql).toContain('ORDER BY similarity DESC');
    expect(sql).toContain('LIMIT $4');
    
    expect(params).toEqual([
      JSON.stringify(mockEmbedding),
      DEFAULT_QUERY_CONFIG.similarityThreshold,
      'zh',
      DEFAULT_QUERY_CONFIG.topK
    ]);
  });

  it('should build correct SQL query without locale filter', async () => {
    await retrieveRelevantChunks('test', undefined, DEFAULT_QUERY_CONFIG);

    const [sql, params] = mockQuery.mock.calls[0];
    
    expect(sql).not.toContain('AND a.locale =');
    expect(sql).toContain('LIMIT $3');
    
    expect(params).toEqual([
      JSON.stringify(mockEmbedding),
      DEFAULT_QUERY_CONFIG.similarityThreshold,
      DEFAULT_QUERY_CONFIG.topK
    ]);
  });
});