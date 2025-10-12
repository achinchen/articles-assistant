import { logger } from '@/utils/logger';
import { RetrievedChunk } from '@/query/types';

export interface ThresholdOptimizationConfig {
  enabled: boolean;
  minThreshold: number;
  maxThreshold: number;
  baseThreshold: number;
  
  // Adjustment factors
  queryLengthFactor: number;
  resultCountFactor: number;
  similaritySpreadFactor: number;
  
  // Adaptive learning
  adaptiveEnabled: boolean;
  learningRate: number;
  historySize: number;
}

export const DEFAULT_THRESHOLD_CONFIG: ThresholdOptimizationConfig = {
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
};

export interface QueryPerformance {
  query: string;
  threshold: number;
  resultCount: number;
  avgSimilarity: number;
  maxSimilarity: number;
  minSimilarity: number;
  userRating?: number; // From feedback
  timestamp: Date;
}

export class ThresholdOptimizer {
  private static config: ThresholdOptimizationConfig = DEFAULT_THRESHOLD_CONFIG;
  private static performanceHistory: QueryPerformance[] = [];

  /**
   * Calculate optimal threshold for a query
   */
  static calculateOptimalThreshold(
    query: string,
    queryLength: number,
    locale: string,
    useHybridSearch: boolean = false
  ): number {
    if (!this.config.enabled) {
      return this.config.baseThreshold;
    }

    let threshold = this.config.baseThreshold;

    // Adjust based on query characteristics
    threshold = this.adjustForQueryLength(threshold, queryLength);
    threshold = this.adjustForSearchMethod(threshold, useHybridSearch);
    threshold = this.adjustForLanguage(threshold, locale);

    // Apply adaptive learning if enabled
    if (this.config.adaptiveEnabled) {
      threshold = this.applyAdaptiveLearning(threshold, query);
    }

    // Ensure threshold is within bounds
    return Math.max(
      this.config.minThreshold,
      Math.min(this.config.maxThreshold, threshold)
    );
  }

  /**
   * Adjust threshold based on query length
   */
  private static adjustForQueryLength(threshold: number, queryLength: number): number {
    // Shorter queries might need lower threshold (more permissive)
    // Longer queries can have higher threshold (more selective)
    
    if (queryLength < 10) {
      // Very short queries - be more permissive
      threshold -= this.config.queryLengthFactor * 2;
    } else if (queryLength < 30) {
      // Short queries - slightly more permissive
      threshold -= this.config.queryLengthFactor;
    } else if (queryLength > 100) {
      // Long queries - be more selective
      threshold += this.config.queryLengthFactor;
    }

    return threshold;
  }

  /**
   * Adjust threshold based on search method
   */
  private static adjustForSearchMethod(threshold: number, useHybridSearch: boolean): number {
    if (useHybridSearch) {
      // Hybrid search can be slightly more permissive since it combines multiple signals
      threshold -= 0.05;
    }
    return threshold;
  }

  /**
   * Adjust threshold based on language
   */
  private static adjustForLanguage(threshold: number, locale: string): number {
    // Chinese text might have different similarity patterns
    if (locale === 'zh') {
      threshold -= 0.02; // Slightly more permissive for Chinese
    }
    return threshold;
  }

  /**
   * Apply adaptive learning based on historical performance
   */
  private static applyAdaptiveLearning(threshold: number, query: string): number {
    const recentHistory = this.performanceHistory
      .filter(p => Date.now() - p.timestamp.getTime() < 24 * 60 * 60 * 1000) // Last 24 hours
      .slice(-this.config.historySize);

    if (recentHistory.length < 10) {
      return threshold; // Not enough data for learning
    }

    // Find similar queries in history
    const similarQueries = recentHistory.filter(p => 
      this.calculateQuerySimilarity(query, p.query) > 0.7
    );

    if (similarQueries.length === 0) {
      return threshold;
    }

    // Calculate average performance of similar queries
    const avgPerformance = similarQueries.reduce((sum, p) => {
      // Higher score for more results and higher user ratings
      const resultScore = Math.min(p.resultCount / 5, 1); // Normalize to 0-1
      const ratingScore = p.userRating ? p.userRating : 0.5; // Default to neutral
      return sum + (resultScore * 0.6 + ratingScore * 0.4);
    }, 0) / similarQueries.length;

    // Adjust threshold based on performance
    if (avgPerformance < 0.4) {
      // Poor performance - lower threshold (more permissive)
      threshold -= this.config.learningRate;
    } else if (avgPerformance > 0.8) {
      // Good performance - slightly raise threshold (more selective)
      threshold += this.config.learningRate * 0.5;
    }

    return threshold;
  }

