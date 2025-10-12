import { createHash } from 'crypto';
import { getRedisClient } from './client';
import { logger } from '@/utils/logger';
import { DEFAULT_CACHE_CONFIG, DEFAULT_INVALIDATION_STRATEGY, type CacheTtlConfig } from './config';
import type { QueryResponse } from '@/query/types';

export interface CacheConfig {
  ttl: number; // Time to live in seconds
  prefix: string;
}

export interface CacheMetrics {
  hits: number;
  misses: number;
  errors: number;
  hitRate: number;
}

export class CacheService {
  private static readonly PREFIX = 'articles-assistant';
  private static readonly METRICS_KEY = `${CacheService.PREFIX}:metrics`;
  private static cacheConfig: CacheTtlConfig = DEFAULT_CACHE_CONFIG;

  /**
   * Generate cache key for query
   * Key includes query text, locale, search method, and config hash
   */
  private static generateCacheKey(
    query: string, 
    locale: string, 
    useHybridSearch: boolean,
    config?: any
  ): string {
    const searchMethod = useHybridSearch ? 'hybrid' : 'vector';
    const configHash = config ? createHash('md5').update(JSON.stringify(config)).digest('hex').slice(0, 8) : 'default';
    
    // Normalize query (lowercase, trim, remove extra spaces)
    const normalizedQuery = query.toLowerCase().trim().replace(/\s+/g, ' ');
    
    // Create hash of the normalized query for consistent key length
    const queryHash = createHash('md5').update(normalizedQuery).digest('hex');
    
    return `${CacheService.PREFIX}:query:${locale}:${searchMethod}:${configHash}:${queryHash}`;
  }

  /**
   * Get cached query result
   */
  static async get(
    query: string,
    locale: string,
    useHybridSearch: boolean,
    config?: any
  ): Promise<QueryResponse | null> {
    try {
      const client = await getRedisClient();
      const key = this.generateCacheKey(query, locale, useHybridSearch, config);
      
      const cached = await client.get(key);
      
      if (cached) {
        await this.incrementMetric('hits');
        logger.info('Cache hit for query:', { query: query.slice(0, 50), key });
        return JSON.parse(cached) as QueryResponse;
      } else {
        await this.incrementMetric('misses');
        logger.info('Cache miss for query:', { query: query.slice(0, 50), key });
        return null;
      }
    } catch (error) {
      await this.incrementMetric('errors');
      logger.error('Cache get error:', error);
      return null; // Fail gracefully
    }
  }

  /**
   * Calculate intelligent TTL based on query characteristics and result quality
   */
  private static calculateTtl(
    query: string,
    useHybridSearch: boolean,
    result: QueryResponse
  ): number {
    let ttl = this.cacheConfig.default;
    
    // Adjust based on query length
    const queryLength = query.trim().length;
    if (queryLength < 10) {
      ttl = Math.min(ttl, this.cacheConfig.shortQuery);
    } else if (queryLength > 50) {
      ttl = Math.max(ttl, this.cacheConfig.longQuery);
    } else {
      ttl = this.cacheConfig.mediumQuery;
    }
    
    // Adjust based on result quality (average similarity of sources)
    if (result.sources.length > 0) {
      const avgSimilarity = result.sources.reduce((sum, source) => sum + source.similarity, 0) / result.sources.length;
      
      if (avgSimilarity > 0.7) {
        ttl = Math.max(ttl, this.cacheConfig.highQuality);
      } else if (avgSimilarity < 0.5) {
        ttl = Math.min(ttl, this.cacheConfig.lowQuality);
      } else {
        ttl = this.cacheConfig.mediumQuality;
      }
    }
    
    // Adjust based on search method
    if (useHybridSearch) {
      ttl = Math.max(ttl, this.cacheConfig.hybridSearch);
    } else {
      ttl = Math.max(ttl, this.cacheConfig.vectorSearch);
    }
    
    // Ensure TTL is within bounds
    return Math.max(this.cacheConfig.min, Math.min(this.cacheConfig.max, ttl));
  }

