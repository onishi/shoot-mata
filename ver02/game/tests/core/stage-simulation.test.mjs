import test from "node:test";
import assert from "node:assert/strict";
import { PHASE05_TEST_STAGE } from "../../src/content/stages/phase05-test-segment.mjs";
import { createFlowState, transitionFlow } from "../../src/core/flow-machine.mjs";
import {
  createStageSimulation,
  createStageSimulationSnapshot,
  stepStageSimulation,
} from "../../src/core/stage-simulation.mjs";

function send(state, type) {
  return transitionFlow(state, { type });
}

function autoCommand(simulation) {
  const target = simulation.boss && !simulation.boss.defeated
    ? simulation.boss
    : simulation.enemies[0];
  const targetY = target?.y ?? 0.5;
  const delta = targetY - simulation.player.y;
  return { moveY: Math.abs(delta) < 0.025 ? 0 : Math.sign(delta), fire: true };
}

function runAutomaticStage(seed = 20261022) {
  const simulation = createStageSimulation(PHASE05_TEST_STAGE, { seed });
  const timeline = [];
  while (simulation.status === "playing") {
    stepStageSimulation(simulation, PHASE05_TEST_STAGE, autoCommand(simulation));
    timeline.push(...simulation.events);
  }
  return { simulation, timeline, snapshot: createStageSimulationSnapshot(simulation) };
}

test("TECH-03: seed固定の仮区間はwave、コア、仕掛け、bossを経て結果へ到達する", () => {
  const first = runAutomaticStage();
  const replay = runAutomaticStage();
  assert.deepEqual(replay, first);
  assert.equal(first.simulation.status, "cleared");
  assert.equal(first.simulation.flowEvent, "STAGE_CLEAR");
  assert.equal(first.timeline.filter(({ type }) => type === "enemy-spawned").length, 10);
  assert.ok(first.timeline.some(({ type }) => type === "core-collected"));
  assert.ok(first.timeline.some(({ type }) => type === "boss-entered"));
  assert.ok(first.timeline.some(({ type }) => type === "boss-phase-changed"));
  assert.ok(first.timeline.some(({ type }) => type === "boss-defeated"));
  assert.ok(first.snapshot.score > 0);
});

test("TECH-03: seedでdrop列が変わっても仮区間の最低火力で完走できる", () => {
  for (const seed of [0, 1, 2, 3, 7, 19, 255, 65535, 20261022, 0xffffffff]) {
    const { simulation } = runAutomaticStage(seed);
    assert.equal(simulation.status, "cleared", `seed ${seed}`);
  }
});

test("LOOP-01/06: タイトルから結果へ遷移し、同じseedで即時再挑戦できる", () => {
  let flow = createFlowState();
  flow = send(flow, "START_CAMPAIGN");
  flow = send(flow, "COMPLETE_TUTORIAL");
  flow = send(flow, "BEGIN_STAGE");
  const first = runAutomaticStage(77);
  flow = send(flow, first.simulation.flowEvent);
  assert.equal(flow.screen, "result");
  flow = send(flow, "RETRY_STAGE");
  assert.equal(flow.screen, "stageIntro");
  assert.equal(flow.attempt, 2);
  flow = send(flow, "BEGIN_STAGE");
  const retry = runAutomaticStage(77);
  assert.deepEqual(retry.snapshot, first.snapshot);
  flow = send(flow, retry.simulation.flowEvent);
  assert.equal(flow.screen, "result");
});

test("CORE-05/LOOP-06: 被弾、コア喪失、残機喪失からゲームオーバーへ決定的に遷移する", () => {
  const simulation = createStageSimulation(PHASE05_TEST_STAGE, {
    seed: 3,
    lives: 1,
    coreQueue: [],
  });
  simulation.player.x = 0.18;
  simulation.player.y = 0.5;
  simulation.enemyShots.push({ id: "forced-1", x: 0.198, y: 0.5, vx: -0.018, vy: 0 });
  stepStageSimulation(simulation, PHASE05_TEST_STAGE);
  assert.equal(simulation.status, "defeated");
  assert.equal(simulation.flowEvent, "PLAYER_DEFEATED");
  assert.equal(simulation.player.lives, 0);
  assert.deepEqual(simulation.events.map(({ type }) => type), ["player-hit", "stage-defeated"]);
});

