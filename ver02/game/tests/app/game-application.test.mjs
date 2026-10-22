import test from "node:test";
import assert from "node:assert/strict";
import { createGameApplication } from "../../src/app/game-application.mjs";
import { PHASE05_TEST_STAGE } from "../../src/content/stages/phase05-test-segment.mjs";
import { STAGE_02_CLOUD_REFINERY } from "../../src/content/stages/stage-02-cloud-refinery.mjs";
import { createDefaultSaveData } from "../../src/core/save-data.mjs";

function createPorts(options = {}) {
  let data = options.data ?? createDefaultSaveData();
  const calls = [];
  const repository = {
    load() { return { data, source: "default", warning: options.loadWarning ?? null }; },
    save(next) {
      data = structuredClone(next);
      calls.push(["save", structuredClone(next)]);
      return { persisted: !options.saveWarning, warning: options.saveWarning ?? null };
    },
  };
  const audio = {
    mode: "idle",
    warning: null,
    activate() {
      calls.push(["activate"]);
      this.mode = options.audioFailure ? "silent" : "active";
      this.warning = options.audioFailure ? "audio-context-create-failed" : null;
      return Promise.resolve({ audible: !options.audioFailure, warning: this.warning });
    },
    getStatus() { return { mode: this.mode, warning: this.warning }; },
    setSettings(settings) { calls.push(["settings", structuredClone(settings)]); },
    playBgm(id) { calls.push(["bgm", id]); },
    playSfx(id) { calls.push(["sfx", id]); },
    stopBgm() { calls.push(["stop-bgm"]); },
  };
  return { repository, audio, calls, getData: () => data };
}

function autoCommand(session) {
  const target = session.simulation.boss && !session.simulation.boss.defeated
    ? session.simulation.boss
    : session.simulation.enemies[0];
  const delta = (target?.y ?? 0.5) - session.simulation.player.y;
  return { moveY: Math.abs(delta) < 0.025 ? 0 : Math.sign(delta), fire: true };
}

test("AV-06/PROG-01: START同期処理で音声を起動し、初回説明済みを保存する", async () => {
  const ports = createPorts();
  const application = createGameApplication({
    stage: PHASE05_TEST_STAGE,
    saveRepository: ports.repository,
    audio: ports.audio,
    seed: 77,
  });

  application.dispatch("start-campaign");
  assert.equal(application.session.flow.screen, "tutorial");
  assert.ok(ports.calls.findIndex(([kind]) => kind === "activate")
    < ports.calls.findIndex(([kind]) => kind === "sfx"));
  application.dispatch("complete-tutorial");
  assert.equal(ports.getData().progress.tutorialSeen, true);
  assert.ok(ports.calls.some(([kind]) => kind === "save"));
  await application.activateAudio();
});

test("PROG-04: クリア結果を選択難度のbestへ一度だけ保存する", () => {
  const data = createDefaultSaveData();
  data.progress.tutorialSeen = true;
  data.settings.difficulty = "assist";
  const ports = createPorts({ data });
  const application = createGameApplication({
    stage: PHASE05_TEST_STAGE,
    saveRepository: ports.repository,
    audio: ports.audio,
    seed: 77,
  });

  application.update({ confirm: true });
  application.update({ confirm: true });
  while (application.session.flow.screen === "playing") {
    application.update(autoCommand(application.session));
  }
  const saved = ports.getData();
  assert.equal(application.session.flow.screen, "result");
  assert.equal(saved.progress.stages[0].cleared.assist, true);
  assert.equal(saved.progress.stages[0].best.assist.score, application.session.lastRun.score);
  assert.deepEqual(saved.progress.stages[0].best.assist.breakdown, {
    enemies: application.session.lastRun.scoreBreakdown.enemy,
    cores: application.session.lastRun.scoreBreakdown.core,
    streak: application.session.lastRun.scoreBreakdown.streak,
    noDamage: application.session.lastRun.scoreBreakdown.noHit,
  });
  assert.ok(ports.calls.some(([kind, ids]) => kind === "bgm"
    && ids === PHASE05_TEST_STAGE.audio.stageLayerAssetIds));
  assert.ok(ports.calls.some(([kind, ids]) => kind === "bgm"
    && ids === PHASE05_TEST_STAGE.audio.bossLayerAssetIds));
  assert.ok(ports.calls.some(([kind, id]) => kind === "sfx"
    && id === PHASE05_TEST_STAGE.audio.introAssetId));
  assert.ok(ports.calls.some(([kind, id]) => kind === "sfx"
    && id === PHASE05_TEST_STAGE.audio.clearAssetId));
  const saveCalls = ports.calls.filter(([kind]) => kind === "save").length;
  application.update();
  assert.equal(ports.calls.filter(([kind]) => kind === "save").length, saveCalls);
});

