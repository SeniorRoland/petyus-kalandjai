import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'));

export default defineConfig({
  base: './',
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },   // the version shown on the start screen (menu.js)                       // relatív útvonalak → a dist/ bármilyen almappából kiszolgálható
  server: { port: 5173, open: '/index.html' },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1500,    // a three.js önmagában ~700 kB
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        designterv: resolve(import.meta.dirname, 'designterv.html'),
      },
      // three.js in a file of its own: it does not change between our releases, so the browser keeps it cached
      output: { manualChunks: (id) => (id.includes('node_modules/three') ? 'three' : undefined) },
    },
  },
});
