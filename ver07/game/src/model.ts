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
  plates: readonly Point[];
  gate: Point;
  letter: Point;
  exit: Point;
  plateMode: "hold" | "transit";
  floor: ReadonlySet<string>;
  echoFloor: ReadonlySet<string>;
};

export type GameState = {
  screen: Screen;
  levelIndex: number;
  player: Point;
  ghosts: Ghost[];
  currentRecording: Action[];
  hasLetter: boolean;
  turn: number;
  lastEvent: "none" | "move" | "wait" | "blocked" | "commit" | "seal" | "won";
};

export type Ghost = {
  position: Point;
  recording: Action[];
  step: number;
  pulses: boolean[];
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
    plates: [{ x: 3, y: 3 }],
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
    echoFloor: new Set(),
  },
  {
    file: "FILE 02",
    name: "MOVING DEADLINE",
    objective: "The red seal will not hold. Reach the gate on the same beat.",
    winBody: "One passing moment was enough. The deadline is met.",
    width: 11,
    height: 7,
    start: { x: 1, y: 3 },
    plates: [{ x: 5, y: 1 }],
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
    echoFloor: new Set(),
  },
  {
    file: "FILE 03",
    name: "MISSING MINUTE",
    objective: "A blank beat still counts. Add SPACE so the passing echo meets the gate.",
    winBody: "The missing minute was filed exactly where it belonged.",
    width: 12,
    height: 7,
    start: { x: 1, y: 3 },
    plates: [{ x: 5, y: 1 }],
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
    echoFloor: new Set(),
  },
  {
    file: "FILE 04",
    name: "CARBON COPIES",
    objective: "File two echoes. Make both passing seals strike on the seventh beat.",
    winBody: "Two separate shifts agreed on a single moment.",
    width: 12,
    height: 7,
    start: { x: 1, y: 3 },
    plates: [{ x: 4, y: 1 }, { x: 6, y: 5 }],
    gate: { x: 8, y: 3 },
    letter: { x: 9, y: 3 },
    exit: { x: 10, y: 3 },
    plateMode: "transit",
    floor: floor(
      "            ",
      " .....      ",
      " .          ",
      " .......... ",
      " .          ",
      " .......    ",
      "            ",
    ),
    echoFloor: new Set(),
  },
  {
    file: "FILE 05",
    name: "AUTHORIZED COPY",
    objective: "Originals cannot cross blue copy paper. File the blocked route anyway.",
    winBody: "The duplicate reached the desk the original could not.",
    width: 12,
    height: 7,
    start: { x: 1, y: 3 },
    plates: [{ x: 6, y: 1 }],
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
    echoFloor: new Set(["3,1"]),
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
    ghosts: [],
    currentRecording: [],
    hasLetter: false,
    turn: 0,
    lastEvent: "none",
  };
}

export function isGateOpen(state: GameState): boolean {
  const selected = getLevel(state);
  return selected.plates.every((plate, plateIndex) => state.ghosts.some((ghost) => (
    selected.plateMode === "transit" ? ghost.pulses[plateIndex] : same(ghost.position, plate)
  )));
}

function tryStep(from: Point, action: Action, gateOpen: boolean, selected: Level, echo: boolean): Point {
  if (action === "wait") return copyPoint(from);
  const d = delta[action];
  const next = { x: from.x + d.x, y: from.y + d.y };
  if (!selected.floor.has(`${next.x},${next.y}`)) return copyPoint(from);
  if (!echo && selected.echoFloor.has(`${next.x},${next.y}`)) return copyPoint(from);
  if (same(next, selected.gate) && !gateOpen) return copyPoint(from);
  return next;
}

export function move(state: GameState, action: Action): GameState {
  if (state.screen !== "playing") return state;
  const selected = getLevel(state);

  const gateWasOpen = isGateOpen(state);
  const ghosts = state.ghosts.map((source) => {
    const previous = copyPoint(source.position);
    const position = source.step < source.recording.length
      ? tryStep(previous, source.recording[source.step], gateWasOpen, selected, true)
      : previous;
    const step = Math.min(source.recording.length, source.step + 1);
    const pulses = selected.plates.map((plate) => selected.plateMode === "transit"
      && same(position, plate)
      && !same(previous, plate)
      && step < source.recording.length);
    return { ...source, position, step, pulses };
  });
  const gateOpen = isGateOpen({ ...state, ghosts });
  const player = tryStep(state.player, action, gateOpen, selected, false);
  const moved = !same(player, state.player);
  const hasLetter = state.hasLetter || same(player, selected.letter);
  const won = hasLetter && same(player, selected.exit);

  return {
    ...state,
    screen: won ? "won" : state.screen,
    player,
    ghosts,
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
    ghosts: [
      ...state.ghosts.map((ghost) => ({
        position: copyPoint(selected.start),
        recording: [...ghost.recording],
        step: 0,
        pulses: selected.plates.map(() => false),
      })),
      {
        position: copyPoint(selected.start),
        recording: [...state.currentRecording],
        step: 0,
        pulses: selected.plates.map(() => false),
      },
    ],
    currentRecording: [],
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
