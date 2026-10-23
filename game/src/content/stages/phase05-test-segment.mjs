import { parseStageDefinition, STAGE_SCHEMA_VERSION } from "../stage-schema.mjs";

export const PHASE05_TEST_STAGE = parseStageDefinition({
  schemaVersion: STAGE_SCHEMA_VERSION,
  id: "phase05-orbital-segment",
  title: "軌道残骸帯・基盤検証区間",
  durationTicks: 1200,
  backgroundLayers: [
    { id: "far", assetId: "bg-stg01-far", scrollFactor: 0.08, behaviorId: "parallax-loop" },
    { id: "mid", assetId: "bg-stg01-mid", scrollFactor: 0.22, behaviorId: "parallax-loop" },
    { id: "fore", assetId: "bg-stg01-fore", scrollFactor: 0.46, behaviorId: "parallax-loop" },
  ],
  enemyTypes: [
    {
      id: "salvage-collector",
      assetId: "enemy-stg01-01",
      behaviorId: "drift-left",
      hitPoints: 4,
      score: 100,
      collisionRadius: 24,
    },
    {
      id: "salvage-weaver-placeholder",
      assetId: "placeholder-enemy",
      behaviorId: "sine-left",
      hitPoints: 6,
      score: 160,
      collisionRadius: 22,
    },
  ],
  dropTables: [
    {
      id: "balanced-cores",
      entries: [
        { itemId: "core-red", weight: 1 },
        { itemId: "core-blue", weight: 1 },
        { itemId: "core-yellow", weight: 1 },
      ],
    },
  ],
  sections: [
    { id: "approach", kind: "intro", startTick: 0, endTick: 120 },
    { id: "collector-waves", kind: "combat", startTick: 120, endTick: 600 },
    { id: "closing-wreck", kind: "setpiece", startTick: 600, endTick: 900 },
    { id: "warden-test", kind: "boss", startTick: 900, endTick: 1200 },
  ],
  waves: [
    {
      id: "collector-line",
      sectionId: "collector-waves",
      startTick: 150,
      enemyTypeId: "salvage-collector",
      count: 6,
      intervalTicks: 45,
      spawnBehaviorId: "lane-sequence",
      lanes: [0.25, 0.5, 0.75],
      dropTableId: "balanced-cores",
    },
    {
      id: "weaver-pair",
      sectionId: "closing-wreck",
      startTick: 660,
      enemyTypeId: "salvage-weaver-placeholder",
      count: 4,
      intervalTicks: 50,
      spawnBehaviorId: "lane-seeded",
      lanes: [0.2, 0.4, 0.6, 0.8],
      dropTableId: "balanced-cores",
    },
  ],
  hazards: [
    {
      id: "test-corridor",
      sectionId: "closing-wreck",
      startTick: 620,
      endTick: 870,
      behaviorId: "closing-corridor",
    },
  ],
  boss: {
    id: "wreck-warden-placeholder",
    assetId: "placeholder-boss",
    sectionId: "warden-test",
    startTick: 930,
    entryBehaviorId: "boss-entry",
    phases: [
      { id: "sweep", hitPoints: 35, behaviorId: "boss-sweep" },
      { id: "burst", hitPoints: 25, behaviorId: "boss-burst" },
    ],
  },
  audio: {
    stageLayerAssetIds: ["audio-ref-stage01-rhythm"],
    bossLayerAssetIds: ["placeholder-boss-loop"],
    introAssetId: "audio-ref-ui-confirm",
    clearAssetId: "placeholder-stage-clear",
  },
  transitions: {
    onClear: "STAGE_CLEAR",
    onDefeat: "PLAYER_DEFEATED",
  },
});
