import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  // Keep browser tests out of Bun's *.test.ts / *.spec.ts discovery.
  testMatch: '**/*.pw.ts',
  fullyParallel: true,
  workers: 2,
  timeout: 30_000,
  use: { baseURL: 'http://localhost:3101', trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } } },
    { name: 'mobile', use: { ...devices['Pixel 7'], defaultBrowserType: 'chromium', viewport: { width: 390, height: 844 } } },
  ],
  webServer: {
    command: 'bun run build && PORT=3101 node .output/server/index.mjs',
    url: 'http://localhost:3101',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
