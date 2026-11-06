import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_SETTINGS, SETTINGS_KEY, loadSettings, nextVolume, saveSettings } from "../src/preferences.js";

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, value),
  };
}

test("settings use deterministic defaults when no save exists", () => {
  assert.deepEqual(loadSettings(memoryStorage()), DEFAULT_SETTINGS);
});

test("valid settings survive save and reload", () => {
  const storage = memoryStorage();
  saveSettings(storage, { version: 1, volume: 0.5, reducedMotion: true });
  assert.deepEqual(loadSettings(storage), { version: 1, volume: 0.5, reducedMotion: true });
});

test("malformed, obsolete, and out-of-range saves recover to defaults", () => {
  for (const value of ["not json", "null", '{"version":2,"volume":0.5,"reducedMotion":true}', '{"version":1,"volume":7,"reducedMotion":true}']) {
    assert.deepEqual(loadSettings(memoryStorage({ [SETTINGS_KEY]: value })), DEFAULT_SETTINGS);
  }
});

test("unavailable storage recovers without throwing", () => {
  const storage = { getItem() { throw new Error("denied"); }, setItem() { throw new Error("denied"); } };
  assert.deepEqual(loadSettings(storage), DEFAULT_SETTINGS);
  assert.deepEqual(saveSettings(storage, { version: 1, volume: 0, reducedMotion: true }), { version: 1, volume: 0, reducedMotion: true });
});

test("volume cycles through full, half, mute, and full", () => {
  assert.equal(nextVolume(1), 0.5);
  assert.equal(nextVolume(0.5), 0);
  assert.equal(nextVolume(0), 1);
});
