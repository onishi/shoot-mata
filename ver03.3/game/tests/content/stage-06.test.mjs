import test from "node:test";
import assert from "node:assert/strict";
import { STAGE_06, visibleTerrain } from "../../src/content/stage-06.mjs";
import { STAGE_06_BACKGROUND_LAYERS } from "../../src/content/assets.mjs";

test("Stage 6 defines the five-minute final route and six enemy types", () => {
  assert.equal(STAGE_06.durationTicks, 300 * 60);
  assert.equal(STAGE_06.bossStartTick, 230 * 60);
  assert.deepEqual(STAGE_06.checkpoints, [0, 60 * 60, 145 * 60, 225 * 60]);
  assert.deepEqual(new Set(STAGE_06.waves.map(({ type }) => type)), new Set(["gate-mite", "vector-inverter", "relay-sniper", "null-carrier", "phase-echo", "relay-sapper"]));
  assert.equal(STAGE_06_BACKGROUND_LAYERS.length, 3);
  assert.ok(STAGE_06_BACKGROUND_LAYERS.every(({ overlap }) => overlap >= 200));
});

test("Stage 6 phase walls telegraph solidity and gravity debris changes side", () => {
  const wall = STAGE_06.phaseWalls[0];
  const scrollX = wall.x - 600;
  const warning = visibleTerrain(scrollX, [], wall.startTick + 30).filter(({ id }) => id.startsWith(wall.id));
  const solid = visibleTerrain(scrollX, [], wall.startTick + 150).filter(({ id }) => id.startsWith(wall.id));
  assert.ok(warning.every((item) => item.warning));
  assert.ok(solid.every((item) => !item.warning));
  assert.ok(solid.every(({ width }) => width > warning[0].width));

  const debris = STAGE_06.gravityDebris[0];
  const first = visibleTerrain(debris.x - 600, [], debris.startTick).find(({ id }) => id === debris.id);
  const flipped = visibleTerrain(debris.x - 600, [], debris.startTick + debris.period / 2).find(({ id }) => id === debris.id);
  assert.notEqual(first.y, flipped.y);
  assert.equal(first.gravityDirection, -flipped.gravityDirection);
});
