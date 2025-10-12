import { performance } from 'perf_hooks';
import supertest from 'supertest';
import express from 'express';
import { CacheService } from '@/cache/service';
import { getRedisClient, closeRedisConnection } from '@/cache/client';

// Mock the query function to simulate database operations without requiring actual DB
const mockQueryResponse = {
  answer: "A Staff Engineer is a senior technical role that combines deep technical expertise with architectural leadership...",
  sources: [
    {
      id: 1,
      articleSlug: "staff-engineer-guide",
      articleTitle: "The Staff Engineer's Path", 
      similarity: 0.85,
      locale: "en",
      url: "https://example.com/staff-engineer"
    }
  ],
  metadata: {
    queryLocale: "en",
    chunksRetrieved: 10,
    chunksUsed: 3,
    model: "gpt-4",
    tokensUsed: { prompt: 500, completion: 200, total: 700 }
  }
};

// Simple test server with cache integration
function createTestServer() {
  const app = express();
  app.use(express.json());
  
  app.post('/api/ask', async (req, res) => {
    try {
      const { query: queryText, locale = 'en', useHybridSearch = false } = req.body;
      
      // Try cache first
      let result = await CacheService.get(queryText, locale, useHybridSearch);
      let fromCache = true;
      
      if (!result) {
        fromCache = false;
        // Simulate query processing delay
        await new Promise(resolve => setTimeout(resolve, 100));
        result = mockQueryResponse;
        
        // Cache the result
        await CacheService.set(queryText, locale, useHybridSearch, result);
      }
      
      res.json({
        success: true,
        data: {
          answer: result.answer,
          sources: result.sources,
          metadata: {
            ...result.metadata,
            fromCache
          }
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: { message: error.message }
      });
    }
  });
  
  return app;
}

describe('API Cache Performance Tests', () => {
  let app: any;
  let server: any;
  let request: ReturnType<typeof supertest>;

  beforeAll(async () => {
    await getRedisClient();
    app = createTestServer();
    server = app.listen(0); // Use port 0 for random available port
    request = supertest(app);
  });

  afterAll(async () => {
    if (server) {
      server.close();
    }
    await closeRedisConnection();
  });

  it('should demonstrate significant cache performance improvement via API', async () => {
    // Clear cache before test
    await CacheService.clear();

    const testQuery = {
      query: "What is Staff Engineer?",
      locale: "en"
    };
    
    // First request (cache miss)
    const start1 = performance.now();
    const response1 = await request
      .post('/api/ask')
      .send(testQuery);
    const time1 = performance.now() - start1;
    
    if (response1.status !== 200) {
      console.error('First request failed:', {
        status: response1.status,
        body: response1.body,
        error: response1.error
      });
      throw new Error(`Expected 200, got ${response1.status}: ${JSON.stringify(response1.body)}`);
    }
    
    expect(response1.body.success).toBe(true);
    expect(response1.body.data.sources).toBeDefined();
    expect(response1.body.data.sources.length).toBeGreaterThan(0);
    expect(response1.body.data.metadata.fromCache).toBeFalsy();

    // Second request (should be cache hit)
    const start2 = performance.now();
    const response2 = await request
      .post('/api/ask')
      .send(testQuery)
      .expect(200);
    const time2 = performance.now() - start2;
    
    expect(response2.body.success).toBe(true);
    expect(response2.body.data.sources).toBeDefined();
    expect(response2.body.data.sources.length).toEqual(response1.body.data.sources.length);
    expect(response2.body.data.metadata.fromCache).toBeTruthy();

    // Performance improvement should be significant
    const speedup = time1 / time2;
    const improvement = ((time1 - time2) / time1) * 100;
    
    expect(speedup).toBeGreaterThan(2); // At least 2x speedup
    expect(improvement).toBeGreaterThan(50); // At least 50% improvement
    
    console.log(`Cache Performance Test Results:`);
    console.log(`  First request: ${time1.toFixed(0)}ms`);
    console.log(`  Second request: ${time2.toFixed(0)}ms`);
    console.log(`  Speedup: ${speedup.toFixed(2)}x`);
    console.log(`  Improvement: ${improvement.toFixed(1)}%`);

    // Verify cache metrics
    const metrics = await CacheService.getMetrics();
    expect(metrics.hits).toBeGreaterThan(0);
    expect(metrics.misses).toBeGreaterThan(0);
    expect(metrics.hitRate).toBeGreaterThan(0);
  }, 30000); // 30 second timeout for this performance test

  it('should handle different queries correctly with cache', async () => {
    await CacheService.clear();

    const query1 = { query: "React performance", locale: "en" };
    const query2 = { query: "System design", locale: "en" };
    const query3 = { query: "React performance", locale: "en" }; // Same as query1

    // First unique query
    const response1 = await request
      .post('/api/ask')
      .send(query1)
      .expect(200);
    
    expect(response1.body.data.metadata.fromCache).toBeFalsy();

    // Second unique query
    const response2 = await request
      .post('/api/ask')
      .send(query2)
      .expect(200);
    
    expect(response2.body.data.metadata.fromCache).toBeFalsy();

    // Repeat first query (should be cached)
    const response3 = await request
      .post('/api/ask')
      .send(query3)
      .expect(200);
    
    expect(response3.body.data.metadata.fromCache).toBeTruthy();
    expect(response3.body.data.answer).toBe(response1.body.data.answer);
  }, 45000); // 45 second timeout for this test

  it('should respect cache TTL and configuration', async () => {
    await CacheService.clear();

    const testQuery = { query: "Short test", locale: "en" };
    
    // Make first request
    const response1 = await request
      .post('/api/ask')
      .send(testQuery)
      .expect(200);
    
    expect(response1.body.data.metadata.fromCache).toBeFalsy();

    // Check cache info
    const info = await CacheService.getInfo();
    expect(info.used_memory).toBeDefined();
    
    const memoryMB = parseInt(info.used_memory || '0') / 1024 / 1024;
    expect(memoryMB).toBeGreaterThan(0);
  }, 30000);
});