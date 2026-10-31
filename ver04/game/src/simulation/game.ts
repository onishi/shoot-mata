import { clamp, distanceSq, pointInPolygon } from '../core/math';
import { HEIGHT, SCALE, TICK_RATE, WIDTH, type Bullet, type GameEvent, type GameState, type InputFrame, type Point } from '../core/types';
import { findLoopCandidate, shotCrossedTrail, shouldAddTrailPoint } from './trail';

const PLAYER_SPEED = Math.round(320 * SCALE / TICK_RATE);
const TRAIL_LIFETIME = Math.round(3.2 * TICK_RATE);
const PLAYER_RADIUS = 13;

export const createInitialState = (seed = 1): GameState => ({
  tick: 0,
  nextId: 2,
  seed,
  player: { x: 260 * SCALE, y: 360 * SCALE, health: 3, invulnerableUntil: 0, fireCooldown: 0 },
  gauge: 75,
  score: 0,
  trail: [],
  candidate: null,
  bullets: [],
  enemies: [{ id: 1, x: 1010 * SCALE, y: 360 * SCALE, health: 180, maxHealth: 180, markedUntil: 0, fireCooldown: 50, radius: 36 }],
  retrace: null,
  metrics: { loops: 0, captured: 0, annotatedShots: 0, retraces: 0, damage: 0 }
});

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
};

const updatePlayer = (state: GameState, input: InputFrame): void => {
  if (state.retrace) {
    state.retrace.index += 2;
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
  if (!candidate) { events.push({ type: 'collate-missed' }); return; }
  const selected = state.bullets
    .filter((bullet) => bullet.kind === 'enemy' && bullet.capturable && pointInPolygon(bullet, candidate.polygon))
    .sort((a, b) => distanceSq(a, state.player) - distanceSq(b, state.player) || a.id - b.id)
    .slice(0, state.gauge >= 100 ? undefined : 18);
  const ids = new Set(selected.map((bullet) => bullet.id));
  state.bullets = state.bullets.filter((bullet) => !ids.has(bullet.id));
  for (const captured of selected) {
    const enemy = state.enemies[0];
    const dx = enemy.x - captured.x;
    const dy = enemy.y - captured.y;
    const length = Math.max(1, Math.hypot(dx, dy));
    const speed = 500 * SCALE / TICK_RATE;
    state.bullets.push({ id: state.nextId++, x: captured.x, y: captured.y, vx: Math.round(dx / length * speed), vy: Math.round(dy / length * speed), radius: 5, kind: 'return', annotated: true, capturable: false });
  }
  for (const enemy of state.enemies) if (pointInPolygon(enemy, candidate.polygon)) enemy.markedUntil = state.tick + 6 * TICK_RATE;
  state.gauge = clamp(state.gauge + selected.length * 4, 0, 100);
  state.score += selected.length * 100 + Math.round(candidate.area / 100);
  state.metrics.loops += 1;
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

  state.trail = state.trail.filter((point) => state.tick - point.bornTick <= TRAIL_LIFETIME);
  if (state.candidate?.expiresTick && state.candidate.expiresTick < state.tick) state.candidate = null;
  if (!state.retrace && shouldAddTrailPoint(state.trail, state.player, state.tick)) {
    state.trail.push({ x: state.player.x, y: state.player.y, bornTick: state.tick, segmentId: state.tick });
    const wasReady = Boolean(state.candidate);
    const detected = findLoopCandidate(state.trail);
    if (detected) state.candidate = { ...detected, expiresTick: state.tick + 60 };
    if (!wasReady && detected) events.push({ type: 'loop-ready' });
  }

  state.player.fireCooldown = Math.max(0, state.player.fireCooldown - 1);
  if (input.fire && state.player.fireCooldown === 0) {
    state.bullets.push({ id: state.nextId++, x: state.player.x + 18 * SCALE, y: state.player.y, vx: Math.round(620 * SCALE / TICK_RATE), vy: 0, radius: 4, kind: 'player', annotated: false, capturable: false });
    state.player.fireCooldown = 10;
    events.push({ type: 'shot-fired' });
  }

  for (const enemy of state.enemies) {
    enemy.y = Math.round((360 + Math.sin(state.tick / 90 + enemy.id) * 165) * SCALE);
    enemy.fireCooldown -= 1;
    if (enemy.fireCooldown <= 0) { spawnEnemyBullet(state, enemy); enemy.fireCooldown = 55; }
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
  for (const bullet of state.bullets) {
    let consumed = false;
    if (bullet.kind !== 'enemy') {
      for (const enemy of state.enemies) {
        if (distanceSq(bullet, enemy) <= ((bullet.radius + enemy.radius) * SCALE) ** 2) {
          const damage = bullet.kind === 'return' ? 8 : bullet.annotated && enemy.markedUntil >= state.tick ? 9 : bullet.annotated ? 6 : 4;
          enemy.health -= damage;
          consumed = true;
          if (enemy.health <= 0) {
            state.score += 2000;
            events.push({ type: 'enemy-defeated' });
            enemy.health = enemy.maxHealth;
            enemy.markedUntil = 0;
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
  return { state, events };
};
