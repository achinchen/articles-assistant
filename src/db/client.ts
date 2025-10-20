import { Pool, QueryResult } from 'pg';
import { env } from '@/utils/env';
import { logger } from '@/utils/logger';

function buildPool(): Pool {
  // Always use local database for now
  // We'll create a separate script to sync data to Supabase
  logger.info('🔗 Using local database connection');

  // Use local development database
  try {
    if (env.DATABASE_URL && env.DATABASE_URL.trim().length > 0) {
      logger.info('🔗 Using local database connection via DATABASE_URL');
      logger.info(`🔗 Connecting to: ${env.DATABASE_URL}`);
      return new Pool({ connectionString: env.DATABASE_URL });
    }

    const host = env.POSTGRES_HOST;
    const port = env.POSTGRES_PORT;
    const user = env.POSTGRES_USER;
    const password = env.POSTGRES_PASSWORD;
    const database = env.POSTGRES_DB;

    logger.info('🔗 Using local database connection via individual params');
    logger.info(`🔗 Connecting to: ${host}:${port}/${database}`);
    return new Pool({ host, port, user, password, database });
  } catch {
    throw new Error('No valid Postgres connection configuration resolved');
  }
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