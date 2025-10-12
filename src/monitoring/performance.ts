import { CacheService } from '@/cache/service';
import { DatabaseOptimizer } from '@/db/optimization';
import { ThresholdOptimizer } from '@/query/optimization/threshold';
import { logger } from '@/utils/logger';

export interface PerformanceMetrics {
  timestamp: string;
  cache: {
    hits: number;
    misses: number;
    errors: number;
    hitRate: number;
    memoryUsageMB: number;
  };
  database: {
    connectionCount: number;
    cacheHitRatio: number;
    totalQueries: number;
    avgResponseTime: number;
  };
  optimization: {
    thresholdOptimization: {
      totalQueries: number;
      avgThreshold: number;
      avgSimilarity: number;
      avgRating: number;
    };
    queryEnhancement: {
      enhancementsAttempted: number;
      enhancementsSucceeded: number;
      avgConfidence: number;
    };
  };
  api: {
    totalRequests: number;
    avgResponseTime: number;
    errorRate: number;
    cacheUtilization: number;
  };
}

export interface AlertRule {
  id: string;
  name: string;
  condition: (metrics: PerformanceMetrics) => boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
}

export interface Alert {
  id: string;
  rule: AlertRule;
  triggeredAt: Date;
  metrics: PerformanceMetrics;
  acknowledged: boolean;
}

export class PerformanceMonitor {
  private static alerts: Alert[] = [];
  private static metricsHistory: PerformanceMetrics[] = [];
  private static readonly MAX_HISTORY = 1000; // Keep last 1000 metrics
  
  // Default alert rules
  private static alertRules: AlertRule[] = [
    {
      id: 'cache-hit-rate-low',
      name: 'Low Cache Hit Rate',
      condition: (m) => m.cache.hitRate < 0.5,
      severity: 'medium',
      message: 'Cache hit rate is below 50%',
    },
    {
      id: 'cache-errors-high',
      name: 'High Cache Error Rate',
      condition: (m) => m.cache.errors > 10,
      severity: 'high',
      message: 'Cache experiencing high error count',
    },
    {
      id: 'db-cache-hit-low',
      name: 'Low Database Cache Hit Rate',
      condition: (m) => m.database.cacheHitRatio < 90,
      severity: 'medium',
      message: 'Database cache hit ratio is below 90%',
    },
    {
      id: 'api-error-rate-high',
      name: 'High API Error Rate',
      condition: (m) => m.api.errorRate > 0.05,
      severity: 'high',
      message: 'API error rate is above 5%',
    },
    {
      id: 'response-time-slow',
      name: 'Slow API Response Time',
      condition: (m) => m.api.avgResponseTime > 5000,
      severity: 'medium',
      message: 'Average API response time is above 5 seconds',
    },
    {
      id: 'memory-usage-high',
      name: 'High Cache Memory Usage',
      condition: (m) => m.cache.memoryUsageMB > 500,
      severity: 'medium',
      message: 'Cache memory usage is above 500MB',
    },
  ];

  /**
   * Collect current performance metrics
   */
  static async collectMetrics(): Promise<PerformanceMetrics> {
    try {
      const [
        cacheMetrics,
        cacheInfo,
        dbStats,
        thresholdStats,
      ] = await Promise.all([
        CacheService.getMetrics(),
        CacheService.getInfo(),
        DatabaseOptimizer.getConnectionStats(),
        ThresholdOptimizer.getPerformanceStats(),
      ]);

      const metrics: PerformanceMetrics = {
        timestamp: new Date().toISOString(),
        cache: {
          hits: cacheMetrics.hits,
          misses: cacheMetrics.misses,
          errors: cacheMetrics.errors,
          hitRate: cacheMetrics.hitRate,
          memoryUsageMB: parseInt(cacheInfo.used_memory || '0') / 1024 / 1024,
        },
        database: {
          connectionCount: dbStats.totalConnections,
          cacheHitRatio: dbStats.cacheHitRatio,
          totalQueries: 0, // Would need to track this separately
          avgResponseTime: 0, // Would need to track this separately
        },
        optimization: {
          thresholdOptimization: {
            totalQueries: thresholdStats.totalQueries,
            avgThreshold: thresholdStats.avgThreshold,
            avgSimilarity: thresholdStats.avgSimilarity,
            avgRating: thresholdStats.avgRating,
          },
          queryEnhancement: {
            enhancementsAttempted: 0, // Would need to track this
            enhancementsSucceeded: 0, // Would need to track this
            avgConfidence: 0, // Would need to track this
          },
        },
        api: {
          totalRequests: cacheMetrics.hits + cacheMetrics.misses,
          avgResponseTime: 0, // Would need to track this separately
          errorRate: 0, // Would need to track this separately
          cacheUtilization: cacheMetrics.hitRate,
        },
      };

      // Store in history
      this.metricsHistory.push(metrics);
      if (this.metricsHistory.length > this.MAX_HISTORY) {
        this.metricsHistory = this.metricsHistory.slice(-this.MAX_HISTORY);
      }

      // Check for alerts
      this.checkAlerts(metrics);

      return metrics;
    } catch (error) {
      logger.error('Failed to collect metrics:', error);
      throw error;
    }
  }

  /**
   * Check alert conditions and trigger alerts
   */
  private static checkAlerts(metrics: PerformanceMetrics): void {
    for (const rule of this.alertRules) {
      try {
        if (rule.condition(metrics)) {
          // Check if alert is already active (not acknowledged)
          const existingAlert = this.alerts.find(
            a => a.rule.id === rule.id && !a.acknowledged
          );

          if (!existingAlert) {
            const alert: Alert = {
              id: `${rule.id}-${Date.now()}`,
              rule,
              triggeredAt: new Date(),
              metrics,
              acknowledged: false,
            };

            this.alerts.push(alert);
            logger.warn('Performance alert triggered:', {
              rule: rule.name,
              severity: rule.severity,
              message: rule.message,
            });
          }
        }
      } catch (error) {
        logger.error('Error checking alert rule:', { rule: rule.id, error });
      }
    }
  }

