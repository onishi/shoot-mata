import { DEFAULT_BEHAVIOR_REGISTRY, hasBehavior } from "./behavior-registry.mjs";

export const STAGE_SCHEMA_VERSION = 1;
export const CORE_ITEM_IDS = Object.freeze(["core-red", "core-blue", "core-yellow"]);

const SECTION_KINDS = new Set(["intro", "combat", "setpiece", "boss"]);
const TRANSITIONS = new Set(["STAGE_CLEAR", "PLAYER_DEFEATED"]);
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function fail(path, message) {
  throw new TypeError(`${path}: ${message}`);
}

function objectAt(value, path) {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(path, "must be an object");
  return value;
}

function exactKeys(value, allowed, path) {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) fail(`${path}.${key}`, "is not allowed");
  }
  for (const key of allowed) {
    if (!(key in value)) fail(`${path}.${key}`, "is required");
  }
}

function arrayAt(value, path, { min = 1 } = {}) {
  if (!Array.isArray(value) || value.length < min) fail(path, `must contain at least ${min} item(s)`);
  return value;
}

function stringAt(value, path, { slug = false } = {}) {
  if (typeof value !== "string" || value.trim() === "") fail(path, "must be a non-empty string");
  if (slug && !SLUG_PATTERN.test(value)) fail(path, "must be a lowercase kebab-case id");
  return value;
}

function numberAt(value, path, { min = 0, max = Number.POSITIVE_INFINITY, integer = false } = {}) {
  if (!Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) {
    fail(path, `must be ${integer ? "an integer" : "a number"} from ${min} to ${max}`);
  }
  return value;
}

function uniqueIds(items, path) {
  const ids = new Set();
  for (const [index, item] of items.entries()) {
    const id = stringAt(item.id, `${path}[${index}].id`, { slug: true });
    if (ids.has(id)) fail(`${path}[${index}].id`, `duplicates ${id}`);
    ids.add(id);
  }
  return ids;
}

function registeredBehavior(registry, kind, id, path) {
  stringAt(id, path, { slug: true });
  if (!hasBehavior(registry, kind, id)) fail(path, `unknown ${kind} behavior ${id}`);
}

function validateBackgroundLayers(layers, registry) {
  arrayAt(layers, "stage.backgroundLayers");
  uniqueIds(layers, "stage.backgroundLayers");
  for (const [index, layer] of layers.entries()) {
    const path = `stage.backgroundLayers[${index}]`;
    objectAt(layer, path);
    exactKeys(layer, ["id", "assetId", "scrollFactor", "behaviorId"], path);
    stringAt(layer.assetId, `${path}.assetId`, { slug: true });
    numberAt(layer.scrollFactor, `${path}.scrollFactor`, { min: 0, max: 2 });
    registeredBehavior(registry, "background", layer.behaviorId, `${path}.behaviorId`);
  }
}

function validateEnemyTypes(enemyTypes, registry) {
  arrayAt(enemyTypes, "stage.enemyTypes");
  const ids = uniqueIds(enemyTypes, "stage.enemyTypes");
  for (const [index, enemy] of enemyTypes.entries()) {
    const path = `stage.enemyTypes[${index}]`;
    objectAt(enemy, path);
    exactKeys(enemy, ["id", "assetId", "behaviorId", "hitPoints", "score", "collisionRadius"], path);
    stringAt(enemy.assetId, `${path}.assetId`, { slug: true });
    registeredBehavior(registry, "enemy", enemy.behaviorId, `${path}.behaviorId`);
    numberAt(enemy.hitPoints, `${path}.hitPoints`, { min: 1, integer: true });
    numberAt(enemy.score, `${path}.score`, { min: 0, integer: true });
    numberAt(enemy.collisionRadius, `${path}.collisionRadius`, { min: 1 });
  }
  return ids;
}

