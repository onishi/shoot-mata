import type { StageEnemySpawn } from './stage-01';
import type { Point, TrailPoint } from '../core/types';

const mote = (tick: number, y: number): StageEnemySpawn => ({
  tick, kind: 'mirror-mote', x: 1200, y, health: 82, amplitude: 72, lifetime: 2160
});
const ram = (tick: number, y: number): StageEnemySpawn => ({
  tick, kind: 'quotation-ram', x: 1260, y, health: 148, amplitude: 118, lifetime: 2760
});
const witness = (tick: number, y: number): StageEnemySpawn => ({
  tick, kind: 'false-witness', x: 1160, y, health: 126, amplitude: 48, lifetime: 3000
});
const obelisk = (tick: number, y: number, lane: -1 | 1): StageEnemySpawn => ({
  tick, kind: 'silver-obelisk', x: 1080, y, health: 720, amplitude: 18, lifetime: 4200, lane
});

// 0-42s teaches reflected writing, 42-84s introduces a ram that follows the
// false copy, 84-126s mixes harmless quotation rounds into real fire, and the
// second half composes all four roles around two fixed-mirror hearings.
export const STAGE_05_SPAWNS: StageEnemySpawn[] = [
  mote(0, 190), mote(360, 510), mote(720, 320), mote(1080, 560), mote(1440, 230), mote(1800, 430),
  ram(2520, 190), mote(2880, 510), ram(3240, 520), mote(3600, 280),
  ram(3960, 350), mote(4320, 170), ram(4680, 530), mote(5040, 390),
  witness(5400, 190), mote(5760, 500), witness(6120, 520), ram(6480, 280),
  witness(6840, 320), mote(7200, 180), ram(7560, 510),
  obelisk(7920, 210, -1), mote(8280, 480), witness(8640, 510), ram(9000, 260),
  mote(9360, 180), witness(9720, 350), ram(10080, 520), mote(10440, 410),
  obelisk(10800, 500, 1), witness(11160, 180), ram(11520, 420), mote(11880, 550),
  witness(12240, 300), mote(12600, 180), ram(12960, 520), witness(13320, 460),
  mote(13680, 250), obelisk(14040, 220, -1), ram(14400, 500), witness(14760, 360),
  mote(15120, 170), ram(15480, 390), witness(15840, 540), mote(16200, 280),
  obelisk(16560, 500, 1), mote(16920, 180), witness(17280, 430), ram(17640, 540),
  mote(18000, 310), witness(18360, 190), ram(18720, 420), mote(19080, 550),
  obelisk(19440, 230, -1), witness(19800, 500), mote(20160, 180), ram(20520, 340),
  witness(20880, 540), mote(21240, 270), ram(21600, 500), witness(21960, 190),
  obelisk(22320, 480, 1), mote(22680, 300), ram(23040, 180), witness(23400, 500),
  mote(23760, 220), ram(24120, 470), witness(24480, 330), mote(24840, 520)
].sort((a, b) => a.tick - b.tick || (a.lane ?? 0) - (b.lane ?? 0));

export const STAGE_05_DURATION_TICKS = 210 * 120;
export const STAGE_05_BOSS_START_TICK = STAGE_05_DURATION_TICKS;
export const STAGE_05_ENTITY_LIMITS = { enemies: 64, enemyBullets: 512 } as const;
export const STAGE_05_MIRROR_BANDS = [
  { x: 430, width: 170 },
  { x: 760, width: 170 }
] as const;

export const isInStageFiveMirrorBand = (point: Point): boolean => STAGE_05_MIRROR_BANDS.some(
  (band) => Math.abs(point.x / 256 - band.x) <= band.width / 2
);

/** A visual/shot-only copy. It is never passed to findLoopCandidate. */
export const stageFiveFalseTrail = (trail: TrailPoint[]): TrailPoint[] => trail
  .some(isInStageFiveMirrorBand)
  ? trail.map((point) => ({ ...point, y: 720 * 256 - point.y }))
  : [];
