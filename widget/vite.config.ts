import { fileURLToPath, URL } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '~': fileURLToPath(new URL('./node_modules/', import.meta.url)),
    },
  },
  server: {
    host: true,
  },
  build: {
    outDir: 'build',
    assetsDir: 'static',
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      input: fileURLToPath(new URL('./index.html', import.meta.url)),
      output: {
        entryFileNames: 'static/js/artifacthub-widget.js',
        chunkFileNames: 'static/js/[name].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.css')) {
            return 'static/css/artifacthub-widget.css';
          }
          return 'static/media/[name][extname]';
        },
        inlineDynamicImports: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
    globals: true,
    css: {
      modules: {
        generateScopedName: '[local]',
      },
    },
    coverage: {
      provider: 'v8',
    },
  },
});
