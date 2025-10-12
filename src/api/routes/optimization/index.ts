import { Router } from 'express';
import { ThresholdOptimizer } from '@/query/optimization/threshold';
import { QueryEnhancementService } from '@/query/enhancement';
import { logger } from '@/utils/logger';

const router: Router = Router();

// Get threshold optimization stats
router.get('/threshold/stats', async (req, res, next) => {
  try {
    const stats = ThresholdOptimizer.getPerformanceStats();
    const config = ThresholdOptimizer.getConfig();
    
    res.json({
      success: true,
      data: {
        stats,
        config,
      },
    });
  } catch (error) {
    logger.error('Threshold stats error:', error);
    next(error);
  }
});

// Update threshold optimization config
router.put('/threshold/config', async (req, res, next) => {
  try {
    const { config } = req.body;
    
    if (!config || typeof config !== 'object') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_CONFIG',
          message: 'Config object is required',
        },
      });
    }
    
    ThresholdOptimizer.updateConfig(config);
    
    res.json({
      success: true,
      data: {
        message: 'Threshold optimization config updated',
        config: ThresholdOptimizer.getConfig(),
      },
    });
  } catch (error) {
    logger.error('Threshold config update error:', error);
    next(error);
  }
});

// Clear threshold optimization history
router.delete('/threshold/history', async (req, res, next) => {
  try {
    ThresholdOptimizer.clearHistory();
    
    res.json({
      success: true,
      data: {
        message: 'Threshold optimization history cleared',
      },
    });
  } catch (error) {
    logger.error('Threshold history clear error:', error);
    next(error);
  }
});

// Export threshold optimization history
router.get('/threshold/export', async (req, res, next) => {
  try {
    const history = ThresholdOptimizer.exportHistory();
    
    res.json({
      success: true,
      data: {
        history,
        count: history.length,
      },
    });
  } catch (error) {
    logger.error('Threshold export error:', error);
    next(error);
  }
});

// Get query enhancement config
router.get('/enhancement/config', async (req, res, next) => {
  try {
    const config = QueryEnhancementService.getConfig();
    
    res.json({
      success: true,
      data: { config },
    });
  } catch (error) {
    logger.error('Enhancement config error:', error);
    next(error);
  }
});

// Update query enhancement config
router.put('/enhancement/config', async (req, res, next) => {
  try {
    const { config } = req.body;
    
    if (!config || typeof config !== 'object') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_CONFIG',
          message: 'Config object is required',
        },
      });
    }
    
    QueryEnhancementService.updateConfig(config);
    
    res.json({
      success: true,
      data: {
        message: 'Query enhancement config updated',
        config: QueryEnhancementService.getConfig(),
      },
    });
  } catch (error) {
    logger.error('Enhancement config update error:', error);
    next(error);
  }
});

// Test query enhancement
router.post('/enhancement/test', async (req, res, next) => {
  try {
    const { query } = req.body;
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_QUERY',
          message: 'Query string is required',
        },
      });
    }
    
    const shouldEnhance = QueryEnhancementService.shouldEnhance(query);
    
    if (!shouldEnhance) {
      return res.json({
        success: true,
        data: {
          shouldEnhance: false,
          reason: 'Query does not meet enhancement criteria',
          originalQuery: query,
        },
      });
    }
    
    const enhancement = await QueryEnhancementService.enhance(query);
    
    res.json({
      success: true,
      data: {
        shouldEnhance: true,
        enhancement,
      },
    });
  } catch (error) {
    logger.error('Enhancement test error:', error);
    next(error);
  }
});

export default router;