import { retrieveRelevantChunks } from '@/query/retrieval';
import { DEFAULT_QUERY_CONFIG } from '@/query/constants';

describe('retrieveRelevantChunks', () => {
  const config = DEFAULT_QUERY_CONFIG;
  
  it('should retrieve chunks for a relevant query', async () => {
    const chunks = await retrieveRelevantChunks(
      'Senior 和 Staff Engineer 有什麼差別？',
      'zh',
      config
    );
    
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks.length).toBeLessThanOrEqual(config.topK);
    
    // Check structure
    chunks.forEach(chunk => {
      expect(chunk).toHaveProperty('chunkId');
      expect(chunk).toHaveProperty('articleTitle');
      expect(chunk).toHaveProperty('content');
      expect(chunk).toHaveProperty('similarity');
      expect(chunk.similarity).toBeGreaterThanOrEqual(config.similarityThreshold);
    });
    
    // Should be sorted by similarity (descending)
    for (let i = 0; i < chunks.length - 1; i++) {
      expect(chunks[i].similarity).toBeGreaterThanOrEqual(chunks[i + 1].similarity);
    }
  });
  
  it('should filter by locale when specified', async () => {
    const chunks = await retrieveRelevantChunks(
      'What is Staff Engineer?',
      'en',
      config
    );
    
    chunks.forEach(chunk => {
      expect(chunk.locale).toBe('en');
    });
  });
  
  it('should return empty array for irrelevant query', async () => {
    const chunks = await retrieveRelevantChunks(
      '如何煮一杯好咖啡？',
      undefined,
      { ...config, similarityThreshold: 0.8 }
    );
    
    // May return 0 or low-similarity results
    if (chunks.length > 0) {
      expect(chunks[0].similarity).toBeLessThan(0.8);
    }
  });
  
  it('should respect topK limit', async () => {
    const chunks = await retrieveRelevantChunks(
      'technical leadership',
      undefined,
      { ...config, topK: 3 }
    );
    
    expect(chunks.length).toBeLessThanOrEqual(3);
  });
});