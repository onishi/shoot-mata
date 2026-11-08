export const SAVE_KEY = 'ringward:v13:settings';

export const DEFAULT_SAVE = Object.freeze({
  version: 1,
  volume: 7,
  reducedMotion: false,
  highestWave: 0,
  keys: Object.freeze({ left: 'ArrowLeft', right: 'ArrowRight', cast: 'Space' })
});

const BLOCKED_BINDINGS = new Set(['Enter', 'Escape', 'KeyP', 'KeyR', 'KeyS', 'KeyN']);

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
  return {
    version: 1,
    volume: Number.isFinite(source.volume) ? Math.max(0, Math.min(10, Math.round(source.volume))) : DEFAULT_SAVE.volume,
    reducedMotion: source.reducedMotion === true,
    highestWave: Number.isInteger(source.highestWave) ? Math.max(0, Math.min(1, source.highestWave)) : 0,
    keys
  };
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
