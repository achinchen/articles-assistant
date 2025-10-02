import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from '@/utils/env';
import { logger } from '@/utils/logger';
import askRouter from './routes/ask';
import healthRouter from './routes/health';
import statsRouter from './routes/stats';
import { errorMiddleware } from './routes/middle/error';
import { loggerMiddleware } from './routes/middle/logger';

export function createServer(): Express {
  const app = express();
  
  app.use(helmet());
  
  const corsOptions = {
    origin: env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  };
  app.use(cors(corsOptions));
  
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  
  app.use(loggerMiddleware);
  
  const limiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: env.RATE_LIMIT_PER_MINUTE, 
    message: {
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please try again later.',
      },
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
  
  app.use('/api', limiter);
  
  app.use('/api/ask', askRouter);
  app.use('/api/health', healthRouter);
  app.use('/api/stats', statsRouter);
  
  app.get('/', (req, res) => {
    res.json({
      name: 'Articles Assistant API',
      version: '1.0.0',
      endpoints: {
        ask: 'POST /api/ask',
        health: 'GET /api/health',
        stats: 'GET /api/stats',
      },
    });
  });
  
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Endpoint ${req.method} ${req.originalUrl} not found`,
      },
    });
  });
  
  app.use(errorMiddleware);
  
  return app;
}

export function startServer(port: number = 3000): void {
  const app = createServer();
  
  app.listen(port, () => {
    logger.info(`🚀 Server running on http://localhost:${port}`);
  });
}