  /**
   * Get current alerts
   */
  static getAlerts(): Alert[] {
    return [...this.alerts];
  }

  /**
   * Get active (unacknowledged) alerts
   */
  static getActiveAlerts(): Alert[] {
    return this.alerts.filter(a => !a.acknowledged);
  }

  /**
   * Acknowledge an alert
   */
  static acknowledgeAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      logger.info('Alert acknowledged:', { alertId, rule: alert.rule.name });
      return true;
    }
    return false;
  }

  /**
   * Clear acknowledged alerts older than 24 hours
   */
  static clearOldAlerts(): number {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const initialCount = this.alerts.length;
    
    this.alerts = this.alerts.filter(
      a => !a.acknowledged || a.triggeredAt > cutoff
    );
    
    const cleared = initialCount - this.alerts.length;
    if (cleared > 0) {
      logger.info('Cleared old alerts:', { count: cleared });
    }
    
    return cleared;
  }

  /**
   * Get metrics history
   */
  static getMetricsHistory(limit?: number): PerformanceMetrics[] {
    const history = [...this.metricsHistory];
    return limit ? history.slice(-limit) : history;
  }

  /**
   * Get performance summary for the last N minutes
   */
  static getPerformanceSummary(minutes: number = 60): {
    avgCacheHitRate: number;
    avgResponseTime: number;
    totalRequests: number;
    alertCount: number;
    trends: {
      cacheHitRate: 'improving' | 'degrading' | 'stable';
      responseTime: 'improving' | 'degrading' | 'stable';
    };
  } {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000);
    const recentMetrics = this.metricsHistory.filter(
      m => new Date(m.timestamp) > cutoff
    );

    if (recentMetrics.length === 0) {
      return {
        avgCacheHitRate: 0,
        avgResponseTime: 0,
        totalRequests: 0,
        alertCount: 0,
        trends: {
          cacheHitRate: 'stable',
          responseTime: 'stable',
        },
      };
    }

    const avgCacheHitRate = recentMetrics.reduce((sum, m) => sum + m.cache.hitRate, 0) / recentMetrics.length;
    const avgResponseTime = recentMetrics.reduce((sum, m) => sum + m.api.avgResponseTime, 0) / recentMetrics.length;
    const totalRequests = recentMetrics.reduce((sum, m) => sum + m.api.totalRequests, 0);
    
    const recentAlerts = this.alerts.filter(
      a => a.triggeredAt > cutoff
    ).length;

    // Calculate trends (simple comparison of first half vs second half)
    const midpoint = Math.floor(recentMetrics.length / 2);
    const firstHalf = recentMetrics.slice(0, midpoint);
    const secondHalf = recentMetrics.slice(midpoint);

    let cacheHitRateTrend: 'improving' | 'degrading' | 'stable' = 'stable';
    let responseTimeTrend: 'improving' | 'degrading' | 'stable' = 'stable';

    if (firstHalf.length > 0 && secondHalf.length > 0) {
      const firstHalfCacheRate = firstHalf.reduce((sum, m) => sum + m.cache.hitRate, 0) / firstHalf.length;
      const secondHalfCacheRate = secondHalf.reduce((sum, m) => sum + m.cache.hitRate, 0) / secondHalf.length;
      
      const cacheRateDiff = secondHalfCacheRate - firstHalfCacheRate;
      if (Math.abs(cacheRateDiff) > 0.05) { // 5% threshold
        cacheHitRateTrend = cacheRateDiff > 0 ? 'improving' : 'degrading';
      }

      const firstHalfResponseTime = firstHalf.reduce((sum, m) => sum + m.api.avgResponseTime, 0) / firstHalf.length;
      const secondHalfResponseTime = secondHalf.reduce((sum, m) => sum + m.api.avgResponseTime, 0) / secondHalf.length;
      
      const responseTimeDiff = secondHalfResponseTime - firstHalfResponseTime;
      if (Math.abs(responseTimeDiff) > 200) { // 200ms threshold
        responseTimeTrend = responseTimeDiff < 0 ? 'improving' : 'degrading';
      }
    }

    return {
      avgCacheHitRate,
      avgResponseTime,
      totalRequests,
      alertCount: recentAlerts,
      trends: {
        cacheHitRate: cacheHitRateTrend,
        responseTime: responseTimeTrend,
      },
    };
  }

  /**
   * Add custom alert rule
   */
  static addAlertRule(rule: AlertRule): void {
    this.alertRules.push(rule);
    logger.info('Custom alert rule added:', { id: rule.id, name: rule.name });
  }

  /**
   * Remove alert rule
   */
  static removeAlertRule(ruleId: string): boolean {
    const initialLength = this.alertRules.length;
    this.alertRules = this.alertRules.filter(r => r.id !== ruleId);
    
    if (this.alertRules.length < initialLength) {
      logger.info('Alert rule removed:', { ruleId });
      return true;
    }
    return false;
  }

  /**
   * Get all alert rules
   */
  static getAlertRules(): AlertRule[] {
    return [...this.alertRules];
  }

  /**
   * Start periodic monitoring
   */
  static startMonitoring(intervalMinutes: number = 5): NodeJS.Timeout {
    logger.info('Starting performance monitoring:', { intervalMinutes });
    
    return setInterval(async () => {
      try {
        await this.collectMetrics();
        this.clearOldAlerts();
      } catch (error) {
        logger.error('Monitoring cycle failed:', error);
      }
    }, intervalMinutes * 60 * 1000);
  }
}