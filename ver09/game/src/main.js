import './style.css';
import {
  COLS,
  LEVELS,
  MAX_FUEL,
  PHOSPHOR_TICKS,
  ROWS,
  activeMirrorBeams,
  activePhosphors,
  advanceRoom,
  collectedCount,
  createGame,
  directLightDistance,
  isBright,
  isExitOpen,
  isPointLit,
  isWall,
  levelFor,
  movePlayer,
  retryGame,
  setBright,
  startGame,
  tickGame,
  togglePause
} from './model.js';

const canvas = document.querySelector('#game');
const ctx = canvas.getContext('2d');
const live = document.querySelector('#live');

const BOARD = { x: 256, y: 104, cell: 48 };
const COLORS = {
  ink: '#080912',
  deep: '#11101d',
  floor: '#252238',
  floorLit: '#40354a',
  brass: '#b8894d',
  wax: '#f4c765',
  flame: '#fff3bd',
  ember: '#e86e46',
  mint: '#8be0bf',
  smoke: '#9c91b2',
  paper: '#e9dfc5'
};

let game = createGame();
let audioContext = null;
let lastAnnounced = '';

function tone(frequency, duration = 0.08, type = 'sine', gain = 0.035, delay = 0) {
  try {
    audioContext ??= new AudioContext();
    const oscillator = audioContext.createOscillator();
    const volume = audioContext.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    volume.gain.setValueAtTime(0, audioContext.currentTime + delay);
    volume.gain.linearRampToValueAtTime(gain, audioContext.currentTime + delay + 0.01);
    volume.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + delay + duration);
    oscillator.connect(volume).connect(audioContext.destination);
    oscillator.start(audioContext.currentTime + delay);
    oscillator.stop(audioContext.currentTime + delay + duration + 0.02);
  } catch {
    // Audio is optional; visual state remains authoritative.
  }
}

function react(previous, next) {
  if (next.event === previous.event && next.phase === previous.phase) return;
  const messages = {
    seed: `Star-seed gathered. ${collectedCount(next)} of 3.`,
    hit: `The ash warden found you. ${next.lives} embers remain.`,
    empty: 'Lamp oil empty. The light folds shut.',
    won: `All star-seeds returned. Room ${next.levelIndex + 1} restored.`,
    lost: 'Your last ember is out.',
    pause: 'Paused.',
    resume: 'Resumed.'
  };
  if (messages[next.event] && messages[next.event] !== lastAnnounced) {
    live.textContent = messages[next.event];
    lastAnnounced = messages[next.event];
  }
  if (next.event === 'light-up') tone(330, 0.12, 'sine', 0.025);
  if (next.event === 'seed') {
    tone(523, 0.12, 'triangle');
    tone(659, 0.12, 'triangle', 0.035, 0.08);
    tone(784, 0.18, 'triangle', 0.035, 0.16);
  }
  if (next.event === 'hit') tone(96, 0.3, 'sawtooth', 0.045);
  if (next.event === 'won') {
    tone(392, 0.3, 'triangle');
    tone(587, 0.5, 'triangle', 0.04, 0.12);
  }
}

function commit(next) {
  const previous = game;
  game = next;
  react(previous, game);
  syncAccessibility();
}

