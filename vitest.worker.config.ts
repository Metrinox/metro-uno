import { cloudflareTest } from '@cloudflare/vitest-plugin';
import { defineConfig } from 'vitest/config';

/**
 * Tests that run inside the Cloudflare Workers runtime (the Worker and the room
 * Durable Object). Pure logic is tested by the main config in plain Node.
 */
export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: './wrangler.jsonc' },
      miniflare: {
        bindings: {
          ALLOWED_ORIGINS: 'https://metro-uno.duckdns.org,http://localhost:5173',
          AI_DELAY_MS: '0',
          ENVIRONMENT: 'test',
          SEED_PREFIX: 'worker-test',
        },
      },
    }),
  ],
  test: {
    globals: true,
    include: ['server/**/*.worker.test.ts'],
  },
});
