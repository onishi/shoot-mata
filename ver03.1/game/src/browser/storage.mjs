export function readStorage(key, storage) {
  try {
    const target = storage ?? globalThis.localStorage;
    return target.getItem(key);
  } catch {
    return null;
  }
}

export function writeStorage(key, value, storage) {
  try {
    const target = storage ?? globalThis.localStorage;
    target.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}
