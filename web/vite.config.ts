import { fileURLToPath, URL } from 'url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '~': fileURLToPath(new URL('./node_modules/', import.meta.url)),
      'unist-util-visit-parents/do-not-use-color': fileURLToPath(
        new URL('./node_modules/unist-util-visit-parents/lib/color.js', import.meta.url)
      ),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        quietDeps: true,
        silenceDeprecations: ['import'],
        importers: [
          {
            findFileUrl(url: string) {
              if (!url.startsWith('~')) {
                return null;
              }
              return new URL(`./node_modules/${url.slice(1)}`, import.meta.url);
            },
          },
        ],
      },
    },
  },
  server: {
    host: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
  preview: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'build',
    assetsDir: 'static',
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      output: {
        entryFileNames: (chunkInfo) =>
          chunkInfo.name === 'index'
            ? 'static/js/main.[hash].js'
            : 'static/js/[name].[hash].js',
        chunkFileNames: 'static/js/[name].[hash].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.css')) {
            return 'static/css/main.[hash][extname]';
          }
          return 'static/media/[name].[hash][extname]';
        },
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
    alias: {
      '#minpath': fileURLToPath(new URL('./node_modules/vfile/lib/minpath.js', import.meta.url)),
      '#minproc': fileURLToPath(new URL('./node_modules/vfile/lib/minproc.js', import.meta.url)),
      '#minurl': fileURLToPath(new URL('./node_modules/vfile/lib/minurl.js', import.meta.url)),
    },
    coverage: {
      provider: 'v8',
    },
  },
});
