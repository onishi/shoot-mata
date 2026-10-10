import test from 'node:test';
import assert from 'node:assert/strict';
import { startGame, updateGame } from '../src/game.ts';
import { chooseBotInput } from '../src/bot.ts';

test('scripted player collects energy, bursts, switches, and clears', () => {
  const game = startGame();
  let bursts = 0, switches = 0, collections = 0;
  for (let frame = 0; frame < 6000 && game.scene === 'play'; frame++) {
    const priorMode = game.mode, priorBurst = game.burstTimer, priorScore = game.score;
    const input = chooseBotInput(game);
    if (game.mode !== priorMode) switches++;
    if (game.burstTimer > priorBurst) bursts++;
    updateGame(game, input, 0.016);
    if (game.score - priorScore === 50) collections++;
  }
  assert.equal(game.outcome, 'clear');
  assert.ok(game.hits < 3);
  assert.ok(collections > 0);
  assert.ok(bursts > 0);
  assert.ok(switches > 0);
});
