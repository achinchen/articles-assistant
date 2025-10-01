import { buildContext } from '.';
import { RetrievedChunk } from '@/query/types';
import { DEFAULT_QUERY_CONFIG } from '@/query/constants';

describe('buildContext', () => {
  const mockChunks: RetrievedChunk[] = [
    {
      chunkId: '1',
      articleId: 'a1',
      articleSlug: 'test-1',
      articleTitle: 'Test Article 1',
      content: 'Content 1',
      similarity: 0.9,
      locale: 'zh',
      chunkIndex: 0,
      tokenCount: 100,
    },
    {
      chunkId: '2',
      articleId: 'a2',
      articleSlug: 'test-2',
      articleTitle: 'Test Article 2',
      content: 'Content 2',
      similarity: 0.8,
      locale: 'zh',
      chunkIndex: 0,
      tokenCount: 100,
    },
  ];
  
  it('should build formatted context from chunks', () => {
    const context = buildContext(mockChunks, DEFAULT_QUERY_CONFIG);
    
    expect(context.chunks).toHaveLength(2);
    expect(context.formattedContext).toContain('[1] 文章: Test Article 1');
    expect(context.formattedContext).toContain('Content 1');
    expect(context.formattedContext).toContain('[2] 文章: Test Article 2');
    expect(context.formattedContext).toContain('---');
  });
  
  it('should respect token budget', () => {
    const largeChunks: RetrievedChunk[] = Array.from({ length: 10 }, (_, i) => ({
      ...mockChunks[0],
      chunkId: `chunk-${i}`,
      tokenCount: 500,
    }));
    
    const context = buildContext(largeChunks, {
      ...DEFAULT_QUERY_CONFIG,
      maxContextTokens: 1000, // Only ~1-2 chunks should fit
    });
    
    expect(context.chunks.length).toBeLessThan(largeChunks.length);
    expect(context.totalTokens).toBeLessThanOrEqual(1000 + 100); // Allow some overhead
  });
  
  it('should handle empty chunks', () => {
    const context = buildContext([], DEFAULT_QUERY_CONFIG);
    
    expect(context.chunks).toHaveLength(0);
    expect(context.totalTokens).toBe(0);
    expect(context.formattedContext).toBe('');
  });
});
