import { parseStageDefinition } from "../content/stage-schema.mjs";

export const CORE_DROP_ITEM_IDS = Object.freeze(["core-red", "core-blue", "core-yellow"]);
export const MAX_CORE_DROUGHT_DROPS = 10;

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

function constrainCoreDrought(spawns, dropTables) {
  const constrained = spawns.map((spawn) => ({ ...spawn }));
  const constrainDirection = (indices) => {
    const lastSupplyPosition = new Map(CORE_DROP_ITEM_IDS.map((itemId) => [itemId, -1]));
    for (const [position, index] of indices.entries()) {
      const spawn = constrained[index];
      const overdue = CORE_DROP_ITEM_IDS
        .filter((itemId) => position - lastSupplyPosition.get(itemId) > MAX_CORE_DROUGHT_DROPS)
        .filter((itemId) => dropTables.get(spawn.dropTableId).some((entry) => entry.itemId === itemId))
        .sort((left, right) => lastSupplyPosition.get(left) - lastSupplyPosition.get(right));
      if (overdue.length > 0) spawn.dropItemId = overdue[0];
      lastSupplyPosition.set(spawn.dropItemId, position);
    }
  };
  const forward = constrained.map((_, index) => index);
  const backward = [...forward].reverse();
  for (let pass = 0; pass < 4; pass += 1) {
    constrainDirection(forward);
    constrainDirection(backward);
  }
  return constrained;
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
        dropTableId: wave.dropTableId,
        dropItemId: chooseWeighted(dropTables.get(wave.dropTableId), random),
      }));
    }
  }

  spawns.sort((left, right) => left.tick - right.tick || left.waveId.localeCompare(right.waveId));
  const scheduledSpawns = constrainCoreDrought(spawns, dropTables).map((spawn) => {
    const { dropTableId, ...scheduledSpawn } = spawn;
    return Object.freeze({
      ...scheduledSpawn,
    });
  });
  return Object.freeze({
    stageId: stage.id,
    seed,
    durationTicks: stage.durationTicks,
    spawns: Object.freeze(scheduledSpawns),
    hazards: stage.hazards,
    boss: stage.boss,
    transitions: stage.transitions,
  });
}
