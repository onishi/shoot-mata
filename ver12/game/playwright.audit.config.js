import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./audit",
  timeout: 180_000,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:4174",
    browserName: "chromium",
    channel: "chrome",
    viewport: { width: 1280, height: 720 }
  },
  webServer: {
    command: "npm run dev -- --port 4174",
    url: "http://127.0.0.1:4174",
    reuseExistingServer: true
  }
});
