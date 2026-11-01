import type { Difficulty } from '../core/types';
import type { StorageLike } from './save';

export const SETTINGS_KEY = 'palimpsest-wake:v4.0:settings';
export const SETTINGS_TEMP_KEY = `${SETTINGS_KEY}:temporary`;
export const SETTINGS_SCHEMA_VERSION = 1;

export interface GameSettings {
  bgm: number;
  se: number;
  screenShake: boolean;
  reducedFlash: boolean;
  difficulty: Difficulty;
}

export const defaultSettings = (): GameSettings => ({
  bgm: 70,
  se: 65,
  screenShake: true,
  reducedFlash: false,
  difficulty: 'normal'
});

interface SettingsDocument extends GameSettings { schemaVersion: number }

const validPercent = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 100;

const decode = (raw: string): GameSettings | null => {
  let value: unknown;
  try { value = JSON.parse(raw); } catch { return null; }
  if (!value || typeof value !== 'object') return null;
  const document = value as Partial<SettingsDocument>;
  if (document.schemaVersion !== SETTINGS_SCHEMA_VERSION
    || !validPercent(document.bgm) || !validPercent(document.se)
    || typeof document.screenShake !== 'boolean' || typeof document.reducedFlash !== 'boolean'
    || !['echo', 'normal', 'proof'].includes(document.difficulty ?? '')) return null;
  return {
    bgm: document.bgm, se: document.se,
    screenShake: document.screenShake, reducedFlash: document.reducedFlash,
    difficulty: document.difficulty as Difficulty
  };
};

export const loadSettings = (storage: StorageLike): GameSettings | null => {
  try {
    const raw = storage.getItem(SETTINGS_KEY);
    return raw === null ? null : decode(raw);
  } catch { return null; }
};

export const saveSettings = (storage: StorageLike, settings: GameSettings): boolean => {
  const raw = JSON.stringify({ schemaVersion: SETTINGS_SCHEMA_VERSION, ...settings });
  if (!decode(raw)) return false;
  try {
    storage.setItem(SETTINGS_TEMP_KEY, raw);
    if (storage.getItem(SETTINGS_TEMP_KEY) !== raw || !decode(raw)) throw new Error('Settings verification failed');
    storage.setItem(SETTINGS_KEY, raw);
    storage.removeItem(SETTINGS_TEMP_KEY);
    return true;
  } catch {
    try { storage.removeItem(SETTINGS_TEMP_KEY); } catch { /* Storage is unavailable. */ }
    return false;
  }
};
