import { HEIGHT, SCALE, TICK_RATE, WIDTH, type GameState, type Point } from '../core/types';
import type { AppScreen, AppState } from '../app/app';

const path = (ctx: CanvasRenderingContext2D, points: Point[]): void => {
  if (points.length === 0) return;
  ctx.beginPath();
  ctx.moveTo(points[0].x / SCALE, points[0].y / SCALE);
  for (const point of points.slice(1)) ctx.lineTo(point.x / SCALE, point.y / SCALE);
};

const diamond = (ctx: CanvasRenderingContext2D, x: number, y: number, radius: number): void => {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x, y + radius);
  ctx.lineTo(x - radius, y);
  ctx.lineTo(x, y - radius);
  ctx.closePath();
};

export const render = (ctx: CanvasRenderingContext2D, state: GameState, paused: boolean): void => {
  const gradient = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  gradient.addColorStop(0, '#071121');
  gradient.addColorStop(0.55, '#11152c');
  gradient.addColorStop(1, '#21162b');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.strokeStyle = '#8ea6bd';
  ctx.lineWidth = 1;
  for (let x = -80; x < WIDTH + 80; x += 80) {
    ctx.beginPath();
    ctx.moveTo(x - (state.tick % 480) / 6, 0);
    ctx.lineTo(x + 160 - (state.tick % 480) / 6, HEIGHT);
    ctx.stroke();
  }
  ctx.restore();

  if (state.candidate) {
    path(ctx, state.candidate.polygon);
    ctx.closePath();
    ctx.fillStyle = 'rgba(122, 244, 255, 0.09)';
    ctx.fill();
    ctx.strokeStyle = `rgba(252, 209, 112, ${0.72 + Math.sin(state.tick / 10) * 0.22})`;
    ctx.lineWidth = 8;
    ctx.setLineDash([20, 10]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  path(ctx, state.trail);
  ctx.strokeStyle = '#67e8f9';
  ctx.shadowColor = '#36d9ff';
  ctx.shadowBlur = 18;
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.shadowBlur = 0;

  for (const enemy of state.enemies) {
    const x = enemy.x / SCALE;
    const y = enemy.y / SCALE;
    const size = { 'eraser-mite': 17, 'bracket-gull': 25, 'margin-skiff': 29, 'folio-hauler': 52 }[enemy.kind];
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = enemy.markedUntil >= state.tick ? '#fcd170' : '#ff8b72';
    ctx.fillStyle = '#241526';
    ctx.lineWidth = enemy.markedUntil >= state.tick ? 6 : 3;
    ctx.beginPath();
    if (enemy.kind === 'eraser-mite') {
      ctx.moveTo(size, 0); ctx.lineTo(-size, -size * .65); ctx.lineTo(-size * .35, 0); ctx.lineTo(-size, size * .65); ctx.closePath();
    } else if (enemy.kind === 'bracket-gull') {
      ctx.moveTo(size, -size); ctx.lineTo(-size * .7, -size); ctx.lineTo(-size, 0); ctx.lineTo(-size * .7, size); ctx.lineTo(size, size);
    } else if (enemy.kind === 'margin-skiff') {
      ctx.moveTo(size, 0); ctx.lineTo(size * .2, -size); ctx.lineTo(-size, -size * .55); ctx.lineTo(-size, size * .55); ctx.lineTo(size * .2, size); ctx.closePath();
    } else {
      ctx.roundRect(-size, -size * .7, size * 2, size * 1.4, 12);
    }
    ctx.fill(); ctx.stroke();
    if (enemy.kind === 'folio-hauler') {
      ctx.fillStyle = '#fcd170';
      ctx.fillRect(size - 4, -15, 9, 30);
      ctx.strokeStyle = '#ff8b72';
      ctx.lineWidth = 7;
      ctx.beginPath(); ctx.moveTo(-size, -size * .55); ctx.lineTo(-size, size * .55); ctx.stroke();
    }
    ctx.restore();
    ctx.fillStyle = '#131725';
    ctx.fillRect(x - size, y + size + 14, size * 2, 7);
    ctx.fillStyle = '#ff8b72';
    ctx.fillRect(x - size, y + size + 14, size * 2 * enemy.health / enemy.maxHealth, 7);
  }

  if (state.boss) {
    const boss = state.boss;
    const x = boss.x / SCALE;
    const y = boss.y / SCALE;
    if (state.tick <= boss.fanWarningUntil) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(boss.fanAngle);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, 850, -0.48, 0.48);
      ctx.closePath();
      ctx.fillStyle = `rgba(255, 107, 92, ${0.08 + Math.abs(Math.sin(state.tick / 7)) * 0.09})`;
      ctx.fill();
      ctx.strokeStyle = '#ff8b72';
      ctx.lineWidth = 3;
      ctx.setLineDash([18, 14]);
      ctx.stroke();
      ctx.restore();
    }
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = '#1d1525';
    ctx.strokeStyle = boss.armorLayers > 0 ? '#f3d69b' : '#67e8f9';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(82, -112); ctx.lineTo(-68, -78); ctx.lineTo(-102, 0);
    ctx.lineTo(-68, 78); ctx.lineTo(82, 112); ctx.lineTo(44, 0); ctx.closePath();
    ctx.fill(); ctx.stroke();
    for (let layer = 0; layer < 3; layer += 1) {
      ctx.strokeStyle = layer < boss.armorLayers ? '#f3d69b' : '#503b4d';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(-12, 0, 44 + layer * 18, -1.15, 1.15);
      ctx.stroke();
    }
    ctx.fillStyle = boss.armorLayers === 0 ? '#67e8f9' : '#ff8b72';
    ctx.beginPath(); ctx.arc(-14, 0, 16, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  for (const bullet of state.bullets) {
    const x = bullet.x / SCALE;
    const y = bullet.y / SCALE;
    if (bullet.kind === 'enemy') {
      ctx.strokeStyle = '#ff745f';
      ctx.fillStyle = '#2b1521';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(x, y, bullet.radius, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    } else {
      ctx.strokeStyle = bullet.annotated ? '#fcd170' : '#a8f7ff';
      ctx.lineWidth = bullet.annotated ? 5 : 3;
      ctx.beginPath(); ctx.moveTo(x - (bullet.annotated ? 16 : 8), y); ctx.lineTo(x + 8, y); ctx.stroke();
    }
  }

  const playerX = state.player.x / SCALE;
  const playerY = state.player.y / SCALE;
  ctx.save();
  ctx.translate(playerX, playerY);
  if (state.player.invulnerableUntil >= state.tick) ctx.globalAlpha = 0.35 + Math.abs(Math.sin(state.tick / 4)) * 0.65;
  ctx.fillStyle = '#dffbff';
  ctx.strokeStyle = '#66e8ff';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(22, 0); ctx.lineTo(-16, -13); ctx.lineTo(-8, 0); ctx.lineTo(-16, 13); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.restore();

  ctx.beginPath();
  ctx.arc(playerX, playerY, 26, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * state.gauge / 100);
  ctx.strokeStyle = state.gauge >= 100 ? '#fcd170' : 'rgba(103,232,249,.45)';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = 'rgba(4, 10, 22, .72)';
  ctx.fillRect(0, 0, WIDTH, 52);
  ctx.fillStyle = '#dceaf0';
  ctx.font = '600 18px system-ui, sans-serif';
  ctx.fillText('PALIMPSEST WAKE  /  STAGE 1: THE ERASED HARBOR', 24, 33);
  ctx.fillStyle = '#f4c36a';
  ctx.fillText(`SCORE ${String(state.score).padStart(7, '0')}`, 1035, 33);
  ctx.fillStyle = '#8ea6bd';
  ctx.font = '600 14px system-ui, sans-serif';
  ctx.fillText(state.boss || state.metrics.boss.defeated ? 'BOSS' : `${Math.min(180, Math.floor(state.tick / TICK_RATE)).toString().padStart(3, '0')} / 180s`, 910, 32);
  for (let i = 0; i < 3; i += 1) {
    ctx.fillStyle = i < state.player.health ? '#a8f7ff' : '#283449';
    diamond(ctx, 650 + i * 26, 27, 8); ctx.fill();
  }
  if (state.boss) {
    const boss = state.boss;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#f5e6c8';
    ctx.font = '700 16px system-ui, sans-serif';
    ctx.fillText(`BLANK BAILIFF  ·  PHASE ${boss.phase}`, WIDTH / 2, 76);
    ctx.fillStyle = '#251927'; ctx.fillRect(430, 87, 420, 10);
    ctx.fillStyle = boss.armorLayers > 0 ? '#f3d69b' : '#67e8f9';
    const ratio = boss.armorLayers > 0 ? ((boss.armorLayers - 1) + Math.max(0, boss.armor) / boss.maxArmor) / 3 : boss.health / boss.maxHealth;
    ctx.fillRect(430, 87, 420 * ratio, 10);
    ctx.textAlign = 'start';
  }
  ctx.fillStyle = '#adc2cf';
  ctx.font = '15px system-ui, sans-serif';
  ctx.fillText('MOVE  WASD / ARROWS', 24, 697);
  ctx.fillText('FIRE  Z / J', 240, 697);
  ctx.fillText('COLLATE  X / K', 365, 697);
  ctx.fillText('RETRACE  C / L', 535, 697);
  ctx.fillText('PAUSE  ESC / P', 705, 697);
  ctx.fillStyle = state.candidate ? '#fcd170' : '#7793a4';
  ctx.fillText(state.candidate ? `LOOP READY  ${Math.round(state.candidate.area)} px²` : `TRACE ${(state.trail.length / TICK_RATE).toFixed(1)}  ·  GAUGE ${state.gauge}`, 995, 697);

  if (paused) {
    ctx.fillStyle = 'rgba(3, 7, 16, .76)';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#f5e6c8';
    ctx.font = '700 54px system-ui, sans-serif';
    ctx.fillText('PAUSED', WIDTH / 2, HEIGHT / 2 - 8);
    ctx.fillStyle = '#a8c5d4';
    ctx.font = '18px system-ui, sans-serif';
    ctx.fillText('ESC / P  to return to the wake', WIDTH / 2, HEIGHT / 2 + 35);
    ctx.textAlign = 'start';
  }
};

const overlay = (ctx: CanvasRenderingContext2D, alpha = 0.88): void => {
  ctx.fillStyle = `rgba(3, 7, 17, ${alpha})`;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.textAlign = 'center';
};

const title = (ctx: CanvasRenderingContext2D, text: string, y: number, size = 56, color = '#f5e6c8'): void => {
  ctx.fillStyle = color;
  ctx.font = `700 ${size}px system-ui, sans-serif`;
  ctx.fillText(text, WIDTH / 2, y);
};

const line = (ctx: CanvasRenderingContext2D, text: string, y: number, color = '#a8c5d4', size = 20): void => {
  ctx.fillStyle = color;
  ctx.font = `${size}px system-ui, sans-serif`;
  ctx.fillText(text, WIDTH / 2, y);
};

const renderScreen = (ctx: CanvasRenderingContext2D, app: AppState, screen: Exclude<AppScreen, 'playing'>): void => {
  overlay(ctx, screen === 'paused' ? 0.76 : 0.9);
  if (screen === 'title') {
    line(ctx, 'A flight written against erasure', 188, '#f4c36a', 18);
    title(ctx, 'PALIMPSEST WAKE', 290, 70);
    line(ctx, 'NEW VOYAGE', 395, '#a8f7ff', 26);
    line(ctx, 'ENTER / N', 428, '#7895a7', 15);
    line(ctx, 'G  GUIDE', 492, '#adc2cf', 19);
    line(ctx, 'v4.0 · VERTICAL SLICE', 650, '#667f91', 14);
  } else if (screen === 'guide') {
    title(ctx, 'HOW TO WRITE THE WAKE', 120, 38);
    line(ctx, 'MOVE', 205, '#f4c36a', 18); line(ctx, 'WASD / ARROWS · your path leaves a short luminous trace', 238);
    line(ctx, 'FIRE', 300, '#f4c36a', 18); line(ctx, 'Z / J · cross your own wake to annotate a shot', 333);
    line(ctx, 'COLLATE', 395, '#f4c36a', 18); line(ctx, 'X / K · close a loop and return the fire caught inside', 428);
    line(ctx, 'RETRACE', 490, '#f4c36a', 18); line(ctx, 'C / L · spend 25 gauge to escape backward along the wake', 523);
    line(ctx, 'ENTER / ESC  RETURN', 625, '#a8f7ff', 18);
  } else if (screen === 'stage-intro') {
    line(ctx, app.checkpointName === 'boss-gate' ? 'CHECKPOINT · THE SEALED LEDGER' : 'STAGE 1', 205, '#f4c36a', 18);
    title(ctx, app.checkpointName === 'boss-gate' ? 'BLANK BAILIFF' : 'THE ERASED HARBOR', 300, 48);
    line(ctx, app.checkpointName === 'boss-gate' ? 'Return its erased fire. Strip the three written seals.' : 'Rewrite a route through the records they tried to erase.', 365);
    line(ctx, 'ENTER  DEPART', 500, '#a8f7ff', 22);
    line(ctx, 'ESC  ABANDON VOYAGE', 548, '#7895a7', 15);
  } else if (screen === 'paused') {
    title(ctx, 'PAUSED', 338, 54);
    line(ctx, 'ESC / P / ENTER  return to the wake', 390);
    line(ctx, 'BACKSPACE  abandon voyage', 430, '#7895a7', 15);
  } else if (screen === 'continue') {
    title(ctx, app.continuesRemaining > 0 ? 'THE WAKE BREAKS' : 'VOYAGE ERASED', 270, 52, '#ffad91');
    line(ctx, app.continuesRemaining > 0 ? `Checkpoint: ${app.checkpointName === 'boss-gate' ? 'THE SEALED LEDGER' : 'HARBOR ENTRY'}` : 'No revision remains.', 340);
    line(ctx, app.continuesRemaining > 0 ? 'ENTER  REVISE FROM CHECKPOINT' : 'ENTER  RETURN TO TITLE', 430, '#a8f7ff', 21);
    if (app.continuesRemaining > 0) line(ctx, 'One revision per stage · health 3 · gauge 50', 475, '#7895a7', 15);
    line(ctx, 'ESC  RETURN TO TITLE', 535, '#7895a7', 15);
  } else if (screen === 'result') {
    line(ctx, 'STAGE 1 COMPLETE', 190, '#f4c36a', 18);
    title(ctx, 'THE HARBOR REMEMBERS', 280, 48);
    line(ctx, `SCORE  ${String(app.game.score).padStart(7, '0')}`, 370, '#a8f7ff', 25);
    line(ctx, `COLLATES ${app.game.metrics.loops}   ·   RETURNED FIRE ${app.game.metrics.captured}`, 414);
    line(ctx, `DAMAGE ${app.game.metrics.damage}   ·   REVISIONS USED ${1 - app.continuesRemaining}`, 450);
    line(ctx, 'ENTER  RETURN TO TITLE', 550, '#a8f7ff', 20);
  }
  ctx.textAlign = 'start';
};

export const renderApp = (ctx: CanvasRenderingContext2D, app: AppState): void => {
  render(ctx, app.game, false);
  if (app.screen !== 'playing') renderScreen(ctx, app, app.screen);
};