test("CORE-04/05: 青補助の無敵時間は、その青コアを失う被弾にも適用する", () => {
  const simulation = createStageSimulation(PHASE05_TEST_STAGE, {
    seed: 4,
    coreQueue: ["red", "blue"],
  });
  simulation.enemyShots.push({ id: "forced-blue", x: 0.198, y: 0.5, vx: -0.018, vy: 0 });
  stepStageSimulation(simulation, PHASE05_TEST_STAGE);
  assert.deepEqual(simulation.loadout.queue, ["blue"]);
  assert.equal(simulation.player.invulnerabilityTicks, 72);
});

test("CORE-05: 全コア喪失後も標準範囲でコアを回収して復帰できる", () => {
  const simulation = createStageSimulation(PHASE05_TEST_STAGE, { coreQueue: [] });
  simulation.pickups.push({ id: "recovery-core", x: simulation.player.x, y: simulation.player.y, core: "yellow" });
  stepStageSimulation(simulation, PHASE05_TEST_STAGE);
  assert.deepEqual(simulation.loadout.queue, ["yellow"]);
  assert.ok(simulation.events.some(({ type, core }) => type === "core-collected" && core === "yellow"));
});

test("LOOP-04: ポーズ中は戦闘tickを進めず、復帰後に同じ入力列を継続できる", () => {
  let flow = createFlowState({ tutorialSeen: true });
  flow = send(send(flow, "START_CAMPAIGN"), "BEGIN_STAGE");
  const simulation = createStageSimulation(PHASE05_TEST_STAGE, { seed: 9 });
  for (let index = 0; index < 30; index += 1) stepStageSimulation(simulation, PHASE05_TEST_STAGE, { fire: true });
  flow = send(flow, "PAUSE");
  const pausedTick = simulation.tick;
  for (let index = 0; index < 60; index += 1) {
    if (flow.screen === "playing") stepStageSimulation(simulation, PHASE05_TEST_STAGE, { fire: true });
  }
  assert.equal(simulation.tick, pausedTick);
  flow = send(flow, "RESUME");
  stepStageSimulation(simulation, PHASE05_TEST_STAGE, { fire: true });
  assert.equal(simulation.tick, pausedTick + 1);
});

function benchmarkDefeatTick(core, level, targetKind) {
  const simulation = createStageSimulation(PHASE05_TEST_STAGE, {
    seed: 20261022,
    lives: 99,
    coreQueue: Array(level).fill(core),
  });
  simulation.nextSpawnIndex = simulation.schedule.spawns.length;
  if (targetKind === "enemy") {
    simulation.enemies.push({
      id: "benchmark-enemy", typeId: "benchmark", assetId: "benchmark",
      behaviorId: "armored-drift", x: 0.65, y: 0.5, originY: 0.5,
      hitPoints: 40, maximumHitPoints: 40, score: 0, collisionRadius: 0.02,
      dropItemId: "red", ageTicks: 0,
    });
  } else {
    simulation.boss = {
      id: "benchmark-boss", assetId: "benchmark", x: 0.82, y: 0.5,
      phaseIndex: 0, phases: [{ id: "sweep", hitPoints: 200, maximumHitPoints: 200 }],
      defeated: false, ageTicks: 0,
    };
  }
  const eventType = targetKind === "enemy" ? "enemy-destroyed" : "boss-defeated";
  while (simulation.tick < 899 && simulation.status === "playing") {
    simulation.player.invulnerabilityTicks = 999;
    if (targetKind === "boss") simulation.boss.ageTicks = -1;
    stepStageSimulation(simulation, PHASE05_TEST_STAGE, { fire: true });
    if (simulation.events.some(({ type }) => type === eventType)) return simulation.tick;
  }
  throw new Error(`${core} Lv${level} failed to defeat ${targetKind}`);
}

test("CORE-03/WPN-01〜04: 同条件の通常敵・boss撃破tickを3武器×3段階で比較する", () => {
  const result = Object.fromEntries(["red", "blue", "yellow"].map((core) => [
    core,
    [1, 2, 3].map((level) => ({
      enemy: benchmarkDefeatTick(core, level, "enemy"),
      boss: benchmarkDefeatTick(core, level, "boss"),
    })),
  ]));
  assert.deepEqual(result, {
    red: [{ enemy: 76, boss: 403 }, { enemy: 31, boss: 140 }, { enemy: 23, boss: 75 }],
    blue: [{ enemy: 46, boss: 231 }, { enemy: 27, boss: 141 }, { enemy: 27, boss: 101 }],
    yellow: [{ enemy: 118, boss: 605 }, { enemy: 59, boss: 308 }, { enemy: 42, boss: 209 }],
  });
  for (const rows of Object.values(result)) {
    assert.ok(rows[2].enemy <= rows[0].enemy);
    assert.ok(rows[2].boss < rows[0].boss);
  }
});
