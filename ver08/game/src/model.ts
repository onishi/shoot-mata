export const WIDTH = 20;
export const HEIGHT = 14;

export interface LevelDefinition {
  id: string;
  name: string;
  goal: number;
  player: Point;
  moths: readonly Moth[];
  clothPatches?: readonly ClothPatch[];
  flashNeedle?: FlashNeedleDefinition;
}

export interface ClothPatch {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FlashNeedleDefinition {
  columns: readonly number[];
  cycleTicks: number;
  warningTicks: number;
}

export interface FlashNeedleState {
  column: number;
  phase: "dormant" | "warning" | "active";
  ticksUntilStrike: number;
}

export const LEVELS: readonly LevelDefinition[] = [
  {
    id: "first-light",
    name: "FIRST LIGHT",
    goal: 62,
    player: { x: 0, y: 7 },
    moths: [{ x: 13, y: 6, dx: -1, dy: 1 }],
  },
  {
    id: "crossed-shuttles",
    name: "CROSSED SHUTTLES",
    goal: 64,
    player: { x: 0, y: 7 },
    moths: [
      { x: 14, y: 4, dx: -1, dy: 1 },
      { x: 6, y: 9, dx: 1, dy: -1 },
    ],
  },
  {
    id: "looms-eye",
    name: "LOOM'S EYE",
    goal: 68,
    player: { x: 0, y: 7 },
    moths: [{ x: 14, y: 3, dx: -1, dy: 1 }],
    clothPatches: [{ x: 8, y: 5, width: 4, height: 4 }],
  },
  {
    id: "flash-needle",
    name: "FLASH NEEDLE",
    goal: 66,
    player: { x: 0, y: 7 },
    moths: [{ x: 14, y: 3, dx: -1, dy: 1 }],
    flashNeedle: { columns: [5, 14], cycleTicks: 10, warningTicks: 3 },
  },
];

export type Screen = "title" | "playing" | "paused" | "won" | "lost";
export type Direction = "up" | "down" | "left" | "right";
export interface Point { x: number; y: number }
export interface Moth extends Point { dx: -1 | 1; dy: -1 | 1 }
export interface GameState {
  screen: Screen;
  levelIndex: number;
  player: Point;
  anchor: Point;
  cloth: boolean[];
  trail: Point[];
  moths: Moth[];
  spools: number;
  repaired: number;
  tick: number;
  lastEvent: "none" | "move" | "stitch" | "claim" | "cut" | "blocked" | "win";
}

const keyOf = ({ x, y }: Point) => y * WIDTH + x;
const pointOf = (index: number): Point => ({ x: index % WIDTH, y: Math.floor(index / WIDTH) });
const same = (a: Point, b: Point) => a.x === b.x && a.y === b.y;
const inside = ({ x, y }: Point) => x >= 0 && x < WIDTH && y >= 0 && y < HEIGHT;

function initialCloth(level: LevelDefinition): boolean[] {
  return Array.from({ length: WIDTH * HEIGHT }, (_, index) => {
    const { x, y } = pointOf(index);
    const selvage = x === 0 || y === 0 || x === WIDTH - 1 || y === HEIGHT - 1;
    const patch = level.clothPatches?.some((area) => (
      x >= area.x && x < area.x + area.width && y >= area.y && y < area.y + area.height
    ));
    return selvage || patch === true;
  });
}

function repairedPercent(cloth: readonly boolean[]): number {
  return Math.floor((cloth.filter(Boolean).length / cloth.length) * 100);
}

export function levelFor(state: Pick<GameState, "levelIndex">): LevelDefinition {
  return LEVELS[state.levelIndex] ?? LEVELS[0];
}

export function flashNeedleFor(state: Pick<GameState, "levelIndex" | "tick">): FlashNeedleState | null {
  const definition = levelFor(state).flashNeedle;
  if (!definition || definition.columns.length === 0) return null;
  const phaseTick = state.tick % definition.cycleTicks;
  const strikeTick = definition.cycleTicks - 1;
  const warningStart = strikeTick - definition.warningTicks;
  const columnIndex = Math.floor(state.tick / definition.cycleTicks) % definition.columns.length;
  return {
    column: definition.columns[columnIndex],
    phase: phaseTick === strikeTick ? "active" : phaseTick >= warningStart ? "warning" : "dormant",
    ticksUntilStrike: (strikeTick - phaseTick + definition.cycleTicks) % definition.cycleTicks,
  };
}

export function createGame(levelIndex = 0): GameState {
  const safeLevelIndex = Math.max(0, Math.min(levelIndex, LEVELS.length - 1));
  const level = LEVELS[safeLevelIndex];
  const cloth = initialCloth(level);
  return {
    screen: "title",
    levelIndex: safeLevelIndex,
    player: { ...level.player },
    anchor: { ...level.player },
    cloth,
    trail: [],
    moths: level.moths.map((moth) => ({ ...moth })),
    spools: 3,
    repaired: repairedPercent(cloth),
    tick: 0,
    lastEvent: "none",
  };
}

export function start(state: GameState, levelIndex = 0): GameState {
  return state.screen === "title" ? { ...createGame(levelIndex), screen: "playing" } : state;
}

export function restart(state?: Pick<GameState, "levelIndex">): GameState {
  return { ...createGame(state?.levelIndex ?? 0), screen: "playing" };
}

export function continueAfterWin(state: GameState): GameState {
  if (state.screen !== "won") return state;
  const nextLevel = state.levelIndex + 1;
  return nextLevel < LEVELS.length
    ? { ...createGame(nextLevel), screen: "playing" }
    : createGame(0);
}

export function togglePause(state: GameState): GameState {
  if (state.screen === "playing") return { ...state, screen: "paused" };
  if (state.screen === "paused") return { ...state, screen: "playing" };
  return state;
}

function nextPoint(from: Point, direction: Direction): Point {
  const delta: Record<Direction, Point> = {
    up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 },
  };
  return { x: from.x + delta[direction].x, y: from.y + delta[direction].y };
}

