import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./audit",
  testMatch: "release.spec.js",
  timeout: 30_000,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:4175",
    browserName: "chromium",
    channel: "chrome",
    viewport: { width: 1280, height: 720 }
  },
  webServer: {
    command: "node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 4175",
    url: "http://127.0.0.1:4175",
    reuseExistingServer: false
  }
});