function syncAccessibility() {
  const phaseText = {
    title: 'CANDLEWICK title. Press Enter to begin.',
    paused: 'CANDLEWICK paused. Press Escape to resume.',
    won: game.levelIndex + 1 < LEVELS.length
      ? `Room restored. Press Enter to enter room ${game.levelIndex + 2}, or R to retry.`
      : 'All available rooms restored. Press Enter to return to the title or R to retry.',
    lost: 'All embers lost. Press R to retry.',
    playing: `${isBright(game) ? 'Bright lamp, warden pursuing' : 'Dim lamp, warden patrolling'}. ${collectedCount(game)} of 3 star-seeds, ${game.lives} embers, oil ${game.fuel} of ${MAX_FUEL}.`
  };
  canvas.setAttribute('aria-label', phaseText[game.phase]);
  canvas.dataset.phase = game.phase;
  canvas.dataset.light = isBright(game) ? 'bright' : 'dim';
  canvas.dataset.fuel = String(game.fuel);
  canvas.dataset.seeds = String(collectedCount(game));
  canvas.dataset.lives = String(game.lives);
  canvas.dataset.player = `${game.player.x},${game.player.y}`;
  canvas.dataset.warden = `${game.warden.x},${game.warden.y}`;
  canvas.dataset.event = game.event;
  canvas.dataset.level = String(game.levelIndex + 1);
  canvas.dataset.mirror = activeMirrorBeams(game).length > 0 ? 'active' : 'idle';
  canvas.dataset.phosphor = String(activePhosphors(game).length);
  canvas.dataset.afterglow = String(Math.max(0, ...activePhosphors(game).map((tile) => tile.charge)));
}

function pathRoundedRect(x, y, width, height, radius) {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
}

