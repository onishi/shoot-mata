import test from "node:test";
import assert from "node:assert/strict";
import { STAGE_02, activeCurrent, visibleTerrain } from "../../src/content/stage-02.mjs";
import { STAGE_02_BACKGROUND_LAYERS } from "../../src/content/assets.mjs";

test("Stage 2 defines a denser 260-second route with new enemy variants", () => {
  assert.equal(STAGE_02.durationTicks, 260 * 60);
  assert.equal(STAGE_02.bossStartTick, 205 * 60);
  assert.deepEqual(STAGE_02.checkpoints, [0, 60 * 60, 130 * 60, 200 * 60]);
  assert.ok(new Set(STAGE_02.waves.map(({ type }) => type)).size >= 5);
  assert.ok(STAGE_02.enemyTypes.length >= 6);
  assert.ok(STAGE_02.leeches.length > 0);
});

test("Stage 2 shutters telegraph for 90 ticks before narrowing the shared collision shape", () => {
  const shutter = STAGE_02.shutters[0];
  const scrollX = shutter.x - 600;
  const warning = visibleTerrain(scrollX, [], shutter.startTick + 45).filter(({ id }) => id.startsWith(shutter.id));
  const closed = visibleTerrain(scrollX, [], shutter.startTick + 190).filter(({ id }) => id.startsWith(shutter.id));
  assert.equal(warning.length, 2);
  assert.ok(warning.every(({ warning: active }) => active));
  assert.ok(closed.reduce((sum, item) => sum + item.height, 0) > warning.reduce((sum, item) => sum + item.height, 0));
});

test("Stage 2 exposes alternating vertical currents and three parallax layers", () => {
  assert.equal(activeCurrent(10 * 60).direction, -1);
  assert.equal(activeCurrent(140 * 60).direction, 1);
  assert.equal(activeCurrent(100 * 60), null);
  assert.equal(STAGE_02_BACKGROUND_LAYERS.length, 3);
  assert.ok(STAGE_02_BACKGROUND_LAYERS.every(({ overlap }) => overlap >= 200));
});
