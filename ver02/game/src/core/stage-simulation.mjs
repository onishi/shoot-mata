import { parseStageDefinition } from "../content/stage-schema.mjs";
import { createStageSchedule } from "./stage-schedule.mjs";
import {
  collectReactorCore,
  createReactorLoadout,
  describeReactorLoadout,
  getWeaponProfile,
  loseReactorCore,
} from "./reactor-loadout.mjs";

const PLAYER_START = Object.freeze({ x: 0.18, y: 0.5 });
const PLAYER_SPEED_PER_TICK = 0.012;
const ENEMY_SPEED_PER_TICK = 0.006;
const PLAYER_SHOT_SPEED_PER_TICK = 0.045;
const ENEMY_SHOT_SPEED_PER_TICK = 0.018;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function normalizedCommand(input = {}) {
  return {
    moveX: clamp(Number.isFinite(input.moveX) ? input.moveX : 0, -1, 1),
    moveY: clamp(Number.isFinite(input.moveY) ? input.moveY : 0, -1, 1),
    fire: input.fire === true,
  };
}

function createScoreBreakdown() {
  return { enemy: 0, core: 0, streak: 0, noHit: 0 };
}

export function createStageSimulation(stageInput, options = {}) {
  const stage = parseStageDefinition(stageInput);
  const seed = options.seed ?? 0;
  const schedule = createStageSchedule(stage, seed);
  const lives = options.lives ?? 3;
  if (!Number.isInteger(lives) || lives < 1) throw new TypeError("lives must be a positive integer");
  const loadout = createReactorLoadout(options.coreQueue ?? ["red"]);
  return {
    stageId: stage.id,
    seed,
    tick: 0,
    status: "playing",
    flowEvent: null,
    player: { ...PLAYER_START, lives, invulnerabilityTicks: 0 },
    loadout,
    enemies: [],
    playerShots: [],
    enemyShots: [],
    pickups: [],
    boss: null,
    nextSpawnIndex: 0,
    nextShotId: 0,
    fireCooldownTicks: 0,
    streak: 0,
    hitsTaken: 0,
    score: 0,
    scoreBreakdown: createScoreBreakdown(),
    events: [],
    schedule,
  };
}

function emit(state, type, detail = {}) {
  state.events.push({ tick: state.tick, type, ...detail });
}

function spawnScheduledEnemies(state, stage) {
  const enemyTypes = new Map(stage.enemyTypes.map((enemy) => [enemy.id, enemy]));
  while (state.nextSpawnIndex < state.schedule.spawns.length
    && state.schedule.spawns[state.nextSpawnIndex].tick === state.tick) {
    const spawn = state.schedule.spawns[state.nextSpawnIndex];
    const type = enemyTypes.get(spawn.enemyTypeId);
    state.enemies.push({
      id: `${spawn.waveId}-${state.nextSpawnIndex}`,
      typeId: spawn.enemyTypeId,
      assetId: type.assetId,
      behaviorId: type.behaviorId,
      x: 1.05,
      y: spawn.lane,
      originY: spawn.lane,
      hitPoints: type.hitPoints,
      maximumHitPoints: type.hitPoints,
      score: type.score,
      collisionRadius: type.collisionRadius / 720,
      dropItemId: spawn.dropItemId.replace("core-", ""),
      ageTicks: 0,
    });
    emit(state, "enemy-spawned", { enemyId: `${spawn.waveId}-${state.nextSpawnIndex}` });
    state.nextSpawnIndex += 1;
  }
}

function spawnBoss(state, stage) {
  if (state.boss !== null || state.tick < state.schedule.boss.startTick) return;
  const phases = stage.boss.phases.map((phase) => ({
    id: phase.id,
    hitPoints: phase.hitPoints,
    maximumHitPoints: phase.hitPoints,
  }));
  state.boss = {
    id: stage.boss.id,
    assetId: stage.boss.assetId,
    x: 0.82,
    y: 0.5,
    phaseIndex: 0,
    phases,
    defeated: false,
    ageTicks: 0,
  };
  emit(state, "boss-entered", { bossId: state.boss.id });
}

