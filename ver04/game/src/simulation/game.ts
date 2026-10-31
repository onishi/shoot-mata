import { clamp, distanceSq, pointInPolygon } from '../core/math';
import { HEIGHT, SCALE, TICK_RATE, WIDTH, type BossState, type Bullet, type Enemy, type EnemyKind, type GameEvent, type GameState, type InputFrame, type Point, type StageId } from '../core/types';
import { stageDefinition } from '../content/campaign';
import { STAGE_01_BOSS_START_TICK, STAGE_01_DURATION_TICKS, type StageEnemySpawn } from '../content/stage-01';
import { STAGE_02_BOSS_START_TICK, STAGE_02_WIND_HALF_CYCLE_TICKS } from '../content/stage-02';
import { STAGE_03_BOSS_START_TICK, STAGE_03_RAIN_PERIOD_TICKS, STAGE_03_WET_TICKS } from '../content/stage-03';
import { STAGE_04_COOLING_EXTENSION_TICKS, STAGE_04_COOLING_RADIUS_PX, STAGE_04_HEAT_PERIOD_TICKS, stageFourCoolingCenter } from '../content/stage-04';
import { findLoopCandidate, shotCrossedTrail, shotCrossedWetTrail, shouldAddTrailPoint } from './trail';

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
  const stage = stageDefinition(state.stageId);
  const phaseJitter = Math.floor(nextRandom(state) * 180);
  const cooldownJitter = Math.floor(nextRandom(state) * 30);
  return {
    id: state.nextId++, kind: encounter.kind,
    x: encounter.x * SCALE, y: encounter.y * SCALE,
    health: encounter.health, maxHealth: encounter.health,
    markedUntil: 0,
    fireCooldown: ({
      'eraser-mite': 72, 'bracket-gull': 150, 'margin-skiff': 120, 'folio-hauler': 100,
      'index-kite': 108, 'vane-scribe': 132, 'cross-reference-pair': 144, 'tab-binder': 96,
      'drip-scribe': 90, 'gutter-frog': 132, 'basin-bell': 180, 'reed-needle': 120,
      'ash-comma': 96, 'kiln-censor': 150, 'ember-courier': 126, 'char-press': 180
    }[encounter.kind]) + cooldownJitter,
    radius: ({
      'eraser-mite': 17, 'bracket-gull': 25, 'margin-skiff': 30, 'folio-hauler': 58,
      'index-kite': 21, 'vane-scribe': 31, 'cross-reference-pair': 27, 'tab-binder': 56,
      'drip-scribe': 24, 'gutter-frog': 30, 'basin-bell': 58, 'reed-needle': 25,
      'ash-comma': 22, 'kiln-censor': 34, 'ember-courier': 29, 'char-press': 60
    }[encounter.kind]),
    baseY: encounter.y * SCALE, amplitude: encounter.amplitude,
    phase: phaseJitter, spawnedAt: state.tick, expiresAt: Math.min(state.tick + encounter.lifetime, stage.durationTicks - 1),
    spawnX: encounter.x * SCALE, lane: encounter.lane ?? 0, groupId: encounter.groupId ?? 0,
    state: 'entering', stateTick: state.tick
  };
};

const emptyEnemyStats = (): GameState['metrics']['enemyStats'] => ({
  'eraser-mite': { spawned: 0, attacks: 0, defeated: 0, exited: 0 },
  'bracket-gull': { spawned: 0, attacks: 0, defeated: 0, exited: 0 },
  'margin-skiff': { spawned: 0, attacks: 0, defeated: 0, exited: 0 },
  'folio-hauler': { spawned: 0, attacks: 0, defeated: 0, exited: 0 },
  'index-kite': { spawned: 0, attacks: 0, defeated: 0, exited: 0 },
  'vane-scribe': { spawned: 0, attacks: 0, defeated: 0, exited: 0 },
  'cross-reference-pair': { spawned: 0, attacks: 0, defeated: 0, exited: 0 },
  'tab-binder': { spawned: 0, attacks: 0, defeated: 0, exited: 0 },
  'drip-scribe': { spawned: 0, attacks: 0, defeated: 0, exited: 0 },
  'gutter-frog': { spawned: 0, attacks: 0, defeated: 0, exited: 0 },
  'basin-bell': { spawned: 0, attacks: 0, defeated: 0, exited: 0 },
  'reed-needle': { spawned: 0, attacks: 0, defeated: 0, exited: 0 },
  'ash-comma': { spawned: 0, attacks: 0, defeated: 0, exited: 0 },
  'kiln-censor': { spawned: 0, attacks: 0, defeated: 0, exited: 0 },
  'ember-courier': { spawned: 0, attacks: 0, defeated: 0, exited: 0 },
  'char-press': { spawned: 0, attacks: 0, defeated: 0, exited: 0 }
});

export const createInitialState = (seed = 1, stageId: StageId = 'stage-01'): GameState => {
  const stage = stageDefinition(stageId);
  const state: GameState = {
  stageId,
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
  boss: null,
  encounterIndex: 0,
  retrace: null,
  metrics: { candidates: 0, loops: 0, emptyLoops: 0, missedCollates: 0, captured: 0, annotatedShots: 0, retraces: 0, damage: 0, enemiesDefeated: 0, haulersDefeated: 0, firstHaulerDefeatTick: null, enemyShots: 0, enemyStats: emptyEnemyStats(), rejectedEnemies: 0, rejectedEnemyBullets: 0,
    wind: { reversals: 0, playerDrift: 0, trailDrift: 0, collatesLeft: 0, collatesRight: 0, collatesNearReversal: 0 },
    rain: { drops: 0, trailPointsWetted: 0, wetTrailPeak: 0, wetAnnotatedShots: 0, wetDamage: 0, basinSurges: 0, needleDashes: 0 },
    heat: { waves: 0, trailPointsBurned: 0, trailPointsCooled: 0, cooledTrailPeak: 0, coolingCollates: 0, ashCoolingBursts: 0, censorBrands: 0, courierConversions: 0, pressClosures: 0 },
    boss: { spawned: false, defeated: false, defeatTick: null, phaseReached: [false, false, false], fanWarnings: 0, fanErases: 0, trailPointsErased: 0, returnedHits: 0, ordinaryHits: 0, armorLayersStripped: 0, damageByAttack: { fan: 0, sweep: 0, volley: 0 } },
    compiler: { windLocks: 0, windLockedTicks: 0, weakpointHits: 0, ordinaryHits: 0, phaseReached: [false, false, false], attacks: { gust: 0, lance: 0, storm: 0 }, damageByAttack: { gust: 0, lance: 0, storm: 0 } },
    eel: { segmentMarks: 0, markedTicks: 0, weakpointHits: 0, wetWeakpointHits: 0, ordinaryHits: 0, phaseReached: [false, false, false], attacks: { drizzle: 0, wake: 0, deluge: 0 }, damageByAttack: { drizzle: 0, wake: 0, deluge: 0 } } }
  };
  if (stage.spawns[0]?.tick === 0) {
    state.enemies.push(createEnemy(state, stage.spawns[0]));
    state.metrics.enemyStats[stage.spawns[0].kind].spawned += 1;
    state.encounterIndex = 1;
  }
  return state;
};

