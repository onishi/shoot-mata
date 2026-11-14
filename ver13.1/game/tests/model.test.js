import test from 'node:test';
import assert from 'node:assert/strict';
import { beginInitialEntry, castHammer, confirmInitial, continueCredit, createGame, drainAudioEvents, driveDemo, insertCoin, moveInitial, movePlayer, returnToAttract, startCredit, startDemo, startGame, startGuardian, startNextWave, step, WAVE_FORMATION_COUNT } from '../src/model.js';

function advance(game, seconds, dt = 1 / 120) {
  for (let elapsed = 0; elapsed < seconds && game.mode === 'playing'; elapsed += dt) step(game, dt);
}

test('cabinet requires a coin and consumes one credit to start', () => {
  const game = createGame();
  assert.equal(game.mode, 'attract');
  assert.equal(startCredit(game), false);
  insertCoin(game);
  assert.equal(game.mode, 'startWait');
  assert.equal(game.credits, 1);
  assert.ok(drainAudioEvents(game).includes('coin'));
  assert.equal(startCredit(game, 1), true);
  assert.equal(game.mode, 'playing');
  assert.equal(game.wave, 1);
  assert.equal(game.credits, 0);
});

test('attract demonstration plays deterministically and yields to a coin', () => {
  const game = createGame();
  assert.equal(startDemo(game), true);
  for (let i = 0; i < 80; i++) { driveDemo(game); step(game, 0.05); }
  assert.equal(game.demo, true);
  assert.ok(game.tick > 0);
  insertCoin(game);
  assert.equal(game.demo, false);
  assert.equal(game.mode, 'startWait');
  assert.equal(game.credits, 1);
  returnToAttract(game);
  assert.equal(game.mode, 'startWait');
});

test('start creates a fresh three-enemy wave', () => {
  const game = startGame(createGame());
  assert.equal(game.mode, 'playing');
  assert.equal(game.enemies.length, 3);
  assert.equal(game.bell, 3);
  assert.equal(game.coachStep, 'cast');
});

test('first-wave coach follows cast, return, catch, and missed recovery', () => {
  const caught = startGame(createGame());
  assert.equal(castHammer(caught), true);
  assert.equal(caught.coachStep, 'outbound');
  advance(caught, 1.2);
  assert.equal(caught.coachStep, 'catch');
  advance(caught, 1.1);
  assert.equal(caught.coachStep, null);

  const missed = startGame(createGame());
  castHammer(missed);
  movePlayer(missed, 4);
  advance(missed, 2.3);
  assert.equal(missed.coachStep, 'recover');
  assert.ok(missed.cooldown > 0);
  advance(missed, 0.9);
  assert.equal(castHammer(missed), true);
  assert.equal(missed.coachStep, 'outbound');
});

test('saved progress can start directly at the second wave', () => {
  const game = startGame(createGame(), 1);
  assert.equal(game.wave, 1);
  assert.equal(game.enemies.filter(enemy => enemy.kind === 'bulwark').length, 2);
  assert.equal(game.score, 0);
  assert.equal(game.bell, 3);
});

test('saved progress can start at the fast third wave', () => {
  const game = startGame(createGame(), 2);
  assert.equal(game.wave, 2);
  assert.equal(game.enemies.length, 3);
  assert.equal(game.enemies.every(enemy => enemy.kind === 'rusher'), true);
  assert.equal(game.enemies.every(enemy => enemy.hp === 1 && enemy.speed >= 0.095), true);
});

test('act two opens with telegraphed orbiters that change aim slots', () => {
  const game = startGame(createGame(), 3);
  assert.equal(game.enemies.every(enemy => enemy.kind === 'orbiter'), true);
  const enemy = game.enemies[0];
  const originalSlot = enemy.slot;
  advance(game, enemy.orbitEvery * 0.7);
  assert.equal(enemy.orbitWarning, true);
  advance(game, enemy.orbitEvery * 0.35);
  assert.equal(enemy.slot, (originalSlot + enemy.orbitDirection + 16) % 16);
  assert.equal(enemy.orbitWarning, false);
});

test('waves five and six combine established threats for the first climax', () => {
  const crossing = startGame(createGame(), 4);
  assert.equal(crossing.enemies.filter(enemy => enemy.kind === 'orbiter').length, 2);
  assert.equal(crossing.enemies.filter(enemy => enemy.kind === 'marcher').length, 2);

  const climax = startGame(createGame(), 5);
  for (const kind of ['bulwark', 'rusher', 'orbiter']) {
    assert.ok(climax.enemies.some(enemy => enemy.kind === kind), `${kind} present`);
  }
});

