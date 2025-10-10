import request from 'supertest';
import express, { Express } from 'express';
import feedback from '.';

vi.mock('@/analytics/service', () => ({
  AnalyticsService: {
    logQuery: vi.fn(),
    recordFeedback: vi.fn()
  }
}));

describe('Feedback API', () => {
  let app: Express;
  
  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/feedback', feedback);
  });

  describe('POST /api/feedback', () => {
    it('should accept positive feedback', async () => {
      
      const response = await request(app)
        .post('/api/feedback')
        .send({
          queryLogId: 1203,
          rating: 1,
          feedbackText: 'Great answer!',
          feedbackCategory: 'helpful',
        })
        .expect(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Feedback recorded');
    });

    it('should accept negative feedback', async () => {
      const response = await request(app)
        .post('/api/feedback')
        .send({
          queryLogId: 123,
          rating: -1,
          feedbackText: 'Not helpful',
          feedbackCategory: 'incorrect',
        })
        .expect(200);
      
      expect(response.body.success).toBe(true);
    });

    it('should return 400 for missing queryLogId', async () => {
      const response = await request(app)
        .post('/api/feedback')
        .send({
          rating: 1,
        })
        .expect(400);

      expect(response.ok).toBe(false);
    });

    it('should return 400 for invalid rating', async () => {
      const response = await request(app)
        .post('/api/feedback')
        .send({
          queryLogId: 123,
          rating: 5,
        })
        .expect(400);
      
      expect(response.ok).toBe(false);
    });
  });
});