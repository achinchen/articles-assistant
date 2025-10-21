import { Pool, QueryResult } from 'pg';
import { env } from '@/utils/env';
import { logger } from '@/utils/logger';

function buildPool(): Pool {
  if (env.DATABASE_URL && env.DATABASE_URL.trim().length > 0) {
    return new Pool({ connectionString: env.DATABASE_URL });
  }
  throw new Error('No valid Postgres connection configuration resolved');
}

export const pool = buildPool();

pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Database connection failed:', err.message);
    process.exit(1);
  }
  logger.success('Database connected:', res.rows[0].now);
});

export async function query(text: string, params?: any[]): Promise<QueryResult> {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    
    if (process.env.NODE_ENV === 'development') {
      logger.info('Executed query', { 
        text: text.substring(0, 50) + '...', 
        duration, 
        rows: res.rowCount 
      });
    }
    
    return res;
  } catch (error) {
    logger.error('Query error:', error);
    throw error;
  }
}

process.on('SIGINT', () => {
  pool.end(() => {
    logger.info('\n👋 Database pool closed');
    process.exit(0);
  });
});