export const copyState = (state: GameState): GameState => ({
  ...state,
  player: { ...state.player },
  trail: state.trail.map((point) => ({ ...point })),
  candidate: state.candidate ? { ...state.candidate, intersection: { ...state.candidate.intersection }, polygon: state.candidate.polygon.map((point) => ({ ...point })) } : null,
  bullets: state.bullets.map((bullet) => ({ ...bullet })),
  enemies: state.enemies.map((enemy) => ({ ...enemy })),
  boss: state.boss ? { ...state.boss } : null,
  retrace: state.retrace ? { index: state.retrace.index, points: state.retrace.points.map((point) => ({ ...point })) } : null,
  metrics: { ...state.metrics, wind: { ...state.metrics.wind }, rain: { ...state.metrics.rain }, heat: { ...state.metrics.heat }, enemyStats: Object.fromEntries(Object.entries(state.metrics.enemyStats).map(([kind, stats]) => [kind, { ...stats }])) as GameState['metrics']['enemyStats'], boss: { ...state.metrics.boss, phaseReached: [...state.metrics.boss.phaseReached], damageByAttack: { ...state.metrics.boss.damageByAttack } }, compiler: { ...state.metrics.compiler, phaseReached: [...state.metrics.compiler.phaseReached], attacks: { ...state.metrics.compiler.attacks }, damageByAttack: { ...state.metrics.compiler.damageByAttack } }, eel: { ...state.metrics.eel, phaseReached: [...state.metrics.eel.phaseReached], attacks: { ...state.metrics.eel.attacks }, damageByAttack: { ...state.metrics.eel.damageByAttack } } }
});

const spawnEnemyBullet = (state: GameState, enemy: Point, angleOffset = 0, speedPx = 145, sourceAttack: Bullet['sourceAttack'] = 'enemy-volley'): boolean => {
  if (state.bullets.filter((bullet) => bullet.kind === 'enemy').length >= stageDefinition(state.stageId).entityLimits.enemyBullets) {
    state.metrics.rejectedEnemyBullets += 1;
    return false;
  }
  const aim = Math.atan2(state.player.y - enemy.y, state.player.x - enemy.x) + angleOffset;
  const dx = Math.cos(aim);
  const dy = Math.sin(aim);
  const length = Math.max(1, Math.hypot(dx, dy));
  const speed = speedPx * SCALE / TICK_RATE;
  state.bullets.push({ id: state.nextId++, x: enemy.x, y: enemy.y, vx: Math.round(dx / length * speed), vy: Math.round(dy / length * speed), radius: 8, kind: 'enemy', annotated: false, capturable: true, sourceAttack });
  state.metrics.enemyShots += 1;
  return true;
};

const createBoss = (state: GameState): BossState => ({
  kind: 'blank-bailiff',
  x: 1050 * SCALE, y: 360 * SCALE, health: 1200, maxHealth: 1200,
  armor: 300, maxArmor: 300, armorLayers: 3, phase: 1,
  phaseStartedAt: state.tick, cycleStartedAt: state.tick,
  fanAngle: Math.PI, fanWarningUntil: state.tick + 90, fanFiresAt: state.tick + 90,
  defeatedAt: null, vaneSide: -1, windLockedUntil: 0, lockedWindDirection: 1, seamExposedUntil: 0,
  activeSegment: 0, segmentMarkedUntil: 0
});

const createCompiler = (state: GameState): BossState => ({
  kind: 'crosswind-compiler',
  x: 1050 * SCALE, y: 360 * SCALE, health: 1500, maxHealth: 1500,
  armor: 0, maxArmor: 0, armorLayers: 0, phase: 1,
  phaseStartedAt: state.tick, cycleStartedAt: state.tick,
  fanAngle: Math.PI, fanWarningUntil: 0, fanFiresAt: 0, defeatedAt: null,
  vaneSide: stageTwoWindDirection(state.tick), windLockedUntil: 0,
  lockedWindDirection: stageTwoWindDirection(state.tick), seamExposedUntil: 0,
  activeSegment: 0, segmentMarkedUntil: 0
});

const createEel = (state: GameState): BossState => ({
  kind: 'lacuna-eel',
  x: 1030 * SCALE, y: 360 * SCALE, health: 1800, maxHealth: 1800,
  armor: 0, maxArmor: 0, armorLayers: 0, phase: 1,
  phaseStartedAt: state.tick, cycleStartedAt: state.tick,
  fanAngle: Math.PI, fanWarningUntil: 0, fanFiresAt: 0, defeatedAt: null,
  vaneSide: -1, windLockedUntil: 0, lockedWindDirection: 1, seamExposedUntil: 0,
  activeSegment: 0, segmentMarkedUntil: 0
});

export const eelSegmentPoint = (boss: BossState, tick: number, segment: 0 | 1 | 2): Point => ({
  x: boss.x - (105 + segment * 118) * SCALE,
  y: boss.y + Math.round(Math.sin((tick - boss.phaseStartedAt) / 180 + segment * 1.35) * (72 + segment * 14) * SCALE)
});

const angleDifference = (a: number, b: number): number => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));

