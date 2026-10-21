import { parseStageDefinition } from "../content/stage-schema.mjs";

function createRandom(seed) {
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) {
    throw new TypeError("seed must be an unsigned 32-bit integer");
  }
  let state = seed || 0x6d2b79f5;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0x100000000;
  };
}

function chooseWeighted(entries, random) {
  const totalWeight = entries.reduce((total, entry) => total + entry.weight, 0);
  let value = random() * totalWeight;
  for (const entry of entries) {
    value -= entry.weight;
    if (value < 0) return entry.itemId;
  }
  return entries.at(-1).itemId;
}

export function createStageSchedule(stageInput, seed) {
  const stage = parseStageDefinition(stageInput);
  const random = createRandom(seed);
  const dropTables = new Map(stage.dropTables.map((table) => [table.id, table.entries]));
  const spawns = [];

  for (const wave of stage.waves) {
    for (let index = 0; index < wave.count; index += 1) {
      const laneIndex = wave.spawnBehaviorId === "lane-sequence"
        ? index % wave.lanes.length
        : Math.floor(random() * wave.lanes.length);
      spawns.push(Object.freeze({
        tick: wave.startTick + (index * wave.intervalTicks),
        waveId: wave.id,
        enemyTypeId: wave.enemyTypeId,
        behaviorId: stage.enemyTypes.find(({ id }) => id === wave.enemyTypeId).behaviorId,
        lane: wave.lanes[laneIndex],
        dropItemId: chooseWeighted(dropTables.get(wave.dropTableId), random),
      }));
    }
  }

  spawns.sort((left, right) => left.tick - right.tick || left.waveId.localeCompare(right.waveId));
  return Object.freeze({
    stageId: stage.id,
    seed,
    durationTicks: stage.durationTicks,
    spawns: Object.freeze(spawns),
    hazards: stage.hazards,
    boss: stage.boss,
    transitions: stage.transitions,
  });
}
