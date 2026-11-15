import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  base: './',                       // relatív útvonalak → a dist/ bármilyen almappából kiszolgálható
  server: { port: 5173, open: '/index.html' },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1500,    // a three.js önmagában ~700 kB
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        designterv: resolve(import.meta.dirname, 'designterv.html'),
      },
    },
  },
});
