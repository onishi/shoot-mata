import { activeCurrent } from "../content/stage-02.mjs";
import { CAMPAIGN, CAMPAIGN_PACE, stageById, visibleTerrainFor } from "../content/stages.mjs";
import { overlapsCirclePolygon, overlapsCircleRect, overlapsRect, overlapsRectPolygon } from "./geometry.mjs";

const FIELD_HEIGHT = 720;
const FIELD_WIDTH = 1280;
const PLAYER_SPEED = 5;
const SHOT_INTERVAL = 8;
const BOSS_CYCLE_TICKS = 360;
const BOSS_WARNING_TICKS = 72;
const WEAPON_NAMES = Object.freeze({ red: "LANCE", blue: "SPREAD", yellow: "SEEKER" });
export const DIFFICULTY_RULES = Object.freeze({
  standard: Object.freeze({ lives: 3, enemyBulletSpeed: 0.88, collectionRadius: 1, respawnInvulnerability: 120 }),
  assist: Object.freeze({ lives: 4, enemyBulletSpeed: 0.75, collectionRadius: 1.25, respawnInvulnerability: 180 })
});

export const BOSS_STRATEGIES = Object.freeze({
  "wreck-warden": Object.freeze({ id: "strip-armor", label: "STRIP PORT / STARBOARD ARMOR" }),
  "refinery-guardian": Object.freeze({ id: "open-valves", label: "OPEN UPPER / LOWER PRESSURE VALVES" }),
  "ark-core": Object.freeze({ id: "organ-sequence", label: "BURN ORGANS: UPPER → LOWER → HEART" }),
  "furnace-controller": Object.freeze({ id: "coolant-window", label: "BREAK COOLANT PODS · STRIKE OPEN CORE" }),
  "prism-oracle": Object.freeze({ id: "find-original", label: "TRACK THE SOLID ORACLE" }),
  "relay-sovereign": Object.freeze({ id: "sever-nodes", label: "SEVER 3 NODES · HIT LEARNING CORE" })
});

export function createGame(stageId = "stage-01", difficulty = "standard") {
  if (!DIFFICULTY_RULES[difficulty]) throw new TypeError(`Unknown difficulty: ${difficulty}`);
  const stageConfig = stageById(stageId);
  const openingMission = stageConfig.sections[0].mission;
  return {
    screen: "title", stageId, difficulty, tick: 0, checkpointTick: 0, scrollX: 0, score: 0, highScore: 0, stageStartScore: 0, lives: DIFFICULTY_RULES[difficulty].lives, cores: [], pickups: [],
    unlockedStage: 1, selectedStageIndex: 0, practiceMode: false,
    scoreBreakdown: { defeat: 0, pickup: 0, chain: 0, clear: 0, noMiss: 0 },
    killChain: 0, chainTicks: 0, maxKillChain: 0, misses: 0, stageMisses: 0, respawnTicks: 0,
    nextCoreDrop: 0, coresCollected: 0,
    player: { x: 180, y: 360, radius: 5, invulnerable: 0 },
    playerTrail: Array.from({ length: 120 }, () => ({ x: 180, y: 360 })),
    bullets: [], enemyBullets: [], enemies: [], boss: null, nextWave: 0, nextCrawler: 0, nextLeech: 0, nextWalker: 0, nextMole: 0, pulseShots: 0,
    nextPowerUpDrop: 0, options: 0, optionFormation: "trace", barrier: 0, overdriveTicks: 0, optionShots: 0, formationChanges: 0,
    sectionIndex: 0, sectionBannerTicks: 0, sectionTitle: openingMission.title,
    missionObjective: openingMission.objective, missionBeat: openingMission.beat,
    nextStoryEvent: 0, storyEventIds: [], storyEventsCompleted: 0, eventBannerTicks: 0,
    commSpeaker: "CONTROL", commTitle: openingMission.title, commMessage: openingMission.objective,
    currentLandmark: null, landmarksSeen: 0, storyEnemySpawns: 0, storyOutcome: stageConfig.storyOutcome, shakeTicks: 0,
    setPieces: [], setPiecesActivated: 0, environmentMechanicTicks: 0, acidLevel: 0,
    nextPatrolTick: 180, patrolsSpawned: 0, enemyGapTicks: 0, maxEnemyGapTicks: 0,
    effects: [], effectsCreated: 0,
    enemyShots: 0, bossShots: 0, combatHits: 0, defeatedEnemies: 0, destroyedTerrain: [], terrainDamage: {},
    bossShieldBlocks: 0, bossWeakpointHits: 0, bossMechanicsResolved: 0,
    weaponShots: { lance: 0, spread: 0, seeker: 0 },
    terrainHits: 0, defeatedBoss: false, paused: false, introTicks: 0, resultTicks: 0,
    currentTicks: 0, shutterWarnings: 0, membraneWarnings: 0, heatWaveWarnings: 0, swarmRegenerations: 0, arkOrgansDestroyed: 0, furnacePhasesSeen: [],
    crystalReflections: 0, phaseRayWarnings: 0, prismPhasesSeen: [],
    phaseWallWarnings: 0, gravityFlips: 0, gravityDirection: 0, relaySniperWarnings: 0,
    relayPillarsDestroyed: 0, sovereignPhasesSeen: []
  };
}

export function beginStage(game, stageId = "stage-01", { preserveProgress = false } = {}) {
  const navigation = { unlockedStage: game.unlockedStage ?? 1, highScore: game.highScore ?? 0, difficulty: game.difficulty ?? "standard" };
  const progress = preserveProgress ? {
    score: game.score, stageStartScore: game.score, lives: game.lives, misses: game.misses,
    cores: [...game.cores], options: game.options, optionFormation: game.optionFormation,
    barrier: game.barrier, overdriveTicks: game.overdriveTicks
  } : {};
  Object.assign(game, createGame(stageId, navigation.difficulty), navigation, progress, { screen: "stage-intro", introTicks: 90 });
}

export function beginCampaign(game, { showHowTo = false } = {}) {
  const unlockedStage = game.unlockedStage ?? 1;
  const highScore = game.highScore ?? 0;
  const difficulty = game.difficulty ?? "standard";
  Object.assign(game, createGame("stage-01", difficulty), { unlockedStage, highScore, screen: showHowTo ? "how-to-play" : "stage-intro", introTicks: showHowTo ? 0 : 90 });
}

export function returnToTitle(game) {
  const unlockedStage = game.unlockedStage ?? 1;
  const highScore = game.highScore ?? 0;
  const difficulty = game.difficulty ?? "standard";
  Object.assign(game, createGame("stage-01", difficulty), { unlockedStage, highScore });
}

export function setDifficulty(game, difficulty) {
  const rules = DIFFICULTY_RULES[difficulty];
  if (!rules) throw new TypeError(`Unknown difficulty: ${difficulty}`);
  game.difficulty = difficulty;
  if (game.screen === "title") game.lives = rules.lives;
  return game;
}

export function openStageSelect(game) {
  game.screen = "stage-select";
  game.selectedStageIndex = Math.min((game.unlockedStage ?? 1) - 1, CAMPAIGN.indexOf(game.stageId));
}

export function collectCore(game, color) {
  if (!WEAPON_NAMES[color]) throw new TypeError(`Unknown core color: ${color}`);
  if (game.cores.length === 3) game.cores.shift();
  game.cores.push(color);
  game.coresCollected += 1;
  addScore(game, "pickup", 75);
}

export function collectPowerUp(game, kind) {
  if (kind === "option") game.options = Math.min(4, game.options + 1);
  else if (kind === "barrier") game.barrier = Math.min(4, game.barrier + 2);
  else if (kind === "overdrive") game.overdriveTicks = Math.max(game.overdriveTicks, 20 * 60);
  else throw new TypeError(`Unknown power-up: ${kind}`);
  addScore(game, "pickup", 150);
}

export function reactorLoadout(cores) {
  if (cores.length === 0) return { weapon: "PULSE", color: null, level: 0, pierce: 0, invulnerability: 0, collectionRadius: 0 };
  const color = cores[0];
  return {
    weapon: WEAPON_NAMES[color],
    color,
    level: Math.min(3, cores.filter((core) => core === color).length),
    pierce: cores.filter((core) => core !== color && core === "red").length,
    invulnerability: cores.filter((core) => core !== color && core === "blue").length * 15,
    collectionRadius: cores.filter((core) => core !== color && core === "yellow").length * 32
  };
}

export function updateGame(game, input = {}) {
  if (game.screen === "stage-select") {
    const lastUnlockedIndex = Math.max(0, Math.min(CAMPAIGN.length, game.unlockedStage ?? 1) - 1);
    if (input.upPressed) game.selectedStageIndex = game.selectedStageIndex <= 0 ? lastUnlockedIndex : game.selectedStageIndex - 1;
    if (input.downPressed) game.selectedStageIndex = game.selectedStageIndex >= lastUnlockedIndex ? 0 : game.selectedStageIndex + 1;
    if (input.confirmPressed) {
      const stageId = CAMPAIGN[game.selectedStageIndex];
      beginStage(game, stageId);
      game.practiceMode = true;
    } else if (input.cancelPressed) returnToTitle(game);
    return game;
  }
  if (game.screen === "how-to-play") {
    if (input.cancelPressed) returnToTitle(game);
    if (input.confirmPressed) {
      game.screen = "stage-intro";
      game.introTicks = 90;
    }
    return game;
  }
  if (game.screen === "continue") {
    if (input.confirmPressed) {
      const { stageId, practiceMode } = game;
      beginStage(game, stageId);
      game.practiceMode = practiceMode;
    }
    else if (input.cancelPressed) returnToTitle(game);
    return game;
  }
  if (game.screen === "stage-result") {
    if (input.cancelPressed) returnToTitle(game);
    else if (input.confirmPressed && game.practiceMode) returnToTitle(game);
    else if (input.confirmPressed) {
      const nextStage = CAMPAIGN[CAMPAIGN.indexOf(game.stageId) + 1];
      if (nextStage) beginStage(game, nextStage, { preserveProgress: true });
      else game.screen = "ending";
    }
    return game;
  }
  if (game.screen === "ending") {
    if (input.confirmPressed) game.screen = "credits";
    else if (input.cancelPressed) returnToTitle(game);
    return game;
  }
  if (game.screen === "credits") {
    if (input.confirmPressed || input.cancelPressed) returnToTitle(game);
    return game;
  }
  if (input.pausePressed && game.screen === "playing") game.paused = !game.paused;
  if (game.paused) {
    if (input.cancelPressed) returnToTitle(game);
    return game;
  }
  if (game.screen === "stage-intro") {
    game.introTicks -= 1;
    if (game.introTicks <= 0) {
      game.screen = "playing";
      game.sectionBannerTicks = 90;
    }
    return game;
  }
  if (game.screen !== "playing") return game;

  game.tick += 1;
  const stage = stageById(game.stageId);
  game.checkpointTick = latestCheckpoint(stage, game.tick);
  game.scrollX = Math.min(stage.bossStartTick * stage.scrollSpeed, game.tick * stage.scrollSpeed);
  updateSection(game, stage);
  updateStoryEvents(game, stage);
  updateSetPieces(game);
  if (game.chainTicks > 0) game.chainTicks -= 1;
  else game.killChain = 0;
  if (game.eventBannerTicks > 0) game.eventBannerTicks -= 1;
  if (game.shakeTicks > 0) game.shakeTicks -= 1;
  if (input.altPressed) cycleOptionFormation(game);
  updatePlayer(game, input);
  spawnWaves(game);
  spawnPressurePatrols(game, stage);
  spawnCrawlers(game);
  spawnLeeches(game);
  spawnWalkers(game);
  spawnMoles(game);
  spawnCoreDrops(game);
  spawnPowerUpDrops(game);
  updatePickups(game);
  updateShots(game, input);
  updateEnemies(game);
  updateEnemyBullets(game);
  updateBoss(game);
  updateEffects(game);
  if (game.stageId === "stage-06" && game.tick % 90 === 1 && terrainFor(game).some((item) => item.warning && item.kind === "phase-wall")) game.phaseWallWarnings += 1;
  checkTerrain(game);
  return game;
}

