import assert from "node:assert/strict";
import { readFile, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { buildStatic, BUILD_ID } from "../../scripts/build-static.mjs";

const GAME_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const OUTPUT = resolve(GAME_DIR, ".test-dist");

test("static build is complete, bounded, and reproducible", async (context) => {
  context.after(() => rm(OUTPUT, { recursive: true, force: true }));
  const first = await buildStatic(OUTPUT);
  const firstManifest = await readFile(resolve(OUTPUT, "build-manifest.json"), "utf8");
  const second = await buildStatic(OUTPUT);
  const secondManifest = await readFile(resolve(OUTPUT, "build-manifest.json"), "utf8");

  assert.equal(first.buildId, BUILD_ID);
  assert.equal(first.entrypoint, "game/public/index.html");
  assert.equal(first.totalBytes, second.totalBytes);
  assert.equal(firstManifest, secondManifest);
  assert.ok(first.files.some(({ path }) => path === "game/public/index.html"));
  assert.ok(first.files.some(({ path }) => path.endsWith("stage-01-rhythm-loop-v1.wav")));
  assert.ok(first.files.every(({ path }) => !path.endsWith(".prompt.md")));
  assert.ok(first.totalBytes <= 16 * 1024 * 1024);
});
