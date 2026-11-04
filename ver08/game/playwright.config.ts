import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  outputDir: "./test-results",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  use: {
    baseURL: "http://127.0.0.1:4400",
    viewport: { width: 1280, height: 720 },
    trace: "retain-on-failure",
  },
  projects: [{ name: "Google Chrome", use: { channel: "chrome" } }],
  webServer: {
    command: "npx vite --host 127.0.0.1 --port 4400",
    port: 4400,
    reuseExistingServer: true,
  },
});
