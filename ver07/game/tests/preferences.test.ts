import { describe, expect, it } from "vitest";
import { defaultPreferences, loadPreferences, parsePreferences, savePreferences, SAVE_KEY } from "../src/preferences";

describe("PALIMPSEST POST preferences", () => {
  it("uses safe defaults when saved data is absent or corrupt", () => {
    expect(parsePreferences(null)).toEqual(defaultPreferences());
    expect(parsePreferences("{broken")).toEqual(defaultPreferences());
    expect(parsePreferences("[]")).toEqual(defaultPreferences());
  });

  it("clamps damaged values while preserving valid settings", () => {
    expect(parsePreferences(JSON.stringify({
      unlockedLevel: 99,
      volume: 63,
      highContrast: true,
      reduceMotion: true,
    }))).toEqual({ unlockedLevel: 2, volume: 75, highContrast: true, reduceMotion: true });
  });

  it("recovers when browser storage access fails", () => {
    expect(loadPreferences({ getItem: () => { throw new Error("denied"); } })).toEqual(defaultPreferences());
    expect(savePreferences({ setItem: () => { throw new Error("full"); } }, defaultPreferences())).toBe(false);
  });

  it("writes a versioned save that can be read back", () => {
    let savedKey = "";
    let savedValue = "";
    const storage = {
      setItem: (key: string, value: string) => { savedKey = key; savedValue = value; },
      getItem: () => savedValue,
    };
    const preferences = { unlockedLevel: 1, volume: 25, highContrast: true, reduceMotion: false };
    expect(savePreferences(storage, preferences)).toBe(true);
    expect(savedKey).toBe(SAVE_KEY);
    expect(loadPreferences(storage)).toEqual(preferences);
  });
});
