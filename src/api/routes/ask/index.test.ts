import request from 'supertest';
import express, { type Express } from 'express';
import ask from '.';
import { SEARCH_METHOD } from './constants';
import { query } from '@/query';

vi.mock('@/analytics/service', () => ({
  AnalyticsService: {
    logQuery: vi.fn().mockResolvedValue({ id: 123 }),
    recordFeedback: vi.fn(),
    trackCost: vi.fn().mockResolvedValue(true),
    logError: vi.fn().mockResolvedValue(true)
  }
}));

vi.mock('@/cache/service', () => ({
  CacheService: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(true),
    buildCacheKey: vi.fn().mockReturnValue('test-cache-key')
  }
}));

vi.mock('@/query', () => ({
  query: vi.fn()
}));

describe('POST /api/ask', () => {
  let app: Express;
  
  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/ask', ask);
    
    // Add proper ApiError handling like the real app
    app.use((err: any, req: any, res: any, next: any) => {
      // Handle ApiError instances
      if (err.statusCode && err.code) {
        return res.status(err.statusCode).json({
          success: false,
          error: err.message,
          code: err.code
        });
      }
      
      // Generic error handler for debugging
      console.error('Test error handler caught:', err);
      res.status(500).json({ error: err.message, stack: err.stack });
    });
  });

  beforeEach(async () => {
    vi.clearAllMocks();
        
    vi.mocked(query).mockResolvedValue({
      answer: 'A Staff Engineer is a senior technical role...',
      sources: [
        {
          id: 'test-1',
          articleSlug: 'test-article',
          articleTitle: 'Test Article',
          similarity: 0.95,
          locale: 'en'
        }
      ],
      metadata: {
        queryLocale: 'en',
        chunksRetrieved: 5,
        chunksUsed: 3,
        model: 'gpt-4o',
        tokensUsed: {
          context: 100,
          prompt: 50,
          completion: 200,
          total: 350
        },
        responseTime: 1500
      }
    });
  });

  it('should return answer for valid query', async () => {
    const response = await request(app)
      .post('/api/ask')
      .send({
        query: 'What is Staff Engineer?',
        locale: 'en'
      });
    
    if (response.status !== 200) {
      console.error('Error response:', response.body);
      console.error('Status:', response.status);
    }
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('answer');
    expect(response.body.data).toHaveProperty('sources');
    expect(response.body.data).toHaveProperty('metadata');
  });
  
  it('should return 400 for missing query', async () => {
    await request(app)
      .post('/api/ask')
      .send({})
      .expect(400);
  });
  
  it('should return 400 for empty query', async () => {
    await request(app)
      .post('/api/ask')
      .send({ query: '   ' })
      .expect(400);
  });
  
  it('should return 400 for invalid locale', async () => {
    await request(app)
      .post('/api/ask')
      .send({
        query: 'test',
        locale: 'invalid'
      })
      .expect(400);
  });
  
  it('should support hybrid search', async () => {
    const response = await request(app)
      .post('/api/ask')
      .send({
        query: 'technical leadership',
        useHybridSearch: true
      })
      .expect(200);
    
    expect(response.body.data.metadata.searchMethod).toBe(SEARCH_METHOD.HYBRID);
  }, 30000);
  
  it('should respect custom config', async () => {
    const response = await request(app)
      .post('/api/ask')
      .send({
        query: 'test',
        config: {
          topK: 3,
          model: 'gpt-4o'
        }
      })
      .expect(200);
    
    expect(response.body.data.metadata.model).toBe('gpt-4o');
  }, 30000);
});