import { Router } from 'express';
import { query } from '@/db/client';
import OpenAI from 'openai';
import { env } from '@/utils/env';

const router: Router = Router();

router.get('/', async (req, res) => {
  const checks = {
    database: false,
    openai: false,
  };
  
  try {
    await query('SELECT 1');
    checks.database = true;
  } catch (error) {
    checks.database = false;
  }
  
  try {
    const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
    await openai.models.list();
    checks.openai = true;
  } catch (error) {
    checks.openai = false;
  }
  
  const isHealthy = checks.database && checks.openai;
  const statusCode = isHealthy ? 200 : 503;
  
  res.status(statusCode).json({
    status: isHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    services: checks,
    version: '1.0.0',
  });
});

export default router;