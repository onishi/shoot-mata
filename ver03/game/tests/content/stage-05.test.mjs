import test from "node:test";
import assert from "node:assert/strict";
import { STAGE_05, visibleTerrain } from "../../src/content/stage-05.mjs";
import { STAGE_05_BACKGROUND_LAYERS } from "../../src/content/assets.mjs";

test("Stage 5 defines a 280-second crystal route with four original enemy types", () => {
  assert.equal(STAGE_05.durationTicks, 280 * 60);
  assert.equal(STAGE_05.bossStartTick, 220 * 60);
  assert.deepEqual(STAGE_05.checkpoints, [0, 65 * 60, 140 * 60, 215 * 60]);
  assert.deepEqual(new Set(STAGE_05.waves.map(({ type }) => type)), new Set(["shard-skater", "mirror-nest", "phase-ray", "lattice-keeper"]));
  assert.equal(STAGE_05_BACKGROUND_LAYERS.length, 3);
  assert.ok(STAGE_05_BACKGROUND_LAYERS.every(({ overlap }) => overlap >= 200));
});

test("Stage 5 moving walls and freeze gates telegraph their shared collision shapes", () => {
  const wall = STAGE_05.movingWalls[0];
  const scrollX = wall.x - 600;
  const warning = visibleTerrain(scrollX, [], wall.startTick + 30).filter(({ id }) => id.startsWith(wall.id));
  const closed = visibleTerrain(scrollX, [], wall.startTick + 220).filter(({ id }) => id.startsWith(wall.id));
  assert.ok(warning.every((item) => item.warning));
  assert.ok(closed.reduce((sum, item) => sum + item.height, 0) > warning.reduce((sum, item) => sum + item.height, 0));

  const gate = STAGE_05.freezeGates[0];
  const gateWarning = visibleTerrain(gate.x - 600, [], gate.startTick + gate.period - 30).filter(({ id }) => id.startsWith(gate.id));
  const gateActive = visibleTerrain(gate.x - 600, [], gate.startTick + 120).filter(({ id }) => id.startsWith(gate.id));
  assert.ok(gateWarning.every((item) => item.warning));
  assert.ok(gateActive.every((item) => !item.warning));
  assert.ok(gateActive.every(({ width }) => width > gateWarning[0].width));
});
