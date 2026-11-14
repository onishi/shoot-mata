export const TAU = Math.PI * 2;
export const SLOT_COUNT = 16;
export const WAVE_FORMATION_COUNT = 3;

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
  ],
  [
    { kind: 'orbiter', slot: 1, distance: 1.02, speed: 0.038, hp: 2, orbitEvery: 0.82, orbitDirection: 1 },
    { kind: 'orbiter', slot: 7, distance: 1.2, speed: 0.036, hp: 2, orbitEvery: 0.9, orbitDirection: -1 },
    { kind: 'orbiter', slot: 12, distance: 1.36, speed: 0.034, hp: 2, orbitEvery: 0.98, orbitDirection: 1 }
  ],
  [
    { kind: 'marcher', slot: 0, distance: 0.98, speed: 0.052, hp: 2 },
    { kind: 'orbiter', slot: 4, distance: 1.13, speed: 0.04, hp: 2, orbitEvery: 0.8, orbitDirection: 1 },
    { kind: 'marcher', slot: 9, distance: 1.26, speed: 0.05, hp: 2 },
    { kind: 'orbiter', slot: 13, distance: 1.39, speed: 0.038, hp: 2, orbitEvery: 0.86, orbitDirection: -1 }
  ],
  [
    { kind: 'bulwark', slot: 1, distance: 1.02, speed: 0.041, hp: 2, armor: 1 },
    { kind: 'rusher', slot: 5, distance: 1.06, speed: 0.098, hp: 1 },
    { kind: 'orbiter', slot: 8, distance: 1.18, speed: 0.04, hp: 2, orbitEvery: 0.76, orbitDirection: 1 },
    { kind: 'rusher', slot: 11, distance: 1.3, speed: 0.094, hp: 1 },
    { kind: 'orbiter', slot: 14, distance: 1.42, speed: 0.038, hp: 2, orbitEvery: 0.82, orbitDirection: -1 }
  ],
  [
    { kind: 'dancer', slot: 1, distance: 1.04, speed: 0.034, hp: 2, sidestepDirection: 1 },
    { kind: 'dancer', slot: 6, distance: 1.2, speed: 0.032, hp: 2, sidestepDirection: -1 },
    { kind: 'dancer', slot: 12, distance: 1.36, speed: 0.03, hp: 2, sidestepDirection: 1 }
  ],
  [
    { kind: 'dancer', slot: 0, distance: 1.02, speed: 0.035, hp: 2, sidestepDirection: 1 },
    { kind: 'bulwark', slot: 4, distance: 1.14, speed: 0.041, hp: 2, armor: 1 },
    { kind: 'dancer', slot: 8, distance: 1.27, speed: 0.033, hp: 2, sidestepDirection: -1 },
    { kind: 'rusher', slot: 12, distance: 1.4, speed: 0.094, hp: 1 }
  ],
  [
    { kind: 'dancer', slot: 1, distance: 1.02, speed: 0.036, hp: 2, sidestepDirection: 1 },
    { kind: 'orbiter', slot: 4, distance: 1.1, speed: 0.039, hp: 2, orbitEvery: 0.78, orbitDirection: -1 },
    { kind: 'rusher', slot: 7, distance: 1.2, speed: 0.096, hp: 1 },
    { kind: 'bulwark', slot: 10, distance: 1.3, speed: 0.042, hp: 2, armor: 1 },
    { kind: 'dancer', slot: 13, distance: 1.42, speed: 0.034, hp: 2, sidestepDirection: -1 }
  ],
  [
    { kind: 'refractor', slot: 2, distance: 1.04, speed: 0.031, hp: 2, turnDirection: 1 },
    { kind: 'refractor', slot: 7, distance: 1.2, speed: 0.029, hp: 2, turnDirection: -1 },
    { kind: 'refractor', slot: 12, distance: 1.36, speed: 0.027, hp: 2, turnDirection: 1 }
  ],
  [
    { kind: 'refractor', slot: 1, distance: 1.02, speed: 0.032, hp: 2, turnDirection: 1 },
    { kind: 'marcher', slot: 5, distance: 1.12, speed: 0.051, hp: 2 },
    { kind: 'refractor', slot: 9, distance: 1.26, speed: 0.03, hp: 2, turnDirection: -1 },
    { kind: 'dancer', slot: 13, distance: 1.4, speed: 0.034, hp: 2, sidestepDirection: -1 }
  ],
  [
    { kind: 'refractor', slot: 0, distance: 1.02, speed: 0.033, hp: 2, turnDirection: 1 },
    { kind: 'rusher', slot: 3, distance: 1.08, speed: 0.097, hp: 1 },
    { kind: 'bulwark', slot: 6, distance: 1.18, speed: 0.042, hp: 2, armor: 1 },
    { kind: 'refractor', slot: 9, distance: 1.29, speed: 0.031, hp: 2, turnDirection: -1 },
    { kind: 'orbiter', slot: 12, distance: 1.4, speed: 0.039, hp: 2, orbitEvery: 0.76, orbitDirection: 1 },
    { kind: 'dancer', slot: 15, distance: 1.48, speed: 0.035, hp: 2, sidestepDirection: -1 }
  ],
  [
    { kind: 'mirror', slot: 4, distance: 1.04, speed: 0.03, hp: 2 },
    { kind: 'mirror', slot: 8, distance: 1.2, speed: 0.028, hp: 2 },
    { kind: 'mirror', slot: 12, distance: 1.36, speed: 0.026, hp: 2 }
  ],
  [
    { kind: 'mirror', slot: 4, distance: 1.02, speed: 0.031, hp: 2 },
    { kind: 'dancer', slot: 7, distance: 1.13, speed: 0.034, hp: 2, sidestepDirection: -1 },
    { kind: 'mirror', slot: 10, distance: 1.27, speed: 0.029, hp: 2 },
    { kind: 'refractor', slot: 14, distance: 1.4, speed: 0.031, hp: 2, turnDirection: 1 }
  ],
  [
    { kind: 'mirror', slot: 2, distance: 1.01, speed: 0.032, hp: 2 },
    { kind: 'rusher', slot: 4, distance: 1.07, speed: 0.097, hp: 1 },
    { kind: 'bulwark', slot: 6, distance: 1.17, speed: 0.042, hp: 2, armor: 1 },
    { kind: 'mirror', slot: 8, distance: 1.27, speed: 0.03, hp: 2 },
    { kind: 'orbiter', slot: 10, distance: 1.37, speed: 0.039, hp: 2, orbitEvery: 0.74, orbitDirection: -1 },
    { kind: 'dancer', slot: 12, distance: 1.45, speed: 0.035, hp: 2, sidestepDirection: 1 },
    { kind: 'refractor', slot: 14, distance: 1.51, speed: 0.032, hp: 2, turnDirection: -1 }
  ],
  [
    { kind: 'chorister', slot: 2, distance: 1.04, speed: 0.029, hp: 2, castDirection: 1 },
    { kind: 'chorister', slot: 7, distance: 1.2, speed: 0.027, hp: 2, castDirection: -1 },
    { kind: 'chorister', slot: 12, distance: 1.36, speed: 0.025, hp: 2, castDirection: 1 }
  ],
  [
    { kind: 'chorister', slot: 1, distance: 1.02, speed: 0.03, hp: 2, castDirection: 1 },
    { kind: 'mirror', slot: 4, distance: 1.13, speed: 0.03, hp: 2 },
    { kind: 'chorister', slot: 7, distance: 1.25, speed: 0.028, hp: 2, castDirection: -1 },
    { kind: 'dancer', slot: 10, distance: 1.37, speed: 0.035, hp: 2, sidestepDirection: 1 },
    { kind: 'refractor', slot: 14, distance: 1.48, speed: 0.032, hp: 2, turnDirection: -1 }
  ],
  [
    { kind: 'chorister', slot: 0, distance: 1.01, speed: 0.031, hp: 2, castDirection: 1 },
    { kind: 'rusher', slot: 2, distance: 1.07, speed: 0.098, hp: 1 },
    { kind: 'bulwark', slot: 4, distance: 1.16, speed: 0.043, hp: 2, armor: 1 },
    { kind: 'mirror', slot: 6, distance: 1.25, speed: 0.031, hp: 2 },
    { kind: 'orbiter', slot: 8, distance: 1.34, speed: 0.04, hp: 2, orbitEvery: 0.72, orbitDirection: 1 },
    { kind: 'dancer', slot: 10, distance: 1.42, speed: 0.036, hp: 2, sidestepDirection: -1 },
    { kind: 'refractor', slot: 12, distance: 1.49, speed: 0.033, hp: 2, turnDirection: 1 },
    { kind: 'marcher', slot: 14, distance: 1.55, speed: 0.054, hp: 2 }
  ]
];

