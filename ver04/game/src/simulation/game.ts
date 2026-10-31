import { clamp, distanceSq, pointInPolygon } from '../core/math';
import { HEIGHT, SCALE, TICK_RATE, WIDTH, type Bullet, type Enemy, type GameEvent, type GameState, type InputFrame, type Point } from '../core/types';
import { findLoopCandidate, shotCrossedTrail, shouldAddTrailPoint } from './trail';

const PLAYER_SPEED = Math.round(320 * SCALE / TICK_RATE);
const TRAIL_LIFETIME = Math.round(3.2 * TICK_RATE);
const PLAYER_RADIUS = 13;
export const PLAYGROUND_DURATION_TICKS = 180 * TICK_RATE;

interface Encounter {
  tick: number;
  kind: Enemy['kind'];
  x: number;
  y: number;
  health: number;
  amplitude: number;
  lifetime: number;
}

// Three minutes of escalating, overlapping pressure. Values are rules data rather
// than render data so the same encounter can be replayed headlessly.
const ENCOUNTERS: Encounter[] = [
  { tick: 0, kind: 'hauler', x: 1010, y: 360, health: 1100, amplitude: 48, lifetime: 5400 },
  { tick: 900, kind: 'skiff', x: 920, y: 190, health: 180, amplitude: 90, lifetime: 2700 },
  { tick: 2100, kind: 'skiff', x: 960, y: 530, health: 220, amplitude: 72, lifetime: 3000 },
  { tick: 4200, kind: 'hauler', x: 1030, y: 300, health: 1400, amplitude: 74, lifetime: 5100 },
  { tick: 5100, kind: 'skiff', x: 900, y: 520, health: 260, amplitude: 115, lifetime: 3000 },
  { tick: 6900, kind: 'skiff', x: 950, y: 180, health: 280, amplitude: 105, lifetime: 3300 },
  { tick: 8400, kind: 'hauler', x: 1000, y: 430, health: 1650, amplitude: 96, lifetime: 5400 },
  { tick: 9900, kind: 'skiff', x: 930, y: 215, health: 320, amplitude: 125, lifetime: 3300 },
  { tick: 11400, kind: 'skiff', x: 970, y: 500, health: 340, amplitude: 120, lifetime: 3600 },
  { tick: 12600, kind: 'hauler', x: 1035, y: 350, health: 1900, amplitude: 118, lifetime: 5700 },
  { tick: 14400, kind: 'skiff', x: 900, y: 170, health: 380, amplitude: 145, lifetime: 3900 },
  { tick: 15900, kind: 'skiff', x: 950, y: 535, health: 400, amplitude: 135, lifetime: 3900 },
  { tick: 17400, kind: 'hauler', x: 1010, y: 360, health: 2200, amplitude: 135, lifetime: 4200 }
];

const nextRandom = (state: GameState): number => {
  let value = state.seed | 0;
  value ^= value << 13;
  value ^= value >>> 17;
  value ^= value << 5;
  state.seed = value >>> 0;
  return state.seed / 0x100000000;
};

const createEnemy = (state: GameState, encounter: Encounter): Enemy => {
  const phaseJitter = Math.floor(nextRandom(state) * 180);
  const cooldownJitter = Math.floor(nextRandom(state) * 30);
  return {
    id: state.nextId++, kind: encounter.kind,
    x: encounter.x * SCALE, y: encounter.y * SCALE,
    health: encounter.health, maxHealth: encounter.health,
    markedUntil: 0, fireCooldown: (encounter.kind === 'hauler' ? 62 : 82) + cooldownJitter,
    radius: encounter.kind === 'hauler' ? 48 : 28,
    baseY: encounter.y * SCALE, amplitude: encounter.amplitude,
    phase: phaseJitter, spawnedAt: state.tick, expiresAt: state.tick + encounter.lifetime
  };
};

export const createInitialState = (seed = 1): GameState => {
  const state: GameState = {
  tick: 0,
  nextId: 1,
  seed: seed || 1,
  player: { x: 260 * SCALE, y: 360 * SCALE, health: 3, invulnerableUntil: 0, fireCooldown: 0 },
  gauge: 75,
  score: 0,
  trail: [],
  candidate: null,
  bullets: [],
  enemies: [],
  encounterIndex: 0,
  retrace: null,
  metrics: { candidates: 0, loops: 0, emptyLoops: 0, missedCollates: 0, captured: 0, annotatedShots: 0, retraces: 0, damage: 0, enemiesDefeated: 0, haulersDefeated: 0, firstHaulerDefeatTick: null, enemyShots: 0 }
  };
  state.enemies.push(createEnemy(state, ENCOUNTERS[0]));
  state.encounterIndex = 1;
  return state;
};