test('act three dancers sidestep only after a surviving outbound hit', () => {
  const game = startGame(createGame(), 6);
  assert.equal(game.enemies.every(enemy => enemy.kind === 'dancer'), true);
  const dancer = game.enemies[0];
  const originalSlot = dancer.slot;
  game.playerSlot = originalSlot;
  castHammer(game);
  advance(game, 0.8);
  assert.equal(dancer.hp, 1);
  assert.equal(dancer.slot, (originalSlot + 1) % 16);
  assert.equal(dancer.sidestepDirection, -1);
  assert.match(game.message, /DANCER STEPS/);
  assert.ok(drainAudioEvents(game).includes('sidestep'));
  movePlayer(game, 1);
  advance(game, 1.5);
  assert.equal(game.chain, 1);
  assert.equal(castHammer(game), true);
  advance(game, 0.8);
  assert.equal(dancer.alive, false);
});

test('waves eight and nine mix reactive dancers with established threats', () => {
  const brokenRhythm = startGame(createGame(), 7);
  for (const kind of ['dancer', 'bulwark', 'rusher']) {
    assert.ok(brokenRhythm.enemies.some(enemy => enemy.kind === kind), `${kind} present`);
  }

  const thirdWatch = startGame(createGame(), 8);
  for (const kind of ['dancer', 'bulwark', 'rusher', 'orbiter']) {
    assert.ok(thirdWatch.enemies.some(enemy => enemy.kind === kind), `${kind} present`);
  }
});

test('act four refractors step on hammer turn into a predicted return line', () => {
  const game = startGame(createGame(), 9);
  assert.equal(game.enemies.every(enemy => enemy.kind === 'refractor'), true);
  const refractor = game.enemies[0];
  const originalSlot = refractor.slot;
  const targetSlot = (originalSlot + refractor.turnDirection + 16) % 16;
  game.playerSlot = targetSlot;
  castHammer(game);
  advance(game, 1.2);
  assert.equal(refractor.slot, targetSlot);
  assert.equal(refractor.hp, 2);
  assert.ok(drainAudioEvents(game).includes('refract'));
  advance(game, 1.1);
  assert.equal(refractor.alive, false);
});

test('waves eleven and twelve combine turn-triggered movement with prior threats', () => {
  const fractured = startGame(createGame(), 10);
  for (const kind of ['refractor', 'marcher', 'dancer']) {
    assert.ok(fractured.enemies.some(enemy => enemy.kind === kind), `${kind} present`);
  }

  const fourthWatch = startGame(createGame(), 11);
  for (const kind of ['refractor', 'rusher', 'bulwark', 'orbiter', 'dancer']) {
    assert.ok(fourthWatch.enemies.some(enemy => enemy.kind === kind), `${kind} present`);
  }
});

test('act five mirrors counterstep against lever movement and creates crossing lines', () => {
  const game = startGame(createGame(), 12);
  assert.equal(game.enemies.every(enemy => enemy.kind === 'mirror'), true);
  const mirror = game.enemies[0];
  assert.equal(mirror.slot, 4);
  movePlayer(game, 1);
  assert.equal(game.playerSlot, 1);
  assert.equal(mirror.slot, 3);
  movePlayer(game, 1);
  assert.equal(game.playerSlot, 2);
  assert.equal(mirror.slot, 2);
  assert.match(game.message, /THIRD STEP HOLDS/);
  assert.ok(drainAudioEvents(game).includes('mirror'));
  assert.equal(castHammer(game), true);
  advance(game, 2.2);
  assert.equal(mirror.alive, false);
  assert.equal(game.chain, 1);
});

test('every third lever step anchors mirrors so odd entry lines remain solvable', () => {
  const game = startGame(createGame(), 12);
  const mirror = game.enemies[0];
  mirror.slot = 3;
  movePlayer(game, 1);
  assert.equal(mirror.slot, 2);
  movePlayer(game, 1);
  assert.equal(mirror.slot, 1);
  movePlayer(game, 1);
  assert.equal(mirror.slot, 1);
  assert.match(game.message, /MIRROR ANCHORS/);
  movePlayer(game, -1);
  assert.equal(game.playerSlot, 2);
  assert.equal(mirror.slot, 2);
});

