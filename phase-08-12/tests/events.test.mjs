import test from 'node:test';
import assert from 'node:assert/strict';
import { activateBurst, drainEvents, startGame, toggleMode, updateGame } from '../src/game.ts';

const idle = { x: 0, y: 0, fire: false };

test('mode and burst events are emitted once and can be drained', () => {
  const game = startGame();
  toggleMode(game);
  game.energy = 5;
  assert.equal(activateBurst(game), true);
  assert.deepEqual(drainEvents(game).map(event => event.kind), ['switch', 'burst']);
  assert.deepEqual(drainEvents(game), []);
});

test('kill and collection events preserve their positions and value', () => {
  const game = startGame();
  game.bossSpawned = true;
  game.enemies.push({ kind: 'light', x: 400, y: 270, hp: 1, radius: 18, shotTimer: 5, phase: 0 });
  game.bullets.push({ x: 400, y: 270, vx: 0, vy: 0, radius: 5, damage: 1 });
  updateGame(game, idle, 0.01);
  const kill = drainEvents(game).find(event => event.kind === 'kill');
  assert.equal(kill?.value, 1);
  assert.ok(kill?.x > 390);
  game.pickups[0].x = game.player.x;
  game.pickups[0].y = game.player.y;
  updateGame(game, idle, 0.01);
  const collect = drainEvents(game).find(event => event.kind === 'collect');
  assert.equal(collect?.value, 1);
  assert.equal(game.energy, 1);
});
