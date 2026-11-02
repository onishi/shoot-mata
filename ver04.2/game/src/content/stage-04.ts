import type { StageEnemySpawn } from './stage-01';

const ash = (tick: number, y: number): StageEnemySpawn => ({
  tick, kind: 'ash-comma', x: 1180, y, health: 76, amplitude: 64, lifetime: 2100
});
const censor = (tick: number, y: number): StageEnemySpawn => ({
  tick, kind: 'kiln-censor', x: 1110, y, health: 138, amplitude: 30, lifetime: 3000
});
const courier = (tick: number, y: number): StageEnemySpawn => ({
  tick, kind: 'ember-courier', x: 1290, y, health: 106, amplitude: 105, lifetime: 2400
});
const press = (tick: number, y: number, lane: -1 | 1, health = 360): StageEnemySpawn => ({
  tick, kind: 'char-press', x: 1080, y, health, amplitude: 52, lifetime: 4200, lane
});

// 0-39s teaches the moving cooling shadow, 39-78s adds attacks against the
// oldest writing, 78-117s introduces convertible embers, and the second half
// combines all four roles around two alternating press set pieces.
export const STAGE_04_SPAWNS: StageEnemySpawn[] = [
  ash(0, 190), ash(360, 500), ash(720, 310), ash(1080, 560), ash(1440, 230), ash(1800, 430),
  censor(2340, 200), ash(2700, 500), censor(3060, 500), ash(3420, 280),
  censor(3780, 350), ash(4140, 170), censor(4500, 530), ash(4860, 390),
  courier(5220, 190), ash(5580, 500), courier(5940, 520), censor(6300, 280),
  courier(6660, 320), ash(7020, 180), censor(7380, 510),
  press(7740, 210, -1, 420), ash(8100, 480), courier(8460, 510), censor(8820, 260),
  ash(9180, 180), courier(9540, 350), censor(9900, 520), ash(10260, 410),
  press(10620, 500, 1, 520), courier(10980, 180), censor(11340, 420), ash(11700, 550),
  courier(12060, 300), ash(12420, 180), censor(12780, 520), courier(13140, 460),
  ash(13500, 250), press(13860, 220, -1, 560), censor(14220, 500), courier(14580, 360),
  ash(14940, 170), censor(15300, 390), courier(15660, 540), ash(16020, 280),
  press(16380, 500, 1, 460), ash(16740, 180), courier(17100, 430), censor(17460, 540),
  ash(17820, 310), courier(18180, 190), censor(18540, 420), ash(18900, 550),
  press(19260, 230, -1, 520), courier(19620, 500), ash(19980, 180), censor(20340, 340),
  courier(20700, 540), ash(21060, 270), censor(21420, 500), courier(21780, 190),
  press(22140, 480, 1, 580), ash(22500, 300), censor(22860, 180), courier(23220, 500)
].sort((a, b) => a.tick - b.tick || (a.lane ?? 0) - (b.lane ?? 0));

export const STAGE_04_DURATION_TICKS = 195 * 120;
export const STAGE_04_BOSS_START_TICK = STAGE_04_DURATION_TICKS;
export const STAGE_04_ENTITY_LIMITS = { enemies: 64, enemyBullets: 512 } as const;
export const STAGE_04_HEAT_PERIOD_TICKS = 24;
export const STAGE_04_COOLING_RADIUS_PX = 145;
export const STAGE_04_COOLING_EXTENSION_TICKS = 6 * 120;

export const stageFourCoolingCenter = (tick: number): { x: number; y: number } => ({
  x: 620 + Math.round(Math.sin(tick / 420) * 360),
  y: 360 + Math.round(Math.sin(tick / 265 + 0.8) * 155)
});
