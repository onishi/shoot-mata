import test from 'node:test';
import assert from 'node:assert/strict';
import { PLAYTEST_POLICIES } from '../src/policies.ts';
import { runPlaytest } from '../src/playtest.ts';

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