const updateBoss = (state: GameState, events: GameEvent[]): void => {
  if (state.stageId === 'stage-03') {
    if (!state.boss && state.tick >= STAGE_03_BOSS_START_TICK && !state.metrics.boss.defeated) {
      state.bullets = state.bullets.filter((bullet) => bullet.kind !== 'enemy');
      state.boss = createEel(state);
      state.metrics.boss.spawned = true;
      state.metrics.boss.phaseReached[0] = true;
      state.metrics.eel.phaseReached[0] = true;
      events.push({ type: 'boss-spawned' });
    }
    const eel = state.boss;
    if (!eel) return;
    eel.x = 1015 * SCALE + Math.round(Math.sin((state.tick - STAGE_03_BOSS_START_TICK) / 210) * 45 * SCALE);
    eel.y = 360 * SCALE + Math.round(Math.sin((state.tick - STAGE_03_BOSS_START_TICK) / 210) * 42 * SCALE);
    if (eel.segmentMarkedUntil >= state.tick) state.metrics.eel.markedTicks += 1;
    const age = state.tick - eel.cycleStartedAt;
    const origin = eelSegmentPoint(eel, state.tick, eel.activeSegment);
    if (eel.phase === 1 && age > 0 && age % 132 === 0) {
      for (const offset of [-0.24, 0, 0.24]) spawnEnemyBullet(state, origin, offset, 138, 'eel-drizzle');
      state.metrics.eel.attacks.drizzle += 1;
    } else if (eel.phase === 2 && age > 0 && age % 108 === 0) {
      for (const offset of [-0.42, -0.21, 0, 0.21, 0.42]) spawnEnemyBullet(state, origin, offset, 148, 'eel-wake');
      state.metrics.eel.attacks.wake += 1;
    } else if (eel.phase === 3 && age > 0 && age % 84 === 0) {
      for (const offset of [-0.6, -0.4, -0.2, 0, 0.2, 0.4, 0.6]) spawnEnemyBullet(state, origin, offset, 162, 'eel-deluge');
      state.metrics.eel.attacks.deluge += 1;
    }
    const cycleLength = eel.phase === 1 ? 396 : eel.phase === 2 ? 324 : 252;
    if (age >= cycleLength) eel.cycleStartedAt = state.tick;
    return;
  }
  if (state.stageId === 'stage-02') {
    if (!state.boss && state.tick >= STAGE_02_BOSS_START_TICK && !state.metrics.boss.defeated) {
      state.bullets = state.bullets.filter((bullet) => bullet.kind !== 'enemy');
      state.boss = createCompiler(state);
      state.metrics.boss.spawned = true;
      state.metrics.boss.phaseReached[0] = true;
      state.metrics.compiler.phaseReached[0] = true;
      events.push({ type: 'boss-spawned' });
    }
    const compiler = state.boss;
    if (!compiler) return;
    compiler.y = 360 * SCALE + Math.round(Math.sin((state.tick - STAGE_02_BOSS_START_TICK) / 170) * 58 * SCALE);
    if (compiler.windLockedUntil >= state.tick) state.metrics.compiler.windLockedTicks += 1;
    else compiler.vaneSide = stageTwoWindDirection(state.tick);
    const age = state.tick - compiler.cycleStartedAt;
    const cycleLength = compiler.phase === 1 ? 300 : compiler.phase === 2 ? 264 : 228;
    if (compiler.phase === 1 && age > 0 && age % 120 === 0) {
      for (const offset of [-0.42, -0.28, -0.14, 0, 0.14, 0.28, 0.42]) spawnEnemyBullet(state, compiler, offset + compiler.vaneSide * 0.18, 128, 'compiler-gust');
      state.metrics.compiler.attacks.gust += 1;
    } else if (compiler.phase === 2 && age > 0 && age % 96 === 0) {
      const origin = { x: compiler.x, y: compiler.y + compiler.vaneSide * 92 * SCALE };
      for (const offset of [-0.2, 0, 0.2]) spawnEnemyBullet(state, origin, offset, 178, 'compiler-lance');
      state.metrics.compiler.attacks.lance += 1;
    } else if (compiler.phase === 3 && age > 0 && age % 120 === 0) {
      for (const offset of [-0.58, -0.39, -0.2, 0, 0.2, 0.39, 0.58]) spawnEnemyBullet(state, compiler, offset, 154, 'compiler-storm');
      state.metrics.compiler.attacks.storm += 1;
    }
    if (age >= cycleLength) compiler.cycleStartedAt = state.tick;
    return;
  }
  if (state.stageId !== 'stage-01') return;
  if (!state.boss && state.tick >= STAGE_01_BOSS_START_TICK && !state.metrics.boss.defeated) {
    // The harbor route closes before the duel: stale formation fire must not
    // obscure the Bailiff's first authored warning.
    state.bullets = state.bullets.filter((bullet) => bullet.kind !== 'enemy');
    state.boss = createBoss(state);
    state.metrics.boss.spawned = true;
    state.metrics.boss.phaseReached[0] = true;
    state.metrics.boss.fanWarnings += 1;
    events.push({ type: 'boss-spawned' }, { type: 'boss-warning' });
  }
  const boss = state.boss;
  if (!boss) return;
  boss.y = 360 * SCALE + Math.round(Math.sin((state.tick - STAGE_01_BOSS_START_TICK) / 180) * 72 * SCALE);

  if (state.tick === boss.fanFiresAt) {
    const before = state.trail.length;
    state.trail = state.trail.filter((point) => {
      const angle = Math.atan2(point.y - boss.y, point.x - boss.x);
      return distanceSq(point, boss) > (850 * SCALE) ** 2 || angleDifference(angle, boss.fanAngle) > 0.48;
    });
    state.metrics.boss.trailPointsErased += before - state.trail.length;
    state.metrics.boss.fanErases += 1;
    state.candidate = null;
    for (const offset of [-0.42, -0.28, -0.14, 0, 0.14, 0.28, 0.42]) spawnEnemyBullet(state, boss, offset, 118 + boss.phase * 8, 'boss-fan');
  }

  const cycleLength = boss.phase === 1 ? 360 : boss.phase === 2 ? 300 : 240;
  const age = state.tick - boss.cycleStartedAt;
  if (age > 0 && age % 120 === 0) {
    const spread = boss.phase === 1 ? [-0.18, 0, 0.18] : boss.phase === 2 ? [-0.3, -0.15, 0, 0.15, 0.3] : [-0.42, -0.28, -0.14, 0, 0.14, 0.28, 0.42];
    for (const offset of spread) spawnEnemyBullet(state, boss, offset, 150, boss.phase === 3 ? 'boss-sweep' : 'enemy-volley');
  }
  if (age >= cycleLength) {
    boss.cycleStartedAt = state.tick;
    boss.fanAngle = Math.atan2(state.player.y - boss.y, state.player.x - boss.x);
    boss.fanWarningUntil = state.tick + 90;
    boss.fanFiresAt = state.tick + 90;
    state.metrics.boss.fanWarnings += 1;
    events.push({ type: 'boss-warning' });
  }
};

