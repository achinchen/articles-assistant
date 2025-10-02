import request from 'supertest';
import express, { type Express } from 'express';
import health from '.';

describe('GET /api/health', () => {
  let app: Express;
  
  beforeAll(() => {
    app = express();
    app.use('/api/health', health);
  });
  
  it('should return health status', async () => {
    const response = await request(app)
      .get('/api/health')
      .expect((res) => {
        expect([200, 503]).toContain(res.status);
      });
    
    expect(response.body).toHaveProperty('status');
    expect(response.body).toHaveProperty('services');
    expect(response.body.services).toHaveProperty('database');
    expect(response.body.services).toHaveProperty('openai');
  });
});