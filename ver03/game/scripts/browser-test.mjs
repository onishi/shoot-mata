import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = 4174;
const server = spawn(process.execPath, ["scripts/serve.mjs", "--dist"], {
  cwd: root,
  env: { ...process.env, PORT: String(port) },
  stdio: ["ignore", "pipe", "inherit"]
});
await new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error("server start timeout")), 5000);
  server.stdout.on("data", (chunk) => {
    if (chunk.toString().includes("Serving")) { clearTimeout(timer); resolve(); }
  });
  server.once("exit", (code) => reject(new Error(`server exited early: ${code}`)));
});

let browser;
try {
  browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "networkidle" });
  assert.equal(await page.evaluate(() => window.__shootMata.state().screen), "title");
  await page.keyboard.press("Enter");
  await page.waitForFunction(() => window.__shootMata.state().screen === "playing");
  const initial = await page.evaluate(() => window.__shootMata.advance(60));
  assert.ok(initial.pulseShots > 0, "PULSE must fire with zero cores");
  assert.equal(initial.cores, 0);
  const final = await page.evaluate(() => window.__shootMata.advance(15_000));
  assert.equal(final.screen, "stage-result");
  assert.equal(final.defeatedBoss, true);
  assert.ok(final.pulseShots > 100);
  assert.equal(final.hudTop, 720);
  assert.deepEqual(errors, []);
  await mkdir(path.join(root, "artifacts"), { recursive: true });
  await page.screenshot({ path: path.join(root, "artifacts", "stage-result.png"), fullPage: true });
  console.log(`Chrome playthrough passed: ${final.tick} ticks, ${final.pulseShots} PULSE shots, ${final.terrainHits} terrain hits`);
} finally {
  await browser?.close();
  server.kill("SIGTERM");
}
