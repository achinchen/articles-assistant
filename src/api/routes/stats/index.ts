import { Router } from 'express';
import { query } from '@/db/client';

const router: Router = Router();

router.get('/', async (req, res, next) => {
  try {
    const articleResult = await query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE locale = 'zh') as zh_count,
        COUNT(*) FILTER (WHERE locale = 'en') as en_count
      FROM articles
    `);
    
    const chunkResult = await query('SELECT COUNT(*) as count FROM chunks');
    const embeddingResult = await query('SELECT COUNT(*) as count FROM embeddings');
    
    let queryStats = null;
    try {
      const queryResult = await query(`
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as last_24h
        FROM queries
      `);
      queryStats = {
        total: parseInt(queryResult.rows[0].total),
        last24h: parseInt(queryResult.rows[0].last_24h),
      };
    } catch (error) {
      queryStats = null;
    }
    
    res.json({
      success: true,
      data: {
        articles: {
          total: parseInt(articleResult.rows[0].total),
          byLocale: {
            zh: parseInt(articleResult.rows[0].zh_count),
            en: parseInt(articleResult.rows[0].en_count),
          },
        },
        chunks: parseInt(chunkResult.rows[0].count),
        embeddings: parseInt(embeddingResult.rows[0].count),
        queries: queryStats,
      },
    });
    
  } catch (error) {
    next(error);
  }
});

export default router;