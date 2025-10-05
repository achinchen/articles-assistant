import { startServer } from '@/api/server';
import { env } from '@/utils/env';
import { logger } from '@/utils/logger';

const port = env.PORT;

try {
  startServer(port);
} catch (error) {
  logger.error('Failed to start server:', error);
  process.exit(1);
}