function movePlayer(state, command) {
  const magnitude = Math.hypot(command.moveX, command.moveY) || 1;
  state.player.x = clamp(state.player.x + (command.moveX / magnitude) * PLAYER_SPEED_PER_TICK, 0.06, 0.72);
  state.player.y = clamp(state.player.y + (command.moveY / magnitude) * PLAYER_SPEED_PER_TICK, 0.12, 0.88);
  state.player.invulnerabilityTicks = Math.max(0, state.player.invulnerabilityTicks - 1);
}

function firePlayerWeapon(state, command) {
  state.fireCooldownTicks = Math.max(0, state.fireCooldownTicks - 1);
  if (!command.fire || state.fireCooldownTicks > 0) return;
  const weapon = getWeaponProfile(state.loadout);
  if (weapon.damage === 0) return;
  for (let index = 0; index < weapon.projectileCount; index += 1) {
    const spread = weapon.projectileCount === 1 ? 0 : (index - (weapon.projectileCount - 1) / 2) * 0.018;
    state.playerShots.push({
      id: `player-shot-${state.nextShotId++}`,
      x: state.player.x + 0.04,
      y: clamp(state.player.y + spread, 0.05, 0.95),
      damage: weapon.damage,
      pierce: weapon.pierce,
      seeking: weapon.seeking === true,
    });
  }
  state.fireCooldownTicks = weapon.cooldownTicks;
}

function nearestTarget(state, shot) {
  const targets = state.enemies.filter((enemy) => enemy.x >= shot.x);
  if (state.boss && !state.boss.defeated) targets.push(state.boss);
  return targets.sort((left, right) => Math.hypot(left.x - shot.x, left.y - shot.y)
    - Math.hypot(right.x - shot.x, right.y - shot.y))[0] ?? null;
}

function moveCombatants(state) {
  for (const enemy of state.enemies) {
    enemy.ageTicks += 1;
    const speed = enemy.behaviorId === "armored-drift"
      ? ENEMY_SPEED_PER_TICK * 0.55
      : enemy.behaviorId === "sine-left" ? ENEMY_SPEED_PER_TICK * 1.2 : ENEMY_SPEED_PER_TICK;
    enemy.x -= speed;
    if (enemy.behaviorId === "sine-left") {
      enemy.y = clamp(enemy.originY + Math.sin(enemy.ageTicks / 18) * 0.1, 0.12, 0.88);
    }
    const firingInterval = enemy.behaviorId === "armored-drift" ? 64 : 90;
    if (enemy.ageTicks >= 50 && enemy.ageTicks % firingInterval === 0) {
      state.enemyShots.push({
        id: `enemy-shot-${state.nextShotId++}`,
        x: enemy.x,
        y: enemy.y,
        vx: -ENEMY_SHOT_SPEED_PER_TICK,
        vy: clamp((state.player.y - enemy.y) / 36, -0.009, 0.009),
      });
    }
  }
  if (state.boss && !state.boss.defeated) {
    state.boss.ageTicks += 1;
    const phase = state.boss.phases[state.boss.phaseIndex];
    const phaseAge = state.boss.ageTicks;
    const isRush = phase.id === "exposed-reactor";
    state.boss.y = 0.5 + Math.sin(phaseAge / (isRush ? 24 : 45)) * (isRush ? 0.29 : 0.22);
    const interval = phase.id === "salvage-crossfire" ? 42 : isRush ? 30 : 54;
    if (phaseAge % interval === 0) {
      const offsets = phase.id === "salvage-crossfire" ? [-0.018, 0, 0.018] : [0];
      for (const offset of offsets) {
        state.enemyShots.push({
          id: `boss-shot-${state.nextShotId++}`,
          x: state.boss.x - 0.05,
          y: clamp(state.boss.y + offset, 0.05, 0.95),
          vx: isRush ? -0.028 : -0.022,
          vy: clamp((state.player.y - state.boss.y) / 32, -0.012, 0.012) + offset / 2,
        });
      }
    }
  }
  for (const shot of state.playerShots) {
    if (shot.seeking) {
      const target = nearestTarget(state, shot);
      if (target) shot.y += clamp(target.y - shot.y, -0.025, 0.025);
    }
    shot.x += PLAYER_SHOT_SPEED_PER_TICK;
  }
  for (const shot of state.enemyShots) {
    shot.x += shot.vx;
    shot.y += shot.vy;
  }
  for (const pickup of state.pickups) pickup.x -= 0.004;
}

