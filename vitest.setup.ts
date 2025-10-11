import { vi } from 'vitest';

vi.stubEnv('NODE_ENV', 'test');

vi.mock('pg', () => {
  class Pool {
    query: any;
    end: any;
    constructor() {
      this.query = vi.fn((text: any, params?: any, cb?: any) => {
        if (typeof params === 'function') {
          cb = params;
        }
        if (typeof cb === 'function') {
          cb(null, { rows: [{ now: new Date().toISOString() }], rowCount: 1 });
          return;
        }
        return Promise.resolve({ rows: [], rowCount: 0 });
      });
      this.end = vi.fn(() => Promise.resolve());
    }
  }
  return { Pool };
});

vi.mock('@/db/client', () => ({
  query: vi.fn(),
}));

vi.mock('@/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
  },
}));


