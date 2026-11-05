export const PROGRESS_KEY = "signal-garden:v10:progress";

export const DEFAULT_PROGRESS = Object.freeze({
  version: 1,
  latestGarden: 0,
});

const LAST_GARDEN = 2;

export function normalizeProgress(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { ...DEFAULT_PROGRESS };
  if (value.version !== DEFAULT_PROGRESS.version) return { ...DEFAULT_PROGRESS };
  if (!Number.isInteger(value.latestGarden) || value.latestGarden < 0 || value.latestGarden > LAST_GARDEN) {
    return { ...DEFAULT_PROGRESS };
  }
  return { version: DEFAULT_PROGRESS.version, latestGarden: value.latestGarden };
}

export function loadProgress(storage) {
  try {
    const saved = storage.getItem(PROGRESS_KEY);
    return saved === null ? { ...DEFAULT_PROGRESS } : normalizeProgress(JSON.parse(saved));
  } catch {
    return { ...DEFAULT_PROGRESS };
  }
}

export function saveProgress(storage, progress) {
  const normalized = normalizeProgress(progress);
  try {
    storage.setItem(PROGRESS_KEY, JSON.stringify(normalized));
  } catch {
    // Storage can be unavailable in private or embedded browsing contexts.
  }
  return normalized;
}

export function unlockGarden(progress, garden) {
  const current = normalizeProgress(progress);
  if (!Number.isInteger(garden) || garden < 0 || garden > LAST_GARDEN) return current;
  return { ...current, latestGarden: Math.max(current.latestGarden, garden) };
}