  /**
   * Set query result in cache with intelligent TTL
   */
  static async set(
    query: string,
    locale: string,
    useHybridSearch: boolean,
    result: QueryResponse,
    config?: any,
    customTtl?: number
  ): Promise<void> {
    try {
      const client = await getRedisClient();
      const key = this.generateCacheKey(query, locale, useHybridSearch, config);
      
      // Use custom TTL or calculate intelligent TTL
      const ttl = customTtl || this.calculateTtl(query, useHybridSearch, result);
      
      // Add cache metadata to the result
      const cachedResult = {
        ...result,
        metadata: {
          ...result.metadata,
          cached: true,
          cachedAt: new Date().toISOString(),
          cacheTtl: ttl,
        },
      };
      
      await client.setEx(key, ttl, JSON.stringify(cachedResult));
      logger.info('Cache set for query:', { 
        query: query.slice(0, 50), 
        key: key.slice(-20), // Show last 20 chars for debugging
        ttl,
        avgSimilarity: result.sources.length > 0 
          ? (result.sources.reduce((sum, s) => sum + s.similarity, 0) / result.sources.length).toFixed(3)
          : 'N/A'
      });
    } catch (error) {
      await this.incrementMetric('errors');
      logger.error('Cache set error:', error);
      // Don't throw - caching is not critical
    }
  }

  /**
   * Invalidate cache by pattern
   */
  static async invalidatePattern(pattern: string): Promise<number> {
    try {
      const client = await getRedisClient();
      const keys = await client.keys(`${CacheService.PREFIX}:${pattern}`);
      
      if (keys.length > 0) {
        const deleted = await client.del(keys);
        logger.info('Cache invalidated:', { pattern, deleted });
        return deleted;
      }
      return 0;
    } catch (error) {
      logger.error('Cache invalidation error:', error);
      return 0;
    }
  }

  /**
   * Clear all cache
   */
  static async clear(): Promise<void> {
    try {
      const client = await getRedisClient();
      const keys = await client.keys(`${CacheService.PREFIX}:*`);
      
      if (keys.length > 0) {
        await client.del(keys);
        logger.info('All cache cleared:', { count: keys.length });
      }
    } catch (error) {
      logger.error('Cache clear error:', error);
    }
  }

  /**
   * Get cache statistics
   */
  static async getMetrics(): Promise<CacheMetrics> {
    try {
      const client = await getRedisClient();
      const metrics = await client.hGetAll(CacheService.METRICS_KEY);
      
      const hits = parseInt(metrics.hits || '0');
      const misses = parseInt(metrics.misses || '0');
      const errors = parseInt(metrics.errors || '0');
      const total = hits + misses;
      const hitRate = total > 0 ? hits / total : 0;
      
      return { hits, misses, errors, hitRate };
    } catch (error) {
      logger.error('Cache metrics error:', error);
      return { hits: 0, misses: 0, errors: 0, hitRate: 0 };
    }
  }

  /**
   * Increment cache metrics
   */
  private static async incrementMetric(metric: 'hits' | 'misses' | 'errors'): Promise<void> {
    try {
      const client = await getRedisClient();
      await client.hIncrBy(CacheService.METRICS_KEY, metric, 1);
    } catch (error) {
      logger.error('Cache metric increment error:', error);
    }
  }

  /**
   * Reset cache metrics
   */
  static async resetMetrics(): Promise<void> {
    try {
      const client = await getRedisClient();
      await client.del(CacheService.METRICS_KEY);
      logger.info('Cache metrics reset');
    } catch (error) {
      logger.error('Cache metrics reset error:', error);
    }
  }

