import test from "node:test";
import assert from "node:assert/strict";
import { createGameApplication } from "../../src/app/game-application.mjs";
import { automaticCombatCommand } from "../../src/browser/automatic-playthrough.mjs";
import { STAGE_01_ORBITAL_WRECK } from "../../src/content/stages/stage-01-orbital-wreck.mjs";
import { STAGE_02_CLOUD_REFINERY } from "../../src/content/stages/stage-02-cloud-refinery.mjs";
import { STAGE_03_LIVING_ARK } from "../../src/content/stages/stage-03-living-ark.mjs";
import { STAGE_04_STELLAR_FURNACE } from "../../src/content/stages/stage-04-stellar-furnace.mjs";
import { createDefaultSaveData } from "../../src/core/save-data.mjs";

const STAGES = Object.freeze([
  STAGE_01_ORBITAL_WRECK,
  STAGE_02_CLOUD_REFINERY,
  STAGE_03_LIVING_ARK,
  STAGE_04_STELLAR_FURNACE,
]);
const STAGE_SEEDS = Object.freeze([20261022, 20261022, 20261023, 20261024]);

function createPorts() {
  const data = createDefaultSaveData();
  data.progress.tutorialSeen = true;
  data.progress.maxUnlockedStage = 3;
  const repository = {
    load() { return { data, source: "test", warning: null }; },
    save() { return { persisted: true, warning: null }; },
  };
  const audio = {
    activate() { return Promise.resolve({ audible: false, warning: null }); },
    getStatus() { return { mode: "silent", warning: null }; },
    setSettings() {},
    playBgm() { return { played: true }; },
    playSfx() {},
    stopBgm() {},
  };
  return { repository, audio };
}

function createApplication() {
  const ports = createPorts();
  return createGameApplication({
    stages: STAGES,
    stageSeeds: STAGE_SEEDS,
    saveRepository: ports.repository,
    audio: ports.audio,
  });
}

function forceDefeat(application) {
  const simulation = application.session.simulation;
  simulation.player.lives = 1;
  simulation.player.invulnerabilityTicks = 0;
  simulation.loadout.queue.length = 0;
  simulation.enemyShots.push({
    id: `forced-${simulation.stageId}-${simulation.tick}`,
    x: simulation.player.x + 0.018,
    y: simulation.player.y,
    vx: -0.018,
    vy: 0,
  });
  application.update();
  assert.equal(application.session.flow.screen, "gameOver");
  assert.equal(application.session.lastRun.failure.reason, "enemy-shot");
}

function clearStage(application) {
  while (application.session.flow.screen === "playing") {
    application.update(automaticCombatCommand(application.session.simulation));
  }
  assert.equal(application.session.flow.screen, "result");
  return structuredClone(application.session.lastRun);
}

test("LOOP-02/06: 実4面は単独で敗北、再挑戦、クリア、同条件再挑戦、選択復帰を通る", () => {
  const application = createApplication();
  application.dispatch("open-stage-select");

  for (let stageIndex = 0; stageIndex < STAGES.length; stageIndex += 1) {
    application.dispatch(`start-stage-${stageIndex}`);
    assert.equal(application.session.flow.stageIndex, stageIndex);
    assert.equal(application.session.flow.mode, "single");
    application.dispatch("begin-stage");
    forceDefeat(application);

    application.dispatch("retry");
    assert.equal(application.session.flow.screen, "stageIntro");
    assert.equal(application.session.flow.attempt, 2);
    application.dispatch("begin-stage");
    const firstClear = clearStage(application);

    application.dispatch("retry");
    assert.equal(application.session.flow.attempt, 3);
    application.dispatch("begin-stage");
    const secondClear = clearStage(application);
    assert.deepEqual(secondClear, firstClear, `stage ${stageIndex + 1} retry diverged`);

    application.dispatch("advance");
    assert.equal(application.session.flow.screen, "stageSelect");
  }
});

test("LOOP-06/CORE-05: 実ステージのキャンペーンコンティニューは2回だけ消費できる", () => {
  const application = createApplication();
  application.dispatch("start-campaign");
  application.dispatch("begin-stage");

  for (const expectedRemaining of [1, 0]) {
    forceDefeat(application);
    application.dispatch("continue");
    assert.equal(application.session.flow.continuesRemaining, expectedRemaining);
    assert.equal(application.session.flow.screen, "stageIntro");
    assert.equal(application.session.simulation, null);
    application.dispatch("begin-stage");
  }

  forceDefeat(application);
  assert.throws(() => application.dispatch("continue"), /no continues remaining/);
  assert.equal(application.session.flow.screen, "gameOver");
  application.dispatch("retry");
  assert.equal(application.session.flow.screen, "stageIntro");
  assert.equal(application.session.flow.continuesRemaining, 0);
});

test("LOOP-04: 実第4面の再開始とタイトル離脱は確認完了まで進行を保持する", () => {
  const application = createApplication();
  application.dispatch("open-stage-select");
  application.dispatch("start-stage-3");
  application.dispatch("begin-stage");
  application.update({ fire: true });
  const simulation = application.session.simulation;
  const tick = simulation.tick;

  application.dispatch("request-restart");
  application.dispatch("cancel");
  assert.equal(application.session.flow.screen, "playing");
  assert.equal(application.session.simulation, simulation);
  assert.equal(application.session.simulation.tick, tick);

  application.dispatch("request-restart");
  application.dispatch("confirm");
  assert.equal(application.session.flow.screen, "stageIntro");
  assert.equal(application.session.flow.stageIndex, 3);
  assert.equal(application.session.flow.attempt, 2);
  assert.equal(application.session.simulation, null);

  application.dispatch("begin-stage");
  application.dispatch("request-title");
  application.dispatch("confirm");
  assert.equal(application.session.flow.screen, "title");
  assert.equal(application.session.simulation, null);
  assert.equal(application.session.flow.maxUnlockedStage, 3);
});
