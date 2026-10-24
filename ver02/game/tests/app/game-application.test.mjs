import test from "node:test";
import assert from "node:assert/strict";
import { createGameApplication } from "../../src/app/game-application.mjs";
import { automaticCombatCommand } from "../../src/browser/automatic-playthrough.mjs";
import { PHASE05_TEST_STAGE } from "../../src/content/stages/phase05-test-segment.mjs";
import { STAGE_01_ORBITAL_WRECK } from "../../src/content/stages/stage-01-orbital-wreck.mjs";
import { STAGE_02_CLOUD_REFINERY } from "../../src/content/stages/stage-02-cloud-refinery.mjs";
import { STAGE_03_LIVING_ARK } from "../../src/content/stages/stage-03-living-ark.mjs";
import { STAGE_04_STELLAR_FURNACE } from "../../src/content/stages/stage-04-stellar-furnace.mjs";
import { createDefaultSaveData } from "../../src/core/save-data.mjs";
import { createSaveRepository } from "../../src/ports/save-repository.mjs";

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
    soundsReady: options.soundsReady ?? true,
    activate() {
      calls.push(["activate"]);
      this.mode = options.audioFailure ? "silent" : "active";
      this.warning = options.audioFailure ? "audio-context-create-failed" : null;
      return Promise.resolve({ audible: !options.audioFailure, warning: this.warning });
    },
    getStatus() { return { mode: this.mode, warning: this.warning }; },
    setSettings(settings) { calls.push(["settings", structuredClone(settings)]); },
    playBgm(id) {
      calls.push(["bgm", id]);
      return { played: this.soundsReady };
    },
    playSfx(id) { calls.push(["sfx", id]); },
    stopBgm() { calls.push(["stop-bgm"]); },
  };
  return { repository, audio, calls, getData: () => data };
}

