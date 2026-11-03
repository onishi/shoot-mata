export const SETTINGS_KEY = "ripplekeep:v6:settings";

export type Settings = {
  volume: number;
  highContrast: boolean;
  reducedMotion: boolean;
};

export const DEFAULT_SETTINGS: Settings = {
  volume: 70,
  highContrast: false,
  reducedMotion: false
};

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function isSettings(value: unknown): value is Settings {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return Number.isInteger(candidate.volume)
    && (candidate.volume as number) >= 0
    && (candidate.volume as number) <= 100
    && typeof candidate.highContrast === "boolean"
    && typeof candidate.reducedMotion === "boolean";
}

export function loadSettings(storage: StorageLike): Settings {
  try {
    const raw = storage.getItem(SETTINGS_KEY);
    if (raw === null) return { ...DEFAULT_SETTINGS };
    const parsed: unknown = JSON.parse(raw);
    if (isSettings(parsed)) return { ...parsed };
    storage.removeItem(SETTINGS_KEY);
  } catch {
    try { storage.removeItem(SETTINGS_KEY); } catch { /* storage can be unavailable */ }
  }
  return { ...DEFAULT_SETTINGS };
}

export function saveSettings(storage: StorageLike, settings: Settings): boolean {
  try {
    storage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    return true;
  } catch {
    return false;
  }
}
