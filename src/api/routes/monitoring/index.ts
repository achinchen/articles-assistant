import { Router } from 'express';
import { PerformanceMonitor } from '@/monitoring/performance';
import { logger } from '@/utils/logger';

const router: Router = Router();

// Get current performance metrics
router.get('/metrics', async (req, res, next) => {
  try {
    const metrics = await PerformanceMonitor.collectMetrics();
    
    res.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    logger.error('Metrics collection error:', error);
    next(error);
  }
});

// Get performance summary
router.get('/summary', async (req, res, next) => {
  try {
    const minutes = parseInt(req.query.minutes as string) || 60;
    const summary = PerformanceMonitor.getPerformanceSummary(minutes);
    
    res.json({
      success: true,
      data: {
        ...summary,
        timeRange: `${minutes} minutes`,
      },
    });
  } catch (error) {
    logger.error('Performance summary error:', error);
    next(error);
  }
});

// Get metrics history
router.get('/history', async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const history = PerformanceMonitor.getMetricsHistory(limit);
    
    res.json({
      success: true,
      data: {
        history,
        count: history.length,
      },
    });
  } catch (error) {
    logger.error('Metrics history error:', error);
    next(error);
  }
});

// Get all alerts
router.get('/alerts', async (req, res, next) => {
  try {
    const alerts = PerformanceMonitor.getAlerts();
    const activeAlerts = PerformanceMonitor.getActiveAlerts();
    
    res.json({
      success: true,
      data: {
        all: alerts,
        active: activeAlerts,
        summary: {
          total: alerts.length,
          active: activeAlerts.length,
          acknowledged: alerts.filter(a => a.acknowledged).length,
          bySeverity: {
            critical: activeAlerts.filter(a => a.rule.severity === 'critical').length,
            high: activeAlerts.filter(a => a.rule.severity === 'high').length,
            medium: activeAlerts.filter(a => a.rule.severity === 'medium').length,
            low: activeAlerts.filter(a => a.rule.severity === 'low').length,
          },
        },
      },
    });
  } catch (error) {
    logger.error('Alerts retrieval error:', error);
    next(error);
  }
});

// Acknowledge an alert
router.post('/alerts/:alertId/acknowledge', async (req, res, next) => {
  try {
    const { alertId } = req.params;
    const success = PerformanceMonitor.acknowledgeAlert(alertId);
    
    if (success) {
      res.json({
        success: true,
        data: {
          message: 'Alert acknowledged',
          alertId,
        },
      });
    } else {
      res.status(404).json({
        success: false,
        error: {
          code: 'ALERT_NOT_FOUND',
          message: 'Alert not found',
        },
      });
    }
  } catch (error) {
    logger.error('Alert acknowledgment error:', error);
    next(error);
  }
});

// Get alert rules
router.get('/alert-rules', async (req, res, next) => {
  try {
    const rules = PerformanceMonitor.getAlertRules();
    
    res.json({
      success: true,
      data: {
        rules,
        count: rules.length,
      },
    });
  } catch (error) {
    logger.error('Alert rules retrieval error:', error);
    next(error);
  }
});

// Add custom alert rule
router.post('/alert-rules', async (req, res, next) => {
  try {
    const { rule } = req.body;
    
    if (!rule || !rule.id || !rule.name || !rule.severity || !rule.message) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_RULE',
          message: 'Rule must have id, name, severity, and message',
        },
      });
    }
    
    // Note: condition function would need to be serialized/evaluated carefully
    // For now, we'll skip adding custom rules via API for security
    
    res.status(501).json({
      success: false,
      error: {
        code: 'NOT_IMPLEMENTED',
        message: 'Custom alert rules via API not yet implemented',
      },
    });
  } catch (error) {
    logger.error('Alert rule creation error:', error);
    next(error);
  }
});

// Remove alert rule
router.delete('/alert-rules/:ruleId', async (req, res, next) => {
  try {
    const { ruleId } = req.params;
    const success = PerformanceMonitor.removeAlertRule(ruleId);
    
    if (success) {
      res.json({
        success: true,
        data: {
          message: 'Alert rule removed',
          ruleId,
        },
      });
    } else {
      res.status(404).json({
        success: false,
        error: {
          code: 'RULE_NOT_FOUND',
          message: 'Alert rule not found',
        },
      });
    }
  } catch (error) {
    logger.error('Alert rule removal error:', error);
    next(error);
  }
});

// Health check endpoint with performance data
router.get('/health', async (req, res, next) => {
  try {
    const metrics = await PerformanceMonitor.collectMetrics();
    const activeAlerts = PerformanceMonitor.getActiveAlerts();
    
    const criticalAlerts = activeAlerts.filter(a => a.rule.severity === 'critical');
    const highAlerts = activeAlerts.filter(a => a.rule.severity === 'high');
    
    let status = 'healthy';
    if (criticalAlerts.length > 0) {
      status = 'critical';
    } else if (highAlerts.length > 0) {
      status = 'degraded';
    } else if (activeAlerts.length > 0) {
      status = 'warning';
    }
    
    const statusCode = status === 'critical' ? 503 : status === 'degraded' ? 200 : 200;
    
    res.status(statusCode).json({
      status,
      timestamp: new Date().toISOString(),
      alerts: {
        active: activeAlerts.length,
        critical: criticalAlerts.length,
        high: highAlerts.length,
      },
      performance: {
        cacheHitRate: metrics.cache.hitRate,
        dbCacheHitRatio: metrics.database.cacheHitRatio,
        memoryUsageMB: metrics.cache.memoryUsageMB,
      },
      uptime: process.uptime(),
    });
  } catch (error) {
    logger.error('Health check error:', error);
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: 'Failed to collect metrics',
    });
  }
});

export default router;