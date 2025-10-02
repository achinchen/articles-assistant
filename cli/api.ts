import { startServer } from '@/api/server';
import { env } from '@/utils/env';
import { logger } from '@/utils/logger';

const port = env.PORT;

process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully...');
  process.exit(0);
});

try {
  startServer(port);
} catch (error) {
  logger.error('Failed to start server:', error);
  process.exit(1);
}