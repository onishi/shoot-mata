export type Point = { x: number; y: number };
export type Direction = "up" | "down" | "left" | "right";
export type Screen = "title" | "playing" | "paused" | "won";

export type GameState = {
  screen: Screen;
  player: Point;
  ghost: Point | null;
  currentRecording: Direction[];
  committedRecording: Direction[];
  ghostStep: number;
  hasLetter: boolean;
  turn: number;
  lastEvent: "none" | "move" | "blocked" | "commit" | "seal" | "won";
};

export const level = {
  width: 11,
  height: 7,
  start: { x: 1, y: 3 },
  plate: { x: 3, y: 3 },
  gate: { x: 5, y: 3 },
  letter: { x: 7, y: 3 },
  exit: { x: 9, y: 3 },
  floor: new Set([
    "1,3", "2,3", "3,3", "4,3", "5,3", "6,3", "7,3", "8,3", "9,3",
    "1,2", "2,2", "3,2", "4,2", "6,2", "7,2", "8,2", "9,2",
    "1,4", "2,4", "3,4", "4,4", "6,4", "7,4", "8,4", "9,4",
  ]),
} as const;

const same = (a: Point | null, b: Point) => a !== null && a.x === b.x && a.y === b.y;

const delta: Record<Direction, Point> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const copyPoint = (point: Point): Point => ({ ...point });

export function createGame(screen: Screen = "title"): GameState {
  return {
    screen,
    player: copyPoint(level.start),
    ghost: null,
    currentRecording: [],
    committedRecording: [],
    ghostStep: 0,
    hasLetter: false,
    turn: 0,
    lastEvent: "none",
  };
}

export function isGateOpen(state: GameState): boolean {
  return same(state.ghost, level.plate);
}

function tryStep(from: Point, direction: Direction, gateOpen: boolean): Point {
  const d = delta[direction];
  const next = { x: from.x + d.x, y: from.y + d.y };
  if (!level.floor.has(`${next.x},${next.y}`)) return copyPoint(from);
  if (same(next, level.gate) && !gateOpen) return copyPoint(from);
  return next;
}

export function move(state: GameState, direction: Direction): GameState {
  if (state.screen !== "playing") return state;

  let ghost = state.ghost ? copyPoint(state.ghost) : null;
  let ghostStep = state.ghostStep;
  if (ghost && ghostStep < state.committedRecording.length) {
    ghost = tryStep(ghost, state.committedRecording[ghostStep], isGateOpen({ ...state, ghost }));
    ghostStep += 1;
  }

  const gateOpen = same(ghost, level.plate);
  const player = tryStep(state.player, direction, gateOpen);
  const moved = !same(player, state.player);
  const hasLetter = state.hasLetter || same(player, level.letter);
  const won = hasLetter && same(player, level.exit);

  return {
    ...state,
    screen: won ? "won" : state.screen,
    player,
    ghost,
    ghostStep,
    currentRecording: [...state.currentRecording, direction],
    hasLetter,
    turn: state.turn + 1,
    lastEvent: won ? "won" : !state.hasLetter && hasLetter ? "seal" : moved ? "move" : "blocked",
  };
}

export function commit(state: GameState): GameState {
  if (state.screen !== "playing" || state.currentRecording.length === 0) return state;
  return {
    ...state,
    player: copyPoint(level.start),
    ghost: copyPoint(level.start),
    currentRecording: [],
    committedRecording: [...state.currentRecording],
    ghostStep: 0,
    hasLetter: false,
    turn: 0,
    lastEvent: "commit",
  };
}

export function start(state: GameState): GameState {
  if (state.screen !== "title") return state;
  return createGame("playing");
}

export function togglePause(state: GameState): GameState {
  if (state.screen === "playing") return { ...state, screen: "paused" };
  if (state.screen === "paused") return { ...state, screen: "playing" };
  return state;
}
