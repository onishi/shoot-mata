import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './release-e2e',
  outputDir: './test-results/release',
  timeout: 30_000,
  use: {
    baseURL: 'http://127.0.0.1:4192',
    viewport: { width: 1280, height: 720 },
  },
  projects: [{ name: 'Google Chrome', use: { channel: 'chrome' } }],
  webServer: {
    command: 'npx vite preview --host 127.0.0.1 --port 4192',
    port: 4192,
    reuseExistingServer: false,
  },
});
