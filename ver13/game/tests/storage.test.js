import test from 'node:test';
import assert from 'node:assert/strict';
import { addRanking, DEFAULT_SAVE, loadSave, rebind, SAVE_KEY, sanitizeSave, storeSave } from '../src/storage.js';

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), values };
}

test('missing and corrupt saves fall back to safe defaults', () => {
  assert.deepEqual(loadSave(memoryStorage()), sanitizeSave(DEFAULT_SAVE));
  assert.deepEqual(loadSave(memoryStorage({ [SAVE_KEY]: '{broken' })), sanitizeSave(DEFAULT_SAVE));
});

test('save values are clamped and duplicate or reserved bindings are rejected', () => {
  const safe = sanitizeSave({ volume: 99, reducedMotion: true, highestWave: 50, keys: { left: 'KeyA', right: 'KeyA', cast: 'Enter' } });
  assert.equal(safe.volume, 10);
  assert.equal(safe.highestWave, 17);
  assert.equal(safe.keys.left, 'KeyA');
  assert.equal(safe.keys.right, 'ArrowRight');
  assert.equal(safe.keys.cast, 'Space');
});

test('third-wave progress survives storage round trip', () => {
  const storage = memoryStorage();
  const save = sanitizeSave({ ...DEFAULT_SAVE, highestWave: 2 });
  assert.equal(storeSave(save, storage), true);
  assert.equal(loadSave(storage).highestWave, 2);
});

test('sixth-wave progress survives storage round trip', () => {
  const storage = memoryStorage();
  const save = sanitizeSave({ ...DEFAULT_SAVE, highestWave: 5 });
  assert.equal(storeSave(save, storage), true);
  assert.equal(loadSave(storage).highestWave, 5);
});

test('ninth-wave progress survives storage round trip', () => {
  const storage = memoryStorage();
  const save = sanitizeSave({ ...DEFAULT_SAVE, highestWave: 8 });
  assert.equal(storeSave(save, storage), true);
  assert.equal(loadSave(storage).highestWave, 8);
});

test('twelfth-wave progress survives storage round trip', () => {
  const storage = memoryStorage();
  const save = sanitizeSave({ ...DEFAULT_SAVE, highestWave: 11 });
  assert.equal(storeSave(save, storage), true);
  assert.equal(loadSave(storage).highestWave, 11);
});

test('fifteenth-wave progress survives storage round trip', () => {
  const storage = memoryStorage();
  const save = sanitizeSave({ ...DEFAULT_SAVE, highestWave: 14 });
  assert.equal(storeSave(save, storage), true);
  assert.equal(loadSave(storage).highestWave, 14);
});

test('eighteenth-wave progress survives storage round trip', () => {
  const storage = memoryStorage();
  const save = sanitizeSave({ ...DEFAULT_SAVE, highestWave: 17 });
  assert.equal(storeSave(save, storage), true);
  assert.equal(loadSave(storage).highestWave, 17);
});

test('rebinding swaps an occupied key and persists the sanitized save', () => {
  const save = sanitizeSave(DEFAULT_SAVE);
  assert.equal(rebind(save, 'left', 'Space'), true);
  assert.equal(save.keys.left, 'Space');
  assert.equal(save.keys.cast, 'ArrowLeft');
  const storage = memoryStorage();
  assert.equal(storeSave(save, storage), true);
  assert.deepEqual(loadSave(storage), save);
});

test('unavailable storage never interrupts play', () => {
  const blocked = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
  assert.deepEqual(loadSave(blocked), sanitizeSave(DEFAULT_SAVE));
  assert.equal(storeSave(DEFAULT_SAVE, blocked), false);
});

test('rankings retain the five highest sanitized cabinet results', () => {
  const save = sanitizeSave(DEFAULT_SAVE);
  for (const [initials, score] of [['AAA', 100], ['BBB', 600], ['CCC', 300], ['DDD', 500], ['EEE', 200], ['FFF', 400]]) {
    addRanking(save, { initials, score, wave: 18, cleared: score >= 500, continues: 0 });
  }
  assert.deepEqual(save.rankings.map(entry => entry.initials), ['BBB', 'DDD', 'FFF', 'CCC', 'EEE']);
  const repaired = sanitizeSave({ rankings: [{ initials: '<script>', score: 999999 }, { initials: 'OKA', score: -5, wave: 99 }] });
  assert.deepEqual(repaired.rankings, [{ initials: 'OKA', score: 0, wave: 18, cleared: false, continues: 0 }]);
});
