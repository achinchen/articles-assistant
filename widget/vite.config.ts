// widget/vite.config.ts

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig(({ command }) => {
  if (command === 'serve') {
    return {
      plugins: [react()],
      resolve: {
        alias: {
          '@': resolve(__dirname, 'src'),
        },
      },
      define: {
        'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
      },
      server: {
        port: 3000,
        open: "/index.html",
      },
    };
  }

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
      },
    },
    build: {
      rollupOptions: {
        input: {
          widget: resolve(__dirname, 'src/main.tsx'),
          sdk: resolve(__dirname, 'src/sdk.ts'),
        },
        output: {
          entryFileNames: '[name].js',
          assetFileNames: 'widget.css',
        },
      },
      outDir: 'dist',
      emptyOutDir: true,
      minify: true,
    },
    define: {
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
    },
  };
});