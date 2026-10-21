import test from "node:test";
import assert from "node:assert/strict";
import {
  ACTORS,
  HUD_MAX_OCCLUSION,
  HUD_REGIONS,
  MIN_TEXT_SIZE_PX,
  MIN_TOUCH_TARGET_PX,
  MOTION_LIMITS,
  PARALLAX_LAYERS,
  REACTOR_QUEUE,
  STAGE_ASPECT_RATIO,
  VFX_EVENTS,
  VISUAL_CUES,
  actorBounds,
  isInsideFlightCorridor,
  isInsideStage,
  queueAfterPickup,
  totalArea,
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

test("reactor HUD preserves FIFO order and identifies the next ejection", () => {
  assert.deepEqual(REACTOR_QUEUE.map(({ id }) => id), ["red", "blue", "yellow"]);
  assert.equal(REACTOR_QUEUE.filter(({ ejectedNext }) => ejectedNext).length, 1);
  assert.deepEqual(queueAfterPickup(REACTOR_QUEUE.map(({ id }) => id), "red"), ["blue", "yellow", "red"]);
  assert.throws(() => queueAfterPickup(["red"], "blue"), /exactly three/);
});

test("persistent HUD stays under the twelve percent occlusion budget", () => {
  assert.ok(totalArea(HUD_REGIONS) <= HUD_MAX_OCCLUSION);
  for (const region of HUD_REGIONS) {
    assert.ok(region.left >= 0 && region.top >= 0);
    assert.ok(region.left + region.width <= 1);
    assert.ok(region.top + region.height <= 1);
  }
});

test("phase 04 accessibility constants preserve readable text and touch targets", () => {
  assert.equal(MIN_TEXT_SIZE_PX, 12);
  assert.equal(MIN_TOUCH_TARGET_PX, 44);
});

test("hit, damage, and collect use unique non-color cues inside the stage", () => {
  assert.deepEqual(VFX_EVENTS.map(({ id }) => id), ["hit", "damage", "collect"]);
  assert.equal(new Set(VFX_EVENTS.map(({ cue }) => cue)).size, VFX_EVENTS.length);
  for (const event of VFX_EVENTS) {
    assert.ok(event.x >= 0 && event.x <= 1);
    assert.ok(event.y >= 0 && event.y <= 1);
  }
});

test("combat categories have unique non-color visual signatures", () => {
  assert.equal(VISUAL_CUES.length, 7);
  const signatures = VISUAL_CUES.map(({ silhouette, interior, motion }) => `${silhouette}/${interior}/${motion}`);
  assert.equal(new Set(signatures).size, VISUAL_CUES.length);
  assert.deepEqual(VISUAL_CUES.filter(({ id }) => id.startsWith("core-")).map(({ silhouette }) => silhouette), [
    "diamond", "circle", "triangle",
  ]);
  assert.notEqual(
    VISUAL_CUES.find(({ id }) => id === "friendly-projectile").silhouette,
    VISUAL_CUES.find(({ id }) => id === "enemy-projectile").silhouette,
  );
});

test("VFX and camera motion remain inside accessibility limits", () => {
  for (const event of VFX_EVENTS) {
    const flashesPerSecond = event.luminancePulses / (event.durationMs / 1000);
    assert.ok(flashesPerSecond <= MOTION_LIMITS.maxFlashesPerSecond, `${event.id}: ${flashesPerSecond} flashes/s`);
  }
  assert.ok(MOTION_LIMITS.maxCameraShakeX <= 0.015);
  assert.ok(MOTION_LIMITS.maxCameraShakeY <= 0.01);
  assert.ok(MOTION_LIMITS.maxCameraShakeDurationMs <= 350);
  assert.equal(MOTION_LIMITS.reducedMotionCameraShakeX, 0);
  assert.equal(MOTION_LIMITS.reducedMotionCameraShakeY, 0);
});