function updatePlayer(game, input) {
  if (game.respawnTicks > 0) {
    game.respawnTicks -= 1;
    if (game.respawnTicks === 0) game.player.invulnerable = DIFFICULTY_RULES[game.difficulty].respawnInvulnerability;
    return;
  }
  const dx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  const dy = (input.down ? 1 : 0) - (input.up ? 1 : 0);
  const scale = dx && dy ? Math.SQRT1_2 : 1;
  game.player.x = Math.max(24, Math.min(FIELD_WIDTH - 48, game.player.x + dx * PLAYER_SPEED * scale));
  game.player.y = Math.max(18, Math.min(FIELD_HEIGHT - 18, game.player.y + dy * PLAYER_SPEED * scale));
  if (game.stageId === "stage-02") {
    const current = activeCurrent(game.tick / CAMPAIGN_PACE);
    if (current) {
      game.player.y = Math.max(18, Math.min(FIELD_HEIGHT - 18, game.player.y + current.direction * current.strength));
      game.currentTicks += 1;
    }
  }
  if (game.stageId === "stage-06") {
    const inverter = game.enemies.find((enemy) => enemy.type === "vector-inverter" && !enemy.dead);
    const nextDirection = inverter ? (Math.floor((game.tick - inverter.spawnedTick) / 180) % 2 === 0 ? 1 : -1) : 0;
    if (nextDirection && game.gravityDirection && nextDirection !== game.gravityDirection) game.gravityFlips += 1;
    game.gravityDirection = nextDirection;
    game.player.y = Math.max(18, Math.min(FIELD_HEIGHT - 18, game.player.y + nextDirection * 0.72));
  }
  if (game.player.invulnerable > 0) game.player.invulnerable -= 1;
  if (game.overdriveTicks > 0) game.overdriveTicks -= 1;
  game.playerTrail.unshift({ x: game.player.x, y: game.player.y });
  if (game.playerTrail.length > 120) game.playerTrail.length = 120;
}

function updateSection(game, stage) {
  const found = stage.sections.findIndex((section) => game.tick >= section.startTick && game.tick < section.endTick);
  const index = found < 0 ? stage.sections.length - 1 : found;
  if (index !== game.sectionIndex) {
    game.sectionIndex = index;
    game.sectionTitle = stage.sections[index]?.mission?.title ?? "FINAL TARGET";
    game.missionObjective = stage.sections[index]?.mission?.objective ?? "Destroy the target";
    game.missionBeat = stage.sections[index]?.mission?.beat ?? "CORE";
    game.sectionBannerTicks = 90;
  } else if (game.sectionBannerTicks > 0) game.sectionBannerTicks -= 1;
}

function updateStoryEvents(game, stage) {
  const event = stage.storyEvents[game.nextStoryEvent];
  if (!event || game.tick < event.tick) return;
  game.nextStoryEvent += 1;
  if (!game.storyEventIds.includes(event.id)) {
    game.storyEventIds.push(event.id);
    game.storyEventsCompleted += 1;
    game.landmarksSeen += 1;
  }
  game.commSpeaker = event.speaker;
  game.commTitle = event.title;
  game.commMessage = event.message;
  game.missionObjective = event.objective;
  game.currentLandmark = event.landmark;
  game.eventBannerTicks = 0;
  game.shakeTicks = 18;
  const stats = enemyStats(event.enemyType);
  for (let index = 0; index < event.count; index += 1) {
    const fromBottom = event.pattern === "pincer" && index % 2 === 1;
    const y = event.pattern === "vertical" ? 75 + index * 88 : fromBottom ? 560 - index * 18 : 120 + (index % 4) * 115;
    game.enemies.push({
      x: 1290 + index * 66, y, ...stats, phase: index * 0.83, pattern: event.pattern,
      type: event.enemyType, spawnedTick: game.tick + index * 10, storyEnemy: true
    });
  }
  game.storyEnemySpawns += event.count;
  const setPieceY = [310, 430, 350, 500, 260][game.nextStoryEvent - 1] ?? 360;
  game.setPieces.push({ kind: event.setPiece, x: 1320, y: setPieceY, age: 0, life: 720, eventId: event.id, phase: game.nextStoryEvent - 1 });
  game.setPiecesActivated += 1;
  createBurst(game, 1180, 360, 18, "#ffe073");
}

function updateSetPieces(game) {
  for (const piece of game.setPieces) {
    piece.age += 1;
    piece.life -= 1;
    if (piece.kind === "wreck-hangar") piece.x -= piece.age < 150 ? 2.4 : 1.05;
    else piece.x += Math.sign(510 - piece.x) * Math.min(2.2, Math.abs(510 - piece.x));
    if (piece.kind === "worker-craft") piece.y += Math.sin(piece.age / 24) * 1.2;
    if (piece.kind === "survivor-pod") {
      piece.y += Math.sin(piece.age / 31) * 0.8;
      game.acidLevel = 42 + (Math.sin(piece.age / 45) + 1) * 38;
      if (game.player.y > FIELD_HEIGHT - game.acidLevel - 24) game.player.y -= 1.6;
    }
    if (piece.kind === "coolant-train") piece.y = 540 + Math.sin(piece.age / 38) * 18;
    if (piece.kind === "signal-decoy") piece.y += Math.sin(piece.age / 17 + piece.phase) * 2.4;
    if (piece.kind === "allied-beacon") {
      piece.y = 340 + Math.sin(piece.age / 42) * 55;
      if (Math.abs(game.player.x - piece.x) < 260) game.gravityDirection = 0;
    }
    game.environmentMechanicTicks += 1;
  }
  game.setPieces = game.setPieces.filter(({ life, x }) => life > 0 && x > -260);
  if (!game.setPieces.some(({ kind }) => kind === "survivor-pod")) game.acidLevel = Math.max(0, game.acidLevel - 1.5);
}

function spawnPressurePatrols(game, stage) {
  if (game.tick >= stage.bossStartTick || game.boss) return;
  const active = game.enemies.filter((enemy) => !enemy.dead).length;
  if (active === 0) {
    game.enemyGapTicks += 1;
    game.maxEnemyGapTicks = Math.max(game.maxEnemyGapTicks, game.enemyGapTicks);
  } else game.enemyGapTicks = 0;
  const due = game.tick >= game.nextPatrolTick || game.enemyGapTicks >= 240;
  if (!due || active >= 10) return;
  const patrolTypes = {
    "stage-01": ["scrap-dart"], "stage-02": ["vapor-wing"], "stage-03": ["spore-bomber"],
    "stage-04": ["flare-wisp"], "stage-05": ["prism-splitter"], "stage-06": ["phase-echo"]
  };
  const pool = patrolTypes[stage.id];
  const type = pool[(game.patrolsSpawned + game.sectionIndex) % pool.length];
  const count = 4 + Math.min(3, game.sectionIndex);
  const floorLane = (game.patrolsSpawned + game.sectionIndex) % 2 === 1;
  const pattern = floorLane ? "floor-combo" : "ceiling-combo";
  const y = floorLane ? 500 : 130;
  const stats = enemyStats(type);
  for (let index = 0; index < count; index += 1) {
    game.enemies.push({ x: 1280 + index * 74, y: y + Math.sin(index * 1.7) * 55, ...stats, phase: index * 0.9, pattern, type, spawnedTick: game.tick + index * 12, storyPatrol: true });
  }
  game.patrolsSpawned += 1;
  game.enemyGapTicks = 0;
  game.nextPatrolTick = game.tick + 300;
}

function cycleOptionFormation(game) {
  if (game.options < 1) return;
  const formations = ["trace", "wide", "focus"];
  game.optionFormation = formations[(formations.indexOf(game.optionFormation) + 1) % formations.length];
  game.formationChanges += 1;
}

function spawnCoreDrops(game) {
  const drop = stageById(game.stageId).coreDrops[game.nextCoreDrop];
  if (!drop || game.tick < drop.tick) return;
  game.pickups.push({ kind: "core", x: 1300, y: drop.y, color: drop.color, radius: 20 });
  game.nextCoreDrop += 1;
}

function spawnPowerUpDrops(game) {
  const drop = stageById(game.stageId).powerUps?.[game.nextPowerUpDrop];
  if (!drop || game.tick < drop.tick) return;
  game.pickups.push({ kind: drop.kind, x: 1300, y: drop.y, radius: 22 });
  game.nextPowerUpDrop += 1;
}

function updatePickups(game) {
  const loadout = reactorLoadout(game.cores);
  const collectionScale = DIFFICULTY_RULES[game.difficulty].collectionRadius;
  for (const pickup of game.pickups) {
    pickup.x -= 2.7;
    const dx = game.player.x - pickup.x;
    const dy = game.player.y - pickup.y;
    const radius = (28 + loadout.collectionRadius) * collectionScale;
    if (dx * dx + dy * dy <= radius * radius) {
      if (pickup.kind === "core" || pickup.color) collectCore(game, pickup.color);
      else collectPowerUp(game, pickup.kind);
      pickup.collected = true;
    }
  }
  game.pickups = game.pickups.filter((pickup) => !pickup.collected && pickup.x > -40);
}

