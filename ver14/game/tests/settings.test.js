import test from "node:test";
import assert from "node:assert/strict";
import { canBind, DEFAULT_SETTINGS, loadSettings, normalizeSettings, saveSettings, SETTINGS_KEY } from "../src/settings.js";

function memoryStorage(initial = null) {
  const values = new Map(initial === null ? [] : [[SETTINGS_KEY, initial]]);
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), value: () => values.get(SETTINGS_KEY) };
}

test("settings round-trip volume, motion, and unique controls", () => {
  const storage = memoryStorage();
  saveSettings(storage, { volume: 0.4, reducedMotion: true, controls: { left: "KeyA", right: "KeyD", surge: "KeyW" } });
  assert.deepEqual(loadSettings(storage), { volume: 0.4, reducedMotion: true, controls: { left: "KeyA", right: "KeyD", surge: "KeyW" } });
});

test("corrupt storage is replaced with safe defaults", () => {
  const storage = memoryStorage("{broken");
  assert.deepEqual(loadSettings(storage), normalizeSettings(DEFAULT_SETTINGS));
  assert.doesNotThrow(() => JSON.parse(storage.value()));
});

test("invalid ranges and duplicate bindings recover without trapping input", () => {
  const settings = normalizeSettings({ volume: 8, reducedMotion: "yes", controls: { left: "KeyA", right: "KeyA", surge: "NotAKey" } });
  assert.equal(settings.volume, 1);
  assert.equal(settings.reducedMotion, false);
  assert.deepEqual(settings.controls, DEFAULT_SETTINGS.controls);
  assert.equal(canBind("KeyA", settings.controls, "left"), true);
  assert.equal(canBind("ArrowRight", settings.controls, "surge"), false);
});
