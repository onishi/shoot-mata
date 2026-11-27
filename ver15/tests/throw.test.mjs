import assert from 'node:assert/strict';
import test from 'node:test';
import { createGame, firstThrowContact, grabTarget, rollerRecovering, rollerWindupRemaining, step, throwLane } from '../game/rules.mjs';

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
  for (let i = 0; i < 36; i++) step(game, idle, tick, kind => events.push(kind));
  assert.equal(events.filter(kind => kind === 'land').length, 1);
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

test('foreman practice starts with three throwable runners and keeps later reinforcements', () => {
  const practice = createGame(true);
  assert.equal(practice.time, 64);
  assert.equal(practice.enemies.filter(enemy => enemy.kind === 'foreman').length, 1);
  assert.equal(practice.enemies.filter(enemy => enemy.kind === 'runner').length, 3);
  step(practice, { ...idle, grab: true }, tick);
  assert.equal(practice.grab.kind, 'runner');
  for (let index = 0; index < 60; index++) step(practice, idle, tick);
  assert.equal(practice.enemies.filter(enemy => enemy.kind === 'runner').length, 4);
  assert.equal(practice.enemies.filter(enemy => enemy.kind === 'foreman').length, 1);
  assert.deepEqual(createGame().enemies, []);
  assert.equal(createGame().time, 0);
});

test('the preview and throw hit the nearer blocker before the foreman', () => {
  const game = carryingGame();
  const { start, end } = throwLane(game);
  const foreman = { kind: 'foreman', hp: 3, x: start + 55, y: game.y, clock: 2, flight: 0 };
  const blocker = { kind: 'runner', hp: 1, x: start + 35, y: game.y, clock: 0, flight: 0 };
  game.enemies.unshift(foreman, blocker);

  assert.deepEqual(firstThrowContact(game, game.grab, start, end, game.y), {
    actor: blocker, distance: 2,
  });
  step(game, { ...idle, grab: true }, tick);
  assert.equal(game.score, 200);
  assert.equal(foreman.hp, 3);
  assert.ok(!game.enemies.includes(blocker));
});

test('the roller holds its warned lane, punishing a stand and allowing a sidestep', () => {
  function run(sidestep) {
    const game = createGame();
    game.wave = 1;
    const roller = { kind: 'roller', hp: 1, x: game.x + 56, y: game.y, clock: 1.54, flight: 0 };
    game.enemies.push(roller);
    const events = [];
    step(game, idle, tick, kind => events.push(kind));
    const destination = roller.chargeEndX;
    assert.ok(destination < game.x);
    assert.equal(grabTarget(game), null);
    assert.ok(rollerWindupRemaining(roller) > 0.98);

    for (let frame = 0; frame < 61; frame++) {
      step(game, { ...idle, down: sidestep && frame < 12, grab: frame === 0 }, tick, kind => events.push(kind));
      if (frame === 17) assert.ok(Math.abs(rollerWindupRemaining(roller) - 0.5) < 0.02);
    }
    assert.deepEqual(events.slice(0, 2), ['windup', 'miss']);
    assert.equal(events.filter(kind => kind === 'windup').length, 1);
    assert.equal(rollerWindupRemaining(roller), 0);
    assert.equal(events.filter(kind => kind === 'brake').length, 1);
    assert.equal(rollerRecovering(roller), true);
    assert.ok(Math.abs(roller.x - destination) < 1e-8);
    assert.equal(roller.y, 280);
    if (sidestep) {
      step(game, { ...idle, grab: true }, tick);
      assert.equal(game.grab, roller);
      assert.equal(roller.chargeEndX, null);
    }
    return game.hp;
  }

  assert.equal(run(false), 4);
  assert.equal(run(true), 5);
});

test('a close hit dislodges a carried machine, while a sidestep keeps it', () => {
  for (const sidestep of [false, true]) {
    const game = carryingGame();
    const payload = game.grab;
    const attacker = { kind: 'runner', hp: 1, x: game.x - 24, y: game.y, clock: 0, flight: 0 };
    game.enemies.push(attacker);
    const events = [];
    step(game, { ...idle, down: sidestep, dodge: sidestep }, tick, kind => events.push(kind));

    assert.equal(game.hp, sidestep ? 5 : 4);
    assert.equal(game.grab, sidestep ? payload : null);
    assert.deepEqual(events, sidestep ? ['dodge'] : ['drop', 'hit']);
    assert.equal(payload.flight, 0);
    assert.equal(game.score, 0);
    assert.ok(game.enemies.includes(payload));
    if (!sidestep) {
      game.enemies = [payload];
      assert.equal(grabTarget(game), null);
      for (let frame = 0; frame < 14; frame++) step(game, idle, tick);
      assert.equal(grabTarget(game), payload);
    }
  }
});