test('waves fourteen and fifteen mix lever-reactive mirrors with all prior threat families', () => {
  const crossed = startGame(createGame(), 13);
  for (const kind of ['mirror', 'dancer', 'refractor']) {
    assert.ok(crossed.enemies.some(enemy => enemy.kind === kind), `${kind} present`);
  }

  const fifthWatch = startGame(createGame(), 14);
  for (const kind of ['mirror', 'rusher', 'bulwark', 'orbiter', 'dancer', 'refractor']) {
    assert.ok(fifthWatch.enemies.some(enemy => enemy.kind === kind), `${kind} present`);
  }
});

test('act six choristers answer each cast at their marked adjacent slot', () => {
  const game = startGame(createGame(), 15);
  assert.equal(game.enemies.every(enemy => enemy.kind === 'chorister'), true);
  const chorister = game.enemies[0];
  const originalSlot = chorister.slot;
  const targetSlot = (originalSlot + chorister.castDirection + 16) % 16;
  game.playerSlot = targetSlot;
  assert.equal(castHammer(game), true);
  assert.equal(chorister.slot, targetSlot);
  assert.equal(chorister.castDirection, -1);
  assert.match(game.message, /CHORUS ANSWERS/);
  assert.ok(drainAudioEvents(game).includes('chorus'));
  advance(game, 2.2);
  assert.equal(chorister.alive, false);
  assert.equal(game.chain, 1);
});

test('waves seventeen and eighteen combine cast-reactive choristers into the final trial', () => {
  const answeringLines = startGame(createGame(), 16);
  for (const kind of ['chorister', 'mirror', 'dancer', 'refractor']) {
    assert.ok(answeringLines.enemies.some(enemy => enemy.kind === kind), `${kind} present`);
  }

  const finalWatch = startGame(createGame(), 17);
  for (const kind of ['chorister', 'marcher', 'rusher', 'bulwark', 'mirror', 'orbiter', 'dancer', 'refractor']) {
    assert.ok(finalWatch.enemies.some(enemy => enemy.kind === kind), `${kind} present`);
  }
});

test('player wraps around the sixteen-position ring', () => {
  const game = startGame(createGame());
  movePlayer(game, -1);
  assert.equal(game.playerSlot, 15);
  movePlayer(game, 1);
  assert.equal(game.playerSlot, 0);
});

test('only one hammer can be active', () => {
  const game = startGame(createGame());
  assert.equal(castHammer(game), true);
  assert.equal(castHammer(game), false);
});

test('outbound and return destroy the aligned marcher and reward a catch', () => {
  const game = startGame(createGame());
  game.waveFormation = WAVE_FORMATION_COUNT - 1;
  game.enemies = [{ id: 0, slot: 0, distance: 0.9, speed: 0, hp: 2, alive: true, flash: 0 }];
  castHammer(game);
  advance(game, 2.2);
  assert.equal(game.enemies[0].alive, false);
  assert.equal(game.mode, 'waveBrief');
  assert.equal(game.hammer, null);
  assert.ok(game.score >= 1100);
});

test('clearing wave one opens a brief and starts the armored second wave', () => {
  const game = startGame(createGame());
  for (let formation = 0; formation < WAVE_FORMATION_COUNT; formation++) {
    for (const enemy of game.enemies) enemy.alive = false;
    step(game);
    if (formation < WAVE_FORMATION_COUNT - 1) {
      assert.equal(game.mode, 'playing');
      assert.equal(game.waveFormation, formation + 1);
      assert.match(game.message, /PROCESSION/);
    }
  }
  assert.equal(game.mode, 'waveBrief');
  assert.equal(startNextWave(game), true);
  assert.equal(game.mode, 'playing');
  assert.equal(game.wave, 1);
  assert.equal(game.enemies.filter(enemy => enemy.kind === 'bulwark').length, 2);
});

test('bulwark blocks outbound damage but is broken by the return', () => {
  const game = startGame(createGame());
  game.wave = 1;
  game.waveFormation = WAVE_FORMATION_COUNT - 1;
  game.enemies = [{
    id: 0, kind: 'bulwark', slot: 0, distance: 0.9, speed: 0,
    hp: 2, armor: 1, alive: true, flash: 0, blocked: 0
  }];
  castHammer(game);
  advance(game, 0.75);
  assert.equal(game.enemies[0].hp, 2);
  assert.equal(game.enemies[0].armor, 0);
  assert.match(game.message, /GUARD BLOCK/);
  advance(game, 0.45);
  assert.match(game.message, /GUARD SHATTERED/);
  advance(game, 1.05);
  assert.equal(game.enemies[0].alive, false);
  assert.equal(game.mode, 'waveBrief');
});

