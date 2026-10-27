import { activeCurrent } from "../content/stage-02.mjs";
import { CAMPAIGN, stageById, visibleTerrainFor } from "../content/stages.mjs";
import { overlapsCircleRect, overlapsRect } from "./geometry.mjs";

const FIELD_HEIGHT = 720;
const PLAYER_SPEED = 5;
const SHOT_INTERVAL = 8;
const BOSS_CYCLE_TICKS = 360;
const BOSS_WARNING_TICKS = 72;
const WEAPON_NAMES = Object.freeze({ red: "LANCE", blue: "SPREAD", yellow: "SEEKER" });

export function createGame(stageId = "stage-01") {
  return {
    screen: "title", stageId, tick: 0, scrollX: 0, score: 0, stageStartScore: 0, lives: 3, cores: [], pickups: [],
    scoreBreakdown: { defeat: 0, pickup: 0, chain: 0, clear: 0, noMiss: 0 },
    killChain: 0, maxKillChain: 0, misses: 0, stageMisses: 0, respawnTicks: 0,
    nextCoreDrop: 0, coresCollected: 0,
    player: { x: 180, y: 360, radius: 5, invulnerable: 0 },
    bullets: [], enemyBullets: [], enemies: [], boss: null, nextWave: 0, nextCrawler: 0, nextLeech: 0, nextWalker: 0, nextMole: 0, pulseShots: 0,
    enemyShots: 0, bossShots: 0, combatHits: 0, defeatedEnemies: 0, destroyedTerrain: [], terrainDamage: {},
    bossShieldBlocks: 0, bossWeakpointHits: 0,
    weaponShots: { lance: 0, spread: 0, seeker: 0 },
    terrainHits: 0, defeatedBoss: false, paused: false, introTicks: 0, resultTicks: 0,
    currentTicks: 0, shutterWarnings: 0, membraneWarnings: 0, heatWaveWarnings: 0, swarmRegenerations: 0, arkOrgansDestroyed: 0, furnacePhasesSeen: [],
    crystalReflections: 0, phaseRayWarnings: 0, prismPhasesSeen: [],
    phaseWallWarnings: 0, gravityFlips: 0, gravityDirection: 0, relaySniperWarnings: 0,
    relayPillarsDestroyed: 0, sovereignPhasesSeen: []
  };
}

export function beginStage(game, stageId = "stage-01", { preserveProgress = false } = {}) {
  const progress = preserveProgress ? {
    score: game.score, stageStartScore: game.score, lives: game.lives, misses: game.misses
  } : {};
  Object.assign(game, createGame(stageId), progress, { screen: "stage-intro", introTicks: 90 });
}

export function beginCampaign(game, { showHowTo = false } = {}) {
  Object.assign(game, createGame("stage-01"), { screen: showHowTo ? "how-to-play" : "stage-intro", introTicks: showHowTo ? 0 : 90 });
}

export function returnToTitle(game) {
  Object.assign(game, createGame());
}

