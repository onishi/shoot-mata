import { HEIGHT, SCALE, TICK_RATE, WIDTH, type GameState, type Point } from '../core/types';
import type { AppScreen, AppState } from '../app/app';
import { ADVOCATE_WALL_X_PX, eelSegmentPoint } from '../simulation/game';
import { STAGE_04_COOLING_RADIUS_PX, stageFourCoolingCenter } from '../content/stage-04';
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
  const stageVisuals = visuals[state.stageId];
  ctx.fillStyle = '#071121';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  if (stageVisuals?.far.complete && stageVisuals.far.naturalWidth > 0) {
    const farDrift = (state.tick / 80) % 42;
    ctx.drawImage(stageVisuals.far, -farDrift, 0, WIDTH + 84, HEIGHT);
  }
  if (stageVisuals?.mid.complete && stageVisuals.mid.naturalWidth > 0) {
    const midDrift = (state.tick / 34) % 110;
    ctx.save(); ctx.globalAlpha = 0.68;
    ctx.drawImage(stageVisuals.mid, -midDrift, 0, WIDTH + 220, HEIGHT);
    ctx.restore();
  }

  if (state.stageId === 'stage-02') {
    const compiler = state.boss?.kind === 'crosswind-compiler' ? state.boss : null;
    const wind = compiler && compiler.windLockedUntil >= state.tick
      ? compiler.lockedWindDirection
      : (Math.floor(state.tick / (6 * TICK_RATE)) % 2 === 0 ? 1 : -1);
    ctx.save();
    ctx.strokeStyle = compiler && compiler.windLockedUntil >= state.tick ? 'rgba(252,209,112,.64)' : 'rgba(213,251,255,.4)';
    ctx.lineWidth = 2;
    for (let index = 0; index < 18; index += 1) {
      const span = WIDTH + 240;
      const x = ((index * 173 + state.tick * wind * (1.5 + index % 3)) % span + span) % span - 120;
      const y = 82 + (index * 107) % 550;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x - wind * 24, y + Math.sin((state.tick + index * 31) / 24) * 7, x - wind * (54 + index % 4 * 12), y);
      ctx.stroke();
    }
    ctx.restore();
  }
  if (state.stageId === 'stage-03') {
    ctx.strokeStyle = 'rgba(190,230,244,.44)'; ctx.lineWidth = 2;
    for (let index = 0; index < 48; index += 1) {
      const x = (90 + ((Math.floor(state.tick / 18) - index) * 353) % 1100 + 1100) % 1100;
      const y = ((state.tick - index * 18) * 5) % (HEIGHT + 80) - 40;
      ctx.beginPath(); ctx.moveTo(x, y - 14); ctx.lineTo(x - 3, y + 8); ctx.stroke();
    }
  }
  if (state.stageId === 'stage-04') {
    const cooling = stageFourCoolingCenter(state.tick);
    const heat = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
    heat.addColorStop(0, 'rgba(87,31,16,.42)'); heat.addColorStop(0.55, 'rgba(34,15,13,.12)'); heat.addColorStop(1, 'rgba(184,61,20,.34)');
    ctx.fillStyle = heat; ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.save(); ctx.strokeStyle = 'rgba(255,133,62,.25)'; ctx.lineWidth = 2;
    for (let y = 95; y < HEIGHT; y += 58) {
      ctx.beginPath();
      for (let x = 0; x <= WIDTH; x += 32) {
        const waveY = y + Math.sin((x + state.tick * 2) / 75) * 7;
        if (x === 0) ctx.moveTo(x, waveY); else ctx.lineTo(x, waveY);
      }
      ctx.stroke();
    }
    if (state.boss?.kind !== 'cinder-advocate') {
      ctx.fillStyle = 'rgba(85,230,232,.1)'; ctx.strokeStyle = 'rgba(151,255,255,.72)'; ctx.lineWidth = 3; ctx.setLineDash([14, 9]);
      ctx.beginPath(); ctx.arc(cooling.x, cooling.y, STAGE_04_COOLING_RADIUS_PX, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = '#b9ffff'; ctx.font = '700 13px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('COOLING SHADOW', cooling.x, cooling.y - STAGE_04_COOLING_RADIUS_PX - 10); ctx.textAlign = 'start';
    }
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
  const wetTrail = state.trail.filter((point) => (point.wetUntil ?? 0) >= state.tick);
  path(ctx, wetTrail);
  ctx.strokeStyle = 'rgba(126,255,213,.9)'; ctx.shadowColor = '#55f0cf'; ctx.shadowBlur = 15; ctx.lineWidth = 7; ctx.stroke(); ctx.shadowBlur = 0;
  const cooledTrail = state.trail.filter((point) => (point.cooledUntil ?? 0) >= state.tick);
  path(ctx, cooledTrail);
  ctx.strokeStyle = 'rgba(176,255,255,.92)'; ctx.shadowColor = '#71f4ff'; ctx.shadowBlur = 18; ctx.lineWidth = 8; ctx.setLineDash([10, 6]); ctx.stroke(); ctx.setLineDash([]); ctx.shadowBlur = 0;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.shadowBlur = 0;

  for (const enemy of state.enemies) {
    const x = enemy.x / SCALE;
    const y = enemy.y / SCALE;
    const size = state.stageId === 'stage-01'
      ? { 'eraser-mite': 17, 'bracket-gull': 25, 'margin-skiff': 29, 'folio-hauler': 52 }[enemy.kind as 'eraser-mite' | 'bracket-gull' | 'margin-skiff' | 'folio-hauler']
      : enemy.radius;
    if (state.stageId === 'stage-01') {
      const kind = enemy.kind as 'eraser-mite' | 'bracket-gull' | 'margin-skiff' | 'folio-hauler';
      const dimensions = {
        'eraser-mite': [58, 48], 'bracket-gull': [82, 62], 'margin-skiff': [94, 48], 'folio-hauler': [150, 90]
      }[kind];
      if (enemy.markedUntil >= state.tick) {
        ctx.save(); ctx.shadowColor = '#ffd477'; ctx.shadowBlur = 20;
        drawSprite(ctx, kind, x, y, dimensions[0], dimensions[1]); ctx.restore();
      } else drawSprite(ctx, kind, x, y, dimensions[0], dimensions[1]);
    } else if (state.stageId === 'stage-02') {
      const kind = enemy.kind as 'index-kite' | 'vane-scribe' | 'cross-reference-pair' | 'tab-binder';
      const dimensions = {
        'index-kite': [82, 52], 'vane-scribe': [76, 70], 'cross-reference-pair': [94, 62], 'tab-binder': [160, 96]
      }[kind];
      if (enemy.markedUntil >= state.tick) {
        ctx.save(); ctx.shadowColor = '#ffd477'; ctx.shadowBlur = 20;
        drawSprite(ctx, kind, x, y, dimensions[0], dimensions[1]); ctx.restore();
      } else drawSprite(ctx, kind, x, y, dimensions[0], dimensions[1]);
    } else if (state.stageId === 'stage-03') {
      const kind = enemy.kind as 'drip-scribe' | 'gutter-frog' | 'basin-bell' | 'reed-needle';
      const dimensions = {
        'drip-scribe': [62, 76], 'gutter-frog': [96, 66], 'basin-bell': [156, 110], 'reed-needle': [126, 58]
      }[kind];
      if (enemy.markedUntil >= state.tick) {
        ctx.save(); ctx.shadowColor = '#ffe38a'; ctx.shadowBlur = 22;
        drawSprite(ctx, kind, x, y, dimensions[0], dimensions[1]); ctx.restore();
      } else drawSprite(ctx, kind, x, y, dimensions[0], dimensions[1]);
    } else {
      const kind = enemy.kind as 'ash-comma' | 'kiln-censor' | 'ember-courier' | 'char-press';
      const dimensions = {
        'ash-comma': [62, 70], 'kiln-censor': [92, 82], 'ember-courier': [104, 72], 'char-press': [170, 104]
      }[kind];
      ctx.save();
      if (enemy.markedUntil >= state.tick) { ctx.shadowColor = '#ffe58b'; ctx.shadowBlur = 22; }
      drawSprite(ctx, kind, x, y, dimensions[0], dimensions[1]);
      ctx.restore();
    }
    ctx.fillStyle = '#131725';
    ctx.fillRect(x - size, y + size + 14, size * 2, 7);
    ctx.fillStyle = '#ff8b72';
    ctx.fillRect(x - size, y + size + 14, size * 2 * enemy.health / enemy.maxHealth, 7);
  }

  if (state.boss) {
    const boss = state.boss;
    const x = boss.x / SCALE;
    const y = boss.y / SCALE;
    if (boss.kind === 'blank-bailiff' && state.tick <= boss.fanWarningUntil) {
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
    if (boss.kind === 'blank-bailiff') drawSprite(ctx, 'boss', x, y, 284, 238, boss.armorLayers > 0 ? 1 : 0.82);
    else if (boss.kind === 'crosswind-compiler') {
      const vaneY = y + boss.vaneSide * 108;
      const seamY = y - boss.vaneSide * 108;
      drawSprite(ctx, 'compiler', x, y, 320, 232, 1, boss.vaneSide < 0);
      ctx.save();
      ctx.shadowColor = '#ffe16b';
      ctx.shadowBlur = boss.seamExposedUntil >= state.tick ? 30 : 2;
      drawSprite(ctx, 'compiler-seam', x - 108, seamY, 62 + Math.sin(state.tick / 7) * 4, 62 + Math.sin(state.tick / 7) * 4, boss.seamExposedUntil >= state.tick ? 1 : 0.35);
      ctx.restore();
      if (boss.windLockedUntil >= state.tick) {
        ctx.fillStyle = 'rgba(252, 209, 112, .88)'; ctx.font = '700 13px system-ui, sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(`WIND INDEX LOCKED  ${Math.ceil((boss.windLockedUntil - state.tick) / TICK_RATE)}s`, x - 25, Math.min(vaneY, seamY) - 36); ctx.textAlign = 'start';
      }
    } else if (boss.kind === 'lacuna-eel') {
      const segments = ([0, 1, 2] as const).map((segment) => eelSegmentPoint(boss, state.tick, segment));
      ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(x + 35, y);
      for (const point of segments) ctx.lineTo(point.x / SCALE, point.y / SCALE);
      ctx.strokeStyle = 'rgba(5,19,27,.9)'; ctx.lineWidth = 58; ctx.stroke();
      ctx.strokeStyle = 'rgba(135,214,204,.5)'; ctx.lineWidth = 3; ctx.stroke();
      drawSprite(ctx, 'eel-head', x + 48, y, 210, 150);
      for (const [index, point] of segments.entries()) {
        const active = index === boss.activeSegment;
        const marked = active && boss.segmentMarkedUntil >= state.tick;
        ctx.shadowColor = marked ? '#ffe27a' : '#6fffe0'; ctx.shadowBlur = active ? (marked ? 30 : 16) : 2;
        drawSprite(ctx, marked ? 'eel-segment-marked' : 'eel-segment', point.x / SCALE, point.y / SCALE, active ? 162 : 145, active ? 104 : 92, active ? 1 : 0.72);
        if (active) {
          ctx.strokeStyle = marked ? '#ffe69b' : '#d9fff7'; ctx.lineWidth = marked ? 4 : 2;
          ctx.setLineDash(marked ? [3, 7] : [14, 7]);
          ctx.beginPath(); ctx.ellipse(point.x / SCALE, point.y / SCALE, 70, 47, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
        }
      }
      if (boss.segmentMarkedUntil >= state.tick) {
        const active = segments[boss.activeSegment]; ctx.fillStyle = '#ffeaa0'; ctx.font = '700 13px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`WET SEAL  ${Math.ceil((boss.segmentMarkedUntil - state.tick) / TICK_RATE)}s`, active.x / SCALE, active.y / SCALE - 60);
      }
      ctx.textAlign = 'start'; ctx.restore();
    } else {
      ctx.save();
      const pulse = 0.72 + Math.abs(Math.sin(state.tick / 9)) * 0.28;
      ctx.globalAlpha = pulse;
      ctx.shadowColor = '#ff5b28'; ctx.shadowBlur = 28;
      drawSprite(ctx, 'heat-wall', ADVOCATE_WALL_X_PX, 363, 92, 574);
      ctx.globalAlpha = 1; ctx.shadowBlur = 18;
      drawSprite(ctx, 'cinder-advocate', x, y, 300, 292);
      ctx.restore();
    }
    if (boss.kind === 'blank-bailiff' && boss.armorLayers === 0) {
      ctx.save(); ctx.strokeStyle = '#a8f7ff'; ctx.shadowColor = '#42e7ff'; ctx.shadowBlur = 24; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.arc(x - 50, y + 18, 28 + Math.sin(state.tick / 8) * 3, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    }
  }

  for (const bullet of state.bullets) {
    const x = bullet.x / SCALE;
    const y = bullet.y / SCALE;
    if (bullet.kind === 'enemy') {
      const ember = bullet.sourceAttack === 'advocate-ember';
      if (ember) drawSprite(ctx, 'ember', x, y, bullet.radius * 3.8, bullet.radius * 3.1);
      else {
        ctx.strokeStyle = '#ff826f'; ctx.fillStyle = 'rgba(26, 8, 20, .82)'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(x, y, bullet.radius + 3, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = '#ffd1b3'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(x, y, Math.max(2, bullet.radius - 3), 0, Math.PI * 2); ctx.stroke();
      }
    } else if (bullet.kind === 'return') {
      if (bullet.cooledEmber) {
        ctx.save(); ctx.shadowColor = '#75ffff'; ctx.shadowBlur = 24;
        drawSprite(ctx, 'cooled-ember', x, y, 64, 42); ctx.restore();
      } else drawSprite(ctx, 'return', x, y, 38, 20);
    } else {
      ctx.strokeStyle = bullet.annotated ? '#fcd170' : '#a8f7ff';
      ctx.lineWidth = bullet.annotated ? 5 : 3;
      ctx.beginPath(); ctx.moveTo(x - (bullet.annotated ? 16 : 8), y); ctx.lineTo(x + 8, y); ctx.stroke();
      if (bullet.wetAnnotated) {
        ctx.strokeStyle = '#d9fff7'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x - 15, y - 6); ctx.lineTo(x + 6, y - 6); ctx.stroke();
        diamond(ctx, x - 18, y, 4); ctx.fillStyle = '#8fffe0'; ctx.fill();
      }
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

  if (stageVisuals?.fore.complete && stageVisuals.fore.naturalWidth > 0) {
    const foreDrift = (state.tick / 18) % 160;
    ctx.save(); ctx.globalAlpha = 0.64;
    ctx.drawImage(stageVisuals.fore, -foreDrift, 0, WIDTH + 320, HEIGHT);
    ctx.restore();
  }

  ctx.fillStyle = 'rgba(4, 10, 22, .72)';
  ctx.fillRect(0, 0, WIDTH, 52);
  ctx.fillRect(0, HEIGHT - 52, WIDTH, 52);
  ctx.fillStyle = '#dceaf0';
  ctx.font = '600 18px system-ui, sans-serif';
  const stageTitle = state.stageId === 'stage-01' ? 'STAGE 1: THE ERASED HARBOR'
    : state.stageId === 'stage-02' ? 'STAGE 2: THE CROSSWIND INDEX'
      : state.stageId === 'stage-03' ? 'STAGE 3: THE RAIN MARGIN' : 'STAGE 4: THE BURNT FOOTNOTE';
  ctx.fillText(`PALIMPSEST WAKE  /  ${stageTitle}`, 24, 33);
  ctx.fillStyle = '#f4c36a';
  ctx.fillText(`SCORE ${String(state.score).padStart(7, '0')}`, 1035, 33);
  ctx.fillStyle = '#8ea6bd';
  ctx.font = '600 14px system-ui, sans-serif';
  const duration = state.stageId === 'stage-03' || state.stageId === 'stage-04' ? 195 : 180;
  ctx.fillText(state.boss || state.metrics.boss.defeated ? 'BOSS' : `${Math.min(duration, Math.floor(state.tick / TICK_RATE)).toString().padStart(3, '0')} / ${duration}s`, 910, 32);
  for (let i = 0; i < 3; i += 1) {
    ctx.fillStyle = i < state.player.health ? '#a8f7ff' : '#283449';
    diamond(ctx, 650 + i * 26, 27, 8); ctx.fill();
  }
  if (state.boss) {
    const boss = state.boss;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#f5e6c8';
    ctx.font = '700 16px system-ui, sans-serif';
    const bossName = boss.kind === 'blank-bailiff' ? 'BLANK BAILIFF' : boss.kind === 'crosswind-compiler' ? 'CROSSWIND COMPILER' : boss.kind === 'lacuna-eel' ? 'LACUNA EEL' : 'CINDER ADVOCATE';
    ctx.fillText(`${bossName}  ·  PHASE ${boss.phase}`, WIDTH / 2, 76);
    ctx.fillStyle = '#251927'; ctx.fillRect(430, 87, 420, 10);
    ctx.fillStyle = boss.kind === 'blank-bailiff' && boss.armorLayers > 0 ? '#f3d69b' : '#67e8f9';
    const ratio = boss.kind === 'blank-bailiff' && boss.armorLayers > 0 ? ((boss.armorLayers - 1) + Math.max(0, boss.armor) / boss.maxArmor) / 3 : boss.health / boss.maxHealth;
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
    const stageCopy = {
      'stage-01': { number: 1, entry: 'THE ERASED HARBOR', gate: 'THE SEALED LEDGER', boss: 'BLANK BAILIFF',
        lesson: 'Rewrite a route through the records they tried to erase.', strategy: 'Return its erased fire. Strip the three written seals.' },
      'stage-02': { number: 2, entry: 'THE CROSSWIND INDEX', gate: 'THE LOCKED INDEX', boss: 'CROSSWIND COMPILER',
        lesson: 'Write against the wind. Close each route before it turns.', strategy: 'Close the vane in a loop. Strike the opposite seam.' },
      'stage-03': { number: 3, entry: 'THE RAIN-ANNOTATED GALLERY', gate: 'THE DROWNED MARGIN', boss: 'LACUNA EEL',
        lesson: 'Let rain wet the wake. Cross it to sharpen annotated fire.', strategy: 'Loop each glowing segment in order. Strike its wet mark.' },
      'stage-04': { number: 4, entry: 'THE BURNT FOOTNOTE', gate: 'THE CINDER HEARING', boss: 'CINDER ADVOCATE',
        lesson: 'Keep old writing in the moving cooling shadow.', strategy: 'Cool the thrown embers. Return them through the heat wall.' }
    }[app.game.stageId];
    const bossGate = app.checkpointName === 'bailiff-gate' || app.checkpointName === 'compiler-gate' || app.checkpointName === 'eel-gate' || app.checkpointName === 'advocate-gate';
    line(ctx, bossGate ? `CHECKPOINT · ${stageCopy.gate}` : `STAGE ${stageCopy.number}`, 205, '#f4c36a', 18);
    title(ctx, bossGate ? stageCopy.boss : stageCopy.entry, 300, 48);
    line(ctx, bossGate ? stageCopy.strategy : stageCopy.lesson, 365);
    line(ctx, 'ENTER  DEPART', 500, '#a8f7ff', 22);
    line(ctx, 'ESC  ABANDON VOYAGE', 548, '#7895a7', 15);
  } else if (screen === 'paused') {
    title(ctx, 'PAUSED', 338, 54);
    line(ctx, 'ESC / P / ENTER  return to the wake', 390);
    line(ctx, 'BACKSPACE  abandon voyage', 430, '#7895a7', 15);
  } else if (screen === 'continue') {
    title(ctx, app.continuesRemaining > 0 ? 'THE WAKE BREAKS' : 'VOYAGE ERASED', 270, 52, '#ffad91');
    const checkpointLabels: Record<AppState['checkpointName'], string> = {
      'harbor-entry': 'HARBOR ENTRY', 'bailiff-gate': 'THE SEALED LEDGER',
      'crosswind-entry': 'CROSSWIND ENTRY', 'compiler-gate': 'THE LOCKED INDEX',
      'rain-gallery-entry': 'RAIN GALLERY ENTRY', 'eel-gate': 'THE DROWNED MARGIN',
      'burnt-footnote-entry': 'BURNT FOOTNOTE ENTRY', 'advocate-gate': 'THE CINDER HEARING'
    };
    line(ctx, app.continuesRemaining > 0 ? `Checkpoint: ${checkpointLabels[app.checkpointName]}` : 'No revision remains.', 340);
    line(ctx, app.continuesRemaining > 0 ? 'ENTER  REVISE FROM CHECKPOINT' : 'ENTER  RETURN TO TITLE', 430, '#a8f7ff', 21);
    if (app.continuesRemaining > 0) line(ctx, 'One revision per stage · health 3 · gauge 50', 475, '#7895a7', 15);
    line(ctx, 'ESC  RETURN TO TITLE', 535, '#7895a7', 15);
  } else if (screen === 'result') {
    const resultCopy = {
      'stage-01': { number: 1, title: 'THE HARBOR REMEMBERS', action: 'ENTER  CONTINUE TO STAGE 2' },
      'stage-02': { number: 2, title: 'THE INDEX HOLDS ITS COURSE', action: 'ENTER  CONTINUE TO STAGE 3' },
      'stage-03': { number: 3, title: 'THE GALLERY RELEASES ITS RAIN', action: 'ENTER  CONTINUE TO STAGE 4' },
      'stage-04': { number: 4, title: 'THE FOOTNOTE COOLS', action: 'ENTER  RETURN TO TITLE' }
    }[app.game.stageId];
    line(ctx, `STAGE ${resultCopy.number} COMPLETE`, 190, '#f4c36a', 18);
    title(ctx, resultCopy.title, 280, 48);
    line(ctx, `SCORE  ${String(app.game.score).padStart(7, '0')}`, 370, '#a8f7ff', 25);
    line(ctx, `COLLATES ${app.game.metrics.loops}   ·   RETURNED FIRE ${app.game.metrics.captured}`, 414);
    line(ctx, `DAMAGE ${app.game.metrics.damage}   ·   REVISIONS USED ${1 - app.continuesRemaining}`, 450);
    line(ctx, resultCopy.action, 550, '#a8f7ff', 20);
    if (app.game.stageId !== 'stage-04') line(ctx, 'ESC  END VOYAGE', 590, '#7895a7', 15);
  }
  ctx.textAlign = 'start';
};

export const renderApp = (ctx: CanvasRenderingContext2D, app: AppState): void => {
  render(ctx, app.game, false);
  if (app.screen !== 'playing') renderScreen(ctx, app, app.screen);
};
