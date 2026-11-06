export const STORAGE_KEY = "gale-thread:v11";

export const DEFAULT_PREFERENCES = Object.freeze({
  version: 1,
  unlockedAirspace: 0,
  volume: 0.75,
  reducedMotion: false,
});

export function parsePreferences(raw, maxAirspace = 2) {
  if (typeof raw !== "string" || raw.length > 2_000) return { ...DEFAULT_PREFERENCES };
  try {
    const value = JSON.parse(raw);
    const valid = value
      && value.version === 1
      && Number.isInteger(value.unlockedAirspace)
      && value.unlockedAirspace >= 0
      && value.unlockedAirspace <= maxAirspace
      && typeof value.volume === "number"
      && Number.isFinite(value.volume)
      && value.volume >= 0
      && value.volume <= 1
      && typeof value.reducedMotion === "boolean";
    if (!valid) return { ...DEFAULT_PREFERENCES };
    return {
      version: 1,
      unlockedAirspace: value.unlockedAirspace,
      volume: Math.round(value.volume * 4) / 4,
      reducedMotion: value.reducedMotion,
    };
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

export function serializePreferences(preferences) {
  return JSON.stringify({
    version: 1,
    unlockedAirspace: preferences.unlockedAirspace,
    volume: preferences.volume,
    reducedMotion: preferences.reducedMotion,
  });
}

export function unlockAirspace(preferences, airspace) {
  return { ...preferences, unlockedAirspace: Math.max(preferences.unlockedAirspace, airspace) };
}
