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

test("PROG-02: アシストは敵弾・被弾後無敵・開始時救済・回収範囲を調整する", () => {
  const standard = createStageSimulation(PHASE05_TEST_STAGE, { difficulty: "standard" });
  const assist = createStageSimulation(PHASE05_TEST_STAGE, { difficulty: "assist" });

  assert.equal(standard.player.lives, 3);
  assert.deepEqual(standard.loadout.queue, ["red"]);
  assert.equal(assist.player.lives, 4);
  assert.deepEqual(assist.loadout.queue, ["red", "red"]);

  for (const simulation of [standard, assist]) {
    simulation.nextSpawnIndex = simulation.schedule.spawns.length;
    simulation.enemies.push({
      id: "assist-speed", typeId: "test", assetId: "test", behaviorId: "armored-drift",
      x: 0.8, y: 0.2, originY: 0.2, hitPoints: 20, maximumHitPoints: 20,
      score: 10, collisionRadius: 0.02, dropItemId: "red", ageTicks: 63,
      attackTicks: 0, hitTicks: 0,
    });
    stepStageSimulation(simulation, PHASE05_TEST_STAGE);
  }
  assert.equal(standard.enemyShots[0].vx, -0.018);
  assert.ok(Math.abs(assist.enemyShots[0].vx - (-0.0135)) < Number.EPSILON);

  for (const simulation of [standard, assist]) {
    simulation.enemyShots.push({
      id: "forced-difficulty-hit", x: simulation.player.x, y: simulation.player.y, vx: 0, vy: 0,
    });
    stepStageSimulation(simulation, PHASE05_TEST_STAGE);
  }
  assert.equal(standard.player.invulnerabilityTicks, 42);
  assert.equal(assist.player.invulnerabilityTicks, 63);

  standard.pickups.push({ id: "standard-range", x: standard.player.x + 0.105, y: standard.player.y, core: "blue" });
  assist.pickups.push({ id: "assist-range", x: assist.player.x + 0.105, y: assist.player.y, core: "blue" });
  stepStageSimulation(standard, PHASE05_TEST_STAGE);
  stepStageSimulation(assist, PHASE05_TEST_STAGE);
  assert.equal(standard.pickups.some(({ id }) => id === "standard-range"), true);
  assert.equal(assist.pickups.some(({ id }) => id === "assist-range"), false);
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
  assert.deepEqual(createStageSimulationSnapshot(simulation).failure, {
    tick: 0,
    reason: "enemy-shot",
    coreQueueBefore: [],
    lostCore: null,
    livesBefore: 1,
    livesAfter: 0,
  });
});

test("EXP-03: 敗北診断は被弾直前のコア列と喪失内容を保持する", () => {
  const simulation = createStageSimulation(PHASE05_TEST_STAGE, {
    seed: 3,
    lives: 1,
    coreQueue: ["yellow", "blue", "red"],
  });
  for (const expectedQueue of [
    ["yellow", "blue", "red"],
    ["blue", "red"],
    ["red"],
  ]) {
    simulation.player.invulnerabilityTicks = 0;
    simulation.enemyShots.push({
      id: `forced-${expectedQueue.length}`,
      x: simulation.player.x,
      y: simulation.player.y,
      vx: 0,
      vy: 0,
    });
    stepStageSimulation(simulation, PHASE05_TEST_STAGE);
    assert.deepEqual(simulation.lastHit.coreQueueBefore, expectedQueue);
  }
  simulation.player.invulnerabilityTicks = 0;
  simulation.enemyShots.push({ id: "forced-final", x: simulation.player.x, y: simulation.player.y, vx: 0, vy: 0 });
  stepStageSimulation(simulation, PHASE05_TEST_STAGE);

  assert.deepEqual(createStageSimulationSnapshot(simulation).failure, {
    tick: 3,
    reason: "enemy-shot",
    coreQueueBefore: [],
    lostCore: null,
    livesBefore: 1,
    livesAfter: 0,
  });
});