export const GUARDIANS = [
  {
    kind: 'dawnWarden', name: 'DAWN WARDEN', slot: 2, distance: 1.16,
    speed: 0.014, hp: 6, armor: 1, phases: 3, phaseHp: 2,
    phaseSlots: [2, 7, 13], phaseOrbit: [0, 1.55, 1.35], phaseSpeed: [0.014, 0.021, 0.03]
  },
  {
    kind: 'vortexRegent', name: 'VORTEX REGENT', slot: 14, distance: 1.2,
    speed: 0.018, hp: 6, armor: 1, phases: 3, phaseHp: 2,
    phaseSlots: [14, 4, 9], phaseOrbit: [1.5, 1.3, 1.15], phaseSpeed: [0.018, 0.026, 0.036]
  },
  {
    kind: 'galeSovereign', name: 'GALE SOVEREIGN', slot: 1, distance: 1.2,
    speed: 0.02, hp: 6, armor: 1, phases: 3, phaseHp: 2,
    phaseSlots: [1, 6, 12], phaseOrbit: [1.42, 1.2, 1.02], phaseSpeed: [0.02, 0.029, 0.04]
  },
  {
    kind: 'prismEmperor', name: 'PRISM EMPEROR', slot: 3, distance: 1.22,
    speed: 0.022, hp: 6, armor: 1, phases: 3, phaseHp: 2,
    phaseSlots: [3, 10, 15], phaseOrbit: [1.34, 1.1, 0.94], phaseSpeed: [0.022, 0.032, 0.043]
  },
  {
    kind: 'tideOracle', name: 'TIDE ORACLE', slot: 4, distance: 1.23,
    speed: 0.023, hp: 6, armor: 1, phases: 3, phaseHp: 2,
    phaseSlots: [4, 11, 1], phaseOrbit: [1.28, 1.04, 0.88], phaseSpeed: [0.023, 0.034, 0.045]
  },
  {
    kind: 'ringMatriarch', name: 'RING MATRIARCH', slot: 6, distance: 1.25,
    speed: 0.024, hp: 6, armor: 1, phases: 3, phaseHp: 2,
    phaseSlots: [6, 13, 3], phaseOrbit: [1.22, 0.98, 0.82], phaseSpeed: [0.024, 0.036, 0.048]
  }
];

