import { HEIGHT, SCALE, TICK_RATE, WIDTH, type GameState, type Point } from '../core/types';

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
    const size = enemy.kind === 'hauler' ? 42 : 27;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.PI / 4);
    ctx.strokeStyle = enemy.markedUntil >= state.tick ? '#fcd170' : '#ff8b72';
    ctx.fillStyle = '#241526';
    ctx.lineWidth = enemy.markedUntil >= state.tick ? 6 : 3;
    ctx.fillRect(-size, -size, size * 2, size * 2);
    ctx.strokeRect(-size, -size, size * 2, size * 2);
    ctx.restore();
    ctx.fillStyle = '#131725';
    ctx.fillRect(x - size, y + size + 14, size * 2, 7);
    ctx.fillStyle = '#ff8b72';
    ctx.fillRect(x - size, y + size + 14, size * 2 * enemy.health / enemy.maxHealth, 7);
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
  ctx.fillText('PALIMPSEST WAKE  /  M1 PLAYGROUND', 24, 33);
  ctx.fillStyle = '#f4c36a';
  ctx.fillText(`SCORE ${String(state.score).padStart(7, '0')}`, 1035, 33);
  ctx.fillStyle = '#8ea6bd';
  ctx.font = '600 14px system-ui, sans-serif';
  ctx.fillText(`${Math.min(180, Math.floor(state.tick / TICK_RATE)).toString().padStart(3, '0')} / 180s`, 910, 32);
  for (let i = 0; i < 3; i += 1) {
    ctx.fillStyle = i < state.player.health ? '#a8f7ff' : '#283449';
    diamond(ctx, 650 + i * 26, 27, 8); ctx.fill();
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
