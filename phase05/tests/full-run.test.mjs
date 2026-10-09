import test from 'node:test';
import assert from 'node:assert/strict';
import { activateBurst, startGame, toggleMode, updateGame } from '../src/game.ts';

test('a scripted player can collect energy, burst, and clear the stage', () => {
  const game = startGame();
  let bursts = 0;
  let switches = 0;
  let collected = 0;

  for (let frame = 0; frame < 6000 && game.scene === 'play'; frame++) {
    const player = game.player;
    const target = game.enemies.find(enemy => enemy.x < 950) ?? { y: 270 };
    const pickup = game.pickups.find(item => item.x > player.x - 20 && item.x < player.x + 170);
    const danger = game.enemyBullets.find(bullet => Math.abs(bullet.x - player.x) < 90 && Math.abs(bullet.y - player.y) < 45);
    const wantedY = danger ? player.y + (danger.y < player.y ? 75 : -75) : pickup ? pickup.y : target.y;
    const wantedX = pickup ? pickup.x : 420;
    const mode = target.kind === 'heavy' || target.kind === 'boss' ? 'focus' : 'wide';
    if (game.mode !== mode) { toggleMode(game); switches++; }
    if (game.energy >= 5 && activateBurst(game)) bursts++;
    const priorScore = game.score;
    updateGame(game, {
      x: Math.abs(wantedX - player.x) < 8 ? 0 : Math.sign(wantedX - player.x),
      y: Math.abs(wantedY - player.y) < 10 ? 0 : Math.sign(wantedY - player.y),
      fire: true,
    }, 0.016);
    if (game.score - priorScore === 50) collected++;
  }

  assert.equal(game.outcome, 'clear');
  assert.ok(game.hits < 3);
  assert.ok(collected > 0);
  assert.ok(bursts > 0);
  assert.ok(switches > 0);
});
