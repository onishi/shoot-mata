export type Action = 'up' | 'down' | 'left' | 'right' | 'wait';
export type Point = Readonly<{ x: number; y: number }>;

export type BeatDoor = Readonly<{
  point: Point;
  trigger: Point;
}>;

export type Room = Readonly<{
  width: number;
  height: number;
  phraseLength: number;
  start: Point;
  walls: ReadonlySet<string>;
  plates: readonly Point[];
  doors: readonly BeatDoor[];
  inversionFloors: readonly Point[];
  silenceFloors: readonly Point[];
}>;

export type TurnResult = Readonly<{
  current: Point;
  echoes: readonly Point[];
  beat: number;
  tracks: readonly (readonly Action[])[];
  currentActions: readonly Action[];
  won: boolean;
  phraseCommitted: boolean;
}>;

export const FIRST_CHORD: Room = {
  width: 9,
  height: 7,
  phraseLength: 8,
  start: { x: 4, y: 5 },
  walls: new Set([
    '0,0', '1,0', '2,0', '3,0', '4,0', '5,0', '6,0', '7,0', '8,0',
    '0,1', '8,1', '0,2', '2,2', '6,2', '8,2', '0,3', '8,3',
    '0,4', '8,4', '0,5', '1,5', '7,5', '8,5', '0,6', '1,6', '2,6', '3,6',
    '4,6', '5,6', '6,6', '7,6', '8,6',
  ]),
  plates: [{ x: 4, y: 1 }, { x: 1, y: 3 }, { x: 7, y: 3 }],
  doors: [],
  inversionFloors: [],
  silenceFloors: [],
};

export const HELD_NOTE: Room = {
  width: 9,
  height: 7,
  phraseLength: 8,
  start: { x: 4, y: 5 },
  walls: new Set([
    '0,0', '1,0', '2,0', '3,0', '4,0', '5,0', '6,0', '7,0', '8,0',
    '0,1', '8,1', '0,2', '8,2', '0,3', '2,3', '3,3', '5,3', '6,3', '7,3', '8,3',
    '0,4', '8,4', '0,5', '8,5', '0,6', '1,6', '2,6', '3,6', '4,6', '5,6', '6,6', '7,6', '8,6',
  ]),
  plates: [{ x: 1, y: 3 }, { x: 4, y: 1 }, { x: 7, y: 5 }],
  doors: [{ point: { x: 4, y: 3 }, trigger: { x: 1, y: 3 } }],
  inversionFloors: [],
  silenceFloors: [],
};

/** The trigger voice arrives early and must sustain its note until a later voice reaches the door. */
export const LONG_TONE: Room = {
  width: 9,
  height: 7,
  phraseLength: 8,
  start: { x: 4, y: 5 },
  walls: new Set([
    '0,0', '1,0', '2,0', '3,0', '4,0', '5,0', '6,0', '7,0', '8,0',
    '0,1', '8,1', '0,2', '1,2', '2,2', '3,2', '5,2', '6,2', '7,2', '8,2',
    '0,3', '8,3', '0,4', '8,4', '0,5', '8,5',
    '0,6', '1,6', '2,6', '3,6', '4,6', '5,6', '6,6', '7,6', '8,6',
  ]),
  plates: [{ x: 2, y: 4 }, { x: 4, y: 1 }, { x: 7, y: 5 }],
  doors: [{ point: { x: 4, y: 2 }, trigger: { x: 2, y: 4 } }],
  inversionFloors: [],
  silenceFloors: [],
};

/** A timing room: one voice holds the origin while the last must take an eight-beat pocket route. */
export const FINAL_CADENCE: Room = {
  width: 9,
  height: 7,
  phraseLength: 8,
  start: { x: 4, y: 5 },
  walls: new Set([
    '0,0', '1,0', '2,0', '3,0', '4,0', '5,0', '6,0', '7,0', '8,0',
    '0,1', '8,1', '0,2', '6,2', '8,2', '0,3', '7,3', '8,3',
    '0,4', '8,4', '0,5', '8,5',
    '0,6', '1,6', '2,6', '3,6', '4,6', '5,6', '6,6', '7,6', '8,6',
  ]),
  plates: [{ x: 4, y: 5 }, { x: 1, y: 2 }, { x: 7, y: 2 }],
  doors: [],
  inversionFloors: [],
  silenceFloors: [],
};

/** The first room where a recorded voice diverges: after crossing glass, replayed left/right inputs invert. */
export const MIRROR_ENTRY: Room = {
  width: 9,
  height: 7,
  phraseLength: 8,
  start: { x: 4, y: 5 },
  walls: new Set([
    '0,0', '1,0', '2,0', '3,0', '4,0', '5,0', '6,0', '7,0', '8,0',
    '0,1', '1,1', '2,1', '6,1', '7,1', '8,1',
    '0,2', '2,2', '6,2', '8,2',
    '0,3', '8,3', '0,4', '1,4', '7,4', '8,4',
    '0,5', '8,5',
    '0,6', '1,6', '2,6', '3,6', '4,6', '5,6', '6,6', '7,6', '8,6',
  ]),
  plates: [{ x: 4, y: 3 }, { x: 1, y: 5 }, { x: 7, y: 5 }],
  doors: [],
  inversionFloors: [{ x: 5, y: 5 }],
  silenceFloors: [],
};

