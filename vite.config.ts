/// <reference types="vitest/config" />
import { resolve } from 'node:path';
import { defineConfig, type Connect, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Redirects /gallery to /gallery/ in the dev and preview servers, so the gallery
 * page loads instead of the game. Static hosts do this for folders themselves.
 */
function galleryRedirect(): Plugin {
  const redirect: Connect.NextHandleFunction = (req, res, next) => {
    const [path, query] = (req.url ?? '').split('?');
    if (path === '/gallery') {
      res.statusCode = 301;
      res.setHeader('Location', `/gallery/${query ? `?${query}` : ''}`);
      res.end();
      return;
    }
    next();
  };
  return {
    name: 'gallery-redirect',
    configureServer: (server) => void server.middlewares.use(redirect),
    configurePreviewServer: (server) => void server.middlewares.use(redirect),
  };
}

export default defineConfig({
  plugins: [react(), galleryRedirect()],
  base: './',
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        gallery: resolve(import.meta.dirname, 'gallery/index.html'),
      },
    },
  },
  test: {
    globals: true,
    include: ['src/**/*.test.{ts,tsx}'],
    environment: 'node',
  },
});
