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

const EFFECT_LIFETIMES = Object.freeze({
  hit: 12,
  damage: 36,
  destroy: 28,
  collect: 32,
  eject: 32,
});

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
    player: { ...PLAYER_START, lives, invulnerabilityTicks: 0, attackTicks: 0 },
    loadout,
    enemies: [],
    playerShots: [],
    enemyShots: [],
    pickups: [],
    effects: [],
    boss: null,
    nextSpawnIndex: 0,
    nextShotId: 0,
    nextEffectId: 0,
    fireCooldownTicks: 0,
    streak: 0,
    hitsTaken: 0,
    score: 0,
    scoreBreakdown: createScoreBreakdown(),
    destroyedEnemyCount: 0,
    events: [],
    schedule,
  };
}

function emit(state, type, detail = {}) {
  state.events.push({ tick: state.tick, type, ...detail });
}

function addEffect(state, kind, x, y, detail = {}) {
  state.effects.push({
    id: `effect-${state.nextEffectId++}`,
    kind,
    x: clamp(x, 0, 1),
    y: clamp(y, 0, 1),
    ageTicks: 0,
    lifetimeTicks: EFFECT_LIFETIMES[kind],
    ...detail,
  });
}

function ageEffects(state) {
  for (const effect of state.effects) effect.ageTicks += 1;
  state.effects = state.effects.filter(({ ageTicks, lifetimeTicks }) => ageTicks < lifetimeTicks);
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
      attackTicks: 0,
      hitTicks: 0,
    });
    emit(state, "enemy-spawned", { enemyId: `${spawn.waveId}-${state.nextSpawnIndex}` });
    state.nextSpawnIndex += 1;
  }
}

