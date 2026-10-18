import test from 'node:test';
import assert from 'node:assert/strict';
import { combineInput, stickVector, TouchControls } from '../src/touch.ts';

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

test('suspending touch controls releases held pointers and input', () => {
  const element = () => {
    const listeners = new Map();
    const captured = new Set();
    const classes = new Set();
    return {
      style: {},
      classList: { add: name => classes.add(name), remove: name => classes.delete(name), contains: name => classes.has(name) },
      addEventListener: (name, handler) => listeners.set(name, handler),
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 100 }),
      setPointerCapture: id => captured.add(id),
      hasPointerCapture: id => captured.has(id),
      releasePointerCapture: id => captured.delete(id),
      emit: (name, event) => listeners.get(name)(event),
      captured,
    };
  };
  const stick = element();
  const knob = element();
  const fire = element();
  const touch = new TouchControls(stick, knob, fire, element(), element(), element(), {
    switchMode() {}, burst() {}, pause() {},
  });
  stick.emit('pointerdown', { pointerId: 1, clientX: 84, clientY: 50, preventDefault() {} });
  fire.emit('pointerdown', { pointerId: 2, preventDefault() {} });
  assert.deepEqual(touch.input, { x: 1, y: 0, fire: true });
  assert.equal(fire.classList.contains('pressed'), true);

  touch.reset();
  assert.deepEqual(touch.input, { x: 0, y: 0, fire: false });
  assert.equal(stick.captured.size, 0);
  assert.equal(fire.captured.size, 0);
  assert.equal(fire.classList.contains('pressed'), false);
});
