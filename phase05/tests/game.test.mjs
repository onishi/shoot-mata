import test from 'node:test';
import assert from 'node:assert/strict';
import { activateBurst, circlesTouch, startGame, toggleMode, updateGame } from '../src/game.ts';

const idle = { x: 0, y: 0, fire: false };

test('collision checks the combined radii', () => {
  assert.equal(circlesTouch({ x: 0, y: 0 }, 10, { x: 19, y: 0 }, 10), true);
  assert.equal(circlesTouch({ x: 0, y: 0 }, 10, { x: 20, y: 0 }, 10), false);
});

test('player cannot leave the playable area', () => {
  const game = startGame();
  game.player.x = 28;
  game.player.y = 62;
  updateGame(game, { x: -1, y: -1, fire: false }, 0.05);
  assert.equal(game.player.x, 28);
  assert.equal(game.player.y, 62);
});

test('losing all lives ends the game and retry resets state', () => {
  const game = startGame();
  game.lives = 1;
  game.enemyBullets.push({ x: game.player.x, y: game.player.y, vx: 0, vy: 0, radius: 7, damage: 1 });
  updateGame(game, idle, 0.01);
  assert.equal(game.outcome, 'gameover');
  assert.equal(game.scene, 'result');
  const retry = startGame();
  assert.equal(retry.lives, 3);
  assert.equal(retry.score, 0);
  assert.equal(retry.enemyBullets.length, 0);
});

test('defeating the boss clears the stage', () => {
  const game = startGame();
  game.bossSpawned = true;
  game.enemies.push({ kind: 'boss', x: 500, y: 270, hp: 1, radius: 53, shotTimer: 5, phase: 0 });
  game.bullets.push({ x: 500, y: 270, vx: 0, vy: 0, radius: 5, damage: 1 });
  updateGame(game, idle, 0.01);
  assert.equal(game.outcome, 'clear');
  assert.equal(game.score, 3500);
});

test('weapon switch changes shot pattern and movement precision', () => {
  const game = startGame();
  game.bossSpawned = true;
  toggleMode(game);
  assert.equal(game.mode, 'focus');
  updateGame(game, { x: 0, y: 1, fire: true }, 0.05);
  assert.equal(game.bullets.length, 1);
  assert.equal(game.bullets[0].damage, 2);
  assert.equal(game.player.y, 281);
  toggleMode(game);
  game.player.shotTimer = 0;
  updateGame(game, { x: 0, y: 0, fire: true }, 0.05);
  assert.equal(game.bullets.length, 4);
  assert.deepEqual(game.bullets.slice(1).map(b => b.vy), [-180, 0, 180]);
});

test('pickup fills burst meter and activation clears enemy bullets', () => {
  const game = startGame();
  game.bossSpawned = true;
  game.pickups.push({ x: game.player.x, y: game.player.y, value: 5, ttl: 2 });
  updateGame(game, idle, 0.01);
  assert.equal(game.energy, 5);
  game.enemyBullets.push({ x: 700, y: 200, vx: -10, vy: 0, radius: 7, damage: 1 });
  assert.equal(activateBurst(game), true);
  assert.equal(game.energy, 0);
  assert.equal(game.enemyBullets.length, 0);
  assert.equal(activateBurst(game), false);
});
