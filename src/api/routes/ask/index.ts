import { Router } from 'express';
import { query } from '@/query';
import { logger } from '@/utils/logger';
import { validateAskRequest } from './validator';
import { ApiError } from '@/api/errors';
import { AnalyticsService } from '@/analytics/service';
import { SEARCH_METHOD } from './constants';

const router: Router = Router();

router.post('/', async (req, res, next) => {
  const startTime = Date.now();
  const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

  let queryLogId: number | null = null;

  
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

    queryLogId = await AnalyticsService.logQuery({
      queryText,
      queryLocale: result.metadata.queryLocale,
      searchMethod: useHybridSearch ? 'hybrid' : 'vector',
      chunksRetrieved: result.metadata.chunksRetrieved,
      chunksUsed: result.metadata.chunksUsed,
      answerLength: result.answer.length,
      hasSources: result.sources.length > 0,
      responseTimeMs: responseTime,
      tokensUsed: result.metadata.tokensUsed.total,
      model: result.metadata.model,
      requestId,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      referer: req.get('referer'),
    });
        
    logger.info(`[${requestId}] Query completed in ${responseTime}ms`);

    await AnalyticsService.trackCost(
      new Date(),
      0,// embedding tokens (already done in ingestion)
      result.metadata.tokensUsed.prompt,
      result.metadata.tokensUsed.completion
    );
    
    res.json({
      success: true,
      data: {
        answer: result.answer,
        sources: result.sources.map(({ id, articleSlug, articleTitle, similarity, locale, url }) => ({
          id,
          articleSlug,
          articleTitle,
          similarity,
          locale,
          url,
        })),
        metadata: {
          ...result.metadata,
          searchMethod: useHybridSearch ? SEARCH_METHOD.HYBRID : SEARCH_METHOD.VECTOR,
          queryLogId,
          requestId,
        },
      },
    });
    
  } catch (error) {
    logger.error(`[${requestId}] Query failed:`, error);

    if (error instanceof ApiError) {
      await AnalyticsService.logError(
        req.body.query || '',
        error.message,
        error.code,
        requestId
      );
    }
    next(error);
  }
});

export default router;