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

test("Stage 2 selects its own synchronized music layers", () => {
  assert.deepEqual(bgmLayersFor({ screen: "playing", stageId: "stage-02", tick: 60, boss: null }), ["stage-02-rhythm", "stage-02-melody"]);
  assert.deepEqual(bgmLayersFor({ screen: "playing", stageId: "stage-02", tick: 150 * 60, boss: null }), ["stage-02-rhythm", "stage-02-melody", "stage-02-danger"]);
});

test("Stage 3 selects its own synchronized music layers", () => {
  assert.deepEqual(bgmLayersFor({ screen: "playing", stageId: "stage-03", tick: 60, boss: null }), ["stage-03-rhythm", "stage-03-melody"]);
  assert.deepEqual(bgmLayersFor({ screen: "playing", stageId: "stage-03", tick: 150 * 60, boss: null }), ["stage-03-rhythm", "stage-03-melody", "stage-03-danger"]);
});

test("Stage 4 selects its own synchronized music layers", () => {
  assert.deepEqual(bgmLayersFor({ screen: "playing", stageId: "stage-04", tick: 60, boss: null }), ["stage-04-rhythm", "stage-04-melody"]);
  assert.deepEqual(bgmLayersFor({ screen: "playing", stageId: "stage-04", tick: 150 * 60, boss: null }), ["stage-04-rhythm", "stage-04-melody", "stage-04-danger"]);
});

test("Stage 5 selects its own synchronized music layers", () => {
  assert.deepEqual(bgmLayersFor({ screen: "playing", stageId: "stage-05", tick: 60, boss: null }), ["stage-05-rhythm", "stage-05-melody"]);
  assert.deepEqual(bgmLayersFor({ screen: "playing", stageId: "stage-05", tick: 150 * 60, boss: null }), ["stage-05-rhythm", "stage-05-melody", "stage-05-danger"]);
});

test("Stage 6 selects its own synchronized music layers", () => {
  assert.deepEqual(bgmLayersFor({ screen: "playing", stageId: "stage-06", tick: 60, boss: null }), ["stage-06-rhythm", "stage-06-melody"]);
  assert.deepEqual(bgmLayersFor({ screen: "playing", stageId: "stage-06", tick: 150 * 60, boss: null }), ["stage-06-rhythm", "stage-06-melody", "stage-06-danger"]);
});

test("audio inventory covers layered BGM and gameplay feedback", () => {
  const ids = new Set(AUDIO_ASSETS.map(({ id }) => id));
  for (const id of ["stage-rhythm", "stage-melody", "stage-danger", "pulse", "lance", "spread", "seeker", "core", "enemy-shot", "impact", "explosion", "miss", "warning"]) {
    assert.ok(ids.has(id), `missing ${id}`);
  }
  for (const id of ["stage-02-rhythm", "stage-02-melody", "stage-02-danger", "stage-02-intro", "stage-02-clear"]) assert.ok(ids.has(id), `missing ${id}`);
  for (const id of ["stage-03-rhythm", "stage-03-melody", "stage-03-danger", "stage-03-intro", "stage-03-clear"]) assert.ok(ids.has(id), `missing ${id}`);
  for (const id of ["stage-04-rhythm", "stage-04-melody", "stage-04-danger", "stage-04-intro", "stage-04-clear"]) assert.ok(ids.has(id), `missing ${id}`);
  for (const id of ["stage-05-rhythm", "stage-05-melody", "stage-05-danger", "stage-05-intro", "stage-05-clear"]) assert.ok(ids.has(id), `missing ${id}`);
  for (const id of ["stage-06-rhythm", "stage-06-melody", "stage-06-danger", "stage-06-intro", "stage-06-clear"]) assert.ok(ids.has(id), `missing ${id}`);
  assert.equal(ids.size, AUDIO_ASSETS.length);
});
