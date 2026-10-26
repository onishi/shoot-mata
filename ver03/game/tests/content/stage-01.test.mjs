import test from "node:test";
import assert from "node:assert/strict";
import { STAGE_01, STAGE_DURATION_TICKS, visibleTerrain } from "../../src/content/stage-01.mjs";

test("Stage 1 is a four-minute data-driven route with three safe checkpoints", () => {
  assert.equal(STAGE_DURATION_TICKS, 240 * 60);
  assert.ok(STAGE_01.terrain.length >= 12);
  assert.ok(STAGE_01.waves.length >= 6);
  assert.ok(STAGE_01.checkpoints.length >= 4);
  assert.ok(visibleTerrain(0).every((item) => Number.isFinite(item.screenX)));
});
