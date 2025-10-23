// widget/vite.config.ts

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig(({ command, mode }) => {
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

  const isLibMode = mode === 'lib';

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
      },
    },
    build: isLibMode ? {
      lib: {
        entry: {
          sdk: resolve(__dirname, 'src/sdk.ts'),
          widget: resolve(__dirname, 'src/main.tsx'),
        },
        formats: ['es'],
        fileName: (_, entryName) => `${entryName}.js`,
      },
      rollupOptions: {
        external: ['react', 'react-dom'],
        output: {
          globals: {
            react: 'React',
            'react-dom': 'ReactDOM',
          },
          assetFileNames: (assetInfo) => {
            if (assetInfo.names?.[0] === 'style.css') return 'widget.css';
            return assetInfo.names?.[0] || 'asset';
          },
        },
      },
      outDir: 'dist',
      emptyOutDir: true,
      minify: true,
    } : {
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