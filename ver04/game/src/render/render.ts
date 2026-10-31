import { HEIGHT, SCALE, TICK_RATE, WIDTH, type GameState, type Point } from '../core/types';
import type { AppScreen, AppState } from '../app/app';
import { drawSprite, visuals } from './visual-assets';

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
  ctx.fillStyle = '#071121';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  if (visuals.far.complete && visuals.far.naturalWidth > 0) {
    const farDrift = (state.tick / 80) % 42;
    ctx.drawImage(visuals.far, -farDrift, 0, WIDTH + 84, HEIGHT);
  }
  if (visuals.mid.complete && visuals.mid.naturalWidth > 0) {
    const midDrift = (state.tick / 34) % 110;
    ctx.save(); ctx.globalAlpha = 0.68;
    ctx.drawImage(visuals.mid, -midDrift, 0, WIDTH + 220, HEIGHT);
    ctx.restore();
  }

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
    ctx.save();
    ctx.clip();
    ctx.globalAlpha = 0.22;
    ctx.strokeStyle = '#fff1bd';
    ctx.lineWidth = 2;
    const scan = state.tick % 22;
    for (let y = -22 + scan; y < HEIGHT; y += 22) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(WIDTH, y); ctx.stroke();
    }
    ctx.restore();
  }

  path(ctx, state.trail);
  ctx.strokeStyle = 'rgba(42, 204, 255, .24)';
  ctx.shadowColor = '#36d9ff';
  ctx.shadowBlur = 22;
  ctx.lineWidth = 13;
  ctx.stroke();
  path(ctx, state.trail);
  ctx.strokeStyle = '#63e9ff';
  ctx.shadowBlur = 10;
  ctx.lineWidth = 5;
  ctx.stroke();
  path(ctx, state.trail);
  ctx.strokeStyle = '#e9fdff';
  ctx.shadowBlur = 0;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.shadowBlur = 0;

  for (const enemy of state.enemies) {
    const x = enemy.x / SCALE;
    const y = enemy.y / SCALE;
    const size = { 'eraser-mite': 17, 'bracket-gull': 25, 'margin-skiff': 29, 'folio-hauler': 52 }[enemy.kind];
    const dimensions = {
      'eraser-mite': [58, 48], 'bracket-gull': [82, 62], 'margin-skiff': [94, 48], 'folio-hauler': [150, 90]
    }[enemy.kind];
    if (enemy.markedUntil >= state.tick) {
      ctx.save(); ctx.shadowColor = '#ffd477'; ctx.shadowBlur = 20;
      drawSprite(ctx, enemy.kind, x, y, dimensions[0], dimensions[1]); ctx.restore();
    } else drawSprite(ctx, enemy.kind, x, y, dimensions[0], dimensions[1]);
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
    drawSprite(ctx, 'boss', x, y, 284, 238, boss.armorLayers > 0 ? 1 : 0.82);
    if (boss.armorLayers === 0) {
      ctx.save(); ctx.strokeStyle = '#a8f7ff'; ctx.shadowColor = '#42e7ff'; ctx.shadowBlur = 24; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.arc(x - 50, y + 18, 28 + Math.sin(state.tick / 8) * 3, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    }
  }

  for (const bullet of state.bullets) {
    const x = bullet.x / SCALE;
    const y = bullet.y / SCALE;
    if (bullet.kind === 'enemy') {
      ctx.strokeStyle = '#ff826f'; ctx.fillStyle = 'rgba(26, 8, 20, .82)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(x, y, bullet.radius + 3, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#ffd1b3'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(x, y, Math.max(2, bullet.radius - 3), 0, Math.PI * 2); ctx.stroke();
    } else if (bullet.kind === 'return') {
      drawSprite(ctx, 'return', x, y, 38, 20);
    } else {
      ctx.strokeStyle = bullet.annotated ? '#fcd170' : '#a8f7ff';
      ctx.lineWidth = bullet.annotated ? 5 : 3;
      ctx.beginPath(); ctx.moveTo(x - (bullet.annotated ? 16 : 8), y); ctx.lineTo(x + 8, y); ctx.stroke();
    }
  }

  const playerX = state.player.x / SCALE;
  const playerY = state.player.y / SCALE;
  const playerAlpha = state.player.invulnerableUntil >= state.tick ? 0.35 + Math.abs(Math.sin(state.tick / 4)) * 0.65 : 1;
  drawSprite(ctx, 'player', playerX, playerY, 74, 54, playerAlpha);

  ctx.beginPath();
  ctx.arc(playerX, playerY, 26, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * state.gauge / 100);
  ctx.strokeStyle = state.gauge >= 100 ? '#fcd170' : 'rgba(103,232,249,.45)';
  ctx.lineWidth = 3;
  ctx.stroke();

  if (visuals.fore.complete && visuals.fore.naturalWidth > 0) {
    const foreDrift = (state.tick / 18) % 160;
    ctx.save(); ctx.globalAlpha = 0.64;
    ctx.drawImage(visuals.fore, -foreDrift, 0, WIDTH + 320, HEIGHT);
    ctx.restore();
  }

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