function updateShots(game, input) {
  const canFire = input.fire && game.respawnTicks === 0;
  const pulseInterval = game.overdriveTicks > 0 ? 5 : SHOT_INTERVAL;
  if (canFire && game.tick % pulseInterval === 0) {
    addBullet(game, { kind: "pulse", x: game.player.x + 28, y: game.player.y - 2, width: 18, height: 4, vx: 13, vy: 0, damage: 2, pierce: 0 });
    game.pulseShots += 1;
  }
  if (canFire) fireReactorWeapon(game, reactorLoadout(game.cores));
  if (canFire) fireOptions(game);
  moveShots(game);
  hitTerrain(game);
  hitTargets(game);
  game.bullets = game.bullets.filter((bullet) => !bullet.dead && bullet.x < 1340 && bullet.y > -40 && bullet.y < FIELD_HEIGHT + 40);
}

export function optionPositions(game) {
  const count = Math.min(4, game.options ?? 0);
  if (game.optionFormation === "trace") {
    return Array.from({ length: count }, (_, index) => {
      const delay = (index + 1) * 14;
      const sample = game.playerTrail?.[delay] ?? game.player;
      return { x: sample.x, y: sample.y, trailDelay: delay };
    });
  }
  if (game.optionFormation === "wide") {
    const offsets = count === 1 ? [0] : count === 2 ? [-72, 72] : count === 3 ? [-104, 0, 104] : [-126, -42, 42, 126];
    return offsets.map((offset) => ({ x: game.player.x - 22, y: game.player.y + offset }));
  }
  const offsets = count === 1 ? [0] : count === 2 ? [-14, 14] : count === 3 ? [-24, 0, 24] : [-30, -10, 10, 30];
  return offsets.map((offset, index) => ({ x: game.player.x - 48 - index * 5, y: game.player.y + offset }));
}

function fireOptions(game) {
  if (!game.options || game.tick % (game.overdriveTicks > 0 ? 7 : 11) !== 0) return;
  const positions = optionPositions(game);
  for (const [index, option] of positions.entries()) {
    const spread = game.optionFormation === "wide" ? (index - (positions.length - 1) / 2) * 0.14 : 0;
    const damage = game.optionFormation === "focus" ? 2.25 : 1.4;
    addBullet(game, { kind: "option", x: option.x + 12, y: option.y - 2, width: 16, height: 4, vx: 13 * Math.cos(spread), vy: 13 * Math.sin(spread), damage, pierce: game.optionFormation === "focus" ? 1 : 0 });
    game.optionShots += 1;
  }
}

function hitTerrain(game) {
  const terrain = terrainFor(game);
  for (const bullet of game.bullets) {
    if (bullet.dead) continue;
    const item = terrain.find((candidate) => !candidate.warning && overlapsRectPolygon(bullet, candidate.points));
    if (!item) continue;
    bullet.dead = true;
    if (!["destructible-wreck", "destructible-cyst", "destructible-shield", "destructible-relay"].includes(item.kind)) continue;
    game.terrainDamage[item.id] = (game.terrainDamage[item.id] ?? 0) + bullet.damage;
    if (game.terrainDamage[item.id] >= item.hp && !game.destroyedTerrain.includes(item.id)) {
      game.destroyedTerrain.push(item.id);
      if (item.kind === "destructible-relay") game.relayPillarsDestroyed += 1;
      addScore(game, "defeat", 250);
      createBurst(game, item.screenX + item.width / 2, item.y + item.height / 2, 14, "#ffb35f");
    }
  }
}

function fireReactorWeapon(game, loadout) {
  const origin = { x: game.player.x + 30, y: game.player.y };
  if (loadout.color === "red" && game.tick % 12 === 0) {
    addBullet(game, { kind: "lance", x: origin.x, y: origin.y - 4, width: 34 + loadout.level * 7, height: 8, vx: 17, vy: 0, damage: [0, 3, 4, 6][loadout.level], pierce: loadout.level + loadout.pierce });
    game.weaponShots.lance += 1;
  }
  if (loadout.color === "blue" && game.tick % 15 === 0) {
    const angles = loadout.level === 1 ? [-0.18, 0, 0.18] : loadout.level === 2 ? [-0.3, -0.15, 0, 0.15, 0.3] : [-0.39, -0.26, -0.13, 0, 0.13, 0.26, 0.39];
    for (const angle of angles) addBullet(game, { kind: "spread", x: origin.x, y: origin.y - 3, width: 19, height: 6, vx: 12 * Math.cos(angle), vy: 12 * Math.sin(angle), damage: loadout.level === 3 ? 1.2 : 1, pierce: loadout.pierce });
    game.weaponShots.spread += angles.length;
  }
  if (loadout.color === "yellow" && game.tick % 20 === 0) {
    for (let index = 0; index < loadout.level; index += 1) {
      addBullet(game, { kind: "seeker", x: origin.x, y: origin.y - 4 + (index - (loadout.level - 1) / 2) * 13, width: 15, height: 8, vx: 9.5, vy: (index - (loadout.level - 1) / 2) * 1.2, damage: 1.5, pierce: loadout.pierce, turn: loadout.level === 3 ? 0.2 : 0.13 });
    }
    game.weaponShots.seeker += loadout.level;
  }
}

function addBullet(game, bullet) { game.bullets.push(bullet); }

function moveShots(game) {
  const targets = game.boss && !game.boss.dead ? [game.boss] : game.enemies.filter((enemy) => !enemy.dead);
  for (const bullet of game.bullets) {
    if (bullet.kind === "seeker" && targets.length) {
      let target = targets[0];
      let distance = Infinity;
      for (const candidate of targets) {
        const dx = candidate.x - bullet.x;
        const dy = candidate.y + candidate.height / 2 - bullet.y;
        const nextDistance = dx * dx + dy * dy;
        if (dx > -20 && nextDistance < distance) { target = candidate; distance = nextDistance; }
      }
      const targetY = target.y + target.height / 2;
      bullet.vy += Math.sign(targetY - bullet.y) * bullet.turn;
      bullet.vy = Math.max(-5, Math.min(5, bullet.vy));
    }
    bullet.x += bullet.vx;
    bullet.y += bullet.vy;
  }
}

function hitTargets(game) {
  for (const bullet of game.bullets) {
    for (const enemy of game.enemies) {
      if (!bullet.dead && !enemy.dead && overlapsRect(bullet, enemy)) damageTarget(game, bullet, enemy, 100);
    }
    if (!bullet.dead && game.boss && !game.boss.dead) hitBoss(game, bullet);
  }
}

function hitBoss(game, bullet) {
  const boss = game.boss;
  if (boss.type === "relay-sovereign") {
    const weakpoint = relaySovereignWeakpoint(boss);
    if (!overlapsRect(bullet, weakpoint)) return;
    game.bossWeakpointHits += 1;
    if (boss.nodesDestroyed < 3) {
      boss.nodeHp -= bullet.damage;
      boss.hp = Math.max(480, boss.hp - bullet.damage);
      if (bullet.pierce > 0) bullet.pierce -= 1;
      else bullet.dead = true;
      if (boss.nodeHp <= 0) {
        boss.nodesDestroyed += 1;
        boss.phase = boss.nodesDestroyed;
        boss.nodeHp = 60;
        game.relayPillarsDestroyed += 1;
        game.bossMechanicsResolved += 1;
        addScore(game, "defeat", 600);
      }
      return;
    }
    damageTarget(game, bullet, boss, 8000, 2.2);
    return;
  }
  if (boss.type === "prism-oracle") {
    const weakpoint = prismOracleWeakpoint(boss);
    if (!overlapsRect(bullet, weakpoint)) return;
    if (boss.revealsSeen.length < 2) {
      bullet.dead = true; game.bossShieldBlocks += 1; return;
    }
    game.bossWeakpointHits += 1;
    damageTarget(game, bullet, boss, 6000, 2.25);
    return;
  }
  if (boss.type === "furnace-controller") {
    const weakpoint = furnaceControllerWeakpoint(boss);
    if (!overlapsRect(bullet, weakpoint)) return;
    if (boss.coolantPodsDestroyed < 2) {
      boss.coolantHp -= bullet.damage;
      if (bullet.pierce > 0) bullet.pierce -= 1; else bullet.dead = true;
      if (boss.coolantHp <= 0) {
        boss.coolantPodsDestroyed += 1; boss.phase = boss.coolantPodsDestroyed; boss.coolantHp = 34;
        game.bossMechanicsResolved += 1;
        game.furnacePhasesSeen.push(boss.phase); addScore(game, "defeat", 650); game.shakeTicks = 16;
      }
      return;
    }
    if (boss.shieldClosed && bullet.x > weakpoint.x - 16) {
      bullet.dead = true;
      game.bossShieldBlocks += 1;
      return;
    }
    game.bossWeakpointHits += 1;
    damageTarget(game, bullet, boss, 5000, 2.4);
    return;
  }
  if (boss.type === "ark-core") {
    const weakpoint = arkCoreWeakpoint(boss);
    if (!overlapsRect(bullet, weakpoint)) return;
    game.bossWeakpointHits += 1;
    const organDamage = bullet.damage * 1.8;
    boss.partHp -= organDamage;
    boss.hp = Math.max(0, boss.hp - organDamage);
    if (bullet.pierce > 0) bullet.pierce -= 1;
    else bullet.dead = true;
    if (boss.partHp > 0) return;
    if (boss.phase < 2) {
      boss.phase += 1;
      boss.partHp = boss.phase === 2 ? 120 : 65;
      game.arkOrgansDestroyed += 1;
      game.bossMechanicsResolved += 1;
      addScore(game, "defeat", 750);
      return;
    }
    boss.dead = true;
    addScore(game, "defeat", 5000);
    addScore(game, "clear", 2000);
    if (game.stageMisses === 0) addScore(game, "noMiss", 2000);
    game.defeatedBoss = true;
    unlockNextStage(game);
    game.screen = "stage-result";
    return;
  }
  if (boss.type === "refinery-guardian") {
    const valve = refineryValveWeakpoint(boss);
    if (boss.valvesOpened < 2) {
      if (!overlapsRect(bullet, valve)) return;
      boss.valveHp -= bullet.damage;
      if (bullet.pierce > 0) bullet.pierce -= 1; else bullet.dead = true;
      if (boss.valveHp <= 0) {
        boss.valvesOpened += 1; boss.phase = boss.valvesOpened; boss.valveHp = 30;
        game.bossMechanicsResolved += 1;
        addScore(game, "defeat", 600); game.shakeTicks = 14;
      }
      return;
    }
    if (!overlapsRect(bullet, { x: boss.x + 24, y: boss.y + 42, width: 82, height: boss.height - 84 })) return;
    game.bossWeakpointHits += 1;
    damageTarget(game, bullet, boss, 5000, 2.5);
    return;
  }
  const shields = bossShieldRects(boss);
  if (boss.armorDestroyed < 2) {
    const armor = shields[boss.armorDestroyed];
    if (!overlapsRect(bullet, armor)) return;
    boss.armorHp -= bullet.damage;
    if (bullet.pierce > 0) bullet.pierce -= 1; else bullet.dead = true;
    if (boss.armorHp <= 0) {
      boss.armorDestroyed += 1; boss.armorHp = 32; game.bossShieldBlocks += 1;
      game.bossMechanicsResolved += 1;
      addScore(game, "defeat", 500); game.shakeTicks = 14;
    }
    return;
  }
  const weakpoint = bossWeakpoint(boss);
  const closestX = Math.max(bullet.x, Math.min(weakpoint.x, bullet.x + bullet.width));
  const closestY = Math.max(bullet.y, Math.min(weakpoint.y, bullet.y + bullet.height));
  const dx = weakpoint.x - closestX;
  const dy = weakpoint.y - closestY;
  if (dx * dx + dy * dy > weakpoint.radius * weakpoint.radius) return;
  game.bossWeakpointHits += 1;
  damageTarget(game, bullet, boss, 5000, 2.6);
}

