import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  use: {
    baseURL: 'http://127.0.0.1:4179',
    browserName: 'chromium',
    channel: 'chrome',
    viewport: { width: 1280, height: 720 },
    screenshot: 'only-on-failure'
  },
  webServer: {
    command: 'npm run dev -- --port 4179',
    url: 'http://127.0.0.1:4179',
    reuseExistingServer: true
  }
});
