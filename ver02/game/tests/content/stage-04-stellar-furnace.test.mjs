import assert from "node:assert/strict";
import test from "node:test";
import { STAGE_04_STELLAR_FURNACE } from "../../src/content/stages/stage-04-stellar-furnace.mjs";
import {
  createStageSimulation,
  createStageSimulationSnapshot,
  stepStageSimulation,
} from "../../src/core/stage-simulation.mjs";

function activeHazard(simulation, behaviorId) {
  return simulation.schedule.hazards.find((hazard) => (
    hazard.behaviorId === behaviorId
      && simulation.tick >= hazard.startTick
      && simulation.tick < hazard.endTick
  ));
}

function autoCommand(simulation) {
  const heatwave = activeHazard(simulation, "periodic-heatwave");
  const safeZone = activeHazard(simulation, "destruction-safe-zone");
  const incomingShot = simulation.enemyShots
    .filter(({ x }) => x > simulation.player.x && x - simulation.player.x < 0.2)
    .sort((left, right) => left.x - right.x)[0];
  let targetY = simulation.boss?.y ?? simulation.enemies[0]?.y ?? 0.5;
  if (simulation.tick >= 1620 && simulation.tick < 1680) targetY = 0.24;
  if (heatwave) {
    const elapsed = simulation.tick - heatwave.startTick;
    const nextWave = Math.ceil(elapsed / 180);
    const approachingPulse = nextWave * 180 - elapsed <= 50;
    const waveIndex = approachingPulse ? nextWave : Math.floor(elapsed / 180);
    targetY = waveIndex % 2 === 0 ? 0.24 : 0.76;
    if (incomingShot) targetY += incomingShot.y >= simulation.player.y ? -0.14 : 0.14;
  }
  if (simulation.tick >= 2340 && simulation.tick < 2400) {
    targetY = [0.26, 0.5, 0.74][simulation.destroyedEnemyCount % 3];
  }
  if (safeZone) {
    const center = [0.26, 0.5, 0.74][simulation.destroyedEnemyCount % 3];
    const elapsed = simulation.tick - safeZone.startTick;
    const ticksToPulse = Math.ceil(elapsed / 120) * 120 - elapsed;
    if (ticksToPulse <= 35 || ticksToPulse === 120) {
      targetY = center;
    } else if (incomingShot) {
      targetY = incomingShot.y >= simulation.player.y ? 0.18 : 0.82;
    }
  }
  if (!heatwave && !safeZone && !simulation.boss && incomingShot) {
    targetY = incomingShot.y >= simulation.player.y ? 0.3 : 0.7;
  }
  const delta = targetY - simulation.player.y;
  return { moveY: Math.abs(delta) < 0.025 ? 0 : Math.sign(delta), fire: true };
}

function runStage(seed = 20261024) {
  const simulation = createStageSimulation(STAGE_04_STELLAR_FURNACE, { seed });
  const timeline = [];
  while (simulation.status === "playing") {
    stepStageSimulation(simulation, STAGE_04_STELLAR_FURNACE, autoCommand(simulation));
    timeline.push(...simulation.events);
  }
  return { simulation, timeline, snapshot: createStageSimulationSnapshot(simulation) };
}