export function collectCore(game, color) {
  if (!WEAPON_NAMES[color]) throw new TypeError(`Unknown core color: ${color}`);
  if (game.cores.length === 3) game.cores.shift();
  game.cores.push(color);
  game.coresCollected += 1;
  addScore(game, "pickup", 75);
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
  if (game.screen === "how-to-play") {
    if (input.confirmPressed) {
      game.screen = "stage-intro";
      game.introTicks = 90;
    }
    return game;
  }
  if (game.screen === "continue") {
    if (input.confirmPressed) beginStage(game);
    else if (input.cancelPressed) returnToTitle(game);
    return game;
  }
  if (game.screen === "stage-result") {
    if (input.cancelPressed) returnToTitle(game);
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
  if (game.paused) return game;
  if (game.screen === "stage-intro") {
    game.introTicks -= 1;
    if (game.introTicks <= 0) game.screen = "playing";
    return game;
  }
  if (game.screen !== "playing") return game;

  game.tick += 1;
  const stage = stageById(game.stageId);
  game.scrollX = Math.min(stage.bossStartTick * stage.scrollSpeed, game.tick * stage.scrollSpeed);
  updatePlayer(game, input);
  spawnWaves(game);
  spawnCrawlers(game);
  spawnLeeches(game);
  spawnWalkers(game);
  spawnMoles(game);
  spawnCoreDrops(game);
  updatePickups(game);
  updateShots(game, input);
  updateEnemies(game);
  updateEnemyBullets(game);
  updateBoss(game);
  if (game.stageId === "stage-06" && game.tick % 90 === 1 && terrainFor(game).some((item) => item.warning && item.kind === "phase-wall")) game.phaseWallWarnings += 1;
  checkTerrain(game);
  return game;
}

function updatePlayer(game, input) {
  if (game.respawnTicks > 0) {
    game.respawnTicks -= 1;
    if (game.respawnTicks === 0) game.player.invulnerable = 120;
    return;
  }
  const dx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  const dy = (input.down ? 1 : 0) - (input.up ? 1 : 0);
  const scale = dx && dy ? Math.SQRT1_2 : 1;
  game.player.x = Math.max(24, Math.min(620, game.player.x + dx * PLAYER_SPEED * scale));
  game.player.y = Math.max(18, Math.min(FIELD_HEIGHT - 18, game.player.y + dy * PLAYER_SPEED * scale));
  if (game.stageId === "stage-02") {
    const current = activeCurrent(game.tick);
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
}

function spawnCoreDrops(game) {
  const drop = stageById(game.stageId).coreDrops[game.nextCoreDrop];
  if (!drop || game.tick < drop.tick) return;
  game.pickups.push({ x: 1300, y: drop.y, color: drop.color, radius: 20 });
  game.nextCoreDrop += 1;
}

function updatePickups(game) {
  const loadout = reactorLoadout(game.cores);
  for (const pickup of game.pickups) {
    pickup.x -= 2.7;
    const dx = game.player.x - pickup.x;
    const dy = game.player.y - pickup.y;
    const radius = 28 + loadout.collectionRadius;
    if (dx * dx + dy * dy <= radius * radius) {
      collectCore(game, pickup.color);
      pickup.collected = true;
    }
  }
  game.pickups = game.pickups.filter((pickup) => !pickup.collected && pickup.x > -40);
}

function updateShots(game, input) {
  const canFire = input.fire && game.respawnTicks === 0;
  if (canFire && game.tick % SHOT_INTERVAL === 0) {
    addBullet(game, { kind: "pulse", x: game.player.x + 28, y: game.player.y - 2, width: 18, height: 4, vx: 13, vy: 0, damage: 2, pierce: 0 });
    game.pulseShots += 1;
  }
  if (canFire) fireReactorWeapon(game, reactorLoadout(game.cores));
  moveShots(game);
  hitTerrain(game);
  hitTargets(game);
  game.bullets = game.bullets.filter((bullet) => !bullet.dead && bullet.x < 1340 && bullet.y > -40 && bullet.y < FIELD_HEIGHT + 40);
}

function hitTerrain(game) {
  const terrain = terrainFor(game);
  for (const bullet of game.bullets) {
    if (bullet.dead) continue;
    const item = terrain.find((candidate) => !candidate.warning && overlapsRect(bullet, { x: candidate.screenX, y: candidate.y, width: candidate.width, height: candidate.height }));
    if (!item) continue;
    bullet.dead = true;
    if (!["destructible-wreck", "destructible-cyst", "destructible-shield", "destructible-relay"].includes(item.kind)) continue;
    game.terrainDamage[item.id] = (game.terrainDamage[item.id] ?? 0) + bullet.damage;
    if (game.terrainDamage[item.id] >= item.hp && !game.destroyedTerrain.includes(item.id)) {
      game.destroyedTerrain.push(item.id);
      if (item.kind === "destructible-relay") game.relayPillarsDestroyed += 1;
      addScore(game, "defeat", 250);
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
        addScore(game, "defeat", 600);
      }
      return;
    }
    damageTarget(game, bullet, boss, 8000);
    return;
  }
  if (boss.type === "prism-oracle") {
    const weakpoint = prismOracleWeakpoint(boss);
    if (!overlapsRect(bullet, weakpoint)) return;
    game.bossWeakpointHits += 1;
    damageTarget(game, bullet, boss, 6000);
    return;
  }
  if (boss.type === "furnace-controller") {
    const weakpoint = furnaceControllerWeakpoint(boss);
    if (boss.shieldClosed && bullet.x > weakpoint.x - 16) {
      bullet.dead = true;
      game.bossShieldBlocks += 1;
      return;
    }
    if (!overlapsRect(bullet, weakpoint)) return;
    game.bossWeakpointHits += 1;
    damageTarget(game, bullet, boss, 5000);
    return;
  }
  if (boss.type === "ark-core") {
    const weakpoint = arkCoreWeakpoint(boss);
    if (!overlapsRect(bullet, weakpoint)) return;
    game.bossWeakpointHits += 1;
    boss.partHp -= bullet.damage;
    boss.hp = Math.max(0, boss.hp - bullet.damage);
    if (bullet.pierce > 0) bullet.pierce -= 1;
    else bullet.dead = true;
    if (boss.partHp > 0) return;
    if (boss.phase < 2) {
      boss.phase += 1;
      boss.partHp = boss.phase === 2 ? 180 : 90;
      game.arkOrgansDestroyed += 1;
      addScore(game, "defeat", 750);
      return;
    }
    boss.dead = true;
    addScore(game, "defeat", 5000);
    addScore(game, "clear", 2000);
    if (game.stageMisses === 0) addScore(game, "noMiss", 2000);
    game.defeatedBoss = true;
    game.screen = "stage-result";
    return;
  }
  if (boss.type === "refinery-guardian") {
    if (boss.shuttersClosed && (bullet.y < boss.y + 48 || bullet.y > boss.y + boss.height - 48)) {
      bullet.dead = true;
      game.bossShieldBlocks += 1;
      return;
    }
    if (!overlapsRect(bullet, { x: boss.x + 24, y: boss.y + 42, width: 82, height: boss.height - 84 })) return;
    game.bossWeakpointHits += 1;
    damageTarget(game, bullet, boss, 5000);
    return;
  }
  const shields = bossShieldRects(boss);
  if (shields.some((shield) => overlapsRect(bullet, shield))) {
    bullet.dead = true;
    game.bossShieldBlocks += 1;
    return;
  }
  const weakpoint = bossWeakpoint(boss);
  const closestX = Math.max(bullet.x, Math.min(weakpoint.x, bullet.x + bullet.width));
  const closestY = Math.max(bullet.y, Math.min(weakpoint.y, bullet.y + bullet.height));
  const dx = weakpoint.x - closestX;
  const dy = weakpoint.y - closestY;
  if (dx * dx + dy * dy > weakpoint.radius * weakpoint.radius) return;
  game.bossWeakpointHits += 1;
  damageTarget(game, bullet, boss, 5000);
}

function damageTarget(game, bullet, target, score) {
  target.hp -= bullet.damage;
  if (bullet.pierce > 0) bullet.pierce -= 1;
  else bullet.dead = true;
  if (target.hp > 0) return;
  if (target.type === "regenerating-swarm" && !target.regenerated) {
    target.regenerated = true;
    target.hp = 5;
    target.width *= 0.82;
    target.height *= 0.82;
    game.swarmRegenerations += 1;
    return;
  }
  target.dead = true;
  addScore(game, "defeat", score);
  game.killChain += 1;
  game.maxKillChain = Math.max(game.maxKillChain, game.killChain);
  if (game.killChain >= 3) addScore(game, "chain", game.killChain * 25);
  if (target !== game.boss) game.defeatedEnemies += 1;
  if (target === game.boss) {
    addScore(game, "clear", 2000);
    if (game.stageMisses === 0) addScore(game, "noMiss", 2000);
    game.defeatedBoss = true;
    game.screen = "stage-result";
  }
}

function spawnWaves(game) {
  const wave = stageById(game.stageId).waves[game.nextWave];
  if (!wave || game.tick < wave.tick) return;
  const stats = enemyStats(wave.type);
  for (let i = 0; i < wave.count; i += 1) {
    game.enemies.push({ x: 1280 + i * 80, y: wave.y + (wave.pattern === "weave" ? Math.sin(i) * 100 : i * 22), ...stats, phase: i * 0.8, pattern: wave.pattern, type: wave.type, spawnedTick: game.tick + i * 14 });
  }
  game.nextWave += 1;
}

function spawnCrawlers(game) {
  const stage = stageById(game.stageId);
  const spawn = stage.crawlers?.[game.nextCrawler];
  if (!spawn || game.tick < spawn.tick) return;
  const terrain = stage.terrain.find((item) => item.id === spawn.terrainId);
  game.enemies.push({
    x: spawn.worldX - game.scrollX, y: terrain.y + terrain.height - 4,
    width: 86, height: 50, hp: 18, phase: game.nextCrawler,
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
    width: 94, height: 52, hp: 16, phase: game.nextLeech, pattern: "wall-crawl",
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
      width: 104, height: 58, hp: 18, phase: game.nextWalker, pattern: "surface-walk",
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
    width: 108, height: 58, hp: 22, phase: game.nextMole, pattern: "rail-run",
    type: "furnace-mole", worldX: spawn.worldX, surfaceY: spawn.surfaceY,
    side: spawn.side ?? "floor", spawnedTick: game.tick
  });
  game.nextMole += 1;
}

function enemyStats(type) {
  if (type === "wreck-bulwark") return { width: 68, height: 45, hp: 22 };
  if (type === "shutter-turret") return { width: 76, height: 58, hp: 20 };
  if (type === "storm-diver") return { width: 60, height: 45, hp: 10 };
  if (type === "cloud-skimmer") return { width: 62, height: 42, hp: 8 };
  if (type === "regenerating-swarm") return { width: 58, height: 42, hp: 7, regenerated: false };
  if (type === "parasite-turret") return { width: 78, height: 58, hp: 20 };
  if (type === "ark-predator") return { width: 86, height: 58, hp: 16 };
  if (type === "heat-armor") return { width: 88, height: 58, hp: 24 };
  if (type === "solar-rammer") return { width: 78, height: 48, hp: 14 };
  if (type === "omni-turret") return { width: 76, height: 62, hp: 22 };
  if (type === "shard-skater") return { width: 92, height: 54, hp: 15 };
  if (type === "mirror-nest") return { width: 88, height: 72, hp: 22 };
  if (type === "phase-ray") return { width: 104, height: 62, hp: 18 };
  if (type === "lattice-keeper") return { width: 98, height: 74, hp: 24 };
  if (type === "gate-mite") return { width: 86, height: 52, hp: 14 };
  if (type === "vector-inverter") return { width: 92, height: 68, hp: 20 };
  if (type === "relay-sniper") return { width: 112, height: 62, hp: 14 };
  if (type === "null-carrier") return { width: 126, height: 78, hp: 30 };
  return { width: 52, height: 36, hp: 7 };
}

function updateEnemies(game) {
  const stage = stageById(game.stageId);
  for (const enemy of game.enemies) {
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
          fireEnemyShot(game, { ...enemy, y: enemy.y - 28 }); fireEnemyShot(game, enemy); fireEnemyShot(game, { ...enemy, y: enemy.y + 28 });
        }
      }
      if (enemy.type === "shard-skater") {
        enemy.x -= 1.5;
        enemy.y += Math.sin(age / 24 + enemy.phase) * 0.75;
      }
      if (enemy.type === "mirror-nest") {
        enemy.x += 1.7;
        if (enemy.x < 1120 && enemy.x > 500 && age > 0 && age % 300 === 0) fireCrystalShot(game, enemy, "mirror-orb", 2.2);
      }
      if (enemy.type === "phase-ray") {
        enemy.x += 1.65;
        if (enemy.x < 1140 && enemy.x > 540 && age > 0 && age % 240 === 1) game.phaseRayWarnings += 1;
        if (enemy.x < 1140 && enemy.x > 540 && age > 75 && age % 420 === 76) fireCrystalShot(game, enemy, "phase-beam", 3.2);
      }
      if (enemy.type === "lattice-keeper") {
        enemy.x += 1.55;
        enemy.y += Math.sin(age / 35 + enemy.phase) * 1.2;
        if (enemy.x < 1120 && enemy.x > 520 && age > 0 && age % 280 === 0) fireCrystalShot(game, enemy, "lattice-shot", 2.5);
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
        if (enemy.x < 1140 && enemy.x > 520 && age > 0 && age % 420 === 1) game.relaySniperWarnings += 1;
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
    }
    if (enemy.pattern === "weave" || enemy.pattern === "current-weave") enemy.y += Math.sin(game.tick / 28 + enemy.phase) * 1.8;
    const dx = game.player.x - (enemy.x + enemy.width / 2);
    const dy = game.player.y - (enemy.y + enemy.height / 2);
    if (!enemy.dead && game.respawnTicks === 0 && game.player.invulnerable === 0 && dx * dx + dy * dy < 25 * 25) takeCombatHit(game);
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

function dropMine(game, enemy) {
  game.enemyBullets.push({ kind: "mine", x: enemy.x + enemy.width / 2, y: enemy.y + enemy.height - 2, radius: 11, vx: -0.35, vy: 1.2, age: 0 });
  game.enemyShots += 1;
}

function updateEnemyBullets(game) {
  const reflectors = terrainFor(game).filter(({ kind }) => kind === "reflective-crystal");
  for (const bullet of game.enemyBullets) {
    bullet.age += 1;
    bullet.x += bullet.vx;
    bullet.y += bullet.vy;
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
      ? { x: 900, y: 170, width: 340, height: 330, hp: 660, maxHp: 660, nodeHp: 60, nodesDestroyed: 0, dead: false, type: "relay-sovereign", age: 0, phase: 0, attackWarning: true }
      : game.stageId === "stage-05"
      ? { x: 930, y: 190, width: 320, height: 300, hp: 430, maxHp: 430, dead: false, type: "prism-oracle", age: 0, phase: 0, attackWarning: true, realIndex: 1 }
      : game.stageId === "stage-04"
      ? { x: 965, y: 205, width: 280, height: 270, hp: 390, maxHp: 390, dead: false, type: "furnace-controller", age: 0, phase: 0, attackWarning: true, shieldClosed: true }
      : game.stageId === "stage-03"
      ? { x: 970, y: 205, width: 270, height: 270, hp: 360, maxHp: 360, partHp: 90, dead: false, type: "ark-core", age: 0, phase: 0, attackWarning: true }
      : game.stageId === "stage-02"
        ? { x: 1010, y: 245, width: 230, height: 190, hp: 300, maxHp: 300, dead: false, type: "refinery-guardian", age: 0, phase: 0, attackWarning: true, shuttersClosed: false }
        : { x: 1020, y: 250, width: 220, height: 184, hp: 260, maxHp: 260, dead: false, type: "wreck-warden", age: 0, shieldAngle: 0, attackWarning: false };
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
  boss.shieldAngle = boss.age * 0.021;
  const cycle = boss.age % BOSS_CYCLE_TICKS;
  boss.attackWarning = cycle < BOSS_WARNING_TICKS;
  if (cycle >= BOSS_WARNING_TICKS && cycle < 228 && (cycle - BOSS_WARNING_TICKS) % 39 === 0) fireBossFan(game, boss);
  if (game.respawnTicks === 0 && game.player.invulnerable === 0 && overlapsCircleRect(game.player, boss)) loseLife(game);
}

function updateRelaySovereign(game, boss) {
  boss.phase = boss.nodesDestroyed;
  if (!game.sovereignPhasesSeen.includes(boss.phase)) game.sovereignPhasesSeen.push(boss.phase);
  const cycle = boss.age % 420;
  boss.y = 175 + Math.sin(boss.age / 78) * 78;
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
  boss.realIndex = 1;
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
  return { x: boss.x + 52, y: boss.y + 98, width: 92, height: 104 };
}

function updateFurnaceController(game, boss) {
  boss.phase = Math.min(2, Math.floor((1 - boss.hp / boss.maxHp) * 3));
  if (!game.furnacePhasesSeen.includes(boss.phase)) game.furnacePhasesSeen.push(boss.phase);
  const cycle = boss.age % 420;
  boss.y = 210 + Math.sin(boss.age / (72 - boss.phase * 8)) * 105;
  boss.attackWarning = cycle < 90;
  boss.shieldClosed = boss.phase < 2 && cycle >= 90 && cycle < 205;
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
  return boss.phase === 0 ? { x: boss.x + 42, y: boss.y + 54, width: 72, height: 66 }
    : boss.phase === 1 ? { x: boss.x + 42, y: boss.y + boss.height - 120, width: 72, height: 66 }
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
  boss.phase = Math.min(2, Math.floor((1 - boss.hp / boss.maxHp) * 3));
  boss.y = 245 + Math.sin(boss.age / (70 - boss.phase * 8)) * (155 + boss.phase * 15);
  boss.attackWarning = cycle < 120;
  boss.shuttersClosed = cycle >= 120 && cycle < 270;
  if (cycle === 1) game.shutterWarnings += 1;
  if (cycle >= 120 && cycle < 300 && (cycle - 120) % Math.max(30, 55 - boss.phase * 9) === 0) {
    fireGuardianShot(game, boss);
  }
  if (game.respawnTicks === 0 && game.player.invulnerable === 0 && overlapsCircleRect(game.player, boss)) loseLife(game);
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

function checkTerrain(game) {
  if (game.respawnTicks > 0 || game.player.invulnerable > 0) return;
  for (const item of terrainFor(game)) {
    if (item.warning) continue;
    if (overlapsCircleRect(game.player, { x: item.screenX, y: item.y, width: item.width, height: item.height })) {
      game.terrainHits += 1;
      loseLife(game);
      break;
    }
  }
}

function takeCombatHit(game) {
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
  if (game.lives < 1) {
    game.lives = 0;
    game.screen = "continue";
    game.paused = false;
    game.bullets.length = 0;
    game.enemyBullets.length = 0;
    return;
  }
  game.player.x = 180;
  game.player.y = findSafeY(game);
  game.player.invulnerable = 0;
  game.respawnTicks = 120;
}

function addScore(game, category, points) {
  game.score += points;
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
    targetY = destructible.y === 0 ? destructible.height - 22 : destructible.y + 22;
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
  targetY = Math.max(safeMinY, Math.min(safeMaxY, targetY));
  const pickup = game.pickups.find((item) => item.x > game.player.x - 20 && item.x < 720);
  if (pickup && !ahead.some((item) => pickup.y > item.y - 45 && pickup.y < item.y + item.height + 45)) targetY = pickup.y;
  const hazard = game.enemyBullets.find((item) => item.x > game.player.x - 30 && item.x < game.player.x + 280 && Math.abs(item.y - game.player.y) < 90);
  if (hazard) {
    const evadeY = game.player.y <= hazard.y ? game.player.y - 100 : game.player.y + 100;
    const blocked = ahead.some((item) => evadeY > item.y - 30 && evadeY < item.y + item.height + 30);
    if (!blocked) targetY = Math.max(50, Math.min(FIELD_HEIGHT - 50, evadeY));
  }
  return { up: game.player.y > targetY + 8, down: game.player.y < targetY - 8, fire: true };
}

export function snapshot(game) {
  const loadout = reactorLoadout(game.cores);
  return {
    screen: game.screen, stageId: game.stageId, tick: game.tick, lives: game.lives, score: game.score,
    scoreBreakdown: { ...game.scoreBreakdown }, killChain: game.killChain,
    maxKillChain: game.maxKillChain, misses: game.misses, stageMisses: game.stageMisses,
    stageScore: game.score - game.stageStartScore, respawnTicks: game.respawnTicks,
    cores: [...game.cores], coresCollected: game.coresCollected, weapon: loadout.weapon,
    weaponLevel: loadout.level, pulseShots: game.pulseShots, weaponShots: { ...game.weaponShots },
    enemyShots: game.enemyShots, bossShots: game.bossShots, combatHits: game.combatHits,
    defeatedEnemies: game.defeatedEnemies,
    bossShieldBlocks: game.bossShieldBlocks, bossWeakpointHits: game.bossWeakpointHits,
    destroyedTerrain: [...game.destroyedTerrain],
    terrainHits: game.terrainHits, terrainVisible: terrainFor(game).length,
    bossHp: game.boss?.hp ?? null, bossWarning: game.boss?.attackWarning ?? false,
    bossPhase: game.boss?.phase ?? null, currentTicks: game.currentTicks, shutterWarnings: game.shutterWarnings,
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

function terrainFor(game) {
  return visibleTerrainFor(game.stageId, game.scrollX, game.destroyedTerrain, game.tick);
}
