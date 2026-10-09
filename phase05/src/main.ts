import './style.css';
import { createGame, startGame, updateGame, WIDTH, HEIGHT, type Enemy } from './game';

const canvas = document.querySelector<HTMLCanvasElement>('#game');
const overlay = document.querySelector<HTMLDivElement>('#overlay');
const primary = document.querySelector<HTMLButtonElement>('#primary');
if (!canvas || !overlay || !primary) throw new Error('Required game elements are missing');
const context = canvas.getContext('2d');
if (!context) throw new Error('Canvas 2D is unavailable');
const ctx: CanvasRenderingContext2D = context;
const ui: HTMLDivElement = overlay;
const keys = new Set<string>();
let state = createGame();
let lastFrame = 0;

function showOverlay(title: string, detail: string, action: string): void {
  ui.hidden = false;
  ui.innerHTML = `<h2>${title}</h2><p>${detail}</p><button id="primary">${action}</button>`;
  ui.querySelector('button')?.addEventListener('click', () => {
    if (state.scene === 'pause') state.scene = 'play';
    else state = startGame();
    ui.hidden = true;
  });
}

primary.addEventListener('click', () => { state = startGame(); ui.hidden = true; });
window.addEventListener('keydown', event => {
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) event.preventDefault();
  keys.add(event.code);
  if (!event.repeat && ['KeyP', 'Escape'].includes(event.code)) {
    if (state.scene === 'play') { state.scene = 'pause'; showOverlay('PAUSED', 'P または Escape で再開', 'RESUME'); }
    else if (state.scene === 'pause') { state.scene = 'play'; ui.hidden = true; }
  }
});
window.addEventListener('keyup', event => keys.delete(event.code));
window.addEventListener('blur', () => keys.clear());
document.addEventListener('visibilitychange', () => {
  if (document.hidden && state.scene === 'play') { state.scene = 'pause'; showOverlay('PAUSED', 'タブに戻ったら再開してください', 'RESUME'); }
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

function render(): void {
  ctx.fillStyle = '#090e20'; ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.strokeStyle = '#172344'; ctx.lineWidth = 1;
  const offset = (state.time * 18) % 80;
  for (let x = -80; x <= WIDTH; x += 80) { ctx.beginPath(); ctx.moveTo(x - offset, 0); ctx.lineTo(x - offset, HEIGHT); ctx.stroke(); }
  for (let y = 80; y <= HEIGHT; y += 80) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(WIDTH, y); ctx.stroke(); }
  for (const enemy of state.enemies) drawEnemy(enemy);
  for (const bullet of state.bullets) { ctx.fillStyle = '#55e2ef'; ctx.fillRect(bullet.x - 8, bullet.y - 3, 18, 6); }
  for (const bullet of state.enemyBullets) {
    ctx.beginPath(); ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#ff627e'; ctx.fill(); ctx.strokeStyle = '#ffd6dc'; ctx.stroke();
  }
  if (state.player.invulnerable <= 0 || Math.floor(state.player.invulnerable * 12) % 2 === 0) {
    ctx.fillStyle = '#55e2ef'; ctx.strokeStyle = '#f4f7ff'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(state.player.x + 23, state.player.y);
    ctx.lineTo(state.player.x - 22, state.player.y - 19); ctx.lineTo(state.player.x - 13, state.player.y);
    ctx.lineTo(state.player.x - 22, state.player.y + 19); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  ctx.fillStyle = '#090e20d9'; ctx.fillRect(0, 0, WIDTH, 48);
  ctx.fillStyle = '#f4f7ff'; ctx.font = 'bold 19px monospace';
  ctx.fillText(`LIVES ${state.lives.toString().padStart(2, '0')}`, 25, 31);
  ctx.fillText(`SCORE ${state.score.toString().padStart(6, '0')}`, 215, 31);
  ctx.fillText(`TIME ${Math.floor(state.time).toString().padStart(2, '0')}`, 750, 31);
}

function frame(now: number): void {
  const dt = lastFrame ? (now - lastFrame) / 1000 : 0;
  lastFrame = now;
  const previousScene = state.scene;
  updateGame(state, {
    x: Number(keys.has('ArrowRight') || keys.has('KeyD')) - Number(keys.has('ArrowLeft') || keys.has('KeyA')),
    y: Number(keys.has('ArrowDown') || keys.has('KeyS')) - Number(keys.has('ArrowUp') || keys.has('KeyW')),
    fire: keys.has('Space'),
  }, dt);
  if (previousScene === 'play' && state.scene === 'result') {
    showOverlay(state.outcome === 'clear' ? 'STAGE CLEAR' : 'GAME OVER',
      `SCORE ${state.score} · KILLS ${state.kills} · HITS ${state.hits}`, 'RETRY');
  }
  render(); requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
