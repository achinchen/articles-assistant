import { Router } from 'express';
import { AnalyticsService } from '@/analytics/service';
import { query } from '@/db/client';

const router: Router = Router();

router.get('/summary', async (req, res, next) => {
  try {
    const days = parseInt(req.query.days as string) || 7;
    
    const [summary, feedback, costs] = await Promise.all([
      AnalyticsService.getSummary(days),
      AnalyticsService.getFeedbackStats(days),
      getCosts(days),
    ]);
    
    res.json({
      success: true,
      data: {
        period: `last_${days}_days`,
        queries: summary,
        feedback,
        costs,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/analytics/popular-queries
router.get('/popular-queries', async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;    
    const result = await query(
      `SELECT 
        query_normalized,
        query_count,
        avg_rating,
        last_queried_at
      FROM popular_queries
      ORDER BY query_count DESC
      LIMIT $1`,
      [limit]
    );
    
    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/analytics/performance
router.get('/performance', async (req, res, next) => {
  try {
    const hours = parseInt(req.query.hours as string) || 24;    
    const result = await query(
      `SELECT
        DATE_TRUNC('hour', created_at) as hour,
        COUNT(*) as query_count,
        AVG(response_time_ms) as avg_response_time,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY response_time_ms) as p50,
        PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time_ms) as p95,
        AVG(tokens_used) as avg_tokens
      FROM query_logs
      WHERE created_at >= NOW() - INTERVAL '${hours} hours'
      GROUP BY hour
      ORDER BY hour DESC`,
      []
    );
    
    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    next(error);
  }
});

// Helper function
async function getCosts(days: number) {
  const result = await query(
    `SELECT
      SUM(total_cost) as total_cost,
      AVG(cost_per_query) as avg_cost_per_query,
      SUM(total_tokens) as total_tokens
    FROM cost_tracking
    WHERE date >= CURRENT_DATE - INTERVAL '${days} days'`
  );
  return result.rows[0];
}

export default router;