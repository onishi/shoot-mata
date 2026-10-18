import './style.css';
import { activateBurst, createGame, drainEvents, startGame, toggleMode, transitionGame, updateGame, WIDTH, HEIGHT, type Enemy, type GameAction } from './game';
import { chooseBotInput } from './bot';
import { Effects } from './effects';
import { Sound } from './sound';
import { combineInput, TouchControls } from './touch';
import { BOSS_TIME, STAGE_SECTIONS } from './stage';

const canvas = document.querySelector<HTMLCanvasElement>('#game');
const overlay = document.querySelector<HTMLDivElement>('#overlay');
const soundToggle = document.querySelector<HTMLButtonElement>('#sound-toggle');
const touchStick = document.querySelector<HTMLElement>('#touch-stick');
const stickKnob = document.querySelector<HTMLElement>('#stick-knob');
const touchFire = document.querySelector<HTMLButtonElement>('#touch-fire');
const touchSwitch = document.querySelector<HTMLButtonElement>('#touch-switch');
const touchBurst = document.querySelector<HTMLButtonElement>('#touch-burst');
const touchPause = document.querySelector<HTMLButtonElement>('#touch-pause');
const mobileLives = document.querySelector<HTMLElement>('#mobile-lives');
const mobileScore = document.querySelector<HTMLElement>('#mobile-score');
const mobileTime = document.querySelector<HTMLElement>('#mobile-time');
const mobileMode = document.querySelector<HTMLElement>('#mobile-mode');
const mobileBurst = document.querySelector<HTMLElement>('#mobile-burst');
if (!canvas || !overlay || !soundToggle || !touchStick || !stickKnob || !touchFire || !touchSwitch || !touchBurst || !touchPause || !mobileLives || !mobileScore || !mobileTime || !mobileMode || !mobileBurst) throw new Error('Required game elements are missing');
const gameCanvas: HTMLCanvasElement = canvas;
const mobileHud = { lives: mobileLives, score: mobileScore, time: mobileTime, mode: mobileMode, burst: mobileBurst };
const pauseControl: HTMLButtonElement = touchPause;
const context = canvas.getContext('2d');
if (!context) throw new Error('Canvas 2D is unavailable');
const ctx: CanvasRenderingContext2D = context;
function syncCanvasResolution(): void {
  const bounds = gameCanvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  const width = Math.max(1, Math.round(bounds.width * ratio));
  const height = Math.max(1, Math.round(bounds.height * ratio));
  if (gameCanvas.width === width && gameCanvas.height === height) return;
  gameCanvas.width = width;
  gameCanvas.height = height;
  ctx.setTransform(width / WIDTH, 0, 0, height / HEIGHT, 0, 0);
}
syncCanvasResolution();
new ResizeObserver(syncCanvasResolution).observe(gameCanvas);
window.addEventListener('resize', syncCanvasResolution);
const ui: HTMLDivElement = overlay;
const keys = new Set<string>();
const effects = new Effects();
const sound = new Sound();
const autoplay = import.meta.env.DEV && new URLSearchParams(location.search).has('autoplay');
const profileFrames = import.meta.env.DEV && new URLSearchParams(location.search).has('profile');
const requestedSpeed = Number(new URLSearchParams(location.search).get('speed'));
const autoplaySpeed = autoplay && Number.isInteger(requestedSpeed) ? Math.max(1, Math.min(8, requestedSpeed)) : 1;
let state = autoplay ? startGame() : createGame();
const frameSamples: number[] = [];
const frameGapSamples: number[] = [];
if (autoplay) ui.hidden = true;
let lastFrame = 0;
const touch = new TouchControls(touchStick, stickKnob, touchFire, touchSwitch, touchBurst, touchPause, {
  switchMode: () => toggleMode(state),
  burst: () => { activateBurst(state); },
  pause: () => togglePause(),
});

function togglePause(): void {
  if (state.scene === 'play') {
    pauseDetail = 'P またはポーズボタンで再開';
    runAction('pause');
  } else if (state.scene === 'pause') {
    runAction('resume');
  }
}

function clearInputs(): void {
  touch.reset();
  keys.clear();
}

let pauseDetail = 'P またはポーズボタンで再開';

