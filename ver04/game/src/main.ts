import './style.css';
import { advance, autoPause, createAppState, transition, type AppAction } from './app/app';
import { TICK_RATE, type InputFrame } from './core/types';
import { renderApp } from './render/render';
import { createPilot } from './simulation/autopilot';
import { STAGE_01_BOSS_START_TICK, STAGE_01_SPAWNS } from './content/stage-01';

const canvas = document.querySelector<HTMLCanvasElement>('#game');
const status = document.querySelector<HTMLElement>('#status');
if (!canvas || !status) throw new Error('Required game elements are missing');
const ctx = canvas.getContext('2d');
if (!ctx) throw new Error('Canvas 2D is unavailable');

let app = createAppState(404);
let accumulator = 0;
let previousTime = performance.now();
const held = new Set<string>();
const pulses = { collate: false, retrace: false };
const matches = (code: string, values: string[]): boolean => values.includes(code);

const applyAction = (action: AppAction): void => {
  const before = app.screen;
  app = transition(app, action);
  if (before !== app.screen) {
    held.clear();
    pulses.collate = false;
    pulses.retrace = false;
    accumulator = 0;
  }
};

window.addEventListener('keydown', (event) => {
  const { code } = event;
  if (!event.repeat) {
    if (app.screen === 'title' && code === 'KeyG') applyAction('guide');
    else if (app.screen === 'title' && matches(code, ['Enter', 'Space', 'KeyN'])) applyAction('start');
    else if (app.screen === 'guide' && matches(code, ['Enter', 'Escape', 'Backspace'])) applyAction(code === 'Enter' ? 'confirm' : 'back');
    else if (app.screen === 'stage-intro' && matches(code, ['Enter', 'Space'])) applyAction('confirm');
    else if (app.screen === 'stage-intro' && code === 'Escape') applyAction('back');
    else if (app.screen === 'playing' && matches(code, ['Escape', 'KeyP'])) applyAction('pause');
    else if (app.screen === 'paused' && matches(code, ['Escape', 'KeyP', 'Enter'])) applyAction(code === 'Enter' ? 'confirm' : 'pause');
    else if (app.screen === 'paused' && code === 'Backspace') applyAction('back');
    else if (app.screen === 'continue' && code === 'Enter') applyAction('confirm');
    else if (app.screen === 'continue' && code === 'Escape') applyAction('back');
    else if (app.screen === 'result' && matches(code, ['Enter', 'Escape'])) applyAction(code === 'Enter' ? 'confirm' : 'back');
    else if (app.screen === 'playing' && matches(code, ['KeyX', 'KeyK'])) pulses.collate = true;
    else if (app.screen === 'playing' && matches(code, ['KeyC', 'KeyL'])) pulses.retrace = true;
  }
  if (app.screen === 'playing') held.add(code);
  if (matches(code, ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'])) event.preventDefault();
});
window.addEventListener('keyup', (event) => held.delete(event.code));
const pauseForFocusLoss = (): void => {
  app = autoPause(app);
  held.clear();
  pulses.collate = false;
  pulses.retrace = false;
};
window.addEventListener('blur', pauseForFocusLoss);
document.addEventListener('visibilitychange', () => { if (document.hidden) pauseForFocusLoss(); });

const input = (): InputFrame => ({
  up: held.has('ArrowUp') || held.has('KeyW'),
  down: held.has('ArrowDown') || held.has('KeyS'),
  left: held.has('ArrowLeft') || held.has('KeyA'),
  right: held.has('ArrowRight') || held.has('KeyD'),
  fire: held.has('KeyZ') || held.has('KeyJ'),
  collate: pulses.collate,
  retrace: pulses.retrace
});

const runStep = (frameInput: InputFrame): void => {
  const result = advance(app, frameInput);
  app = result.state;
  if (result.events.some((event) => event.type === 'loop-collated')) status.textContent = 'COLLATE succeeded. Captured fire has been returned.';
  if (app.screen === 'continue') status.textContent = 'The wake broke. Continue from the checkpoint or return to title.';
  if (app.screen === 'result') status.textContent = 'Stage 1 complete. The harbor remembers.';
};

const frame = (now: number): void => {
  const elapsed = Math.min(250, now - previousTime);
  previousTime = now;
  if (app.screen === 'playing') {
    accumulator += elapsed;
    let steps = 0;
    while (accumulator >= 1000 / TICK_RATE && steps < 8 && app.screen === 'playing') {
      runStep(input());
      pulses.collate = false;
      pulses.retrace = false;
      accumulator -= 1000 / TICK_RATE;
      steps += 1;
    }
    if (steps === 8) accumulator = 0;
  } else accumulator = 0;
  renderApp(ctx, app);
  requestAnimationFrame(frame);
};
requestAnimationFrame(frame);

Object.assign(window, {
  __PALIMPSEST_STATE__: () => app.game,
  __PALIMPSEST_APP_STATE__: () => app,
  __PALIMPSEST_ADVANCE__: (ticks: number) => {
    const count = Math.max(0, Math.min(36000, Math.floor(ticks)));
    for (let index = 0; index < count && app.screen === 'playing'; index += 1) runStep({});
    renderApp(ctx, app);
    return app.game.tick;
  },
  __PALIMPSEST_AUTOPLAY__: (ticks: number) => {
    const count = Math.max(0, Math.min(36000, Math.floor(ticks)));
    const pilot = createPilot('stitch');
    for (let index = 0; index < count && app.screen === 'playing'; index += 1) runStep(pilot(app.game));
    renderApp(ctx, app);
    return app.game.tick;
  },
  __PALIMPSEST_QA_SCENARIO__: (scenario: 'damage' | 'boss-gate' | 'boss-defeat') => {
    if (app.screen !== 'playing') return app.screen;
    if (scenario === 'damage') {
      app.game.player.health = 1;
      app.game.player.invulnerableUntil = 0;
      app.game.bullets.push({ id: app.game.nextId++, x: app.game.player.x, y: app.game.player.y, vx: 0, vy: 0, radius: 8, kind: 'enemy', annotated: false, capturable: true });
    } else if (scenario === 'boss-gate') {
      app.game.tick = STAGE_01_BOSS_START_TICK - 1;
      app.game.encounterIndex = STAGE_01_SPAWNS.length;
      app.game.enemies = [];
      app.game.bullets = [];
      runStep({});
    } else if (app.game.boss) {
      app.game.boss.armorLayers = 0;
      app.game.boss.health = 1;
      app.game.bullets.push({ id: app.game.nextId++, x: app.game.boss.x, y: app.game.boss.y, vx: 0, vy: 0, radius: 5, kind: 'return', annotated: true, capturable: false });
    }
    if (scenario !== 'boss-gate') runStep({});
    renderApp(ctx, app);
    return app.screen;
  }
});
