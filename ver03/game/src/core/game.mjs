import { BOSS_START_TICK, SCROLL_SPEED, STAGE_01, visibleTerrain } from "../content/stage-01.mjs";
import { overlapsCircleRect, overlapsRect } from "./geometry.mjs";

const FIELD_HEIGHT = 720;
const PLAYER_SPEED = 5;
const SHOT_INTERVAL = 8;
const BOSS_CYCLE_TICKS = 360;
const BOSS_WARNING_TICKS = 72;
const WEAPON_NAMES = Object.freeze({ red: "LANCE", blue: "SPREAD", yellow: "SEEKER" });

export function createGame() {
  return {
    screen: "title", tick: 0, scrollX: 0, score: 0, lives: 3, cores: [], pickups: [],
    scoreBreakdown: { defeat: 0, pickup: 0, chain: 0, clear: 0, noMiss: 0 },
    killChain: 0, maxKillChain: 0, misses: 0, respawnTicks: 0,
    nextCoreDrop: 0, coresCollected: 0,
    player: { x: 180, y: 360, radius: 5, invulnerable: 0 },
    bullets: [], enemyBullets: [], enemies: [], boss: null, nextWave: 0, nextCrawler: 0, pulseShots: 0,
    enemyShots: 0, bossShots: 0, combatHits: 0, defeatedEnemies: 0, destroyedTerrain: [], terrainDamage: {},
    bossShieldBlocks: 0, bossWeakpointHits: 0,
    weaponShots: { lance: 0, spread: 0, seeker: 0 },
    terrainHits: 0, defeatedBoss: false, paused: false, introTicks: 0, resultTicks: 0
  };
}

export function beginStage(game) {
  Object.assign(game, createGame(), { screen: "stage-intro", introTicks: 90 });
}

export function beginCampaign(game, { showHowTo = false } = {}) {
  Object.assign(game, createGame(), { screen: showHowTo ? "how-to-play" : "stage-intro", introTicks: showHowTo ? 0 : 90 });
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
  game.scrollX = Math.min(BOSS_START_TICK * SCROLL_SPEED, game.tick * SCROLL_SPEED);
  updatePlayer(game, input);
  spawnWaves(game);
  spawnCrawlers(game);
  spawnCoreDrops(game);
  updatePickups(game);
  updateShots(game, input);
  updateEnemies(game);
  updateEnemyBullets(game);
  updateBoss(game);
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
  if (game.player.invulnerable > 0) game.player.invulnerable -= 1;
}