test('clearing wave two opens the fast third wave', () => {
  const game = startGame(createGame(), 1);
  for (let formation = 0; formation < WAVE_FORMATION_COUNT; formation++) {
    for (const enemy of game.enemies) enemy.alive = false;
    step(game);
  }
  assert.equal(game.mode, 'waveBrief');
  assert.equal(startNextWave(game), true);
  assert.equal(game.wave, 2);
  assert.equal(game.enemies.every(enemy => enemy.kind === 'rusher'), true);
  assert.match(game.message, /RUSHER/);
});

test('one outbound strike stops a rusher', () => {
  const game = startGame(createGame(), 2);
  game.waveFormation = WAVE_FORMATION_COUNT - 1;
  game.enemies = [{
    id: 0, kind: 'rusher', slot: 0, distance: 0.9, speed: 0,
    hp: 1, armor: 0, alive: true, flash: 0, blocked: 0
  }];
  castHammer(game);
  advance(game, 0.75);
  assert.equal(game.enemies[0].alive, false);
  assert.equal(game.mode, 'guardianBrief');
  assert.match(game.message, /DAWN WARDEN/);
});

test('clearing act two summons its guardian', () => {
  const game = startGame(createGame(), 5);
  for (let formation = 0; formation < WAVE_FORMATION_COUNT; formation++) {
    for (const enemy of game.enemies) enemy.alive = false;
    step(game);
  }
  assert.equal(game.mode, 'guardianBrief');
  assert.match(game.message, /VORTEX REGENT/);
});

test('clearing act three summons the gale sovereign', () => {
  const game = startGame(createGame(), 8);
  for (let formation = 0; formation < WAVE_FORMATION_COUNT; formation++) {
    for (const enemy of game.enemies) enemy.alive = false;
    step(game);
  }
  assert.equal(game.mode, 'guardianBrief');
  assert.match(game.message, /GALE SOVEREIGN/);
  assert.equal(startGuardian(game), true);
  assert.equal(game.enemies[0].kind, 'galeSovereign');
});

test('act one guardian changes slot, pace, and armor across three return seals', () => {
  const game = startGame(createGame(), 2);
  for (let formation = 0; formation < WAVE_FORMATION_COUNT; formation++) {
    for (const enemy of game.enemies) enemy.alive = false;
    step(game);
  }
  assert.equal(game.mode, 'guardianBrief');
  assert.equal(startGuardian(game), true);
  const guardian = game.enemies[0];
  assert.equal(guardian.kind, 'dawnWarden');
  assert.equal(guardian.phase, 1);
  const firstSlot = guardian.slot;
  guardian.armor = 0;
  game.playerSlot = guardian.slot;
  castHammer(game);
  advance(game, 2.2);
  assert.equal(guardian.phase, 2);
  assert.notEqual(guardian.slot, firstSlot);
  assert.equal(guardian.armor, 1);
  assert.ok(guardian.orbitEvery > 0);
  assert.ok(drainAudioEvents(game).includes('guardianPhase'));
});

test('each guardian seal gives the opening hammer time to land its return', () => {
  for (const [wave, expectedMode, ending] of [[2, 'waveBrief', /FIRST WATCH CROWNED/], [5, 'waveBrief', /SECOND WATCH CROWNED/], [8, 'waveBrief', /THIRD WATCH CROWNED/], [11, 'waveBrief', /FOURTH WATCH CROWNED/], [14, 'waveBrief', /FIFTH WATCH CROWNED/], [17, 'waveClear', /ALL SIX WATCHES CROWNED/]]) {
    const game = startGame(createGame(), wave);
    game.mode = 'guardianBrief';
    startGuardian(game);

    for (let phase = 1; phase <= 3; phase++) {
      const guardian = game.enemies[0];
      assert.equal(guardian.phase, phase);
      // A flashing side mark asks the player to let the imminent lane change
      // resolve before committing the single hammer.
      while (guardian.orbitWarning) step(game, 1 / 120);
      game.playerSlot = guardian.slot;
      assert.equal(castHammer(game), true);
      advance(game, 2.2);
      if (phase < 3) {
        assert.equal(guardian.phase, phase + 1);
        assert.equal(guardian.armor, 1);
      }
    }

    assert.equal(game.mode, expectedMode);
    assert.match(game.message, ending);
    assert.ok(game.score >= 15000);
  }
});

