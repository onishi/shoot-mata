import { describe, expect, it } from 'vitest';
import {
  FIRST_CHORD,
  FINAL_CADENCE,
  GLASS_RETURN,
  HELD_NOTE,
  LONG_TONE,
  MIRROR_ENTRY,
  NEGATIVE_SPACE,
  REST_MARK,
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

describe('LONG TONE sustained trigger', () => {
  const triggerPhrase: Action[] = ['left', 'left', 'up', 'wait', 'wait', 'wait', 'wait', 'wait'];
  const doorPhrase: Action[] = ['up', 'up', 'wait', 'wait', 'wait', 'up', 'up', 'wait'];
  const rightPhrase: Action[] = ['right', 'right', 'right', 'wait', 'wait', 'wait', 'wait', 'wait'];

  it('does not remember an early trigger after its performer leaves', () => {
    const leavesTrigger: Action[] = ['left', 'left', 'up', 'right', 'wait', 'wait', 'wait', 'wait'];
    expect(ensemblePositions(LONG_TONE, [leavesTrigger, doorPhrase], 6)[1]).toEqual({ x: 4, y: 3 });
  });

  it('lets a later voice cross while the early voice sustains the trigger', () => {
    expect(ensemblePositions(LONG_TONE, [triggerPhrase, doorPhrase], 5)[1]).toEqual({ x: 4, y: 3 });
    expect(ensemblePositions(LONG_TONE, [triggerPhrase, doorPhrase], 6)).toEqual([
      { x: 2, y: 4 },
      { x: 4, y: 2 },
    ]);
  });

  it('has a deterministic three-phrase solution with a sustained note', () => {
    expect(runSolution(LONG_TONE, [triggerPhrase, doorPhrase, rightPhrase])).toEqual({ won: true, beat: 7 });
  });
});

describe('FINAL CADENCE full-measure alignment', () => {
  const originPhrase: Action[] = ['wait', 'wait', 'wait', 'wait', 'wait', 'wait', 'wait', 'wait'];
  const leftPhrase: Action[] = ['left', 'left', 'left', 'up', 'up', 'up', 'wait', 'wait'];
  const pocketPhrase: Action[] = ['up', 'up', 'up', 'up', 'right', 'right', 'right', 'down'];

  it('makes the right plate reachable only by its upper pocket entrance', () => {
    expect(positionAfter(FINAL_CADENCE, ['right', 'right', 'right', 'up', 'up', 'up'])).toEqual({ x: 7, y: 4 });
    expect(positionAfter(FINAL_CADENCE, pocketPhrase)).toEqual({ x: 7, y: 2 });
  });

  it('resolves its three distinct distances exactly on the eighth beat', () => {
    expect(runSolution(FINAL_CADENCE, [originPhrase, leftPhrase, pocketPhrase])).toEqual({ won: true, beat: 8 });
  });
});

describe('MIRROR ENTRY replay inversion', () => {
  const mirroredPhrase: Action[] = ['right', 'right', 'up', 'up', 'wait', 'wait', 'wait', 'wait'];
  const leftPhrase: Action[] = ['left', 'left', 'left', 'wait', 'wait', 'wait', 'wait', 'wait'];
  const rightPhrase: Action[] = ['right', 'right', 'right', 'wait', 'wait', 'wait', 'wait', 'wait'];

  it('keeps the recorded path literal but inverts horizontal actions after glass on replay', () => {
    expect(positionAfter(MIRROR_ENTRY, mirroredPhrase, 4)).toEqual({ x: 6, y: 3 });
    expect(ensemblePositions(MIRROR_ENTRY, [mirroredPhrase], 4)).toEqual([{ x: 4, y: 3 }]);
  });

  it('does not invert the step that enters glass, only later horizontal steps', () => {
    expect(ensemblePositions(MIRROR_ENTRY, [mirroredPhrase], 1)).toEqual([{ x: 5, y: 5 }]);
    expect(ensemblePositions(MIRROR_ENTRY, [mirroredPhrase], 2)).toEqual([{ x: 4, y: 5 }]);
  });

  it('has a deterministic solution that depends on the first voice changing course', () => {
    expect(runSolution(MIRROR_ENTRY, [mirroredPhrase, leftPhrase, rightPhrase])).toEqual({ won: true, beat: 4 });
  });
});

describe('GLASS RETURN double inversion', () => {
  const returnPhrase: Action[] = ['right', 'right', 'up', 'right', 'up', 'wait', 'wait', 'wait'];
  const leftPhrase: Action[] = ['left', 'left', 'left', 'wait', 'wait', 'wait', 'wait', 'wait'];
  const rightPhrase: Action[] = ['right', 'right', 'right', 'wait', 'wait', 'wait', 'wait', 'wait'];

  it('uses inverted movement only between the two glass crossings', () => {
    expect(ensemblePositions(GLASS_RETURN, [returnPhrase], 1)).toEqual([{ x: 5, y: 5 }]);
    expect(ensemblePositions(GLASS_RETURN, [returnPhrase], 2)).toEqual([{ x: 4, y: 5 }]);
    expect(ensemblePositions(GLASS_RETURN, [returnPhrase], 3)).toEqual([{ x: 4, y: 4 }]);
    expect(ensemblePositions(GLASS_RETURN, [returnPhrase], 4)).toEqual([{ x: 5, y: 4 }]);
  });

  it('keeps the recording literal while replay returns through both glass floors', () => {
    expect(positionAfter(GLASS_RETURN, returnPhrase, 5)).toEqual({ x: 6, y: 3 });
    expect(ensemblePositions(GLASS_RETURN, [returnPhrase], 5)).toEqual([{ x: 5, y: 3 }]);
  });

  it('has a deterministic solution that restores horizontal direction before the chord', () => {
    expect(runSolution(GLASS_RETURN, [returnPhrase, leftPhrase, rightPhrase])).toEqual({ won: true, beat: 5 });
  });
});

describe('REST MARK replay silence', () => {
  const restPhrase: Action[] = ['up', 'right', 'right', 'up', 'wait', 'wait', 'wait', 'wait'];
  const leftPhrase: Action[] = ['left', 'left', 'left', 'wait', 'wait', 'wait', 'wait', 'wait'];
  const rightPhrase: Action[] = ['right', 'right', 'right', 'wait', 'wait', 'wait', 'wait', 'wait'];

  it('keeps the recording literal but turns the input after entering silence into one rest on replay', () => {
    expect(positionAfter(REST_MARK, restPhrase, 4)).toEqual({ x: 6, y: 3 });
    expect(ensemblePositions(REST_MARK, [restPhrase], 1)).toEqual([{ x: 4, y: 4 }]);
    expect(ensemblePositions(REST_MARK, [restPhrase], 2)).toEqual([{ x: 4, y: 4 }]);
    expect(ensemblePositions(REST_MARK, [restPhrase], 3)).toEqual([{ x: 5, y: 4 }]);
    expect(ensemblePositions(REST_MARK, [restPhrase], 4)).toEqual([{ x: 5, y: 3 }]);
  });

  it('mutes only one input rather than trapping the replay on the quiet floor', () => {
    expect(ensemblePositions(REST_MARK, [restPhrase], 3)).not.toEqual([{ x: 4, y: 4 }]);
  });

  it('has a deterministic solution that depends on the missing replay beat', () => {
    expect(runSolution(REST_MARK, [restPhrase, leftPhrase, rightPhrase])).toEqual({ won: true, beat: 4 });
  });
});

describe('NEGATIVE SPACE combined replay transforms', () => {
  const negativePhrase: Action[] = ['right', 'right', 'up', 'right', 'right', 'up', 'wait', 'wait'];
  const leftPhrase: Action[] = ['left', 'left', 'left', 'wait', 'wait', 'wait', 'wait', 'wait'];
  const rightPhrase: Action[] = ['right', 'right', 'right', 'wait', 'wait', 'wait', 'wait', 'wait'];

  it('applies inversion before silence removes the next transformed input', () => {
    expect(ensemblePositions(NEGATIVE_SPACE, [negativePhrase], 1)).toEqual([{ x: 5, y: 5 }]);
    expect(ensemblePositions(NEGATIVE_SPACE, [negativePhrase], 2)).toEqual([{ x: 4, y: 5 }]);
    expect(ensemblePositions(NEGATIVE_SPACE, [negativePhrase], 3)).toEqual([{ x: 4, y: 4 }]);
    expect(ensemblePositions(NEGATIVE_SPACE, [negativePhrase], 4)).toEqual([{ x: 4, y: 4 }]);
  });

  it('keeps inversion active after the silent beat and sends replay left of its recorded route', () => {
    expect(positionAfter(NEGATIVE_SPACE, negativePhrase, 6)).toEqual({ x: 7, y: 3 });
    expect(ensemblePositions(NEGATIVE_SPACE, [negativePhrase], 5)).toEqual([{ x: 3, y: 4 }]);
    expect(ensemblePositions(NEGATIVE_SPACE, [negativePhrase], 6)).toEqual([{ x: 3, y: 3 }]);
  });

  it('has a deterministic solution that requires both replay transformations', () => {
    expect(runSolution(NEGATIVE_SPACE, [negativePhrase, leftPhrase, rightPhrase])).toEqual({ won: true, beat: 6 });
  });
});

function runSolution(
  room: Parameters<typeof playAction>[0],
  phrases: readonly (readonly Action[])[],
): { won: boolean; beat: number } {
  let tracks: readonly (readonly Action[])[] = [];
  let final = { won: false, beat: 0 };
  for (const phrase of phrases) {
    let current: readonly Action[] = [];
    for (const [index, action] of phrase.entries()) {
      const result = playAction(room, tracks, current, action);
      tracks = result.tracks;
      current = result.currentActions;
      final = { won: result.won, beat: index + 1 };
      if (result.won) return final;
    }
  }
  return final;
}
