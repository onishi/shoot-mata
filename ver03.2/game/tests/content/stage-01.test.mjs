import test from "node:test";
import assert from "node:assert/strict";
import { STAGE_01, STAGE_DURATION_TICKS, visibleTerrain } from "../../src/content/stage-01.mjs";
import { BACKGROUND_LAYERS, IMAGE_ASSETS } from "../../src/content/assets.mjs";

test("Stage 1 is a four-minute data-driven route with three safe checkpoints", () => {
  assert.equal(STAGE_DURATION_TICKS, 240 * 60);
  assert.ok(STAGE_01.terrain.length >= 12);
  assert.ok(STAGE_01.waves.length >= 6);
  assert.ok(STAGE_01.crawlers.length >= 5);
  assert.ok(STAGE_01.terrain.some(({ kind, hp }) => kind === "destructible-wreck" && hp > 0));
  assert.ok(STAGE_01.coreDrops.length >= 9);
  assert.deepEqual(new Set(STAGE_01.coreDrops.map(({ color }) => color)), new Set(["red", "blue", "yellow"]));
  assert.ok(STAGE_01.checkpoints.length >= 4);
  assert.ok(visibleTerrain(0).every((item) => Number.isFinite(item.screenX)));
});

test("Stage 1 has three independently scrolling background layers with crossfade overlap", () => {
  assert.equal(BACKGROUND_LAYERS.length, 3);
  assert.equal(new Set(BACKGROUND_LAYERS.map(({ speed }) => speed)).size, 3);
  assert.ok(BACKGROUND_LAYERS.every(({ asset, overlap }) => IMAGE_ASSETS[asset] && overlap >= 160));
});
