export const TAU = Math.PI * 2;
export const SLOT_COUNT = 16;

const firstWave = [
  { slot: 0, distance: 1, speed: 0.055, hp: 2 },
  { slot: 5, distance: 1.16, speed: 0.047, hp: 2 },
  { slot: 11, distance: 1.3, speed: 0.044, hp: 2 }
];

export function createGame() {
  return {
    mode: 'title', playerSlot: 0, hammer: null, cooldown: 0,
    enemies: [], bell: 3, score: 0, chain: 0, message: 'PRESS ENTER', tick: 0
  };
}

export function startGame(game) {
  game.mode = 'playing';
  game.playerSlot = 0;
  game.hammer = null;
  game.cooldown = 0;
  game.enemies = firstWave.map((enemy, id) => ({ ...enemy, id, alive: true, flash: 0 }));
  game.bell = 3;
  game.score = 0;
  game.chain = 0;
  game.message = 'CAST — MOVE — CATCH';
  game.tick = 0;
  return game;
}

export function movePlayer(game, direction) {
  if (game.mode !== 'playing') return;
  game.playerSlot = (game.playerSlot + direction + SLOT_COUNT) % SLOT_COUNT;
}

export function castHammer(game) {
  if (game.mode !== 'playing' || game.hammer || game.cooldown > 0) return false;
  game.hammer = { slot: game.playerSlot, distance: 0.18, phase: 'out', previous: 0.18 };
  game.message = 'OUTBOUND';
  return true;
}

function slotDistance(a, b) {
  const raw = Math.abs(a - b);
  return Math.min(raw, SLOT_COUNT - raw);
}

function hitEnemies(game, from, to) {
  for (const enemy of game.enemies) {
    if (!enemy.alive || enemy.slot !== game.hammer.slot) continue;
    const crossed = game.hammer.phase === 'out'
      ? enemy.distance >= from && enemy.distance <= to
      : enemy.distance <= from && enemy.distance >= to;
    if (!crossed) continue;
    const damage = game.hammer.phase === 'out' ? 1 : 2;
    enemy.hp -= damage;
    enemy.flash = 8;
    const multiplier = 1 + Math.min(game.chain, 8) * 0.25;
    game.score += Math.round((game.hammer.phase === 'out' ? 100 : 200) * multiplier);
    game.message = game.hammer.phase === 'out' ? 'OUTBOUND HIT' : 'RETURN BREAK';
    if (enemy.hp <= 0) {
      enemy.alive = false;
      game.score += Math.round((game.hammer.phase === 'out' ? 400 : 800) * multiplier);
    }
  }
}

export function step(game, dt = 1 / 60) {
  if (game.mode !== 'playing') return game;
  game.tick += 1;
  game.cooldown = Math.max(0, game.cooldown - dt);

  if (game.hammer) {
    const hammer = game.hammer;
    hammer.previous = hammer.distance;
    hammer.distance += (hammer.phase === 'out' ? 1 : -1) * dt * 1.25;
    hitEnemies(game, hammer.previous, hammer.distance);
    if (hammer.phase === 'out' && hammer.distance >= 1.45) {
      hammer.distance = 1.45;
      hammer.phase = 'return';
      game.message = 'RETURNING — CATCH IT';
    } else if (hammer.phase === 'return' && hammer.distance <= 0.18) {
      if (slotDistance(game.playerSlot, hammer.slot) <= 1) {
        game.chain += 1;
        game.score += 250 * game.chain;
        game.message = `PERFECT CATCH ×${game.chain}`;
      } else {
        game.chain = 0;
        game.cooldown = 0.8;
        game.message = 'MISSED — RECAST DELAY';
      }
      game.hammer = null;
    }
  }

  for (const enemy of game.enemies) {
    if (!enemy.alive) continue;
    enemy.flash = Math.max(0, enemy.flash - 1);
    enemy.distance -= enemy.speed * dt;
    if (enemy.distance <= 0.2) {
      enemy.alive = false;
      game.bell -= 1;
      game.chain = 0;
      game.message = 'THE BELL IS STRUCK';
    }
  }

  if (game.bell <= 0) {
    game.mode = 'gameOver';
    game.message = 'BELL FALLEN — PRESS R';
  } else if (game.enemies.length && game.enemies.every(enemy => !enemy.alive)) {
    game.mode = 'waveClear';
    game.hammer = null;
    game.score += game.bell * 1000;
    game.message = 'DAWN HELD — PRESS R';
  }
  return game;
}

export function angleForSlot(slot) {
  return -Math.PI / 2 + (slot / SLOT_COUNT) * TAU;
}
