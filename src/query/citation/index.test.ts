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
    
    it('should assign sequential IDs', () => {
      const sources = buildSources([...mockChunks, ...mockChunks]);
      
      expect(sources[0].id).toBe(1);
      expect(sources[1].id).toBe(2);
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