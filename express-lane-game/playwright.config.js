import { defineConfig, devices } from 'playwright/test';

/**
 * UI test suite (audit Tranche 4 — critical-flow coverage).
 * `webServer` boots vite automatically, so `npx playwright test` works
 * standalone in CI and sandboxes without a separately managed dev server.
 */
export default defineConfig({
  testDir: './tests/ui',
  fullyParallel: false,
  retries: 0,
  reporter: [['list']],
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:5199',
    viewport: { width: 1280, height: 800 },
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npx vite --port 5199 --strictPort',
    url: 'http://localhost:5199',
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
