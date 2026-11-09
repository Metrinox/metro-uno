import { defineConfig, devices } from '@playwright/test';

/** The online game server used by the e2e tests (a local Cloudflare Worker). */
export const E2E_SERVER_PORT = 8788;

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  fullyParallel: true,
  reporter: 'list',
  use: { baseURL: 'http://localhost:5174', trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: `npx vite --port 5174 --strictPort`,
      url: 'http://localhost:5174',
      reuseExistingServer: !process.env.CI,
      env: { VITE_SERVER_URL: `ws://localhost:${E2E_SERVER_PORT}` },
    },
    {
      command: [
        `npx wrangler dev --port ${E2E_SERVER_PORT} --show-interactive-dev-session=false --log-level warn`,
        '--persist-to .wrangler/e2e',
        '--var ALLOWED_ORIGINS:http://localhost:5174',
        '--var AI_DELAY_MS:0',
        '--var ENVIRONMENT:test',
        '--var SEED_PREFIX:e2e',
      ].join(' '),
      url: `http://localhost:${E2E_SERVER_PORT}/healthz`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
