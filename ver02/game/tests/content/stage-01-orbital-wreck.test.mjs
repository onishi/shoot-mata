import assert from "node:assert/strict";
import test from "node:test";
import { AUDIO_ASSETS } from "../../src/browser/audio-assets.mjs";
import { GAME_ASSETS, assetIdsForStage } from "../../src/content/asset-manifest.mjs";
import { STAGE_01_ORBITAL_WRECK } from "../../src/content/stages/stage-01-orbital-wreck.mjs";
import { createStageSchedule } from "../../src/core/stage-schedule.mjs";
import {
  createStageSimulation,
  createStageSimulationSnapshot,
  stepStageSimulation,
} from "../../src/core/stage-simulation.mjs";

function autoCommand(simulation) {
  const target = simulation.boss && !simulation.boss.defeated
    ? simulation.boss
    : simulation.enemies[0];
  const delta = (target?.y ?? 0.5) - simulation.player.y;
  return { moveY: Math.abs(delta) < 0.025 ? 0 : Math.sign(delta), fire: true };
}

function runStage(seed = 20261022) {
  const simulation = createStageSimulation(STAGE_01_ORBITAL_WRECK, { seed });
  const timeline = [];
  while (simulation.status === "playing") {
    stepStageSimulation(simulation, STAGE_01_ORBITAL_WRECK, autoCommand(simulation));
    timeline.push(...simulation.events);
  }
  return { simulation, timeline, snapshot: createStageSimulationSnapshot(simulation) };
}

test("STG-01/05: 製品用第1面は3敵、圧縮回廊、3段階boss、完成asset参照を持つ", () => {
  assert.equal(STAGE_01_ORBITAL_WRECK.enemyTypes.length, 3);
  assert.deepEqual(
    STAGE_01_ORBITAL_WRECK.enemyTypes.map(({ behaviorId }) => behaviorId),
    ["drift-left", "sine-left", "armored-drift"],
  );
  assert.equal(STAGE_01_ORBITAL_WRECK.hazards[0].behaviorId, "closing-corridor");
  assert.equal(STAGE_01_ORBITAL_WRECK.boss.phases.length, 3);
  assert.equal(assetIdsForStage(STAGE_01_ORBITAL_WRECK).every((id) => GAME_ASSETS[id]), true);
  assert.equal(assetIdsForStage(STAGE_01_ORBITAL_WRECK).some((id) => id.includes("placeholder")), false);
});

test("AV-05: 第1面の通常2層、boss 3層、導入・クリア音は全て製品loaderに存在する", () => {
  const audioIds = new Set(AUDIO_ASSETS.map(({ id }) => id));
  const required = [
    ...STAGE_01_ORBITAL_WRECK.audio.stageLayerAssetIds,
    ...STAGE_01_ORBITAL_WRECK.audio.bossLayerAssetIds,
    STAGE_01_ORBITAL_WRECK.audio.introAssetId,
    STAGE_01_ORBITAL_WRECK.audio.clearAssetId,
  ];
  assert.equal(required.every((id) => audioIds.has(id)), true);
  assert.equal(STAGE_01_ORBITAL_WRECK.audio.stageLayerAssetIds.length, 2);
  assert.equal(STAGE_01_ORBITAL_WRECK.audio.bossLayerAssetIds.length, 3);
});

test("STG-01/TECH-03: 同一seedで通常戦、固有仕掛け、3段階boss、結果を再現する", () => {
  const first = runStage();
  const replay = runStage();
  assert.deepEqual(replay, first);
  assert.equal(first.simulation.status, "cleared");
  assert.equal(first.simulation.flowEvent, "STAGE_CLEAR");
  assert.equal(first.timeline.filter(({ type }) => type === "enemy-spawned").length, 22);
  assert.equal(first.timeline.filter(({ type }) => type === "boss-phase-changed").length, 2);
  assert.ok(first.timeline.some(({ type }) => type === "boss-defeated"));
});

test("STG-01: 圧縮回廊は安全帯外の機体へ周期的に作用する", () => {
  const simulation = createStageSimulation(STAGE_01_ORBITAL_WRECK, { seed: 2, coreQueue: ["red", "blue"] });
  simulation.tick = 1560;
  simulation.player.y = 0.12;
  simulation.nextSpawnIndex = simulation.schedule.spawns.findIndex(({ tick }) => tick >= simulation.tick);
  stepStageSimulation(simulation, STAGE_01_ORBITAL_WRECK);
  assert.ok(simulation.events.some(({ type, reason }) => type === "player-hit" && reason === "closing-corridor"));
  assert.deepEqual(simulation.loadout.queue, ["blue"]);
});

test("AV-01/02: 通常敵3種とbossの実asset IDが表示snapshotへ到達する", () => {
  const simulation = createStageSimulation(STAGE_01_ORBITAL_WRECK, { seed: 9 });
  const seen = new Set();
  while (simulation.status === "playing" && simulation.tick < STAGE_01_ORBITAL_WRECK.boss.startTick + 1) {
    stepStageSimulation(simulation, STAGE_01_ORBITAL_WRECK, autoCommand(simulation));
    for (const actor of createStageSimulationSnapshot(simulation).actors) seen.add(actor.assetId);
  }
  assert.equal(seen.has("enemy-stg01-collector"), true);
  assert.equal(seen.has("enemy-stg01-weaver"), true);
  assert.equal(seen.has("enemy-stg01-bulwark"), true);
  assert.equal(seen.has("boss-stg01-wreck-warden"), true);
});

test("STG-01: 敵役割は移動曲線と速度で機能的に異なる", () => {
  const simulation = createStageSimulation(STAGE_01_ORBITAL_WRECK, { seed: 1 });
  const types = STAGE_01_ORBITAL_WRECK.enemyTypes;
  simulation.enemies = types.map((type, index) => ({
    id: type.id,
    typeId: type.id,
    assetId: type.assetId,
    behaviorId: type.behaviorId,
    x: 0.9,
    y: 0.5,
    originY: 0.5,
    hitPoints: type.hitPoints,
    maximumHitPoints: type.hitPoints,
    score: type.score,
    collisionRadius: type.collisionRadius / 720,
    dropItemId: ["red", "blue", "yellow"][index],
    ageTicks: 0,
  }));
  simulation.nextSpawnIndex = simulation.schedule.spawns.length;
  for (let tick = 0; tick < 20; tick += 1) stepStageSimulation(simulation, STAGE_01_ORBITAL_WRECK);
  const [collector, weaver, bulwark] = simulation.enemies;
  assert.ok(weaver.x < collector.x);
  assert.ok(collector.x < bulwark.x);
  assert.notEqual(weaver.y, weaver.originY);
  assert.equal(collector.y, collector.originY);
  assert.equal(bulwark.y, bulwark.originY);
});
