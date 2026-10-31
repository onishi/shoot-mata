import { clamp, distanceSq, pointInPolygon } from '../core/math';
import { HEIGHT, SCALE, TICK_RATE, WIDTH, type Bullet, type Enemy, type EnemyKind, type GameEvent, type GameState, type InputFrame, type Point } from '../core/types';
import { STAGE_01_DURATION_TICKS, STAGE_01_ENTITY_LIMITS, STAGE_01_SPAWNS, type StageEnemySpawn } from '../content/stage-01';
import { findLoopCandidate, shotCrossedTrail, shouldAddTrailPoint } from './trail';

const PLAYER_SPEED = Math.round(320 * SCALE / TICK_RATE);
const TRAIL_LIFETIME = Math.round(3.2 * TICK_RATE);
const PLAYER_RADIUS = 13;
export const PLAYGROUND_DURATION_TICKS = STAGE_01_DURATION_TICKS;

const nextRandom = (state: GameState): number => {
  let value = state.seed | 0;
  value ^= value << 13;
  value ^= value >>> 17;
  value ^= value << 5;
  state.seed = value >>> 0;
  return state.seed / 0x100000000;
};

const createEnemy = (state: GameState, encounter: StageEnemySpawn): Enemy => {
  const phaseJitter = Math.floor(nextRandom(state) * 180);
  const cooldownJitter = Math.floor(nextRandom(state) * 30);
  return {
    id: state.nextId++, kind: encounter.kind,
    x: encounter.x * SCALE, y: encounter.y * SCALE,
    health: encounter.health, maxHealth: encounter.health,
    markedUntil: 0,
    fireCooldown: ({ 'eraser-mite': 72, 'bracket-gull': 150, 'margin-skiff': 120, 'folio-hauler': 100 }[encounter.kind]) + cooldownJitter,
    radius: ({ 'eraser-mite': 17, 'bracket-gull': 25, 'margin-skiff': 30, 'folio-hauler': 58 }[encounter.kind]),
    baseY: encounter.y * SCALE, amplitude: encounter.amplitude,
    phase: phaseJitter, spawnedAt: state.tick, expiresAt: Math.min(state.tick + encounter.lifetime, STAGE_01_DURATION_TICKS - 1),
    spawnX: encounter.x * SCALE, lane: encounter.lane ?? 0, groupId: encounter.groupId ?? 0,
    state: 'entering', stateTick: state.tick
  };
};

const emptyEnemyStats = (): GameState['metrics']['enemyStats'] => ({
  'eraser-mite': { spawned: 0, attacks: 0, defeated: 0, exited: 0 },
  'bracket-gull': { spawned: 0, attacks: 0, defeated: 0, exited: 0 },
  'margin-skiff': { spawned: 0, attacks: 0, defeated: 0, exited: 0 },
  'folio-hauler': { spawned: 0, attacks: 0, defeated: 0, exited: 0 }
});

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
  metrics: { candidates: 0, loops: 0, emptyLoops: 0, missedCollates: 0, captured: 0, annotatedShots: 0, retraces: 0, damage: 0, enemiesDefeated: 0, haulersDefeated: 0, firstHaulerDefeatTick: null, enemyShots: 0, enemyStats: emptyEnemyStats(), rejectedEnemies: 0, rejectedEnemyBullets: 0 }
  };
  state.enemies.push(createEnemy(state, STAGE_01_SPAWNS[0]));
  state.metrics.enemyStats[STAGE_01_SPAWNS[0].kind].spawned += 1;
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
  metrics: { ...state.metrics, enemyStats: Object.fromEntries(Object.entries(state.metrics.enemyStats).map(([kind, stats]) => [kind, { ...stats }])) as GameState['metrics']['enemyStats'] }
});

const spawnEnemyBullet = (state: GameState, enemy: Point, angleOffset = 0, speedPx = 145): boolean => {
  if (state.bullets.filter((bullet) => bullet.kind === 'enemy').length >= STAGE_01_ENTITY_LIMITS.enemyBullets) {
    state.metrics.rejectedEnemyBullets += 1;
    return false;
  }
  const aim = Math.atan2(state.player.y - enemy.y, state.player.x - enemy.x) + angleOffset;
  const dx = Math.cos(aim);
  const dy = Math.sin(aim);
  const length = Math.max(1, Math.hypot(dx, dy));
  const speed = speedPx * SCALE / TICK_RATE;
  state.bullets.push({ id: state.nextId++, x: enemy.x, y: enemy.y, vx: Math.round(dx / length * speed), vy: Math.round(dy / length * speed), radius: 8, kind: 'enemy', annotated: false, capturable: true });
  state.metrics.enemyShots += 1;
  return true;
};

const spawnDueEncounters = (state: GameState): void => {
  while (state.encounterIndex < STAGE_01_SPAWNS.length && STAGE_01_SPAWNS[state.encounterIndex].tick <= state.tick) {
    const encounter = STAGE_01_SPAWNS[state.encounterIndex];
    if (state.enemies.length < STAGE_01_ENTITY_LIMITS.enemies) {
      state.enemies.push(createEnemy(state, encounter));
      state.metrics.enemyStats[encounter.kind].spawned += 1;
    } else state.metrics.rejectedEnemies += 1;
    state.encounterIndex += 1;
  }
};