function damagePlayer(state, reason) {
  if (state.player.invulnerabilityTicks > 0 || state.status !== "playing") return false;
  const defenseBeforeHit = getWeaponProfile(state.loadout);
  const loss = loseReactorCore(state.loadout);
  state.hitsTaken += 1;
  state.streak = 0;
  state.player.invulnerabilityTicks = defenseBeforeHit.invulnerabilityTicks ?? 42;
  if (loss.lost === null) {
    state.player.lives -= 1;
    state.player.x = PLAYER_START.x;
    state.player.y = PLAYER_START.y;
  }
  emit(state, "player-hit", { reason, lostCore: loss.lost, lives: state.player.lives });
  if (state.player.lives <= 0) {
    state.status = "defeated";
    state.flowEvent = state.schedule.transitions.onDefeat;
    emit(state, "stage-defeated", { reason });
  }
  return true;
}

function destroyEnemy(state, enemy) {
  state.score += enemy.score;
  state.scoreBreakdown.enemy += enemy.score;
  state.streak += 1;
  const streakBonus = state.streak >= 3 ? 25 * state.streak : 0;
  state.score += streakBonus;
  state.scoreBreakdown.streak += streakBonus;
  state.pickups.push({ id: `drop-${enemy.id}`, x: enemy.x, y: enemy.y, core: enemy.dropItemId });
  emit(state, "enemy-destroyed", { enemyId: enemy.id, drop: enemy.dropItemId });
}

function damageBoss(state, damage) {
  const phase = state.boss.phases[state.boss.phaseIndex];
  phase.hitPoints -= damage;
  if (phase.hitPoints > 0) return;
  if (state.boss.phaseIndex < state.boss.phases.length - 1) {
    state.boss.phaseIndex += 1;
    state.boss.ageTicks = 0;
    emit(state, "boss-phase-changed", { phaseId: state.boss.phases[state.boss.phaseIndex].id });
    return;
  }
  state.boss.defeated = true;
  emit(state, "boss-defeated", { bossId: state.boss.id });
}

function resolvePlayerShots(state) {
  const deadEnemies = new Set();
  for (const shot of state.playerShots) {
    if (shot.dead) continue;
    const enemy = state.enemies.find((candidate) => !deadEnemies.has(candidate.id)
      && Math.abs(candidate.x - shot.x) <= 0.045 && Math.abs(candidate.y - shot.y) <= 0.075);
    if (enemy) {
      enemy.hitPoints -= shot.damage;
      if (enemy.hitPoints <= 0) {
        deadEnemies.add(enemy.id);
        destroyEnemy(state, enemy);
      }
      if (shot.pierce > 0) shot.pierce -= 1;
      else shot.dead = true;
      continue;
    }
    if (state.boss && !state.boss.defeated
      && Math.abs(state.boss.x - shot.x) <= 0.07 && Math.abs(state.boss.y - shot.y) <= 0.11) {
      damageBoss(state, shot.damage);
      if (shot.pierce > 0) shot.pierce -= 1;
      else shot.dead = true;
    }
  }
  state.enemies = state.enemies.filter((enemy) => !deadEnemies.has(enemy.id));
  state.playerShots = state.playerShots.filter((shot) => !shot.dead && shot.x <= 1.1);
}

function resolveThreats(state) {
  for (const enemy of state.enemies) {
    if (enemy.x <= state.player.x + 0.04 && Math.abs(enemy.y - state.player.y) <= 0.08) {
      enemy.dead = true;
      damagePlayer(state, "enemy-collision");
    } else if (enemy.x < -0.08) {
      enemy.dead = true;
      emit(state, "enemy-escaped", { enemyId: enemy.id });
    }
  }
  for (const shot of state.enemyShots) {
    if (Math.abs(shot.x - state.player.x) <= 0.035 && Math.abs(shot.y - state.player.y) <= 0.045) {
      shot.dead = true;
      damagePlayer(state, "enemy-shot");
    }
  }
  state.enemies = state.enemies.filter((enemy) => !enemy.dead);
  state.enemyShots = state.enemyShots.filter((shot) => !shot.dead && shot.x >= -0.05 && shot.y >= 0 && shot.y <= 1);
}

