import { angleForSlot, castHammer, createGame, movePlayer, startGame, step } from './model.js';

const canvas = document.querySelector('#game');
const ctx = canvas.getContext('2d');
let game = createGame();
let paused = false;
let previous = performance.now();

function polar(slot, radius) {
  const angle = angleForSlot(slot);
  return [320 + Math.cos(angle) * radius, 258 + Math.sin(angle) * radius];
}

function text(value, x, y, size = 16, color = '#f5e6b0', align = 'left') {
  ctx.fillStyle = color;
  ctx.font = `bold ${size}px ui-monospace, monospace`;
  ctx.textAlign = align;
  ctx.fillText(value, x, y);
}

function drawBell() {
  ctx.save();
  ctx.translate(320, 258);
  ctx.fillStyle = '#4e281f';
  ctx.fillRect(-36, -52, 72, 12);
  ctx.fillStyle = game.bell === 1 ? '#d44a3a' : '#c28b38';
  ctx.strokeStyle = '#ffe098';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(-34, 38); ctx.quadraticCurveTo(-48, -25, -22, -50);
  ctx.lineTo(22, -50); ctx.quadraticCurveTo(48, -25, 34, 38); ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#2a1620'; ctx.fillRect(-45, 34, 90, 14);
  ctx.fillStyle = '#ffd66d'; ctx.beginPath(); ctx.arc(0, 48, 9, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawArena() {
  const gradient = ctx.createRadialGradient(320, 258, 40, 320, 258, 290);
  gradient.addColorStop(0, '#39273a'); gradient.addColorStop(0.55, '#141a38'); gradient.addColorStop(1, '#070a19');
  ctx.fillStyle = gradient; ctx.fillRect(0, 58, 640, 380);
  ctx.strokeStyle = '#45537d'; ctx.lineWidth = 2;
  for (const radius of [82, 132, 190]) { ctx.beginPath(); ctx.arc(320, 258, radius, 0, Math.PI * 2); ctx.stroke(); }
  for (let slot = 0; slot < 16; slot++) {
    const [x1, y1] = polar(slot, 68); const [x2, y2] = polar(slot, 205);
    ctx.strokeStyle = slot % 4 === 0 ? '#66516c' : '#293052';
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  }
}

function drawActors() {
  for (const enemy of game.enemies) {
    if (!enemy.alive) continue;
    const [x, y] = polar(enemy.slot, 66 + enemy.distance * 105);
    ctx.save(); ctx.translate(x, y); ctx.rotate(angleForSlot(enemy.slot) + Math.PI / 2);
    ctx.fillStyle = enemy.flash ? '#ffffff' : '#d54b62';
    ctx.strokeStyle = '#280f23'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0, -13); ctx.lineTo(11, 10); ctx.lineTo(0, 6); ctx.lineTo(-11, 10); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffd36b'; ctx.fillRect(-7, 12, 5, 5); ctx.fillRect(2, 12, 5, 5);
    ctx.restore();
  }

  if (game.hammer) {
    const [sx, sy] = polar(game.hammer.slot, 82);
    const [hx, hy] = polar(game.hammer.slot, 66 + game.hammer.distance * 105);
    ctx.strokeStyle = game.hammer.phase === 'out' ? '#64dfff' : '#ffcf55';
    ctx.lineWidth = game.hammer.phase === 'out' ? 4 : 8;
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(hx, hy); ctx.stroke();
    ctx.fillStyle = '#f7f0cf'; ctx.strokeStyle = '#1b264b'; ctx.lineWidth = 3;
    ctx.fillRect(hx - 9, hy - 6, 18, 12); ctx.strokeRect(hx - 9, hy - 6, 18, 12);
  }

  const [px, py] = polar(game.playerSlot, 96);
  ctx.save(); ctx.translate(px, py); ctx.rotate(angleForSlot(game.playerSlot) + Math.PI / 2);
  ctx.fillStyle = '#67e0c1'; ctx.strokeStyle = '#081b25'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(0, -15); ctx.lineTo(12, 12); ctx.lineTo(0, 7); ctx.lineTo(-12, 12); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.restore();
}

function render() {
  ctx.fillStyle = '#080d20'; ctx.fillRect(0, 0, 640, 480);
  ctx.fillStyle = '#481f32'; ctx.fillRect(0, 0, 640, 58); ctx.fillRect(0, 438, 640, 42);
  text('RINGWARD', 18, 37, 30, '#ffe29a');
  text('v13.0  M1', 620, 35, 14, '#9adbe8', 'right');
  drawArena(); drawBell();
  if (game.mode !== 'title') drawActors();
  text(`SCORE ${String(game.score).padStart(6, '0')}`, 18, 82, 16);
  text(`CHAIN ×${game.chain}`, 320, 82, 16, '#77e4ca', 'center');
  text(`BELL ${'◆'.repeat(game.bell)}${'◇'.repeat(3 - game.bell)}`, 622, 82, 16, game.bell === 1 ? '#ff6b62' : '#ffe29a', 'right');
  text(game.message, 320, 418, game.mode === 'title' ? 24 : 18, game.mode === 'gameOver' ? '#ff6b62' : '#ffe29a', 'center');
  if (game.mode === 'title') {
    text('ONE HAMMER. TWO STRIKES. CATCH THE RETURN.', 320, 200, 17, '#9adbe8', 'center');
    text('← → RUN THE RING', 320, 252, 17, '#d6d9ec', 'center');
    text('SPACE CAST ECHO', 320, 282, 17, '#d6d9ec', 'center');
  }
  if (paused) { ctx.fillStyle = '#080d20cc'; ctx.fillRect(120, 205, 400, 90); text('PAUSED', 320, 260, 30, '#ffe29a', 'center'); }
  text('8-WAY LEVER　　ECHO BUTTON　　START', 320, 466, 13, '#f2c8ba', 'center');
  canvas.setAttribute('aria-label', `RINGWARD ${game.mode}. Score ${game.score}. Chain ${game.chain}. Bell ${game.bell}. ${game.message}`);
}

addEventListener('keydown', event => {
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(event.code)) event.preventDefault();
  if (event.code === 'Enter' && game.mode === 'title') startGame(game);
  else if (event.code === 'KeyR' && game.mode !== 'title') { game = createGame(); startGame(game); paused = false; }
  else if (event.code === 'KeyP' && game.mode === 'playing') paused = !paused;
  else if (!paused && game.mode === 'playing') {
    if (event.code === 'ArrowLeft' || event.code === 'ArrowUp') movePlayer(game, -1);
    if (event.code === 'ArrowRight' || event.code === 'ArrowDown') movePlayer(game, 1);
    if (event.code === 'Space') castHammer(game);
  }
});

function frame(now) {
  const elapsed = Math.min(0.05, (now - previous) / 1000); previous = now;
  if (!paused) step(game, elapsed);
  render(); requestAnimationFrame(frame);
}
canvas.focus(); requestAnimationFrame(frame);
