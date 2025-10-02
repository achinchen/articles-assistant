import type { Request, Response } from 'express';
import { ApiError } from '@/api/errors';
import { logger } from '@/utils/logger';

export function errorMiddleware(
  err: Error | ApiError,
  req: Request,
  res: Response,
) {
  logger.error('API Error:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });
  
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        ...(err.details && { details: err.details }),
      },
    });
  }
  
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    },
  });
}