import { QueryEnhancementService } from './index';

describe('Query Enhancement Service', () => {
  beforeEach(() => {
    // Reset to default config before each test
    QueryEnhancementService.updateConfig({
      enabled: true,
      minQueryLength: 3,
      maxQueryLength: 15,
      expansionModel: 'gpt-4o-mini',
      temperature: 0.3,
      maxTokens: 150,
    });
  });

  it('should identify queries that need enhancement', () => {
    // Short queries that should be enhanced
    expect(QueryEnhancementService.shouldEnhance('staff')).toBe(true);
    expect(QueryEnhancementService.shouldEnhance('react')).toBe(true);
    expect(QueryEnhancementService.shouldEnhance('系統設計')).toBe(true);
    expect(QueryEnhancementService.shouldEnhance('what is staff')).toBe(true);

    // Queries that should NOT be enhanced
    expect(QueryEnhancementService.shouldEnhance('What is a Staff Engineer and how do I become one?')).toBe(false); // Too long
    expect(QueryEnhancementService.shouldEnhance('ab')).toBe(false); // Too short
    expect(QueryEnhancementService.shouldEnhance('This is a long query with many words')).toBe(false); // Too many words
  });

  it('should respect configuration settings', () => {
    // Disable enhancement
    QueryEnhancementService.updateConfig({ enabled: false });
    expect(QueryEnhancementService.shouldEnhance('staff')).toBe(false);

    // Re-enable and test length limits
    QueryEnhancementService.updateConfig({ 
      enabled: true,
      minQueryLength: 5,
      maxQueryLength: 10 
    });

    expect(QueryEnhancementService.shouldEnhance('ab')).toBe(false); // Below min
    expect(QueryEnhancementService.shouldEnhance('staff')).toBe(true); // Within range
    expect(QueryEnhancementService.shouldEnhance('this is very long')).toBe(false); // Above max
  });

  it('should update and get configuration correctly', () => {
    const originalConfig = QueryEnhancementService.getConfig();
    expect(originalConfig.enabled).toBe(true);
    expect(originalConfig.minQueryLength).toBe(3);

    const newConfig = {
      enabled: false,
      minQueryLength: 5,
      temperature: 0.5,
    };

    QueryEnhancementService.updateConfig(newConfig);
    const updatedConfig = QueryEnhancementService.getConfig();

    expect(updatedConfig.enabled).toBe(false);
    expect(updatedConfig.minQueryLength).toBe(5);
    expect(updatedConfig.temperature).toBe(0.5);
    // Other properties should remain unchanged
    expect(updatedConfig.maxQueryLength).toBe(originalConfig.maxQueryLength);
    expect(updatedConfig.expansionModel).toBe(originalConfig.expansionModel);
  });

  it('should handle enhancement gracefully when disabled', async () => {
    QueryEnhancementService.updateConfig({ enabled: false });

    const query = "staff";
    
    // Should not attempt enhancement when disabled
    expect(QueryEnhancementService.shouldEnhance(query)).toBe(false);
  });

  it('should generate search variations correctly', () => {
    const mockEnhancement = {
      originalQuery: 'staff',
      enhancedQuery: 'What is a Staff Engineer role?',
      expansions: ['staff engineer', 'senior engineer'],
      synonyms: ['engineer', 'developer'],
      relatedTerms: ['technical lead', 'architect'],
      confidence: 0.8,
    };

    const variations = QueryEnhancementService.generateSearchVariations(mockEnhancement);

    expect(Array.isArray(variations)).toBe(true);
    expect(variations.length).toBeGreaterThan(0);
    expect(variations.length).toBeLessThanOrEqual(5); // Should limit to 5

    // Should include original and enhanced queries
    expect(variations).toContain('staff');
    expect(variations).toContain('What is a Staff Engineer role?');

    // Should include expansions
    expect(variations).toContain('staff engineer');
    expect(variations).toContain('senior engineer');

    // Should include combinations with synonyms
    expect(variations.some(v => v.includes('staff') && v.includes('engineer'))).toBe(true);

    // All variations should be valid (non-empty, reasonable length)
    variations.forEach(variation => {
      expect(variation.trim().length).toBeGreaterThan(2);
    });
  });

  it('should handle edge cases in search variations', () => {
    const emptyEnhancement = {
      originalQuery: 'test',
      enhancedQuery: 'test',
      expansions: [],
      synonyms: [],
      relatedTerms: [],
      confidence: 0.5,
    };

    const variations = QueryEnhancementService.generateSearchVariations(emptyEnhancement);

    expect(variations).toBeDefined();
    expect(variations.length).toBeGreaterThan(0);
    expect(variations).toContain('test');
  });

  it('should filter out short terms in related terms', () => {
    const mockEnhancement = {
      originalQuery: 'react',
      enhancedQuery: 'React JavaScript library',
      expansions: [],
      synonyms: [],
      relatedTerms: ['js', 'a', 'javascript', 'framework'], // 'js' and 'a' should be filtered
      confidence: 0.7,
    };

    const variations = QueryEnhancementService.generateSearchVariations(mockEnhancement);

    expect(variations).toContain('javascript');
    expect(variations).toContain('framework');
    expect(variations).not.toContain('js'); // Should be filtered out (length <= 2)
    expect(variations).not.toContain('a'); // Should be filtered out (length <= 2)
  });
});