function spawnCoreDrops(game) {
  const drop = STAGE_01.coreDrops[game.nextCoreDrop];
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
  const terrain = visibleTerrain(game.scrollX, game.destroyedTerrain);
  for (const bullet of game.bullets) {
    if (bullet.dead) continue;
    const item = terrain.find((candidate) => overlapsRect(bullet, { x: candidate.screenX, y: candidate.y, width: candidate.width, height: candidate.height }));
    if (!item) continue;
    bullet.dead = true;
    if (item.kind !== "destructible-wreck") continue;
    game.terrainDamage[item.id] = (game.terrainDamage[item.id] ?? 0) + bullet.damage;
    if (game.terrainDamage[item.id] >= item.hp && !game.destroyedTerrain.includes(item.id)) {
      game.destroyedTerrain.push(item.id);
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
  target.dead = true;
  addScore(game, "defeat", score);
  game.killChain += 1;
  game.maxKillChain = Math.max(game.maxKillChain, game.killChain);
  if (game.killChain >= 3) addScore(game, "chain", game.killChain * 25);
  if (target !== game.boss) game.defeatedEnemies += 1;
  if (target === game.boss) {
    addScore(game, "clear", 2000);
    if (game.misses === 0) addScore(game, "noMiss", 2000);
    game.defeatedBoss = true;
    game.screen = "stage-result";
  }
}

function spawnWaves(game) {
  const wave = STAGE_01.waves[game.nextWave];
  if (!wave || game.tick < wave.tick) return;
  const stats = wave.type === "wreck-bulwark" ? { width: 68, height: 45, hp: 22 } : { width: 52, height: 36, hp: 7 };
  for (let i = 0; i < wave.count; i += 1) {
    game.enemies.push({ x: 1280 + i * 80, y: wave.y + (wave.pattern === "weave" ? Math.sin(i) * 100 : i * 22), ...stats, phase: i * 0.8, pattern: wave.pattern, type: wave.type, spawnedTick: game.tick + i * 14 });
  }
  game.nextWave += 1;
}

function spawnCrawlers(game) {
  const spawn = STAGE_01.crawlers[game.nextCrawler];
  if (!spawn || game.tick < spawn.tick) return;
  const terrain = STAGE_01.terrain.find((item) => item.id === spawn.terrainId);
  game.enemies.push({
    x: spawn.worldX - game.scrollX, y: terrain.y + terrain.height - 4,
    width: 86, height: 50, hp: 18, phase: game.nextCrawler,
    pattern: "ceiling-crawl", type: "hull-crawler", worldX: spawn.worldX,
    terrainId: spawn.terrainId, spawnedTick: game.tick
  });
  game.nextCrawler += 1;
}

function updateEnemies(game) {
  for (const enemy of game.enemies) {
    if (enemy.type === "hull-crawler") {
      const anchor = STAGE_01.terrain.find((item) => item.id === enemy.terrainId);
      enemy.worldX -= 0.18;
      enemy.x = enemy.worldX - game.scrollX;
      enemy.y = anchor.y + anchor.height - 4;
      const age = game.tick - enemy.spawnedTick;
      if (enemy.x > 260 && enemy.x < 1160 && age > 0 && age % 150 === 0) dropMine(game, enemy);
    } else {
      enemy.x -= enemy.type === "wreck-bulwark" ? 1.6 : 2.3;
      const age = game.tick - enemy.spawnedTick;
      if (enemy.type === "salvage-collector" && enemy.x < 1120 && enemy.x > 500 && age > 0 && age % 180 === 0) fireEnemyShot(game, enemy);
    }
    if (enemy.pattern === "weave") enemy.y += Math.sin(game.tick / 28 + enemy.phase) * 1.8;
    const dx = game.player.x - (enemy.x + enemy.width / 2);
    const dy = game.player.y - (enemy.y + enemy.height / 2);
    if (!enemy.dead && game.respawnTicks === 0 && game.player.invulnerable === 0 && dx * dx + dy * dy < 25 * 25) takeCombatHit(game);
  }
  game.enemies = game.enemies.filter((enemy) => !enemy.dead && enemy.x > -80);
}

function fireEnemyShot(game, enemy) {
  const x = enemy.x;
  const y = enemy.y + enemy.height / 2;
  const dx = game.player.x - x;
  const dy = game.player.y - y;
  const length = Math.hypot(dx, dy) || 1;
  game.enemyBullets.push({ kind: "enemy-shot", x, y, radius: 6, vx: dx / length * 4.2, vy: dy / length * 4.2, age: 0 });
  game.enemyShots += 1;
}

function dropMine(game, enemy) {
  game.enemyBullets.push({ kind: "mine", x: enemy.x + enemy.width / 2, y: enemy.y + enemy.height - 2, radius: 11, vx: -0.35, vy: 1.2, age: 0 });
  game.enemyShots += 1;
}

function updateEnemyBullets(game) {
  for (const bullet of game.enemyBullets) {
    bullet.age += 1;
    bullet.x += bullet.vx;
    bullet.y += bullet.vy;
    if (bullet.kind === "mine") bullet.vy = Math.min(2.5, bullet.vy + 0.025);
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
  if (game.tick >= BOSS_START_TICK && !game.boss) {
    game.enemies.length = 0;
    game.enemyBullets.length = 0;
    game.boss = {
      x: 1020, y: 250, width: 220, height: 184, hp: 260, maxHp: 260,
      dead: false, type: "wreck-warden", age: 0, shieldAngle: 0, attackWarning: false
    };
  }
  if (!game.boss || game.boss.dead) return;
  const boss = game.boss;
  boss.age += 1;
  boss.y = 255 + Math.sin(boss.age / 75) * 145;
  boss.shieldAngle = boss.age * 0.021;
  const cycle = boss.age % BOSS_CYCLE_TICKS;
  boss.attackWarning = cycle < BOSS_WARNING_TICKS;
  if (cycle >= BOSS_WARNING_TICKS && cycle < 228 && (cycle - BOSS_WARNING_TICKS) % 39 === 0) fireBossFan(game, boss);
  if (game.respawnTicks === 0 && game.player.invulnerable === 0 && overlapsCircleRect(game.player, boss)) loseLife(game);
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
  for (const item of visibleTerrain(game.scrollX, game.destroyedTerrain)) {
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
  const obstacles = visibleTerrain(game.scrollX).filter((item) => item.screenX < 260 && item.screenX + item.width > 120);
  for (const y of [360, 300, 420, 240, 480, 180, 540]) {
    if (!obstacles.some((item) => y > item.y - 20 && y < item.y + item.height + 20)) return y;
  }
  return 360;
}

export function automaticInput(game) {
  if (game.screen !== "playing") return {};
  const ahead = visibleTerrain(game.scrollX, game.destroyedTerrain).filter((item) => item.screenX < 420 && item.screenX + item.width > game.player.x - 20);
  let targetY = 360;
  for (const item of ahead) {
    if (item.y === 0) targetY = Math.max(targetY, item.height + 70);
    else if (item.y + item.height >= FIELD_HEIGHT) targetY = Math.min(targetY, item.y - 70);
  }
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
    screen: game.screen, tick: game.tick, lives: game.lives, score: game.score,
    scoreBreakdown: { ...game.scoreBreakdown }, killChain: game.killChain,
    maxKillChain: game.maxKillChain, misses: game.misses, respawnTicks: game.respawnTicks,
    cores: [...game.cores], coresCollected: game.coresCollected, weapon: loadout.weapon,
    weaponLevel: loadout.level, pulseShots: game.pulseShots, weaponShots: { ...game.weaponShots },
    enemyShots: game.enemyShots, bossShots: game.bossShots, combatHits: game.combatHits,
    defeatedEnemies: game.defeatedEnemies,
    bossShieldBlocks: game.bossShieldBlocks, bossWeakpointHits: game.bossWeakpointHits,
    destroyedTerrain: [...game.destroyedTerrain],
    terrainHits: game.terrainHits, terrainVisible: visibleTerrain(game.scrollX, game.destroyedTerrain).length,
    bossHp: game.boss?.hp ?? null, bossWarning: game.boss?.attackWarning ?? false,
    defeatedBoss: game.defeatedBoss, hudTop: 720
  };
}
