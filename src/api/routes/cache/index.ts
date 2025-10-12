import { Router } from 'express';
import { CacheService } from '@/cache/service';
import { isRedisConnected, pingRedis } from '@/cache/client';
import { logger } from '@/utils/logger';

const router: Router = Router();

// Get cache metrics
router.get('/metrics', async (req, res, next) => {
  try {
    const metrics = await CacheService.getMetrics();
    res.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    logger.error('Cache metrics error:', error);
    next(error);
  }
});

// Get cache info
router.get('/info', async (req, res, next) => {
  try {
    const [info, isConnected, pingResult] = await Promise.all([
      CacheService.getInfo(),
      Promise.resolve(isRedisConnected()),
      pingRedis(),
    ]);

    res.json({
      success: true,
      data: {
        connected: isConnected,
        ping: pingResult,
        info,
      },
    });
  } catch (error) {
    logger.error('Cache info error:', error);
    next(error);
  }
});

// Clear cache by pattern
router.delete('/pattern/:pattern', async (req, res, next) => {
  try {
    const { pattern } = req.params;
    const deleted = await CacheService.invalidatePattern(pattern);
    
    res.json({
      success: true,
      data: {
        pattern,
        deleted,
      },
    });
  } catch (error) {
    logger.error('Cache pattern deletion error:', error);
    next(error);
  }
});

// Clear all cache
router.delete('/all', async (req, res, next) => {
  try {
    await CacheService.clear();
    
    res.json({
      success: true,
      data: {
        message: 'All cache cleared',
      },
    });
  } catch (error) {
    logger.error('Cache clear error:', error);
    next(error);
  }
});

// Reset cache metrics
router.delete('/metrics', async (req, res, next) => {
  try {
    await CacheService.resetMetrics();
    
    res.json({
      success: true,
      data: {
        message: 'Cache metrics reset',
      },
    });
  } catch (error) {
    logger.error('Cache metrics reset error:', error);
    next(error);
  }
});

export default router;