function runAction(action: GameAction): void {
  const previousScene = state.scene;
  const next = transitionGame(state, action);
  if (next === state && next.scene === previousScene) return;
  state = next;
  clearInputs();
  if (action === 'start' || action === 'retry' || action === 'title') effects.clear();
  if (state.scene === 'play') ui.hidden = true;
  else showOverlay();
}

function showOverlay(): void {
  if (state.scene === 'play') { ui.hidden = true; return; }
  const button = (action: GameAction, label: string, primary = false): string =>
    `<button type="button" data-action="${action}" class="${primary ? 'primary-action' : 'secondary-action'}">${label}</button>`;
  let title: string;
  let detail: string;
  let actions: string;
  if (state.scene === 'title') {
    title = 'SWITCHBACK';
    detail = '<span class="keyboard-help">WASD / 矢印: 移動　Space: 射撃　Shift / X: 切替　Z: バースト　P: ポーズ</span><span class="touch-help">左のスティックで移動。右のボタンで射撃・切替・バースト。</span>';
    actions = button('start', 'START', true);
  } else if (state.scene === 'pause') {
    title = 'PAUSED';
    detail = pauseDetail;
    actions = button('resume', 'RESUME', true) + button('retry', 'RETRY') + button('title', 'TITLE');
  } else {
    title = state.outcome === 'clear' ? 'STAGE CLEAR' : 'GAME OVER';
    detail = `SCORE ${state.score} · KILLS ${state.kills} · HITS ${state.hits}`;
    actions = button('retry', 'RETRY', true) + button('title', 'TITLE');
  }
  ui.innerHTML = `<h2>${title}</h2><p>${detail}</p><div class="overlay-actions">${actions}</div>`;
  ui.hidden = false;
}

ui.addEventListener('click', event => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-action]');
  if (button?.dataset.action) runAction(button.dataset.action as GameAction);
});
if (!autoplay) showOverlay();
soundToggle.addEventListener('click', async () => {
  const enabled = await sound.toggle();
  soundToggle.textContent = enabled ? 'SOUND ON' : 'SOUND OFF';
  soundToggle.setAttribute('aria-pressed', String(enabled));
});
window.addEventListener('keydown', event => {
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) event.preventDefault();
  keys.add(event.code);
  if (!event.repeat && ['ShiftLeft', 'ShiftRight', 'KeyX'].includes(event.code)) toggleMode(state);
  if (!event.repeat && event.code === 'KeyZ') activateBurst(state);
  if (!event.repeat && ['KeyP', 'Escape'].includes(event.code)) togglePause();
});
window.addEventListener('keyup', event => keys.delete(event.code));
window.addEventListener('blur', () => {
  clearInputs();
  if (state.scene === 'play') { pauseDetail = '画面に戻ったら再開してください'; runAction('pause'); }
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden && state.scene === 'play') { pauseDetail = 'タブに戻ったら再開してください'; runAction('pause'); }
});

function drawEnemy(enemy: Enemy): void {
  ctx.save(); ctx.translate(enemy.x, enemy.y);
  ctx.fillStyle = enemy.kind === 'boss' ? '#b93d66' : '#ff627e';
  ctx.strokeStyle = '#ffd6dc'; ctx.lineWidth = 3;
  ctx.beginPath();
  if (enemy.kind === 'light') {
    ctx.moveTo(-18, 0); ctx.lineTo(12, -15); ctx.lineTo(20, 0); ctx.lineTo(12, 15);
  } else {
    const r = enemy.radius;
    ctx.moveTo(-r, 0); ctx.lineTo(-r / 2, -r * .8); ctx.lineTo(r / 2, -r * .8);
    ctx.lineTo(r, 0); ctx.lineTo(r / 2, r * .8); ctx.lineTo(-r / 2, r * .8);
  }
  ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
}

