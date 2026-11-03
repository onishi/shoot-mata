import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, SETTINGS_KEY, loadSettings, saveSettings, type Settings } from "../src/settings";

function memoryStorage(initial?: string) {
  const values = new Map<string, string>();
  if (initial !== undefined) values.set(SETTINGS_KEY, initial);
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
    value: () => values.get(SETTINGS_KEY)
  };
}

describe("settings persistence", () => {
  it("returns defaults when no save exists", () => {
    expect(loadSettings(memoryStorage())).toEqual(DEFAULT_SETTINGS);
  });

  it("round-trips valid settings", () => {
    const storage = memoryStorage();
    const settings: Settings = { volume: 30, highContrast: true, reducedMotion: true };
    expect(saveSettings(storage, settings)).toBe(true);
    expect(loadSettings(storage)).toEqual(settings);
  });

  it.each([
    "not json",
    JSON.stringify({ volume: 101, highContrast: false, reducedMotion: false }),
    JSON.stringify({ volume: 70, highContrast: "yes", reducedMotion: false }),
    JSON.stringify({ volume: 70, highContrast: false })
  ])("clears a corrupt save and safely restores defaults", (raw) => {
    const storage = memoryStorage(raw);
    expect(loadSettings(storage)).toEqual(DEFAULT_SETTINGS);
    expect(storage.value()).toBeUndefined();
  });

  it("keeps the game usable when storage writes fail", () => {
    const storage = memoryStorage();
    storage.setItem = () => { throw new Error("blocked"); };
    expect(saveSettings(storage, DEFAULT_SETTINGS)).toBe(false);
  });
});