const copyState = (state: GameState): GameState => ({
  ...state,
  player: { ...state.player },
  trail: state.trail.map((point) => ({ ...point })),
  candidate: state.candidate ? { ...state.candidate, intersection: { ...state.candidate.intersection }, polygon: state.candidate.polygon.map((point) => ({ ...point })) } : null,
  bullets: state.bullets.map((bullet) => ({ ...bullet })),
  enemies: state.enemies.map((enemy) => ({ ...enemy })),
  retrace: state.retrace ? { index: state.retrace.index, points: state.retrace.points.map((point) => ({ ...point })) } : null,
  metrics: { ...state.metrics }
});

const spawnEnemyBullet = (state: GameState, enemy: Point): void => {
  const dx = state.player.x - enemy.x;
  const dy = state.player.y - enemy.y;
  const length = Math.max(1, Math.hypot(dx, dy));
  const speed = 145 * SCALE / TICK_RATE;
  state.bullets.push({ id: state.nextId++, x: enemy.x, y: enemy.y, vx: Math.round(dx / length * speed), vy: Math.round(dy / length * speed), radius: 8, kind: 'enemy', annotated: false, capturable: true });
  state.metrics.enemyShots += 1;
};

const spawnDueEncounters = (state: GameState): void => {
  while (state.encounterIndex < ENCOUNTERS.length && ENCOUNTERS[state.encounterIndex].tick <= state.tick) {
    state.enemies.push(createEnemy(state, ENCOUNTERS[state.encounterIndex]));
    state.encounterIndex += 1;
  }
};

const updatePlayer = (state: GameState, input: InputFrame): void => {
  if (state.retrace) {
    state.retrace.index += 1;
    const point = state.retrace.points[Math.min(state.retrace.index, state.retrace.points.length - 1)];
    state.player.x = point.x;
    state.player.y = point.y;
    if (state.retrace.index >= state.retrace.points.length - 1) state.retrace = null;
    return;
  }
  let dx = Number(Boolean(input.right)) - Number(Boolean(input.left));
  let dy = Number(Boolean(input.down)) - Number(Boolean(input.up));
  if (dx !== 0 && dy !== 0) { dx *= 0.70710678; dy *= 0.70710678; }
  state.player.x = clamp(state.player.x + Math.round(dx * PLAYER_SPEED), PLAYER_RADIUS * SCALE, (WIDTH - PLAYER_RADIUS) * SCALE);
  state.player.y = clamp(state.player.y + Math.round(dy * PLAYER_SPEED), PLAYER_RADIUS * SCALE, (HEIGHT - PLAYER_RADIUS) * SCALE);
};

const collate = (state: GameState, events: GameEvent[]): void => {
  const candidate = state.candidate;
  if (!candidate) { state.metrics.missedCollates += 1; events.push({ type: 'collate-missed' }); return; }
  const selected = state.bullets
    .filter((bullet) => bullet.kind === 'enemy' && bullet.capturable && pointInPolygon(bullet, candidate.polygon))
    .sort((a, b) => distanceSq(a, state.player) - distanceSq(b, state.player) || a.id - b.id)
    .slice(0, state.gauge >= 100 ? undefined : 18);
  const ids = new Set(selected.map((bullet) => bullet.id));
  state.bullets = state.bullets.filter((bullet) => !ids.has(bullet.id));
  for (const captured of selected) {
    const enemy = state.enemies.slice().sort((a, b) => distanceSq(a, captured) - distanceSq(b, captured) || a.id - b.id)[0];
    if (!enemy) continue;
    const dx = enemy.x - captured.x;
    const dy = enemy.y - captured.y;
    const length = Math.max(1, Math.hypot(dx, dy));
    const speed = 500 * SCALE / TICK_RATE;
    state.bullets.push({ id: state.nextId++, x: captured.x, y: captured.y, vx: Math.round(dx / length * speed), vy: Math.round(dy / length * speed), radius: 5, kind: 'return', annotated: true, capturable: false });
  }
  for (const enemy of state.enemies) if (pointInPolygon(enemy, candidate.polygon)) enemy.markedUntil = state.tick + 6 * TICK_RATE;
  state.gauge = clamp(state.gauge + selected.length * 4, 0, 100);
  // Larger, riskier loops need enough score leverage to distinguish Sweep from
  // safe bullet erasure during the M1 strategy comparison.
  state.score += selected.length * 100 + Math.round(candidate.area / 15);
  state.metrics.loops += 1;
  if (selected.length === 0 && !state.enemies.some((enemy) => pointInPolygon(enemy, candidate.polygon))) state.metrics.emptyLoops += 1;
  state.metrics.captured += selected.length;
  state.trail = state.trail.slice(0, candidate.startIndex);
  state.candidate = null;
  events.push({ type: 'loop-collated', captured: selected.length, area: candidate.area });
};