function damageTarget(game, bullet, target, score, multiplier = 1) {
  target.hp -= bullet.damage * multiplier;
  target.hitFlash = 4;
  if (bullet.pierce > 0) bullet.pierce -= 1;
  else bullet.dead = true;
  if (target.hp > 0) return;
  if (target.type === "regenerating-swarm" && !target.regenerated) {
    target.regenerated = true;
    target.hp = 3;
    target.width *= 0.82;
    target.height *= 0.82;
    game.swarmRegenerations += 1;
    return;
  }
  if (target.type === "maw-larva" && !target.split) {
    for (const direction of [-1, 1]) game.enemies.push({
      ...enemyStats("maw-larva"), width: 24, height: 18, hp: 1, split: true,
      x: target.x, y: target.y + target.height / 2, phase: target.phase + direction,
      pattern: "larva-fragment", type: "maw-larva", spawnedTick: game.tick - 35 * direction, storyEnemy: true
    });
  }
  target.dead = true;
  createBurst(game, target.x + target.width / 2, target.y + target.height / 2, target === game.boss ? 28 : 8, target === game.boss ? "#fff09a" : "#ff8b4d");
  addScore(game, "defeat", score);
  game.killChain += 1;
  game.chainTicks = 150;
  game.maxKillChain = Math.max(game.maxKillChain, game.killChain);
  if (game.killChain >= 3) addScore(game, "chain", game.killChain * 25);
  if (target !== game.boss) game.defeatedEnemies += 1;
  if (target === game.boss) {
    addScore(game, "clear", 2000);
    if (game.stageMisses === 0) addScore(game, "noMiss", 2000);
    game.defeatedBoss = true;
    unlockNextStage(game);
    game.screen = "stage-result";
  }
}

function createBurst(game, x, y, count, color) {
  for (let index = 0; index < count; index += 1) {
    const angle = (index / count) * Math.PI * 2;
    const speed = 1.5 + (index % 4) * 0.65;
    game.effects.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 24 + index % 12, color });
  }
  game.effectsCreated += count;
}

function updateEffects(game) {
  for (const effect of game.effects) {
    effect.x += effect.vx;
    effect.y += effect.vy;
    effect.vx *= 0.96;
    effect.vy *= 0.96;
    effect.life -= 1;
  }
  game.effects = game.effects.filter(({ life }) => life > 0);
}

function spawnWaves(game) {
  const wave = stageById(game.stageId).waves[game.nextWave];
  if (!wave || game.tick < wave.tick) return;
  const stats = enemyStats(wave.type);
  for (let i = 0; i < wave.count; i += 1) {
    game.enemies.push({ x: 1280 + i * 80, y: wave.y + (wave.pattern === "weave" ? Math.sin(i) * 100 : i * 22), ...stats, phase: i * 0.8, pattern: wave.pattern, type: wave.type, spawnedTick: game.tick + i * 14 });
  }
  if (wave.type === "phase-ray") game.phaseRayWarnings += 1;
  if (wave.type === "relay-sniper") game.relaySniperWarnings += 1;
  game.nextWave += 1;
}

function spawnCrawlers(game) {
  const stage = stageById(game.stageId);
  const spawn = stage.crawlers?.[game.nextCrawler];
  if (!spawn || game.tick < spawn.tick) return;
  const terrain = stage.terrain.find((item) => item.id === spawn.terrainId);
  game.enemies.push({
    x: spawn.worldX - game.scrollX, y: terrain.y + terrain.height - 4,
    width: 86, height: 50, hp: 8, phase: game.nextCrawler,
    pattern: "ceiling-crawl", type: "hull-crawler", worldX: spawn.worldX,
    terrainId: spawn.terrainId, spawnedTick: game.tick
  });
  game.nextCrawler += 1;
}

function spawnLeeches(game) {
  const spawn = stageById(game.stageId).leeches?.[game.nextLeech];
  if (!spawn || game.tick < spawn.tick) return;
  game.enemies.push({
    x: spawn.worldX - game.scrollX, y: spawn.side === "ceiling" ? spawn.surfaceY : spawn.surfaceY - 52,
    width: 94, height: 52, hp: 7, phase: game.nextLeech, pattern: "wall-crawl",
    type: "condenser-leech", worldX: spawn.worldX, surfaceY: spawn.surfaceY,
    side: spawn.side, spawnedTick: game.tick
  });
  game.nextLeech += 1;
}

function spawnWalkers(game) {
  const spawn = stageById(game.stageId).walkers?.[game.nextWalker];
  if (!spawn || game.tick < spawn.tick) return;
  const cystId = ["cyst-a", "cyst-b", "cyst-c", "cyst-refuge"][game.nextWalker];
  if (!game.destroyedTerrain.includes(cystId)) {
    game.enemies.push({
      x: spawn.worldX - game.scrollX, y: spawn.side === "ceiling" ? spawn.surfaceY : spawn.surfaceY - 58,
      width: 104, height: 58, hp: 8, phase: game.nextWalker, pattern: "surface-walk",
      type: "cilia-walker", worldX: spawn.worldX, surfaceY: spawn.surfaceY,
      side: spawn.side ?? "floor", spawnedTick: game.tick
    });
  }
  game.nextWalker += 1;
}

function spawnMoles(game) {
  const spawn = stageById(game.stageId).moles?.[game.nextMole];
  if (!spawn || game.tick < spawn.tick) return;
  game.enemies.push({
    x: spawn.worldX - game.scrollX, y: spawn.side === "ceiling" ? spawn.surfaceY : spawn.surfaceY - 58,
    width: 108, height: 58, hp: 10, phase: game.nextMole, pattern: "rail-run",
    type: "furnace-mole", worldX: spawn.worldX, surfaceY: spawn.surfaceY,
    side: spawn.side ?? "floor", spawnedTick: game.tick
  });
  game.nextMole += 1;
}

function enemyStats(type) {
  if (type === "wreck-bulwark") return { width: 68, height: 45, hp: 10 };
  if (type === "shutter-turret") return { width: 76, height: 58, hp: 9 };
  if (type === "storm-diver") return { width: 60, height: 45, hp: 5 };
  if (type === "cloud-skimmer") return { width: 62, height: 42, hp: 4 };
  if (type === "regenerating-swarm") return { width: 58, height: 42, hp: 4, regenerated: false };
  if (type === "parasite-turret") return { width: 78, height: 58, hp: 9 };
  if (type === "ark-predator") return { width: 86, height: 58, hp: 7 };
  if (type === "heat-armor") return { width: 88, height: 58, hp: 11 };
  if (type === "solar-rammer") return { width: 78, height: 48, hp: 6 };
  if (type === "omni-turret") return { width: 76, height: 62, hp: 10 };
  if (type === "shard-skater") return { width: 92, height: 54, hp: 7 };
  if (type === "mirror-nest") return { width: 88, height: 72, hp: 10 };
  if (type === "phase-ray") return { width: 104, height: 62, hp: 8 };
  if (type === "lattice-keeper") return { width: 98, height: 74, hp: 11 };
  if (type === "gate-mite") return { width: 86, height: 52, hp: 6 };
  if (type === "vector-inverter") return { width: 92, height: 68, hp: 9 };
  if (type === "relay-sniper") return { width: 112, height: 62, hp: 7 };
  if (type === "null-carrier") return { width: 126, height: 78, hp: 14 };
  if (["scrap-dart", "vapor-wing", "spore-bomber", "flare-wisp", "prism-splitter", "phase-echo"].includes(type)) return { width: 56, height: 38, hp: 3 };
  if (["shield-drone", "lightning-pod", "membrane-stalker", "slag-hauler", "crystal-lancer", "relay-sapper"].includes(type)) return { width: 76, height: 54, hp: 7 };
  if (type === "mimetic-wreck") return { width: 156, height: 92, hp: 14 };
  if (type === "boarding-cutter") return { width: 42, height: 26, hp: 2 };
  if (type === "strike-arrester") return { width: 142, height: 108, hp: 13 };
  if (type === "pressure-thief") return { width: 46, height: 32, hp: 3 };
  if (type === "maw-larva") return { width: 38, height: 28, hp: 3, split: false };
  if (type === "nerve-knot") return { width: 168, height: 116, hp: 15 };
  if (type === "coolant-raider") return { width: 176, height: 76, hp: 16 };
  if (type === "corona-lance") return { width: 34, height: 112, hp: 3 };
  if (type === "decoy-shard") return { width: 30, height: 30, hp: 2 };
  if (type === "logic-binder") return { width: 174, height: 122, hp: 16 };
  if (type === "archive-ghost") return { width: 58, height: 40, hp: 4 };
  if (type === "command-leech") return { width: 148, height: 64, hp: 14 };
  return { width: 52, height: 36, hp: 3 };
}

