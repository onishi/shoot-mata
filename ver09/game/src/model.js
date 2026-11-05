export const COLS = 16;
export const ROWS = 10;
export const MAX_FUEL = 24;
export const PHOSPHOR_TICKS = 20;

const point = (x, y) => Object.freeze({ x, y });
const mirror = (x, y, dx, dy, length) => Object.freeze({ x, y, dx, dy, length });

export const LEVELS = Object.freeze([
  Object.freeze({
    name: 'ASHEN VESTIBULE',
    playerStart: point(1, 8),
    wardenStart: point(13, 8),
    patrol: point(-1, 0),
    exit: point(14, 1),
    seeds: Object.freeze([point(4, 7), point(8, 3), point(12, 2)]),
    mirrors: Object.freeze([]),
    phosphors: Object.freeze([]),
    walls: Object.freeze([
      '3,2', '4,2', '5,2',
      '6,2', '6,3', '6,5', '6,6', '6,7',
      '9,1', '9,2',
      '8,5', '9,5', '11,5', '12,5', '13,5',
      '3,6', '3,7',
      '11,7', '12,7'
    ])
  }),
  Object.freeze({
    name: 'PRISM WALK',
    playerStart: point(1, 8),
    wardenStart: point(13, 8),
    patrol: point(-1, 0),
    exit: point(14, 1),
    seeds: Object.freeze([point(5, 2), point(9, 4), point(12, 2)]),
    mirrors: Object.freeze([mirror(5, 7, 0, -1, 6)]),
    phosphors: Object.freeze([]),
    walls: Object.freeze([
      '2,3', '3,3', '4,3',
      '7,1', '7,2', '7,3',
      '7,5', '7,6', '7,7',
      '9,6', '10,6', '11,6', '12,6',
      '11,3', '12,3', '13,3'
    ])
  }),
  Object.freeze({
    name: 'AFTERGLOW GALLERY',
    playerStart: point(1, 8),
    wardenStart: point(13, 8),
    patrol: point(-1, 0),
    exit: point(14, 1),
    seeds: Object.freeze([point(4, 2), point(8, 7), point(13, 4)]),
    mirrors: Object.freeze([]),
    phosphors: Object.freeze([
      point(2, 7), point(3, 6), point(4, 5), point(4, 4), point(4, 3),
      point(5, 7), point(6, 7), point(7, 7), point(8, 7),
      point(8, 6), point(8, 5), point(8, 4), point(8, 3), point(8, 2), point(9, 2),
      point(11, 2), point(12, 2), point(13, 3)
    ]),
    walls: Object.freeze([
      '2,4', '3,4',
      '6,1', '6,2', '6,3', '6,4', '6,5', '6,6',
      '10,3', '10,4', '10,5', '10,6', '10,7', '10,8',
      '12,5', '13,5', '14,5'
    ])
  })
]);

// M1 names remain exported for tests and tooling that inspect the first room.
export const PLAYER_START = LEVELS[0].playerStart;
export const WARDEN_START = LEVELS[0].wardenStart;
export const EXIT = LEVELS[0].exit;
export const SEEDS = LEVELS[0].seeds;

const copyPoint = (value) => ({ x: value.x, y: value.y });
const samePoint = (a, b) => a.x === b.x && a.y === b.y;
const keyOf = (value) => `${value.x},${value.y}`;

export function levelFor(stateOrIndex = 0) {
  const index = typeof stateOrIndex === 'number' ? stateOrIndex : stateOrIndex.levelIndex;
  return LEVELS[index] ?? LEVELS[0];
}

export function isWall(pointValue, stateOrIndex = 0) {
  const level = levelFor(stateOrIndex);
  return pointValue.x <= 0 || pointValue.y <= 0 || pointValue.x >= COLS - 1 || pointValue.y >= ROWS - 1 || level.walls.includes(keyOf(pointValue));
}

function roomState(levelIndex, phase = 'title') {
  const level = levelFor(levelIndex);
  return {
    phase,
    levelIndex,
    tick: 0,
    player: copyPoint(level.playerStart),
    warden: copyPoint(level.wardenStart),
    patrol: copyPoint(level.patrol),
    fuel: MAX_FUEL,
    brightRequested: false,
    seeds: level.seeds.map((seed) => ({ ...copyPoint(seed), collected: false })),
    phosphors: level.phosphors.map((tile) => ({ ...copyPoint(tile), charge: 0 })),
    lives: 3,
    event: phase === 'title' ? 'ready' : 'start'
  };
}