function loadFormation(game, waveIndex, formation) {
  const specs = WAVES[waveIndex];
  const distances = specs.map(enemy => enemy.distance);
  const rotation = [0, 3, 7][formation];
  const directionScale = formation === 1 ? -1 : 1;
  const speedScale = [1, 0.96, 1.04][formation];
  game.wave = waveIndex;
  game.waveFormation = formation;
  game.enemies = specs.map((enemy, id) => ({
    armor: 0, orbitClock: 0, orbitWarning: false, ...enemy,
    slot: (enemy.slot + rotation) % SLOT_COUNT,
    distance: formation === 1 ? distances[distances.length - 1 - id] : enemy.distance + (formation === 2 ? 0.06 : 0),
    speed: enemy.speed * speedScale,
    ...(enemy.orbitDirection ? { orbitDirection: enemy.orbitDirection * directionScale } : {}),
    ...(enemy.sidestepDirection ? { sidestepDirection: enemy.sidestepDirection * directionScale } : {}),
    ...(enemy.turnDirection ? { turnDirection: enemy.turnDirection * directionScale } : {}),
    ...(enemy.castDirection ? { castDirection: enemy.castDirection * directionScale } : {}),
    id, alive: true, flash: 0, blocked: 0, mirrorStep: 0
  }));
}

