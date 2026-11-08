import { angleForSlot, castHammer, createGame, movePlayer, startGame, startNextWave, step, WAVES } from './model.js';
import { keyLabel, loadSave, rebind, storeSave } from './storage.js';

const canvas = document.querySelector('#game');
const ctx = canvas.getContext('2d');
let game = createGame();
let paused = false;
let save = loadSave();
let menu = 'game';
let settingRow = 0;
let captureAction = null;
let previous = performance.now();
const settings = [
  { label: 'SOUND VOLUME', type: 'volume' },
  { label: 'REDUCED MOTION', type: 'motion' },
  { label: 'RUN COUNTER-CLOCKWISE', type: 'key', action: 'left' },
  { label: 'RUN CLOCKWISE', type: 'key', action: 'right' },
  { label: 'CAST ECHO', type: 'key', action: 'cast' },
  { label: 'RETURN TO CABINET', type: 'back' }
];
const WAVE_COUNT = WAVES.length;
const WAVE_BRIEFS = {
  1: {
    title: 'WAVE 2 — IRON PROCESSION',
    line1: 'CYAN GUARD STOPS THE OUTBOUND HIT', color1: '#9adbe8',
    line2: 'THE GOLD RETURN BREAKS THROUGH', color2: '#ffcf55'
  },
  2: {
    title: 'WAVE 3 — AMBER RUSH',
    line1: 'AMBER RUSHERS CLOSE TWICE AS FAST', color1: '#ffae55',
    line2: 'ONE CLEAN STRIKE STOPS EACH CHARGE', color2: '#f5e6b0'
  }
};

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
    ctx.fillStyle = enemy.flash ? '#ffffff' : enemy.kind === 'bulwark' ? '#9b65cf' : enemy.kind === 'rusher' ? '#ff9838' : '#d54b62';
    ctx.strokeStyle = '#280f23'; ctx.lineWidth = 3;
    if (enemy.kind === 'bulwark') {
      ctx.beginPath(); ctx.moveTo(0, -15); ctx.lineTo(13, -7); ctx.lineTo(10, 12); ctx.lineTo(0, 8); ctx.lineTo(-10, 12); ctx.lineTo(-13, -7); ctx.closePath(); ctx.fill(); ctx.stroke();
      if (enemy.armor > 0) {
        ctx.strokeStyle = enemy.blocked ? '#ffffff' : '#72e5ff'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(0, -5, 17, Math.PI * 1.12, Math.PI * 1.88); ctx.stroke();
      }
    } else if (enemy.kind === 'rusher') {
      ctx.beginPath(); ctx.moveTo(0, -17); ctx.lineTo(8, -4); ctx.lineTo(5, 12); ctx.lineTo(0, 7); ctx.lineTo(-5, 12); ctx.lineTo(-8, -4); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#ffe08a'; ctx.lineWidth = 2;
      for (const offset of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(offset * 8, 2); ctx.lineTo(offset * 15, 8); ctx.lineTo(offset * 9, 11); ctx.stroke();
      }
    } else {
      ctx.beginPath(); ctx.moveTo(0, -13); ctx.lineTo(11, 10); ctx.lineTo(0, 6); ctx.lineTo(-11, 10); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
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

function drawSettings() {
  ctx.fillStyle = '#080d20'; ctx.fillRect(0, 58, 640, 380);
  text('OPERATOR ACCESSIBILITY', 320, 105, 24, '#ffe29a', 'center');
  text('SETTING', 120, 140, 13, '#9adbe8');
  text('VALUE', 520, 140, 13, '#9adbe8', 'right');
  settings.forEach((item, index) => {
    const y = 180 + index * 40;
    if (index === settingRow) {
      ctx.fillStyle = '#49324f'; ctx.fillRect(92, y - 25, 456, 34);
      text('▶', 104, y, 16, '#ffcf55');
    }
    text(item.label, 126, y, 15, index === settingRow ? '#ffffff' : '#d6d9ec');
    let value = '';
    if (item.type === 'volume') value = `${save.volume * 10}%`;
    if (item.type === 'motion') value = save.reducedMotion ? 'ON' : 'OFF';
    if (item.type === 'key') value = captureAction === item.action ? 'PRESS A KEY' : keyLabel(save.keys[item.action]);
    text(value, 520, y, 16, captureAction === item.action ? '#ffcf55' : '#77e4ca', 'right');
  });
  text(captureAction ? 'ESC CANCEL' : '↑↓ SELECT   ←→ CHANGE   ENTER SET   ESC BACK', 320, 418, 13, '#f2c8ba', 'center');
}

function render() {
  ctx.fillStyle = '#080d20'; ctx.fillRect(0, 0, 640, 480);
  ctx.fillStyle = '#481f32'; ctx.fillRect(0, 0, 640, 58); ctx.fillRect(0, 438, 640, 42);
  text('RINGWARD', 18, 37, 30, '#ffe29a');
  text('v13.0  M2', 620, 35, 14, '#9adbe8', 'right');
  drawArena(); drawBell();
  if (menu === 'settings') {
    drawSettings();
  } else if (game.mode !== 'title') drawActors();
  text(`SCORE ${String(game.score).padStart(6, '0')}`, 18, 82, 16);
  text(`WAVE ${game.wave + 1}/${WAVE_COUNT}  CHAIN ×${game.chain}`, 320, 82, 16, '#77e4ca', 'center');
  text(`BELL ${'◆'.repeat(game.bell)}${'◇'.repeat(3 - game.bell)}`, 622, 82, 16, game.bell === 1 ? '#ff6b62' : '#ffe29a', 'right');
  if (menu === 'game') text(game.message, 320, 418, game.mode === 'title' ? 24 : 18, game.mode === 'gameOver' ? '#ff6b62' : '#ffe29a', 'center');
  if (menu === 'game' && game.mode === 'title') {
    text('ONE HAMMER. TWO STRIKES. CATCH THE RETURN.', 320, 200, 17, '#9adbe8', 'center');
    text(`${keyLabel(save.keys.left)} ${keyLabel(save.keys.right)} RUN THE RING`, 320, 252, 17, '#d6d9ec', 'center');
    text(`${keyLabel(save.keys.cast)} CAST ECHO`, 320, 282, 17, '#d6d9ec', 'center');
    if (save.highestWave > 0) text(`ENTER CONTINUE WAVE ${save.highestWave + 1}    N NEW RUN`, 320, 316, 14, '#77e4ca', 'center');
    text('S SETTINGS', 320, 348, 14, '#f2c8ba', 'center');
  }
  if (menu === 'game' && game.mode === 'waveBrief') {
    ctx.fillStyle = '#080d20df'; ctx.fillRect(92, 167, 456, 172);
    const brief = WAVE_BRIEFS[game.wave + 1];
    text(brief.title, 320, 208, 22, '#ffe29a', 'center');
    text(brief.line1, 320, 251, 15, brief.color1, 'center');
    text(brief.line2, 320, 280, 15, brief.color2, 'center');
    text(`PRESS ${keyLabel(save.keys.cast)}`, 320, 320, 18, '#f5e6b0', 'center');
  }
  if (menu === 'game' && paused) { ctx.fillStyle = '#080d20cc'; ctx.fillRect(120, 195, 400, 110); text('PAUSED', 320, 245, 30, '#ffe29a', 'center'); text('S SETTINGS', 320, 278, 14, '#9adbe8', 'center'); }
  text('8-WAY LEVER　　ECHO BUTTON　　START', 320, 466, 13, '#f2c8ba', 'center');
  const selectedSetting = settings[settingRow];
  const settingValue = selectedSetting.type === 'volume' ? `${save.volume * 10}%`
    : selectedSetting.type === 'motion' ? (save.reducedMotion ? 'on' : 'off')
      : selectedSetting.type === 'key' ? keyLabel(save.keys[selectedSetting.action]) : '';
  canvas.setAttribute('aria-label', menu === 'settings'
    ? `RINGWARD operator accessibility. ${selectedSetting.label}. ${settingValue}`
    : `RINGWARD ${game.mode}. Score ${game.score}. Chain ${game.chain}. Bell ${game.bell}. ${game.message}`);
}

function persist() {
  storeSave(save);
}

function closeSettings() {
  captureAction = null;
  menu = 'game';
}

function handleSettings(event) {
  event.preventDefault();
  if (captureAction) {
    if (event.code === 'Escape') captureAction = null;
    else if (rebind(save, captureAction, event.code)) { captureAction = null; persist(); }
    return;
  }
  if (event.code === 'Escape' || event.code === 'KeyS') { closeSettings(); return; }
  if (event.code === 'ArrowUp') settingRow = (settingRow + settings.length - 1) % settings.length;
  if (event.code === 'ArrowDown') settingRow = (settingRow + 1) % settings.length;
  const item = settings[settingRow];
  if ((event.code === 'ArrowLeft' || event.code === 'ArrowRight') && item.type === 'volume') {
    save.volume = Math.max(0, Math.min(10, save.volume + (event.code === 'ArrowLeft' ? -1 : 1))); persist();
  } else if ((event.code === 'ArrowLeft' || event.code === 'ArrowRight' || event.code === 'Enter') && item.type === 'motion') {
    save.reducedMotion = !save.reducedMotion; persist();
  } else if (event.code === 'Enter' && item.type === 'key') captureAction = item.action;
  else if (event.code === 'Enter' && item.type === 'back') closeSettings();
}

addEventListener('keydown', event => {
  if (menu === 'settings') { handleSettings(event); return; }
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', ...Object.values(save.keys)].includes(event.code)) event.preventDefault();
  if (event.code === 'KeyS' && (game.mode === 'title' || paused)) { menu = 'settings'; return; }
  if (event.code === 'Enter' && game.mode === 'title') startGame(game, save.highestWave);
  else if (event.code === 'KeyN' && game.mode === 'title') startGame(game, 0);
  else if (event.code === save.keys.cast && game.mode === 'waveBrief') startNextWave(game);
  else if (event.code === 'KeyR' && game.mode !== 'title') { game = createGame(); startGame(game, save.highestWave); paused = false; }
  else if (event.code === 'KeyP' && game.mode === 'playing') paused = !paused;
  else if (!paused && game.mode === 'playing') {
    if (event.code === save.keys.left) movePlayer(game, -1);
    if (event.code === save.keys.right) movePlayer(game, 1);
    if (event.code === save.keys.cast) castHammer(game);
  }
});

function frame(now) {
  const elapsed = Math.min(0.05, (now - previous) / 1000); previous = now;
  const previousMode = game.mode;
  if (!paused && menu === 'game') step(game, elapsed);
  if (previousMode === 'playing' && game.mode === 'waveBrief' && game.wave + 1 > save.highestWave) {
    save.highestWave = game.wave + 1; persist();
  }
  render(); requestAnimationFrame(frame);
}
canvas.focus(); requestAnimationFrame(frame);
