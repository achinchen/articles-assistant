import request from 'supertest';
import express, { Express } from 'express';
import analytics from '.';
import * as dbClient from '@/db/client';
import * as analyticsService from '@/analytics/service';

vi.mock('@/db/client');
vi.mock('@/analytics/service');

const mockQuery = vi.mocked(dbClient.query);
const mockAnalyticsService = vi.mocked(analyticsService.AnalyticsService);

describe('Analytics API', () => {
  let app: Express;
  
  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/analytics', analytics);
  });

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock AnalyticsService methods
    mockAnalyticsService.getSummary.mockResolvedValue({
      total_queries: 100,
      unique_queries: 50,
      avg_rating: 4.2
    });
    
    mockAnalyticsService.getFeedbackStats.mockResolvedValue({
      positive: 80,
      negative: 20,
      total: 100
    });
    
    // Mock database queries
    mockQuery.mockResolvedValue({
      rows: [
        {
          query_normalized: 'test query',
          query_count: 5,
          avg_rating: 4.5,
          last_queried_at: '2024-01-01T00:00:00Z'
        }
      ],
      rowCount: 1
    });
  });

  describe('GET /api/analytics/summary', () => {
    it('should return analytics summary', async () => {
      const response = await request(app)
        .get('/api/analytics/summary')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('period');
      expect(response.body.data).toHaveProperty('queries');
      expect(response.body.data).toHaveProperty('feedback');
      expect(response.body.data).toHaveProperty('costs');
    });

    it('should accept custom days parameter', async () => {
      const response = await request(app)
        .get('/api/analytics/summary?days=30')
        .expect(200);
      
      expect(response.body.data.period).toBe('last_30_days');
    });
  });

  describe('GET /api/analytics/popular-queries', () => {
    it('should return popular queries', async () => {
      const response = await request(app)
        .get('/api/analytics/popular-queries')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should respect limit parameter', async () => {
      const response = await request(app)
        .get('/api/analytics/popular-queries?limit=5')
        .expect(200);
      
      expect(response.body.data.length).toBeLessThanOrEqual(5);
    });
  });

  describe('GET /api/analytics/performance', () => {
    it('should return performance metrics', async () => {
      // Mock performance data
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            hour: '2024-01-01T10:00:00Z',
            query_count: 10,
            avg_response_time: 500,
            p50: 450,
            p95: 800,
            avg_tokens: 1000
          }
        ],
        rowCount: 1
      });

      const response = await request(app)
        .get('/api/analytics/performance')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should accept custom hours parameter', async () => {
      // Mock performance data for 48 hours
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            hour: '2024-01-01T10:00:00Z',
            query_count: 5,
            avg_response_time: 600,
            p50: 500,
            p95: 900,
            avg_tokens: 1200
          }
        ],
        rowCount: 1
      });

      const response = await request(app)
        .get('/api/analytics/performance?hours=48')
        .expect(200);
      
      expect(response.body.success).toBe(true);
    });
  });
});
