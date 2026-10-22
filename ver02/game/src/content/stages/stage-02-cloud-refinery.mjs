import { parseStageDefinition, STAGE_SCHEMA_VERSION } from "../stage-schema.mjs";

export const STAGE_02_CLOUD_REFINERY = parseStageDefinition({
  schemaVersion: STAGE_SCHEMA_VERSION,
  id: "stage-02-cloud-refinery",
  title: "STAGE 2 雲海精製塔",
  durationTicks: 3720,
  backgroundLayers: [
    { id: "far", assetId: "bg-stg02-far", scrollFactor: 0.06, behaviorId: "parallax-loop" },
    { id: "mid", assetId: "bg-stg02-mid", scrollFactor: 0.2, behaviorId: "parallax-loop" },
    { id: "fore", assetId: "bg-stg02-fore", scrollFactor: 0.5, behaviorId: "parallax-loop" },
  ],
  enemyTypes: [
    { id: "cloud-skimmer", assetId: "enemy-stg02-skimmer", behaviorId: "current-rider", hitPoints: 5, score: 120, collisionRadius: 22 },
    { id: "shutter-turret", assetId: "enemy-stg02-turret", behaviorId: "cover-turret", hitPoints: 12, score: 280, collisionRadius: 30 },
    { id: "storm-diver", assetId: "enemy-stg02-diver", behaviorId: "dive-striker", hitPoints: 7, score: 190, collisionRadius: 24 },
  ],
  dropTables: [
    { id: "balanced-cores", entries: [{ itemId: "core-red", weight: 1 }, { itemId: "core-blue", weight: 1 }, { itemId: "core-yellow", weight: 1 }] },
    { id: "seeker-pressure", entries: [{ itemId: "core-red", weight: 1 }, { itemId: "core-blue", weight: 1 }, { itemId: "core-yellow", weight: 4 }] },
    { id: "pierce-pressure", entries: [{ itemId: "core-red", weight: 3 }, { itemId: "core-blue", weight: 1 }, { itemId: "core-yellow", weight: 2 }] },
  ],
  sections: [
    { id: "cloud-descent", kind: "intro", startTick: 0, endTick: 180 },
    { id: "refinery-approach", kind: "combat", startTick: 180, endTick: 1500 },
    { id: "charged-shutters", kind: "setpiece", startTick: 1500, endTick: 2760 },
    { id: "refinery-guardian", kind: "boss", startTick: 2760, endTick: 3720 },
  ],
  waves: [
    { id: "skimmer-current", sectionId: "refinery-approach", startTick: 240, enemyTypeId: "cloud-skimmer", count: 7, intervalTicks: 65, spawnBehaviorId: "lane-seeded", lanes: [0.2, 0.36, 0.64, 0.8], dropTableId: "seeker-pressure" },
    { id: "turret-screen", sectionId: "refinery-approach", startTick: 760, enemyTypeId: "shutter-turret", count: 3, intervalTicks: 170, spawnBehaviorId: "lane-sequence", lanes: [0.28, 0.72], dropTableId: "pierce-pressure" },
    { id: "diver-drop", sectionId: "refinery-approach", startTick: 1180, enemyTypeId: "storm-diver", count: 4, intervalTicks: 75, spawnBehaviorId: "lane-sequence", lanes: [0.16, 0.84], dropTableId: "balanced-cores" },
    { id: "shutter-turrets", sectionId: "charged-shutters", startTick: 1580, enemyTypeId: "shutter-turret", count: 4, intervalTicks: 210, spawnBehaviorId: "lane-sequence", lanes: [0.24, 0.76], dropTableId: "pierce-pressure" },
    { id: "storm-crossing", sectionId: "charged-shutters", startTick: 1880, enemyTypeId: "storm-diver", count: 6, intervalTicks: 120, spawnBehaviorId: "lane-seeded", lanes: [0.18, 0.34, 0.66, 0.82], dropTableId: "seeker-pressure" },
  ],
  hazards: [
    { id: "tower-current", sectionId: "charged-shutters", startTick: 1500, endTick: 2700, behaviorId: "alternating-current" },
    { id: "tower-shutters", sectionId: "charged-shutters", startTick: 1620, endTick: 2700, behaviorId: "shutter-cover" },
    { id: "charged-cloud-bank", sectionId: "charged-shutters", startTick: 1740, endTick: 2700, behaviorId: "charged-cloud" },
  ],
  boss: {
    id: "refinery-guardian",
    assetId: "boss-stg02-refinery-guardian",
    sectionId: "refinery-guardian",
    startTick: 2820,
    entryBehaviorId: "boss-entry",
    phases: [
      { id: "current-climb", hitPoints: 60, behaviorId: "boss-current-climb" },
      { id: "shutter-barrage", hitPoints: 70, behaviorId: "boss-shutter-barrage" },
      { id: "thunder-dive", hitPoints: 85, behaviorId: "boss-thunder-dive" },
    ],
  },
  audio: {
    stageLoopAssetId: "audio-stg02-cloud-loop",
    bossLoopAssetId: "audio-stg02-guardian-loop",
    clearAssetId: "audio-stg02-clear",
  },
  transitions: { onClear: "STAGE_CLEAR", onDefeat: "PLAYER_DEFEATED" },
});
