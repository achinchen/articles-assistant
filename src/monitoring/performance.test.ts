import { PerformanceMonitor } from './performance';

describe('Performance Monitor', () => {
  beforeEach(() => {
    // Clear alerts and history before each test
    PerformanceMonitor['alerts'] = [];
    PerformanceMonitor['metricsHistory'] = [];
  });

  it('should collect performance metrics', async () => {
    const metrics = await PerformanceMonitor.collectMetrics();
    
    expect(metrics).toBeDefined();
    expect(metrics.timestamp).toBeDefined();
    expect(metrics.cache).toBeDefined();
    expect(metrics.database).toBeDefined();
    expect(metrics.optimization).toBeDefined();
    expect(metrics.api).toBeDefined();

    // Verify cache metrics structure
    expect(metrics.cache.hits).toBeTypeOf('number');
    expect(metrics.cache.misses).toBeTypeOf('number');
    expect(metrics.cache.errors).toBeTypeOf('number');
    expect(metrics.cache.hitRate).toBeTypeOf('number');
    expect(metrics.cache.memoryUsageMB).toBeTypeOf('number');

    // Verify database metrics structure
    expect(metrics.database.connectionCount).toBeTypeOf('number');
    expect(metrics.database.cacheHitRatio).toBeTypeOf('number');

    // Verify optimization metrics structure
    expect(metrics.optimization.thresholdOptimization).toBeDefined();
    expect(metrics.optimization.queryEnhancement).toBeDefined();
  });

  it('should track metrics history', async () => {
    const initialHistory = PerformanceMonitor.getMetricsHistory();
    expect(initialHistory).toHaveLength(0);

    // Collect metrics (should add to history)
    await PerformanceMonitor.collectMetrics();
    
    const updatedHistory = PerformanceMonitor.getMetricsHistory();
    expect(updatedHistory).toHaveLength(1);

    // Collect more metrics
    await PerformanceMonitor.collectMetrics();
    
    const finalHistory = PerformanceMonitor.getMetricsHistory();
    expect(finalHistory).toHaveLength(2);
  });

  it('should generate performance summary', async () => {
    // Collect some metrics first
    await PerformanceMonitor.collectMetrics();
    await PerformanceMonitor.collectMetrics();

    const summary = PerformanceMonitor.getPerformanceSummary(60);
    
    expect(summary).toBeDefined();
    expect(summary.avgCacheHitRate).toBeTypeOf('number');
    expect(summary.avgResponseTime).toBeTypeOf('number');
    expect(summary.totalRequests).toBeTypeOf('number');
    expect(summary.alertCount).toBeTypeOf('number');
    expect(summary.trends).toBeDefined();
    expect(summary.trends.cacheHitRate).toMatch(/improving|degrading|stable/);
    expect(summary.trends.responseTime).toMatch(/improving|degrading|stable/);
  });

  it('should manage alert rules', () => {
    const initialRules = PerformanceMonitor.getAlertRules();
    const initialCount = initialRules.length;
    expect(initialCount).toBeGreaterThan(0); // Should have default rules

    // Add custom alert rule
    const customRule = {
      id: 'test-rule',
      name: 'Test Alert',
      condition: (metrics: any) => metrics.cache.hitRate < 0.1,
      severity: 'low' as const,
      message: 'Test alert message'
    };

    PerformanceMonitor.addAlertRule(customRule);
    
    const updatedRules = PerformanceMonitor.getAlertRules();
    expect(updatedRules).toHaveLength(initialCount + 1);
    expect(updatedRules.find(r => r.id === 'test-rule')).toBeDefined();

    // Remove alert rule
    const removed = PerformanceMonitor.removeAlertRule('test-rule');
    expect(removed).toBe(true);

    const finalRules = PerformanceMonitor.getAlertRules();
    expect(finalRules).toHaveLength(initialCount);
    expect(finalRules.find(r => r.id === 'test-rule')).toBeUndefined();
  });

  it('should handle alerts correctly', async () => {
    // Clear any existing alerts
    const initialAlerts = PerformanceMonitor.getAlerts();
    expect(initialAlerts).toHaveLength(0);

    // Add a test rule that should trigger
    const testRule = {
      id: 'always-trigger',
      name: 'Always Trigger Test',
      condition: () => true, // Always triggers
      severity: 'medium' as const,
      message: 'Test alert that always triggers'
    };

    PerformanceMonitor.addAlertRule(testRule);

    // Collect metrics (should trigger alert)
    await PerformanceMonitor.collectMetrics();

    const alerts = PerformanceMonitor.getAlerts();
    expect(alerts.length).toBeGreaterThan(0);

    const testAlert = alerts.find(a => a.rule.id === 'always-trigger');
    expect(testAlert).toBeDefined();
    expect(testAlert?.acknowledged).toBe(false);

    // Acknowledge the alert
    if (testAlert) {
      const acknowledged = PerformanceMonitor.acknowledgeAlert(testAlert.id);
      expect(acknowledged).toBe(true);

      const updatedAlerts = PerformanceMonitor.getAlerts();
      const acknowledgedAlert = updatedAlerts.find(a => a.id === testAlert.id);
      expect(acknowledgedAlert?.acknowledged).toBe(true);
    }

    // Clean up
    PerformanceMonitor.removeAlertRule('always-trigger');
  });

  it('should filter active alerts correctly', async () => {
    // Add test rules
    const rule1 = {
      id: 'test-rule-1',
      name: 'Test Rule 1',
      condition: () => true,
      severity: 'high' as const,
      message: 'Test alert 1'
    };

    const rule2 = {
      id: 'test-rule-2', 
      name: 'Test Rule 2',
      condition: () => true,
      severity: 'low' as const,
      message: 'Test alert 2'
    };

    PerformanceMonitor.addAlertRule(rule1);
    PerformanceMonitor.addAlertRule(rule2);

    // Trigger alerts
    await PerformanceMonitor.collectMetrics();

    const allAlerts = PerformanceMonitor.getAlerts();
    const activeAlerts = PerformanceMonitor.getActiveAlerts();

    expect(allAlerts.length).toBeGreaterThanOrEqual(2);
    expect(activeAlerts.length).toBeGreaterThanOrEqual(2);

    // Acknowledge one alert
    const firstAlert = activeAlerts[0];
    PerformanceMonitor.acknowledgeAlert(firstAlert.id);

    const newActiveAlerts = PerformanceMonitor.getActiveAlerts();
    expect(newActiveAlerts.length).toBe(activeAlerts.length - 1);

    // Clean up
    PerformanceMonitor.removeAlertRule('test-rule-1');
    PerformanceMonitor.removeAlertRule('test-rule-2');
  });
});