function spawnBoss(state, stage) {
  if (state.boss !== null || state.tick < state.schedule.boss.startTick) return;
  const phases = stage.boss.phases.map((phase) => ({
    id: phase.id,
    behaviorId: phase.behaviorId,
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
    attackTicks: 0,
    hitTicks: 0,
    phaseTicks: 30,
  };
  emit(state, "boss-entered", { bossId: state.boss.id });
}

function movePlayer(state, command) {
  const magnitude = Math.hypot(command.moveX, command.moveY) || 1;
  state.player.x = clamp(state.player.x + (command.moveX / magnitude) * PLAYER_SPEED_PER_TICK, 0.06, 0.72);
  state.player.y = clamp(state.player.y + (command.moveY / magnitude) * PLAYER_SPEED_PER_TICK, 0.12, 0.88);
  state.player.invulnerabilityTicks = Math.max(0, state.player.invulnerabilityTicks - 1);
  state.player.attackTicks = Math.max(0, state.player.attackTicks - 1);
}

function firePlayerWeapon(state, command) {
  state.fireCooldownTicks = Math.max(0, state.fireCooldownTicks - 1);
  if (!command.fire || state.fireCooldownTicks > 0) return;
  const weapon = getWeaponProfile(state.loadout);
  if (weapon.damage === 0) return;
  for (let index = 0; index < weapon.projectileCount; index += 1) {
    const lane = weapon.projectileCount === 1 ? 0 : index - (weapon.projectileCount - 1) / 2;
    const spread = lane * 0.012;
    state.playerShots.push({
      id: `player-shot-${state.nextShotId++}`,
      x: state.player.x + 0.04,
      y: clamp(state.player.y + spread, 0.05, 0.95),
      damage: weapon.damage,
      pierce: weapon.pierce,
      seeking: weapon.seeking === true,
      weapon: weapon.weapon,
      kind: weapon.projectileKind,
      level: weapon.level,
      vx: PLAYER_SHOT_SPEED_PER_TICK,
      vy: weapon.projectileKind === "spread" ? lane * 0.0018 : 0,
    });
  }
  emit(state, "weapon-fired", {
    weapon: weapon.weapon,
    level: weapon.level,
    soundAssetId: weapon.soundAssetId,
  });
  state.player.attackTicks = 8;
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
    enemy.attackTicks = Math.max(0, enemy.attackTicks - 1);
    enemy.hitTicks = Math.max(0, enemy.hitTicks - 1);
    const speedFactors = {
      "armored-drift": 0.55,
      "sine-left": 1.2,
      "current-rider": 1.35,
      "cover-turret": 0.42,
      "dive-striker": enemy.ageTicks < 45 ? 0.72 : 1.65,
      "regenerating-swarm": 1.12,
      "parasite-turret": 0.36,
      "stalking-predator": enemy.ageTicks < 60 ? 0.48 : 1.8,
      "heat-armored": 0.5,
      "solar-rammer": enemy.ageTicks < 48 ? 0.38 : 2.15,
      "omni-turret": 0.3,
    };
    const speed = ENEMY_SPEED_PER_TICK * (speedFactors[enemy.behaviorId] ?? 1);
    enemy.x -= speed;
    if (["sine-left", "current-rider", "regenerating-swarm"].includes(enemy.behaviorId)) {
      const amplitude = enemy.behaviorId === "current-rider" ? 0.16
        : enemy.behaviorId === "regenerating-swarm" ? 0.13 : 0.1;
      const period = enemy.behaviorId === "current-rider" ? 14
        : enemy.behaviorId === "regenerating-swarm" ? 16 : 18;
      enemy.y = clamp(enemy.originY + Math.sin(enemy.ageTicks / period) * amplitude, 0.12, 0.88);
    } else if ((enemy.behaviorId === "dive-striker" && enemy.ageTicks >= 45)
      || (enemy.behaviorId === "stalking-predator" && enemy.ageTicks >= 60)) {
      enemy.y += clamp(state.player.y - enemy.y, -0.018, 0.018);
    } else if (enemy.behaviorId === "solar-rammer" && enemy.ageTicks >= 48) {
      enemy.y += clamp(state.player.y - enemy.y, -0.022, 0.022);
    }
    if (enemy.behaviorId === "regenerating-swarm" && enemy.ageTicks % 90 === 0
      && enemy.hitPoints < enemy.maximumHitPoints) {
      enemy.hitPoints = Math.min(enemy.maximumHitPoints, enemy.hitPoints + 2);
      emit(state, "enemy-regenerated", { enemyId: enemy.id, hitPoints: enemy.hitPoints });
    }
    const firingInterval = enemy.behaviorId === "dive-striker"
      ? Number.POSITIVE_INFINITY
      : enemy.behaviorId === "stalking-predator" ? Number.POSITIVE_INFINITY
      : enemy.behaviorId === "parasite-turret" ? 66
      : enemy.behaviorId === "omni-turret" ? 60
      : enemy.behaviorId === "cover-turret" ? 72
        : enemy.behaviorId === "armored-drift" ? 64 : 90;
    if (enemy.ageTicks >= 50 && enemy.ageTicks % firingInterval === 0) {
      enemy.attackTicks = 12;
      const offsets = enemy.behaviorId === "omni-turret" ? [-0.012, 0, 0.012] : [0];
      for (const offset of offsets) {
        state.enemyShots.push({
          id: `enemy-shot-${state.nextShotId++}`,
          x: enemy.x,
          y: enemy.y,
          vx: -ENEMY_SHOT_SPEED_PER_TICK,
          vy: clamp((state.player.y - enemy.y) / 36, -0.009, 0.009) + offset,
        });
      }
    }
  }
  if (state.boss && !state.boss.defeated) {
    state.boss.ageTicks += 1;
    state.boss.attackTicks = Math.max(0, state.boss.attackTicks - 1);
    state.boss.hitTicks = Math.max(0, state.boss.hitTicks - 1);
    state.boss.phaseTicks = Math.max(0, state.boss.phaseTicks - 1);
    const phase = state.boss.phases[state.boss.phaseIndex];
    const phaseAge = state.boss.ageTicks;
    const isRush = ["boss-core-rush", "boss-thunder-dive", "boss-shifting-heart", "boss-overload-ram"].includes(phase.behaviorId);
    const isCrossfire = ["boss-crossfire", "boss-shutter-barrage", "boss-grown-carapace", "boss-omni-flare"].includes(phase.behaviorId);
    const isCurrentClimb = phase.behaviorId === "boss-current-climb";
    const isFeeding = phase.behaviorId === "boss-feeding-arms";
    const isThermalShell = phase.behaviorId === "boss-thermal-shell";
    state.boss.y = 0.5 + Math.sin(phaseAge / (isRush ? 20 : isCurrentClimb ? 32 : isFeeding ? 26 : 45))
      * (isRush ? 0.31 : isCurrentClimb ? 0.34 : isFeeding ? 0.27 : 0.22);
    const interval = phase.behaviorId === "boss-omni-flare" ? 36
      : isCrossfire ? 42 : isRush ? 30 : isFeeding ? 48 : isThermalShell ? 50 : 54;
    const isLivingArkCore = [
      "boss-feeding-arms", "boss-grown-carapace", "boss-shifting-heart",
    ].includes(phase.behaviorId);
    if (isLivingArkCore && phaseAge % 150 === 0) {
      const core = ["blue", "red", "yellow"][state.boss.phaseIndex];
      state.pickups.push({
        id: `boss-organ-${state.boss.phaseIndex}-${phaseAge}`,
        x: state.boss.x - 0.04,
        y: state.boss.y,
        core,
      });
      emit(state, "boss-organ-shed", { phaseId: phase.id, core });
    }
    const isFurnaceController = [
      "boss-thermal-shell", "boss-overload-ram", "boss-omni-flare",
    ].includes(phase.behaviorId);
    if (isFurnaceController && phaseAge % 90 === 0) {
      const core = ["blue", "yellow", "blue"][state.boss.phaseIndex];
      state.pickups.push({
        id: `boss-coolant-${state.boss.phaseIndex}-${phaseAge}`,
        x: state.boss.x - 0.04,
        y: state.boss.y,
        core,
      });
      emit(state, "boss-coolant-vented", { phaseId: phase.id, core });
    }
    if (phaseAge % interval === 0) {
      state.boss.attackTicks = 14;
      const offsets = isCrossfire ? [-0.018, 0, 0.018] : [0];
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
    shot.x += shot.vx ?? PLAYER_SHOT_SPEED_PER_TICK;
    shot.y += shot.vy ?? 0;
  }
  for (const shot of state.enemyShots) {
    shot.x += shot.vx;
    shot.y += shot.vy;
  }
  for (const pickup of state.pickups) {
    pickup.ageTicks = (pickup.ageTicks ?? 0) + 1;
    pickup.x -= 0.004;
  }
}

function damagePlayer(state, reason) {
  if (state.player.invulnerabilityTicks > 0 || state.status !== "playing") return false;
  const impact = { x: state.player.x, y: state.player.y };
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
  if (loss.lost !== null) addEffect(state, "eject", impact.x, impact.y, { core: loss.lost });
  addEffect(state, "damage", impact.x, impact.y);
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
  state.destroyedEnemyCount += 1;
  const streakBonus = state.streak >= 3 ? 25 * state.streak : 0;
  state.score += streakBonus;
  state.scoreBreakdown.streak += streakBonus;
  state.pickups.push({ id: `drop-${enemy.id}`, x: enemy.x, y: enemy.y, core: enemy.dropItemId });
  addEffect(state, "destroy", enemy.x, enemy.y);
  emit(state, "enemy-destroyed", { enemyId: enemy.id, drop: enemy.dropItemId });
}

function damageBoss(state, damage) {
  const phase = state.boss.phases[state.boss.phaseIndex];
  phase.hitPoints -= damage;
  state.boss.hitTicks = 7;
  if (phase.hitPoints > 0) return;
  if (state.boss.phaseIndex < state.boss.phases.length - 1) {
    state.boss.phaseIndex += 1;
    state.boss.ageTicks = 0;
    state.boss.phaseTicks = 30;
    emit(state, "boss-phase-changed", { phaseId: state.boss.phases[state.boss.phaseIndex].id });
    return;
  }
  state.boss.defeated = true;
  addEffect(state, "destroy", state.boss.x, state.boss.y);
  emit(state, "boss-defeated", { bossId: state.boss.id });
}

function resolvePlayerShots(state) {
  const deadEnemies = new Set();
  for (const shot of state.playerShots) {
    if (shot.dead) continue;
    const enemy = state.enemies.find((candidate) => !deadEnemies.has(candidate.id)
      && Math.abs(candidate.x - shot.x) <= 0.045 && Math.abs(candidate.y - shot.y) <= 0.075);
    if (enemy) {
      const damage = enemy.behaviorId === "heat-armored"
        ? Math.max(1, shot.damage - 2)
        : shot.damage;
      enemy.hitPoints -= damage;
      enemy.hitTicks = 7;
      addEffect(state, "hit", enemy.x, enemy.y);
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
      addEffect(state, "hit", state.boss.x, state.boss.y);
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
      const loadResult = collectReactorCore(state.loadout, pickup.core);
      state.score += 75;
      state.scoreBreakdown.core += 75;
      pickup.collected = true;
      addEffect(state, "collect", pickup.x, pickup.y);
      emit(state, "core-collected", {
        core: pickup.core,
        soundAssetId: "audio-ref-core-collect",
      });
      emit(state, "core-loaded", {
        core: pickup.core,
        ejected: loadResult.ejected,
        weapon: loadResult.build.weapon,
        level: loadResult.build.level,
        soundAssetId: "audio-ref-core-load",
      });
    }
  }
  state.pickups = state.pickups.filter((pickup) => !pickup.collected && pickup.x >= -0.05);
}

function resolveHazards(state) {
  const activeHazards = state.schedule.hazards
    .filter((hazard) => state.tick >= hazard.startTick && state.tick < hazard.endTick);
  for (const active of activeHazards) {
    if (active.behaviorId === "periodic-heatwave") {
      if ((state.tick - active.startTick) % 180 === 0) {
        const waveIndex = Math.floor((state.tick - active.startTick) / 180);
        const safeY = waveIndex % 2 === 0 ? 0.24 : 0.76;
        emit(state, "hazard-heatwave-pulsed", { hazardId: active.id, safeY });
        if (Math.abs(state.player.y - safeY) > 0.2) damagePlayer(state, "periodic-heatwave");
      }
      continue;
    }
    if (active.behaviorId === "coolant-refuge") {
      if ((state.tick - active.startTick) % 180 === 0) {
        const refugeIndex = Math.floor((state.tick - active.startTick) / 180);
        const safeY = refugeIndex % 2 === 0 ? 0.24 : 0.76;
        emit(state, "hazard-refuge-shifted", { hazardId: active.id, safeY });
      }
      continue;
    }
    if (active.behaviorId === "destruction-safe-zone") {
      if ((state.tick - active.startTick) % 120 === 0) {
        const centers = [0.26, 0.5, 0.74];
        const safeY = centers[state.destroyedEnemyCount % centers.length];
        const halfWidth = Math.max(0.14, 0.3 - state.destroyedEnemyCount * 0.006);
        emit(state, "hazard-safe-zone-changed", {
          hazardId: active.id,
          destroyedEnemyCount: state.destroyedEnemyCount,
          safeY,
          halfWidth,
        });
        if (Math.abs(state.player.y - safeY) > halfWidth) damagePlayer(state, "destruction-safe-zone");
      }
      continue;
    }
    if (active.behaviorId === "alternating-current") {
      const direction = Math.floor((state.tick - active.startTick) / 180) % 2 === 0 ? -1 : 1;
      state.player.y = clamp(state.player.y + direction * 0.0035, 0.12, 0.88);
      if ((state.tick - active.startTick) % 180 === 0) {
        emit(state, "hazard-current-shifted", { hazardId: active.id, direction });
      }
      continue;
    }
    if (active.behaviorId === "growth-source") {
      if ((state.tick - active.startTick) % 180 === 0) {
        let healedEnemies = 0;
        for (const enemy of state.enemies) {
          if (enemy.hitPoints >= enemy.maximumHitPoints) continue;
          enemy.hitPoints = Math.min(enemy.maximumHitPoints, enemy.hitPoints + 2);
          healedEnemies += 1;
        }
        emit(state, "hazard-growth-pulsed", { hazardId: active.id, healedEnemies });
      }
      continue;
    }
    if (active.behaviorId === "contracting-tissue"
      && (state.tick - active.startTick) % 180 === 0) {
      const phase = Math.floor((state.tick - active.startTick) / 180) % 4;
      const halfWidth = [0.3, 0.22, 0.14, 0.22][phase];
      emit(state, "hazard-tissue-contracted", { hazardId: active.id, halfWidth });
    }
    if (state.tick % 120 !== 0) continue;
    if (active.behaviorId === "closing-corridor" && (state.player.y < 0.27 || state.player.y > 0.73)) {
      damagePlayer(state, "closing-corridor");
    }
    if (active.behaviorId === "shutter-cover") {
      const openingY = Math.floor((state.tick - active.startTick) / 240) % 2 === 0 ? 0.3 : 0.7;
      if (Math.abs(state.player.y - openingY) > 0.24) damagePlayer(state, "shutter-cover");
    }
    if (active.behaviorId === "charged-cloud") {
      const chargedHalf = Math.floor((state.tick - active.startTick) / 180) % 2 === 0 ? "upper" : "lower";
      if ((chargedHalf === "upper" && state.player.y < 0.5)
        || (chargedHalf === "lower" && state.player.y >= 0.5)) {
        damagePlayer(state, "charged-cloud");
      }
    }
    if (active.behaviorId === "reactive-tissue") {
      const tissueOpened = state.events.some(({ type }) => type === "weapon-fired");
      const halfWidth = tissueOpened ? 0.32 : 0.16;
      if (Math.abs(state.player.y - 0.5) > halfWidth) damagePlayer(state, "reactive-tissue");
    }
    if (active.behaviorId === "contracting-tissue") {
      const phase = Math.floor((state.tick - active.startTick) / 180) % 4;
      const halfWidth = [0.3, 0.22, 0.14, 0.22][phase];
      if (Math.abs(state.player.y - 0.5) > halfWidth) damagePlayer(state, "contracting-tissue");
    }
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
  ageEffects(state);
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
  const reactor = describeReactorLoadout(state.loadout);
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
    weapon: reactor,
    score: state.score,
    scoreBreakdown: { ...state.scoreBreakdown },
    destroyedEnemyCount: state.destroyedEnemyCount,
    hitsTaken: state.hitsTaken,
    boss,
    actors: [
      {
        id: "player",
        assetId: "player-interceptor",
        x: state.player.x,
        y: state.player.y,
        width: 0.12,
        height: 0.15,
        tone: "player",
        reactor: {
          primary: reactor.weapon,
          level: reactor.level,
          supports: reactor.supports,
          invulnerable: state.player.invulnerabilityTicks > 0,
        },
        animation: {
          state: state.player.attackTicks > 0 ? "attack" : "move",
          progress: state.player.attackTicks > 0
            ? 1 - (state.player.attackTicks / 8) : (state.tick % 60) / 60,
          variant: "player-interceptor",
        },
      },
      ...state.enemies.map((enemy) => ({
        id: enemy.id,
        assetId: enemy.assetId,
        x: clamp(enemy.x, 0, 1),
        y: enemy.y,
        width: enemy.behaviorId === "armored-drift" ? 0.15 : 0.11,
        height: enemy.behaviorId === "armored-drift" ? 0.18 : 0.14,
        tone: "enemy",
        animation: {
          state: enemy.ageTicks < 24 ? "enter"
            : enemy.hitTicks > 0 ? "hit"
              : enemy.attackTicks > 0 ? "attack" : "move",
          progress: enemy.ageTicks < 24 ? enemy.ageTicks / 24
            : enemy.hitTicks > 0 ? 1 - (enemy.hitTicks / 7)
              : enemy.attackTicks > 0 ? 1 - (enemy.attackTicks / 12) : (enemy.ageTicks % 60) / 60,
          variant: enemy.behaviorId,
        },
      })),
      ...(state.boss && !state.boss.defeated ? [{
        id: state.boss.id,
        assetId: state.boss.assetId,
        x: state.boss.x,
        y: state.boss.y,
        width: 0.28,
        height: 0.46,
        tone: "boss",
        animation: {
          state: state.boss.phaseTicks > 0 ? (state.boss.phaseIndex === 0 ? "enter" : "phase")
            : state.boss.hitTicks > 0 ? "hit"
              : state.boss.attackTicks > 0 ? "attack" : "move",
          progress: state.boss.phaseTicks > 0 ? 1 - (state.boss.phaseTicks / 30)
            : state.boss.hitTicks > 0 ? 1 - (state.boss.hitTicks / 7)
              : state.boss.attackTicks > 0 ? 1 - (state.boss.attackTicks / 14) : (state.boss.ageTicks % 90) / 90,
          variant: state.boss.phases[state.boss.phaseIndex].behaviorId,
        },
      }] : []),
      ...state.pickups.map((pickup) => ({
        id: pickup.id, assetId: `core-${pickup.core}`, x: clamp(pickup.x, 0, 1), y: pickup.y,
        width: 0.05, height: 0.08, tone: "core",
        animation: {
          state: (pickup.ageTicks ?? 0) < 18 ? "enter" : "move",
          progress: (pickup.ageTicks ?? 0) < 18 ? (pickup.ageTicks ?? 0) / 18 : ((pickup.ageTicks ?? 0) % 48) / 48,
          variant: pickup.core,
        },
      })),
    ],
    projectiles: state.playerShots.map((shot) => ({
      id: shot.id,
      x: clamp(shot.x, 0, 1),
      y: clamp(shot.y, 0, 1),
      kind: shot.kind ?? "lance",
      level: shot.level ?? 1,
      angle: Math.atan2(shot.vy ?? 0, shot.vx ?? PLAYER_SHOT_SPEED_PER_TICK),
    })),
    effects: state.effects.map((effect) => ({ ...effect })),
    transition: state.status === "cleared" ? { kind: "clear", progress: 1 } : null,
  };
}