function drawBackdrop(time: number): void {
  const sky = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  sky.addColorStop(0, '#090e20'); sky.addColorStop(1, '#111d39');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.fillStyle = '#7894c8';
  for (let index = 0; index < 34; index++) {
    const x = (index * 277 + 53 - time * (8 + index % 3) + WIDTH * 20) % WIDTH;
    const y = 66 + (index * 137) % (HEIGHT - 92);
    ctx.globalAlpha = index % 4 === 0 ? 0.35 : 0.17;
    ctx.fillRect(x, y, index % 5 === 0 ? 3 : 2, 2);
  }
  ctx.globalAlpha = 1;

  const farOffset = (time * 15) % 240;
  for (let index = -1; index < 6; index++) {
    const x = index * 240 - farOffset;
    ctx.fillStyle = '#142544'; ctx.fillRect(x + 25, 205, 26, 180);
    ctx.fillRect(x + 4, 375, 118, 70);
    ctx.fillStyle = '#29466f'; ctx.fillRect(x + 31, 244, 4, 52);
    ctx.fillRect(x + 60, 390, 32, 3);
  }

  ctx.strokeStyle = '#263a60'; ctx.lineWidth = 1;
  const gridOffset = (time * 28) % 80;
  for (let x = -80; x <= WIDTH + 80; x += 80) {
    ctx.beginPath(); ctx.moveTo(x - gridOffset, 54); ctx.lineTo(x - gridOffset, HEIGHT); ctx.stroke();
  }
  for (let y = 135; y <= HEIGHT; y += 88) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(WIDTH, y); ctx.stroke();
  }
}

function drawStageCue(time: number): void {
  const section = [...STAGE_SECTIONS].reverse().find(item => time >= item.start);
  if (section && time < section.start + 3.5) {
    ctx.fillStyle = '#a7b5d5'; ctx.font = 'bold 20px monospace';
    ctx.fillText(`STAGE 01 / ${section.label}`, 35, 93);
  }
  if (time >= BOSS_TIME - 3 && time < BOSS_TIME) {
    ctx.fillStyle = '#ff627e'; ctx.font = 'bold 28px monospace';
    ctx.fillText('WARNING / LARGE HOSTILE', 270, 110);
  }
}

function drawHud(): void {
  ctx.fillStyle = '#070c1ce8'; ctx.fillRect(0, 0, WIDTH, 54);
  ctx.fillStyle = '#38557c'; ctx.fillRect(0, 53, WIDTH, 1);
  ctx.fillStyle = '#f4f7ff'; ctx.font = 'bold 19px monospace';
  ctx.fillText(`LIVES ${state.lives.toString().padStart(2, '0')}`, 25, 32);
  ctx.fillText(`SCORE ${state.score.toString().padStart(6, '0')}`, 205, 32);
  ctx.fillStyle = state.mode === 'focus' ? '#6a552d' : '#194858';
  ctx.fillRect(432, 8, 135, 36);
  ctx.strokeStyle = state.mode === 'focus' ? '#ffe084' : '#55e2ef';
  ctx.strokeRect(432, 8, 135, 36);
  ctx.fillStyle = state.mode === 'focus' ? '#ffe084' : '#55e2ef';
  ctx.fillText(state.mode.toUpperCase(), 449, 32);
  ctx.fillStyle = state.energy >= 5 || state.burstTimer > 0 ? '#7ef2aa' : '#a7b5d5';
  ctx.fillText(state.burstTimer > 0 ? 'BURST!' : `BURST ${state.energy}/5`, 587, 27);
  for (let index = 0; index < 5; index++) {
    ctx.fillStyle = index < state.energy || state.burstTimer > 0 ? '#7ef2aa' : '#2d4565';
    ctx.fillRect(588 + index * 25, 37, 19, 5);
  }
  ctx.fillStyle = '#f4f7ff';
  ctx.fillText(`TIME ${Math.floor(state.time).toString().padStart(2, '0')}`, 775, 32);
}

function updateMobileHud(): void {
  mobileHud.lives.textContent = state.lives.toString().padStart(2, '0');
  mobileHud.score.textContent = state.score.toString().padStart(6, '0');
  mobileHud.time.textContent = Math.floor(state.time).toString().padStart(2, '0');
  mobileHud.mode.textContent = state.mode.toUpperCase();
  mobileHud.mode.style.color = state.mode === 'focus' ? '#ffe084' : '#55e2ef';
  mobileHud.burst.textContent = state.burstTimer > 0 ? 'ACTIVE' : `${state.energy} / 5`;
  mobileHud.burst.style.color = state.energy >= 5 || state.burstTimer > 0 ? '#7ef2aa' : '#f4f7ff';
}

