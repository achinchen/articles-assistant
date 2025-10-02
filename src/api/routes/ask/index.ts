import { Router } from 'express';
import { query } from '@/query';
import { logger } from '@/utils/logger';
import { validateAskRequest } from './validator';
import { ApiError } from '@/api/errors';
import { SEARCH_METHOD } from './constants';

const router: Router = Router();

router.post('/', async (req, res, next) => {
  const startTime = Date.now();
  const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  
  try {
    const validation = validateAskRequest(req.body);
    if (!validation.valid) {
      throw new ApiError('VALIDATION_ERROR', validation.error || 'Invalid request', 400);
    }
    
    const { query: queryText, locale, useHybridSearch, config } = req.body;
    
    logger.info(`[${requestId}] Query request:`, {
      query: queryText,
      locale,
      useHybridSearch,
    });
    
    const result = await query({
      query: queryText,
      locale,
      useHybridSearch,
      config,
    });
    
    const responseTime = Date.now() - startTime;
    
    logger.info(`[${requestId}] Query completed in ${responseTime}ms`);
    
    res.json({
      success: true,
      data: {
        answer: result.answer,
        sources: result.sources.map(({ id, articleSlug, articleTitle, similarity, locale }) => ({
          id,
          articleSlug,
          articleTitle,
          similarity,
          locale,
        })),
        metadata: {
          ...result.metadata,
          searchMethod: useHybridSearch ? SEARCH_METHOD.HYBRID : SEARCH_METHOD.VECTOR,
          requestId,
        },
      },
    });
    
  } catch (error) {
    logger.error(`[${requestId}] Query failed:`, error);
    next(error);
  }
});

export default router;