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

// The four inherited rules are 36-second reminders rather than full lessons.
// The 54-second synthesis remains the stage's main set piece.
export const STAGE_06_SPAWNS: StageEnemySpawn[] = [];
export const STAGE_06_INHERITED_FOLIO_TICKS = 36 * 120;
export const STAGE_06_SYNTHESIS_FOLIO_TICKS = 54 * 120;
export const STAGE_06_SYNTHESIS_START_TICK = STAGE_06_INHERITED_FOLIO_TICKS * 4;
const originalFolioTicks = 54 * 120;
for (let folio = 0; folio < 5; folio += 1) {
  const duration = folio < 4 ? STAGE_06_INHERITED_FOLIO_TICKS : STAGE_06_SYNTHESIS_FOLIO_TICKS;
  const base = folio < 4 ? folio * STAGE_06_INHERITED_FOLIO_TICKS : STAGE_06_SYNTHESIS_START_TICK;
  const at = (offset: number): number => base + Math.round(offset * duration / originalFolioTicks);
  const group = folio + 1;
  STAGE_06_SPAWNS.push(
    wasp(at(0), folio % 2 === 0 ? 190 : 520),
    wasp(at(360), folio % 2 === 0 ? 500 : 210),
    hound(at(720), 350), wasp(at(1080), 250), hound(at(1440), 510),
    choir(at(1800), 190, -1, group), choir(at(1800), 530, 1, group),
    wasp(at(2160), 360), hound(at(2520), 220),
    choir(at(2880), 270, -1, group), choir(at(2880), 450, 1, group),
    palanquin(at(3240), folio % 2 === 0 ? 310 : 410, folio % 2 === 0 ? -1 : 1, 460 + folio * 30),
    wasp(at(3600), 540), hound(at(3960), 170),
    choir(at(4320), 220, -1, group), choir(at(4320), 500, 1, group),
    palanquin(at(4680), folio % 2 === 0 ? 480 : 240, folio % 2 === 0 ? 1 : -1, 500 + folio * 30),
    wasp(at(5040), 310)
  );
}
STAGE_06_SPAWNS.sort((a, b) => a.tick - b.tick || (a.lane ?? 0) - (b.lane ?? 0));

export const STAGE_06_DURATION_TICKS = STAGE_06_SYNTHESIS_START_TICK + STAGE_06_SYNTHESIS_FOLIO_TICKS;
export const STAGE_06_BOSS_START_TICK = STAGE_06_DURATION_TICKS;
export const STAGE_06_ENTITY_LIMITS = { enemies: 72, enemyBullets: 640 } as const;
export type StageSixFolio = 'wind' | 'rain' | 'heat' | 'mirror' | 'synthesis';
export const stageSixFolio = (tick: number): StageSixFolio => {
  if (tick >= STAGE_06_SYNTHESIS_START_TICK) return 'synthesis';
  return (['wind', 'rain', 'heat', 'mirror'] as const)[Math.floor(tick / STAGE_06_INHERITED_FOLIO_TICKS)];
};

export type StageSixRule = Exclude<StageSixFolio, 'synthesis'>;
export const stageSixActiveRule = (tick: number): StageSixRule => {
  const folio = stageSixFolio(tick);
  if (folio !== 'synthesis') return folio;
  const synthesisAge = tick - STAGE_06_SYNTHESIS_START_TICK;
  return (['wind', 'rain', 'heat', 'mirror'] as const)[Math.floor(synthesisAge / (STAGE_06_SYNTHESIS_FOLIO_TICKS / 4)) % 4];
};
