import assert from "node:assert/strict";
import { readFile, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { buildStatic, BUILD_ID } from "../../scripts/build-static.mjs";
import { ASSET_BUDGETS, DELIVERY_ASSETS } from "../../scripts/delivery-asset-config.mjs";

const GAME_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const OUTPUT = resolve(GAME_DIR, ".test-dist");

test("static build is complete, bounded, and reproducible", async (context) => {
  context.after(() => rm(OUTPUT, { recursive: true, force: true }));
  const first = await buildStatic(OUTPUT);
  const firstManifest = await readFile(resolve(OUTPUT, "build-manifest.json"), "utf8");
  const entrypoint = await readFile(resolve(OUTPUT, "game/public/index.html"), "utf8");
  const second = await buildStatic(OUTPUT);
  const secondManifest = await readFile(resolve(OUTPUT, "build-manifest.json"), "utf8");

  assert.equal(first.buildId, BUILD_ID);
  assert.equal(first.entrypoint, "game/public/index.html");
  assert.equal(first.totalBytes, second.totalBytes);
  assert.equal(firstManifest, secondManifest);
  assert.ok(first.files.some(({ path }) => path === "game/public/index.html"));
  assert.match(entrypoint, /<link rel="icon"[^>]+reactor-core-red-v1\.webp/);
  assert.ok(first.files.some(({ path }) => path === "assets/delivery/game/cores/reactor-core-red-v1.webp"));
  for (const file of [
    "weapon-lance-shot-v1.wav",
    "weapon-spread-shot-v1.wav",
    "weapon-seeker-launch-v1.wav",
    "core-collect-v1.wav",
    "core-load-v1.wav",
  ]) {
    assert.ok(first.files.some(({ path }) => path === `assets/audio/reference/${file}`));
  }
  assert.ok(first.files.some(({ path }) => path.endsWith("salvage-weaver-v1.webp")));
  assert.ok(first.files.some(({ path }) => path.endsWith("wreck-bulwark-v1.webp")));
  assert.ok(first.files.some(({ path }) => path.endsWith("wreck-warden-v1.webp")));
  assert.ok(first.files.some(({ path }) => path.endsWith("stage-01-rhythm-loop-v1.wav")));
  for (const file of [
    "stage-02-cloud-refinery-rhythm-v1.wav",
    "stage-02-cloud-refinery-melody-v1.wav",
    "stage-02-cloud-refinery-danger-v1.wav",
    "stage-02-cloud-refinery-intro-v1.wav",
    "stage-02-cloud-refinery-clear-v1.wav",
  ]) {
    assert.ok(first.files.some(({ path }) => path === `assets/audio/stage-02/${file}`));
  }
  assert.ok(first.files.every(({ path }) => !path.endsWith(".prompt.md")));
  assert.ok(first.files.every(({ path }) => !path.endsWith(".png")));
  assert.ok(first.totalBytes <= ASSET_BUDGETS.build);

  const groupBytes = Object.fromEntries(Object.keys(ASSET_BUDGETS)
    .filter((group) => group !== "build")
    .map((group) => [group, DELIVERY_ASSETS.filter((asset) => asset.group === group)
      .reduce((sum, asset) => {
        const prefix = asset.kind === "webp" ? "assets/delivery" : "assets";
        return sum + first.files.find(({ path }) => path === `${prefix}/${asset.deliveryPath}`).bytes;
      }, 0)]));
  assert.ok(groupBytes["stage-01"] <= ASSET_BUDGETS["stage-01"]);
  assert.ok(groupBytes["stage-02"] <= ASSET_BUDGETS["stage-02"]);
  assert.ok(groupBytes.shared <= ASSET_BUDGETS.shared);
});