/** Two glass crossings: replay inverts between them, then restores its recorded horizontal direction. */
export const GLASS_RETURN: Room = {
  width: 9,
  height: 7,
  phraseLength: 8,
  start: { x: 4, y: 5 },
  walls: new Set([
    '0,0', '1,0', '2,0', '3,0', '4,0', '5,0', '6,0', '7,0', '8,0',
    '0,1', '1,1', '2,1', '6,1', '7,1', '8,1',
    '0,2', '2,2', '6,2', '8,2',
    '0,3', '8,3', '0,4', '1,4', '7,4', '8,4',
    '0,5', '8,5',
    '0,6', '1,6', '2,6', '3,6', '4,6', '5,6', '6,6', '7,6', '8,6',
  ]),
  plates: [{ x: 5, y: 3 }, { x: 1, y: 5 }, { x: 7, y: 5 }],
  doors: [],
  inversionFloors: [{ x: 5, y: 5 }, { x: 4, y: 4 }],
  silenceFloors: [],
};

/** Replay loses exactly the input after entering the quiet band, shifting the recorded route by one cell. */
export const REST_MARK: Room = {
  width: 9,
  height: 7,
  phraseLength: 8,
  start: { x: 4, y: 5 },
  walls: new Set([
    '0,0', '1,0', '2,0', '3,0', '4,0', '5,0', '6,0', '7,0', '8,0',
    '0,1', '1,1', '2,1', '6,1', '7,1', '8,1',
    '0,2', '2,2', '6,2', '8,2',
    '0,3', '8,3', '0,4', '1,4', '7,4', '8,4',
    '0,5', '8,5',
    '0,6', '1,6', '2,6', '3,6', '4,6', '5,6', '6,6', '7,6', '8,6',
  ]),
  plates: [{ x: 5, y: 3 }, { x: 1, y: 5 }, { x: 7, y: 5 }],
  doors: [],
  inversionFloors: [],
  silenceFloors: [{ x: 4, y: 4 }],
};

/** Glass changes horizontal meaning while silence removes one transformed input from the replay. */
export const NEGATIVE_SPACE: Room = {
  width: 9,
  height: 7,
  phraseLength: 8,
  start: { x: 4, y: 5 },
  walls: new Set([
    '0,0', '1,0', '2,0', '3,0', '4,0', '5,0', '6,0', '7,0', '8,0',
    '0,1', '1,1', '7,1', '8,1',
    '0,2', '8,2', '0,3', '8,3', '0,4', '8,4', '0,5', '8,5',
    '0,6', '1,6', '2,6', '3,6', '4,6', '5,6', '6,6', '7,6', '8,6',
  ]),
  plates: [{ x: 3, y: 3 }, { x: 1, y: 5 }, { x: 7, y: 5 }],
  doors: [],
  inversionFloors: [{ x: 5, y: 5 }],
  silenceFloors: [{ x: 4, y: 4 }],
};

/** A compressed measure: two routes leave only one spare beat and the longest uses all six. */
export const SHORT_MEASURE: Room = {
  width: 9,
  height: 7,
  phraseLength: 6,
  start: { x: 4, y: 5 },
  walls: new Set([
    '0,0', '1,0', '2,0', '3,0', '4,0', '5,0', '6,0', '7,0', '8,0',
    '0,1', '1,1', '2,1', '3,1', '5,1', '6,1', '7,1', '8,1',
    '0,2', '8,2', '0,3', '8,3', '0,4', '8,4', '0,5', '8,5',
    '0,6', '1,6', '2,6', '3,6', '4,6', '5,6', '6,6', '7,6', '8,6',
  ]),
  plates: [{ x: 1, y: 3 }, { x: 4, y: 1 }, { x: 7, y: 2 }],
  doors: [],
  inversionFloors: [],
  silenceFloors: [],
};

/** An expanded measure: every route splits its spare time into two held-note intervals. */
export const LONG_MEASURE: Room = {
  width: 9,
  height: 7,
  phraseLength: 10,
  start: { x: 4, y: 5 },
  walls: new Set([
    '0,0', '1,0', '2,0', '3,0', '4,0', '5,0', '6,0', '7,0', '8,0',
    '0,1', '8,1', '0,2', '6,2', '8,2', '0,3', '7,3', '8,3',
    '0,4', '8,4', '0,5', '8,5',
    '0,6', '1,6', '2,6', '3,6', '4,6', '5,6', '6,6', '7,6', '8,6',
  ]),
  plates: [{ x: 1, y: 2 }, { x: 4, y: 1 }, { x: 7, y: 2 }],
  doors: [],
  inversionFloors: [],
  silenceFloors: [],
};

