export const SETTINGS_KEY = "signal-garden:v10:settings";

export const DEFAULT_SETTINGS = Object.freeze({
  version: 1,
  volume: 1,
  reducedMotion: false,
});

export function normalizeSettings(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { ...DEFAULT_SETTINGS };
  if (value.version !== DEFAULT_SETTINGS.version) return { ...DEFAULT_SETTINGS };
  if (![0, 0.5, 1].includes(value.volume)) return { ...DEFAULT_SETTINGS };
  if (typeof value.reducedMotion !== "boolean") return { ...DEFAULT_SETTINGS };
  return {
    version: DEFAULT_SETTINGS.version,
    volume: value.volume,
    reducedMotion: value.reducedMotion,
  };
}

export function loadSettings(storage) {
  try {
    const saved = storage.getItem(SETTINGS_KEY);
    return saved === null ? { ...DEFAULT_SETTINGS } : normalizeSettings(JSON.parse(saved));
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(storage, settings) {
  const normalized = normalizeSettings(settings);
  try {
    storage.setItem(SETTINGS_KEY, JSON.stringify(normalized));
  } catch {
    // Storage can be unavailable in private or embedded browsing contexts.
  }
  return normalized;
}

export function nextVolume(volume) {
  if (volume === 1) return 0.5;
  if (volume === 0.5) return 0;
  return 1;
}
