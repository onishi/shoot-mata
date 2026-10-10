import test from 'node:test';
import assert from 'node:assert/strict';
import { combineInput, stickVector } from '../src/touch.ts';

test('stick vector is proportional near the center and clamped at the edge', () => {
  assert.deepEqual(stickVector(0, 0, 0, 0, 40), { x: 0, y: 0 });
  assert.deepEqual(stickVector(0, 0, 20, 0, 40), { x: 0.5, y: 0 });
  assert.deepEqual(stickVector(0, 0, 80, 0, 40), { x: 1, y: 0 });
  const diagonal = stickVector(0, 0, 40, 40, 40);
  assert.ok(Math.abs(Math.hypot(diagonal.x, diagonal.y) - 1) < 1e-10);
});

test('touch and keyboard can move and fire together without exceeding input bounds', () => {
  assert.deepEqual(
    combineInput({ x: 1, y: 0, fire: false }, { x: 0.7, y: -0.5, fire: true }),
    { x: 1, y: -0.5, fire: true },
  );
});
