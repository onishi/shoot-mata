export const SAVE_KEY = 'candlewick-v9-save';

export const DEFAULT_PREFERENCES = Object.freeze({
  maxUnlockedLevel: 0,
  volume: 0.5,
  screenShake: true,
  reduceFlashes: false
});

function isValidSave(value, levelCount) {
  return value !== null
    && typeof value === 'object'
    && !Array.isArray(value)
    && value.version === 1
    && Number.isInteger(value.maxUnlockedLevel)
    && value.maxUnlockedLevel >= 0
    && value.maxUnlockedLevel < levelCount
    && [0, 0.5, 1].includes(value.volume)
    && typeof value.screenShake === 'boolean'
    && typeof value.reduceFlashes === 'boolean';
}

export function loadPreferences(storage, levelCount) {
  try {
    const raw = storage?.getItem(SAVE_KEY);
    if (raw === null || raw === undefined) return { ...DEFAULT_PREFERENCES };
    const value = JSON.parse(raw);
    if (!isValidSave(value, levelCount)) return { ...DEFAULT_PREFERENCES };
    return {
      maxUnlockedLevel: value.maxUnlockedLevel,
      volume: value.volume,
      screenShake: value.screenShake,
      reduceFlashes: value.reduceFlashes
    };
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

export function savePreferences(storage, preferences) {
  try {
    storage?.setItem(SAVE_KEY, JSON.stringify({ version: 1, ...preferences }));
    return true;
  } catch {
    return false;
  }
}