function updateEnemies(game) {
  const stage = stageById(game.stageId);
  for (const enemy of game.enemies) {
    if (enemy.hitFlash > 0) enemy.hitFlash -= 1;
    if (enemy.type === "hull-crawler") {
      const anchor = stage.terrain.find((item) => item.id === enemy.terrainId);
      enemy.worldX -= 0.18;
      enemy.x = enemy.worldX - game.scrollX;
      enemy.y = anchor.y + anchor.height - 4;
      const age = game.tick - enemy.spawnedTick;
      if (enemy.x > 260 && enemy.x < 1160 && age > 0 && age % 150 === 0) dropMine(game, enemy);
    } else if (enemy.type === "condenser-leech") {
      enemy.worldX -= 0.28;
      enemy.x = enemy.worldX - game.scrollX;
      enemy.y = enemy.side === "ceiling" ? enemy.surfaceY : enemy.surfaceY - enemy.height;
      const age = game.tick - enemy.spawnedTick;
      if (enemy.x > 350 && enemy.x < 1120 && age > 0 && age % 135 === 0) fireEnemyShot(game, enemy);
    } else if (enemy.type === "cilia-walker") {
      enemy.worldX -= 0.34;
      enemy.x = enemy.worldX - game.scrollX;
      enemy.y = enemy.side === "ceiling" ? enemy.surfaceY : enemy.surfaceY - enemy.height;
    } else if (enemy.type === "furnace-mole") {
      enemy.worldX -= 0.42;
      enemy.x = enemy.worldX - game.scrollX;
      enemy.y = enemy.side === "ceiling" ? enemy.surfaceY : enemy.surfaceY - enemy.height;
      const age = game.tick - enemy.spawnedTick;
      if (enemy.x > 360 && enemy.x < 1120 && age > 0 && age % 120 === 0) {
        fireEnemyShot(game, enemy); fireEnemyShot(game, { ...enemy, y: enemy.y + (enemy.side === "ceiling" ? 32 : -32) });
      }
    } else {
      enemy.x -= enemy.type === "wreck-bulwark" ? 1.6 : 2.3;
      const age = game.tick - enemy.spawnedTick;
      if (enemy.type === "salvage-collector" && enemy.x < 1120 && enemy.x > 500 && age > 0 && age % 180 === 0) fireEnemyShot(game, enemy);
      if (enemy.type === "shutter-turret" && enemy.x < 1120 && enemy.x > 480 && age > 0 && age % 150 === 0) fireEnemyShot(game, enemy);
      if (enemy.type === "storm-diver" && age > 45) {
        enemy.x -= 2.2;
        enemy.y += Math.sign(game.player.y - enemy.y) * 2.6;
      }
      if (enemy.type === "parasite-turret") {
        enemy.x += 1.5;
        if (enemy.x < 1120 && enemy.x > 500 && age > 0 && age % 165 === 0) {
          fireEnemyShot(game, enemy); fireEnemyShot(game, { ...enemy, y: enemy.y - 24 }); fireEnemyShot(game, { ...enemy, y: enemy.y + 24 });
        }
      }
      if (enemy.type === "ark-predator") {
        if (age < 70) enemy.x += 1.9;
        else { enemy.x -= 3.8; enemy.y += Math.sign(game.player.y - enemy.y) * 2.2; }
      }
      if (enemy.type === "solar-rammer" && age > 75) { enemy.x -= 3.8; enemy.y += Math.sign(game.player.y - enemy.y) * 0.9; }
      if (enemy.type === "omni-turret") {
        enemy.x += 1.6;
        if (enemy.x < 1120 && enemy.x > 480 && age > 0 && age % 145 === 0) {
          fireOmniFan(game, enemy);
        }
      }
      if (enemy.type === "shard-skater") {
        enemy.x -= 1.5;
        enemy.y += Math.sin(age / 24 + enemy.phase) * 0.75;
      }
      if (enemy.type === "mirror-nest") {
        enemy.x += 1.7;
        if (enemy.x < 1120 && enemy.x > 500 && age > 0 && age % 420 === 0) fireCrystalShot(game, enemy, "mirror-orb", 2.2);
      }
      if (enemy.type === "phase-ray") {
        enemy.x += 1.65;
        if (age > 0 && age % 240 === 1) game.phaseRayWarnings += 1;
        if (enemy.x < 1140 && enemy.x > 540 && age > 75 && age % 540 === 76) fireCrystalShot(game, enemy, "phase-beam", 3.2);
      }
      if (enemy.type === "lattice-keeper") {
        enemy.x += 1.55;
        enemy.y += Math.sin(age / 35 + enemy.phase) * 1.2;
        if (enemy.x < 1120 && enemy.x > 520 && age > 0 && age % 420 === 0) fireCrystalShot(game, enemy, "lattice-shot", 2.5);
      }
      if (enemy.type === "gate-mite") {
        enemy.x -= 1.1;
        enemy.y += Math.sin(age / 18 + enemy.phase) * 1.15;
      }
      if (enemy.type === "vector-inverter") {
        enemy.x += 0.8;
        enemy.y += Math.sin(age / 32 + enemy.phase) * 1.4;
        if (enemy.x < 1120 && enemy.x > 520 && age > 0 && age % 360 === 0) fireCrystalShot(game, enemy, "vector-shot", 2.25);
      }
      if (enemy.type === "relay-sniper") {
        enemy.x += 0.5;
        if (age > 0 && age % 420 === 1) game.relaySniperWarnings += 1;
        if (enemy.x < 1140 && enemy.x > 520 && age > 110 && age % 420 === 111) fireCrystalShot(game, enemy, "relay-lance", 3.8);
      }
      if (enemy.type === "null-carrier") {
        enemy.x += 0.9;
        enemy.y += Math.sin(age / 42 + enemy.phase) * 0.9;
        if (enemy.x < 1120 && enemy.x > 540 && age > 0 && age % 180 === 0) {
          fireCrystalShot(game, enemy, "carrier-shot", 2.9);
          game.enemies.push({ x: enemy.x + 15, y: enemy.y + enemy.height - 8, ...enemyStats("gate-mite"), phase: age, pattern: "wall-run", type: "gate-mite", spawnedTick: game.tick });
        }
      }
      if (["scrap-dart", "vapor-wing", "spore-bomber", "flare-wisp", "prism-splitter", "phase-echo"].includes(enemy.type)) {
        enemy.x -= 1.7;
        enemy.y += Math.sin(age / 12 + enemy.phase) * 2.7;
      }
      if (["shield-drone", "lightning-pod", "membrane-stalker", "slag-hauler", "crystal-lancer", "relay-sapper"].includes(enemy.type)) {
        enemy.x += 1.25;
        const floorLane = enemy.pattern?.includes("floor");
        enemy.y += Math.sign((floorLane ? 590 : 130) - enemy.y) * 1.6;
        if (enemy.x < 1080 && enemy.x > 520 && age > 0 && age % 210 === 0) fireEnemyShot(game, enemy);
      }
      if (enemy.type === "mimetic-wreck") {
        enemy.x += age < 70 ? 2.3 : -1.5;
        if (age === 71) game.shakeTicks = Math.max(game.shakeTicks, 12);
        if (age > 70 && age % 150 === 0) dropMine(game, enemy);
      }
      if (enemy.type === "boarding-cutter") {
        enemy.x -= 4.4;
        enemy.y += Math.sign(game.player.y - enemy.y) * (age < 35 ? 0.5 : 3.4);
      }
      if (enemy.type === "strike-arrester") {
        enemy.x += 2.3;
        enemy.y += Math.sin(age / 32 + enemy.phase) * 0.65;
        enemy.attackWarning = age % 180 < 55;
        if (age > 55 && age % 180 === 56) fireCrystalShot(game, enemy, "arrester-bolt", 5.1);
      }
      if (enemy.type === "pressure-thief") {
        const target = game.setPieces.find(({ kind }) => kind === "worker-craft") ?? game.player;
        enemy.x += Math.sign(target.x - enemy.x) * 2.8;
        enemy.y += Math.sign(target.y - enemy.y) * 2.8;
      }
      if (enemy.type === "maw-larva") { enemy.x -= 3.5; enemy.y += Math.sin(age / 7 + enemy.phase) * 4.2; }
      if (enemy.type === "nerve-knot") {
        enemy.x += 2.3;
        if (age % 120 === 0) {
          for (const ally of game.enemies) if (ally !== enemy && Math.abs(ally.x - enemy.x) < 260) ally.hp += 1;
        }
        if (enemy.x < 1080 && enemy.x > 500 && age > 0 && age % 210 === 0) fireEnemyShot(game, enemy);
      }
      if (enemy.type === "coolant-raider") {
        const train = game.setPieces.find(({ kind }) => kind === "coolant-train");
        enemy.x += 1.3; enemy.y += Math.sign((train?.y ?? 420) - enemy.y) * 1.3;
        if (age > 0 && age % 135 === 0) fireOmniFan(game, enemy);
      }
      if (enemy.type === "corona-lance") {
        enemy.x -= age < 70 ? 0.25 : 5.2;
        if (age > 70 && age % 30 === 0) game.enemyBullets.push({ kind: "heat-trail", x: enemy.x, y: enemy.y + enemy.height / 2, radius: 10, vx: -0.4, vy: 0, age: 0 });
      }
      if (enemy.type === "decoy-shard") {
        enemy.x -= 2.8;
        if (age > 0 && age % 75 === 0) enemy.y = 70 + ((enemy.y * 7 + age * 13) % 560);
      }
      if (enemy.type === "logic-binder") {
        enemy.x += 2.3;
        enemy.attackWarning = age % 240 < 75;
        if (enemy.x < 1080 && enemy.x > 520 && age > 75 && age % 240 === 76) {
          fireCrystalShot(game, { ...enemy, y: enemy.y - 42 }, "lattice-shot", 3.1);
          fireCrystalShot(game, { ...enemy, y: enemy.y + 42 }, "lattice-shot", 3.1);
        }
      }
      if (enemy.type === "archive-ghost") {
        enemy.x -= 2.7; enemy.y += Math.sin(age / 13 + enemy.phase) * 2.9;
        if (age > 0 && age % 150 === 0) fireCrystalShot(game, enemy, ["enemy-shot", "ark-spore", "furnace-flare"][Math.floor(age / 150) % 3], 3.2);
      }
      if (enemy.type === "command-leech") {
        const beacon = game.setPieces.find(({ kind }) => kind === "allied-beacon") ?? game.player;
        enemy.x += Math.sign(beacon.x - enemy.x) * 1.2 + 1.1;
        enemy.y += Math.sign(beacon.y - enemy.y) * 1.35;
        if (enemy.x < 1080 && enemy.x > 420 && age > 0 && age % 210 === 0) fireCrystalShot(game, enemy, "vector-shot", 2.8);
      }
    }
    if (enemy.pattern === "weave" || enemy.pattern === "current-weave") enemy.y += Math.sin(game.tick / 28 + enemy.phase) * 1.8;
    if (!enemy.dead && game.respawnTicks === 0 && game.player.invulnerable === 0 && overlapsCircleRect(game.player, enemy)) takeCombatHit(game);
  }
  game.enemies = game.enemies.filter((enemy) => !enemy.dead && enemy.x > -80);
}