export const step = (previous: GameState, input: InputFrame): { state: GameState; events: GameEvent[] } => {
  const state = copyState(previous);
  const events: GameEvent[] = [];
  state.tick += 1;

  if (input.retrace && !state.retrace) {
    if (state.gauge >= 25 && state.trail.length >= 4) {
      const recent = state.trail.filter((point) => state.tick - point.bornTick <= 90).slice().reverse();
      state.retrace = { points: recent, index: 0 };
      state.gauge -= 25;
      state.metrics.retraces += 1;
      events.push({ type: 'retrace-started' });
    } else events.push({ type: 'retrace-denied' });
  }
  updatePlayer(state, input);

  spawnDueEncounters(state);

  state.trail = state.trail.filter((point) => state.tick - point.bornTick <= TRAIL_LIFETIME);
  if (state.candidate?.expiresTick && state.candidate.expiresTick < state.tick) state.candidate = null;
  if (!state.retrace && shouldAddTrailPoint(state.trail, state.player, state.tick)) {
    state.trail.push({ x: state.player.x, y: state.player.y, bornTick: state.tick, segmentId: state.tick });
    const wasReady = Boolean(state.candidate);
    const detected = findLoopCandidate(state.trail);
    if (detected) state.candidate = { ...detected, expiresTick: state.tick + 60 };
    if (!wasReady && detected) { state.metrics.candidates += 1; events.push({ type: 'loop-ready' }); }
  }

  state.player.fireCooldown = Math.max(0, state.player.fireCooldown - 1);
  if (input.fire && state.player.fireCooldown === 0) {
    state.bullets.push({ id: state.nextId++, x: state.player.x + 18 * SCALE, y: state.player.y, vx: Math.round(620 * SCALE / TICK_RATE), vy: 0, radius: 4, kind: 'player', annotated: false, capturable: false });
    state.player.fireCooldown = 10;
    events.push({ type: 'shot-fired' });
  }

  for (const enemy of state.enemies) {
    enemy.y = enemy.baseY + Math.round(Math.sin((state.tick - enemy.spawnedAt + enemy.phase) / 220) * enemy.amplitude * SCALE);
    enemy.fireCooldown -= 1;
    if (enemy.fireCooldown <= 0) {
      spawnEnemyBullet(state, enemy);
      const cadence = enemy.kind === 'hauler' ? 62 : 82;
      enemy.fireCooldown = cadence + Math.floor(nextRandom(state) * 22);
    }
  }

  for (const bullet of state.bullets) {
    const from = { x: bullet.x, y: bullet.y };
    bullet.x += bullet.vx;
    bullet.y += bullet.vy;
    if (bullet.kind === 'player' && !bullet.annotated && shotCrossedTrail(from, bullet, state.trail)) {
      bullet.annotated = true;
      bullet.vx = Math.round(bullet.vx * 1.15);
      state.metrics.annotatedShots += 1;
    }
  }

  if (input.collate) collate(state, events);

  const remaining: Bullet[] = [];
  const defeated = new Set<number>();
  for (const bullet of state.bullets) {
    let consumed = false;
    if (bullet.kind !== 'enemy') {
      for (const enemy of state.enemies) {
        if (distanceSq(bullet, enemy) <= ((bullet.radius + enemy.radius) * SCALE) ** 2) {
          // A successful loop must repay the travel and firing opportunity cost.
          // M1 measurement showed 9 damage left ordinary tracking fire dominant.
          const damage = bullet.kind === 'return' ? 16 : bullet.annotated && enemy.markedUntil >= state.tick ? 28 : bullet.annotated ? 6 : 4;
          enemy.health -= damage;
          consumed = true;
          if (enemy.health <= 0) {
            state.score += enemy.kind === 'hauler' ? 5000 : 1200;
            events.push({ type: 'enemy-defeated' });
            defeated.add(enemy.id);
            state.metrics.enemiesDefeated += 1;
            if (enemy.kind === 'hauler') {
              state.metrics.haulersDefeated += 1;
              state.metrics.firstHaulerDefeatTick ??= state.tick;
            }
          }
          break;
        }
      }
    } else if (!state.retrace && state.player.invulnerableUntil < state.tick
      && distanceSq(bullet, state.player) <= ((bullet.radius + PLAYER_RADIUS) * SCALE) ** 2) {
      state.player.health -= 1;
      state.player.invulnerableUntil = state.tick + 132;
      state.trail = [];
      state.candidate = null;
      state.metrics.damage += 1;
      consumed = true;
      events.push({ type: 'damage' });
    }
    if (!consumed && bullet.x > -30 * SCALE && bullet.x < (WIDTH + 30) * SCALE && bullet.y > -30 * SCALE && bullet.y < (HEIGHT + 30) * SCALE) remaining.push(bullet);
  }
  state.bullets = remaining;
  state.enemies = state.enemies.filter((enemy) => !defeated.has(enemy.id) && enemy.expiresAt >= state.tick);
  return { state, events };
};
