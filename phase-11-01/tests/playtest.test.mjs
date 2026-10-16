import test from 'node:test';
import assert from 'node:assert/strict';
import { PLAYTEST_POLICIES } from '../src/policies.ts';
import { choosePolicyInput } from '../src/policies.ts';
import { runPlaytest } from '../src/playtest.ts';
import { drainEvents, startGame } from '../src/game.ts';

test('AI policies produce reproducible, distinct stage traces', () => {
  const results = PLAYTEST_POLICIES.map(policy => {
    const first = runPlaytest(policy);
    assert.deepEqual(runPlaytest(policy), first, `${policy} changed between identical runs`);
    assert.ok(first.frames > 0);
    assert.ok(first.timeline.length > 0);
    assert.equal(first.timeline.at(-1).time, first.time);
    return first;
  });
  assert.equal(new Set(results.map(result => JSON.stringify(result))).size, results.length);
});

test('collector spends a full burst meter before reaching the boss', () => {
  const game = startGame();
  game.energy = 5;
  choosePolicyInput(game, 'collector');
  assert.equal(game.energy, 0);
  assert.ok(game.burstTimer > 0);
  assert.deepEqual(drainEvents(game).map(event => event.kind), ['burst']);
});

test('collector survives longer than the 09-01 baseline under the same simulation', () => {
  const result = runPlaytest('collector');
  assert.ok(result.bursts > 0);
  assert.ok(result.time > 23.25);
  assert.ok(result.score > 2600);
});