function fireCrystalShot(game, enemy, kind, speed) {
  const x = enemy.x;
  const y = enemy.y + enemy.height / 2;
  const dx = game.player.x - x;
  const dy = game.player.y - y;
  const length = Math.hypot(dx, dy) || 1;
  game.enemyBullets.push({ kind, x, y, radius: kind === "phase-beam" ? 7 : 6, vx: dx / length * speed, vy: dy / length * speed, age: 0, reflected: false });
  game.enemyShots += 1;
}

function fireEnemyShot(game, enemy) {
  const x = enemy.x;
  const y = enemy.y + enemy.height / 2;
  const dx = game.player.x - x;
  const dy = game.player.y - y;
  const length = Math.hypot(dx, dy) || 1;
  const speed = enemy.type === "parasite-turret" || enemy.type === "furnace-mole" ? 3.35 : 4.2;
  game.enemyBullets.push({ kind: "enemy-shot", x, y, radius: 6, vx: dx / length * speed, vy: dy / length * speed, age: 0 });
  game.enemyShots += 1;
}

function fireOmniFan(game, enemy) {
  const x = enemy.x;
  const y = enemy.y + enemy.height / 2;
  const aim = Math.atan2(game.player.y - y, game.player.x - x);
  for (const offset of [-0.48, -0.2, 0.28]) {
    game.enemyBullets.push({ kind: "enemy-shot", x, y, radius: 6, vx: Math.cos(aim + offset) * 3.6, vy: Math.sin(aim + offset) * 3.6, age: 0 });
    game.enemyShots += 1;
  }
}

function dropMine(game, enemy) {
  game.enemyBullets.push({ kind: "mine", x: enemy.x + enemy.width / 2, y: enemy.y + enemy.height - 2, radius: 11, vx: -0.35, vy: 1.2, age: 0 });
  game.enemyShots += 1;
}

function updateEnemyBullets(game) {
  const reflectors = terrainFor(game).filter(({ kind }) => kind === "reflective-crystal");
  const speedScale = DIFFICULTY_RULES[game.difficulty].enemyBulletSpeed;
  for (const bullet of game.enemyBullets) {
    bullet.age += 1;
    bullet.x += bullet.vx * speedScale;
    bullet.y += bullet.vy * speedScale;
    if (bullet.kind === "mine") bullet.vy = Math.min(2.5, bullet.vy + 0.025);
    if (!bullet.reflected && ["mirror-orb", "lattice-shot", "oracle-shard"].includes(bullet.kind)) {
      const reflector = reflectors.find((item) => overlapsCircleRect(bullet, { x: item.screenX, y: item.y, width: item.width, height: item.height }));
      if (reflector) {
        bullet.reflected = true;
        bullet.vy = reflector.reflectSide === "ceiling" ? Math.abs(bullet.vy) : -Math.abs(bullet.vy);
        bullet.y = reflector.reflectSide === "ceiling" ? reflector.y + reflector.height + bullet.radius + 1 : reflector.y - bullet.radius - 1;
        game.crystalReflections += 1;
      }
    }
    const dx = game.player.x - bullet.x;
    const dy = game.player.y - bullet.y;
    const triggerRadius = bullet.kind === "mine" && bullet.age >= 40 ? 52 : game.player.radius + bullet.radius;
    if (!bullet.dead && game.respawnTicks === 0 && game.player.invulnerable === 0 && dx * dx + dy * dy < triggerRadius * triggerRadius) {
      bullet.dead = true;
      game.combatHits += 1;
      takeCombatHit(game);
    }
  }
  game.enemyBullets = game.enemyBullets.filter((bullet) => !bullet.dead && bullet.x > -40 && bullet.x < 1320 && bullet.y > -40 && bullet.y < FIELD_HEIGHT + 40);
}

function updateBoss(game) {
  const stage = stageById(game.stageId);
  if (game.tick >= stage.bossStartTick && !game.boss) {
    game.enemies.length = 0;
    game.enemyBullets.length = 0;
    game.boss = game.stageId === "stage-06"
      ? { x: 900, y: 170, width: 340, height: 330, hp: 520, maxHp: 520, nodeHp: 42, nodesDestroyed: 0, dead: false, type: "relay-sovereign", strategy: BOSS_STRATEGIES["relay-sovereign"], age: 0, phase: 0, attackWarning: true }
      : game.stageId === "stage-05"
      ? { x: 930, y: 190, width: 320, height: 300, hp: 310, maxHp: 310, dead: false, type: "prism-oracle", strategy: BOSS_STRATEGIES["prism-oracle"], age: 0, phase: 0, attackWarning: true, realIndex: 0, revealsSeen: [] }
      : game.stageId === "stage-04"
      ? { x: 965, y: 205, width: 280, height: 270, hp: 280, maxHp: 280, coolantHp: 34, coolantPodsDestroyed: 0, dead: false, type: "furnace-controller", strategy: BOSS_STRATEGIES["furnace-controller"], age: 0, phase: 0, attackWarning: true, shieldClosed: true }
      : game.stageId === "stage-03"
      ? { x: 970, y: 205, width: 270, height: 270, hp: 300, maxHp: 300, partHp: 65, dead: false, type: "ark-core", strategy: BOSS_STRATEGIES["ark-core"], age: 0, phase: 0, attackWarning: true }
      : game.stageId === "stage-02"
        ? { x: 1010, y: 245, width: 230, height: 190, hp: 230, maxHp: 230, valveHp: 30, valvesOpened: 0, dead: false, type: "refinery-guardian", strategy: BOSS_STRATEGIES["refinery-guardian"], age: 0, phase: 0, attackWarning: true, shuttersClosed: false }
        : { x: 1020, y: 250, width: 220, height: 184, hp: 190, maxHp: 190, armorHp: 32, armorDestroyed: 0, dead: false, type: "wreck-warden", strategy: BOSS_STRATEGIES["wreck-warden"], age: 0, shieldAngle: 0, attackWarning: false };
  }
  if (!game.boss || game.boss.dead) return;
  const boss = game.boss;
  boss.age += 1;
  if (boss.type === "relay-sovereign") {
    updateRelaySovereign(game, boss);
    return;
  }
  if (boss.type === "prism-oracle") {
    updatePrismOracle(game, boss);
    return;
  }
  if (boss.type === "furnace-controller") {
    updateFurnaceController(game, boss);
    return;
  }
  if (boss.type === "refinery-guardian") {
    updateRefineryGuardian(game, boss);
    return;
  }
  if (boss.type === "ark-core") {
    updateArkCore(game, boss);
    return;
  }
  boss.y = 255 + Math.sin(boss.age / 75) * 145;
  boss.x = 980 + Math.sin(boss.age / 115) * 70;
  boss.shieldAngle = boss.age * 0.021;
  const cycle = boss.age % BOSS_CYCLE_TICKS;
  boss.attackWarning = cycle < BOSS_WARNING_TICKS;
  if (cycle >= BOSS_WARNING_TICKS && cycle < 228 && (cycle - BOSS_WARNING_TICKS) % 39 === 0) fireBossFan(game, boss);
  if (boss.age > 0 && boss.age % 180 === 0) dropMine(game, boss);
  if (game.respawnTicks === 0 && game.player.invulnerable === 0 && overlapsCircleRect(game.player, boss)) loseLife(game);
}

function updateRelaySovereign(game, boss) {
  boss.phase = boss.nodesDestroyed;
  if (!game.sovereignPhasesSeen.includes(boss.phase)) game.sovereignPhasesSeen.push(boss.phase);
  const cycle = boss.age % 420;
  boss.y = 175 + Math.sin(boss.age / 78) * 78;
  if (cycle === 0) boss.x = boss.x > 820 ? 690 : 900;
  boss.attackWarning = cycle < 90;
  if (cycle >= 90 && cycle < 330 && (cycle - 90) % Math.max(34, 62 - boss.phase * 7) === 0) {
    const origin = relaySovereignWeakpoint(boss);
    const originX = origin.x + origin.width / 2;
    const originY = origin.y + origin.height / 2;
    const aim = Math.atan2(game.player.y - originY, game.player.x - originX);
    const patterns = [[-0.24, 0, 0.24], [-0.34, -0.12, 0.12, 0.34], [-0.42, -0.2, 0, 0.2, 0.42], [-0.48, -0.29, -0.1, 0.1, 0.29, 0.48]];
    for (const offset of patterns[boss.phase]) {
      game.enemyBullets.push({ kind: "sovereign-shot", x: originX, y: originY, radius: 8, vx: Math.cos(aim + offset) * 3.55, vy: Math.sin(aim + offset) * 3.55, age: 0 });
      game.enemyShots += 1; game.bossShots += 1;
    }
  }
  if (game.respawnTicks === 0 && game.player.invulnerable === 0 && overlapsCircleRect(game.player, boss)) loseLife(game);
}

export function relaySovereignWeakpoint(boss) {
  const nodes = [
    { x: boss.x + 62, y: boss.y + 26, width: 55, height: 86 },
    { x: boss.x + 158, y: boss.y + 8, width: 55, height: 94 },
    { x: boss.x + 254, y: boss.y + 42, width: 55, height: 88 }
  ];
  return boss.nodesDestroyed < 3 ? nodes[boss.nodesDestroyed] : { x: boss.x + 34, y: boss.y + 126, width: 104, height: 105 };
}