function validateDropTables(dropTables) {
  arrayAt(dropTables, "stage.dropTables");
  const ids = uniqueIds(dropTables, "stage.dropTables");
  for (const [tableIndex, table] of dropTables.entries()) {
    const path = `stage.dropTables[${tableIndex}]`;
    objectAt(table, path);
    exactKeys(table, ["id", "entries"], path);
    arrayAt(table.entries, `${path}.entries`);
    const itemIds = new Set();
    for (const [entryIndex, entry] of table.entries.entries()) {
      const entryPath = `${path}.entries[${entryIndex}]`;
      objectAt(entry, entryPath);
      exactKeys(entry, ["itemId", "weight"], entryPath);
      if (!CORE_ITEM_IDS.includes(entry.itemId)) fail(`${entryPath}.itemId`, "must be a reactor core id");
      if (itemIds.has(entry.itemId)) fail(`${entryPath}.itemId`, `duplicates ${entry.itemId}`);
      itemIds.add(entry.itemId);
      numberAt(entry.weight, `${entryPath}.weight`, { min: Number.EPSILON, integer: true });
    }
  }
  return ids;
}

function validateSections(sections, durationTicks) {
  arrayAt(sections, "stage.sections");
  const ids = uniqueIds(sections, "stage.sections");
  let expectedStart = 0;
  for (const [index, section] of sections.entries()) {
    const path = `stage.sections[${index}]`;
    objectAt(section, path);
    exactKeys(section, ["id", "kind", "startTick", "endTick"], path);
    if (!SECTION_KINDS.has(section.kind)) fail(`${path}.kind`, `unknown section kind ${section.kind}`);
    numberAt(section.startTick, `${path}.startTick`, { min: 0, integer: true });
    numberAt(section.endTick, `${path}.endTick`, { min: 1, max: durationTicks, integer: true });
    if (section.startTick !== expectedStart) fail(`${path}.startTick`, `must continue at tick ${expectedStart}`);
    if (section.endTick <= section.startTick) fail(`${path}.endTick`, "must be after startTick");
    expectedStart = section.endTick;
  }
  if (expectedStart !== durationTicks) fail("stage.sections", "must cover the complete stage duration");
  return ids;
}

function validateWaves(waves, sections, sectionIds, enemyTypeIds, dropTableIds, registry) {
  arrayAt(waves, "stage.waves");
  uniqueIds(waves, "stage.waves");
  for (const [index, wave] of waves.entries()) {
    const path = `stage.waves[${index}]`;
    objectAt(wave, path);
    exactKeys(wave, [
      "id", "sectionId", "startTick", "enemyTypeId", "count", "intervalTicks",
      "spawnBehaviorId", "lanes", "dropTableId",
    ], path);
    if (!sectionIds.has(wave.sectionId)) fail(`${path}.sectionId`, `unknown section ${wave.sectionId}`);
    if (!enemyTypeIds.has(wave.enemyTypeId)) fail(`${path}.enemyTypeId`, `unknown enemy type ${wave.enemyTypeId}`);
    if (!dropTableIds.has(wave.dropTableId)) fail(`${path}.dropTableId`, `unknown drop table ${wave.dropTableId}`);
    registeredBehavior(registry, "spawn", wave.spawnBehaviorId, `${path}.spawnBehaviorId`);
    numberAt(wave.startTick, `${path}.startTick`, { min: 0, integer: true });
    numberAt(wave.count, `${path}.count`, { min: 1, integer: true });
    numberAt(wave.intervalTicks, `${path}.intervalTicks`, { min: 1, integer: true });
    arrayAt(wave.lanes, `${path}.lanes`);
    wave.lanes.forEach((lane, laneIndex) => numberAt(lane, `${path}.lanes[${laneIndex}]`, { min: 0, max: 1 }));
    const section = sections.find(({ id }) => id === wave.sectionId);
    const lastSpawnTick = wave.startTick + ((wave.count - 1) * wave.intervalTicks);
    if (wave.startTick < section.startTick || lastSpawnTick >= section.endTick) {
      fail(path, `spawn ticks must stay inside section ${wave.sectionId}`);
    }
  }
}

function validateHazards(hazards, sectionIds, sections, registry) {
  arrayAt(hazards, "stage.hazards", { min: 0 });
  uniqueIds(hazards, "stage.hazards");
  for (const [index, hazard] of hazards.entries()) {
    const path = `stage.hazards[${index}]`;
    objectAt(hazard, path);
    exactKeys(hazard, ["id", "sectionId", "startTick", "endTick", "behaviorId"], path);
    if (!sectionIds.has(hazard.sectionId)) fail(`${path}.sectionId`, `unknown section ${hazard.sectionId}`);
    registeredBehavior(registry, "hazard", hazard.behaviorId, `${path}.behaviorId`);
    const section = sections.find(({ id }) => id === hazard.sectionId);
    numberAt(hazard.startTick, `${path}.startTick`, { min: section.startTick, integer: true });
    numberAt(hazard.endTick, `${path}.endTick`, { min: hazard.startTick + 1, max: section.endTick, integer: true });
  }
}

