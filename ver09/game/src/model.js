export const COLS = 16;
export const ROWS = 10;
export const MAX_FUEL = 24;
export const PLAYER_START = Object.freeze({ x: 1, y: 8 });
export const WARDEN_START = Object.freeze({ x: 13, y: 8 });
export const EXIT = Object.freeze({ x: 14, y: 1 });
export const SEEDS = Object.freeze([
  Object.freeze({ x: 4, y: 7 }),
  Object.freeze({ x: 8, y: 3 }),
  Object.freeze({ x: 12, y: 2 })
]);

const INNER_WALLS = new Set([
  '3,2', '4,2', '5,2',
  '6,2', '6,3', '6,5', '6,6', '6,7',
  '9,1', '9,2',
  '8,5', '9,5', '11,5', '12,5', '13,5',
  '3,6', '3,7',
  '11,7', '12,7'
]);

const copyPoint = (point) => ({ x: point.x, y: point.y });
const samePoint = (a, b) => a.x === b.x && a.y === b.y;
const keyOf = (point) => `${point.x},${point.y}`;

export function isWall(point) {
  return point.x <= 0 || point.y <= 0 || point.x >= COLS - 1 || point.y >= ROWS - 1 || INNER_WALLS.has(keyOf(point));
}

export function createGame() {
  return {
    phase: 'title',
    tick: 0,
    player: copyPoint(PLAYER_START),
    warden: copyPoint(WARDEN_START),
    patrol: { x: -1, y: 0 },
    fuel: MAX_FUEL,
    brightRequested: false,
    seeds: SEEDS.map((seed) => ({ ...copyPoint(seed), collected: false })),
    lives: 3,
    event: 'ready'
  };
}

export function startGame(state) {
  const next = createGame();
  next.phase = 'playing';
  next.event = 'start';
  return next;
}

export function retryGame() {
  return startGame(createGame());
}

export function isBright(state) {
  return state.phase === 'playing' && state.brightRequested && state.fuel > 0;
}

export function collectedCount(state) {
  return state.seeds.filter((seed) => seed.collected).length;
}

export function isExitOpen(state) {
  return collectedCount(state) === state.seeds.length;
}

export function setBright(state, requested) {
  if (state.phase !== 'playing') return state;
  return { ...state, brightRequested: requested && state.fuel > 0, event: requested ? 'light-up' : 'light-down' };
}

export function togglePause(state) {
  if (state.phase === 'playing') return { ...state, phase: 'paused', brightRequested: false, event: 'pause' };
  if (state.phase === 'paused') return { ...state, phase: 'playing', event: 'resume' };
  return state;
}

function resolveHit(state) {
  const lives = state.lives - 1;
  if (lives <= 0) {
    return { ...state, lives: 0, brightRequested: false, phase: 'lost', event: 'lost' };
  }
  return {
    ...state,
    lives,
    player: copyPoint(PLAYER_START),
    warden: copyPoint(WARDEN_START),
    patrol: { x: -1, y: 0 },
    fuel: MAX_FUEL,
    brightRequested: false,
    event: 'hit'
  };
}

function resolveArrival(state) {
  if (samePoint(state.player, state.warden)) return resolveHit(state);

  let event = state.event;
  const seeds = state.seeds.map((seed) => {
    if (!seed.collected && isBright(state) && samePoint(seed, state.player)) {
      event = 'seed';
      return { ...seed, collected: true };
    }
    return seed;
  });
  const arrived = { ...state, seeds, event };
  if (samePoint(arrived.player, EXIT) && isExitOpen(arrived)) {
    return { ...arrived, phase: 'won', brightRequested: false, event: 'won' };
  }
  return arrived;
}

export function movePlayer(state, dx, dy) {
  if (state.phase !== 'playing' || Math.abs(dx) + Math.abs(dy) !== 1) return state;
  const target = { x: state.player.x + dx, y: state.player.y + dy };
  if (isWall(target)) return { ...state, event: 'wall' };
  return resolveArrival({ ...state, player: target, event: 'step' });
}

function validStep(origin, dx, dy) {
  const target = { x: origin.x + dx, y: origin.y + dy };
  return isWall(target) ? null : target;
}

function chaseStep(state) {
  const dx = Math.sign(state.player.x - state.warden.x);
  const dy = Math.sign(state.player.y - state.warden.y);
  const horizontalFirst = state.tick % 8 === 0;
  const candidates = horizontalFirst
    ? [[dx, 0], [0, dy], [-dx, 0], [0, -dy]]
    : [[0, dy], [dx, 0], [0, -dy], [-dx, 0]];
  for (const [stepX, stepY] of candidates) {
    if (stepX === 0 && stepY === 0) continue;
    const target = validStep(state.warden, stepX, stepY);
    if (target) return target;
  }
  return copyPoint(state.warden);
}

function patrolStep(state) {
  const forward = validStep(state.warden, state.patrol.x, state.patrol.y);
  if (forward) return { point: forward, patrol: state.patrol };
  const reversed = { x: -state.patrol.x, y: -state.patrol.y };
  return {
    point: validStep(state.warden, reversed.x, reversed.y) ?? copyPoint(state.warden),
    patrol: reversed
  };
}

export function tickGame(state) {
  if (state.phase !== 'playing') return state;
  const wasBright = isBright(state);
  const fuel = wasBright ? Math.max(0, state.fuel - 1) : Math.min(MAX_FUEL, state.fuel + 1);
  const brightRequested = wasBright && fuel > 0;
  let next = {
    ...state,
    tick: state.tick + 1,
    fuel,
    brightRequested,
    event: fuel === 0 && wasBright ? 'empty' : 'tick'
  };

  if (next.tick % 4 === 0) {
    if (wasBright) {
      next = { ...next, warden: chaseStep(next), event: 'chase' };
    } else {
      const patrol = patrolStep(next);
      next = { ...next, warden: patrol.point, patrol: patrol.patrol, event: 'patrol' };
    }
  }

  if (samePoint(next.player, next.warden)) return resolveHit(next);
  return next;
}

export function forceState(state, patch) {
  return { ...state, ...patch };
}
