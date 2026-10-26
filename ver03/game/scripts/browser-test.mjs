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
  const failedAssets = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  page.on("response", (response) => { if (response.url().includes("/assets/") && !response.ok()) failedAssets.push(`${response.status()} ${response.url()}`); });
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "networkidle" });
  assert.equal(await page.evaluate(() => window.__shootMata.state().screen), "title");
  await page.keyboard.press("KeyS");
  await page.waitForFunction(() => window.__shootMata.state().audio.mode === "active");
  const audioReady = await page.evaluate(() => window.__shootMata.state().audio);
  assert.equal(audioReady.loaded, audioReady.assetCount);
  assert.equal(audioReady.settings.bgmVolume, 0.65);
  assert.equal(audioReady.settings.sfxVolume, 0.45);
  await mkdir(path.join(root, "artifacts"), { recursive: true });
  await page.screenshot({ path: path.join(root, "artifacts", "audio-settings.png"), fullPage: true });
  await page.keyboard.press("ArrowRight");
  assert.equal((await page.evaluate(() => window.__shootMata.state().audio.settings.bgmVolume)).toFixed(2), "0.70");
  await page.keyboard.press("Escape");
  await page.keyboard.press("Enter");
  await page.waitForFunction(() => window.__shootMata.state().screen === "how-to-play");
  await page.screenshot({ path: path.join(root, "artifacts", "how-to-play.png"), fullPage: true });
  await page.keyboard.press("Enter");
  await page.waitForFunction(() => window.__shootMata.state().screen === "playing");
  const initial = await page.evaluate(() => window.__shootMata.advance(60));
  assert.ok(initial.pulseShots > 0, "PULSE must fire with zero cores");
  assert.deepEqual(initial.cores, []);
  assert.deepEqual(initial.audio.bgmLayers, ["stage-rhythm", "stage-melody"]);
  const combat = await page.evaluate(() => window.__shootMata.advance(1_800));
  assert.ok(combat.coresCollected > 0);
  assert.ok(combat.enemyShots > 0);
  await page.screenshot({ path: path.join(root, "artifacts", "stage-01-combat.png"), fullPage: true });
  const boss = await page.evaluate(() => window.__shootMata.advance(9_560));
  assert.ok(boss.bossHp > 0);
  assert.equal(boss.bossWarning, true);
  assert.deepEqual(boss.audio.bgmLayers, ["stage-rhythm", "stage-melody", "stage-danger"]);
  assert.ok(boss.audio.duckCount > 0);
  await page.screenshot({ path: path.join(root, "artifacts", "stage-01-boss.png"), fullPage: true });
  const final = await page.evaluate(() => window.__shootMata.advance(4_240));
  assert.equal(final.screen, "stage-result");
  assert.equal(final.defeatedBoss, true);
  assert.ok(final.pulseShots > 100);
  assert.ok(final.coresCollected >= 6);
  assert.ok(final.weaponShots.lance > 0);
  assert.ok(final.weaponShots.spread > 0);
  assert.ok(final.weaponShots.seeker > 0);
  assert.ok(final.enemyShots > 0);
  assert.ok(final.bossShots > 0);
  assert.ok(final.bossShieldBlocks > 0);
  assert.ok(final.bossWeakpointHits > 0);
  assert.ok(final.audio.playedSfx > 0);
  assert.equal(final.audio.perSoundLimit, 4);
  assert.equal(final.audio.explosionLimit, 6);
  assert.equal(final.audio.limiterDb, -1);
  assert.ok(final.destroyedTerrain.includes("breakable-wreck"));
  assert.equal(final.score, Object.values(final.scoreBreakdown).reduce((sum, value) => sum + value, 0));
  assert.equal(final.scoreBreakdown.clear, 2000);
  assert.equal(final.hudTop, 720);
  assert.equal(await page.evaluate(() => performance.getEntriesByType("resource").filter(({ name }) => name.includes("/assets/") && name.endsWith(".webp")).length), 12);
  assert.deepEqual(failedAssets, []);
  assert.deepEqual(errors, []);
  await page.screenshot({ path: path.join(root, "artifacts", "stage-result.png"), fullPage: true });
  console.log(`Chrome playthrough passed: ${final.tick} ticks, ${final.pulseShots} PULSE shots, ${final.terrainHits} terrain hits`);
} finally {
  await browser?.close();
  server.kill("SIGTERM");
}