function validateBoss(boss, durationTicks, sectionIds, sections, registry) {
  objectAt(boss, "stage.boss");
  exactKeys(boss, ["id", "assetId", "sectionId", "startTick", "entryBehaviorId", "phases"], "stage.boss");
  stringAt(boss.id, "stage.boss.id", { slug: true });
  stringAt(boss.assetId, "stage.boss.assetId", { slug: true });
  if (!sectionIds.has(boss.sectionId)) fail("stage.boss.sectionId", `unknown section ${boss.sectionId}`);
  const section = sections.find(({ id }) => id === boss.sectionId);
  if (section.kind !== "boss") fail("stage.boss.sectionId", "must reference a boss section");
  numberAt(boss.startTick, "stage.boss.startTick", {
    min: section.startTick,
    max: Math.min(durationTicks, section.endTick) - 1,
    integer: true,
  });
  registeredBehavior(registry, "boss", boss.entryBehaviorId, "stage.boss.entryBehaviorId");
  arrayAt(boss.phases, "stage.boss.phases");
  uniqueIds(boss.phases, "stage.boss.phases");
  for (const [index, phase] of boss.phases.entries()) {
    const path = `stage.boss.phases[${index}]`;
    objectAt(phase, path);
    exactKeys(phase, ["id", "hitPoints", "behaviorId"], path);
    numberAt(phase.hitPoints, `${path}.hitPoints`, { min: 1, integer: true });
    registeredBehavior(registry, "boss", phase.behaviorId, `${path}.behaviorId`);
  }
}

function validateAudio(audio) {
  objectAt(audio, "stage.audio");
  exactKeys(audio, ["stageLoopAssetId", "bossLoopAssetId", "clearAssetId"], "stage.audio");
  for (const [key, value] of Object.entries(audio)) stringAt(value, `stage.audio.${key}`, { slug: true });
}

function validateTransitions(transitions) {
  objectAt(transitions, "stage.transitions");
  exactKeys(transitions, ["onClear", "onDefeat"], "stage.transitions");
  for (const [key, value] of Object.entries(transitions)) {
    if (!TRANSITIONS.has(value)) fail(`stage.transitions.${key}`, `unknown flow event ${value}`);
  }
  if (transitions.onClear !== "STAGE_CLEAR" || transitions.onDefeat !== "PLAYER_DEFEATED") {
    fail("stage.transitions", "clear and defeat events cannot be reversed");
  }
}

function cloneAndFreeze(value) {
  if (Array.isArray(value)) return Object.freeze(value.map(cloneAndFreeze));
  if (value && typeof value === "object") {
    return Object.freeze(Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, cloneAndFreeze(entry)])));
  }
  return value;
}

export function parseStageDefinition(input, options = {}) {
  const stage = objectAt(input, "stage");
  exactKeys(stage, [
    "schemaVersion", "id", "title", "durationTicks", "backgroundLayers", "enemyTypes",
    "dropTables", "sections", "waves", "hazards", "boss", "audio", "transitions",
  ], "stage");
  if (stage.schemaVersion !== STAGE_SCHEMA_VERSION) fail("stage.schemaVersion", `must be ${STAGE_SCHEMA_VERSION}`);
  stringAt(stage.id, "stage.id", { slug: true });
  stringAt(stage.title, "stage.title");
  numberAt(stage.durationTicks, "stage.durationTicks", { min: 1, integer: true });

  const registry = options.behaviorRegistry ?? DEFAULT_BEHAVIOR_REGISTRY;
  validateBackgroundLayers(stage.backgroundLayers, registry);
  const enemyTypeIds = validateEnemyTypes(stage.enemyTypes, registry);
  const dropTableIds = validateDropTables(stage.dropTables);
  const sectionIds = validateSections(stage.sections, stage.durationTicks);
  validateWaves(stage.waves, stage.sections, sectionIds, enemyTypeIds, dropTableIds, registry);
  validateHazards(stage.hazards, sectionIds, stage.sections, registry);
  validateBoss(stage.boss, stage.durationTicks, sectionIds, stage.sections, registry);
  validateAudio(stage.audio);
  validateTransitions(stage.transitions);
  return cloneAndFreeze(stage);
}
