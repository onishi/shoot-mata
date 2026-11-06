import test from "node:test";
import assert from "node:assert/strict";
import { FINALE_GARDENS, FINALE_STEP_MS, finaleTimeline } from "../src/finale.js";

test("finale reveals all six garden lessons in order", () => {
  assert.equal(FINALE_GARDENS.length, 6);
  assert.deepEqual(finaleTimeline(0), { stage: 1, progress: 0, complete: false });
  assert.equal(finaleTimeline(FINALE_STEP_MS * 2).stage, 3);
  assert.deepEqual(finaleTimeline(FINALE_STEP_MS * 6), { stage: 6, progress: 0, complete: true });
});

test("reduced motion shows the complete reprise without timed reveals", () => {
  assert.deepEqual(finaleTimeline(0, true), { stage: 6, progress: 1, complete: true });
  assert.deepEqual(finaleTimeline(Number.NaN), { stage: 1, progress: 0, complete: false });
});