  /**
   * Record query performance for learning
   */
  static recordPerformance(
    query: string,
    threshold: number,
    chunks: RetrievedChunk[],
    userRating?: number
  ): void {
    if (!this.config.adaptiveEnabled) return;

    const similarities = chunks.map(c => c.similarity);
    const performance: QueryPerformance = {
      query,
      threshold,
      resultCount: chunks.length,
      avgSimilarity: similarities.length > 0 ? similarities.reduce((a, b) => a + b) / similarities.length : 0,
      maxSimilarity: similarities.length > 0 ? Math.max(...similarities) : 0,
      minSimilarity: similarities.length > 0 ? Math.min(...similarities) : 0,
      userRating,
      timestamp: new Date(),
    };

    this.performanceHistory.push(performance);

    // Keep only recent history
    if (this.performanceHistory.length > this.config.historySize * 2) {
      this.performanceHistory = this.performanceHistory.slice(-this.config.historySize);
    }

    logger.info('Recorded query performance:', {
      query: query.slice(0, 50),
      threshold,
      resultCount: chunks.length,
      avgSimilarity: performance.avgSimilarity.toFixed(3),
      userRating,
    });
  }

  /**
   * Calculate similarity between two queries (simple implementation)
   */
  private static calculateQuerySimilarity(query1: string, query2: string): number {
    const words1 = new Set(query1.toLowerCase().split(/\s+/));
    const words2 = new Set(query2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size; // Jaccard similarity
  }

  /**
   * Get performance statistics
   */
  static getPerformanceStats(): {
    totalQueries: number;
    avgResultCount: number;
    avgSimilarity: number;
    avgThreshold: number;
    ratedQueries: number;
    avgRating: number;
  } {
    const history = this.performanceHistory;
    
    if (history.length === 0) {
      return {
        totalQueries: 0,
        avgResultCount: 0,
        avgSimilarity: 0,
        avgThreshold: 0,
        ratedQueries: 0,
        avgRating: 0,
      };
    }

    const ratedQueries = history.filter(p => p.userRating !== undefined);
    
    return {
      totalQueries: history.length,
      avgResultCount: history.reduce((sum, p) => sum + p.resultCount, 0) / history.length,
      avgSimilarity: history.reduce((sum, p) => sum + p.avgSimilarity, 0) / history.length,
      avgThreshold: history.reduce((sum, p) => sum + p.threshold, 0) / history.length,
      ratedQueries: ratedQueries.length,
      avgRating: ratedQueries.length > 0 
        ? ratedQueries.reduce((sum, p) => sum + (p.userRating || 0), 0) / ratedQueries.length
        : 0,
    };
  }

  /**
   * Update configuration
   */
  static updateConfig(newConfig: Partial<ThresholdOptimizationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info('Threshold optimization config updated:', newConfig);
  }

  /**
   * Get current configuration
   */
  static getConfig(): ThresholdOptimizationConfig {
    return { ...this.config };
  }

  /**
   * Clear performance history
   */
  static clearHistory(): void {
    this.performanceHistory = [];
    logger.info('Threshold optimization history cleared');
  }

  /**
   * Export performance history for analysis
   */
  static exportHistory(): QueryPerformance[] {
    return [...this.performanceHistory];
  }
}