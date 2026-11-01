import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  outputDir: './test-results',
  use: { baseURL: 'http://127.0.0.1:4184', viewport: { width: 1280, height: 720 } },
  webServer: {
    command: 'npx vite preview --host 127.0.0.1 --port 4184',
    port: 4184,
    reuseExistingServer: true
  }
});
