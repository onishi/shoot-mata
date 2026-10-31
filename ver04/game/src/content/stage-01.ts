import type { EnemyKind } from '../core/types';

export interface StageEnemySpawn {
  tick: number;
  kind: EnemyKind;
  x: number;
  y: number;
  health: number;
  amplitude: number;
  lifetime: number;
  lane?: number;
  groupId?: number;
}

const mite = (tick: number, y: number): StageEnemySpawn => ({
  tick, kind: 'eraser-mite', x: 1310, y, health: 44, amplitude: 0, lifetime: 1500
});
const gullPair = (tick: number, y: number, groupId: number): StageEnemySpawn[] => [
  { tick, kind: 'bracket-gull', x: 1320, y: y - 92, health: 92, amplitude: 22, lifetime: 2100, lane: -1, groupId },
  { tick, kind: 'bracket-gull', x: 1320, y: y + 92, health: 92, amplitude: 22, lifetime: 2100, lane: 1, groupId }
];
const skiff = (tick: number, y: number): StageEnemySpawn => ({
  tick, kind: 'margin-skiff', x: 1120, y, health: 190, amplitude: 118, lifetime: 3000
});
const hauler = (tick: number, y: number, health: number): StageEnemySpawn => ({
  tick, kind: 'folio-hauler', x: 1080, y, health, amplitude: 54, lifetime: 4500
});

// 0-30s introduces trail erosion, 30-60s the paired bullet bracket, 60-90s
// the three-shot loop lesson, and the remaining half mixes those rules around
// two Folio Hauler set pieces. Spawns stay less than four seconds apart.
export const STAGE_01_SPAWNS: StageEnemySpawn[] = [
  mite(0, 220), mite(300, 500), mite(660, 350), mite(1020, 150), mite(1380, 560),
  ...gullPair(1800, 360, 1), mite(2160, 300), ...gullPair(2520, 310, 2),
  mite(2880, 520), ...gullPair(3240, 420, 3), mite(3600, 180),
  skiff(3960, 260), mite(4320, 520), skiff(4680, 470), ...gullPair(5040, 340, 4),
  skiff(5400, 210), mite(5760, 420), skiff(6120, 500), ...gullPair(6480, 390, 5),
  hauler(6840, 360, 1180), mite(7200, 180), mite(7560, 550), ...gullPair(7920, 330, 6),
  skiff(8280, 240), mite(8640, 460), skiff(9000, 510), ...gullPair(9360, 390, 7),
  mite(9720, 150), skiff(10080, 310), ...gullPair(10440, 430, 8), mite(10800, 570),
  skiff(11160, 180), mite(11520, 400), ...gullPair(11880, 300, 9), skiff(12240, 520),
  mite(12600, 240), ...gullPair(12960, 420, 10), skiff(13320, 330), mite(13680, 560),
  hauler(14040, 350, 1560), ...gullPair(14400, 280, 11), mite(14760, 500),
  skiff(15120, 190), mite(15480, 390), ...gullPair(15840, 430, 12), skiff(16200, 520),
  mite(16560, 160), skiff(16920, 340), ...gullPair(17280, 360, 13), mite(17640, 550),
  skiff(18000, 220), mite(18360, 440), ...gullPair(18720, 300, 14), skiff(19080, 500),
  mite(19440, 180), ...gullPair(19800, 410, 15), skiff(20160, 300), mite(20520, 540),
  ...gullPair(20880, 350, 16), skiff(21240, 460)
].sort((a, b) => a.tick - b.tick || (a.lane ?? 0) - (b.lane ?? 0));

export const STAGE_01_DURATION_TICKS = 180 * 120;
export const STAGE_01_ENTITY_LIMITS = { enemies: 64, enemyBullets: 512 } as const;
