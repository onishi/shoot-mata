import { WAVES } from './model.js';

export const SAVE_KEY = 'ringward:v13:settings';

export const DEFAULT_SAVE = Object.freeze({
  version: 2,
  volume: 7,
  reducedMotion: false,
  highestWave: 0,
  keys: Object.freeze({ left: 'ArrowLeft', right: 'ArrowRight', cast: 'Space' }),
  rankings: Object.freeze([])
});

const BLOCKED_BINDINGS = new Set(['Enter', 'Escape', 'KeyC', 'KeyP', 'KeyR', 'KeyS', 'KeyN']);

export function sanitizeSave(value) {
  const source = value && typeof value === 'object' ? value : {};
  const sourceKeys = source.keys && typeof source.keys === 'object' ? source.keys : {};
  const keys = { ...DEFAULT_SAVE.keys };
  const used = new Set();
  for (const action of ['left', 'right', 'cast']) {
    const code = sourceKeys[action];
    if (typeof code === 'string' && code.length <= 24 && !BLOCKED_BINDINGS.has(code) && !used.has(code)) {
      keys[action] = code;
      used.add(code);
    } else {
      used.add(keys[action]);
    }
  }
  const rankings = Array.isArray(source.rankings) ? source.rankings
    .filter(entry => entry && typeof entry === 'object' && /^[A-Z]{3}$/.test(entry.initials) && Number.isFinite(entry.score))
    .map(entry => ({
      initials: entry.initials,
      score: Math.max(0, Math.round(entry.score)),
      wave: Math.max(1, Math.min(WAVES.length, Math.round(entry.wave) || 1)),
      cleared: entry.cleared === true,
      continues: Math.max(0, Math.round(entry.continues) || 0),
      rank: /^[SABC]$/.test(entry.rank) ? entry.rank : (entry.cleared === true ? 'B' : 'C')
    }))
    .sort((a, b) => b.score - a.score || a.continues - b.continues)
    .slice(0, 5) : [];
  return {
    version: 2,
    volume: Number.isFinite(source.volume) ? Math.max(0, Math.min(10, Math.round(source.volume))) : DEFAULT_SAVE.volume,
    reducedMotion: source.reducedMotion === true,
    highestWave: Number.isInteger(source.highestWave) ? Math.max(0, Math.min(WAVES.length - 1, source.highestWave)) : 0,
    keys,
    rankings
  };
}

export function addRanking(save, result) {
  const safe = sanitizeSave({ ...save, rankings: [...(save.rankings ?? []), result] });
  save.version = safe.version;
  save.rankings = safe.rankings;
  return safe.rankings;
}

export function loadSave(storage = globalThis.localStorage) {
  try {
    return sanitizeSave(JSON.parse(storage.getItem(SAVE_KEY)));
  } catch {
    return sanitizeSave(null);
  }
}

export function storeSave(save, storage = globalThis.localStorage) {
  const safe = sanitizeSave(save);
  try {
    storage.setItem(SAVE_KEY, JSON.stringify(safe));
    return true;
  } catch {
    return false;
  }
}

export function rebind(save, action, code) {
  if (!['left', 'right', 'cast'].includes(action) || typeof code !== 'string' || BLOCKED_BINDINGS.has(code)) return false;
  const other = Object.entries(save.keys).find(([name, assigned]) => name !== action && assigned === code);
  if (other) save.keys[other[0]] = save.keys[action];
  save.keys[action] = code;
  return true;
}

export function keyLabel(code) {
  const aliases = { ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓', Space: 'SPACE' };
  return aliases[code] ?? code.replace(/^Key/, '').replace(/^Digit/, '');
}
