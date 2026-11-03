export type Point = { x: number; y: number };
export type Direction = "up" | "down" | "left" | "right";
export type Action = Direction | "wait";
export type Screen = "title" | "playing" | "paused" | "won";

export type Level = {
  file: string;
  name: string;
  objective: string;
  winBody: string;
  width: number;
  height: number;
  start: Point;
  plate: Point;
  gate: Point;
  letter: Point;
  exit: Point;
  plateMode: "hold" | "transit";
  floor: ReadonlySet<string>;
};

export type GameState = {
  screen: Screen;
  levelIndex: number;
  player: Point;
  ghost: Point | null;
  currentRecording: Action[];
  committedRecording: Action[];
  ghostStep: number;
  gatePulse: boolean;
  hasLetter: boolean;
  turn: number;
  lastEvent: "none" | "move" | "wait" | "blocked" | "commit" | "seal" | "won";
};

const floor = (...rows: string[]) => new Set(rows.flatMap((row, y) =>
  [...row].flatMap((cell, x) => cell === "." ? [`${x},${y}`] : []),
));

export const levels: readonly Level[] = [
  {
    file: "FILE 01",
    name: "DEAD LETTER",
    objective: "Leave an echo on the red seal. Carry the letter to the outbox.",
    winBody: "Your past shift held the line. The record is complete.",
    width: 11,
    height: 7,
    start: { x: 1, y: 3 },
    plate: { x: 3, y: 3 },
    gate: { x: 5, y: 3 },
    letter: { x: 7, y: 3 },
    exit: { x: 9, y: 3 },
    plateMode: "hold",
    floor: floor(
      "           ",
      "           ",
      " .... .... ",
      " ......... ",
      " .... .... ",
      "           ",
      "           ",
    ),
  },
  {
    file: "FILE 02",
    name: "MOVING DEADLINE",
    objective: "The red seal will not hold. Reach the gate on the same beat.",
    winBody: "One passing moment was enough. The deadline is met.",
    width: 11,
    height: 7,
    start: { x: 1, y: 3 },
    plate: { x: 5, y: 1 },
    gate: { x: 7, y: 3 },
    letter: { x: 8, y: 3 },
    exit: { x: 9, y: 3 },
    plateMode: "transit",
    floor: floor(
      "           ",
      " ......    ",
      " .         ",
      " ......... ",
      "           ",
      "           ",
      "           ",
    ),
  },
  {
    file: "FILE 03",
    name: "MISSING MINUTE",
    objective: "A blank beat still counts. Add SPACE so the passing echo meets the gate.",
    winBody: "The missing minute was filed exactly where it belonged.",
    width: 12,
    height: 7,
    start: { x: 1, y: 3 },
    plate: { x: 5, y: 1 },
    gate: { x: 8, y: 3 },
    letter: { x: 9, y: 3 },
    exit: { x: 10, y: 3 },
    plateMode: "transit",
    floor: floor(
      "            ",
      " ......     ",
      " .          ",
      " .......... ",
      "            ",
      "            ",
      "            ",
    ),
  },
] as const;

// Kept as a named export for small consumers that only need the introductory room.
export const level = levels[0];

const same = (a: Point | null, b: Point) => a !== null && a.x === b.x && a.y === b.y;

const delta: Record<Direction, Point> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const copyPoint = (point: Point): Point => ({ ...point });

export function getLevel(state: Pick<GameState, "levelIndex">): Level {
  return levels[state.levelIndex] ?? levels[0];
}

export function createGame(screen: Screen = "title", levelIndex = 0): GameState {
  const selected = levels[levelIndex] ?? levels[0];
  return {
    screen,
    levelIndex: levels.indexOf(selected),
    player: copyPoint(selected.start),
    ghost: null,
    currentRecording: [],
    committedRecording: [],
    ghostStep: 0,
    gatePulse: false,
    hasLetter: false,
    turn: 0,
    lastEvent: "none",
  };
}

export function isGateOpen(state: GameState): boolean {
  const selected = getLevel(state);
  if (selected.plateMode === "transit") return state.gatePulse;
  return same(state.ghost, selected.plate);
}

function tryStep(from: Point, action: Action, gateOpen: boolean, selected: Level): Point {
  if (action === "wait") return copyPoint(from);
  const d = delta[action];
  const next = { x: from.x + d.x, y: from.y + d.y };
  if (!selected.floor.has(`${next.x},${next.y}`)) return copyPoint(from);
  if (same(next, selected.gate) && !gateOpen) return copyPoint(from);
  return next;
}

export function move(state: GameState, action: Action): GameState {
  if (state.screen !== "playing") return state;
  const selected = getLevel(state);

  let ghost = state.ghost ? copyPoint(state.ghost) : null;
  const previousGhost = state.ghost ? copyPoint(state.ghost) : null;
  let ghostStep = state.ghostStep;
  if (ghost && ghostStep < state.committedRecording.length) {
    ghost = tryStep(ghost, state.committedRecording[ghostStep], isGateOpen({ ...state, ghost }), selected);
    ghostStep += 1;
  }

  const gatePulse = selected.plateMode === "transit"
    && same(ghost, selected.plate)
    && !same(previousGhost, selected.plate)
    && ghostStep < state.committedRecording.length;
  const gateOpen = isGateOpen({ ...state, ghost, ghostStep, gatePulse });
  const player = tryStep(state.player, action, gateOpen, selected);
  const moved = !same(player, state.player);
  const hasLetter = state.hasLetter || same(player, selected.letter);
  const won = hasLetter && same(player, selected.exit);

  return {
    ...state,
    screen: won ? "won" : state.screen,
    player,
    ghost,
    ghostStep,
    gatePulse,
    currentRecording: [...state.currentRecording, action],
    hasLetter,
    turn: state.turn + 1,
    lastEvent: won ? "won" : !state.hasLetter && hasLetter ? "seal" : action === "wait" ? "wait" : moved ? "move" : "blocked",
  };
}

export function commit(state: GameState): GameState {
  if (state.screen !== "playing" || state.currentRecording.length === 0) return state;
  const selected = getLevel(state);
  return {
    ...state,
    player: copyPoint(selected.start),
    ghost: copyPoint(selected.start),
    currentRecording: [],
    committedRecording: [...state.currentRecording],
    ghostStep: 0,
    gatePulse: false,
    hasLetter: false,
    turn: 0,
    lastEvent: "commit",
  };
}

export function start(state: GameState, levelIndex = 0): GameState {
  if (state.screen !== "title") return state;
  return createGame("playing", levelIndex);
}

export function continueAfterWin(state: GameState): GameState {
  if (state.screen !== "won") return state;
  const nextLevel = (state.levelIndex + 1) % levels.length;
  return createGame("playing", nextLevel);
}

export function restart(state: GameState): GameState {
  return createGame("playing", state.levelIndex);
}

export function togglePause(state: GameState): GameState {
  if (state.screen === "playing") return { ...state, screen: "paused" };
  if (state.screen === "paused") return { ...state, screen: "playing" };
  return state;
}
