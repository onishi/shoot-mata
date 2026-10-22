import { parseStageDefinition, STAGE_SCHEMA_VERSION } from "../stage-schema.mjs";

export const STAGE_01_ORBITAL_WRECK = parseStageDefinition({
  schemaVersion: STAGE_SCHEMA_VERSION,
  id: "stage-01-orbital-wreck",
  title: "STAGE 1 軌道残骸帯",
  durationTicks: 3600,
  backgroundLayers: [
    { id: "far", assetId: "bg-stg01-far", scrollFactor: 0.08, behaviorId: "parallax-loop" },
    { id: "mid", assetId: "bg-stg01-mid", scrollFactor: 0.22, behaviorId: "parallax-loop" },
    { id: "fore", assetId: "bg-stg01-fore", scrollFactor: 0.46, behaviorId: "parallax-loop" },
  ],
  enemyTypes: [
    { id: "salvage-collector", assetId: "enemy-stg01-collector", behaviorId: "drift-left", hitPoints: 4, score: 100, collisionRadius: 24 },
    { id: "salvage-weaver", assetId: "enemy-stg01-weaver", behaviorId: "sine-left", hitPoints: 6, score: 160, collisionRadius: 22 },
    { id: "wreck-bulwark", assetId: "enemy-stg01-bulwark", behaviorId: "armored-drift", hitPoints: 14, score: 300, collisionRadius: 34 },
  ],
  dropTables: [
    { id: "balanced-cores", entries: [{ itemId: "core-red", weight: 1 }, { itemId: "core-blue", weight: 1 }, { itemId: "core-yellow", weight: 1 }] },
    { id: "lance-pressure", entries: [{ itemId: "core-red", weight: 3 }, { itemId: "core-blue", weight: 1 }, { itemId: "core-yellow", weight: 1 }] },
    { id: "mobility-pressure", entries: [{ itemId: "core-red", weight: 1 }, { itemId: "core-blue", weight: 1 }, { itemId: "core-yellow", weight: 3 }] },
  ],
  sections: [
    { id: "silent-approach", kind: "intro", startTick: 0, endTick: 180 },
    { id: "salvage-crossfire", kind: "combat", startTick: 180, endTick: 1500 },
    { id: "closing-wreck", kind: "setpiece", startTick: 1500, endTick: 2700 },
    { id: "wreck-warden", kind: "boss", startTick: 2700, endTick: 3600 },
  ],
  waves: [
    { id: "collector-screen", sectionId: "salvage-crossfire", startTick: 240, enemyTypeId: "salvage-collector", count: 6, intervalTicks: 70, spawnBehaviorId: "lane-sequence", lanes: [0.24, 0.5, 0.76], dropTableId: "balanced-cores" },
    { id: "weaver-thread", sectionId: "salvage-crossfire", startTick: 760, enemyTypeId: "salvage-weaver", count: 5, intervalTicks: 80, spawnBehaviorId: "lane-seeded", lanes: [0.22, 0.38, 0.62, 0.78], dropTableId: "mobility-pressure" },
    { id: "bulwark-gate", sectionId: "salvage-crossfire", startTick: 1220, enemyTypeId: "wreck-bulwark", count: 2, intervalTicks: 120, spawnBehaviorId: "lane-sequence", lanes: [0.34, 0.66], dropTableId: "lance-pressure" },
    { id: "corridor-weave", sectionId: "closing-wreck", startTick: 1560, enemyTypeId: "salvage-weaver", count: 6, intervalTicks: 105, spawnBehaviorId: "lane-seeded", lanes: [0.3, 0.42, 0.58, 0.7], dropTableId: "mobility-pressure" },
    { id: "corridor-armor", sectionId: "closing-wreck", startTick: 2050, enemyTypeId: "wreck-bulwark", count: 3, intervalTicks: 180, spawnBehaviorId: "lane-sequence", lanes: [0.32, 0.68], dropTableId: "lance-pressure" },
  ],
  hazards: [
    { id: "wreck-compression", sectionId: "closing-wreck", startTick: 1500, endTick: 2640, behaviorId: "closing-corridor" },
  ],
  boss: {
    id: "wreck-warden",
    assetId: "boss-stg01-wreck-warden",
    sectionId: "wreck-warden",
    startTick: 2760,
    entryBehaviorId: "boss-entry",
    phases: [
      { id: "crusher-sweep", hitPoints: 55, behaviorId: "boss-sweep" },
      { id: "salvage-crossfire", hitPoints: 65, behaviorId: "boss-crossfire" },
      { id: "exposed-reactor", hitPoints: 80, behaviorId: "boss-core-rush" },
    ],
  },
  audio: {
    stageLayerAssetIds: ["audio-ref-stage01-rhythm"],
    bossLayerAssetIds: ["audio-ref-stage01-rhythm"],
    introAssetId: "audio-ref-ui-confirm",
    clearAssetId: "audio-ref-ui-confirm",
  },
  transitions: { onClear: "STAGE_CLEAR", onDefeat: "PLAYER_DEFEATED" },
});