const spawnDueEncounters = (state: GameState): void => {
  const stage = stageDefinition(state.stageId);
  while (state.encounterIndex < stage.spawns.length && stage.spawns[state.encounterIndex].tick <= state.tick) {
    const encounter = stage.spawns[state.encounterIndex];
    if (state.enemies.length < stage.entityLimits.enemies) {
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

export const stageTwoWindDirection = (tick: number): -1 | 1 =>
  Math.floor(tick / STAGE_02_WIND_HALF_CYCLE_TICKS) % 2 === 0 ? 1 : -1;

export const effectiveStageTwoWindDirection = (state: GameState): -1 | 1 =>
  state.boss?.kind === 'crosswind-compiler' && state.boss.windLockedUntil >= state.tick
    ? state.boss.lockedWindDirection : stageTwoWindDirection(state.tick);

const applyCrosswind = (state: GameState, events?: GameEvent[]): void => {
  if (state.stageId !== 'stage-02') return;
  const direction = effectiveStageTwoWindDirection(state);
  const playerDrift = direction * Math.round(0.18 * SCALE);
  const trailDrift = direction * Math.round(0.35 * SCALE);
  if (state.tick > 0 && state.tick < stageDefinition(state.stageId).durationTicks
    && state.tick % STAGE_02_WIND_HALF_CYCLE_TICKS === 0) {
    state.metrics.wind.reversals += 1;
    if (!(state.boss?.kind === 'crosswind-compiler' && state.boss.windLockedUntil >= state.tick)) {
      events?.push({ type: 'wind-reversed', direction });
    }
  }
  state.player.x = clamp(state.player.x + playerDrift, PLAYER_RADIUS * SCALE, (WIDTH - PLAYER_RADIUS) * SCALE);
  for (const point of state.trail) point.x += trailDrift;
  if (state.candidate) {
    state.candidate.intersection.x += trailDrift;
    for (const point of state.candidate.polygon) point.x += trailDrift;
  }
  state.metrics.wind.playerDrift += Math.abs(playerDrift);
  state.metrics.wind.trailDrift += Math.abs(trailDrift) * state.trail.length;
};

const applyRain = (state: GameState, events: GameEvent[]): void => {
  if (state.stageId !== 'stage-03') return;
  const dropIndex = Math.floor(state.tick / STAGE_03_RAIN_PERIOD_TICKS);
  if (state.tick % STAGE_03_RAIN_PERIOD_TICKS === 0) state.metrics.rain.drops += 1;
  let newlyWetted = false;
  // Eight deterministic drops are in flight. A point is wetted only when the
  // visible drop crosses it, so identical input always creates identical sag.
  for (let offset = 0; offset < 8; offset += 1) {
    const index = dropIndex - offset;
    if (index < 0) continue;
    const age = state.tick - index * STAGE_03_RAIN_PERIOD_TICKS;
    const x = (90 + (index * 353) % 1100) * SCALE;
    const y = age * 5 * SCALE;
    for (const point of state.trail) {
      if (Math.abs(point.x - x) <= 14 * SCALE && Math.abs(point.y - y) <= 16 * SCALE) {
        if ((point.wetUntil ?? 0) < state.tick) {
          state.metrics.rain.trailPointsWetted += 1;
          newlyWetted = true;
        }
        point.wetUntil = state.tick + STAGE_03_WET_TICKS;
      }
    }
  }
  if (newlyWetted) events.push({ type: 'trail-wetted' });
  let wet = 0;
  for (const point of state.trail) {
    if ((point.wetUntil ?? 0) < state.tick) continue;
    point.y = Math.min((HEIGHT - 8) * SCALE, point.y + Math.round(0.22 * SCALE));
    wet += 1;
  }
  state.metrics.rain.wetTrailPeak = Math.max(state.metrics.rain.wetTrailPeak, wet);
  if (state.candidate && state.candidate.polygon.some((point) => point.y >= HEIGHT * SCALE)) state.candidate = null;
};

const coolTrailNear = (state: GameState, center: Point, radiusPx: number): number => {
  let cooled = 0;
  for (const point of state.trail) {
    if (distanceSq(point, center) > (radiusPx * SCALE) ** 2) continue;
    if ((point.cooledUntil ?? 0) < state.tick) cooled += 1;
    point.cooledUntil = Math.max(point.cooledUntil ?? 0, state.tick + STAGE_04_COOLING_EXTENSION_TICKS);
  }
  state.metrics.heat.trailPointsCooled += cooled;
  return cooled;
};

const burnOldestTrail = (state: GameState, count: number): number => {
  const burnable = state.trail
    .filter((point) => (point.cooledUntil ?? 0) < state.tick && state.tick - point.bornTick >= 150)
    .sort((a, b) => a.bornTick - b.bornTick || a.segmentId - b.segmentId)
    .slice(0, count);
  if (burnable.length === 0) return 0;
  const ids = new Set(burnable.map((point) => point.segmentId));
  state.trail = state.trail.filter((point) => !ids.has(point.segmentId));
  state.candidate = null;
  state.metrics.heat.trailPointsBurned += burnable.length;
  return burnable.length;
};

const applyHeat = (state: GameState): void => {
  if (state.stageId !== 'stage-04') return;
  const center = stageFourCoolingCenter(state.tick);
  coolTrailNear(state, { x: center.x * SCALE, y: center.y * SCALE }, STAGE_04_COOLING_RADIUS_PX);
  if (state.tick % STAGE_04_HEAT_PERIOD_TICKS === 0) {
    state.metrics.heat.waves += 1;
    burnOldestTrail(state, 1);
  }
  const cooled = state.trail.filter((point) => (point.cooledUntil ?? 0) >= state.tick).length;
  state.metrics.heat.cooledTrailPeak = Math.max(state.metrics.heat.cooledTrailPeak, cooled);
};

const updateEnemy = (state: GameState, enemy: Enemy, events: GameEvent[]): void => {
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

  if (enemy.kind === 'index-kite') {
    const wind = stageTwoWindDirection(state.tick);
    enemy.x = enemy.spawnX - Math.min(age, 170) * 2.2 * SCALE + wind * Math.round(Math.sin((age + enemy.phase) / 55) * 34 * SCALE);
    enemy.y = enemy.baseY + Math.round(Math.sin((age + enemy.phase) / 82) * enemy.amplitude * SCALE);
    if (enemy.state === 'exiting') enemy.x += (state.tick - (enemy.expiresAt - 120)) * 3 * SCALE;
    if (enemy.fireCooldown <= 0) {
      for (const offset of [-0.12, 0.12]) spawnEnemyBullet(state, enemy, offset, 126);
      enemy.fireCooldown = 216;
      state.metrics.enemyStats[enemy.kind].attacks += 1;
    }
    return;
  }

  if (enemy.kind === 'vane-scribe') {
    enemy.x = Math.max(1015 * SCALE, enemy.spawnX - Math.min(age, 120) * 2.5 * SCALE);
    enemy.y = enemy.baseY + Math.round(Math.sin((age + enemy.phase) / 150) * enemy.amplitude * SCALE);
    if (enemy.state === 'exiting') enemy.x += (state.tick - (enemy.expiresAt - 120)) * 3 * SCALE;
    if (enemy.fireCooldown <= 0) {
      const windBias = stageTwoWindDirection(state.tick) * 0.16;
      for (const offset of [-0.32, -0.16, 0, 0.16, 0.32]) spawnEnemyBullet(state, enemy, offset + windBias, 112);
      enemy.fireCooldown = 264;
      state.metrics.enemyStats[enemy.kind].attacks += 1;
    }
    return;
  }

  if (enemy.kind === 'cross-reference-pair') {
    enemy.x = Math.max(1005 * SCALE, enemy.spawnX - Math.min(age, 135) * 2.4 * SCALE);
    enemy.y = enemy.baseY + Math.round(Math.sin((age + enemy.phase) / 120) * enemy.amplitude * SCALE * enemy.lane);
    if (enemy.state === 'exiting') enemy.x += (state.tick - (enemy.expiresAt - 120)) * 3 * SCALE;
    if (enemy.fireCooldown <= 0) {
      const origin = { x: enemy.x, y: enemy.y - enemy.lane * 52 * SCALE };
      for (const offset of [-0.18, 0, 0.18]) spawnEnemyBullet(state, origin, offset, 120);
      enemy.fireCooldown = 228;
      state.metrics.enemyStats[enemy.kind].attacks += 1;
    }
    return;
  }

  if (enemy.kind === 'tab-binder') {
    const wind = stageTwoWindDirection(state.tick);
    enemy.x = Math.max(960 * SCALE, enemy.spawnX - Math.min(age, 150) * 2.2 * SCALE + wind * 32 * SCALE);
    enemy.y = enemy.baseY + Math.round(Math.sin((age + enemy.phase) / 135) * enemy.amplitude * SCALE);
    if (enemy.state === 'exiting') enemy.x += (state.tick - (enemy.expiresAt - 120)) * 3 * SCALE;
    if (enemy.fireCooldown <= 0) {
      for (const offset of [-0.42, -0.28, -0.14, 0, 0.14, 0.28, 0.42]) spawnEnemyBullet(state, enemy, offset, 104);
      enemy.fireCooldown = 204;
      state.metrics.enemyStats[enemy.kind].attacks += 1;
    }
    return;
  }

  if (enemy.kind === 'drip-scribe') {
    enemy.x = Math.max(990 * SCALE, enemy.spawnX - Math.min(age, 130) * 2.4 * SCALE);
    enemy.y = enemy.baseY + Math.round(Math.sin((age + enemy.phase) / 96) * enemy.amplitude * SCALE);
    if (enemy.state === 'exiting') enemy.x += (state.tick - (enemy.expiresAt - 120)) * 3 * SCALE;
    if (enemy.fireCooldown <= 0) {
      for (const offset of [-0.2, 0, 0.2]) spawnEnemyBullet(state, enemy, offset, 118);
      enemy.fireCooldown = 210; state.metrics.enemyStats[enemy.kind].attacks += 1;
    }
    return;
  }

  if (enemy.kind === 'gutter-frog') {
    enemy.x = Math.max(940 * SCALE, enemy.spawnX - Math.min(age, 150) * 2.6 * SCALE);
    const leap = Math.abs(Math.sin((age + enemy.phase) / 115));
    enemy.y = enemy.baseY - enemy.lane * Math.round(leap * enemy.amplitude * SCALE);
    if (enemy.state === 'exiting') enemy.x += (state.tick - (enemy.expiresAt - 120)) * 3 * SCALE;
    if (enemy.fireCooldown <= 0) {
      for (const offset of [-0.55, -0.28, 0, 0.28, 0.55]) spawnEnemyBullet(state, enemy, offset, 108);
      enemy.fireCooldown = 264; state.metrics.enemyStats[enemy.kind].attacks += 1;
    }
    return;
  }

  if (enemy.kind === 'basin-bell') {
    enemy.x = Math.max(965 * SCALE, enemy.spawnX - Math.min(age, 150) * 2.1 * SCALE);
    enemy.y = enemy.baseY + Math.round(Math.sin((age + enemy.phase) / 145) * enemy.amplitude * SCALE);
    if (enemy.state === 'exiting') enemy.x += (state.tick - (enemy.expiresAt - 120)) * 3 * SCALE;
    if (enemy.fireCooldown <= 0) {
      for (const point of state.trail) point.wetUntil = Math.max(point.wetUntil ?? 0, state.tick + STAGE_03_WET_TICKS);
      for (const offset of [-0.36, -0.18, 0, 0.18, 0.36]) spawnEnemyBullet(state, enemy, offset, 102);
      enemy.fireCooldown = 300; state.metrics.enemyStats[enemy.kind].attacks += 1; state.metrics.rain.basinSurges += 1;
      events.push({ type: 'basin-surge' });
    }
    return;
  }

  if (enemy.kind === 'reed-needle') {
    const wetTarget = state.trail.filter((point) => (point.wetUntil ?? 0) >= state.tick)
      .sort((a, b) => distanceSq(enemy, a) - distanceSq(enemy, b) || a.segmentId - b.segmentId)[0];
    if (wetTarget) moveTowardPoint(enemy, wetTarget, 245);
    else {
      enemy.x = Math.max(930 * SCALE, enemy.spawnX - Math.min(age, 150) * 2.8 * SCALE);
      enemy.y = enemy.baseY + Math.round(Math.sin((age + enemy.phase) / 90) * enemy.amplitude * SCALE);
    }
    if (enemy.fireCooldown <= 0) {
      spawnEnemyBullet(state, enemy, 0, 190); enemy.fireCooldown = 228;
      state.metrics.enemyStats[enemy.kind].attacks += 1; state.metrics.rain.needleDashes += 1;
    }
    return;
  }

  if (enemy.kind === 'ash-comma') {
    enemy.x = Math.max(980 * SCALE, enemy.spawnX - Math.min(age, 145) * 2.5 * SCALE);
    enemy.y = enemy.baseY + Math.round(Math.sin((age + enemy.phase) / 78) * enemy.amplitude * SCALE);
    if (enemy.state === 'exiting') enemy.x += (state.tick - (enemy.expiresAt - 120)) * 3 * SCALE;
    if (enemy.fireCooldown <= 0) {
      for (const offset of [-0.22, 0.22]) spawnEnemyBullet(state, enemy, offset, 124);
      enemy.fireCooldown = 216; state.metrics.enemyStats[enemy.kind].attacks += 1;
    }
    return;
  }

  if (enemy.kind === 'kiln-censor') {
    enemy.x = Math.max(970 * SCALE, enemy.spawnX - Math.min(age, 140) * 2.2 * SCALE);
    enemy.y = enemy.baseY + Math.round(Math.sin((age + enemy.phase) / 155) * enemy.amplitude * SCALE);
    if (enemy.state === 'exiting') enemy.x += (state.tick - (enemy.expiresAt - 120)) * 3 * SCALE;
    if (enemy.fireCooldown <= 0) {
      burnOldestTrail(state, 5);
      for (const offset of [-0.26, 0, 0.26]) spawnEnemyBullet(state, enemy, offset, 108);
      enemy.fireCooldown = 276; state.metrics.enemyStats[enemy.kind].attacks += 1; state.metrics.heat.censorBrands += 1;
    }
    return;
  }

  if (enemy.kind === 'ember-courier') {
    enemy.x = Math.max(925 * SCALE, enemy.spawnX - Math.min(age, 165) * 2.8 * SCALE);
    enemy.y = enemy.baseY + Math.round(Math.sin((age + enemy.phase) / 92) * enemy.amplitude * SCALE);
    if (enemy.state === 'exiting') enemy.x += (state.tick - (enemy.expiresAt - 120)) * 3 * SCALE;
    if (enemy.fireCooldown <= 0) {
      for (const offset of [-0.34, 0, 0.34]) spawnEnemyBullet(state, enemy, offset, 142);
      enemy.fireCooldown = 240; state.metrics.enemyStats[enemy.kind].attacks += 1;
    }
    return;
  }

  if (enemy.kind === 'char-press') {
    enemy.x = Math.max(955 * SCALE, enemy.spawnX - Math.min(age, 150) * 2.1 * SCALE);
    const closure = (1 - Math.abs(Math.sin((age + enemy.phase) / 145))) * 92;
    enemy.y = enemy.baseY - enemy.lane * Math.round(closure * SCALE);
    if (enemy.state === 'exiting') enemy.x += (state.tick - (enemy.expiresAt - 120)) * 3 * SCALE;
    if (enemy.fireCooldown <= 0) {
      for (const offset of [-0.54, -0.36, -0.18, 0, 0.18, 0.36, 0.54]) spawnEnemyBullet(state, enemy, offset, 106);
      enemy.fireCooldown = 300; state.metrics.enemyStats[enemy.kind].attacks += 1; state.metrics.heat.pressClosures += 1;
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

const updatePlayer = (state: GameState, input: InputFrame, events: GameEvent[]): void => {
  if (state.retrace) {
    state.retrace.index += 1;
    const point = state.retrace.points[Math.min(state.retrace.index, state.retrace.points.length - 1)];
    state.player.x = point.x;
    state.player.y = point.y;
    if (state.retrace.index >= state.retrace.points.length - 1) { state.retrace = null; events.push({ type: 'retrace-ended' }); }
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
    const targets: Point[] = [...state.enemies, ...(state.boss ? [state.boss] : [])];
    const target = targets.sort((a, b) => distanceSq(a, captured) - distanceSq(b, captured))[0];
    if (!target) continue;
    const dx = target.x - captured.x;
    const dy = target.y - captured.y;
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
  if (state.stageId === 'stage-02') {
    if (stageTwoWindDirection(state.tick) < 0) state.metrics.wind.collatesLeft += 1;
    else state.metrics.wind.collatesRight += 1;
    const phase = state.tick % STAGE_02_WIND_HALF_CYCLE_TICKS;
    if (phase <= 180 || phase >= STAGE_02_WIND_HALF_CYCLE_TICKS - 180) state.metrics.wind.collatesNearReversal += 1;
    if (state.boss?.kind === 'crosswind-compiler') {
      const vane = { x: state.boss.x - 100 * SCALE, y: state.boss.y + state.boss.vaneSide * 108 * SCALE };
      if (pointInPolygon(vane, candidate.polygon)) {
        state.boss.lockedWindDirection = stageTwoWindDirection(state.tick);
        state.boss.windLockedUntil = state.tick + 6 * TICK_RATE;
        state.boss.seamExposedUntil = state.tick + 6 * TICK_RATE;
        state.metrics.compiler.windLocks += 1;
        events.push({ type: 'compiler-wind-locked', direction: state.boss.lockedWindDirection });
        events.push({ type: 'compiler-seam-exposed', side: state.boss.vaneSide === 1 ? -1 : 1 });
      }
    }
  }
  if (state.stageId === 'stage-03' && state.boss?.kind === 'lacuna-eel') {
    const segment = state.boss.activeSegment;
    const weakpoint = eelSegmentPoint(state.boss, state.tick, segment);
    if (pointInPolygon(weakpoint, candidate.polygon)) {
      state.boss.segmentMarkedUntil = state.tick + 6 * TICK_RATE;
      state.metrics.eel.segmentMarks += 1;
      events.push({ type: 'eel-segment-marked', segment });
    }
  }
  if (state.stageId === 'stage-04') {
    const cooling = stageFourCoolingCenter(state.tick);
    if (pointInPolygon({ x: cooling.x * SCALE, y: cooling.y * SCALE }, candidate.polygon)) {
      state.metrics.heat.coolingCollates += 1;
    }
    const center = candidate.polygon.reduce((sum, point) => ({ x: sum.x + point.x / candidate.polygon.length, y: sum.y + point.y / candidate.polygon.length }), { x: 0, y: 0 });
    for (const enemy of state.enemies) {
      if (enemy.kind !== 'ember-courier'
        || (!pointInPolygon(enemy, candidate.polygon) && distanceSq(enemy, center) > (160 * SCALE) ** 2)) continue;
      enemy.markedUntil = state.tick + 8 * TICK_RATE;
      enemy.health = Math.max(1, enemy.health - 60);
      coolTrailNear(state, enemy, 230);
      state.metrics.heat.courierConversions += 1;
    }
  }
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
  applyCrosswind(state, events);
  updatePlayer(state, input, events);

  spawnDueEncounters(state);
  updateBoss(state, events);

  applyHeat(state);
  state.trail = state.trail.filter((point) => state.tick - point.bornTick <= TRAIL_LIFETIME || (point.cooledUntil ?? 0) >= state.tick);
  applyRain(state, events);
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

  for (const enemy of state.enemies) updateEnemy(state, enemy, events);

  for (const bullet of state.bullets) {
    const from = { x: bullet.x, y: bullet.y };
    bullet.x += bullet.vx;
    bullet.y += bullet.vy;
    if (bullet.kind === 'player' && !bullet.annotated && shotCrossedTrail(from, bullet, state.trail)) {
      bullet.annotated = true;
      bullet.wetAnnotated = shotCrossedWetTrail(from, bullet, state.trail, state.tick);
      bullet.vx = Math.round(bullet.vx * (bullet.wetAnnotated ? 1.28 : 1.15));
      state.metrics.annotatedShots += 1;
      if (bullet.wetAnnotated) state.metrics.rain.wetAnnotatedShots += 1;
      events.push(bullet.wetAnnotated ? { type: 'wet-annotation' } : { type: 'shot-annotated' });
    }
  }

  if (input.collate) collate(state, events);

  const remaining: Bullet[] = [];
  const defeated = new Set<number>();
  for (const bullet of state.bullets) {
    let consumed = false;
    if (bullet.kind !== 'enemy') {
      const boss = state.boss;
      if (boss?.kind === 'lacuna-eel') {
        const segment = boss.activeSegment;
        const weakpoint = eelSegmentPoint(boss, state.tick, segment);
        const segmentHit = boss.segmentMarkedUntil >= state.tick
          && distanceSq(bullet, weakpoint) <= ((bullet.radius + 34) * SCALE) ** 2;
        const bodyHit = distanceSq(bullet, boss) <= ((bullet.radius + 96) * SCALE) ** 2;
        if (segmentHit || bodyHit) {
          const damage = segmentHit
            ? (bullet.wetAnnotated ? 96 : bullet.kind === 'return' ? 30 : bullet.annotated ? 18 : 8)
            : (bullet.kind === 'return' ? 5 : bullet.annotated ? 2 : 1);
          boss.health -= damage;
          if (segmentHit) {
            state.metrics.eel.weakpointHits += 1;
            if (bullet.wetAnnotated) state.metrics.eel.wetWeakpointHits += 1;
            events.push({ type: 'eel-segment-hit', segment });
          } else state.metrics.eel.ordinaryHits += 1;
          const nextPhase = boss.health <= boss.maxHealth / 3 ? 3 : boss.health <= boss.maxHealth * 2 / 3 ? 2 : 1;
          if (nextPhase > boss.phase) {
            boss.phase = nextPhase;
            boss.phaseStartedAt = state.tick;
            boss.cycleStartedAt = state.tick;
            boss.activeSegment = (nextPhase - 1) as 0 | 1 | 2;
            boss.segmentMarkedUntil = 0;
            state.metrics.boss.phaseReached[nextPhase - 1] = true;
            state.metrics.eel.phaseReached[nextPhase - 1] = true;
            events.push({ type: 'boss-phase', phase: nextPhase });
          }
          if (boss.health <= 0) {
            boss.health = 0; boss.defeatedAt = state.tick;
            state.metrics.boss.defeated = true; state.metrics.boss.defeatTick = state.tick;
            state.score += 35000; events.push({ type: 'boss-defeated' }); state.boss = null;
          }
          consumed = true;
        }
      } else if (boss?.kind === 'crosswind-compiler') {
        const seam = { x: boss.x - 100 * SCALE, y: boss.y - boss.vaneSide * 108 * SCALE };
        const seamHit = boss.seamExposedUntil >= state.tick && distanceSq(bullet, seam) <= ((bullet.radius + 28) * SCALE) ** 2;
        const bodyHit = distanceSq(bullet, boss) <= ((bullet.radius + 88) * SCALE) ** 2;
        if (seamHit || bodyHit) {
          const damage = seamHit ? (bullet.kind === 'return' ? 88 : bullet.annotated ? 58 : 44) : (bullet.kind === 'return' ? 6 : bullet.annotated ? 2 : 1);
          boss.health -= damage;
          if (seamHit) {
            state.metrics.compiler.weakpointHits += 1;
            events.push({ type: 'compiler-seam-hit' });
          }
          else state.metrics.compiler.ordinaryHits += 1;
          const nextPhase = boss.health <= boss.maxHealth / 3 ? 3 : boss.health <= boss.maxHealth * 2 / 3 ? 2 : 1;
          if (nextPhase > boss.phase) {
            boss.phase = nextPhase;
            boss.phaseStartedAt = state.tick;
            boss.cycleStartedAt = state.tick;
            boss.vaneSide = boss.vaneSide === 1 ? -1 : 1;
            boss.windLockedUntil = 0;
            boss.seamExposedUntil = 0;
            state.metrics.boss.phaseReached[nextPhase - 1] = true;
            state.metrics.compiler.phaseReached[nextPhase - 1] = true;
            events.push({ type: 'boss-phase', phase: nextPhase });
          }
          if (boss.health <= 0) {
            boss.health = 0; boss.defeatedAt = state.tick;
            state.metrics.boss.defeated = true; state.metrics.boss.defeatTick = state.tick;
            state.score += 30000; events.push({ type: 'boss-defeated' }); state.boss = null;
          }
          consumed = true;
        }
      } else if (boss && distanceSq(bullet, boss) <= ((bullet.radius + 92) * SCALE) ** 2) {
        const returned = bullet.kind === 'return';
        if (boss.armorLayers > 0) {
          const damage = returned ? 90 : bullet.annotated ? 3 : 1;
          boss.armor -= damage;
          if (returned) state.metrics.boss.returnedHits += 1;
          else state.metrics.boss.ordinaryHits += 1;
          if (boss.armor <= 0) {
            boss.armorLayers -= 1;
            state.metrics.boss.armorLayersStripped += 1;
            if (boss.armorLayers > 0) boss.armor = boss.maxArmor;
            const nextPhase = Math.min(3, 4 - boss.armorLayers) as 1 | 2 | 3;
            if (nextPhase > boss.phase) {
              boss.phase = nextPhase;
              boss.phaseStartedAt = state.tick;
              boss.cycleStartedAt = state.tick;
              state.metrics.boss.phaseReached[nextPhase - 1] = true;
              events.push({ type: 'boss-phase', phase: nextPhase });
            }
          }
        } else {
          const damage = returned ? 72 : bullet.annotated ? 28 : 4;
          boss.health -= damage;
          if (returned) state.metrics.boss.returnedHits += 1;
          else state.metrics.boss.ordinaryHits += 1;
          if (boss.health <= 0) {
            boss.health = 0;
            boss.defeatedAt = state.tick;
            state.metrics.boss.defeated = true;
            state.metrics.boss.defeatTick = state.tick;
            state.score += 25000;
            events.push({ type: 'boss-defeated' });
            state.boss = null;
          }
        }
        consumed = true;
      }
      for (const enemy of state.enemies) {
        if (consumed) break;
        if (defeated.has(enemy.id)) continue;
        if (distanceSq(bullet, enemy) <= ((bullet.radius + enemy.radius) * SCALE) ** 2) {
          // A successful loop must repay the travel and firing opportunity cost.
          // M1 measurement showed 9 damage left ordinary tracking fire dominant.
          let damage = bullet.kind === 'return' ? 16 : bullet.wetAnnotated ? 18 : bullet.annotated && enemy.markedUntil >= state.tick ? 28 : bullet.annotated ? 6 : 4;
          if (bullet.wetAnnotated) state.metrics.rain.wetDamage += damage;
          if (enemy.kind === 'folio-hauler') {
            // Ordinary fire hits the broad front plate. Returned fire and shots
            // carried around its rear edge by a loop reach the exposed binding.
            const rearHit = bullet.x > enemy.x + 12 * SCALE;
            damage = bullet.kind === 'return' ? 32 : rearHit ? damage * 2 : Math.min(2, damage);
          }
          enemy.health -= damage;
          consumed = true;
          if (enemy.health <= 0) {
            state.score += enemy.kind === 'folio-hauler' || enemy.kind === 'tab-binder' || enemy.kind === 'basin-bell' || enemy.kind === 'char-press' ? 5000
              : enemy.kind === 'margin-skiff' || enemy.kind === 'vane-scribe' ? 1600
                : enemy.kind === 'bracket-gull' || enemy.kind === 'cross-reference-pair' ? 1000 : 700;
            events.push({ type: 'enemy-defeated' });
            defeated.add(enemy.id);
            state.metrics.enemiesDefeated += 1;
            state.metrics.enemyStats[enemy.kind].defeated += 1;
            if (enemy.kind === 'ash-comma') {
              coolTrailNear(state, enemy, 190);
              state.metrics.heat.ashCoolingBursts += 1;
            }
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
      state.player.health = Math.max(0, state.player.health - 1);
      state.player.invulnerableUntil = state.tick + 132;
      // Compiler pressure displaces the pilot but does not erase writing; its
      // boss lesson is completing a wind-bent loop, not restarting one after
      // every graze. Erasure remains a property of the Bailiff and Mites.
      const compilerPressure = bullet.sourceAttack === 'compiler-gust'
        || bullet.sourceAttack === 'compiler-lance' || bullet.sourceAttack === 'compiler-storm';
      if (!compilerPressure) {
        state.trail = [];
        state.candidate = null;
      }
      state.metrics.damage += 1;
      if (bullet.sourceAttack === 'boss-fan') state.metrics.boss.damageByAttack.fan += 1;
      else if (bullet.sourceAttack === 'boss-sweep') state.metrics.boss.damageByAttack.sweep += 1;
      else if (bullet.sourceAttack === 'compiler-gust') state.metrics.compiler.damageByAttack.gust += 1;
      else if (bullet.sourceAttack === 'compiler-lance') state.metrics.compiler.damageByAttack.lance += 1;
      else if (bullet.sourceAttack === 'compiler-storm') state.metrics.compiler.damageByAttack.storm += 1;
      else if (bullet.sourceAttack === 'eel-drizzle') state.metrics.eel.damageByAttack.drizzle += 1;
      else if (bullet.sourceAttack === 'eel-wake') state.metrics.eel.damageByAttack.wake += 1;
      else if (bullet.sourceAttack === 'eel-deluge') state.metrics.eel.damageByAttack.deluge += 1;
      else if (state.boss) state.metrics.boss.damageByAttack.volley += 1;
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