function updatePrismOracle(game, boss) {
  boss.phase = Math.min(2, Math.floor((1 - boss.hp / boss.maxHp) * 3));
  if (!game.prismPhasesSeen.includes(boss.phase)) game.prismPhasesSeen.push(boss.phase);
  const cycle = boss.age % 420;
  boss.realIndex = Math.floor(boss.age / 240) % 3;
  if (!boss.revealsSeen.includes(boss.realIndex)) {
    boss.revealsSeen.push(boss.realIndex);
    game.bossMechanicsResolved += 1;
  }
  boss.y = 205 + Math.sin(boss.age / (74 - boss.phase * 8)) * 105;
  boss.attackWarning = cycle < 90;
  if (cycle === 1) game.phaseRayWarnings += 1;
  if (cycle >= 90 && cycle < 330 && (cycle - 90) % Math.max(35, 58 - boss.phase * 9) === 0) {
    const origin = prismOracleWeakpoint(boss);
    const centerY = origin.y + origin.height / 2;
    const aim = Math.atan2(game.player.y - centerY, game.player.x - origin.x);
    const offsets = boss.phase === 0 ? [-0.22, 0.22] : boss.phase === 1 ? [-0.3, 0, 0.3] : [-0.38, -0.13, 0.13, 0.38];
    for (const offset of offsets) {
      game.enemyBullets.push({ kind: "oracle-shard", x: origin.x, y: centerY, radius: 8, vx: Math.cos(aim + offset) * 3.55, vy: Math.sin(aim + offset) * 3.55, age: 0, reflected: false });
      game.enemyShots += 1; game.bossShots += 1;
    }
  }
  if (game.respawnTicks === 0 && game.player.invulnerable === 0 && overlapsCircleRect(game.player, boss)) loseLife(game);
}

export function prismOracleWeakpoint(boss) {
  const cloneY = Math.max(40, Math.min(420, boss.y + [-190, 0, 190][boss.realIndex]));
  return { x: boss.x + 52, y: cloneY + 98, width: 92, height: 104 };
}

function updateFurnaceController(game, boss) {
  boss.phase = boss.coolantPodsDestroyed;
  if (!game.furnacePhasesSeen.includes(boss.phase)) game.furnacePhasesSeen.push(boss.phase);
  const cycle = boss.age % 420;
  boss.y = 210 + Math.sin(boss.age / (72 - boss.phase * 8)) * 105;
  boss.x = 900 + Math.sin(boss.age / 95) * 125;
  boss.attackWarning = cycle < 90;
  boss.shieldClosed = boss.coolantPodsDestroyed < 2 || cycle >= 90 && cycle < 205;
  if (cycle === 1) game.heatWaveWarnings += 1;
  if (cycle >= 90 && cycle < 310 && (cycle - 90) % Math.max(34, 58 - boss.phase * 10) === 0) {
    const origin = furnaceControllerWeakpoint(boss);
    const aim = Math.atan2(game.player.y - origin.y, game.player.x - origin.x);
    for (const offset of [-0.28, 0.28]) {
      game.enemyBullets.push({ kind: "furnace-flare", x: origin.x, y: origin.y, radius: 8, vx: Math.cos(aim + offset) * 3.35, vy: Math.sin(aim + offset) * 3.35, age: 0 });
      game.enemyShots += 1; game.bossShots += 1;
    }
  }
  if (game.respawnTicks === 0 && game.player.invulnerable === 0 && overlapsCircleRect(game.player, boss)) loseLife(game);
}

export function furnaceControllerWeakpoint(boss) {
  return boss.coolantPodsDestroyed === 0 ? { x: boss.x + 34, y: boss.y + 42, width: 82, height: 72 }
    : boss.coolantPodsDestroyed === 1 ? { x: boss.x + 34, y: boss.y + boss.height - 126, width: 82, height: 72 }
      : { x: boss.x + 72, y: boss.y + 84, width: 104, height: 102 };
}

function updateArkCore(game, boss) {
  const cycle = boss.age % 390;
  boss.y = 210 + Math.sin(boss.age / 68) * 92;
  boss.attackWarning = cycle < 90;
  if (cycle === 1) game.membraneWarnings += 1;
  if (cycle >= 90 && cycle < 285 && (cycle - 90) % Math.max(44, 68 - boss.phase * 8) === 0) {
    const origin = arkCoreWeakpoint(boss);
    for (const offset of [-0.28, 0, 0.28]) {
      const aim = Math.atan2(game.player.y - (origin.y + origin.height / 2), game.player.x - origin.x) + offset;
      game.enemyBullets.push({ kind: "ark-spore", x: origin.x, y: origin.y + origin.height / 2, radius: 8, vx: Math.cos(aim) * 3.7, vy: Math.sin(aim) * 3.7, age: 0 });
      game.enemyShots += 1;
      game.bossShots += 1;
    }
  }
  if (game.respawnTicks === 0 && game.player.invulnerable === 0 && overlapsCircleRect(game.player, boss)) loseLife(game);
}

export function arkCoreWeakpoint(boss) {
  if (boss.phase === 0) return { x: boss.x + 30, y: boss.y + 42, width: 62, height: 72 };
  if (boss.phase === 1) return { x: boss.x + 30, y: boss.y + boss.height - 114, width: 62, height: 72 };
  return { x: boss.x + 82, y: boss.y + 88, width: 92, height: 94 };
}

function updateRefineryGuardian(game, boss) {
  const cycle = boss.age % 420;
  boss.phase = boss.valvesOpened;
  boss.y = 245 + Math.sin(boss.age / (70 - boss.phase * 8)) * (155 + boss.phase * 15);
  boss.attackWarning = cycle < 120;
  boss.shuttersClosed = cycle >= 120 && cycle < 270;
  if (cycle === 1) game.shutterWarnings += 1;
  if (cycle >= 120 && cycle < 300 && (cycle - 120) % Math.max(30, 55 - boss.phase * 9) === 0) {
    fireGuardianShot(game, boss);
  }
  if (game.respawnTicks === 0 && game.player.invulnerable === 0 && overlapsCircleRect(game.player, boss)) loseLife(game);
}

export function refineryValveWeakpoint(boss) {
  return boss.valvesOpened === 0
    ? { x: boss.x + 12, y: boss.y + 8, width: 72, height: 58 }
    : { x: boss.x + 12, y: boss.y + boss.height - 66, width: 72, height: 58 };
}

function fireGuardianShot(game, boss) {
  const originX = boss.x + 30;
  const originY = boss.y + boss.height / 2;
  for (const offset of [-0.18, 0.18]) {
    const aim = Math.atan2(game.player.y - originY, game.player.x - originX) + offset;
    game.enemyBullets.push({ kind: "guardian-shot", x: originX, y: originY, radius: 8, vx: Math.cos(aim) * 4.7, vy: Math.sin(aim) * 4.7, age: 0 });
    game.enemyShots += 1;
    game.bossShots += 1;
  }
}

function fireBossFan(game, boss) {
  const originX = boss.x + 36;
  const originY = boss.y + boss.height / 2;
  const aim = Math.atan2(game.player.y - originY, game.player.x - originX);
  for (const offset of [-0.24, 0, 0.24]) {
    const angle = aim + offset;
    game.enemyBullets.push({
      kind: "warden-shot", x: originX, y: originY, radius: 8,
      vx: Math.cos(angle) * 4.5, vy: Math.sin(angle) * 4.5, age: 0
    });
    game.enemyShots += 1;
    game.bossShots += 1;
  }
}

export function bossWeakpoint(boss) {
  return { x: boss.x + 54, y: boss.y + boss.height / 2, radius: 30 };
}

export function bossShieldRects(boss) {
  const center = bossWeakpoint(boss);
  return [0, Math.PI].map((offset) => {
    const angle = boss.shieldAngle + offset;
    return {
      x: center.x + Math.cos(angle) * 76 - 27,
      y: center.y + Math.sin(angle) * 76 - 36,
      width: 54,
      height: 72
    };
  });
}

export function bossWeakpointIsOpen(boss) {
  if (boss.type === "wreck-warden") return boss.armorDestroyed >= 2;
  if (boss.type === "refinery-guardian") return boss.valvesOpened >= 2;
  if (boss.type === "furnace-controller") return boss.coolantPodsDestroyed >= 2 && !boss.shieldClosed;
  if (boss.type === "relay-sovereign") return boss.nodesDestroyed >= 3;
  return true;
}

function checkTerrain(game) {
  if (game.respawnTicks > 0 || game.player.invulnerable > 0) return;
  for (const item of terrainFor(game)) {
    if (item.warning) continue;
    if (overlapsCirclePolygon(game.player, item.points)) {
      game.terrainHits += 1;
      loseLife(game);
      break;
    }
  }
}

function takeCombatHit(game) {
  if (game.barrier > 0) {
    game.barrier -= 1;
    game.player.invulnerable = 75;
    return;
  }
  if (game.cores.length) {
    const loadout = reactorLoadout(game.cores);
    game.cores.shift();
    game.player.invulnerable = 90 + loadout.invulnerability;
    return;
  }
  loseLife(game);
}

function loseLife(game) {
  game.lives -= 1;
  game.misses += 1;
  game.stageMisses += 1;
  game.killChain = 0;
  game.cores.length = 0;
  game.options = Math.max(0, game.options - 1);
  if (game.lives < 1) {
    game.lives = 0;
    game.screen = "continue";
    game.paused = false;
    game.bullets.length = 0;
    game.enemyBullets.length = 0;
    return;
  }
  restoreCheckpoint(game);
  game.player.x = 180;
  game.player.y = findSafeY(game);
  game.player.invulnerable = 0;
  game.respawnTicks = 120;
}

function latestCheckpoint(stage, tick) {
  let checkpoint = 0;
  for (const candidate of stage.checkpoints) {
    if (candidate > tick) break;
    checkpoint = candidate;
  }
  return checkpoint;
}

function firstAtOrAfter(items = [], tick) {
  const index = items.findIndex((item) => item.tick >= tick);
  return index < 0 ? items.length : index;
}