  /**
   * Get cache info (Redis info)
   */
  static async getInfo(): Promise<Record<string, string>> {
    try {
      const client = await getRedisClient();
      const info = await client.info('memory');
      const lines = info.split('\r\n');
      const result: Record<string, string> = {};
      
      for (const line of lines) {
        const [key, value] = line.split(':');
        if (key && value) {
          result[key] = value;
        }
      }
      
      return result;
    } catch (error) {
      logger.error('Cache info error:', error);
      return {};
    }
  }

  /**
   * Invalidate cache when content is updated
   */
  static async invalidateOnContentUpdate(): Promise<void> {
    if (DEFAULT_INVALIDATION_STRATEGY.triggers.onContentUpdate) {
      const deleted = await this.invalidatePattern('query:*');
      logger.info('Cache invalidated due to content update:', { deleted });
    }
  }

  /**
   * Check and invalidate cache if hit rate is too low
   */
  static async checkAndInvalidateOnLowHitRate(): Promise<void> {
    const metrics = await this.getMetrics();
    const threshold = DEFAULT_INVALIDATION_STRATEGY.triggers.onLowHitRate;
    
    if (metrics.hitRate < threshold && (metrics.hits + metrics.misses) > 10) {
      logger.warn('Cache hit rate below threshold, invalidating cache:', {
        hitRate: metrics.hitRate,
        threshold,
        totalRequests: metrics.hits + metrics.misses,
      });
      
      await this.clear();
      await this.resetMetrics();
    }
  }

  /**
   * Check cache size and invalidate if exceeding limit
   */
  static async checkAndInvalidateOnSizeExceeded(): Promise<void> {
    try {
      const info = await this.getInfo();
      const usedMemoryMb = parseInt(info.used_memory || '0') / 1024 / 1024;
      const threshold = DEFAULT_INVALIDATION_STRATEGY.triggers.onSizeExceeded;
      
      if (usedMemoryMb > threshold) {
        logger.warn('Cache size exceeded threshold, performing cleanup:', {
          usedMemoryMb: usedMemoryMb.toFixed(2),
          threshold,
        });
        
        // Instead of clearing all, remove oldest entries
        await this.cleanupOldestEntries();
      }
    } catch (error) {
      logger.error('Cache size check error:', error);
    }
  }

  /**
   * Remove oldest cache entries (LRU-style cleanup)
   */
  private static async cleanupOldestEntries(): Promise<void> {
    try {
      const client = await getRedisClient();
      const keys = await client.keys(`${this.PREFIX}:query:*`);
      
      if (keys.length === 0) return;
      
      // Get TTL for all keys and sort by remaining time
      const keyTtls = await Promise.all(
        keys.map(async (key) => ({
          key,
          ttl: await client.ttl(key),
        }))
      );
      
      // Sort by TTL (ascending), remove expired or oldest 25%
      keyTtls.sort((a, b) => a.ttl - b.ttl);
      const toRemove = keyTtls.slice(0, Math.ceil(keyTtls.length * 0.25));
      
      if (toRemove.length > 0) {
        const removed = await client.del(toRemove.map(item => item.key));
        logger.info('Cleaned up oldest cache entries:', { removed });
      }
    } catch (error) {
      logger.error('Cache cleanup error:', error);
    }
  }

  /**
   * Run maintenance tasks
   */
  static async runMaintenance(): Promise<void> {
    try {
      await Promise.all([
        this.checkAndInvalidateOnLowHitRate(),
        this.checkAndInvalidateOnSizeExceeded(),
      ]);
    } catch (error) {
      logger.error('Cache maintenance error:', error);
    }
  }

  /**
   * Update cache configuration
   */
  static updateConfig(newConfig: Partial<CacheTtlConfig>): void {
    this.cacheConfig = { ...this.cacheConfig, ...newConfig };
    logger.info('Cache configuration updated:', newConfig);
  }

  /**
   * Get current cache configuration
   */
  static getConfig(): CacheTtlConfig {
    return { ...this.cacheConfig };
  }
}