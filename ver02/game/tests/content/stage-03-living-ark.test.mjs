import assert from "node:assert/strict";
import test from "node:test";
import { GAME_ASSETS, assetIdsForStage } from "../../src/content/asset-manifest.mjs";
import { STAGE_03_LIVING_ARK } from "../../src/content/stages/stage-03-living-ark.mjs";
import {
  createStageSimulation,
  createStageSimulationSnapshot,
  stepStageSimulation,
} from "../../src/core/stage-simulation.mjs";

function autoCommand(simulation) {
  const inTissue = simulation.schedule.hazards.some(({ startTick, endTick }) => (
    simulation.tick >= startTick && simulation.tick < endTick
  ));
  const incomingShot = simulation.enemyShots
    .filter(({ x }) => x > simulation.player.x && x - simulation.player.x < 0.24)
    .sort((left, right) => left.x - right.x)[0];
  const target = simulation.boss && !simulation.boss.defeated
    ? simulation.boss
    : simulation.enemies[0];
  const dodgeY = !simulation.boss && incomingShot
    ? (incomingShot.y >= simulation.player.y ? 0.38 : 0.62)
    : null;
  const targetY = dodgeY ?? (inTissue ? 0.5 : (target?.y ?? 0.5));
  const delta = targetY - simulation.player.y;
  return { moveY: Math.abs(delta) < 0.025 ? 0 : Math.sign(delta), fire: true };
}

function runStage(seed = 20261023) {
  const simulation = createStageSimulation(STAGE_03_LIVING_ARK, { seed });
  const timeline = [];
  while (simulation.status === "playing") {
    stepStageSimulation(simulation, STAGE_03_LIVING_ARK, autoCommand(simulation));
    timeline.push(...simulation.events);
  }
  return { simulation, timeline, snapshot: createStageSimulationSnapshot(simulation) };
}

function enemy(typeIndex, overrides = {}) {
  const type = STAGE_03_LIVING_ARK.enemyTypes[typeIndex];
  return {
    id: type.id,
    typeId: type.id,
    assetId: type.assetId,
    behaviorId: type.behaviorId,
    x: 0.9,
    y: [0.3, 0.5, 0.8][typeIndex],
    originY: [0.3, 0.5, 0.8][typeIndex],
    hitPoints: type.hitPoints,
    maximumHitPoints: type.hitPoints,
    score: type.score,
    collisionRadius: type.collisionRadius / 720,
    dropItemId: ["red", "blue", "yellow"][typeIndex],
    ageTicks: 0,
    ...overrides,
  };
}

test("STG-03: 生体方舟は再生・寄生・捕食、3組織仕掛け、成長する中枢bossを定義する", () => {
  assert.deepEqual(
    STAGE_03_LIVING_ARK.enemyTypes.map(({ behaviorId }) => behaviorId),
    ["regenerating-swarm", "parasite-turret", "stalking-predator"],
  );
  assert.deepEqual(
    STAGE_03_LIVING_ARK.hazards.map(({ behaviorId }) => behaviorId),
    ["reactive-tissue", "growth-source", "contracting-tissue"],
  );
  assert.deepEqual(
    STAGE_03_LIVING_ARK.boss.phases.map(({ behaviorId }) => behaviorId),
    ["boss-feeding-arms", "boss-grown-carapace", "boss-shifting-heart"],
  );
  assert.equal(assetIdsForStage(STAGE_03_LIVING_ARK).every((id) => GAME_ASSETS[id]), true);
  assert.equal(assetIdsForStage(STAGE_03_LIVING_ARK).some((id) => id.includes("placeholder")), false);
});

test("STG-03/TECH-03: 同一seedで通常戦、組織仕掛け、3段階boss、結果を再現する", () => {
  const first = runStage();
  const replay = runStage();
  assert.deepEqual(replay, first);
  assert.equal(first.simulation.status, "cleared");
  assert.equal(first.simulation.flowEvent, "STAGE_CLEAR");
  assert.equal(first.simulation.tick, 3577);
  assert.equal(first.simulation.score, 11950);
  assert.equal(first.timeline.filter(({ type }) => type === "enemy-spawned").length, 30);
  assert.equal(first.timeline.filter(({ type }) => type === "hazard-growth-pulsed").length, 6);
  assert.equal(first.timeline.filter(({ type }) => type === "hazard-tissue-contracted").length, 6);
  assert.equal(first.timeline.filter(({ type }) => type === "boss-phase-changed").length, 2);
  assert.equal(first.timeline.filter(({ type }) => type === "boss-organ-shed").length, 3);
  assert.ok(first.timeline.some(({ type, tick }) => type === "core-collected" && tick >= STAGE_03_LIVING_ARK.boss.startTick));
  assert.ok(first.timeline.some(({ type }) => type === "boss-defeated"));
});

