import { parseStageDefinition, STAGE_SCHEMA_VERSION } from "../stage-schema.mjs";

export const STAGE_04_STELLAR_FURNACE = parseStageDefinition({
  schemaVersion: STAGE_SCHEMA_VERSION,
  id: "stage-04-stellar-furnace",
  title: "STAGE 4 恒星炉心",
  durationTicks: 4440,
  backgroundLayers: [
    { id: "far", assetId: "bg-stg04-far", scrollFactor: 0.04, behaviorId: "parallax-loop" },
    { id: "mid", assetId: "bg-stg04-mid", scrollFactor: 0.16, behaviorId: "parallax-loop" },
    { id: "fore", assetId: "bg-stg04-fore", scrollFactor: 0.4, behaviorId: "parallax-loop" },
  ],
  enemyTypes: [
    { id: "heat-armor", assetId: "enemy-stg04-heat-armor", behaviorId: "heat-armored", hitPoints: 16, score: 360, collisionRadius: 32 },
    { id: "solar-rammer", assetId: "enemy-stg04-rammer", behaviorId: "solar-rammer", hitPoints: 9, score: 230, collisionRadius: 25 },
    { id: "omni-turret", assetId: "enemy-stg04-omni-turret", behaviorId: "omni-turret", hitPoints: 13, score: 310, collisionRadius: 30 },
  ],
  dropTables: [
    { id: "balanced-cores", entries: [{ itemId: "core-red", weight: 1 }, { itemId: "core-blue", weight: 1 }, { itemId: "core-yellow", weight: 1 }] },
    { id: "coolant-pressure", entries: [{ itemId: "core-red", weight: 1 }, { itemId: "core-blue", weight: 5 }, { itemId: "core-yellow", weight: 2 }] },
    { id: "armor-pressure", entries: [{ itemId: "core-red", weight: 5 }, { itemId: "core-blue", weight: 2 }, { itemId: "core-yellow", weight: 1 }] },
  ],
  sections: [
    { id: "collector-ring", kind: "intro", startTick: 0, endTick: 180 },
    { id: "furnace-approach", kind: "combat", startTick: 180, endTick: 1620 },
    { id: "collapsing-chamber", kind: "setpiece", startTick: 1620, endTick: 3180 },
    { id: "furnace-controller", kind: "boss", startTick: 3180, endTick: 4440 },
  ],
  waves: [
    { id: "armor-wall", sectionId: "furnace-approach", startTick: 240, enemyTypeId: "heat-armor", count: 5, intervalTicks: 155, spawnBehaviorId: "lane-sequence", lanes: [0.3, 0.7], dropTableId: "armor-pressure" },
    { id: "rammer-ignition", sectionId: "furnace-approach", startTick: 520, enemyTypeId: "solar-rammer", count: 8, intervalTicks: 82, spawnBehaviorId: "lane-seeded", lanes: [0.16, 0.34, 0.66, 0.84], dropTableId: "balanced-cores" },
    { id: "omni-crossfire", sectionId: "furnace-approach", startTick: 1050, enemyTypeId: "omni-turret", count: 3, intervalTicks: 210, spawnBehaviorId: "lane-sequence", lanes: [0.24, 0.5, 0.76], dropTableId: "coolant-pressure" },
    { id: "heatwave-armor", sectionId: "collapsing-chamber", startTick: 1690, enemyTypeId: "heat-armor", count: 4, intervalTicks: 260, spawnBehaviorId: "lane-sequence", lanes: [0.26, 0.74], dropTableId: "armor-pressure" },
    { id: "heatwave-rammers", sectionId: "collapsing-chamber", startTick: 1830, enemyTypeId: "solar-rammer", count: 7, intervalTicks: 145, spawnBehaviorId: "lane-seeded", lanes: [0.18, 0.36, 0.64, 0.82], dropTableId: "coolant-pressure" },
    { id: "core-turrets", sectionId: "collapsing-chamber", startTick: 2310, enemyTypeId: "omni-turret", count: 5, intervalTicks: 170, spawnBehaviorId: "lane-sequence", lanes: [0.2, 0.5, 0.8], dropTableId: "balanced-cores" },
  ],
  hazards: [
    { id: "furnace-heatwave", sectionId: "collapsing-chamber", startTick: 1680, endTick: 2400, behaviorId: "periodic-heatwave" },
    { id: "coolant-refuges", sectionId: "collapsing-chamber", startTick: 1680, endTick: 2400, behaviorId: "coolant-refuge" },
    { id: "collapsing-safe-zone", sectionId: "collapsing-chamber", startTick: 2400, endTick: 3120, behaviorId: "destruction-safe-zone" },
  ],
  boss: {
    id: "furnace-controller",
    assetId: "boss-stg04-furnace-controller",
    sectionId: "furnace-controller",
    startTick: 3240,
    entryBehaviorId: "boss-entry",
    phases: [
      { id: "thermal-shell", hitPoints: 65, behaviorId: "boss-thermal-shell" },
      { id: "overload-ram", hitPoints: 80, behaviorId: "boss-overload-ram" },
      { id: "omni-flare", hitPoints: 95, behaviorId: "boss-omni-flare" },
    ],
  },
  audio: {
    stageLayerAssetIds: ["audio-stg04-rhythm", "audio-stg04-melody"],
    bossLayerAssetIds: ["audio-stg04-rhythm", "audio-stg04-melody", "audio-stg04-danger"],
    introAssetId: "audio-stg04-intro",
    clearAssetId: "audio-stg04-clear",
  },
  transitions: { onClear: "STAGE_CLEAR", onDefeat: "PLAYER_DEFEATED" },
});
