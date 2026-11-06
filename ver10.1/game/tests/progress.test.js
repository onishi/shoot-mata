import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_PROGRESS, PROGRESS_KEY, loadProgress, saveProgress, unlockGarden } from "../src/progress.js";

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, value),
  };
}

test("progress starts at the first garden when no save exists", () => {
  assert.deepEqual(loadProgress(memoryStorage()), DEFAULT_PROGRESS);
});

test("the furthest unlocked garden survives save and reload", () => {
  const storage = memoryStorage();
  const unlocked = unlockGarden(unlockGarden(unlockGarden(unlockGarden(unlockGarden(DEFAULT_PROGRESS, 1), 2), 3), 4), 5);
  saveProgress(storage, unlocked);
  assert.deepEqual(loadProgress(storage), { version: 1, latestGarden: 5 });
  assert.deepEqual(unlockGarden(unlocked, 1), unlocked);
});

test("malformed, future, and out-of-range progress recover to the first garden", () => {
  for (const value of ["broken", "null", '{"version":2,"latestGarden":1}', '{"version":1,"latestGarden":6}', '{"version":1,"latestGarden":1.5}']) {
    assert.deepEqual(loadProgress(memoryStorage({ [PROGRESS_KEY]: value })), DEFAULT_PROGRESS);
  }
});

test("unavailable storage recovers without throwing", () => {
  const storage = { getItem() { throw new Error("denied"); }, setItem() { throw new Error("denied"); } };
  assert.deepEqual(loadProgress(storage), DEFAULT_PROGRESS);
  assert.deepEqual(saveProgress(storage, { version: 1, latestGarden: 5 }), { version: 1, latestGarden: 5 });
});