export function createGame(levelIndex = 0) {
  return roomState(levelIndex, 'title');
}

export function startGame(_state, levelIndex = 0) {
  return roomState(levelIndex, 'playing');
}

export function retryGame(state = createGame()) {
  return roomState(state.levelIndex ?? 0, 'playing');
}

export function advanceRoom(state) {
  if (state.phase !== 'won') return state;
  const nextIndex = state.levelIndex + 1;
  return nextIndex < LEVELS.length ? roomState(nextIndex, 'playing') : createGame(state.levelIndex);
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

export function directLightDistance(state, pointValue) {
  return Math.hypot(pointValue.x - state.player.x, pointValue.y - state.player.y);
}

function mirrorIsActive(state, mirrorValue) {
  return isBright(state) && directLightDistance(state, mirrorValue) <= 5.4;
}

export function activeMirrorBeams(state) {
  const level = levelFor(state);
  return level.mirrors.flatMap((mirrorValue) => {
    if (!mirrorIsActive(state, mirrorValue)) return [];
    const cells = [];
    for (let distance = 1; distance <= mirrorValue.length; distance += 1) {
      const beamPoint = {
        x: mirrorValue.x + mirrorValue.dx * distance,
        y: mirrorValue.y + mirrorValue.dy * distance
      };
      if (isWall(beamPoint, state)) break;
      cells.push(beamPoint);
    }
    return [{ mirror: mirrorValue, cells }];
  });
}

export function activePhosphors(state) {
  return state.phosphors?.filter((tile) => tile.charge > 0) ?? [];
}

export function isPointLit(state, pointValue) {
  const radius = isBright(state) ? 5.4 : 2.35;
  if (directLightDistance(state, pointValue) <= radius) return true;
  if (activeMirrorBeams(state).some((beam) => beam.cells.some((cell) => samePoint(cell, pointValue)))) return true;
  return activePhosphors(state).some((tile) => Math.hypot(pointValue.x - tile.x, pointValue.y - tile.y) <= 1.45);
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
  const level = levelFor(state);
  const lives = state.lives - 1;
  if (lives <= 0) {
    return { ...state, lives: 0, brightRequested: false, phase: 'lost', event: 'lost' };
  }
  return {
    ...state,
    lives,
    player: copyPoint(level.playerStart),
    warden: copyPoint(level.wardenStart),
    patrol: copyPoint(level.patrol),
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
  if (samePoint(arrived.player, levelFor(arrived).exit) && isExitOpen(arrived)) {
    return { ...arrived, phase: 'won', brightRequested: false, event: 'won' };
  }
  return arrived;
}

export function movePlayer(state, dx, dy) {
  if (state.phase !== 'playing' || Math.abs(dx) + Math.abs(dy) !== 1) return state;
  const target = { x: state.player.x + dx, y: state.player.y + dy };
  if (isWall(target, state)) return { ...state, event: 'wall' };
  return resolveArrival({ ...state, player: target, event: 'step' });
}

function validStep(state, origin, dx, dy) {
  const target = { x: origin.x + dx, y: origin.y + dy };
  return isWall(target, state) ? null : target;
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
    const target = validStep(state, state.warden, stepX, stepY);
    if (target) return target;
  }
  return copyPoint(state.warden);
}

function patrolStep(state) {
  const forward = validStep(state, state.warden, state.patrol.x, state.patrol.y);
  if (forward) return { point: forward, patrol: state.patrol };
  const reversed = { x: -state.patrol.x, y: -state.patrol.y };
  return {
    point: validStep(state, state.warden, reversed.x, reversed.y) ?? copyPoint(state.warden),
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

  next.phosphors = next.phosphors.map((tile) => ({
    ...tile,
    charge: wasBright && directLightDistance(state, tile) <= 5.4
      ? PHOSPHOR_TICKS
      : Math.max(0, tile.charge - 1)
  }));

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
