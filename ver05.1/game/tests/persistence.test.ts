import { describe, expect, it } from 'vitest';
import {
  SAVE_KEY,
  changeSettings,
  completeRoom,
  defaultSave,
  loadSave,
  markHintSeen,
  parseSave,
  storeSave,
} from '../src/persistence';

describe('versioned progress persistence', () => {
  it('unlocks the next room without saving an in-progress phrase', () => {
    const completed = completeRoom(defaultSave(), 1, 4);
    expect(completed.highestUnlockedRoom).toBe(2);
    expect(completed.completedRooms).toEqual([1]);
    expect(completed).not.toHaveProperty('tracks');
    expect(completed).not.toHaveProperty('currentActions');
  });

  it('keeps the last room selected after completing the score', () => {
    const completed = completeRoom({ ...defaultSave(), highestUnlockedRoom: 3 }, 3, 4);
    expect(completed.highestUnlockedRoom).toBe(3);
    expect(completed.completedRooms).toEqual([3]);
  });

  it('round-trips progress and settings through storage', () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, value); },
    };
    const save = changeSettings(completeRoom(defaultSave(), 0, 4), { volume: 0.75, reducedMotion: true });
    expect(storeSave(storage, save)).toBe(true);
    expect(loadSave(storage, 4)).toEqual(save);
    expect(values.has(SAVE_KEY)).toBe(true);
  });

  it('records hint use once per valid room', () => {
    const once = markHintSeen(defaultSave(), 2, 4);
    expect(once.hintsSeen).toEqual([2]);
    expect(markHintSeen(once, 2, 4).hintsSeen).toEqual([2]);
    expect(markHintSeen(once, 4, 4)).toBe(once);
  });

  it('rejects corrupt, out-of-range, and old-version data', () => {
    const fallback = defaultSave(true);
    expect(parseSave('{broken', 4, fallback)).toBe(fallback);
    expect(parseSave(JSON.stringify({ ...fallback, highestUnlockedRoom: 9 }), 4, fallback)).toBe(fallback);
    expect(parseSave(JSON.stringify({ ...fallback, version: 0 }), 4, fallback)).toBe(fallback);
  });

  it('survives unavailable storage', () => {
    const storage = {
      getItem: () => { throw new Error('blocked'); },
      setItem: () => { throw new Error('full'); },
    };
    expect(loadSave(storage, 4)).toEqual(defaultSave());
    expect(storeSave(storage, defaultSave())).toBe(false);
  });
});