const eraseTrailNear = (state: GameState, enemy: Enemy): boolean => {
  let closest = -1;
  let closestDistance = (34 * SCALE) ** 2;
  for (let index = 0; index < state.trail.length; index += 1) {
    const candidateDistance = distanceSq(enemy, state.trail[index]);
    if (candidateDistance <= closestDistance) { closest = index; closestDistance = candidateDistance; }
  }
  if (closest < 0) return false;
  state.trail.splice(Math.max(0, closest - 3), 7);
  state.candidate = null;
  return true;
};

const moveTowardPoint = (enemy: Enemy, target: Point, speedPx: number): void => {
  const angle = Math.atan2(target.y - enemy.y, target.x - enemy.x);
  enemy.x += Math.round(Math.cos(angle) * speedPx * SCALE / TICK_RATE);
  enemy.y += Math.round(Math.sin(angle) * speedPx * SCALE / TICK_RATE);
};

const updateEnemy = (state: GameState, enemy: Enemy): void => {
  const age = state.tick - enemy.spawnedAt;
  if (age > 90) enemy.state = 'active';
  if (enemy.expiresAt - state.tick < 120) enemy.state = 'exiting';
  enemy.fireCooldown -= 1;

  if (enemy.kind === 'eraser-mite') {
    const target = state.trail.slice().sort((a, b) => distanceSq(enemy, a) - distanceSq(enemy, b) || a.segmentId - b.segmentId)[0];
    moveTowardPoint(enemy, target ?? { x: -30 * SCALE, y: enemy.y }, target ? 185 : 135);
    if (enemy.fireCooldown <= 0) {
      if (eraseTrailNear(state, enemy)) state.metrics.enemyStats[enemy.kind].attacks += 1;
      enemy.fireCooldown = 72;
    }
    return;
  }

  enemy.x = Math.max(enemy.kind === 'folio-hauler' ? 1010 * SCALE : 1015 * SCALE, enemy.spawnX - Math.min(age, 120) * 2.5 * SCALE);
  enemy.y = enemy.baseY + Math.round(Math.sin((age + enemy.phase) / (enemy.kind === 'margin-skiff' ? 105 : 180)) * enemy.amplitude * SCALE);
  if (enemy.state === 'exiting') enemy.x += (state.tick - (enemy.expiresAt - 120)) * 3 * SCALE;
  if (enemy.fireCooldown > 0) return;

  if (enemy.kind === 'bracket-gull') {
    // Both brackets write toward the space between the pair; staggered slow
    // bullets form a readable vertical fence that is profitable to surround.
    const origin = { x: enemy.x, y: enemy.y - enemy.lane * 38 * SCALE };
    for (const offset of [-0.1, 0, 0.1]) spawnEnemyBullet(state, origin, offset, 105);
    enemy.fireCooldown = 240;
  } else if (enemy.kind === 'margin-skiff') {
    for (const offset of [-0.18, 0, 0.18]) spawnEnemyBullet(state, enemy, offset, 150);
    enemy.fireCooldown = 180;
  } else {
    for (const offset of [-0.26, -0.13, 0, 0.13, 0.26]) spawnEnemyBullet(state, enemy, offset, 132);
    enemy.fireCooldown = 160;
  }
  state.metrics.enemyStats[enemy.kind].attacks += 1;
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

  for (const enemy of state.enemies) updateEnemy(state, enemy);

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
        if (defeated.has(enemy.id)) continue;
        if (distanceSq(bullet, enemy) <= ((bullet.radius + enemy.radius) * SCALE) ** 2) {
          // A successful loop must repay the travel and firing opportunity cost.
          // M1 measurement showed 9 damage left ordinary tracking fire dominant.
          let damage = bullet.kind === 'return' ? 16 : bullet.annotated && enemy.markedUntil >= state.tick ? 28 : bullet.annotated ? 6 : 4;
          if (enemy.kind === 'folio-hauler') {
            // Ordinary fire hits the broad front plate. Returned fire and shots
            // carried around its rear edge by a loop reach the exposed binding.
            const rearHit = bullet.x > enemy.x + 12 * SCALE;
            damage = bullet.kind === 'return' ? 32 : rearHit ? damage * 2 : Math.min(2, damage);
          }
          enemy.health -= damage;
          consumed = true;
          if (enemy.health <= 0) {
            state.score += enemy.kind === 'folio-hauler' ? 5000 : enemy.kind === 'margin-skiff' ? 1600 : enemy.kind === 'bracket-gull' ? 1000 : 700;
            events.push({ type: 'enemy-defeated' });
            defeated.add(enemy.id);
            state.metrics.enemiesDefeated += 1;
            state.metrics.enemyStats[enemy.kind].defeated += 1;
            if (enemy.kind === 'folio-hauler') {
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
  state.enemies = state.enemies.filter((enemy) => {
    if (defeated.has(enemy.id)) return false;
    if (enemy.expiresAt < state.tick) {
      state.metrics.enemyStats[enemy.kind].exited += 1;
      return false;
    }
    return true;
  });
  return { state, events };
};