test("A11Y-01/PROG-05/AV-06: 設定を即時反映し、保存・音声失敗を警告として継続する", async () => {
  const ports = createPorts({
    loadWarning: "storage-unavailable",
    saveWarning: "storage-unavailable",
    audioFailure: true,
  });
  const application = createGameApplication({
    stage: PHASE05_TEST_STAGE,
    saveRepository: ports.repository,
    audio: ports.audio,
  });

  const settings = application.updateSettings({ bgmMuted: true, sfxVolume: 0.25 });
  assert.equal(settings.bgmMuted, true);
  assert.equal(ports.getData().settings.sfxVolume, 0.25);
  assert.ok(ports.calls.some(([kind]) => kind === "settings"));
  application.dispatch("start-campaign");
  await application.activateAudio();
  application.dispatch("complete-tutorial");
  application.dispatch("begin-stage");
  while (application.session.flow.screen === "playing") {
    application.update(autoCommand(application.session));
  }
  assert.deepEqual(application.getStatus(), {
    saveWarning: "storage-unavailable",
    audioWarning: "audio-context-create-failed",
    audioMode: "silent",
  });
  assert.equal(application.session.flow.screen, "result");
});

test("AV-04/WPN-01〜03: 実際の発射eventに対応する武器音だけを鳴らす", () => {
  for (const [core, expectedSound] of [
    ["red", "audio-ref-weapon-lance"],
    ["blue", "audio-ref-weapon-spread"],
    ["yellow", "audio-ref-weapon-seeker"],
  ]) {
    const data = createDefaultSaveData();
    data.progress.tutorialSeen = true;
    const ports = createPorts({ data });
    const application = createGameApplication({
      stage: PHASE05_TEST_STAGE, saveRepository: ports.repository, audio: ports.audio,
    });
    application.update({ confirm: true });
    application.update({ confirm: true });
    application.session.simulation.loadout.queue.splice(0, 1, core);
    application.update({ fire: true });
    assert.equal(ports.calls.filter(([kind]) => kind === "sfx").at(-1)[1], expectedSound);
    const count = ports.calls.filter(([kind]) => kind === "sfx").length;
    application.update({ fire: true });
    assert.equal(ports.calls.filter(([kind]) => kind === "sfx").length, count);
  }
});

test("AV-04: コア回収とFIFO装填eventに対応する2音を一度ずつ鳴らす", () => {
  const data = createDefaultSaveData();
  data.progress.tutorialSeen = true;
  const ports = createPorts({ data });
  const application = createGameApplication({
    stage: PHASE05_TEST_STAGE, saveRepository: ports.repository, audio: ports.audio,
  });
  application.update({ confirm: true });
  application.update({ confirm: true });
  const simulation = application.session.simulation;
  simulation.pickups.push({ id: "forced-core", x: simulation.player.x, y: simulation.player.y, core: "blue" });
  const before = ports.calls.length;
  application.update();
  assert.deepEqual(ports.calls.slice(before).filter(([kind]) => kind === "sfx"), [
    ["sfx", "audio-ref-core-collect"],
    ["sfx", "audio-ref-core-load"],
  ]);
  application.update();
  assert.deepEqual(ports.calls.slice(before).filter(([kind]) => kind === "sfx"), [
    ["sfx", "audio-ref-core-collect"],
    ["sfx", "audio-ref-core-load"],
  ]);
});

test("LOOP-01/STG-02: 解放済み第2面を選択して対応stageと音層で開始する", () => {
  const data = createDefaultSaveData();
  data.progress.tutorialSeen = true;
  data.progress.maxUnlockedStage = 1;
  const ports = createPorts({ data });
  const application = createGameApplication({
    stages: [PHASE05_TEST_STAGE, STAGE_02_CLOUD_REFINERY],
    saveRepository: ports.repository,
    audio: ports.audio,
    seed: 20261022,
  });

  application.dispatch("open-stage-select");
  application.dispatch("start-stage-1");
  assert.equal(application.session.flow.stageIndex, 1);
  application.dispatch("begin-stage");
  assert.equal(application.session.simulation.stageId, STAGE_02_CLOUD_REFINERY.id);
  assert.deepEqual(ports.calls.findLast(([kind]) => kind === "bgm"), [
    "bgm", STAGE_02_CLOUD_REFINERY.audio.stageLayerAssetIds,
  ]);
});
