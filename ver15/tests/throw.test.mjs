import assert from 'node:assert/strict';
import test from 'node:test';
import { createGame, step, throwLane } from '../game/rules.mjs';

const tick = 1 / 60;
const idle = { left: false, right: false, up: false, down: false };

function carryingGame() {
  const game = createGame();
  step(game, { ...idle, grab: true }, tick);
  assert.ok(game.grab);
  return game;
}

test('turning and moving on the throw frame launches from the new lane', () => {
  const game = carryingGame();
  const payload = game.grab;
  step(game, { ...idle, left: true, up: true, grab: true }, tick);
  const { start } = throwLane(game);
  assert.equal(payload.x, start - 570 * tick);
  assert.equal(payload.y, game.y);
});

test('a foreman hit interrupts its charge and forces a new throw lane', () => {
  const game = carryingGame();
  const foreman = { kind: 'foreman', hp: 3, x: 310, y: game.y, clock: 2.2, flight: 0 };
  game.enemies.push(foreman);
  const events = [];
  step(game, { ...idle, grab: true }, tick, kind => events.push(kind));
  assert.deepEqual(events, ['throw', 'impact']);
  assert.equal(game.score, 500);
  assert.equal(foreman.hp, 2);
  assert.equal(foreman.clock, 1.55);
  assert.ok(foreman.x > 310);

  const followUp = { kind: 'runner', hp: 1, x: foreman.x - 12, y: foreman.y, clock: 0, flight: 0.20, velocity: 570 };
  game.enemies.unshift(followUp);
  for (let i = 0; i < 36; i++) step(game, idle, tick);
  assert.equal(foreman.hp, 2);
  assert.equal(game.score, 500);
  assert.equal(foreman.y, 365);
  assert.equal(foreman.shift, null);

  const aimed = { ...followUp, hp: 1, x: foreman.x - 12, y: foreman.y, flight: 0.20 };
  game.enemies.unshift(aimed);
  step(game, idle, tick);
  assert.equal(game.score, 1000);
  assert.equal(foreman.hp, 1);
  assert.equal(foreman.shift.to, 205);
});

test('a throw into the wall ends without a hit or points', () => {
  const game = carryingGame();
  game.x = 758;
  assert.deepEqual(throwLane(game), { start: 770, end: 770 });
  const events = [];
  step(game, { ...idle, grab: true }, tick, kind => events.push(kind));
  assert.deepEqual(events, ['throw', 'scrap']);
  assert.equal(game.score, 0);
  assert.equal(game.enemies.length, 0);
});
