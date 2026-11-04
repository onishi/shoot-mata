export interface Preferences {
  volume: number;
  reducedMotion: boolean;
}

export interface PreferenceStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const PREFERENCES_KEY = "duskloom.preferences.v1";

export const DEFAULT_PREFERENCES: Preferences = {
  volume: 0.75,
  reducedMotion: false,
};

function normalizeVolume(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return DEFAULT_PREFERENCES.volume;
  return Math.round(Math.max(0, Math.min(1, value)) * 4) / 4;
}

export function normalizePreferences(value: unknown, defaults = DEFAULT_PREFERENCES): Preferences {
  if (typeof value !== "object" || value === null) return { ...defaults };
  const candidate = value as Partial<Preferences>;
  return {
    volume: candidate.volume === undefined ? defaults.volume : normalizeVolume(candidate.volume),
    reducedMotion: typeof candidate.reducedMotion === "boolean" ? candidate.reducedMotion : defaults.reducedMotion,
  };
}

export function loadPreferences(storage: PreferenceStorage, defaults = DEFAULT_PREFERENCES): Preferences {
  try {
    const saved = storage.getItem(PREFERENCES_KEY);
    return saved === null ? { ...defaults } : normalizePreferences(JSON.parse(saved), defaults);
  } catch {
    return { ...defaults };
  }
}

export function savePreferences(storage: PreferenceStorage, preferences: Preferences): void {
  try {
    storage.setItem(PREFERENCES_KEY, JSON.stringify(normalizePreferences(preferences)));
  } catch {
    // The game remains usable when storage is unavailable or full.
  }
}
