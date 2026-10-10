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
  const title = transitionGame(retry, 'title');
  assert.equal(title.scene, 'title');
  assert.equal(title.outcome, null);
  assert.equal(title.score, 0);
  assert.equal(transitionGame(title, 'resume'), title);
});
