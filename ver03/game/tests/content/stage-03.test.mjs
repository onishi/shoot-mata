import test from "node:test";
import assert from "node:assert/strict";
import { STAGE_03, visibleTerrain } from "../../src/content/stage-03.mjs";
import { STAGE_03_BACKGROUND_LAYERS } from "../../src/content/assets.mjs";

test("Stage 3 defines a 270-second route with biological terrain and four enemy types", () => {
  assert.equal(STAGE_03.durationTicks, 270 * 60);
  assert.equal(STAGE_03.bossStartTick, 215 * 60);
  assert.deepEqual(STAGE_03.checkpoints, [0, 60 * 60, 135 * 60, 210 * 60]);
  assert.equal(new Set(STAGE_03.waves.map(({ type }) => type)).size, 3);
  assert.ok(STAGE_03.walkers.length > 0);
  assert.ok(STAGE_03.terrain.filter(({ kind }) => kind === "destructible-cyst").length >= 3);
});

test("Stage 3 membranes telegraph before contracting their shared collision shape", () => {
  const membrane = STAGE_03.membranes[0];
  const scrollX = membrane.x - 600;
  const warning = visibleTerrain(scrollX, [], membrane.startTick + 45).filter(({ id }) => id.startsWith(membrane.id));
  const closed = visibleTerrain(scrollX, [], membrane.startTick + 195).filter(({ id }) => id.startsWith(membrane.id));
  assert.equal(warning.length, 2);
  assert.ok(warning.every(({ warning: active }) => active));
  assert.ok(closed.reduce((sum, item) => sum + item.height, 0) > warning.reduce((sum, item) => sum + item.height, 0));
});

test("Stage 3 has three crossfaded parallax layers", () => {
  assert.equal(STAGE_03_BACKGROUND_LAYERS.length, 3);
  assert.ok(STAGE_03_BACKGROUND_LAYERS.every(({ overlap }) => overlap >= 200));
});
