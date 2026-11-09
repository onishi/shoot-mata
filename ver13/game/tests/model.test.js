import test from 'node:test';
import assert from 'node:assert/strict';
import { castHammer, createGame, drainAudioEvents, driveDemo, insertCoin, movePlayer, returnToAttract, startCredit, startDemo, startGame, startNextWave, step } from '../src/model.js';

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
  for (const enemy of game.enemies) enemy.alive = false;
  step(game);
  assert.equal(game.mode, 'waveBrief');
  assert.equal(startNextWave(game), true);
  assert.equal(game.mode, 'playing');
  assert.equal(game.wave, 1);
  assert.equal(game.enemies.filter(enemy => enemy.kind === 'bulwark').length, 2);
});

test('bulwark blocks outbound damage but is broken by the return', () => {
  const game = startGame(createGame());
  game.wave = 1;
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
  for (const enemy of game.enemies) enemy.alive = false;
  step(game);
  assert.equal(game.mode, 'waveBrief');
  assert.equal(startNextWave(game), true);
  assert.equal(game.wave, 2);
  assert.equal(game.enemies.every(enemy => enemy.kind === 'rusher'), true);
  assert.match(game.message, /RUSHER/);
});

test('one outbound strike stops a rusher', () => {
  const game = startGame(createGame(), 2);
  game.enemies = [{
    id: 0, kind: 'rusher', slot: 0, distance: 0.9, speed: 0,
    hp: 1, armor: 0, alive: true, flash: 0, blocked: 0
  }];
  castHammer(game);
  advance(game, 0.75);
  assert.equal(game.enemies[0].alive, false);
  assert.equal(game.mode, 'waveClear');
  assert.match(game.message, /DAWN HELD/);
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

test('three breaches end the game', () => {
  const game = startGame(createGame());
  game.enemies = [0, 1, 2].map(id => ({ id, slot: id, distance: 0.201, speed: 1, hp: 2, alive: true, flash: 0 }));
  step(game, 1 / 60);
  assert.equal(game.bell, 0);
  assert.equal(game.mode, 'gameOver');
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
