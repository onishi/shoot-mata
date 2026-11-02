export type Action = 'up' | 'down' | 'left' | 'right' | 'wait';
export type Point = Readonly<{ x: number; y: number }>;

export type Room = Readonly<{
  width: number;
  height: number;
  phraseLength: number;
  start: Point;
  walls: ReadonlySet<string>;
  plates: readonly Point[];
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
};

export function keyOf(point: Point): string {
  return `${point.x},${point.y}`;
}

export function move(room: Room, point: Point, action: Action): Point {
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

export function playAction(
  room: Room,
  tracks: readonly (readonly Action[])[],
  currentActions: readonly Action[],
  action: Action,
): TurnResult {
  const nextActions = [...currentActions, action];
  if (nextActions.length > room.phraseLength) throw new Error('phrase is already complete');
  const beat = nextActions.length;
  const current = positionAfter(room, nextActions);
  const echoes = tracks.map((track) => positionAfter(room, track, beat));
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
  return tracks.map((track) => positionAfter(room, track, beat));
}