function enemy(typeIndex, overrides = {}) {
  const type = STAGE_04_STELLAR_FURNACE.enemyTypes[typeIndex];
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

test("STG-04: 恒星炉心は耐熱装甲・突進・全方向砲台、熱安全圏、3形態bossを定義する", () => {
  assert.deepEqual(
    STAGE_04_STELLAR_FURNACE.enemyTypes.map(({ behaviorId }) => behaviorId),
    ["heat-armored", "solar-rammer", "omni-turret"],
  );
  assert.deepEqual(
    STAGE_04_STELLAR_FURNACE.hazards.map(({ behaviorId }) => behaviorId),
    ["periodic-heatwave", "coolant-refuge", "destruction-safe-zone"],
  );
  assert.deepEqual(
    STAGE_04_STELLAR_FURNACE.boss.phases.map(({ behaviorId }) => behaviorId),
    ["boss-thermal-shell", "boss-overload-ram", "boss-omni-flare"],
  );
});

test("STG-04/TECH-03: 同一seedで通常戦、熱波と可変安全圏、3段階boss、結果を再現する", () => {
  const first = runStage();
  const replay = runStage();
  assert.deepEqual(replay, first);
  assert.equal(first.simulation.status, "cleared");
  assert.equal(first.simulation.flowEvent, "STAGE_CLEAR");
  assert.equal(first.simulation.tick, 3512);
  assert.equal(first.simulation.score, 14720);
  assert.equal(first.timeline.filter(({ type }) => type === "enemy-spawned").length, 32);
  assert.equal(first.timeline.filter(({ type }) => type === "hazard-heatwave-pulsed").length, 4);
  assert.equal(first.timeline.filter(({ type }) => type === "hazard-safe-zone-changed").length, 6);
  assert.equal(first.timeline.filter(({ type }) => type === "boss-phase-changed").length, 2);
  assert.equal(first.timeline.filter(({ type }) => type === "boss-coolant-vented").length, 2);
  assert.deepEqual(
    first.timeline.filter(({ type }) => type === "boss-coolant-vented").map(({ core }) => core).sort(),
    ["blue", "yellow"],
  );
  assert.ok(first.timeline.some(({ type }) => type === "boss-defeated"));
});

test("STG-04: 周期熱波は交互の退避域を通知し、退避域外だけを攻撃する", () => {
  const exposed = createStageSimulation(STAGE_04_STELLAR_FURNACE, { seed: 1, coreQueue: ["red", "blue"] });
  exposed.tick = 1680;
  exposed.player.y = 0.76;
  exposed.nextSpawnIndex = exposed.schedule.spawns.findIndex(({ tick }) => tick >= exposed.tick);
  stepStageSimulation(exposed, STAGE_04_STELLAR_FURNACE);
  assert.ok(exposed.events.some(({ type, safeY }) => type === "hazard-heatwave-pulsed" && safeY === 0.24));
  assert.ok(exposed.events.some(({ type, reason }) => type === "player-hit" && reason === "periodic-heatwave"));

  const sheltered = createStageSimulation(STAGE_04_STELLAR_FURNACE, { seed: 2 });
  sheltered.tick = 1860;
  sheltered.player.y = 0.76;
  sheltered.nextSpawnIndex = sheltered.schedule.spawns.findIndex(({ tick }) => tick >= sheltered.tick);
  stepStageSimulation(sheltered, STAGE_04_STELLAR_FURNACE);
  assert.ok(sheltered.events.some(({ type, safeY }) => type === "hazard-refuge-shifted" && safeY === 0.76));
  assert.equal(sheltered.events.some(({ type }) => type === "player-hit"), false);
});

test("STG-04: 敵撃破数が崩壊区間の安全圏位置と幅を決定する", () => {
  const simulation = createStageSimulation(STAGE_04_STELLAR_FURNACE, { seed: 3 });
  simulation.tick = 2400;
  simulation.destroyedEnemyCount = 5;
  simulation.player.y = 0.74;
  simulation.nextSpawnIndex = simulation.schedule.spawns.findIndex(({ tick }) => tick >= simulation.tick);
  stepStageSimulation(simulation, STAGE_04_STELLAR_FURNACE);
  assert.ok(simulation.events.some(({ type, safeY, destroyedEnemyCount, halfWidth }) => (
    type === "hazard-safe-zone-changed"
      && safeY === 0.74
      && destroyedEnemyCount === 5
      && halfWidth === 0.27
  )));
  assert.equal(simulation.events.some(({ type }) => type === "player-hit"), false);
});

test("STG-04: 敵3役は軽減装甲、追尾突進、3方向射撃として機能的に異なる", () => {
  const simulation = createStageSimulation(STAGE_04_STELLAR_FURNACE, { seed: 4 });
  simulation.enemies = [
    enemy(0, { ageTicks: 59 }),
    enemy(1, { ageTicks: 47 }),
    enemy(2, { ageTicks: 59 }),
  ];
  simulation.player.y = 0.2;
  simulation.nextSpawnIndex = simulation.schedule.spawns.length;
  stepStageSimulation(simulation, STAGE_04_STELLAR_FURNACE);
  const [armor, rammer, turret] = simulation.enemies;
  assert.ok(rammer.x < armor.x);
  assert.ok(armor.x < turret.x);
  assert.ok(rammer.y < rammer.originY);
  assert.equal(simulation.enemyShots.length, 3);

  const armorTest = createStageSimulation(STAGE_04_STELLAR_FURNACE, { seed: 5 });
  armorTest.nextSpawnIndex = armorTest.schedule.spawns.length;
  armorTest.enemies = [enemy(0, { x: 0.5, y: 0.5, originY: 0.5 })];
  armorTest.playerShots = [{ id: "test", x: 0.451, y: 0.5, damage: 4, pierce: 0, vx: 0.045, vy: 0 }];
  stepStageSimulation(armorTest, STAGE_04_STELLAR_FURNACE);
  assert.equal(armorTest.enemies[0].hitPoints, 14);
});

test("STG-04: 炉心制御機は各形態で冷却コアを放出し混色補助への交換機会を作る", () => {
  const simulation = createStageSimulation(STAGE_04_STELLAR_FURNACE, { seed: 6 });
  simulation.tick = STAGE_04_STELLAR_FURNACE.boss.startTick;
  simulation.nextSpawnIndex = simulation.schedule.spawns.length;
  stepStageSimulation(simulation, STAGE_04_STELLAR_FURNACE);
  assert.equal(simulation.boss.phases.length, 3);
  simulation.boss.ageTicks = 89;
  stepStageSimulation(simulation, STAGE_04_STELLAR_FURNACE);
  assert.ok(simulation.events.some(({ type, core }) => type === "boss-coolant-vented" && core === "blue"));
  assert.ok(simulation.pickups.some(({ core }) => core === "blue"));
});
