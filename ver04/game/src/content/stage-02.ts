import type { StageEnemySpawn } from './stage-01';

const kite = (tick: number, y: number): StageEnemySpawn => ({
  tick, kind: 'index-kite', x: 1310, y, health: 64, amplitude: 118, lifetime: 1680
});
const scribe = (tick: number, y: number): StageEnemySpawn => ({
  tick, kind: 'vane-scribe', x: 1120, y, health: 132, amplitude: 36, lifetime: 2520
});
const crossPair = (tick: number, y: number, groupId: number): StageEnemySpawn[] => [
  { tick, kind: 'cross-reference-pair', x: 1320, y: y - 120, health: 104, amplitude: 46, lifetime: 2280, lane: -1, groupId },
  { tick, kind: 'cross-reference-pair', x: 1320, y: y + 120, health: 104, amplitude: 46, lifetime: 2280, lane: 1, groupId }
];
const binder = (tick: number, y: number, health = 260): StageEnemySpawn => ({
  tick, kind: 'tab-binder', x: 1160, y, health, amplitude: 84, lifetime: 4200
});

// 0-36s: the kite makes each six-second reversal readable. 36-78s introduces
// fixed vane fire and paired cross references. The second half combines those
// rules around two binders, with each set piece spanning at least one reversal.
export const STAGE_02_SPAWNS: StageEnemySpawn[] = [
  kite(0, 210), kite(360, 500), kite(720, 300), kite(1080, 560), kite(1440, 170), kite(1800, 420),
  scribe(2160, 230), kite(2520, 500), scribe(2880, 490), kite(3240, 180),
  ...crossPair(3600, 360, 201), kite(3960, 360), scribe(4320, 190),
  ...crossPair(4680, 330, 202), kite(5040, 540), scribe(5400, 480),
  ...crossPair(5760, 390, 203), kite(6120, 200), scribe(6480, 310),
  binder(6840, 360), kite(7200, 150), kite(7560, 560), scribe(7920, 250),
  ...crossPair(8280, 370, 204), kite(8640, 470), scribe(9000, 510),
  ...crossPair(9360, 320, 205), kite(9720, 170), scribe(10080, 280),
  kite(10440, 550), ...crossPair(10800, 410, 206), scribe(11160, 500), kite(11520, 220),
  ...crossPair(11880, 340, 207), kite(12240, 490), scribe(12600, 180), kite(12960, 350),
  ...crossPair(13320, 400, 208), binder(13680, 350, 360), scribe(14040, 210), kite(14400, 540),
  ...crossPair(14760, 330, 209), kite(15120, 180), scribe(15480, 460),
  ...crossPair(15840, 390, 210), kite(16200, 520), scribe(16560, 250),
  kite(16920, 150), ...crossPair(17280, 350, 211), scribe(17640, 500), kite(18000, 290),
  ...crossPair(18360, 410, 212), kite(18720, 550), scribe(19080, 190),
  ...crossPair(19440, 320, 213), kite(19800, 450), scribe(20160, 530),
  kite(20520, 210), ...crossPair(20880, 380, 214), scribe(21240, 350)
].sort((a, b) => a.tick - b.tick || (a.lane ?? 0) - (b.lane ?? 0));

export const STAGE_02_DURATION_TICKS = 180 * 120;
export const STAGE_02_ENTITY_LIMITS = { enemies: 64, enemyBullets: 512 } as const;
export const STAGE_02_WIND_HALF_CYCLE_TICKS = 6 * 120;

