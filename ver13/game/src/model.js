export const TAU = Math.PI * 2;
export const SLOT_COUNT = 16;

export const WAVES = [
  [
    { kind: 'marcher', slot: 0, distance: 1, speed: 0.055, hp: 2 },
    { kind: 'marcher', slot: 5, distance: 1.16, speed: 0.047, hp: 2 },
    { kind: 'marcher', slot: 11, distance: 1.3, speed: 0.044, hp: 2 }
  ],
  [
    { kind: 'bulwark', slot: 2, distance: 1.02, speed: 0.04, hp: 2, armor: 1 },
    { kind: 'marcher', slot: 8, distance: 1.18, speed: 0.052, hp: 2 },
    { kind: 'bulwark', slot: 13, distance: 1.34, speed: 0.038, hp: 2, armor: 1 }
  ],
  [
    { kind: 'rusher', slot: 1, distance: 0.98, speed: 0.105, hp: 1 },
    { kind: 'rusher', slot: 6, distance: 1.18, speed: 0.1, hp: 1 },
    { kind: 'rusher', slot: 11, distance: 1.38, speed: 0.095, hp: 1 }
  ]
];

function loadWave(game, waveIndex) {
  game.wave = waveIndex;
  game.enemies = WAVES[waveIndex].map((enemy, id) => ({
    armor: 0, ...enemy, id, alive: true, flash: 0, blocked: 0
  }));
}

function emit(game, type) {
  game.audioEvents.push(type);
}

function effect(game, kind, slot, distance, life = 0.34) {
  game.effects.push({ kind, slot, distance, life, duration: life });
}

export function drainAudioEvents(game) {
  return game.audioEvents.splice(0);
}

export function createGame() {
  return {
    mode: 'attract', playerSlot: 0, hammer: null, cooldown: 0,
    enemies: [], bell: 3, score: 0, chain: 0, wave: 0,
    message: 'INSERT COIN', tick: 0, audioEvents: [], credits: 0,
    demo: false, demoTime: 0, effects: []
  };
}

export function startGame(game, waveIndex = 0) {
  const safeWave = Number.isInteger(waveIndex) && waveIndex >= 0 && waveIndex < WAVES.length ? waveIndex : 0;
  game.mode = 'playing';
  game.playerSlot = 0;
  game.hammer = null;
  game.cooldown = 0;
  loadWave(game, safeWave);
  game.bell = 3;
  game.score = 0;
  game.chain = 0;
  game.message = safeWave === 0 ? 'CAST — MOVE — CATCH' : `WAVE ${safeWave + 1} — HOLD THE BELL`;
  game.tick = 0;
  game.demo = false;
  game.demoTime = 0;
  game.effects = [];
  game.audioEvents.length = 0;
  emit(game, 'start');
  return game;
}

export function insertCoin(game) {
  const credits = Math.min(9, game.credits + 1);
  if (game.mode !== 'playing' || game.demo) {
    Object.assign(game, createGame());
    game.mode = 'startWait';
    game.message = 'PUSH START';
  }
  game.credits = credits;
  emit(game, 'coin');
  return true;
}

export function startCredit(game, waveIndex = 0) {
  if (game.mode !== 'startWait' || game.credits <= 0) return false;
  game.credits -= 1;
  startGame(game, waveIndex);
  return true;
}

export function startDemo(game) {
  if (game.mode !== 'attract' || game.credits > 0) return false;
  startGame(game, 0);
  game.demo = true;
  game.message = 'HOW TO PLAY — WATCH THE RETURN';
  return true;
}

export function returnToAttract(game) {
  const credits = game.credits;
  Object.assign(game, createGame());
  game.credits = credits;
  if (credits > 0) {
    game.mode = 'startWait';
    game.message = 'PUSH START';
  }
  return game;
}

export function driveDemo(game) {
  if (!game.demo || game.mode !== 'playing') return false;
  const targetSlot = game.hammer?.slot ?? game.enemies
    .filter(enemy => enemy.alive)
    .sort((a, b) => a.distance - b.distance)[0]?.slot;
  if (!Number.isInteger(targetSlot)) return false;
  const clockwise = (targetSlot - game.playerSlot + SLOT_COUNT) % SLOT_COUNT;
  if (clockwise !== 0) movePlayer(game, clockwise <= SLOT_COUNT / 2 ? 1 : -1);
  else if (!game.hammer) castHammer(game);
  return true;
}

export function startNextWave(game) {
  if (game.mode !== 'waveBrief' || game.wave + 1 >= WAVES.length) return false;
  loadWave(game, game.wave + 1);
  game.mode = 'playing';
  game.hammer = null;
  game.cooldown = 0;
  if (game.wave === 1) game.message = 'BULWARK — RETURN BREAKS GUARD';
  else if (game.wave === 2) game.message = 'RUSHER — STRIKE BEFORE THE WARNING CLOSES';
  else game.message = `WAVE ${game.wave + 1}`;
  emit(game, 'waveStart');
  return true;
}