function loadWave(game, waveIndex) {
  loadFormation(game, waveIndex, 0);
}

function loadGuardian(game, act) {
  const spec = GUARDIANS[act];
  game.guardianAct = act;
  game.enemies = [{
    ...spec, id: 0, alive: true, guardian: true, phase: 1,
    flash: 0, blocked: 0, orbitClock: 0, orbitWarning: false,
    orbitEvery: spec.phaseOrbit[0], orbitDirection: act === 1 ? -1 : 1,
    mirrorStep: 0, castDirection: act === 5 ? 1 : 0
  }];
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
    enemies: [], bell: 3, score: 0, chain: 0, wave: 0, waveFormation: 0,
    message: 'INSERT COIN', tick: 0, audioEvents: [], credits: 0,
    demo: false, demoTime: 0, effects: [], guardianAct: null,
    waveStartScore: 0, continues: 0, continueTime: 0,
    initials: ['A', 'A', 'A'], initialIndex: 0, rankings: [], result: null,
    rankingTime: 0, coachStep: null, maxChain: 0, dangerBreaks: 0
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
  game.waveStartScore = 0;
  game.chain = 0;
  game.maxChain = 0;
  game.dangerBreaks = 0;
  game.message = safeWave === 0 ? 'CAST — MOVE — CATCH' : `WAVE ${safeWave + 1} — HOLD THE BELL`;
  game.tick = 0;
  game.demo = false;
  game.demoTime = 0;
  game.effects = [];
  game.coachStep = safeWave === 0 ? 'cast' : null;
  game.audioEvents.length = 0;
  emit(game, 'start');
  return game;
}