test("EXP-03: 時間切れは現在コア列を保持する敗北理由になる", () => {
  const simulation = createStageSimulation(PHASE05_TEST_STAGE, {
    seed: 4,
    coreQueue: ["red", "yellow"],
  });
  simulation.tick = simulation.schedule.durationTicks - 1;
  simulation.nextSpawnIndex = simulation.schedule.spawns.length;
  stepStageSimulation(simulation, PHASE05_TEST_STAGE);
  assert.deepEqual(createStageSimulationSnapshot(simulation).failure, {
    tick: simulation.schedule.durationTicks - 1,
    reason: "boss-timeout",
    coreQueueBefore: ["red", "yellow"],
    lostCore: null,
    livesBefore: 3,
    livesAfter: 3,
  });
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

test("CORE-03/06: reactor構成と無敵状態を自機の表示snapshotへ渡す", () => {
  const simulation = createStageSimulation(PHASE05_TEST_STAGE, {
    coreQueue: ["yellow", "yellow", "blue"],
  });
  simulation.player.invulnerabilityTicks = 12;
  const player = createStageSimulationSnapshot(simulation).actors.find(({ id }) => id === "player");
  assert.deepEqual(player.reactor, {
    primary: "yellow",
    level: 2,
    supports: ["blue"],
    invulnerable: true,
  });
});

test("AV-02: actorの登場・攻撃・形態変化とコア排出をsnapshotへ渡す", () => {
  const simulation = createStageSimulation(PHASE05_TEST_STAGE, { coreQueue: ["red", "blue"] });
  simulation.nextSpawnIndex = simulation.schedule.spawns.length;
  simulation.enemies.push({
    id: "animated-enemy", typeId: "test", assetId: "test", behaviorId: "armored-drift",
    x: 0.6, y: 0.5, originY: 0.5, hitPoints: 20, maximumHitPoints: 20,
    score: 10, collisionRadius: 0.02, dropItemId: "red", ageTicks: 0, attackTicks: 0, hitTicks: 0,
  });
  simulation.enemyShots.push({ id: "forced-eject", x: 0.198, y: 0.5, vx: -0.018, vy: 0 });
  stepStageSimulation(simulation, PHASE05_TEST_STAGE, { fire: true });
  const snapshot = createStageSimulationSnapshot(simulation);
  assert.equal(snapshot.actors.find(({ id }) => id === "player").animation.state, "attack");
  assert.equal(snapshot.actors.find(({ id }) => id === "animated-enemy").animation.state, "enter");
  assert.equal(snapshot.effects.find(({ kind }) => kind === "eject").core, "red");

  simulation.boss = {
    id: "animated-boss", assetId: "test", x: 0.82, y: 0.5, phaseIndex: 1,
    phases: [
      { id: "one", behaviorId: "boss-crossfire", hitPoints: 0, maximumHitPoints: 10 },
      { id: "two", behaviorId: "boss-core-rush", hitPoints: 10, maximumHitPoints: 10 },
    ],
    defeated: false, ageTicks: 0, attackTicks: 0, hitTicks: 0, phaseTicks: 20,
  };
  assert.equal(createStageSimulationSnapshot(simulation).actors
    .find(({ id }) => id === "animated-boss").animation.state, "phase");
});

test("CORE-05: 全コア喪失後も標準範囲でコアを回収して復帰できる", () => {
  const simulation = createStageSimulation(PHASE05_TEST_STAGE, { coreQueue: [] });
  simulation.pickups.push({ id: "recovery-core", x: simulation.player.x, y: simulation.player.y, core: "yellow" });
  stepStageSimulation(simulation, PHASE05_TEST_STAGE);
  assert.deepEqual(simulation.loadout.queue, ["yellow"]);
  assert.ok(simulation.events.some(({ type, core }) => type === "core-collected" && core === "yellow"));
  assert.deepEqual(simulation.events.filter(({ type }) => type.startsWith("core-")), [
    { tick: 0, type: "core-collected", core: "yellow", soundAssetId: "audio-ref-core-collect" },
    {
      tick: 0, type: "core-loaded", core: "yellow", ejected: null,
      weapon: "yellow", level: 1, soundAssetId: "audio-ref-core-load",
    },
  ]);
  assert.equal(simulation.effects.at(-1).kind, "collect");
});

test("AV-04: 命中・撃破・被弾VFXは発生位置を保持し、寿命後に消える", () => {
  const simulation = createStageSimulation(PHASE05_TEST_STAGE, { lives: 2, coreQueue: [] });
  simulation.nextSpawnIndex = simulation.schedule.spawns.length;
  simulation.enemies.push({
    id: "vfx-target", typeId: "test", assetId: "test", behaviorId: "armored-drift",
    x: 0.3, y: 0.5, originY: 0.5, hitPoints: 1, maximumHitPoints: 1,
    score: 10, collisionRadius: 0.02, dropItemId: "red", ageTicks: 0,
  });
  simulation.playerShots.push({
    id: "forced-hit", x: 0.3, y: 0.5, damage: 1, pierce: 0,
    kind: "lance", level: 1, vx: 0, vy: 0,
  });
  stepStageSimulation(simulation, PHASE05_TEST_STAGE);
  assert.deepEqual(simulation.effects.map(({ kind }) => kind), ["hit", "destroy"]);
  const initialEffectIds = simulation.effects.map(({ id }) => id);

  simulation.player.invulnerabilityTicks = 0;
  simulation.enemyShots.push({ id: "forced-damage", x: simulation.player.x, y: simulation.player.y, vx: 0, vy: 0 });
  stepStageSimulation(simulation, PHASE05_TEST_STAGE);
  assert.ok(simulation.effects.some(({ kind }) => kind === "damage"));
  const damage = simulation.effects.find(({ kind }) => kind === "damage");
  initialEffectIds.push(damage.id);
  assert.equal(damage.x, 0.18);
  assert.equal(damage.y, 0.5);

  for (let index = 0; index < 36; index += 1) stepStageSimulation(simulation, PHASE05_TEST_STAGE);
  assert.equal(simulation.effects.some(({ id }) => initialEffectIds.includes(id)), false);
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