test('accelerating guardian phases retain a post-shift casting window', () => {
  const game = startGame(createGame(), 17);
  game.mode = 'guardianBrief';
  startGuardian(game);
  const guardian = game.enemies[0];
  guardian.phase = 3;
  guardian.orbitEvery = guardian.phaseOrbit[2];
  guardian.orbitClock = 0;
  step(game, guardian.orbitEvery * 0.5);
  assert.equal(guardian.orbitWarning, false);
  step(game, guardian.orbitEvery * 0.1);
  assert.equal(guardian.orbitWarning, true);
  const previousSlot = guardian.slot;
  step(game, guardian.orbitEvery * 0.4);
  assert.notEqual(guardian.slot, previousSlot);
  assert.equal(guardian.orbitWarning, false);
});

test('guardian survives a bell strike by withdrawing while the bell remains', () => {
  const game = startGame(createGame(), 2);
  game.mode = 'guardianBrief';
  startGuardian(game);
  const guardian = game.enemies[0];
  guardian.distance = 0.201;
  guardian.speed = 1;
  step(game, 1 / 60);
  assert.equal(game.bell, 2);
  assert.equal(guardian.alive, true);
  assert.ok(guardian.distance > 1);
});

test('breaking guardians opens each next act and crowns the fifth watch', () => {
  const first = startGame(createGame(), 2);
  first.mode = 'guardianBrief';
  startGuardian(first);
  first.enemies[0].alive = false;
  step(first);
  assert.equal(first.mode, 'waveBrief');
  assert.match(first.message, /FIRST WATCH CROWNED/);
  assert.equal(startNextWave(first), true);
  assert.equal(first.wave, 3);

  const second = startGame(createGame(), 5);
  second.mode = 'guardianBrief';
  startGuardian(second);
  second.enemies[0].alive = false;
  step(second);
  assert.equal(second.mode, 'waveBrief');
  assert.match(second.message, /SECOND WATCH CROWNED/);
  assert.equal(startNextWave(second), true);
  assert.equal(second.wave, 6);

  const third = startGame(createGame(), 8);
  third.mode = 'guardianBrief';
  startGuardian(third);
  assert.equal(third.enemies[0].kind, 'galeSovereign');
  third.enemies[0].alive = false;
  step(third);
  assert.equal(third.mode, 'waveBrief');
  assert.match(third.message, /THIRD WATCH CROWNED/);
  assert.equal(startNextWave(third), true);
  assert.equal(third.wave, 9);

  const fourth = startGame(createGame(), 11);
  fourth.mode = 'guardianBrief';
  startGuardian(fourth);
  assert.equal(fourth.enemies[0].kind, 'prismEmperor');
  fourth.enemies[0].alive = false;
  step(fourth);
  assert.equal(fourth.mode, 'waveBrief');
  assert.match(fourth.message, /FOURTH WATCH CROWNED/);
  assert.equal(startNextWave(fourth), true);
  assert.equal(fourth.wave, 12);

  const fifth = startGame(createGame(), 14);
  fifth.mode = 'guardianBrief';
  startGuardian(fifth);
  assert.equal(fifth.enemies[0].kind, 'tideOracle');
  fifth.enemies[0].alive = false;
  step(fifth);
  assert.equal(fifth.mode, 'waveBrief');
  assert.match(fifth.message, /FIFTH WATCH CROWNED/);
  assert.equal(startNextWave(fifth), true);
  assert.equal(fifth.wave, 15);

  const sixth = startGame(createGame(), 17);
  sixth.mode = 'guardianBrief';
  startGuardian(sixth);
  assert.equal(sixth.enemies[0].kind, 'ringMatriarch');
  sixth.enemies[0].alive = false;
  step(sixth);
  assert.equal(sixth.mode, 'waveClear');
  assert.match(sixth.message, /ALL SIX WATCHES CROWNED/);
});