function restoreCheckpoint(game) {
  const stage = stageById(game.stageId);
  const checkpoint = latestCheckpoint(stage, game.tick);
  const checkpointX = checkpoint * stage.scrollSpeed;
  game.tick = checkpoint;
  game.checkpointTick = checkpoint;
  game.scrollX = Math.min(stage.bossStartTick * stage.scrollSpeed, checkpointX);
  game.bullets.length = 0;
  game.enemyBullets.length = 0;
  game.enemies.length = 0;
  game.pickups.length = 0;
  game.boss = null;
  game.effects.length = 0;
  game.setPieces.length = 0;
  game.acidLevel = 0;
  game.nextPatrolTick = checkpoint + 180;
  game.enemyGapTicks = 0;
  game.nextWave = firstAtOrAfter(stage.waves, checkpoint);
  game.nextCoreDrop = Math.max(0, firstAtOrAfter(stage.coreDrops, checkpoint) - 1);
  game.nextPowerUpDrop = Math.max(0, firstAtOrAfter(stage.powerUps, checkpoint) - 1);
  game.nextCrawler = firstAtOrAfter(stage.crawlers, checkpoint);
  game.nextLeech = firstAtOrAfter(stage.leeches, checkpoint);
  game.nextWalker = firstAtOrAfter(stage.walkers, checkpoint);
  game.nextMole = firstAtOrAfter(stage.moles, checkpoint);
  game.nextStoryEvent = firstAtOrAfter(stage.storyEvents, checkpoint);
  game.destroyedTerrain = game.destroyedTerrain.filter((id) => {
    const item = stage.terrain.find((candidate) => candidate.id === id);
    return item && item.x + item.width < checkpointX;
  });
  game.terrainDamage = {};
}

function addScore(game, category, points) {
  game.score += points;
  game.highScore = Math.max(game.highScore ?? 0, game.score);
  game.scoreBreakdown[category] += points;
}

function findSafeY(game) {
  const obstacles = terrainFor(game).filter((item) => item.screenX < 260 && item.screenX + item.width > 120);
  for (const y of [360, 300, 420, 240, 480, 180, 540]) {
    if (!obstacles.some((item) => y > item.y - 20 && y < item.y + item.height + 20)) return y;
  }
  return 360;
}

export function automaticInput(game) {
  if (game.screen !== "playing") return {};
  const ahead = terrainFor(game).filter((item) => item.screenX < 650 && item.screenX + item.width > game.player.x - 20);
  let targetY = 360;
  let safeMinY = 50;
  let safeMaxY = FIELD_HEIGHT - 50;
  for (const item of ahead) {
    if (item.y === 0) safeMinY = Math.max(safeMinY, item.height + 70);
    else if (item.y + item.height >= FIELD_HEIGHT) safeMaxY = Math.min(safeMaxY, item.y - 70);
  }
  targetY = Math.max(safeMinY, Math.min(safeMaxY, targetY));
  const middleObstacle = ahead.find((item) => !item.warning && item.y > 0 && item.y + item.height < FIELD_HEIGHT);
  if (middleObstacle) {
    const above = middleObstacle.y - 45;
    const below = middleObstacle.y + middleObstacle.height + 45;
    targetY = Math.abs(game.player.y - above) <= Math.abs(game.player.y - below) ? above : below;
  }
  const destructible = terrainFor(game).find((item) => item.kind === "destructible-cyst" && item.screenX > game.player.x + 260 && item.screenX < 920);
  if (destructible && !ahead.some((item) => item.kind !== "destructible-cyst" && item.screenX < 500)) {
    const edge = destructible.localPoints.map(({ y }) => destructible.y + y);
    targetY = destructible.y === 0 ? Math.max(...edge) - 18 : Math.min(...edge) + 18;
  }
  if (game.boss?.type === "ark-core") {
    const weakpoint = arkCoreWeakpoint(game.boss);
    targetY = weakpoint.y + weakpoint.height / 2;
  }
  if (game.boss?.type === "prism-oracle") {
    const weakpoint = prismOracleWeakpoint(game.boss);
    targetY = weakpoint.y + weakpoint.height / 2;
  }
  if (game.boss?.type === "relay-sovereign") {
    const weakpoint = relaySovereignWeakpoint(game.boss);
    targetY = weakpoint.y + weakpoint.height / 2;
  }
  if (game.boss?.type === "wreck-warden") {
    if (game.boss.armorDestroyed < 2) {
      const armor = bossShieldRects(game.boss)[game.boss.armorDestroyed];
      targetY = armor.y + armor.height / 2;
    } else targetY = bossWeakpoint(game.boss).y;
  }
  if (game.boss?.type === "refinery-guardian") {
    const weakpoint = game.boss.valvesOpened < 2 ? refineryValveWeakpoint(game.boss) : { y: game.boss.y + 42, height: game.boss.height - 84 };
    targetY = weakpoint.y + weakpoint.height / 2;
  }
  if (game.boss?.type === "furnace-controller") {
    const weakpoint = furnaceControllerWeakpoint(game.boss);
    targetY = weakpoint.y + weakpoint.height / 2;
  }
  targetY = Math.max(safeMinY, Math.min(safeMaxY, targetY));
  const pickup = game.pickups.find((item) => item.x > game.player.x - 20 && item.x < 720);
  if (pickup && !ahead.some((item) => pickup.y > item.y - 45 && pickup.y < item.y + item.height + 45)) targetY = pickup.y;
  const hazard = game.enemyBullets.find((item) => item.x > game.player.x - 30 && item.x < game.player.x + 280 && Math.abs(item.y - game.player.y) < 90);
  if (hazard) {
    const evadeY = game.player.y <= hazard.y ? game.player.y - 100 : game.player.y + 100;
    const blocked = ahead.some((item) => evadeY > item.y - 30 && evadeY < item.y + item.height + 30);
    if (!blocked) targetY = Math.max(50, Math.min(FIELD_HEIGHT - 50, evadeY));
  }
  const collisionThreat = game.enemies.find((enemy) => !enemy.dead && enemy.x > game.player.x - 20 && enemy.x < game.player.x + 300 && Math.abs(enemy.y + enemy.height / 2 - game.player.y) < 85);
  if (collisionThreat) {
    const threatY = collisionThreat.y + collisionThreat.height / 2;
    const evadeY = game.player.y <= threatY ? game.player.y - 115 : game.player.y + 115;
    const blocked = ahead.some((item) => evadeY > item.y - 32 && evadeY < item.y + item.height + 32);
    if (!blocked) targetY = Math.max(50, Math.min(FIELD_HEIGHT - 50, evadeY));
  }
  return { up: game.player.y > targetY + 8, down: game.player.y < targetY - 8, fire: true, altPressed: game.options > 0 && game.tick % 1200 === 1 };
}

export function snapshot(game) {
  const loadout = reactorLoadout(game.cores);
  return {
    screen: game.screen, stageId: game.stageId, difficulty: game.difficulty, tick: game.tick, checkpointTick: game.checkpointTick, paused: game.paused, lives: game.lives, score: game.score, highScore: game.highScore,
    audioSettingsOpen: game.audioSettingsOpen === true, audioSettingRow: game.audioSettingRow ?? 0,
    unlockedStage: game.unlockedStage, selectedStageIndex: game.selectedStageIndex, practiceMode: game.practiceMode,
    scoreBreakdown: { ...game.scoreBreakdown }, killChain: game.killChain, chainTicks: game.chainTicks,
    maxKillChain: game.maxKillChain, misses: game.misses, stageMisses: game.stageMisses,
    stageScore: game.score - game.stageStartScore, respawnTicks: game.respawnTicks,
    cores: [...game.cores], coresCollected: game.coresCollected, weapon: loadout.weapon,
    weaponLevel: loadout.level, pulseShots: game.pulseShots, weaponShots: { ...game.weaponShots },
    options: game.options, optionFormation: game.optionFormation, optionShots: game.optionShots,
    barrier: game.barrier, overdriveTicks: game.overdriveTicks, formationChanges: game.formationChanges,
    sectionIndex: game.sectionIndex, sectionBannerTicks: game.sectionBannerTicks,
    sectionTitle: game.sectionTitle, missionObjective: game.missionObjective, missionBeat: game.missionBeat,
    storyEventsCompleted: game.storyEventsCompleted, eventBannerTicks: game.eventBannerTicks,
    commSpeaker: game.commSpeaker, commTitle: game.commTitle, commMessage: game.commMessage,
    currentLandmark: game.currentLandmark, landmarksSeen: game.landmarksSeen, storyEnemySpawns: game.storyEnemySpawns,
    storyOutcome: game.storyOutcome,
    setPiecesActivated: game.setPiecesActivated, activeSetPieces: game.setPieces.length,
    environmentMechanicTicks: game.environmentMechanicTicks, acidLevel: game.acidLevel,
    patrolsSpawned: game.patrolsSpawned, maxEnemyGapTicks: game.maxEnemyGapTicks,
    effectsCreated: game.effectsCreated, activeEffects: game.effects.length,
    enemyShots: game.enemyShots, bossShots: game.bossShots, combatHits: game.combatHits,
    defeatedEnemies: game.defeatedEnemies,
    bossShieldBlocks: game.bossShieldBlocks, bossWeakpointHits: game.bossWeakpointHits,
    bossMechanicsResolved: game.bossMechanicsResolved,
    destroyedTerrain: [...game.destroyedTerrain],
    terrainHits: game.terrainHits, terrainVisible: terrainFor(game).length,
    bossHp: game.boss?.hp ?? null, bossWarning: game.boss?.attackWarning ?? false,
    bossPhase: game.boss?.phase ?? null, bossStrategy: game.boss?.strategy?.id ?? null,
    bossStrategyLabel: game.boss?.strategy?.label ?? null,
    bossWeakpointOpen: game.boss ? bossWeakpointIsOpen(game.boss) : false,
    currentTicks: game.currentTicks, shutterWarnings: game.shutterWarnings,
    membraneWarnings: game.membraneWarnings, heatWaveWarnings: game.heatWaveWarnings,
    swarmRegenerations: game.swarmRegenerations, arkOrgansDestroyed: game.arkOrgansDestroyed,
    furnacePhasesSeen: [...game.furnacePhasesSeen], crystalReflections: game.crystalReflections,
    phaseRayWarnings: game.phaseRayWarnings, prismPhasesSeen: [...game.prismPhasesSeen],
    phaseWallWarnings: game.phaseWallWarnings, gravityFlips: game.gravityFlips, gravityDirection: game.gravityDirection,
    relaySniperWarnings: game.relaySniperWarnings, relayPillarsDestroyed: game.relayPillarsDestroyed,
    sovereignPhasesSeen: [...game.sovereignPhasesSeen],
    defeatedBoss: game.defeatedBoss, hudTop: 720
  };
}

function unlockNextStage(game) {
  const clearedIndex = CAMPAIGN.indexOf(game.stageId);
  game.unlockedStage = Math.max(game.unlockedStage ?? 1, Math.min(CAMPAIGN.length, clearedIndex + 2));
}

function terrainFor(game) {
  return visibleTerrainFor(game.stageId, game.scrollX, game.destroyedTerrain, game.tick);
}
