import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_PREFERENCES, parsePreferences, serializePreferences, unlockAirspace } from "../src/preferences.js";

test("valid saved progress and accessibility settings round-trip", () => {
  const saved = { version: 1, unlockedAirspace: 2, volume: 0.25, reducedMotion: true };
  assert.deepEqual(parsePreferences(serializePreferences(saved)), saved);
});

test("missing, malformed, or out-of-range saves recover to safe defaults", () => {
  for (const raw of [null, "{broken", JSON.stringify({ version: 1, unlockedAirspace: 99, volume: 4, reducedMotion: "yes" })]) {
    assert.deepEqual(parsePreferences(raw), DEFAULT_PREFERENCES);
  }
});

test("unlocking never loses previously reached progress", () => {
  const current = { ...DEFAULT_PREFERENCES, unlockedAirspace: 2 };
  assert.equal(unlockAirspace(current, 1).unlockedAirspace, 2);
});
