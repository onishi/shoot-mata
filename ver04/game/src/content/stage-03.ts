import type { StageEnemySpawn } from './stage-01';

const drip = (tick: number, y: number): StageEnemySpawn => ({
  tick, kind: 'drip-scribe', x: 1160, y, health: 82, amplitude: 42, lifetime: 2100
});
const frog = (tick: number, y: number, lane: -1 | 1): StageEnemySpawn => ({
  tick, kind: 'gutter-frog', x: 1300, y, health: 112, amplitude: 150, lifetime: 2400, lane
});
const bell = (tick: number, y: number, health = 320): StageEnemySpawn => ({
  tick, kind: 'basin-bell', x: 1100, y, health, amplitude: 28, lifetime: 4200
});
const needle = (tick: number, y: number): StageEnemySpawn => ({
  tick, kind: 'reed-needle', x: 1320, y, health: 94, amplitude: 72, lifetime: 2100
});

// 0-39s teaches rain writing, 39-78s introduces gutter leaps, 78-117s
// raises the basin, and the second half combines wet trails with guided reed
// dashes around two water-gate set pieces.
export const STAGE_03_SPAWNS: StageEnemySpawn[] = [
  drip(0, 190), drip(360, 470), drip(720, 300), drip(1080, 550), drip(1440, 230), drip(1800, 420),
  frog(2340, 150, -1), drip(2700, 490), frog(3060, 570, 1), drip(3420, 240),
  frog(3780, 180, -1), drip(4140, 420), frog(4500, 540, 1), drip(4860, 300),
  bell(5220, 360), drip(5580, 180), frog(5940, 540, 1), drip(6300, 430),
  bell(6660, 280, 260), frog(7020, 160, -1), drip(7380, 520),
  needle(7740, 230), drip(8100, 450), needle(8460, 520), frog(8820, 170, -1),
  needle(9180, 300), drip(9540, 560), frog(9900, 520, 1), needle(10260, 190),
  bell(10620, 360, 420), drip(10980, 180), needle(11340, 500), frog(11700, 560, 1),
  drip(12060, 320), needle(12420, 230), frog(12780, 160, -1), drip(13140, 490),
  needle(13500, 540), bell(13860, 350, 520), frog(14220, 180, -1), drip(14580, 520),
  needle(14940, 270), frog(15300, 550, 1), drip(15660, 210), needle(16020, 460),
  bell(16380, 300, 360), drip(16740, 540), frog(17100, 170, -1), needle(17460, 390),
  drip(17820, 260), frog(18180, 550, 1), needle(18540, 180), drip(18900, 470),
  bell(19260, 370, 460), needle(19620, 520), frog(19980, 160, -1), drip(20340, 310),
  needle(20700, 220), frog(21060, 560, 1), drip(21420, 480), needle(21780, 340),
  bell(22140, 350, 520), drip(22500, 190), frog(22860, 540, 1), needle(23220, 300)
].sort((a, b) => a.tick - b.tick || (a.lane ?? 0) - (b.lane ?? 0));

export const STAGE_03_DURATION_TICKS = 195 * 120;
export const STAGE_03_ENTITY_LIMITS = { enemies: 64, enemyBullets: 512 } as const;
export const STAGE_03_RAIN_PERIOD_TICKS = 18;
export const STAGE_03_WET_TICKS = 5 * 120;
