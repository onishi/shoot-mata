import {
  CORE_DROP_ITEM_IDS,
  MAX_CORE_DROUGHT_DROPS,
  createStageSchedule,
} from "./stage-schedule.mjs";

function emptyColorRecord(factory) {
  return Object.fromEntries(CORE_DROP_ITEM_IDS.map((itemId) => [itemId.replace("core-", ""), factory()]));
}

function validateSeedCount(seedCount) {
  if (!Number.isInteger(seedCount) || seedCount < 1 || seedCount > 0x100000000) {
    throw new TypeError("seedCount must be an integer from 1 to 4294967296");
  }
}

export function auditStageCoreSupply(stage, options = {}) {
  const seedStart = options.seedStart ?? 0;
  const seedCount = options.seedCount ?? 4096;
  if (!Number.isInteger(seedStart) || seedStart < 0 || seedStart > 0xffffffff) {
    throw new TypeError("seedStart must be an unsigned 32-bit integer");
  }
  validateSeedCount(seedCount);
  if (seedStart + seedCount > 0x100000000) {
    throw new RangeError("seed range must stay within unsigned 32-bit integers");
  }

  const maximumGapTicks = emptyColorRecord(() => ({ value: 0, seed: seedStart }));
  const maximumMissedDrops = emptyColorRecord(() => ({ value: 0, seed: seedStart }));
  const minimumCount = emptyColorRecord(() => Number.POSITIVE_INFINITY);
  const violations = [];

  for (let seed = seedStart; seed < seedStart + seedCount; seed += 1) {
    const schedule = createStageSchedule(stage, seed);
    const spawns = schedule.spawns.filter(({ tick }) => tick < stage.boss.startTick);

    for (const itemId of CORE_DROP_ITEM_IDS) {
      const color = itemId.replace("core-", "");
      const suppliedIndices = [];
      const suppliedTicks = [];
      spawns.forEach((spawn, index) => {
        if (spawn.dropItemId === itemId) {
          suppliedIndices.push(index);
          suppliedTicks.push(spawn.tick);
        }
      });
      minimumCount[color] = Math.min(minimumCount[color], suppliedIndices.length);

      const tickBoundaries = [0, ...suppliedTicks, stage.boss.startTick];
      const gapTicks = Math.max(...tickBoundaries.slice(1).map((tick, index) => tick - tickBoundaries[index]));
      if (gapTicks > maximumGapTicks[color].value) maximumGapTicks[color] = { value: gapTicks, seed };

      const indexBoundaries = [-1, ...suppliedIndices, spawns.length];
      const missedDrops = Math.max(
        ...indexBoundaries.slice(1).map((index, boundaryIndex) => index - indexBoundaries[boundaryIndex] - 1),
      );
      if (missedDrops > maximumMissedDrops[color].value) {
        maximumMissedDrops[color] = { value: missedDrops, seed };
      }
      if (suppliedIndices.length === 0 || missedDrops > MAX_CORE_DROUGHT_DROPS) {
        violations.push({ seed, color, supplied: suppliedIndices.length, missedDrops });
      }
    }
  }

  return Object.freeze({
    stageId: stage.id,
    seedStart,
    seedCount,
    inspectedDropSequences: seedCount,
    inspectedStageTicks: seedCount * stage.boss.startTick,
    maximumAllowedMissedDrops: MAX_CORE_DROUGHT_DROPS,
    minimumCount,
    maximumMissedDrops,
    maximumGapTicks,
    violations: Object.freeze(violations),
  });
}