function text(value, x, y, size, color = COLORS.paper, align = 'left', weight = 500) {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px ui-monospace, SFMono-Regular, Menlo, monospace`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(value, x, y);
}

function drawBackground(now) {
  const gradient = ctx.createRadialGradient(640, 320, 20, 640, 360, 720);
  gradient.addColorStop(0, '#211a2b');
  gradient.addColorStop(0.55, '#0d0d18');
  gradient.addColorStop(1, '#05060b');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.globalAlpha = 0.2;
  for (let index = 0; index < 55; index += 1) {
    const x = (index * 193 + 41) % 1280;
    const y = (index * 97 + 53) % 720;
    const pulse = 0.8 + Math.sin(now / 900 + index) * 0.2;
    ctx.fillStyle = index % 4 === 0 ? COLORS.wax : COLORS.smoke;
    ctx.fillRect(x, y, pulse * 2, pulse * 2);
  }
  ctx.globalAlpha = 1;
}

function drawTitle(now) {
  const breath = 1 + Math.sin(now / 700) * 0.035;
  ctx.save();
  ctx.translate(640, 250);
  ctx.scale(breath, breath);
  ctx.beginPath();
  ctx.moveTo(0, -72);
  ctx.bezierCurveTo(62, -5, 48, 68, 0, 90);
  ctx.bezierCurveTo(-48, 68, -62, -5, 0, -72);
  ctx.fillStyle = 'rgba(244,199,101,0.12)';
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(0, -42);
  ctx.bezierCurveTo(30, 2, 22, 46, 0, 56);
  ctx.bezierCurveTo(-22, 46, -30, 2, 0, -42);
  ctx.fillStyle = COLORS.wax;
  ctx.shadowColor = COLORS.wax;
  ctx.shadowBlur = 32;
  ctx.fill();
  ctx.restore();
  text('C A N D L E W I C K', 640, 384, 42, COLORS.paper, 'center', 700);
  text('THE BRIGHTER YOU BURN, THE CLOSER IT COMES', 640, 434, 15, COLORS.smoke, 'center', 600);
  text('PRESS ENTER', 640, 522, 20, COLORS.wax, 'center', 700);
  text('ARROWS / WASD  MOVE     HOLD SPACE  REVEAL     ESC  PAUSE', 640, 654, 13, '#81778f', 'center');
}

function cellCenter(point) {
  return {
    x: BOARD.x + point.x * BOARD.cell + BOARD.cell / 2,
    y: BOARD.y + point.y * BOARD.cell + BOARD.cell / 2
  };
}

function lightDistance(point) {
  return directLightDistance(game, point);
}

function drawFloor(now) {
  pathRoundedRect(BOARD.x - 10, BOARD.y - 10, COLS * BOARD.cell + 20, ROWS * BOARD.cell + 20, 18);
  ctx.fillStyle = '#161322';
  ctx.fill();
  ctx.strokeStyle = '#6c5135';
  ctx.lineWidth = 3;
  ctx.stroke();

  const radius = isBright(game) ? 5.4 : 2.35;
  for (let y = 0; y < ROWS; y += 1) {
    for (let x = 0; x < COLS; x += 1) {
      const point = { x, y };
      const distance = lightDistance(point);
      const seen = isPointLit(game, point);
      const px = BOARD.x + x * BOARD.cell;
      const py = BOARD.y + y * BOARD.cell;
      if (isWall(point, game)) {
        ctx.fillStyle = seen ? '#4b4050' : '#171622';
        ctx.fillRect(px + 2, py + 2, BOARD.cell - 4, BOARD.cell - 4);
        if (seen) {
          ctx.strokeStyle = 'rgba(232,214,182,0.16)';
          ctx.strokeRect(px + 7, py + 7, BOARD.cell - 14, BOARD.cell - 14);
        }
      } else {
        const light = Math.max(0, 1 - distance / (radius + 0.8));
        ctx.fillStyle = seen ? `rgba(74,59,76,${0.38 + light * 0.5})` : COLORS.deep;
        ctx.fillRect(px + 1, py + 1, BOARD.cell - 2, BOARD.cell - 2);
        if (seen) {
          ctx.fillStyle = `rgba(244,199,101,${0.025 + light * 0.08})`;
          ctx.beginPath();
          ctx.arc(px + 24, py + 24, 15 + Math.sin(now / 500 + x + y) * 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  const player = cellCenter(game.player);
  const glow = ctx.createRadialGradient(player.x, player.y, 12, player.x, player.y, radius * BOARD.cell);
  glow.addColorStop(0, isBright(game) ? 'rgba(255,232,158,0.32)' : 'rgba(255,219,127,0.18)');
  glow.addColorStop(0.55, 'rgba(244,199,101,0.07)');
  glow.addColorStop(1, 'rgba(244,199,101,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(BOARD.x, BOARD.y, COLS * BOARD.cell, ROWS * BOARD.cell);
}

function drawMirrors(now) {
  const level = levelFor(game);
  const beams = activeMirrorBeams(game);
  for (const beam of beams) {
    const start = cellCenter(beam.mirror);
    const last = beam.cells.at(-1);
    if (last) {
      const end = cellCenter(last);
      ctx.save();
      ctx.strokeStyle = 'rgba(139,224,191,0.68)';
      ctx.shadowColor = COLORS.mint;
      ctx.shadowBlur = 13;
      ctx.lineWidth = 5;
      ctx.setLineDash([10, 7]);
      ctx.lineDashOffset = -now / 45;
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
      ctx.restore();
    }
  }
  for (const mirror of level.mirrors) {
    if (!isPointLit(game, mirror)) continue;
    const center = cellCenter(mirror);
    const active = beams.some((beam) => beam.mirror === mirror);
    ctx.save();
    ctx.translate(center.x, center.y);
    ctx.rotate(Math.atan2(mirror.dy, mirror.dx) + Math.PI / 2);
    ctx.fillStyle = active ? COLORS.mint : '#6a6075';
    ctx.strokeStyle = active ? COLORS.flame : COLORS.smoke;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-17, 12);
    ctx.lineTo(0, -17);
    ctx.lineTo(17, 12);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}

function drawPhosphors(now) {
  for (const tile of game.phosphors) {
    const visible = isPointLit(game, tile) || tile.charge > 0;
    if (!visible) continue;
    const center = cellCenter(tile);
    const charged = tile.charge > 0;
    const strength = tile.charge / PHOSPHOR_TICKS;
    ctx.save();
    ctx.translate(center.x, center.y);
    ctx.strokeStyle = charged ? `rgba(139,224,191,${0.5 + strength * 0.5})` : '#665d70';
    ctx.fillStyle = charged ? `rgba(139,224,191,${0.12 + strength * 0.22})` : 'rgba(102,93,112,0.12)';
    ctx.shadowColor = COLORS.mint;
    ctx.shadowBlur = charged ? 10 + strength * 16 : 0;
    ctx.lineWidth = 2;
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-11, -11, 22, 22);
    ctx.strokeRect(-11, -11, 22, 22);
    ctx.rotate(-Math.PI / 4);
    if (charged) {
      ctx.globalAlpha = 0.35 + Math.sin(now / 260 + tile.x + tile.y) * 0.12;
      ctx.fillStyle = COLORS.flame;
      ctx.beginPath();
      ctx.arc(0, 0, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

function drawSeed(seed, now) {
  if (seed.collected || !isBright(game) || !isPointLit(game, seed)) return;
  const point = cellCenter(seed);
  ctx.save();
  ctx.translate(point.x, point.y);
  ctx.rotate(now / 1200);
  ctx.strokeStyle = COLORS.mint;
  ctx.fillStyle = 'rgba(139,224,191,0.16)';
  ctx.lineWidth = 3;
  for (let turn = 0; turn < 3; turn += 1) {
    ctx.rotate((Math.PI * 2) / 3);
    ctx.beginPath();
    ctx.ellipse(0, -12, 7, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.fillStyle = COLORS.flame;
  ctx.beginPath();
  ctx.arc(0, 0, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawExit(now) {
  const exit = levelFor(game).exit;
  const point = cellCenter(exit);
  const open = isExitOpen(game);
  const visible = isPointLit(game, exit);
  if (!visible) return;
  ctx.save();
  ctx.translate(point.x, point.y);
  ctx.strokeStyle = open ? COLORS.mint : COLORS.brass;
  ctx.lineWidth = 4;
  ctx.strokeRect(-17, -20, 34, 40);
  const remaining = 3 - collectedCount(game);
  for (let index = 0; index < remaining; index += 1) {
    ctx.beginPath();
    ctx.moveTo(-10 + index * 10, -17);
    ctx.lineTo(-10 + index * 10, 17);
    ctx.stroke();
  }
  if (open) {
    ctx.globalAlpha = 0.6 + Math.sin(now / 240) * 0.25;
    ctx.fillStyle = COLORS.mint;
    ctx.fillRect(-10, -14, 20, 28);
  }
  ctx.restore();
}

function drawWarden(now) {
  const point = cellCenter(game.warden);
  const visible = isPointLit(game, game.warden);
  if (!visible) {
    const dx = game.warden.x - game.player.x;
    const dy = game.warden.y - game.player.y;
    const angle = Math.atan2(dy, dx);
    const player = cellCenter(game.player);
    ctx.save();
    ctx.translate(player.x + Math.cos(angle) * 92, player.y + Math.sin(angle) * 92);
    ctx.rotate(angle + Math.PI / 2);
    ctx.fillStyle = 'rgba(156,145,178,0.52)';
    ctx.beginPath();
    ctx.moveTo(0, -9);
    ctx.lineTo(9, 9);
    ctx.lineTo(0, 4);
    ctx.lineTo(-9, 9);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    return;
  }
  ctx.save();
  ctx.translate(point.x, point.y + Math.sin(now / 230) * 2);
  ctx.fillStyle = isBright(game) ? 'rgba(213,91,78,0.34)' : 'rgba(133,119,154,0.3)';
  ctx.beginPath();
  ctx.ellipse(0, 2, 17, 25, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = isBright(game) ? '#ef7967' : COLORS.smoke;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = isBright(game) ? COLORS.flame : '#c9bed6';
  ctx.beginPath();
  if (isBright(game)) {
    ctx.moveTo(0, -9);
    ctx.lineTo(8, 0);
    ctx.lineTo(0, 8);
    ctx.lineTo(-8, 0);
  } else {
    ctx.ellipse(0, 0, 7, 4, 0, 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.restore();
}

function drawPlayer(now) {
  const point = cellCenter(game.player);
  const size = isBright(game) ? 22 : 17;
  ctx.save();
  ctx.translate(point.x, point.y + Math.sin(now / 190) * 1.4);
  ctx.shadowColor = COLORS.wax;
  ctx.shadowBlur = isBright(game) ? 28 : 14;
  ctx.fillStyle = COLORS.wax;
  ctx.beginPath();
  for (let index = 0; index < 6; index += 1) {
    const angle = Math.PI / 6 + index * Math.PI / 3;
    const x = Math.cos(angle) * size;
    const y = Math.sin(angle) * size;
    if (index === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = COLORS.deep;
  ctx.fillRect(-3, -10, 6, 17);
  ctx.fillStyle = COLORS.flame;
  ctx.beginPath();
  ctx.moveTo(0, -17);
  ctx.quadraticCurveTo(10, -6, 0, 3);
  ctx.quadraticCurveTo(-10, -6, 0, -17);
  ctx.fill();
  ctx.restore();
}

function drawHud() {
  const level = levelFor(game);
  text(`GLASSHOUSE 0${game.levelIndex + 1}`, 72, 118, 15, COLORS.brass, 'left', 700);
  text(level.name, 72, 145, 11, COLORS.paper, 'left', 700);
  text(isBright(game) ? 'WARDEN: HUNTING' : 'WARDEN: LISTENING', 72, 174, 13, isBright(game) ? '#ef7967' : COLORS.smoke, 'left', 700);
  text('LAMP OIL', 72, 222, 12, COLORS.smoke, 'left', 700);
  ctx.fillStyle = '#25202e';
  ctx.fillRect(72, 242, 128, 12);
  ctx.fillStyle = game.fuel < 7 ? COLORS.ember : COLORS.wax;
  ctx.fillRect(72, 242, 128 * (game.fuel / MAX_FUEL), 12);
  text(`${game.fuel} / ${MAX_FUEL}`, 72, 278, 13, COLORS.paper);

  text('STAR-SEEDS', 1092, 132, 12, COLORS.smoke, 'left', 700);
  for (let index = 0; index < 3; index += 1) {
    ctx.strokeStyle = index < collectedCount(game) ? COLORS.mint : '#4b4355';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(1104 + index * 36, 164, 10, 0, Math.PI * 2);
    ctx.stroke();
  }
  text('EMBERS', 1092, 222, 12, COLORS.smoke, 'left', 700);
  for (let index = 0; index < 3; index += 1) {
    ctx.fillStyle = index < game.lives ? COLORS.ember : '#332b38';
    ctx.beginPath();
    ctx.moveTo(1103 + index * 32, 242);
    ctx.quadraticCurveTo(1115 + index * 32, 256, 1103 + index * 32, 267);
    ctx.quadraticCurveTo(1091 + index * 32, 256, 1103 + index * 32, 242);
    ctx.fill();
  }
  text(isExitOpen(game) ? 'GATE OPEN' : 'FIND ALL THREE', 1092, 320, 13, isExitOpen(game) ? COLORS.mint : COLORS.brass, 'left', 700);
  text('HOLD SPACE', 1092, 390, 13, COLORS.wax, 'left', 700);
  text('TO REVEAL', 1092, 412, 13, COLORS.paper, 'left', 700);
  text('RELEASE', 1092, 452, 13, COLORS.smoke, 'left', 700);
  text('TO HIDE', 1092, 474, 13, COLORS.paper, 'left', 700);
  if (level.mirrors.length > 0) {
    text('PRISM', 1092, 520, 12, COLORS.mint, 'left', 700);
    text(activeMirrorBeams(game).length > 0 ? 'BEAM TURNED' : 'LIGHT THE GLASS', 1092, 542, 12, COLORS.paper, 'left', 700);
  }
  if (level.phosphors.length > 0) {
    const glow = Math.max(0, ...activePhosphors(game).map((tile) => tile.charge));
    text('PHOSPHOR', 1092, 520, 12, COLORS.mint, 'left', 700);
    text(glow > 0 ? `AFTERGLOW ${Math.ceil(glow / 8)}` : 'PAINT WITH LIGHT', 1092, 542, 12, COLORS.paper, 'left', 700);
  }
  text('ESC PAUSE  ·  R RETRY', 640, 650, 13, '#81778f', 'center');
}

function drawOverlay(title, subtitle, accent = COLORS.wax) {
  ctx.fillStyle = 'rgba(5,6,11,0.78)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  pathRoundedRect(378, 245, 524, 230, 20);
  ctx.fillStyle = '#151321';
  ctx.fill();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2;
  ctx.stroke();
  text(title, 640, 320, 34, accent, 'center', 800);
  text(subtitle, 640, 374, 15, COLORS.paper, 'center', 600);
  let action = 'R  TRY AGAIN';
  if (game.phase === 'paused') action = 'ESC  RESUME';
  if (game.phase === 'won') {
    action = game.levelIndex + 1 < LEVELS.length ? 'ENTER  NEXT ROOM   ·   R  RETRY' : 'ENTER  TITLE   ·   R  RETRY';
  }
  text(action, 640, 430, 14, COLORS.smoke, 'center', 700);
}

function render(now) {
  drawBackground(now);
  if (game.phase === 'title') {
    drawTitle(now);
  } else {
    drawFloor(now);
    drawMirrors(now);
    drawPhosphors(now);
    game.seeds.forEach((seed) => drawSeed(seed, now));
    drawExit(now);
    drawWarden(now);
    drawPlayer(now);
    drawHud();
    if (game.phase === 'paused') drawOverlay('FLAME HELD', 'The room waits in the dark.', COLORS.wax);
    if (game.phase === 'won') {
      const finalRoom = game.levelIndex + 1 === LEVELS.length;
      drawOverlay(
        finalRoom ? 'THREE ROOMS KINDLED' : 'GLASSHOUSE WAKES',
        finalRoom ? 'The walls remember where your flame has been.' : 'Three small stars answer the dawn.',
        COLORS.mint
      );
    }
    if (game.phase === 'lost') drawOverlay('LAST EMBER OUT', 'The ash keeps this room—for now.', COLORS.ember);
  }
  requestAnimationFrame(render);
}

const directions = new Map([
  ['ArrowUp', [0, -1]], ['KeyW', [0, -1]],
  ['ArrowDown', [0, 1]], ['KeyS', [0, 1]],
  ['ArrowLeft', [-1, 0]], ['KeyA', [-1, 0]],
  ['ArrowRight', [1, 0]], ['KeyD', [1, 0]]
]);

window.addEventListener('keydown', (event) => {
  if (directions.has(event.code) || ['Space', 'Enter', 'Escape', 'KeyR'].includes(event.code)) event.preventDefault();
  if (event.repeat && event.code !== 'Space') return;

  if (event.code === 'Enter') {
    if (game.phase === 'title') commit(startGame(game));
    else if (game.phase === 'won') commit(advanceRoom(game));
    canvas.focus();
    return;
  }
  if (event.code === 'KeyR' && game.phase !== 'title') {
    commit(retryGame(game));
    return;
  }
  if (event.code === 'Escape') {
    commit(togglePause(game));
    return;
  }
  if (event.code === 'Space' && !event.repeat) {
    commit(setBright(game, true));
    return;
  }
  const direction = directions.get(event.code);
  if (direction) commit(movePlayer(game, direction[0], direction[1]));
});

window.addEventListener('keyup', (event) => {
  if (event.code === 'Space') commit(setBright(game, false));
});

window.addEventListener('blur', () => {
  if (game.phase === 'playing') commit(setBright(game, false));
});

setInterval(() => commit(tickGame(game)), 125);
window.__candlewick = { getState: () => structuredClone(game) };
syncAccessibility();
requestAnimationFrame(render);
