import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  outputDir: './test-results',
  use: { baseURL: 'http://127.0.0.1:4185', viewport: { width: 1280, height: 720 } },
  webServer: {
    command: 'npx vite preview --host 127.0.0.1 --port 4185',
    port: 4185,
    reuseExistingServer: true
  }
});
