import test from 'node:test';
import assert from 'node:assert/strict';
import { InputFrameProfiler } from '../src/input-profile.ts';

test('input profiler measures each event through the next frame', () => {
  const profiler = new InputFrameProfiler();
  profiler.input(10);
  profiler.input(15);
  assert.deepEqual(profiler.frame(20), { count: 2, meanMs: 7.5, p95Ms: 10, maxMs: 10 });
  assert.equal(profiler.frame(30), null);
  profiler.input(25);
  assert.deepEqual(profiler.frame(30), { count: 3, meanMs: 6.67, p95Ms: 10, maxMs: 10 });
});

test('input profiler drops interrupted inputs and caps the sample count', () => {
  const profiler = new InputFrameProfiler(2);
  profiler.input(1);
  profiler.clearPending();
  assert.equal(profiler.frame(10), null);
  profiler.input(10);
  profiler.input(11);
  profiler.input(12);
  assert.deepEqual(profiler.frame(15), { count: 2, meanMs: 4.5, p95Ms: 5, maxMs: 5 });
  profiler.input(20);
  assert.equal(profiler.frame(30), null);
});
