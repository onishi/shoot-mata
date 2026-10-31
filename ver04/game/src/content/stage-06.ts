import type { StageEnemySpawn } from './stage-01';

const wasp = (tick: number, y: number): StageEnemySpawn => ({
  tick, kind: 'binding-wasp', x: 1210, y, health: 92, amplitude: 82, lifetime: 2280
});
const hound = (tick: number, y: number): StageEnemySpawn => ({
  tick, kind: 'revision-hound', x: 1300, y, health: 142, amplitude: 116, lifetime: 2760
});
const choir = (tick: number, y: number, lane: -1 | 1, groupId: number): StageEnemySpawn => ({
  tick, kind: 'null-choir', x: 1160, y, health: 118, amplitude: 46, lifetime: 3180, lane, groupId
});
const palanquin = (tick: number, y: number, lane: -1 | 1, health = 520): StageEnemySpawn => ({
  tick, kind: 'archive-palanquin', x: 1100, y, health, amplitude: 36, lifetime: 4440, lane
});

// Five 54-second folios: wind, rain, heat, mirror, then a synthesis in which
// their readable cues alternate. Each role is taught alone before the final
// archive formations ask the player to preserve one writing intention across
// changing rules.
export const STAGE_06_SPAWNS: StageEnemySpawn[] = [];
for (let folio = 0; folio < 5; folio += 1) {
  const base = folio * 54 * 120;
  const group = folio + 1;
  STAGE_06_SPAWNS.push(
    wasp(base, folio % 2 === 0 ? 190 : 520),
    wasp(base + 360, folio % 2 === 0 ? 500 : 210),
    hound(base + 720, 350),
    wasp(base + 1080, 250),
    hound(base + 1440, 510),
    choir(base + 1800, 190, -1, group),
    choir(base + 1800, 530, 1, group),
    wasp(base + 2160, 360),
    hound(base + 2520, 220),
    choir(base + 2880, 270, -1, group),
    choir(base + 2880, 450, 1, group),
    palanquin(base + 3240, folio % 2 === 0 ? 310 : 410, folio % 2 === 0 ? -1 : 1, 460 + folio * 30),
    wasp(base + 3600, 540),
    hound(base + 3960, 170),
    choir(base + 4320, 220, -1, group),
    choir(base + 4320, 500, 1, group),
    palanquin(base + 4680, folio % 2 === 0 ? 480 : 240, folio % 2 === 0 ? 1 : -1, 500 + folio * 30),
    wasp(base + 5040, 310)
  );
}
STAGE_06_SPAWNS.sort((a, b) => a.tick - b.tick || (a.lane ?? 0) - (b.lane ?? 0));

export const STAGE_06_DURATION_TICKS = 270 * 120;
export const STAGE_06_BOSS_START_TICK = STAGE_06_DURATION_TICKS;
export const STAGE_06_ENTITY_LIMITS = { enemies: 72, enemyBullets: 640 } as const;
export const STAGE_06_FOLIO_TICKS = 54 * 120;
export type StageSixFolio = 'wind' | 'rain' | 'heat' | 'mirror' | 'synthesis';
export const stageSixFolio = (tick: number): StageSixFolio =>
  (['wind', 'rain', 'heat', 'mirror', 'synthesis'] as const)[Math.min(4, Math.floor(tick / STAGE_06_FOLIO_TICKS))];

export type StageSixRule = Exclude<StageSixFolio, 'synthesis'>;
export const stageSixActiveRule = (tick: number): StageSixRule => {
  const folio = stageSixFolio(tick);
  if (folio !== 'synthesis') return folio;
  const synthesisAge = tick - STAGE_06_FOLIO_TICKS * 4;
  return (['wind', 'rain', 'heat', 'mirror'] as const)[Math.floor(synthesisAge / (STAGE_06_FOLIO_TICKS / 4)) % 4];
};
