import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  outputDir: './test-results',
  use: { baseURL: 'http://127.0.0.1:4174', viewport: { width: 1280, height: 720 } },
  webServer: {
    command: 'npx vite preview --host 127.0.0.1 --port 4174',
    port: 4174,
    reuseExistingServer: true
  }
});