function createStorage(initial = {}) {
  const entries = new Map(Object.entries(initial));
  return {
    entries,
    getItem(key) { return entries.has(key) ? entries.get(key) : null; },
    setItem(key, value) { entries.set(key, value); },
  };
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

test("AV-05: タイトル・結果・エンディングの各画面へ固有BGMを同期する", () => {
  const data = createDefaultSaveData();
  data.progress.tutorialSeen = true;
  const ports = createPorts({ data, soundsReady: false });
  const application = createGameApplication({
    stages: Array.from({ length: 4 }, () => PHASE05_TEST_STAGE),
    saveRepository: ports.repository,
    audio: ports.audio,
    seed: 77,
  });

  application.dispatch("start-campaign");
  assert.deepEqual(ports.calls.findLast(([kind]) => kind === "bgm"), [
    "bgm", "audio-ref-title-theme",
  ]);
  ports.audio.soundsReady = true;
  application.syncCurrentScreenAudio();
  assert.equal(ports.calls.filter(([kind, id]) => kind === "bgm" && id === "audio-ref-title-theme").length, 2);

  for (let stageIndex = 0; stageIndex < 4; stageIndex += 1) {
    application.dispatch("begin-stage");
    assert.deepEqual(ports.calls.findLast(([kind]) => kind === "bgm"), [
      "bgm", PHASE05_TEST_STAGE.audio.stageLayerAssetIds,
    ]);
    while (application.session.flow.screen === "playing") {
      application.update(autoCommand(application.session));
    }
    assert.deepEqual(ports.calls.findLast(([kind]) => kind === "bgm"), [
      "bgm", "audio-ref-result-theme",
    ]);
    application.dispatch("advance");
  }
  assert.equal(application.session.flow.screen, "ending");
  assert.deepEqual(ports.calls.findLast(([kind]) => kind === "bgm"), [
    "bgm", "audio-ref-ending-theme",
  ]);
  const endingStarts = ports.calls.filter(([kind, id]) => kind === "bgm" && id === "audio-ref-ending-theme").length;
  application.dispatch("complete-ending");
  assert.equal(application.session.flow.screen, "credits");
  assert.equal(ports.calls.filter(([kind, id]) => kind === "bgm" && id === "audio-ref-ending-theme").length, endingStarts);
  application.dispatch("return-title");
  assert.deepEqual(ports.calls.findLast(([kind]) => kind === "bgm"), [
    "bgm", "audio-ref-title-theme",
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

test("LOOP-01/STG-03: 解放済み第3面を選択して対応stageと音層で開始する", () => {
  const data = createDefaultSaveData();
  data.progress.tutorialSeen = true;
  data.progress.maxUnlockedStage = 2;
  const ports = createPorts({ data });
  const application = createGameApplication({
    stages: [PHASE05_TEST_STAGE, STAGE_02_CLOUD_REFINERY, STAGE_03_LIVING_ARK],
    saveRepository: ports.repository,
    audio: ports.audio,
    seed: 20261023,
  });

  application.dispatch("open-stage-select");
  application.dispatch("start-stage-2");
  assert.equal(application.session.flow.stageIndex, 2);
  application.dispatch("begin-stage");
  assert.equal(application.session.simulation.stageId, STAGE_03_LIVING_ARK.id);
  assert.deepEqual(ports.calls.findLast(([kind]) => kind === "bgm"), [
    "bgm", STAGE_03_LIVING_ARK.audio.stageLayerAssetIds,
  ]);
});

test("LOOP-01/STG-04: 解放済み第4面を選択して対応stageと音層で開始する", () => {
  const data = createDefaultSaveData();
  data.progress.tutorialSeen = true;
  data.progress.maxUnlockedStage = 3;
  const ports = createPorts({ data });
  const application = createGameApplication({
    stages: [PHASE05_TEST_STAGE, STAGE_02_CLOUD_REFINERY, STAGE_03_LIVING_ARK, STAGE_04_STELLAR_FURNACE],
    saveRepository: ports.repository,
    audio: ports.audio,
    seed: 20261024,
  });

  application.dispatch("open-stage-select");
  application.dispatch("start-stage-3");
  assert.equal(application.session.flow.stageIndex, 3);
  application.dispatch("begin-stage");
  assert.equal(application.session.simulation.stageId, STAGE_04_STELLAR_FURNACE.id);
  assert.deepEqual(ports.calls.findLast(([kind]) => kind === "bgm"), [
    "bgm", STAGE_04_STELLAR_FURNACE.audio.stageLayerAssetIds,
  ]);
});

test("LOOP-01/05/PROG-01: 4面キャンペーンを連続クリアし、段階解放を再起動後も復元する", () => {
  const data = createDefaultSaveData();
  data.progress.tutorialSeen = true;
  const ports = createPorts({ data });
  const stages = [
    STAGE_01_ORBITAL_WRECK,
    STAGE_02_CLOUD_REFINERY,
    STAGE_03_LIVING_ARK,
    STAGE_04_STELLAR_FURNACE,
  ];
  const application = createGameApplication({
    stages,
    saveRepository: ports.repository,
    audio: ports.audio,
    seed: 20261022,
    stageSeeds: [20261022, 20261022, 20261023, 20261024],
  });

  application.dispatch("start-campaign");
  for (let stageIndex = 0; stageIndex < stages.length; stageIndex += 1) {
    assert.equal(application.session.flow.stageIndex, stageIndex);
    application.dispatch("begin-stage");
    while (application.session.flow.screen === "playing") {
      application.update(automaticCombatCommand(application.session.simulation));
    }
    assert.equal(application.session.flow.screen, "result", `stage ${stageIndex + 1} did not clear`);
    assert.equal(ports.getData().progress.stages[stageIndex].cleared.standard, true);
    assert.equal(ports.getData().progress.maxUnlockedStage, Math.min(stageIndex + 1, 3));
    application.dispatch("advance");
  }
  assert.equal(application.session.flow.screen, "ending");
  application.dispatch("complete-ending");
  assert.equal(application.session.flow.screen, "credits");
  application.dispatch("return-title");

  const restored = createGameApplication({
    stages,
    saveRepository: ports.repository,
    audio: ports.audio,
    seed: 20261022,
    stageSeeds: [20261022, 20261022, 20261023, 20261024],
  });
  assert.equal(restored.session.flow.maxUnlockedStage, 3);
  restored.dispatch("open-stage-select");
  restored.dispatch("start-stage-3");
  assert.equal(restored.session.flow.stageIndex, 3);
});

test("PROG-01/03/04/REL-03: 実4面のbest・内訳・コア列を難度別に永続化して復元する", () => {
  const storage = createStorage();
  const stages = [
    STAGE_01_ORBITAL_WRECK,
    STAGE_02_CLOUD_REFINERY,
    STAGE_03_LIVING_ARK,
    STAGE_04_STELLAR_FURNACE,
  ];
  const stageSeeds = [20261022, 20261022, 20261023, 20261024];
  const audio = createPorts().audio;
  const first = createGameApplication({
    stages,
    stageSeeds,
    saveRepository: createSaveRepository({ getStorage: () => storage }),
    audio,
  });

  first.dispatch("start-campaign");
  first.dispatch("complete-tutorial");
  for (let stageIndex = 0; stageIndex < stages.length; stageIndex += 1) {
    first.dispatch("begin-stage");
    while (first.session.flow.screen === "playing") {
      first.update(automaticCombatCommand(first.session.simulation));
    }
    assert.equal(first.session.flow.screen, "result", `standard stage ${stageIndex + 1}`);
    first.dispatch("advance");
  }

  const standardProgress = first.getProgress();
  assert.equal(standardProgress.maxUnlockedStage, 3);
  for (let stageIndex = 0; stageIndex < stages.length; stageIndex += 1) {
    const best = standardProgress.stages[stageIndex].best.standard;
    assert.equal(standardProgress.stages[stageIndex].cleared.standard, true);
    assert.ok(best.score > 0);
    assert.equal(best.score, Object.values(best.breakdown).reduce((total, part) => total + part, 0));
    assert.ok(best.coreQueue.length <= 3);
  }

  const assist = createGameApplication({
    stages,
    stageSeeds,
    saveRepository: createSaveRepository({ getStorage: () => storage }),
    audio: createPorts().audio,
  });
  assist.updateSettings({ difficulty: "assist" });
  assist.dispatch("open-stage-select");
  assist.dispatch("start-stage-3");
  assist.dispatch("begin-stage");
  while (assist.session.flow.screen === "playing") {
    assist.update(automaticCombatCommand(assist.session.simulation));
  }

  const restored = createGameApplication({
    stages,
    stageSeeds,
    saveRepository: createSaveRepository({ getStorage: () => storage }),
    audio: createPorts().audio,
  });
  const restoredProgress = restored.getProgress();
  assert.equal(restored.getSettings().difficulty, "assist");
  assert.equal(restoredProgress.stages[3].cleared.assist, true);
  assert.ok(restoredProgress.stages[3].best.assist.score > 0);
  assert.deepEqual(restoredProgress.stages.map((stage) => stage.best.standard),
    standardProgress.stages.map((stage) => stage.best.standard));

  const detached = restored.getProgress();
  detached.maxUnlockedStage = 0;
  detached.stages[3].best.assist.score = 0;
  assert.equal(restored.getProgress().maxUnlockedStage, 3);
  assert.ok(restored.getProgress().stages[3].best.assist.score > 0);
});

test("PROG-05: 書込拒否後も実面のclearとbestをセッション内に維持する", () => {
  const storage = {
    getItem() { return null; },
    setItem() { throw new Error("quota denied"); },
  };
  const application = createGameApplication({
    stage: STAGE_01_ORBITAL_WRECK,
    seed: 20261022,
    saveRepository: createSaveRepository({ getStorage: () => storage }),
    audio: createPorts().audio,
  });

  application.dispatch("start-campaign");
  application.dispatch("complete-tutorial");
  application.dispatch("begin-stage");
  while (application.session.flow.screen === "playing") {
    application.update(automaticCombatCommand(application.session.simulation));
  }

  assert.equal(application.session.flow.screen, "result");
  assert.equal(application.getStatus().saveWarning, "storage-unavailable");
  assert.equal(application.getProgress().stages[0].cleared.standard, true);
  assert.equal(application.getProgress().stages[0].best.standard.score, application.session.lastRun.score);
});
