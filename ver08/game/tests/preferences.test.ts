import { describe, expect, it } from "vitest";
import {
  DEFAULT_PREFERENCES,
  PREFERENCES_KEY,
  loadPreferences,
  normalizePreferences,
  savePreferences,
  type PreferenceStorage,
} from "../src/preferences";

function memoryStorage(initial: string | null = null): PreferenceStorage & { value: string | null } {
  return {
    value: initial,
    getItem() { return this.value; },
    setItem(_key, value) { this.value = value; },
  };
}

describe("DUSKLOOM preferences", () => {
  it("normalizes volume to supported steps and preserves reduced motion", () => {
    expect(normalizePreferences({ volume: 0.62, reducedMotion: true })).toEqual({
      volume: 0.5,
      reducedMotion: true,
    });
    expect(normalizePreferences({ volume: 8, reducedMotion: false }).volume).toBe(1);
  });

  it("falls back safely when saved data is missing or damaged", () => {
    expect(loadPreferences(memoryStorage())).toEqual(DEFAULT_PREFERENCES);
    expect(loadPreferences(memoryStorage("not-json"))).toEqual(DEFAULT_PREFERENCES);
    expect(loadPreferences(memoryStorage('{"volume":"loud","reducedMotion":"yes"}'))).toEqual(DEFAULT_PREFERENCES);
  });

  it("round-trips settings through versioned storage", () => {
    const storage = memoryStorage();
    savePreferences(storage, { volume: 0.25, reducedMotion: true });
    expect(storage.value).toBe('{"volume":0.25,"reducedMotion":true}');
    expect(loadPreferences(storage)).toEqual({ volume: 0.25, reducedMotion: true });
    expect(PREFERENCES_KEY).toBe("duskloom.preferences.v1");
  });
});
