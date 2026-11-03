import { levels } from "./model";

export const SAVE_KEY = "palimpsest-post-v1";

export type Preferences = {
  unlockedLevel: number;
  volume: number;
  highContrast: boolean;
  reduceMotion: boolean;
};

export const defaultPreferences = (): Preferences => ({
  unlockedLevel: 0,
  volume: 75,
  highContrast: false,
  reduceMotion: false,
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parsePreferences(raw: string | null): Preferences {
  if (raw === null) return defaultPreferences();
  try {
    const value: unknown = JSON.parse(raw);
    if (!isRecord(value)) return defaultPreferences();
    const unlockedLevel = typeof value.unlockedLevel === "number" && Number.isInteger(value.unlockedLevel)
      ? Math.max(0, Math.min(levels.length - 1, value.unlockedLevel))
      : 0;
    const volume = typeof value.volume === "number" && Number.isFinite(value.volume)
      ? Math.max(0, Math.min(100, Math.round(value.volume / 25) * 25))
      : 75;
    return {
      unlockedLevel,
      volume,
      highContrast: typeof value.highContrast === "boolean" ? value.highContrast : false,
      reduceMotion: typeof value.reduceMotion === "boolean" ? value.reduceMotion : false,
    };
  } catch {
    return defaultPreferences();
  }
}

export function loadPreferences(storage: Pick<Storage, "getItem">): Preferences {
  try {
    return parsePreferences(storage.getItem(SAVE_KEY));
  } catch {
    return defaultPreferences();
  }
}

export function savePreferences(storage: Pick<Storage, "setItem">, preferences: Preferences): boolean {
  try {
    storage.setItem(SAVE_KEY, JSON.stringify(preferences));
    return true;
  } catch {
    return false;
  }
}
