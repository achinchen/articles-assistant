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
import analyticsRouter from './routes/analytics';
import feedbackRouter from './routes/feedback';

export function createServer(port: number): Express {
  const app = express();
  
  app.use(helmet());
  
  // Custom CORS middleware with JSON error response
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    const allowedOrigins = env.CORS_ORIGINS;
    
    if (origin && !allowedOrigins.includes(origin)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'CORS_NOT_ALLOWED',
          message: `Origin ${origin} not allowed by CORS policy`,
        },
      });
    }
    
    next();
  });
  
  const corsOptions = {
    origin: env.CORS_ORIGINS,
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
  app.use('/api/analytics', analyticsRouter);
  app.use('/api/feedback', feedbackRouter);
  
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

export function startServer(port: number): void {
  const app = createServer(port);
  
  const server = app.listen(port, () => {
    logger.info(`🚀 Server running on http://localhost:${port}`);
  });

  server.on('error', (error: any) => {
    if (error.code === 'EADDRINUSE') {
      logger.error(`Port ${port} is already in use. Please try a different port.`);
    } else {
      logger.error('Server error:', error);
    }
    process.exit(1);
  });

  process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down server...');
    server.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    logger.info('SIGINT received, shutting down server...');
    server.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
  });
}