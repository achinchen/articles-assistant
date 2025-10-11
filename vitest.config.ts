import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['vitest.setup.ts'],
    
    include: [
      'src/**/*.test.ts',
      'tests/**/*.test.ts',
    ],
    
    exclude: [
      'node_modules',
      'dist',
      'data',
    ],
    
    testTimeout: 30000, // 30s for API calls
    hookTimeout: 30000,
    
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      exclude: [
        'node_modules',
        'dist',
        '**/*.test.ts',
        'tests',
        'cli',
        'scripts',
        'tools',
      ],
    },
    
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
  },
  
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@config': path.resolve(__dirname, './config'),
    },
  },
});