export function insertCoin(game) {
  const credits = Math.min(9, game.credits + 1);
  if (game.mode === 'continue') {
    game.credits = credits;
    game.message = 'CREDIT READY — PRESS ENTER TO CONTINUE';
    emit(game, 'coin');
    return true;
  }
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

export function continueCredit(game) {
  if (game.mode !== 'continue' || game.credits <= 0) return false;
  const credits = game.credits - 1;
  const wave = game.wave;
  const score = game.waveStartScore;
  const continues = game.continues + 1;
  const maxChain = game.maxChain;
  const dangerBreaks = game.dangerBreaks;
  startGame(game, wave);
  game.credits = credits;
  game.score = score;
  game.waveStartScore = score;
  game.continues = continues;
  game.maxChain = maxChain;
  game.dangerBreaks = dangerBreaks;
  game.message = `CONTINUE ${continues} — WAVE ${wave + 1}`;
  emit(game, 'continue');
  return true;
}

export function beginInitialEntry(game) {
  if (!['continue', 'waveClear'].includes(game.mode)) return false;
  game.mode = 'nameEntry';
  game.continueTime = 0;
  game.initials = ['A', 'A', 'A'];
  game.initialIndex = 0;
  game.message = 'ENTER YOUR MARK';
  emit(game, 'nameEntry');
  return true;
}

export function moveInitial(game, direction) {
  if (game.mode !== 'nameEntry' || !Number.isFinite(direction)) return false;
  const current = game.initials[game.initialIndex].charCodeAt(0) - 65;
  game.initials[game.initialIndex] = String.fromCharCode(65 + (current + Math.sign(direction) + 26) % 26);
  return true;
}

export function confirmInitial(game) {
  if (game.mode !== 'nameEntry') return false;
  if (game.initialIndex < 2) {
    game.initialIndex += 1;
    emit(game, 'initial');
    return false;
  }
  game.result = {
    initials: game.initials.join(''), score: game.score, wave: game.wave + 1,
    cleared: game.bell > 0 && game.wave === WAVES.length - 1,
    continues: game.continues, rank: evaluateRank(game)
  };
  game.mode = 'ranking';
  game.rankingTime = 12;
  game.message = 'HALL OF ECHOES';
  emit(game, 'ranking');
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
  const rankings = game.rankings;
  Object.assign(game, createGame());
  game.credits = credits;
  game.rankings = rankings;
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
  game.waveStartScore = game.score;
  if (game.wave === 1) game.message = 'BULWARK — RETURN BREAKS GUARD';
  else if (game.wave === 2) game.message = 'RUSHER — STRIKE BEFORE THE WARNING CLOSES';
  else if (game.wave === 3) game.message = 'ORBITER — READ THE SIDE FLASH';
  else if (game.wave === 4) game.message = 'CROSSING LINES — LEAD THE MOVING MARK';
  else if (game.wave === 5) game.message = 'SECOND WATCH — BREAK THE PROCESSION';
  else if (game.wave === 6) game.message = 'DANCER — FOLLOW THE STRUCK STEP';
  else if (game.wave === 7) game.message = 'BROKEN RHYTHM — CATCH, TURN, CAST';
  else if (game.wave === 8) game.message = 'THIRD WATCH — MASTER EVERY LINE';
  else if (game.wave === 9) game.message = 'REFRACTOR — AIM AT THE TURN MARK';
  else if (game.wave === 10) game.message = 'FRACTURED LINES — LEAD THEN RECOVER';
  else if (game.wave === 11) game.message = 'FOURTH WATCH — COMMAND THE TURN';
  else if (game.wave === 12) game.message = 'MIRROR — YOUR STEP MOVES ITS COUNTERSTEP';
  else if (game.wave === 13) game.message = 'CROSSED REFLECTIONS — RUN, LEAD, RECOVER';
  else if (game.wave === 14) game.message = 'FIFTH WATCH — RULE THE WHOLE RING';
  else if (game.wave === 15) game.message = 'CHORISTER — CAST AT THE ANSWERING MARK';
  else if (game.wave === 16) game.message = 'ANSWERING LINES — STEP, LEAD, CAST';
  else if (game.wave === 17) game.message = 'FINAL WATCH — COMMAND EVERY PROCESSION';
  else game.message = `WAVE ${game.wave + 1}`;
  emit(game, 'waveStart');
  return true;
}

export function startGuardian(game) {
  if (game.mode !== 'guardianBrief') return false;
  const act = game.wave % 3 === 2 ? Math.floor(game.wave / 3) : -1;
  if (act < 0) return false;
  loadGuardian(game, act);
  game.mode = 'playing';
  game.hammer = null;
  game.cooldown = 0;
  game.message = act === 0 ? 'DAWN WARDEN — BREAK THREE RETURN SEALS'
    : act === 1 ? 'VORTEX REGENT — CHASE THE TURNING CROWN'
      : act === 2 ? 'GALE SOVEREIGN — SURVIVE THE SHIFTING CROWN'
        : act === 3 ? 'PRISM EMPEROR — BREAK THE BURNING CROWN'
          : act === 4 ? 'TIDE ORACLE — BREAK THE MIRRORED CROWN'
            : 'RING MATRIARCH — BREAK THE FINAL CROWN';
  emit(game, 'guardianStart');
  return true;
}

export function movePlayer(game, direction) {
  if (game.mode !== 'playing') return;
  game.playerSlot = (game.playerSlot + direction + SLOT_COUNT) % SLOT_COUNT;
  let mirrored = false;
  let anchored = false;
  for (const enemy of game.enemies) {
    const matriarchCounterstep = enemy.kind === 'ringMatriarch' && enemy.phase === 2;
    if (!enemy.alive || (enemy.kind !== 'mirror' && !matriarchCounterstep)) continue;
    enemy.mirrorStep = ((enemy.mirrorStep ?? 0) + 1) % 3;
    if (enemy.mirrorStep === 0) {
      effect(game, 'guard', enemy.slot, enemy.distance, 0.28);
      anchored = true;
    } else {
      enemy.slot = (enemy.slot - direction + SLOT_COUNT) % SLOT_COUNT;
      effect(game, 'mirror', enemy.slot, enemy.distance, 0.28);
    }
    mirrored = true;
  }
  if (mirrored) {
    const finalCounterstep = game.enemies.some(enemy => enemy.alive && enemy.kind === 'ringMatriarch' && enemy.phase === 2);
    game.message = finalCounterstep
      ? anchored ? 'MATRIARCH ANCHORS — BREAK THE SECOND SEAL' : 'MATRIARCH COUNTERSTEPS — THIRD STEP HOLDS'
      : anchored ? 'MIRROR ANCHORS — CROSS THE OPEN LINE' : 'MIRROR COUNTERSTEPS — THIRD STEP HOLDS';
    emit(game, 'mirror');
  }
}

export function castHammer(game) {
  if (game.mode !== 'playing' || game.hammer || game.cooldown > 0) return false;
  let answered = false;
  for (const enemy of game.enemies) {
    const matriarchAnswer = enemy.kind === 'ringMatriarch' && enemy.phase === 3;
    if (!enemy.alive || (enemy.kind !== 'chorister' && !matriarchAnswer)) continue;
    enemy.slot = (enemy.slot + enemy.castDirection + SLOT_COUNT) % SLOT_COUNT;
    enemy.castDirection *= -1;
    effect(game, 'chorus', enemy.slot, enemy.distance, 0.42);
    answered = true;
  }
  game.hammer = { slot: game.playerSlot, distance: 0.18, phase: 'out', previous: 0.18 };
  if (game.coachStep === 'cast' || game.coachStep === 'recover') game.coachStep = 'outbound';
  game.message = answered ? 'CHORUS ANSWERS — CAST LINE LOCKED' : 'OUTBOUND';
  if (answered) emit(game, 'chorus');
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
      if (enemy.guardian) {
        // Opening a seal must leave a fair, readable window for this same
        // hammer to return before the guardian changes lanes again.
        enemy.orbitClock = 0;
        enemy.orbitWarning = false;
      }
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
    const dangerMultiplier = enemy.distance < 0.46 ? 2 : 1;
    const multiplier = (1 + Math.min(game.chain, 8) * 0.25) * dangerMultiplier;
    game.score += Math.round((game.hammer.phase === 'out' ? 100 : 200) * multiplier);
    game.message = dangerMultiplier > 1 ? 'DANGER STRIKE ×2' : game.hammer.phase === 'out' ? 'OUTBOUND HIT' : 'RETURN BREAK';
    if (game.hammer.phase === 'out') emit(game, 'outboundHit');
    if (game.hammer.phase === 'out' && enemy.kind === 'dancer' && enemy.hp > 0) {
      enemy.slot = (enemy.slot + enemy.sidestepDirection + SLOT_COUNT) % SLOT_COUNT;
      enemy.sidestepDirection *= -1;
      effect(game, 'sidestep', enemy.slot, enemy.distance, 0.42);
      game.message = 'DANCER STEPS — FOLLOW IT AND CATCH';
      emit(game, 'sidestep');
    }
    if (enemy.hp <= 0) {
      enemy.alive = false;
      if (dangerMultiplier > 1) game.dangerBreaks += 1;
      effect(game, 'break', enemy.slot, enemy.distance, 0.46);
      game.score += Math.round((game.hammer.phase === 'out' ? 400 : 800) * multiplier) + (enemy.guardian ? 3000 : 0);
      emit(game, enemy.guardian ? 'guardianBreak' : game.hammer.phase === 'return' ? 'returnBreak' : 'outboundBreak');
    } else if (enemy.guardian) {
      const nextPhase = enemy.phases - Math.ceil(enemy.hp / enemy.phaseHp) + 1;
      if (nextPhase > enemy.phase) {
        enemy.phase = nextPhase;
        enemy.armor = 1;
        enemy.slot = enemy.phaseSlots[nextPhase - 1];
        enemy.distance = Math.max(enemy.distance, 1.02);
        enemy.speed = enemy.phaseSpeed[nextPhase - 1];
        enemy.orbitEvery = enemy.phaseOrbit[nextPhase - 1];
        enemy.orbitDirection *= -1;
        enemy.orbitClock = 0;
        enemy.orbitWarning = false;
        enemy.mirrorStep = 0;
        effect(game, 'phase', enemy.slot, enemy.distance, 0.7);
        game.score += 1000 * nextPhase;
        game.message = `SEAL ${nextPhase}/${enemy.phases} — NEW PROCESSION`;
        emit(game, 'guardianPhase');
      }
    }
  }
}