function render(): void {
  pauseControl.hidden = state.scene === 'title' || state.scene === 'result';
  drawBackdrop(state.time);
  drawStageCue(state.time);
  for (const enemy of state.enemies) drawEnemy(enemy);
  effects.draw(ctx);
  for (const pickup of state.pickups) {
    ctx.fillStyle = '#7ef2aa'; ctx.strokeStyle = '#f4f7ff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(pickup.x, pickup.y - 13); ctx.lineTo(pickup.x + 13, pickup.y);
    ctx.lineTo(pickup.x, pickup.y + 13); ctx.lineTo(pickup.x - 13, pickup.y); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  for (const bullet of state.bullets) {
    ctx.fillStyle = bullet.mode === 'burst' ? '#7ef2aa' : bullet.mode === 'focus' ? '#ffe084' : '#55e2ef';
    ctx.fillRect(bullet.x - 8, bullet.y - (bullet.radius / 2), 18, bullet.radius);
  }
  for (const bullet of state.enemyBullets) {
    ctx.beginPath(); ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#ff627e'; ctx.fill(); ctx.strokeStyle = '#ffd6dc'; ctx.stroke();
  }
  if (state.player.invulnerable <= 0 || Math.floor(state.player.invulnerable * 12) % 2 === 0) {
    ctx.fillStyle = state.mode === 'focus' ? '#ffe084' : '#55e2ef'; ctx.strokeStyle = '#f4f7ff'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(state.player.x + 23, state.player.y);
    ctx.lineTo(state.player.x - 22, state.player.y - 19); ctx.lineTo(state.player.x - 13, state.player.y);
    ctx.lineTo(state.player.x - 22, state.player.y + 19); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  drawHud();
}

function frame(now: number): void {
  const frameStartedAt = profileFrames && frameSamples.length < 1500 && state.scene === 'play' ? performance.now() : null;
  const dt = lastFrame ? (now - lastFrame) / 1000 : 0;
  if (frameStartedAt !== null && lastFrame) frameGapSamples.push(now - lastFrame);
  lastFrame = now;
  const previousScene = state.scene;
  const manualInput = {
    x: Number(keys.has('ArrowRight') || keys.has('KeyD')) - Number(keys.has('ArrowLeft') || keys.has('KeyA')),
    y: Number(keys.has('ArrowDown') || keys.has('KeyS')) - Number(keys.has('ArrowUp') || keys.has('KeyW')),
    fire: keys.has('Space'),
  };
  if (autoplay) {
    for (let index = 0; index < autoplaySpeed && state.scene === 'play'; index++) {
      updateGame(state, chooseBotInput(state), 0.016);
    }
  } else {
    updateGame(state, combineInput(manualInput, touch.input), dt);
  }
  const events = drainEvents(state);
  for (const event of events) effects.add(event);
  sound.play(events);
  if (state.scene === 'play') effects.update(autoplay ? 0.016 * autoplaySpeed : dt);
  if (previousScene === 'play' && state.scene === 'result') {
    clearInputs();
    showOverlay();
  }
  render(); requestAnimationFrame(frame);
  updateMobileHud();
  if (frameStartedAt !== null) {
    frameSamples.push(performance.now() - frameStartedAt);
    if (frameSamples.length % 120 === 0 || frameSamples.length === 1500 || state.scene === 'result') {
      const sorted = [...frameSamples].sort((a, b) => a - b);
      const sortedGaps = [...frameGapSamples].sort((a, b) => a - b);
      gameCanvas.dataset.frameProfile = JSON.stringify({
        count: sorted.length,
        meanMs: Number((sorted.reduce((sum, value) => sum + value, 0) / sorted.length).toFixed(2)),
        p95Ms: Number(sorted[Math.ceil(sorted.length * 0.95) - 1].toFixed(2)),
        maxMs: Number(sorted[sorted.length - 1].toFixed(2)),
        gapP95Ms: sortedGaps.length ? Number(sortedGaps[Math.ceil(sortedGaps.length * 0.95) - 1].toFixed(2)) : null,
      });
    }
  }
}
requestAnimationFrame(frame);
