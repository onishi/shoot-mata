import test from 'node:test';
import assert from 'node:assert/strict';
import { startGame, updateGame } from '../src/game.ts';
import { BOSS_TIME, STAGE_WAVES } from '../src/stage.ts';

test('stage has three paced sections before the boss', () => {
  assert.ok(STAGE_WAVES.length > 80);
  assert.deepEqual([...new Set(STAGE_WAVES.map(wave => wave.section))], [1, 2, 3]);
  assert.ok(STAGE_WAVES.every((wave, index) => index === 0 || wave.at > STAGE_WAVES[index - 1].at));
  assert.ok(STAGE_WAVES.every((wave, index) => index === 0 || wave.at - STAGE_WAVES[index - 1].at < 5));
  assert.ok(STAGE_WAVES.at(-1).at < BOSS_TIME);
});

test('the stage spawns every scheduled wave and then the boss', () => {
  const game = startGame();
  game.player.invulnerable = 999;
  const input = { x: 0, y: 0, fire: false };
  while (game.time < BOSS_TIME - 0.05) updateGame(game, input, 0.05);
  assert.equal(game.wave, STAGE_WAVES.length);
  assert.equal(game.bossSpawned, false);
  updateGame(game, input, 0.05);
  assert.equal(game.bossSpawned, true);
  assert.equal(game.enemies.filter(enemy => enemy.kind === 'boss').length, 1);
});
