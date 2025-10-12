export interface CacheTtlConfig {
  // Default TTL in seconds
  default: number;
  
  // TTL based on query length
  shortQuery: number;  // < 10 characters
  mediumQuery: number; // 10-50 characters
  longQuery: number;   // > 50 characters
  
  // TTL based on result quality
  highQuality: number;   // similarity > 0.7
  mediumQuality: number; // similarity 0.5-0.7
  lowQuality: number;    // similarity < 0.5
  
  // TTL based on search method
  vectorSearch: number;
  hybridSearch: number;
  
  // Maximum TTL for any cache entry
  max: number;
  
  // Minimum TTL for any cache entry
  min: number;
}

export const DEFAULT_CACHE_CONFIG: CacheTtlConfig = {
  default: 3600, // 1 hour
  
  // Query length based
  shortQuery: 1800,  // 30 minutes (short queries might be less reliable)
  mediumQuery: 3600, // 1 hour
  longQuery: 7200,   // 2 hours (longer queries are often more specific)
  
  // Quality based
  highQuality: 7200,  // 2 hours (high confidence results)
  mediumQuality: 3600, // 1 hour
  lowQuality: 1800,    // 30 minutes (low confidence, may improve)
  
  // Search method based
  vectorSearch: 3600,  // 1 hour
  hybridSearch: 5400,  // 1.5 hours (hybrid might be more stable)
  
  max: 86400, // 24 hours
  min: 300,   // 5 minutes
};

export interface CacheInvalidationStrategy {
  // Patterns to match for invalidation
  patterns: string[];
  
  // Time-based invalidation
  maxAge?: number;
  
  // Content-based invalidation triggers
  triggers: {
    // When new content is ingested
    onContentUpdate: boolean;
    
    // When cache hit rate drops below threshold
    onLowHitRate: number; // threshold (0-1)
    
    // When cache size exceeds threshold
    onSizeExceeded: number; // MB
  };
}

export const DEFAULT_INVALIDATION_STRATEGY: CacheInvalidationStrategy = {
  patterns: [
    'query:*', // All query caches
  ],
  
  triggers: {
    onContentUpdate: true,
    onLowHitRate: 0.3, // 30%
    onSizeExceeded: 100, // 100MB
  },
};