import { parseStageDefinition, STAGE_SCHEMA_VERSION } from "../stage-schema.mjs";

export const STAGE_03_LIVING_ARK = parseStageDefinition({
  schemaVersion: STAGE_SCHEMA_VERSION,
  id: "stage-03-living-ark",
  title: "STAGE 3 生体方舟",
  durationTicks: 4080,
  backgroundLayers: [
    { id: "far", assetId: "bg-stg03-far", scrollFactor: 0.05, behaviorId: "parallax-loop" },
    { id: "mid", assetId: "bg-stg03-mid", scrollFactor: 0.18, behaviorId: "parallax-loop" },
    { id: "fore", assetId: "bg-stg03-fore", scrollFactor: 0.44, behaviorId: "parallax-loop" },
  ],
  enemyTypes: [
    { id: "regenerating-swarm", assetId: "enemy-stg03-swarm", behaviorId: "regenerating-swarm", hitPoints: 8, score: 150, collisionRadius: 22 },
    { id: "parasite-turret", assetId: "enemy-stg03-parasite", behaviorId: "parasite-turret", hitPoints: 14, score: 320, collisionRadius: 31 },
    { id: "ark-predator", assetId: "enemy-stg03-predator", behaviorId: "stalking-predator", hitPoints: 9, score: 220, collisionRadius: 27 },
  ],
  dropTables: [
    { id: "balanced-cores", entries: [{ itemId: "core-red", weight: 1 }, { itemId: "core-blue", weight: 1 }, { itemId: "core-yellow", weight: 1 }] },
    { id: "swarm-pressure", entries: [{ itemId: "core-red", weight: 1 }, { itemId: "core-blue", weight: 4 }, { itemId: "core-yellow", weight: 2 }] },
    { id: "organ-pressure", entries: [{ itemId: "core-red", weight: 4 }, { itemId: "core-blue", weight: 1 }, { itemId: "core-yellow", weight: 2 }] },
  ],
  sections: [
    { id: "outer-membrane", kind: "intro", startTick: 0, endTick: 180 },
    { id: "brood-canals", kind: "combat", startTick: 180, endTick: 1560 },
    { id: "contracting-organs", kind: "setpiece", startTick: 1560, endTick: 2880 },
    { id: "ark-core", kind: "boss", startTick: 2880, endTick: 4080 },
  ],
  waves: [
    { id: "swarm-bloom", sectionId: "brood-canals", startTick: 240, enemyTypeId: "regenerating-swarm", count: 8, intervalTicks: 58, spawnBehaviorId: "lane-seeded", lanes: [0.2, 0.36, 0.64, 0.8], dropTableId: "swarm-pressure" },
    { id: "parasite-nodes", sectionId: "brood-canals", startTick: 780, enemyTypeId: "parasite-turret", count: 3, intervalTicks: 190, spawnBehaviorId: "lane-sequence", lanes: [0.26, 0.74], dropTableId: "organ-pressure" },
    { id: "predator-stalk", sectionId: "brood-canals", startTick: 1210, enemyTypeId: "ark-predator", count: 4, intervalTicks: 78, spawnBehaviorId: "lane-sequence", lanes: [0.18, 0.82], dropTableId: "balanced-cores" },
    { id: "organ-swarm", sectionId: "contracting-organs", startTick: 1630, enemyTypeId: "regenerating-swarm", count: 6, intervalTicks: 105, spawnBehaviorId: "lane-seeded", lanes: [0.3, 0.42, 0.58, 0.7], dropTableId: "swarm-pressure" },
    { id: "feeding-nodes", sectionId: "contracting-organs", startTick: 1900, enemyTypeId: "parasite-turret", count: 4, intervalTicks: 205, spawnBehaviorId: "lane-sequence", lanes: [0.28, 0.72], dropTableId: "organ-pressure" },
    { id: "predator-collapse", sectionId: "contracting-organs", startTick: 2240, enemyTypeId: "ark-predator", count: 5, intervalTicks: 115, spawnBehaviorId: "lane-seeded", lanes: [0.18, 0.34, 0.66, 0.82], dropTableId: "balanced-cores" },
  ],
  hazards: [
    { id: "living-gate", sectionId: "contracting-organs", startTick: 1560, endTick: 2820, behaviorId: "reactive-tissue" },
    { id: "brood-heart", sectionId: "contracting-organs", startTick: 1680, endTick: 2760, behaviorId: "growth-source" },
    { id: "organ-contraction", sectionId: "contracting-organs", startTick: 1800, endTick: 2820, behaviorId: "contracting-tissue" },
  ],
  boss: {
    id: "ark-core",
    assetId: "boss-stg03-ark-core",
    sectionId: "ark-core",
    startTick: 2940,
    entryBehaviorId: "boss-entry",
    phases: [
      { id: "feeding-arms", hitPoints: 55, behaviorId: "boss-feeding-arms" },
      { id: "grown-carapace", hitPoints: 65, behaviorId: "boss-grown-carapace" },
      { id: "shifting-heart", hitPoints: 75, behaviorId: "boss-shifting-heart" },
    ],
  },
  audio: {
    stageLayerAssetIds: ["audio-stg03-rhythm", "audio-stg03-melody"],
    bossLayerAssetIds: ["audio-stg03-rhythm", "audio-stg03-melody", "audio-stg03-danger"],
    introAssetId: "audio-stg03-intro",
    clearAssetId: "audio-stg03-clear",
  },
  transitions: { onClear: "STAGE_CLEAR", onDefeat: "PLAYER_DEFEATED" },
});
