import test from "node:test";
import assert from "node:assert/strict";
import { AUDIO_ASSETS, bgmLayersFor, clampVolume } from "../../src/browser/audio.mjs";

test("audio volumes clamp to the settings range", () => {
  assert.equal(clampVolume(-1), 0);
  assert.equal(clampVolume(0.65), 0.65);
  assert.equal(clampVolume(4), 1);
  assert.equal(clampVolume("invalid"), 0);
});

test("Stage 1 adds the danger layer at the climax and boss", () => {
  assert.deepEqual(bgmLayersFor({ screen: "title", tick: 0, boss: null }), []);
  assert.deepEqual(bgmLayersFor({ screen: "playing", tick: 60, boss: null }), ["stage-rhythm", "stage-melody"]);
  assert.deepEqual(bgmLayersFor({ screen: "playing", tick: 150 * 60, boss: null }), ["stage-rhythm", "stage-melody", "stage-danger"]);
  assert.deepEqual(bgmLayersFor({ screen: "playing", tick: 10, boss: {} }), ["stage-rhythm", "stage-melody", "stage-danger"]);
});

test("audio inventory covers layered BGM and gameplay feedback", () => {
  const ids = new Set(AUDIO_ASSETS.map(({ id }) => id));
  for (const id of ["stage-rhythm", "stage-melody", "stage-danger", "pulse", "lance", "spread", "seeker", "core", "enemy-shot", "impact", "explosion", "miss", "warning"]) {
    assert.ok(ids.has(id), `missing ${id}`);
  }
  assert.equal(ids.size, AUDIO_ASSETS.length);
});
