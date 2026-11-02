import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  outputDir: './test-results',
  timeout: 30_000,
  use: {
    baseURL: 'http://127.0.0.1:4191',
    viewport: { width: 1280, height: 720 },
  },
  projects: [{ name: 'Google Chrome', use: { channel: 'chrome' } }],
  webServer: {
    command: 'npx vite preview --host 127.0.0.1 --port 4191',
    port: 4191,
    reuseExistingServer: true,
  },
});
