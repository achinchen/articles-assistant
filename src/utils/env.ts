import dotenv from 'dotenv';
dotenv.config();

const POSTGRES_USER = process.env.POSTGRES_USER || 'postgres';
const POSTGRES_PASSWORD = process.env.POSTGRES_PASSWORD || 'postgres';
const POSTGRES_DB = process.env.POSTGRES_DB || 'articles-assistant';
const POSTGRES_HOST = process.env.POSTGRES_HOST || 'localhost';
const POSTGRES_PORT = process.env.POSTGRES_PORT || '5432';

const computedDatabaseUrl = `postgres://${encodeURIComponent(POSTGRES_USER)}:${encodeURIComponent(POSTGRES_PASSWORD)}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}`;

export const env = {
  DATABASE_URL: process.env.DATABASE_URL && process.env.DATABASE_URL.trim().length > 0
    ? process.env.DATABASE_URL
    : computedDatabaseUrl,
  POSTGRES_USER: POSTGRES_USER,
  POSTGRES_PASSWORD: POSTGRES_PASSWORD,
  POSTGRES_DB: POSTGRES_DB,
  POSTGRES_HOST: POSTGRES_HOST,
  POSTGRES_PORT: parseInt(POSTGRES_PORT),
  DB_CONTAINER_NAME: process.env.DB_CONTAINER_NAME || 'articles-assistant-db',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: Number(process.env.PORT) || 3002,
  CORS_ORIGIN: process.env.CORS_ORIGINS || '*',
  RATE_LIMIT_PER_MINUTE: parseInt(process.env.RATE_LIMIT_PER_MINUTE || '20'),
  
  validate() {
    const missing: string[] = [];

    if ((process.env.NODE_ENV || 'development') === 'production' && !this.OPENAI_API_KEY) {
      missing.push('OPENAI_API_KEY');
    }

    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
  }
} as const;

if (process.env.NODE_ENV !== 'test') {
  try {
    env.validate();
  } catch (error: any) {
    console.error('❌ Environment validation failed:', error.message);
    console.error('💡 Tip: Copy .env.example to .env and fill in the values');
    process.exit(1);
  }
}