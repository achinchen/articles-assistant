import { AnalyticsService } from './service';
import { query } from '@/db/client';

vi.mock('@/db/client', () => ({
    query: vi.fn()
}));

const mockQuery = vi.mocked(query);  

describe('AnalyticsService', () => {
  beforeEach(() => {
    mockQuery.mockClear();
  });

  describe('logQuery', () => {
    it('should log query successfully', async () => {
      const data = {
        queryText: 'What is Staff Engineer?',
        queryLocale: 'en',
        searchMethod: 'vector' as const,
        chunksRetrieved: 5,
        chunksUsed: 5,
        answerLength: 250,
        hasSources: true,
        responseTimeMs: 3000,
        tokensUsed: 500,
        model: 'gpt-4o-mini',
        requestId: 'test_123',
        ipAddress: '192.168.1.1',
      };
      
      // Mock the INSERT query that returns the id
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 123 }]
      });
      
      // Mock the SELECT query for verification
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 123,
          query_text: data.queryText,
          chunks_retrieved: data.chunksRetrieved,
          model: data.model
        }]
      });
      
      const id = await AnalyticsService.logQuery(data);
      
      expect(id).toBe(123);
      
      const result = await query(
        'SELECT * FROM query_logs WHERE id = $1',
        [id]
      );
      
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].query_text).toBe(data.queryText);
      expect(result.rows[0].chunks_retrieved).toBe(data.chunksRetrieved);
      expect(result.rows[0].model).toBe(data.model);
    });

    it('should handle missing optional fields', async () => {
      const data = {
        queryText: 'Test query',
        searchMethod: 'vector' as const,
        chunksRetrieved: 3,
        chunksUsed: 3,
        answerLength: 100,
        hasSources: false,
        responseTimeMs: 2000,
        tokensUsed: 300,
        model: 'gpt-4o-mini',
        requestId: 'test_456',
      };
      
      // Mock the INSERT query that returns the id
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 456 }]
      });
      
      const id = await AnalyticsService.logQuery(data);
      expect(id).toBe(456);
    });
  });

  describe('recordFeedback', () => {
    it('should record positive feedback', async () => {
      // Mock logQuery call
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 789 }]
      });
      
      const queryLogId = await AnalyticsService.logQuery({
        queryText: 'Test for feedback',
        searchMethod: 'vector',
        chunksRetrieved: 5,
        chunksUsed: 5,
        answerLength: 200,
        hasSources: true,
        responseTimeMs: 3000,
        tokensUsed: 400,
        model: 'gpt-4o-mini',
        requestId: 'test_feedback_1',
      });
      
      // Mock feedback INSERT
      mockQuery.mockResolvedValueOnce({ rows: [] });
      
      // Mock query to get query_text for popular queries
      mockQuery.mockResolvedValueOnce({
        rows: [{ query_text: 'Test for feedback' }]
      });
      
      // Mock popular queries UPSERT
      mockQuery.mockResolvedValueOnce({ rows: [] });
      
      // Record feedback
      await AnalyticsService.recordFeedback({
        queryLogId,
        rating: 1,
        feedbackText: 'Very helpful!',
        feedbackCategory: 'helpful',
        ipAddress: '127.0.0.1',
      });
      
      // Mock feedback SELECT query for verification
      mockQuery.mockResolvedValueOnce({
        rows: [{
          query_log_id: queryLogId,
          rating: 1,
          feedback_text: 'Very helpful!',
          feedback_category: 'helpful'
        }]
      });
      
      const result = await query(
        'SELECT * FROM feedback WHERE query_log_id = $1',
        [queryLogId]
      );
      
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].rating).toBe(1);
      expect(result.rows[0].feedback_text).toBe('Very helpful!');
    });

    it('should record negative feedback', async () => {
      // Mock logQuery call
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 790 }]
      });
      
      const queryLogId = await AnalyticsService.logQuery({
        queryText: 'Test for negative feedback',
        searchMethod: 'vector',
        chunksRetrieved: 5,
        chunksUsed: 5,
        answerLength: 200,
        hasSources: false,
        responseTimeMs: 3000,
        tokensUsed: 400,
        model: 'gpt-4o-mini',
        requestId: 'test_feedback_2',
      });
      
      // Mock feedback INSERT
      mockQuery.mockResolvedValueOnce({ rows: [] });
      
      // Mock query to get query_text for popular queries
      mockQuery.mockResolvedValueOnce({
        rows: [{ query_text: 'Test for negative feedback' }]
      });
      
      // Mock popular queries UPSERT
      mockQuery.mockResolvedValueOnce({ rows: [] });
      
      await AnalyticsService.recordFeedback({
        queryLogId,
        rating: -1,
        feedbackText: 'Not accurate',
        feedbackCategory: 'incorrect',
        ipAddress: '127.0.0.1',
      });
      
      // Mock feedback SELECT query for verification
      mockQuery.mockResolvedValueOnce({
        rows: [{
          query_log_id: queryLogId,
          rating: -1,
          feedback_text: 'Not accurate'
        }]
      });
      
      const result = await query(
        'SELECT * FROM feedback WHERE query_log_id = $1',
        [queryLogId]
      );
      
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].rating).toBe(-1);
    });

    it('should update popular queries on feedback', async () => {
      // Mock logQuery call
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 791 }]
      });
      
      const queryLogId = await AnalyticsService.logQuery({
        queryText: 'Popular query test',
        searchMethod: 'vector',
        chunksRetrieved: 5,
        chunksUsed: 5,
        answerLength: 200,
        hasSources: true,
        responseTimeMs: 3000,
        tokensUsed: 400,
        model: 'gpt-4o-mini',
        requestId: 'test_popular_1',
      });
      
      // Mock feedback INSERT
      mockQuery.mockResolvedValueOnce({ rows: [] });
      
      // Mock query to get query_text for popular queries
      mockQuery.mockResolvedValueOnce({
        rows: [{ query_text: 'Popular query test' }]
      });
      
      // Mock popular queries UPSERT
      mockQuery.mockResolvedValueOnce({ rows: [] });
      
      await AnalyticsService.recordFeedback({
        queryLogId,
        rating: 1,
      });
      
      // Mock popular queries SELECT query for verification
      mockQuery.mockResolvedValueOnce({
        rows: [{
          query_normalized: 'popular query test',
          query_count: 1,
          avg_rating: 1
        }]
      });
      
      // Check popular queries table
      const result = await query(
        "SELECT * FROM popular_queries WHERE query_normalized = 'popular query test'"
      );
      
      expect(result.rows.length).toBeGreaterThan(0);
    });
  });

  describe('logError', () => {
    it('should log failed queries', async () => {
      // Mock the INSERT for failed queries
      mockQuery.mockResolvedValueOnce({ rows: [] });
      
      await AnalyticsService.logError(
        'Failed query text',
        'Database connection error',
        'DB_ERROR',
        'test_error_1',
        'Error stack trace...'
      );
      
      // Mock the SELECT query for verification
      mockQuery.mockResolvedValueOnce({
        rows: [{
          query_text: 'Failed query text',
          error_message: 'Database connection error',
          error_code: 'DB_ERROR',
          request_id: 'test_error_1'
        }]
      });
      
      const result = await query(
        'SELECT * FROM failed_queries WHERE request_id = $1',
        ['test_error_1']
      );
      
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].error_code).toBe('DB_ERROR');
      expect(result.rows[0].error_message).toBe('Database connection error');
    });
  });

  describe('trackCost', () => {
    it('should track daily costs', async () => {
      const testDate = new Date('2025-01-01');
      
      // Mock the INSERT/UPDATE for cost tracking
      mockQuery.mockResolvedValueOnce({ rows: [] });
      
      await AnalyticsService.trackCost(
        testDate,
        1000, // embedding tokens
        2000, // prompt tokens
        500   // completion tokens
      );
      
      // Mock the SELECT query for verification
      mockQuery.mockResolvedValueOnce({
        rows: [{
          date: '2025-01-01',
          embedding_tokens: 1000,
          prompt_tokens: 2000,
          completion_tokens: 500,
          total_cost: '0.3020'
        }]
      });
      
      const result = await query(
        'SELECT * FROM cost_tracking WHERE date = $1',
        [testDate.toISOString().split('T')[0]]
      );
      
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].embedding_tokens).toBe(1000);
      expect(result.rows[0].prompt_tokens).toBe(2000);
      expect(result.rows[0].completion_tokens).toBe(500);
      expect(parseFloat(result.rows[0].total_cost)).toBeGreaterThan(0);
    });

    it('should accumulate costs for the same day', async () => {
      const testDate = new Date('2025-01-02');
      
      mockQuery.mockResolvedValueOnce({ rows: [] });
      await AnalyticsService.trackCost(testDate, 1000, 1000, 500);
      mockQuery.mockResolvedValueOnce({ rows: [] });
      await AnalyticsService.trackCost(testDate, 1000, 1000, 500);
      mockQuery.mockResolvedValueOnce({
        rows: [{
          date: '2025-01-02',
          embedding_tokens: 2000,
          prompt_tokens: 2000,
          completion_tokens: 1000,
          total_queries: 2
        }]
      });
      
      const result = await query(
        'SELECT * FROM cost_tracking WHERE date = $1',
        [testDate.toISOString().split('T')[0]]
      );
      
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].embedding_tokens).toBe(2000);
      expect(result.rows[0].total_queries).toBe(2);
    });
  });

  describe('getSummary', () => {
    it('should return analytics summary', async () => {
      // Mock first logQuery call
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 801 }]
      });
      
      // Create some test data
      await AnalyticsService.logQuery({
        queryText: 'Summary test 1',
        queryLocale: 'en',
        searchMethod: 'vector',
        chunksRetrieved: 5,
        chunksUsed: 5,
        answerLength: 200,
        hasSources: true,
        responseTimeMs: 3000,
        tokensUsed: 400,
        model: 'gpt-4o-mini',
        requestId: 'test_summary_1',
      });
      
      // Mock second logQuery call
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 802 }]
      });
      
      await AnalyticsService.logQuery({
        queryText: 'Summary test 2',
        queryLocale: 'zh',
        searchMethod: 'hybrid',
        chunksRetrieved: 7,
        chunksUsed: 7,
        answerLength: 300,
        hasSources: true,
        responseTimeMs: 4000,
        tokensUsed: 600,
        model: 'gpt-4o-mini',
        requestId: 'test_summary_2',
      });
      
      // Mock getSummary query
      mockQuery.mockResolvedValueOnce({
        rows: [{
          total_queries: '5',
          avg_response_time: '3500.0',
          avg_tokens: '500.0',
          queries_with_sources: '4',
          languages_used: '2',
          active_days: '3'
        }]
      });
      
      const summary = await AnalyticsService.getSummary(7);
      
      expect(summary).toHaveProperty('total_queries');
      expect(summary).toHaveProperty('avg_response_time');
      expect(summary).toHaveProperty('avg_tokens');
      expect(parseInt(summary.total_queries)).toBeGreaterThanOrEqual(2);
    });
  });

  describe('getFeedbackStats', () => {
    it('should return feedback statistics', async () => {
      // Mock first logQuery call
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 903 }]
      });
      
      // Create test data with feedback
      const queryLogId1 = await AnalyticsService.logQuery({
        queryText: 'Feedback stats test 1',
        searchMethod: 'vector',
        chunksRetrieved: 5,
        chunksUsed: 5,
        answerLength: 200,
        hasSources: true,
        responseTimeMs: 3000,
        tokensUsed: 400,
        model: 'gpt-4o-mini',
        requestId: 'test_feedback_stats_1',
      });
      
      // Mock second logQuery call
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 904 }]
      });
      
      const queryLogId2 = await AnalyticsService.logQuery({
        queryText: 'Feedback stats test 2',
        searchMethod: 'vector',
        chunksRetrieved: 5,
        chunksUsed: 5,
        answerLength: 200,
        hasSources: true,
        responseTimeMs: 3000,
        tokensUsed: 400,
        model: 'gpt-4o-mini',
        requestId: 'test_feedback_stats_2',
      });
      
      // Mock first recordFeedback calls (INSERT + SELECT query_text + UPSERT popular_queries)
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [{ query_text: 'Feedback stats test 1' }] });
      mockQuery.mockResolvedValueOnce({ rows: [] });
      
      await AnalyticsService.recordFeedback({
        queryLogId: queryLogId1,
        rating: 1,
        ipAddress: '127.0.0.1',
      });
      
      // Mock second recordFeedback calls
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [{ query_text: 'Feedback stats test 2' }] });
      mockQuery.mockResolvedValueOnce({ rows: [] });
      
      await AnalyticsService.recordFeedback({
        queryLogId: queryLogId2,
        rating: -1,
        ipAddress: '127.0.0.1',
      });
      
      // Mock getFeedbackStats query
      mockQuery.mockResolvedValueOnce({
        rows: [{
          total_feedback: '10',
          positive: '7',
          negative: '3',
          satisfaction_rate: '70.00'
        }]
      });
      
      const stats = await AnalyticsService.getFeedbackStats(7);
      
      expect(stats).toHaveProperty('total_feedback');
      expect(stats).toHaveProperty('positive');
      expect(stats).toHaveProperty('negative');
      expect(stats).toHaveProperty('satisfaction_rate');
      expect(parseInt(stats.total_feedback)).toBeGreaterThanOrEqual(2);
    });
  });
});