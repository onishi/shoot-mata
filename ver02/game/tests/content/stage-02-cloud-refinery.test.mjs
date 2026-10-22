import assert from "node:assert/strict";
import test from "node:test";
import { AUDIO_ASSETS } from "../../src/browser/audio-assets.mjs";
import { GAME_ASSETS, assetIdsForStage } from "../../src/content/asset-manifest.mjs";
import { STAGE_02_CLOUD_REFINERY } from "../../src/content/stages/stage-02-cloud-refinery.mjs";
import {
  createStageSimulation,
  createStageSimulationSnapshot,
  stepStageSimulation,
} from "../../src/core/stage-simulation.mjs";

function autoCommand(simulation) {
  const shutter = simulation.schedule.hazards.find(({ behaviorId, startTick, endTick }) => (
    behaviorId === "shutter-cover" && simulation.tick >= startTick && simulation.tick < endTick
  ));
  const cloud = simulation.schedule.hazards.find(({ behaviorId, startTick, endTick }) => (
    behaviorId === "charged-cloud" && simulation.tick >= startTick && simulation.tick < endTick
  ));
  if (shutter) {
    const openingY = Math.floor((simulation.tick - shutter.startTick) / 240) % 2 === 0 ? 0.3 : 0.7;
    let safeY = openingY;
    if (cloud) {
      const upperCharged = Math.floor((simulation.tick - cloud.startTick) / 180) % 2 === 0;
      safeY = upperCharged ? Math.max(openingY, 0.51) : Math.min(openingY, 0.49);
    }
    const safeDelta = safeY - simulation.player.y;
    return { moveY: Math.abs(safeDelta) < 0.02 ? 0 : Math.sign(safeDelta), fire: true };
  }
  const target = simulation.boss && !simulation.boss.defeated
    ? simulation.boss
    : simulation.enemies[0];
  const delta = (target?.y ?? 0.5) - simulation.player.y;
  return { moveY: Math.abs(delta) < 0.025 ? 0 : Math.sign(delta), fire: true };
}

function runStage(seed = 20261022) {
  const simulation = createStageSimulation(STAGE_02_CLOUD_REFINERY, { seed });
  const timeline = [];
  while (simulation.status === "playing") {
    stepStageSimulation(simulation, STAGE_02_CLOUD_REFINERY, autoCommand(simulation));
    timeline.push(...simulation.events);
  }
  return { simulation, timeline, snapshot: createStageSimulationSnapshot(simulation) };
}

test("STG-02: 雲海精製塔は固有敵3種、3仕掛け、3段階bossをデータで定義する", () => {
  assert.deepEqual(
    STAGE_02_CLOUD_REFINERY.enemyTypes.map(({ behaviorId }) => behaviorId),
    ["current-rider", "cover-turret", "dive-striker"],
  );
  assert.deepEqual(
    STAGE_02_CLOUD_REFINERY.hazards.map(({ behaviorId }) => behaviorId),
    ["alternating-current", "shutter-cover", "charged-cloud"],
  );
  assert.deepEqual(
    STAGE_02_CLOUD_REFINERY.boss.phases.map(({ behaviorId }) => behaviorId),
    ["boss-current-climb", "boss-shutter-barrage", "boss-thunder-dive"],
  );
  assert.equal(assetIdsForStage(STAGE_02_CLOUD_REFINERY).every((id) => GAME_ASSETS[id]), true);
  assert.equal(assetIdsForStage(STAGE_02_CLOUD_REFINERY).some((id) => id.includes("placeholder")), false);
});

test("AV-05: 第2面の通常2層、boss 3層、導入・クリア音は全て製品loaderに存在する", () => {
  const audioIds = new Set(AUDIO_ASSETS.map(({ id }) => id));
  const required = [
    ...STAGE_02_CLOUD_REFINERY.audio.stageLayerAssetIds,
    ...STAGE_02_CLOUD_REFINERY.audio.bossLayerAssetIds,
    STAGE_02_CLOUD_REFINERY.audio.introAssetId,
    STAGE_02_CLOUD_REFINERY.audio.clearAssetId,
  ];
  assert.equal(required.every((id) => audioIds.has(id)), true);
  assert.equal(STAGE_02_CLOUD_REFINERY.audio.stageLayerAssetIds.length, 2);
  assert.equal(STAGE_02_CLOUD_REFINERY.audio.bossLayerAssetIds.length, 3);
});

test("STG-02/TECH-03: 同一seedで通常戦、固有仕掛け、3段階boss、結果を再現する", () => {
  const first = runStage();
  const replay = runStage();
  assert.deepEqual(replay, first);
  assert.equal(first.simulation.status, "cleared");
  assert.equal(first.simulation.flowEvent, "STAGE_CLEAR");
  assert.equal(first.timeline.filter(({ type }) => type === "enemy-spawned").length, 24);
  assert.equal(first.timeline.filter(({ type }) => type === "hazard-current-shifted").length, 7);
  assert.equal(first.timeline.filter(({ type }) => type === "boss-phase-changed").length, 2);
  assert.ok(first.timeline.some(({ type }) => type === "boss-defeated"));
});