test('leaving the return slot loses the chain and starts cooldown', () => {
  const game = startGame(createGame());
  game.enemies = [{ id: 0, slot: 8, distance: 9, speed: 0, hp: 99, alive: true, flash: 0 }];
  castHammer(game);
  for (let i = 0; i < 4; i++) movePlayer(game, 1);
  advance(game, 2.2);
  assert.equal(game.hammer, null);
  assert.equal(game.chain, 0);
  assert.ok(game.cooldown > 0);
  assert.match(game.message, /MISSED/);
});

test('three breaches open a ten-second continue offer', () => {
  const game = startGame(createGame());
  game.enemies = [0, 1, 2].map(id => ({ id, slot: id, distance: 0.201, speed: 1, hp: 2, alive: true, flash: 0 }));
  step(game, 1 / 60);
  assert.equal(game.bell, 0);
  assert.equal(game.mode, 'continue');
  assert.equal(game.continueTime, 10);
});

test('continue consumes a credit and restores the failed wave checkpoint', () => {
  const game = startGame(createGame(), 7);
  game.score = 42000;
  game.waveStartScore = 36000;
  game.credits = 1;
  game.bell = 0;
  game.mode = 'continue';
  assert.equal(continueCredit(game), true);
  assert.equal(game.mode, 'playing');
  assert.equal(game.wave, 7);
  assert.equal(game.waveFormation, 0);
  assert.equal(game.score, 36000);
  assert.equal(game.bell, 3);
  assert.equal(game.credits, 0);
  assert.equal(game.continues, 1);
});

test('continue countdown leads to lever initials and a ranked result', () => {
  const game = startGame(createGame(), 4);
  game.score = 12345;
  game.bell = 0;
  game.mode = 'continue';
  game.continueTime = 0.01;
  step(game, 0.02);
  assert.equal(game.mode, 'nameEntry');
  moveInitial(game, -1);
  assert.equal(game.initials[0], 'Z');
  assert.equal(confirmInitial(game), false);
  moveInitial(game, 1);
  assert.equal(confirmInitial(game), false);
  assert.equal(confirmInitial(game), true);
  assert.equal(game.mode, 'ranking');
  assert.deepEqual(game.result, { initials: 'ZBA', score: 12345, wave: 5, cleared: false, continues: 0 });
});

test('victory can enter initials without a continue countdown', () => {
  const game = startGame(createGame(), 17);
  game.mode = 'waveClear';
  game.score = 99999;
  assert.equal(beginInitialEntry(game), true);
  assert.equal(game.mode, 'nameEntry');
});

test('play events expose the required audio feedback without render coupling', () => {
  const game = startGame(createGame());
  drainAudioEvents(game);
  game.enemies = [
    { id: 0, slot: 0, distance: 0.9, speed: 0, hp: 2, armor: 0, alive: true, flash: 0, blocked: 0 },
    { id: 1, slot: 8, distance: 9, speed: 0, hp: 99, armor: 0, alive: true, flash: 0, blocked: 0 }
  ];
  castHammer(game);
  advance(game, 2.2);
  const cues = drainAudioEvents(game);
  for (const cue of ['cast', 'outboundHit', 'turn', 'returnBreak', 'catch']) assert.ok(cues.includes(cue), `${cue} emitted`);

  const breach = startGame(createGame());
  drainAudioEvents(breach);
  breach.enemies = [{ id: 0, slot: 0, distance: 0.201, speed: 1, hp: 2, alive: true, flash: 0 }];
  step(breach, 1 / 60);
  assert.ok(drainAudioEvents(breach).includes('bellHit'));
});

test('combat exposes deterministic visual effects with finite lifetimes', () => {
  const game = startGame(createGame());
  game.enemies = [
    { id: 0, slot: 0, distance: 0.9, speed: 0, hp: 2, armor: 0, alive: true, flash: 0, blocked: 0 },
    { id: 1, slot: 8, distance: 9, speed: 0, hp: 99, armor: 0, alive: true, flash: 0, blocked: 0 }
  ];
  castHammer(game);
  advance(game, 2.2);
  assert.ok(game.effects.some(effect => effect.kind === 'catch'));
  assert.ok(game.effects.every(effect => effect.life > 0 && effect.life <= effect.duration));
  advance(game, 0.6);
  assert.equal(game.effects.length, 0);

  const breach = startGame(createGame());
  breach.enemies = [{ id: 0, slot: 3, distance: 0.201, speed: 1, hp: 2, alive: true, flash: 0 }];
  step(breach, 1 / 60);
  assert.equal(breach.effects[0].kind, 'bell');
  assert.equal(breach.effects[0].slot, 3);
});