test("STG-03: 再生群体は生存中に耐久を戻し、増殖源は傷ついた敵をまとめて回復する", () => {
  const regeneration = createStageSimulation(STAGE_03_LIVING_ARK, { seed: 3 });
  regeneration.nextSpawnIndex = regeneration.schedule.spawns.length;
  regeneration.enemies = [enemy(0, { hitPoints: 3, ageTicks: 89 })];
  stepStageSimulation(regeneration, STAGE_03_LIVING_ARK);
  assert.equal(regeneration.enemies[0].hitPoints, 5);
  assert.ok(regeneration.events.some(({ type }) => type === "enemy-regenerated"));

  const growth = createStageSimulation(STAGE_03_LIVING_ARK, { seed: 4 });
  growth.tick = 1680;
  growth.nextSpawnIndex = growth.schedule.spawns.findIndex(({ tick }) => tick >= growth.tick);
  growth.enemies = [enemy(1, { hitPoints: 7 })];
  stepStageSimulation(growth, STAGE_03_LIVING_ARK, { fire: true });
  assert.equal(growth.enemies[0].hitPoints, 9);
  assert.ok(growth.events.some(({ type, healedEnemies }) => type === "hazard-growth-pulsed" && healedEnemies === 1));
});

test("STG-03: 生体門は射撃で開き、収縮通路は周期ごとの安全幅を通知して外側を攻撃する", () => {
  const closed = createStageSimulation(STAGE_03_LIVING_ARK, { seed: 5, coreQueue: [] });
  closed.tick = 1680;
  closed.player.y = 0.7;
  closed.nextSpawnIndex = closed.schedule.spawns.findIndex(({ tick }) => tick >= closed.tick);
  stepStageSimulation(closed, STAGE_03_LIVING_ARK);
  assert.ok(closed.events.some(({ type, reason }) => type === "player-hit" && reason === "reactive-tissue"));

  const opened = createStageSimulation(STAGE_03_LIVING_ARK, { seed: 6 });
  opened.tick = 1680;
  opened.player.y = 0.7;
  opened.nextSpawnIndex = opened.schedule.spawns.findIndex(({ tick }) => tick >= opened.tick);
  stepStageSimulation(opened, STAGE_03_LIVING_ARK, { fire: true });
  assert.equal(opened.events.some(({ type }) => type === "player-hit"), false);

  const contraction = createStageSimulation(STAGE_03_LIVING_ARK, { seed: 7 });
  contraction.tick = 2160;
  contraction.player.y = 0.7;
  contraction.nextSpawnIndex = contraction.schedule.spawns.findIndex(({ tick }) => tick >= contraction.tick);
  stepStageSimulation(contraction, STAGE_03_LIVING_ARK, { fire: true });
  assert.ok(contraction.events.some(({ type, halfWidth }) => type === "hazard-tissue-contracted" && halfWidth === 0.14));
  assert.ok(contraction.events.some(({ type, reason }) => type === "player-hit" && reason === "contracting-tissue"));
});

test("STG-03: 敵3役は再生蛇行、低速寄生砲台、待伏せ突進として移動と攻撃が異なる", () => {
  const simulation = createStageSimulation(STAGE_03_LIVING_ARK, { seed: 8 });
  simulation.enemies = [enemy(0, { ageTicks: 40 }), enemy(1, { ageTicks: 40 }), enemy(2, { ageTicks: 40 })];
  simulation.player.y = 0.2;
  simulation.nextSpawnIndex = simulation.schedule.spawns.length;
  for (let tick = 0; tick < 40; tick += 1) stepStageSimulation(simulation, STAGE_03_LIVING_ARK);
  const [swarm, turret, predator] = simulation.enemies;
  assert.ok(predator.x < swarm.x);
  assert.ok(swarm.x < turret.x);
  assert.notEqual(swarm.y, swarm.originY);
  assert.equal(turret.y, turret.originY);
  assert.ok(predator.y < predator.originY);
  assert.ok(simulation.enemyShots.some(({ id }) => id.startsWith("enemy-shot-")));
});

test("AV-01/02: 第3面の敵3種とbossの実asset IDが表示snapshotへ到達する", () => {
  const simulation = createStageSimulation(STAGE_03_LIVING_ARK, { seed: 9 });
  const seen = new Set();
  while (simulation.status === "playing" && simulation.tick < STAGE_03_LIVING_ARK.boss.startTick + 1) {
    stepStageSimulation(simulation, STAGE_03_LIVING_ARK, autoCommand(simulation));
    for (const actor of createStageSimulationSnapshot(simulation).actors) seen.add(actor.assetId);
  }
  assert.equal(seen.has("enemy-stg03-swarm"), true);
  assert.equal(seen.has("enemy-stg03-parasite"), true);
  assert.equal(seen.has("enemy-stg03-predator"), true);
  assert.equal(seen.has("boss-stg03-ark-core"), true);
});