export function movePlayer(game, direction) {
  if (game.mode !== 'playing') return;
  game.playerSlot = (game.playerSlot + direction + SLOT_COUNT) % SLOT_COUNT;
}

export function castHammer(game) {
  if (game.mode !== 'playing' || game.hammer || game.cooldown > 0) return false;
  game.hammer = { slot: game.playerSlot, distance: 0.18, phase: 'out', previous: 0.18 };
  game.message = 'OUTBOUND';
  emit(game, 'cast');
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
    if (game.hammer.phase === 'out' && enemy.armor > 0) {
      enemy.armor -= 1;
      enemy.blocked = 14;
      enemy.flash = 8;
      effect(game, 'guard', enemy.slot, enemy.distance, 0.28);
      game.hammer.guardBlocked = true;
      game.score += 50;
      game.message = 'GUARD BLOCK — HIT THE RETURN';
      emit(game, 'guard');
      continue;
    }
    enemy.hp -= damage;
    enemy.flash = 8;
    effect(game, 'hit', enemy.slot, enemy.distance, 0.24);
    const multiplier = 1 + Math.min(game.chain, 8) * 0.25;
    game.score += Math.round((game.hammer.phase === 'out' ? 100 : 200) * multiplier);
    game.message = game.hammer.phase === 'out' ? 'OUTBOUND HIT' : 'RETURN BREAK';
    if (game.hammer.phase === 'out') emit(game, 'outboundHit');
    if (enemy.hp <= 0) {
      enemy.alive = false;
      effect(game, 'break', enemy.slot, enemy.distance, 0.46);
      game.score += Math.round((game.hammer.phase === 'out' ? 400 : 800) * multiplier);
      emit(game, game.hammer.phase === 'return' ? 'returnBreak' : 'outboundBreak');
    }
  }
}

export function step(game, dt = 1 / 60) {
  if (game.mode !== 'playing') return game;
  game.tick += 1;
  game.cooldown = Math.max(0, game.cooldown - dt);
  for (const visual of game.effects) visual.life -= dt;
  game.effects = game.effects.filter(visual => visual.life > 0);

  if (game.hammer) {
    const hammer = game.hammer;
    hammer.previous = hammer.distance;
    hammer.distance += (hammer.phase === 'out' ? 1 : -1) * dt * 1.25;
    hitEnemies(game, hammer.previous, hammer.distance);
    if (hammer.phase === 'out' && hammer.distance >= 1.45) {
      hammer.distance = 1.45;
      hammer.phase = 'return';
      game.message = hammer.guardBlocked ? 'GUARD SHATTERED — RETURN BREAKS IT' : 'RETURNING — CATCH IT';
      emit(game, 'turn');
    } else if (hammer.phase === 'return' && hammer.distance <= 0.18) {
      if (slotDistance(game.playerSlot, hammer.slot) <= 1) {
        game.chain += 1;
        game.score += 250 * game.chain;
        game.message = `PERFECT CATCH ×${game.chain}`;
        effect(game, 'catch', hammer.slot, 0.2, 0.5);
        emit(game, 'catch');
      } else {
        game.chain = 0;
        game.cooldown = 0.8;
        game.message = 'MISSED — RECAST DELAY';
        emit(game, 'miss');
      }
      game.hammer = null;
    }
  }

  for (const enemy of game.enemies) {
    if (!enemy.alive) continue;
    enemy.flash = Math.max(0, enemy.flash - 1);
    enemy.blocked = Math.max(0, enemy.blocked - 1);
    enemy.distance -= enemy.speed * dt;
    if (enemy.distance <= 0.2) {
      enemy.alive = false;
      effect(game, 'bell', enemy.slot, 0.2, 0.55);
      game.bell -= 1;
      game.chain = 0;
      game.message = 'THE BELL IS STRUCK';
      emit(game, 'bellHit');
    }
  }

  if (game.bell <= 0) {
    game.mode = 'gameOver';
    game.message = 'BELL FALLEN — PRESS R';
    emit(game, 'gameOver');
  } else if (game.enemies.length && game.enemies.every(enemy => !enemy.alive)) {
    game.hammer = null;
    game.score += game.bell * 1000;
    if (game.wave + 1 < WAVES.length) {
      game.mode = 'waveBrief';
      game.message = `WAVE ${game.wave + 1} HELD — PRESS SPACE`;
      emit(game, 'waveClear');
    } else {
      game.mode = 'waveClear';
      game.message = 'DAWN HELD — PRESS R';
      emit(game, 'victory');
    }
  }
  return game;
}

export function angleForSlot(slot) {
  return -Math.PI / 2 + (slot / SLOT_COUNT) * TAU;
}