function claimEnclosed(state: GameState, boundary: readonly Point[]): { cloth: boolean[]; repaired: number } {
  const cloth = [...state.cloth];
  boundary.forEach((point) => { cloth[keyOf(point)] = true; });
  const visited = new Set<number>();
  const components: number[][] = [];
  for (let index = 0; index < cloth.length; index += 1) {
    if (cloth[index] || visited.has(index)) continue;
    const component: number[] = [];
    const queue = [index];
    visited.add(index);
    while (queue.length > 0) {
      const current = queue.shift()!;
      component.push(current);
      const point = pointOf(current);
      for (const direction of ["up", "down", "left", "right"] as const) {
        const neighbor = nextPoint(point, direction);
        const key = keyOf(neighbor);
        if (inside(neighbor) && !cloth[key] && !visited.has(key)) {
          visited.add(key); queue.push(key);
        }
      }
    }
    components.push(component);
  }
  const occupied = new Set(state.moths.map(keyOf));
  components.forEach((component) => {
    if (!component.some((cell) => occupied.has(cell))) {
      component.forEach((cell) => { cloth[cell] = true; });
    }
  });
  return { cloth, repaired: repairedPercent(cloth) };
}

export function movePlayer(state: GameState, direction: Direction, stitching: boolean): GameState {
  if (state.screen !== "playing") return state;
  const next = nextPoint(state.player, direction);
  if (!inside(next)) return { ...state, lastEvent: "blocked" };
  const onCloth = state.cloth[keyOf(next)];
  const drawing = state.trail.length > 0;
  if (!onCloth && !drawing && !stitching) return { ...state, lastEvent: "blocked" };
  if (drawing && state.trail.some((point) => same(point, next))) return { ...state, lastEvent: "blocked" };
  if (!drawing && onCloth) return { ...state, player: next, anchor: next, lastEvent: "move" };
  if (!onCloth) {
    const extended = { ...state, player: next, trail: [...state.trail, next], lastEvent: "stitch" as const };
    const flashNeedle = flashNeedleFor(state);
    const struck = flashNeedle?.phase === "active" && flashNeedle.column === next.x;
    return state.moths.some((moth) => same(moth, next)) || struck ? cutTrail(extended) : extended;
  }
  if (drawing) {
    const claimed = claimEnclosed(state, state.trail);
    const won = claimed.repaired >= levelFor(state).goal;
    return {
      ...state,
      player: next,
      anchor: next,
      trail: [],
      cloth: claimed.cloth,
      repaired: claimed.repaired,
      screen: won ? "won" : "playing",
      lastEvent: won ? "win" : "claim",
    };
  }
  return state;
}

function cutTrail(state: GameState): GameState {
  const spools = state.spools - 1;
  return {
    ...state,
    player: state.anchor,
    trail: [],
    spools,
    screen: spools <= 0 ? "lost" : "playing",
    lastEvent: "cut",
  };
}

export function advanceMoths(state: GameState): GameState {
  if (state.screen !== "playing") return state;
  const trailKeys = new Set(state.trail.map(keyOf));
  let hit = false;
  const moths = state.moths.map((moth): Moth => {
    let dx = moth.dx;
    let dy = moth.dy;
    let candidate = { x: moth.x + dx, y: moth.y + dy };
    const blockedX = !inside({ x: candidate.x, y: moth.y }) || state.cloth[keyOf({ x: candidate.x, y: moth.y })];
    const blockedY = !inside({ x: moth.x, y: candidate.y }) || state.cloth[keyOf({ x: moth.x, y: candidate.y })];
    if (blockedX) dx = dx === 1 ? -1 : 1;
    if (blockedY) dy = dy === 1 ? -1 : 1;
    candidate = { x: moth.x + dx, y: moth.y + dy };
    if (state.cloth[keyOf(candidate)]) candidate = { x: moth.x, y: moth.y };
    if (trailKeys.has(keyOf(candidate))) hit = true;
    return { ...candidate, dx, dy };
  });
  const advanced = { ...state, moths, tick: state.tick + 1 };
  const flashNeedle = flashNeedleFor(advanced);
  if (flashNeedle?.phase === "active" && state.trail.some((point) => point.x === flashNeedle.column)) hit = true;
  return hit ? cutTrail(advanced) : advanced;
}

export function withScenario(state: GameState, patch: Partial<GameState>): GameState {
  return { ...state, ...patch };
}
