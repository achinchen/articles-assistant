import { startServer } from '@/api/server';
import { env } from '@/utils/env';

const port = env.PORT;
const app = startServer(port);

export default app;