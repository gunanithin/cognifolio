/// <reference types="vitest" />
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          pdfjs: ['pdfjs-dist'],
        },
      },
    },
    chunkSizeWarningLimit: 1500,
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (err, req, res) => {
            console.warn(
              '[Vite Proxy] Backend connection failed (is uvicorn running on :8000?):',
              err.message,
            );
            if (res.writeHead && !res.headersSent) {
              res.writeHead(503, { 'Content-Type': 'application/json' });
              res.end(
                JSON.stringify({
                  detail:
                    'Backend API service is not reachable on port 8000. Please ensure uvicorn is running.',
                  code: 'BACKEND_UNAVAILABLE',
                }),
              );
            }
          });
        },
      },
    },
  },
  test: {
    environment: 'node',
    globals: true,
  },
});
