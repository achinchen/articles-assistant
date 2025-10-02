import type { Request, Response, NextFunction } from 'express';
import { logger } from '@/utils/logger';

export function loggerMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const start = Date.now();
  
  logger.info(`→ ${req.method} ${req.path}`);
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(
      `← ${req.method} ${req.path} ${res.statusCode} ${duration}ms`
    );
  });
  
  next();
}