/** A six-beat gate: the crossing voice must spend its two spare beats before the trigger arrives. */
export const SHIFTED_GATE: Room = {
  width: 9,
  height: 7,
  phraseLength: 6,
  start: { x: 4, y: 5 },
  walls: new Set([
    '0,0', '1,0', '2,0', '3,0', '4,0', '5,0', '6,0', '7,0', '8,0',
    '0,1', '8,1', '0,2', '8,2',
    '0,3', '1,3', '2,3', '3,3', '5,3', '6,3', '7,3', '8,3',
    '0,4', '8,4', '0,5', '8,5',
    '0,6', '1,6', '2,6', '3,6', '4,6', '5,6', '6,6', '7,6', '8,6',
  ]),
  plates: [{ x: 1, y: 4 }, { x: 4, y: 1 }, { x: 7, y: 4 }],
  doors: [{ point: { x: 4, y: 3 }, trigger: { x: 1, y: 4 } }],
  inversionFloors: [],
  silenceFloors: [],
};

export function keyOf(point: Point): string {
  return `${point.x},${point.y}`;
}

function intendedMove(room: Room, point: Point, action: Action): Point {
  const delta: Record<Action, Point> = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
    wait: { x: 0, y: 0 },
  };
  const d = delta[action];
  const next = { x: point.x + d.x, y: point.y + d.y };
  if (next.x < 0 || next.y < 0 || next.x >= room.width || next.y >= room.height || room.walls.has(keyOf(next))) {
    return point;
  }
  return next;
}

export function move(room: Room, point: Point, action: Action): Point {
  const next = intendedMove(room, point, action);
  return room.doors.some((door) => keyOf(door.point) === keyOf(next)) ? point : next;
}

export function positionAfter(room: Room, actions: readonly Action[], count = actions.length): Point {
  let point = room.start;
  for (const action of actions.slice(0, count)) point = move(room, point, action);
  return point;
}

export function occupiesAllPlates(room: Room, points: readonly Point[]): boolean {
  if (points.length < room.plates.length) return false;
  const occupied = new Set(points.map(keyOf));
  return room.plates.every((plate) => occupied.has(keyOf(plate)));
}

/** Resolve every performer together so a trigger arrival can open a door on the same beat. */
export function ensemblePositions(
  room: Room,
  phrases: readonly (readonly Action[])[],
  beat: number,
  livePhraseIndex: number | null = null,
): Point[] {
  let points = phrases.map(() => room.start);
  const inverted = phrases.map(() => false);
  const silencePending = phrases.map(() => false);
  for (let step = 0; step < beat; step += 1) {
    const pointsBeforeStep = points;
    const intents = points.map((point, index) => {
      const recorded = phrases[index]?.[step] ?? 'wait';
      const isReplay = index !== livePhraseIndex;
      const transformed = isReplay && inverted[index]
        ? recorded === 'left' ? 'right' : recorded === 'right' ? 'left' : recorded
        : recorded;
      const action = isReplay && silencePending[index] ? 'wait' : transformed;
      if (isReplay && silencePending[index]) silencePending[index] = false;
      return intendedMove(room, point, action);
    });
    points = intents.map((intent, index) => {
      const door = room.doors.find((candidate) => keyOf(candidate.point) === keyOf(intent));
      if (!door) return intent;
      const openedByAnother = intents.some(
        (other, otherIndex) => otherIndex !== index && keyOf(other) === keyOf(door.trigger),
      );
      return openedByAnother ? intent : points[index]!;
    });
    points.forEach((point, index) => {
      if (index === livePhraseIndex) return;
      const enteredSilence = keyOf(point) !== keyOf(pointsBeforeStep[index]!)
        && room.silenceFloors.some((floor) => keyOf(floor) === keyOf(point));
      if (enteredSilence) silencePending[index] = true;
      const enteredInversion = keyOf(point) !== keyOf(pointsBeforeStep[index]!)
        && room.inversionFloors.some((floor) => keyOf(floor) === keyOf(point));
      if (enteredInversion) inverted[index] = !inverted[index];
    });
  }
  return points;
}

export function playAction(
  room: Room,
  tracks: readonly (readonly Action[])[],
  currentActions: readonly Action[],
  action: Action,
): TurnResult {
  const nextActions = [...currentActions, action];
  if (nextActions.length > room.phraseLength) throw new Error('phrase is already complete');
  const beat = nextActions.length;
  const positions = ensemblePositions(room, [...tracks, nextActions], beat, tracks.length);
  const current = positions.at(-1) ?? room.start;
  const echoes = positions.slice(0, -1);
  const won = occupiesAllPlates(room, [...echoes, current]);
  const phraseCommitted = beat === room.phraseLength && !won;
  const nextTracks = phraseCommitted ? [...tracks, nextActions].slice(-2) : tracks;
  return {
    current,
    echoes,
    beat: phraseCommitted ? 0 : beat,
    tracks: nextTracks,
    currentActions: phraseCommitted ? [] : nextActions,
    won,
    phraseCommitted,
  };
}

export function replayPositions(room: Room, tracks: readonly (readonly Action[])[], beat: number): Point[] {
  return ensemblePositions(room, tracks, beat);
}