test("STG-02: 上下気流は180tick周期で向きを変え機体位置へ作用する", () => {
  const simulation = createStageSimulation(STAGE_02_CLOUD_REFINERY, { seed: 2 });
  simulation.tick = 1500;
  simulation.player.y = 0.5;
  simulation.nextSpawnIndex = simulation.schedule.spawns.findIndex(({ tick }) => tick >= simulation.tick);
  stepStageSimulation(simulation, STAGE_02_CLOUD_REFINERY);
  assert.equal(simulation.player.y, 0.4965);
  assert.ok(simulation.events.some(({ type, direction }) => type === "hazard-current-shifted" && direction === -1));

  simulation.tick = 1680;
  simulation.player.y = 0.5;
  stepStageSimulation(simulation, STAGE_02_CLOUD_REFINERY);
  assert.equal(simulation.player.y, 0.5035);
  assert.ok(simulation.events.some(({ type, direction }) => type === "hazard-current-shifted" && direction === 1));
});

test("STG-02: 遮蔽開口外と帯電側は周期判定で被弾する", () => {
  const shutter = createStageSimulation(STAGE_02_CLOUD_REFINERY, { seed: 3, coreQueue: ["red", "blue"] });
  shutter.tick = 1680;
  shutter.player.y = 0.8;
  shutter.nextSpawnIndex = shutter.schedule.spawns.findIndex(({ tick }) => tick >= shutter.tick);
  stepStageSimulation(shutter, STAGE_02_CLOUD_REFINERY);
  assert.ok(shutter.events.some(({ type, reason }) => type === "player-hit" && reason === "shutter-cover"));

  const cloud = createStageSimulation(STAGE_02_CLOUD_REFINERY, { seed: 4, coreQueue: ["red", "blue"] });
  cloud.tick = 1800;
  cloud.player.y = 0.3;
  cloud.nextSpawnIndex = cloud.schedule.spawns.findIndex(({ tick }) => tick >= cloud.tick);
  stepStageSimulation(cloud, STAGE_02_CLOUD_REFINERY);
  assert.ok(cloud.events.some(({ type, reason }) => type === "player-hit" && reason === "charged-cloud"));
});

test("STG-02: 敵3役は気流蛇行、低速砲台、追尾急降下として機能的に異なる", () => {
  const simulation = createStageSimulation(STAGE_02_CLOUD_REFINERY, { seed: 5 });
  simulation.enemies = STAGE_02_CLOUD_REFINERY.enemyTypes.map((type, index) => ({
    id: type.id,
    typeId: type.id,
    assetId: type.assetId,
    behaviorId: type.behaviorId,
    x: 0.9,
    y: [0.3, 0.5, 0.8][index],
    originY: [0.3, 0.5, 0.8][index],
    hitPoints: type.hitPoints,
    maximumHitPoints: type.hitPoints,
    score: type.score,
    collisionRadius: type.collisionRadius / 720,
    dropItemId: ["red", "blue", "yellow"][index],
    ageTicks: 40,
  }));
  simulation.player.y = 0.2;
  simulation.nextSpawnIndex = simulation.schedule.spawns.length;
  for (let tick = 0; tick < 20; tick += 1) stepStageSimulation(simulation, STAGE_02_CLOUD_REFINERY);
  const [skimmer, turret, diver] = simulation.enemies;
  assert.ok(diver.x < skimmer.x);
  assert.ok(skimmer.x < turret.x);
  assert.notEqual(skimmer.y, skimmer.originY);
  assert.equal(turret.y, turret.originY);
  assert.ok(diver.y < diver.originY);
});

test("AV-01/02: 第2面の敵3種とbossの実asset IDが表示snapshotへ到達する", () => {
  const simulation = createStageSimulation(STAGE_02_CLOUD_REFINERY, { seed: 9 });
  const seen = new Set();
  while (simulation.status === "playing" && simulation.tick < STAGE_02_CLOUD_REFINERY.boss.startTick + 1) {
    stepStageSimulation(simulation, STAGE_02_CLOUD_REFINERY, autoCommand(simulation));
    for (const actor of createStageSimulationSnapshot(simulation).actors) seen.add(actor.assetId);
  }
  assert.equal(seen.has("enemy-stg02-skimmer"), true);
  assert.equal(seen.has("enemy-stg02-turret"), true);
  assert.equal(seen.has("enemy-stg02-diver"), true);
  assert.equal(seen.has("boss-stg02-refinery-guardian"), true);
});
