import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, transitionGame, updateGame } from '../src/game.ts';

test('pause freezes progress and resume keeps the same run', () => {
  const game = transitionGame(createGame(), 'start');
  updateGame(game, { x: 0, y: 0, fire: false }, 0.05);
  game.score = 350;
  const elapsed = game.time;
  assert.equal(transitionGame(game, 'pause'), game);
  updateGame(game, { x: 0, y: 0, fire: true }, 1);
  assert.equal(game.time, elapsed);
  assert.equal(game.score, 350);
  assert.equal(transitionGame(game, 'resume'), game);
  assert.equal(game.scene, 'play');
  assert.equal(game.time, elapsed);
  assert.equal(game.score, 350);
});

test('retry and title clear progress only from supported screens', () => {
  const game = transitionGame(createGame(), 'start');
  game.time = 75;
  game.score = 4500;
  game.energy = 5;
  game.lives = 1;
  assert.equal(transitionGame(game, 'retry'), game);
  transitionGame(game, 'pause');
  const retry = transitionGame(game, 'retry');
  assert.equal(retry.scene, 'play');
  assert.equal(retry.time, 0);
  assert.equal(retry.score, 0);
  assert.equal(retry.energy, 0);
  assert.equal(retry.lives, 3);
  retry.scene = 'result';
  retry.outcome = 'gameover';
  retry.time = 168;
  retry.score = 8900;
  const nextRun = transitionGame(retry, 'retry');
  assert.equal(nextRun.scene, 'play');
  assert.equal(nextRun.time, 0);
  assert.equal(nextRun.score, 0);
  assert.equal(nextRun.outcome, null);
  nextRun.scene = 'result';
  nextRun.outcome = 'clear';
  const title = transitionGame(nextRun, 'title');
  assert.equal(title.scene, 'title');
  assert.equal(title.outcome, null);
  assert.equal(title.score, 0);
  assert.equal(transitionGame(title, 'resume'), title);
});

test('a lethal hit locks the result before a same-frame pickup', () => {
  const game = transitionGame(createGame(), 'start');
  game.lives = 1;
  game.score = 200;
  game.enemyBullets.push({ x: game.player.x, y: game.player.y, vx: 0, vy: 0, radius: 7, damage: 1 });
  game.pickups.push({ x: game.player.x, y: game.player.y, value: 2, ttl: 8 });
  updateGame(game, { x: 0, y: 0, fire: false }, 0.016);
  assert.equal(game.scene, 'result');
  assert.equal(game.outcome, 'gameover');
  assert.equal(game.score, 200);
  assert.equal(game.energy, 0);
});
