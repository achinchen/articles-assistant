import {
    buildSources,
    extractCitations,
    validateCitations,
    formatSourcesForDisplay,
  } from '.';
  import { RetrievedChunk, Source } from '@/query/types';
import { ARTICLE_URI } from './constants';
  
  describe('buildSources', () => {
    const mockChunks: RetrievedChunk[] = [
      {
        chunkId: '1',
        articleId: 'a1',
        articleSlug: 'test-article',
        articleTitle: 'Test Article',
        content: 'Content here',
        similarity: 0.9,
        locale: 'zh',
        chunkIndex: 0,
        tokenCount: 100,
      },
    ];
    
    it('should build sources from chunks', () => {
      const sources = buildSources(mockChunks);
      
      expect(sources).toHaveLength(1);
      expect(sources[0]).toEqual({
        id: 1,
        articleSlug: 'test-article',
        articleTitle: 'Test Article',
        chunkContent: 'Content here',
        similarity: 0.9,
        locale: 'zh',
        url: `${ARTICLE_URI}${mockChunks[0].articleSlug}`,
      });
    });
    
    it('should deduplicate by articleSlug and use highest similarity', () => {
      const chunksWithDuplicates: RetrievedChunk[] = [
        {
          chunkId: '1',
          articleId: 'a1',
          articleSlug: 'test-article',
          articleTitle: 'Test Article',
          content: 'Content chunk 1',
          similarity: 0.8,
          locale: 'zh',
          chunkIndex: 0,
          tokenCount: 100,
        },
        {
          chunkId: '2',
          articleId: 'a1',
          articleSlug: 'test-article',
          articleTitle: 'Test Article',
          content: 'Content chunk 2',
          similarity: 0.9,
          locale: 'zh',
          chunkIndex: 1,
          tokenCount: 100,
        },
        {
          chunkId: '3',
          articleId: 'a2',
          articleSlug: 'another-article',
          articleTitle: 'Another Article',
          content: 'Another content',
          similarity: 0.7,
          locale: 'zh',
          chunkIndex: 0,
          tokenCount: 100,
        },
      ];
      
      const sources = buildSources(chunksWithDuplicates);
      
      expect(sources).toHaveLength(2);
      expect(sources[0].articleSlug).toBe('test-article');
      expect(sources[0].similarity).toBe(0.9); // Highest similarity chunk
      expect(sources[0].chunkContent).toBe('Content chunk 2');
      expect(sources[1].articleSlug).toBe('another-article');
      expect(sources[1].similarity).toBe(0.7);
    });
    
    it('should sort sources by similarity descending', () => {
      const chunks: RetrievedChunk[] = [
        {
          chunkId: '1',
          articleId: 'a1',
          articleSlug: 'low-similarity',
          articleTitle: 'Low Similarity Article',
          content: 'Content 1',
          similarity: 0.5,
          locale: 'zh',
          chunkIndex: 0,
          tokenCount: 100,
        },
        {
          chunkId: '2',
          articleId: 'a2',
          articleSlug: 'high-similarity',
          articleTitle: 'High Similarity Article',
          content: 'Content 2',
          similarity: 0.9,
          locale: 'zh',
          chunkIndex: 0,
          tokenCount: 100,
        },
      ];
      
      const sources = buildSources(chunks);
      
      expect(sources[0].articleSlug).toBe('high-similarity');
      expect(sources[0].similarity).toBe(0.9);
      expect(sources[1].articleSlug).toBe('low-similarity');
      expect(sources[1].similarity).toBe(0.5);
    });
  });
  
  describe('extractCitations', () => {
    it('should extract citation numbers', () => {
      const answer = 'This is from [1] and also [2] and [3]';
      const citations = extractCitations(answer);
      
      expect(citations).toEqual([1, 2, 3]);
    });
    
    it('should handle duplicate citations', () => {
      const answer = 'Source [1] is important [1] really important [1]';
      const citations = extractCitations(answer);
      
      expect(citations).toEqual([1]);
    });
    
    it('should handle no citations', () => {
      const answer = 'No citations here';
      const citations = extractCitations(answer);
      
      expect(citations).toEqual([]);
    });
    
    it('should sort citations', () => {
      const answer = '[3] and [1] and [2]';
      const citations = extractCitations(answer);
      
      expect(citations).toEqual([1, 2, 3]);
    });
  });
  
  describe('validateCitations', () => {
    const mockSources: Source[] = [
      {
        id: 1,
        articleSlug: 'test',
        articleTitle: 'Test',
        chunkContent: 'Content',
        similarity: 0.9,
        locale: 'zh',
      },
      {
        id: 2,
        articleSlug: 'test2',
        articleTitle: 'Test 2',
        chunkContent: 'Content 2',
        similarity: 0.8,
        locale: 'zh',
      },
    ];
    
    it('should validate correct citations', () => {
      const answer = 'Info from [1] and [2]';
      expect(validateCitations(answer, mockSources)).toBe(true);
    });
    
    it('should invalidate out-of-range citations', () => {
      const answer = 'Info from [3]';
      expect(validateCitations(answer, mockSources)).toBe(false);
    });
    
    it('should handle no citations', () => {
      const answer = 'No citations';
      expect(validateCitations(answer, mockSources)).toBe(true);
    });
  });
  
  describe('formatSourcesForDisplay', () => {
    it('should format sources', () => {
      const sources: Source[] = [
        {
          id: 1,
          articleSlug: 'test',
          articleTitle: 'Test Article',
          chunkContent: 'Content',
          similarity: 0.895,
          locale: 'zh',
        },
      ];
      
      const formatted = formatSourcesForDisplay(sources, 'zh');

      console.log(formatted);
      expect(formatted).toContain('📚 參考來源');
      expect(formatted).toContain('[1] Test Article');
      expect(formatted).toContain('0.895');
    });
    
    it('should handle empty sources', () => {
      const formatted = formatSourcesForDisplay([]);
      expect(formatted).toBe('');
    });
  });