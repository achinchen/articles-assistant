import { Router } from 'express';
import { DatabaseOptimizer } from '@/db/optimization';
import { logger } from '@/utils/logger';

const router: Router = Router();

// Get database performance overview
router.get('/performance', async (req, res, next) => {
  try {
    const [tableStats, indexAnalysis, connectionStats, vectorAnalysis] = await Promise.all([
      DatabaseOptimizer.getTableStats(),
      DatabaseOptimizer.getIndexAnalysis(),
      DatabaseOptimizer.getConnectionStats(),
      DatabaseOptimizer.analyzeVectorIndex(),
    ]);

    res.json({
      success: true,
      data: {
        tableStats,
        indexAnalysis,
        connectionStats,
        vectorAnalysis,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Database performance analysis error:', error);
    next(error);
  }
});

// Get table statistics
router.get('/tables', async (req, res, next) => {
  try {
    const tableStats = await DatabaseOptimizer.getTableStats();
    
    res.json({
      success: true,
      data: {
        tables: tableStats,
        summary: {
          totalTables: tableStats.length,
          totalSize: tableStats.reduce((sum, t) => sum + t.sizeMB, 0),
          avgScanRatio: tableStats.reduce((sum, t) => sum + t.scanRatio, 0) / tableStats.length,
        },
      },
    });
  } catch (error) {
    logger.error('Table stats error:', error);
    next(error);
  }
});

// Get index analysis
router.get('/indexes', async (req, res, next) => {
  try {
    const indexAnalysis = await DatabaseOptimizer.getIndexAnalysis();
    
    const summary = {
      totalIndexes: indexAnalysis.length,
      totalSize: indexAnalysis.reduce((sum, i) => sum + i.sizeMB, 0),
      unusedIndexes: indexAnalysis.filter(i => i.scans === 0).length,
      inefficientIndexes: indexAnalysis.filter(i => i.efficiency < 0.1 && i.scans > 0).length,
    };
    
    res.json({
      success: true,
      data: {
        indexes: indexAnalysis,
        summary,
      },
    });
  } catch (error) {
    logger.error('Index analysis error:', error);
    next(error);
  }
});

// Get slow queries
router.get('/slow-queries', async (req, res, next) => {
  try {
    const slowQueries = await DatabaseOptimizer.getSlowQueries();
    
    res.json({
      success: true,
      data: {
        queries: slowQueries,
        count: slowQueries.length,
        totalTime: slowQueries.reduce((sum, q) => sum + q.totalTime, 0),
      },
    });
  } catch (error) {
    logger.error('Slow queries analysis error:', error);
    next(error);
  }
});

// Get optimization recommendations
router.get('/recommendations', async (req, res, next) => {
  try {
    const recommendations = await DatabaseOptimizer.getOptimizationRecommendations();
    
    const summary = {
      total: recommendations.length,
      high: recommendations.filter(r => r.priority === 'high').length,
      medium: recommendations.filter(r => r.priority === 'medium').length,
      low: recommendations.filter(r => r.priority === 'low').length,
      categories: [...new Set(recommendations.map(r => r.category))],
    };
    
    res.json({
      success: true,
      data: {
        recommendations,
        summary,
      },
    });
  } catch (error) {
    logger.error('Optimization recommendations error:', error);
    next(error);
  }
});

// Run database maintenance
router.post('/maintenance', async (req, res, next) => {
  try {
    const result = await DatabaseOptimizer.runMaintenance();
    
    res.json({
      success: result.success,
      data: {
        message: result.message,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Database maintenance error:', error);
    next(error);
  }
});

// Get vector index analysis
router.get('/vector-index', async (req, res, next) => {
  try {
    const analysis = await DatabaseOptimizer.analyzeVectorIndex();
    
    res.json({
      success: true,
      data: analysis,
    });
  } catch (error) {
    logger.error('Vector index analysis error:', error);
    next(error);
  }
});

// Get connection statistics
router.get('/connections', async (req, res, next) => {
  try {
    const stats = await DatabaseOptimizer.getConnectionStats();
    
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('Connection stats error:', error);
    next(error);
  }
});

export default router;