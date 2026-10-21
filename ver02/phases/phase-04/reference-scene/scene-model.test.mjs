import test from "node:test";
import assert from "node:assert/strict";
import {
  ACTORS,
  PARALLAX_LAYERS,
  STAGE_ASPECT_RATIO,
  actorBounds,
  isInsideFlightCorridor,
  isInsideStage,
} from "./scene-model.mjs";

test("reference scene uses a 16:9 game coordinate system", () => {
  assert.equal(STAGE_ASPECT_RATIO, 16 / 9);
});

test("three parallax layers have unique increasing speeds", () => {
  assert.deepEqual(PARALLAX_LAYERS.map(({ id }) => id), ["far", "mid", "fore"]);
  const speeds = PARALLAX_LAYERS.map(({ speed }) => speed);
  assert.deepEqual([...speeds].sort((a, b) => a - b), speeds);
  assert.equal(new Set(speeds).size, 3);
});

test("all actors remain inside the stage and central flight corridor", () => {
  for (const actor of ACTORS) {
    assert.equal(isInsideStage(actor), true, `${actor.id} left the stage`);
    assert.equal(isInsideFlightCorridor(actor), true, `${actor.id} left the corridor`);
  }
});

test("actors do not overlap in the reference layout", () => {
  for (let leftIndex = 0; leftIndex < ACTORS.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < ACTORS.length; rightIndex += 1) {
      const left = actorBounds(ACTORS[leftIndex]);
      const right = actorBounds(ACTORS[rightIndex]);
      const overlaps = left.left < right.right && left.right > right.left && left.top < right.bottom && left.bottom > right.top;
      assert.equal(overlaps, false, `${ACTORS[leftIndex].id} overlaps ${ACTORS[rightIndex].id}`);
    }
  }
});
