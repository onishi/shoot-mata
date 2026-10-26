import { BOSS_START_TICK, SCROLL_SPEED, STAGE_01, visibleTerrain } from "../content/stage-01.mjs";
import { overlapsCircleRect, overlapsRect } from "./geometry.mjs";

const FIELD_HEIGHT = 720;
const PLAYER_SPEED = 5;
const SHOT_INTERVAL = 8;

export function createGame() {
  return {
    screen: "title",
    tick: 0,
    scrollX: 0,
    score: 0,
    lives: 3,
    cores: [],
    player: { x: 180, y: 360, radius: 5, invulnerable: 0 },
    bullets: [],
    enemies: [],
    boss: null,
    nextWave: 0,
    pulseShots: 0,
    terrainHits: 0,
    defeatedBoss: false,
    paused: false,
    introTicks: 0,
    resultTicks: 0
  };
}

export function beginStage(game) {
  Object.assign(game, createGame(), { screen: "stage-intro", introTicks: 90 });
}

export function updateGame(game, input = {}) {
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
  updateShots(game, input);
  updateEnemies(game);
  updateBoss(game);
  checkTerrain(game);
  return game;
}

function updatePlayer(game, input) {
  const dx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  const dy = (input.down ? 1 : 0) - (input.up ? 1 : 0);
  const scale = dx && dy ? Math.SQRT1_2 : 1;
  game.player.x = Math.max(24, Math.min(620, game.player.x + dx * PLAYER_SPEED * scale));
  game.player.y = Math.max(18, Math.min(FIELD_HEIGHT - 18, game.player.y + dy * PLAYER_SPEED * scale));
  if (game.player.invulnerable > 0) game.player.invulnerable -= 1;
}

function updateShots(game, input) {
  if (input.fire && game.tick % SHOT_INTERVAL === 0) {
    game.bullets.push({ x: game.player.x + 28, y: game.player.y, width: 18, height: 4, damage: 2 });
    game.pulseShots += 1;
  }
  for (const bullet of game.bullets) bullet.x += 13;

  for (const bullet of game.bullets) {
    for (const enemy of game.enemies) {
      if (!enemy.dead && overlapsRect(bullet, enemy)) {
        enemy.hp -= bullet.damage;
        bullet.dead = true;
        if (enemy.hp <= 0) { enemy.dead = true; game.score += 100; }
      }
    }
    if (game.boss && !game.boss.dead && overlapsRect(bullet, game.boss)) {
      game.boss.hp -= bullet.damage;
      bullet.dead = true;
      if (game.boss.hp <= 0) {
        game.boss.dead = true;
        game.defeatedBoss = true;
        game.score += 5000;
        game.screen = "stage-result";
      }
    }
  }
  game.bullets = game.bullets.filter((bullet) => !bullet.dead && bullet.x < 1300);
}

function spawnWaves(game) {
  const wave = STAGE_01.waves[game.nextWave];
  if (!wave || game.tick < wave.tick) return;
  for (let i = 0; i < wave.count; i += 1) {
    game.enemies.push({
      x: 1280 + i * 80,
      y: wave.y + (wave.pattern === "weave" ? Math.sin(i) * 100 : i * 22),
      width: 42,
      height: 28,
      hp: 6,
      phase: i * 0.8,
      pattern: wave.pattern
    });
  }
  game.nextWave += 1;
}

function updateEnemies(game) {
  for (const enemy of game.enemies) {
    enemy.x -= 2.3;
    if (enemy.pattern === "weave") enemy.y += Math.sin(game.tick / 28 + enemy.phase) * 1.8;
    const dx = game.player.x - (enemy.x + enemy.width / 2);
    const dy = game.player.y - (enemy.y + enemy.height / 2);
    if (!enemy.dead && game.player.invulnerable === 0 && dx * dx + dy * dy < 25 * 25) loseLife(game);
  }
  game.enemies = game.enemies.filter((enemy) => !enemy.dead && enemy.x > -80);
}

function updateBoss(game) {
  if (game.tick >= BOSS_START_TICK && !game.boss) {
    game.enemies.length = 0;
    game.boss = { x: 1050, y: 250, width: 170, height: 210, hp: 360, maxHp: 360, dead: false };
  }
  if (!game.boss || game.boss.dead) return;
  game.boss.y = 255 + Math.sin((game.tick - BOSS_START_TICK) / 75) * 145;
}

function checkTerrain(game) {
  if (game.player.invulnerable > 0) return;
  for (const item of visibleTerrain(game.scrollX)) {
    if (overlapsCircleRect(game.player, { x: item.screenX, y: item.y, width: item.width, height: item.height })) {
      game.terrainHits += 1;
      loseLife(game);
      break;
    }
  }
}

function loseLife(game) {
  game.lives -= 1;
  game.cores.length = 0;
  game.player.x = 180;
  game.player.y = findSafeY(game);
  game.player.invulnerable = 120;
  if (game.lives < 1) game.lives = 3;
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
  const ahead = visibleTerrain(game.scrollX).filter((item) => item.screenX < 420 && item.screenX + item.width > game.player.x - 20);
  let targetY = 360;
  for (const item of ahead) {
    if (item.y === 0) targetY = Math.max(targetY, item.height + 70);
    else if (item.y + item.height >= FIELD_HEIGHT) targetY = Math.min(targetY, item.y - 70);
  }
  return {
    up: game.player.y > targetY + 8,
    down: game.player.y < targetY - 8,
    fire: true
  };
}

export function snapshot(game) {
  return {
    screen: game.screen,
    tick: game.tick,
    lives: game.lives,
    score: game.score,
    cores: game.cores.length,
    pulseShots: game.pulseShots,
    terrainHits: game.terrainHits,
    terrainVisible: visibleTerrain(game.scrollX).length,
    bossHp: game.boss?.hp ?? null,
    defeatedBoss: game.defeatedBoss,
    hudTop: 720
  };
}
