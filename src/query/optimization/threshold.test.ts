import { ThresholdOptimizer } from './threshold';
import type { RetrievedChunk } from '@/query/types';

describe('Threshold Optimizer', () => {
  beforeEach(() => {
    // Reset to default config and clear history before each test
    ThresholdOptimizer.updateConfig({
      enabled: true,
      minThreshold: 0.2,
      maxThreshold: 0.8,
      baseThreshold: 0.3,
      queryLengthFactor: 0.1,
      resultCountFactor: 0.05,
      similaritySpreadFactor: 0.15,
      adaptiveEnabled: true,
      learningRate: 0.1,
      historySize: 100,
    });
    ThresholdOptimizer.clearHistory();
  });

  it('should calculate optimal threshold based on query characteristics', () => {
    // Short query should get lower threshold (more permissive)
    const shortThreshold = ThresholdOptimizer.calculateOptimalThreshold('AI', 2, 'en', false);
    
    // Long query should get higher threshold (more selective)
    const longThreshold = ThresholdOptimizer.calculateOptimalThreshold(
      'What are the best practices for implementing microservices architecture in a large scale system?', 
      100, 
      'en', 
      false
    );
    
    // Medium query should be in between
    const mediumThreshold = ThresholdOptimizer.calculateOptimalThreshold(
      'How to become a Staff Engineer?', 
      30, 
      'en', 
      false
    );

    expect(shortThreshold).toBeLessThan(mediumThreshold);
    expect(mediumThreshold).toBeLessThanOrEqual(longThreshold);
    
    // All thresholds should be within bounds
    expect(shortThreshold).toBeGreaterThanOrEqual(0.2);
    expect(shortThreshold).toBeLessThanOrEqual(0.8);
    expect(longThreshold).toBeGreaterThanOrEqual(0.2);
    expect(longThreshold).toBeLessThanOrEqual(0.8);
  });

  it('should adjust threshold for hybrid search', () => {
    const vectorThreshold = ThresholdOptimizer.calculateOptimalThreshold('test query', 10, 'en', false);
    const hybridThreshold = ThresholdOptimizer.calculateOptimalThreshold('test query', 10, 'en', true);
    
    // Hybrid search should be slightly more permissive
    expect(hybridThreshold).toBeLessThanOrEqual(vectorThreshold);
  });

  it('should adjust threshold for different languages', () => {
    const englishThreshold = ThresholdOptimizer.calculateOptimalThreshold('test query', 10, 'en', false);
    const chineseThreshold = ThresholdOptimizer.calculateOptimalThreshold('測試查詢', 10, 'zh', false);
    
    // Chinese should be slightly more permissive
    expect(chineseThreshold).toBeLessThanOrEqual(englishThreshold);
  });

  it('should respect configuration bounds', () => {
    // Test with extreme values that should be clamped
    const veryShortThreshold = ThresholdOptimizer.calculateOptimalThreshold('a', 1, 'en', false);
    const veryLongThreshold = ThresholdOptimizer.calculateOptimalThreshold('a'.repeat(1000), 1000, 'en', false);
    
    expect(veryShortThreshold).toBeGreaterThanOrEqual(0.2); // Min threshold
    expect(veryShortThreshold).toBeLessThanOrEqual(0.8); // Max threshold
    expect(veryLongThreshold).toBeGreaterThanOrEqual(0.2); // Min threshold
    expect(veryLongThreshold).toBeLessThanOrEqual(0.8); // Max threshold
  });

  it('should record and retrieve performance data', () => {
    const mockChunks: RetrievedChunk[] = [
      {
        chunkId: '1',
        articleId: '1',
        articleSlug: 'test-article',
        articleTitle: 'Test Article',
        content: 'Test content',
        similarity: 0.8,
        locale: 'en',
        chunkIndex: 0,
        tokenCount: 10,
      },
      {
        chunkId: '2',
        articleId: '1',
        articleSlug: 'test-article',
        articleTitle: 'Test Article',
        content: 'More test content',
        similarity: 0.6,
        locale: 'en',
        chunkIndex: 1,
        tokenCount: 15,
      },
    ];

    // Record performance
    ThresholdOptimizer.recordPerformance('test query', 0.5, mockChunks, 1);

    // Get stats
    const stats = ThresholdOptimizer.getPerformanceStats();
    
    expect(stats.totalQueries).toBe(1);
    expect(stats.avgResultCount).toBe(2);
    expect(stats.avgSimilarity).toBeCloseTo(0.7, 1); // (0.8 + 0.6) / 2
    expect(stats.avgThreshold).toBe(0.5);
    expect(stats.ratedQueries).toBe(1);
    expect(stats.avgRating).toBe(1);
  });

  it('should export and clear history correctly', () => {
    const mockChunks: RetrievedChunk[] = [{
      chunkId: '1',
      articleId: '1',
      articleSlug: 'test',
      articleTitle: 'Test',
      content: 'Test',
      similarity: 0.7,
      locale: 'en',
      chunkIndex: 0,
      tokenCount: 5,
    }];

    // Record some performance data
    ThresholdOptimizer.recordPerformance('query 1', 0.4, mockChunks);
    ThresholdOptimizer.recordPerformance('query 2', 0.6, mockChunks);

    // Export history
    const history = ThresholdOptimizer.exportHistory();
    expect(history).toHaveLength(2);
    expect(history[0].query).toBe('query 1');
    expect(history[1].query).toBe('query 2');

    // Clear history
    ThresholdOptimizer.clearHistory();
    const emptyHistory = ThresholdOptimizer.exportHistory();
    expect(emptyHistory).toHaveLength(0);

    // Stats should be empty after clear
    const stats = ThresholdOptimizer.getPerformanceStats();
    expect(stats.totalQueries).toBe(0);
  });

  it('should update and get configuration correctly', () => {
    const originalConfig = ThresholdOptimizer.getConfig();
    expect(originalConfig.enabled).toBe(true);
    expect(originalConfig.baseThreshold).toBe(0.3);

    // Update partial config
    ThresholdOptimizer.updateConfig({
      enabled: false,
      baseThreshold: 0.4,
      learningRate: 0.2,
    });

    const updatedConfig = ThresholdOptimizer.getConfig();
    expect(updatedConfig.enabled).toBe(false);
    expect(updatedConfig.baseThreshold).toBe(0.4);
    expect(updatedConfig.learningRate).toBe(0.2);
    // Other properties should remain unchanged
    expect(updatedConfig.minThreshold).toBe(originalConfig.minThreshold);
    expect(updatedConfig.maxThreshold).toBe(originalConfig.maxThreshold);
  });

  it('should handle disabled optimization', () => {
    ThresholdOptimizer.updateConfig({ enabled: false });

    const threshold = ThresholdOptimizer.calculateOptimalThreshold('test', 5, 'en', false);
    
    // Should return base threshold when disabled
    expect(threshold).toBe(0.3); // Base threshold from default config
  });

  it('should handle empty performance stats', () => {
    ThresholdOptimizer.clearHistory();
    
    const stats = ThresholdOptimizer.getPerformanceStats();
    
    expect(stats.totalQueries).toBe(0);
    expect(stats.avgResultCount).toBe(0);
    expect(stats.avgSimilarity).toBe(0);
    expect(stats.avgThreshold).toBe(0);
    expect(stats.ratedQueries).toBe(0);
    expect(stats.avgRating).toBe(0);
  });

  it('should calculate query similarity correctly', () => {
    // Test similar queries (this tests the private method through adaptive learning)
    const mockChunks: RetrievedChunk[] = [{
      chunkId: '1',
      articleId: '1', 
      articleSlug: 'test',
      articleTitle: 'Test',
      content: 'Test',
      similarity: 0.8,
      locale: 'en',
      chunkIndex: 0,
      tokenCount: 5,
    }];

    // Record performance for similar queries
    ThresholdOptimizer.recordPerformance('react performance', 0.5, mockChunks, 1);
    ThresholdOptimizer.recordPerformance('react optimization', 0.5, mockChunks, 1);
    ThresholdOptimizer.recordPerformance('vue performance', 0.5, mockChunks, 0);

    // Enable adaptive learning
    ThresholdOptimizer.updateConfig({ adaptiveEnabled: true });

    // Calculate threshold for similar query - should use adaptive learning
    const threshold1 = ThresholdOptimizer.calculateOptimalThreshold('react performance tips', 20, 'en', false);
    const threshold2 = ThresholdOptimizer.calculateOptimalThreshold('completely different query', 20, 'en', false);

    // Both should be valid thresholds within bounds
    expect(threshold1).toBeGreaterThanOrEqual(0.2);
    expect(threshold1).toBeLessThanOrEqual(0.8);
    expect(threshold2).toBeGreaterThanOrEqual(0.2);
    expect(threshold2).toBeLessThanOrEqual(0.8);
  });
});