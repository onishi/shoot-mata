export const STORAGE_KEY = "lodestar-forge:v12";

export const DEFAULT_PREFERENCES = Object.freeze({
  unlockedLevel: 0,
  volume: 0.7,
  reducedMotion: false
});

function normalize(value, levelCount) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { ...DEFAULT_PREFERENCES };
  const unlockedLevel = Number.isInteger(value.unlockedLevel)
    ? Math.min(Math.max(value.unlockedLevel, 0), levelCount - 1)
    : DEFAULT_PREFERENCES.unlockedLevel;
  const volume = typeof value.volume === "number" && Number.isFinite(value.volume)
    ? Math.min(Math.max(Math.round(value.volume * 10) / 10, 0), 1)
    : DEFAULT_PREFERENCES.volume;
  return {
    unlockedLevel,
    volume,
    reducedMotion: typeof value.reducedMotion === "boolean" ? value.reducedMotion : DEFAULT_PREFERENCES.reducedMotion
  };
}

export function loadPreferences(storage, levelCount) {
  try {
    return normalize(JSON.parse(storage.getItem(STORAGE_KEY)), levelCount);
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

export function savePreferences(storage, preferences, levelCount) {
  const safe = normalize(preferences, levelCount);
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(safe));
  } catch {
    // The game remains playable when storage is unavailable or full.
  }
  return safe;
}