export function step(game, dt = 1 / 60) {
  if (game.mode === 'continue') {
    game.continueTime = Math.max(0, game.continueTime - dt);
    if (game.continueTime <= 0) beginInitialEntry(game);
    return game;
  }
  if (game.mode === 'ranking') {
    game.rankingTime = Math.max(0, game.rankingTime - dt);
    if (game.rankingTime <= 0) returnToAttract(game);
    return game;
  }
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
      if (game.coachStep === 'outbound') game.coachStep = 'catch';
      let refracted = false;
      for (const enemy of game.enemies) {
        if (!enemy.alive || enemy.kind !== 'refractor') continue;
        enemy.slot = (enemy.slot + enemy.turnDirection + SLOT_COUNT) % SLOT_COUNT;
        enemy.turnDirection *= -1;
        effect(game, 'refract', enemy.slot, enemy.distance, 0.42);
        refracted = true;
      }
      game.message = refracted ? 'REFRACTORS SHIFT — RETURN LINE LOCKED'
        : hammer.guardBlocked ? 'GUARD SHATTERED — RETURN BREAKS IT' : 'RETURNING — CATCH IT';
      if (refracted) emit(game, 'refract');
      emit(game, 'turn');
    } else if (hammer.phase === 'return' && hammer.distance <= 0.18) {
      if (slotDistance(game.playerSlot, hammer.slot) <= 1) {
        game.chain += 1;
        game.maxChain = Math.max(game.maxChain, game.chain);
        game.score += 250 * game.chain;
        if (game.chain === 4 || game.chain === 8) game.score += game.chain * 500;
        const drive = game.chain >= 8 ? 'ECHO DRIVE II' : game.chain >= 4 ? 'ECHO DRIVE I' : '';
        game.message = drive ? `PERFECT CATCH ×${game.chain} — ${drive}` : `PERFECT CATCH ×${game.chain}`;
        effect(game, 'catch', hammer.slot, 0.2, 0.5);
        emit(game, 'catch');
        if (game.coachStep === 'catch') game.coachStep = null;
      } else {
        game.chain = 0;
        game.cooldown = 0.8;
        game.message = 'MISSED — RECAST DELAY';
        if (game.wave === 0) game.coachStep = 'recover';
        emit(game, 'miss');
      }
      game.hammer = null;
    }
  }

  for (const enemy of game.enemies) {
    if (!enemy.alive) continue;
    enemy.flash = Math.max(0, enemy.flash - 1);
    enemy.blocked = Math.max(0, enemy.blocked - 1);
    if (enemy.orbitEvery) {
      // A guardian that has not begun its warning holds the committed lane
      // while the one allowed hammer is in flight. Warning casts still lose
      // to the announced shift; post-shift casts get a reliable full journey.
      if (!(enemy.guardian && game.hammer && !enemy.orbitWarning)) enemy.orbitClock += dt;
      // Guardian phases accelerate below one second. A fixed 0.82-second
      // warning made the final crown warn for its entire cycle, leaving only
      // one simulation frame after a lane change in which a cast was safe.
      // Keeping the latter 45% as warning preserves anticipation and always
      // leaves a readable post-shift commitment window.
      const warningAt = enemy.guardian ? enemy.orbitEvery * 0.55 : enemy.orbitEvery * 0.68;
      enemy.orbitWarning = enemy.orbitClock >= warningAt;
      if (enemy.orbitClock >= enemy.orbitEvery) {
        enemy.orbitClock -= enemy.orbitEvery;
        enemy.slot = (enemy.slot + enemy.orbitDirection + SLOT_COUNT) % SLOT_COUNT;
        enemy.orbitWarning = false;
      }
    }
    enemy.distance -= enemy.speed * dt;
    if (enemy.distance <= 0.2) {
      effect(game, 'bell', enemy.slot, 0.2, 0.55);
      game.bell -= 1;
      game.chain = 0;
      if (enemy.guardian && game.bell > 0) {
        enemy.distance = 1.08;
        enemy.slot = (enemy.slot + 5) % SLOT_COUNT;
        enemy.orbitClock = 0;
        game.message = 'GUARDIAN STRIKE — IT WITHDRAWS';
      } else enemy.alive = false;
      if (!enemy.guardian) game.message = 'THE BELL IS STRUCK';
      emit(game, 'bellHit');
    }
  }

  if (game.bell <= 0) {
    game.mode = 'continue';
    game.continueTime = 10;
    game.message = 'BELL FALLEN — CONTINUE?';
    emit(game, 'gameOver');
  } else if (game.enemies.length && game.enemies.every(enemy => !enemy.alive)) {
    game.hammer = null;
    if (game.guardianAct === null && game.waveFormation + 1 < WAVE_FORMATION_COUNT) {
      const nextFormation = game.waveFormation + 1;
      game.score += game.bell * 500;
      loadFormation(game, game.wave, nextFormation);
      game.cooldown = 0;
      game.message = `PROCESSION ${nextFormation + 1}/${WAVE_FORMATION_COUNT} — READ THE NEW ORDER`;
      emit(game, 'waveStart');
      return game;
    }
    game.score += game.bell * 1000;
    if (game.guardianAct !== null) {
      const clearedAct = game.guardianAct;
      game.guardianAct = null;
      game.score += 5000;
      if (clearedAct < GUARDIANS.length - 1) {
        game.mode = 'waveBrief';
        game.message = clearedAct === 0 ? 'FIRST WATCH CROWNED — PRESS SPACE'
          : clearedAct === 1 ? 'SECOND WATCH CROWNED — PRESS SPACE'
            : clearedAct === 2 ? 'THIRD WATCH CROWNED — PRESS SPACE'
              : clearedAct === 3 ? 'FOURTH WATCH CROWNED — PRESS SPACE'
                : 'FIFTH WATCH CROWNED — PRESS SPACE';
      } else {
        game.mode = 'waveClear';
        game.message = 'ALL SIX WATCHES CROWNED — PRESS R';
      }
      emit(game, 'guardianClear');
    } else if (game.wave % 3 === 2) {
      game.mode = 'guardianBrief';
      game.message = game.wave === 2 ? 'GUARDIAN — DAWN WARDEN'
        : game.wave === 5 ? 'GUARDIAN — VORTEX REGENT'
          : game.wave === 8 ? 'GUARDIAN — GALE SOVEREIGN'
            : game.wave === 11 ? 'GUARDIAN — PRISM EMPEROR'
              : game.wave === 14 ? 'GUARDIAN — TIDE ORACLE' : 'GUARDIAN — RING MATRIARCH';
      emit(game, 'waveClear');
    } else if (game.wave + 1 < WAVES.length) {
      game.mode = 'waveBrief';
      game.message = `WAVE ${game.wave + 1} HELD — PRESS SPACE`;
      emit(game, 'waveClear');
    } else {
      game.mode = 'waveClear';
      game.message = game.wave >= 17 ? 'ALL SIX WATCHES HELD — PRESS R' : game.wave >= 14 ? 'FIFTH WATCH HELD — PRESS R' : game.wave >= 11 ? 'FOURTH WATCH HELD — PRESS R' : game.wave >= 8 ? 'THIRD WATCH HELD — PRESS R' : game.wave >= 5 ? 'SECOND WATCH HELD — PRESS R' : 'DAWN HELD — PRESS R';
      emit(game, 'victory');
    }
  }
  return game;
}

export function angleForSlot(slot) {
  return -Math.PI / 2 + (slot / SLOT_COUNT) * TAU;
}

export function evaluateRank(game) {
  const cleared = game.bell > 0 && game.wave === WAVES.length - 1 && ['waveClear', 'nameEntry', 'ranking'].includes(game.mode);
  if (!cleared) return 'C';
  if (game.bell === 3 && game.continues === 0 && game.maxChain >= 16 && game.dangerBreaks >= 12) return 'S';
  if (game.bell >= 2 && game.maxChain >= 8) return 'A';
  return 'B';
}