function resolvePickups(state) {
  const profile = getWeaponProfile(state.loadout);
  for (const pickup of state.pickups) {
    if (Math.hypot(pickup.x - state.player.x, pickup.y - state.player.y) <= profile.collectionRadius) {
      collectReactorCore(state.loadout, pickup.core);
      state.score += 75;
      state.scoreBreakdown.core += 75;
      pickup.collected = true;
      emit(state, "core-collected", { core: pickup.core });
    }
  }
  state.pickups = state.pickups.filter((pickup) => !pickup.collected && pickup.x >= -0.05);
}

function resolveHazards(state) {
  const active = state.schedule.hazards.find((hazard) => state.tick >= hazard.startTick && state.tick < hazard.endTick);
  if (!active || state.tick % 120 !== 0) return;
  if (active.behaviorId === "closing-corridor" && (state.player.y < 0.27 || state.player.y > 0.73)) {
    damagePlayer(state, "closing-corridor");
  }
}

function resolveTerminalState(state) {
  if (state.status !== "playing") return;
  if (state.boss?.defeated) {
    const noHitBonus = state.hitsTaken === 0 ? 1000 : 0;
    state.score += noHitBonus;
    state.scoreBreakdown.noHit += noHitBonus;
    state.status = "cleared";
    state.flowEvent = state.schedule.transitions.onClear;
    emit(state, "stage-cleared", { score: state.score });
    return;
  }
  if (state.tick + 1 >= state.schedule.durationTicks) {
    state.status = "defeated";
    state.flowEvent = state.schedule.transitions.onDefeat;
    emit(state, "stage-defeated", { reason: "boss-timeout" });
  }
}

export function stepStageSimulation(state, stageInput, input = {}) {
  if (!state || state.status !== "playing") return state;
  const stage = parseStageDefinition(stageInput);
  if (stage.id !== state.stageId) throw new Error("stage does not match simulation state");
  state.events = [];
  const command = normalizedCommand(input);
  spawnScheduledEnemies(state, stage);
  spawnBoss(state, stage);
  movePlayer(state, command);
  firePlayerWeapon(state, command);
  moveCombatants(state);
  resolvePlayerShots(state);
  resolveThreats(state);
  resolvePickups(state);
  resolveHazards(state);
  resolveTerminalState(state);
  if (state.status === "playing") state.tick += 1;
  return state;
}

export function createStageSimulationSnapshot(state) {
  const boss = state.boss && !state.boss.defeated
    ? {
      id: state.boss.id,
      phaseId: state.boss.phases[state.boss.phaseIndex].id,
      current: state.boss.phases.slice(state.boss.phaseIndex)
        .reduce((total, phase) => total + Math.max(0, phase.hitPoints), 0),
      maximum: state.boss.phases.reduce((total, phase) => total + phase.maximumHitPoints, 0),
    }
    : null;
  return {
    stageId: state.stageId,
    tick: state.tick,
    status: state.status,
    flowEvent: state.flowEvent,
    player: { ...state.player },
    coreQueue: [...state.loadout.queue],
    weapon: describeReactorLoadout(state.loadout),
    score: state.score,
    scoreBreakdown: { ...state.scoreBreakdown },
    hitsTaken: state.hitsTaken,
    boss,
    actors: [
      { id: "player", assetId: "player-interceptor", x: state.player.x, y: state.player.y, width: 0.12, height: 0.15, tone: "player" },
      ...state.enemies.map((enemy) => ({
        id: enemy.id,
        assetId: enemy.assetId,
        x: clamp(enemy.x, 0, 1),
        y: enemy.y,
        width: enemy.behaviorId === "armored-drift" ? 0.15 : 0.11,
        height: enemy.behaviorId === "armored-drift" ? 0.18 : 0.14,
        tone: "enemy",
      })),
      ...(state.boss && !state.boss.defeated ? [{
        id: state.boss.id,
        assetId: state.boss.assetId,
        x: state.boss.x,
        y: state.boss.y,
        width: 0.28,
        height: 0.46,
        tone: "boss",
      }] : []),
      ...state.pickups.map((pickup) => ({ id: pickup.id, assetId: `core-${pickup.core}`, x: clamp(pickup.x, 0, 1), y: pickup.y, width: 0.05, height: 0.08, tone: "core" })),
    ],
  };
}
