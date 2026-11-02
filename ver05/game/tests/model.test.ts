import { describe, expect, it } from 'vitest';
import {
  FIRST_CHORD,
  HELD_NOTE,
  ensemblePositions,
  move,
  occupiesAllPlates,
  playAction,
  positionAfter,
  type Action,
} from '../src/model';

const upPhrase: Action[] = ['up', 'up', 'up', 'up', 'wait', 'wait', 'wait', 'wait'];
const leftPhrase: Action[] = ['up', 'up', 'left', 'left', 'left', 'wait', 'wait', 'wait'];
const rightPhrase: Action[] = ['up', 'up', 'right', 'right', 'right', 'wait', 'wait', 'wait'];

describe('FIRST CHORD rules', () => {
  it('moves on floor and stays in place against a wall', () => {
    expect(move(FIRST_CHORD, FIRST_CHORD.start, 'up')).toEqual({ x: 4, y: 4 });
    expect(positionAfter(FIRST_CHORD, ['down'])).toEqual(FIRST_CHORD.start);
  });

  it('replays a phrase from the shared origin at the current beat', () => {
    let actions: Action[] = [];
    let tracks: readonly (readonly Action[])[] = [upPhrase];
    for (const action of leftPhrase.slice(0, 5)) {
      const result = playAction(FIRST_CHORD, tracks, actions, action);
      actions = [...result.currentActions];
      tracks = result.tracks;
    }
    const result = playAction(FIRST_CHORD, tracks, actions, 'wait');
    expect(result.current).toEqual({ x: 1, y: 3 });
    expect(result.echoes[0]).toEqual({ x: 4, y: 1 });
  });

  it('requires all three distinct plates on the same beat', () => {
    expect(occupiesAllPlates(FIRST_CHORD, [{ x: 4, y: 1 }, { x: 1, y: 3 }])).toBe(false);
    expect(occupiesAllPlates(FIRST_CHORD, [{ x: 4, y: 1 }, { x: 1, y: 3 }, { x: 7, y: 3 }])).toBe(true);
  });

  it('commits completed phrases and retains only the newest two', () => {
    let tracks: readonly (readonly Action[])[] = [upPhrase, leftPhrase];
    let actions: readonly Action[] = [];
    let result = playAction(FIRST_CHORD, tracks, actions, 'wait');
    for (let i = 1; i < 8; i += 1) result = playAction(FIRST_CHORD, result.tracks, result.currentActions, 'wait');
    expect(result.phraseCommitted).toBe(true);
    expect(result.tracks).toHaveLength(2);
    expect(result.tracks[0]).toEqual(leftPhrase);
    expect(result.currentActions).toEqual([]);
  });

  it('has a deterministic three-phrase solution', () => {
    let tracks: readonly (readonly Action[])[] = [];
    for (const phrase of [upPhrase, leftPhrase]) {
      let current: readonly Action[] = [];
      for (const action of phrase) {
        const result = playAction(FIRST_CHORD, tracks, current, action);
        tracks = result.tracks;
        current = result.currentActions;
      }
    }
    let current: readonly Action[] = [];
    let won = false;
    for (const action of rightPhrase) {
      const result = playAction(FIRST_CHORD, tracks, current, action);
      current = result.currentActions;
      won = result.won;
      if (won) break;
    }
    expect(won).toBe(true);
  });
});

describe('HELD NOTE beat door', () => {
  const triggerPhrase: Action[] = ['left', 'left', 'left', 'up', 'up', 'wait', 'wait', 'wait'];
  const doorPhrase: Action[] = ['up', 'up', 'up', 'up', 'up', 'up', 'up', 'wait'];
  const rightPhrase: Action[] = ['right', 'right', 'right', 'wait', 'wait', 'wait', 'wait', 'wait'];

  it('keeps a lone performer outside the closed door', () => {
    expect(ensemblePositions(HELD_NOTE, [doorPhrase], 5)).toEqual([{ x: 4, y: 4 }]);
  });

  it('opens on the beat another performer reaches its trigger', () => {
    expect(ensemblePositions(HELD_NOTE, [triggerPhrase, doorPhrase], 4)[1]).toEqual({ x: 4, y: 4 });
    expect(ensemblePositions(HELD_NOTE, [triggerPhrase, doorPhrase], 5)).toEqual([
      { x: 1, y: 3 },
      { x: 4, y: 3 },
    ]);
  });

  it('has a deterministic three-phrase solution through the beat door', () => {
    let tracks: readonly (readonly Action[])[] = [];
    for (const phrase of [triggerPhrase, doorPhrase]) {
      let current: readonly Action[] = [];
      for (const action of phrase) {
        const result = playAction(HELD_NOTE, tracks, current, action);
        tracks = result.tracks;
        current = result.currentActions;
      }
    }
    let current: readonly Action[] = [];
    let won = false;
    for (const action of rightPhrase) {
      const result = playAction(HELD_NOTE, tracks, current, action);
      current = result.currentActions;
      won = result.won;
      if (won) break;
    }
    expect(won).toBe(true);
  });
});
