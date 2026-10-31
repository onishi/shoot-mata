import './style.css';
import { createInitialState, step } from './simulation/game';
import { render } from './render/render';
import { TICK_RATE, type InputFrame } from './core/types';
import { createPilot } from './simulation/autopilot';

const canvas = document.querySelector<HTMLCanvasElement>('#game');
const status = document.querySelector<HTMLElement>('#status');
if (!canvas || !status) throw new Error('Required game elements are missing');
const ctx = canvas.getContext('2d');
if (!ctx) throw new Error('Canvas 2D is unavailable');

let state = createInitialState(404);
let paused = false;
let accumulator = 0;
let previousTime = performance.now();
const held = new Set<string>();
const pulses = { collate: false, retrace: false };
const matches = (code: string, values: string[]): boolean => values.includes(code);

window.addEventListener('keydown', (event) => {
  if (matches(event.code, ['Escape', 'KeyP']) && !event.repeat) paused = !paused;
  if (matches(event.code, ['KeyX', 'KeyK']) && !event.repeat) pulses.collate = true;
  if (matches(event.code, ['KeyC', 'KeyL']) && !event.repeat) pulses.retrace = true;
  held.add(event.code);
  if (matches(event.code, ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'])) event.preventDefault();
});
window.addEventListener('keyup', (event) => held.delete(event.code));
window.addEventListener('blur', () => { paused = true; held.clear(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) { paused = true; held.clear(); } });

const input = (): InputFrame => ({
  up: held.has('ArrowUp') || held.has('KeyW'),
  down: held.has('ArrowDown') || held.has('KeyS'),
  left: held.has('ArrowLeft') || held.has('KeyA'),
  right: held.has('ArrowRight') || held.has('KeyD'),
  fire: held.has('KeyZ') || held.has('KeyJ'),
  collate: pulses.collate,
  retrace: pulses.retrace
});

const frame = (now: number): void => {
  const elapsed = Math.min(250, now - previousTime);
  previousTime = now;
  if (!paused) {
    accumulator += elapsed;
    let steps = 0;
    while (accumulator >= 1000 / TICK_RATE && steps < 8) {
      const result = step(state, input());
      state = result.state;
      if (result.events.some((event) => event.type === 'loop-collated')) status.textContent = 'COLLATE succeeded. Captured fire has been returned.';
      pulses.collate = false;
      pulses.retrace = false;
      accumulator -= 1000 / TICK_RATE;
      steps += 1;
    }
    if (steps === 8) accumulator = 0;
  } else accumulator = 0;
  render(ctx, state, paused);
  requestAnimationFrame(frame);
};
requestAnimationFrame(frame);

Object.assign(window, {
  __PALIMPSEST_STATE__: () => state,
  // Deterministic QA hook used to inspect later Stage 1 compositions without
  // waiting in wall-clock time. It accepts no hidden input or state mutation.
  __PALIMPSEST_ADVANCE__: (ticks: number) => {
    const count = Math.max(0, Math.min(36000, Math.floor(ticks)));
    for (let index = 0; index < count; index += 1) state = step(state, {}).state;
    render(ctx, state, paused);
    return state.tick;
  },
  // Human-limited deterministic controller used only for later-state visual QA.
  __PALIMPSEST_AUTOPLAY__: (ticks: number) => {
    const count = Math.max(0, Math.min(36000, Math.floor(ticks)));
    const pilot = createPilot('stitch');
    for (let index = 0; index < count; index += 1) state = step(state, pilot(state)).state;
    render(ctx, state, paused);
    return state.tick;
  }
});
