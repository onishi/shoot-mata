import test from "node:test";
import assert from "node:assert/strict";
import { STAGE_04, visibleTerrain } from "../../src/content/stage-04.mjs";
import { STAGE_04_BACKGROUND_LAYERS } from "../../src/content/assets.mjs";

test("Stage 4 defines a 270-second furnace route with four enemy types", () => {
  assert.equal(STAGE_04.durationTicks, 270 * 60);
  assert.equal(STAGE_04.bossStartTick, 215 * 60);
  assert.deepEqual(STAGE_04.checkpoints, [0, 60 * 60, 135 * 60, 210 * 60]);
  assert.equal(new Set(STAGE_04.waves.map(({ type }) => type)).size, 3);
  assert.ok(STAGE_04.moles.length > 0);
  assert.equal(STAGE_04.heatWaves.length, 3);
});

test("Stage 4 heat waves telegraph before their collision volume becomes hot", () => {
  const wave = STAGE_04.heatWaves[0];
  const scrollX = wave.x - 600;
  const warning = visibleTerrain(scrollX, [], wave.startTick + 45).filter(({ id }) => id.startsWith(wave.id));
  const active = visibleTerrain(scrollX, [], wave.startTick + 120).filter(({ id }) => id.startsWith(wave.id));
  assert.equal(warning.length, 2);
  assert.ok(warning.every(({ warning: value }) => value));
  assert.ok(active.every(({ warning: value }) => !value));
  assert.ok(active.every(({ width }) => width > warning[0].width));
});

test("Stage 4 rotating walls and art use shared collision data and crossfaded layers", () => {
  const wall = STAGE_04.rotatingWalls[0];
  const scrollX = wall.x - 600;
  const open = visibleTerrain(scrollX, [], wall.startTick + 30).filter(({ id }) => id.startsWith(wall.id));
  const closed = visibleTerrain(scrollX, [], wall.startTick + 200).filter(({ id }) => id.startsWith(wall.id));
  assert.ok(closed.reduce((sum, item) => sum + item.height, 0) > open.reduce((sum, item) => sum + item.height, 0));
  assert.equal(STAGE_04_BACKGROUND_LAYERS.length, 3);
  assert.ok(STAGE_04_BACKGROUND_LAYERS.every(({ overlap }) => overlap >= 200));
});
