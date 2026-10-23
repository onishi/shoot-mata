import { loadCanvasAssets, renderCanvasFrame } from "../src/browser/canvas-renderer.mjs";
import { createAutomaticPlaythrough } from "../src/browser/automatic-playthrough.mjs";
import { loadBrowserAudioAssets } from "../src/browser/audio-assets.mjs";
import { createBrowserAudioAdapter } from "../src/browser/audio-adapter.mjs";
import { createBrowserInputAdapter } from "../src/browser/input-adapter.mjs";
import { auditRuntimeResources, createRuntimeMonitor, recordRuntimeFrame, suspendRuntimeMonitor } from "../src/browser/runtime-monitor.mjs";
import { createGameApplication } from "../src/app/game-application.mjs";
import { GAME_ASSETS } from "../src/content/asset-manifest.mjs";
import { STAGE_01_ORBITAL_WRECK } from "../src/content/stages/stage-01-orbital-wreck.mjs";
import { STAGE_02_CLOUD_REFINERY } from "../src/content/stages/stage-02-cloud-refinery.mjs";
import { STAGE_03_LIVING_ARK } from "../src/content/stages/stage-03-living-ark.mjs";
import { STAGE_04_STELLAR_FURNACE } from "../src/content/stages/stage-04-stellar-furnace.mjs";
import { advanceFixedStep, createFixedStepClock, setClockSuspended } from "../src/core/fixed-step.mjs";
import { getGameSessionSnapshot } from "../src/core/game-session.mjs";
import { consumeInput } from "../src/core/input-state.mjs";
import { createSaveRepository } from "../src/ports/save-repository.mjs";
import { createStageViewModel } from "../src/ui/stage-view-model.mjs";

const app = document.querySelector("[data-app]");
const canvas = document.querySelector("[data-canvas]");
const gameShell = document.querySelector("[data-game-shell]");
const stageLabel = document.querySelector("[data-stage-label]");
const canvasStatus = document.querySelector("[data-canvas-status]");
const runtimeStatus = document.querySelector("[data-runtime-status]");
const warningStatus = document.querySelector("[data-warning-status]");
const qaStatus = document.querySelector("[data-qa-status]");
const accessibleState = document.querySelector("[data-accessible-state]");
const inputRoot = document.querySelector("[data-input-root]");
const fullscreenButton = document.querySelector("[data-fullscreen]");
const screenPanel = document.querySelector("[data-screen-panel]");
const screenKicker = document.querySelector("[data-screen-kicker]");
const screenTitle = document.querySelector("[data-screen-title]");
const screenCopy = document.querySelector("[data-screen-copy]");
const screenActions = document.querySelector("[data-screen-actions]");
const context = canvas.getContext("2d", { alpha: false });
const stages = Object.freeze([
  STAGE_01_ORBITAL_WRECK,
  STAGE_02_CLOUD_REFINERY,
  STAGE_03_LIVING_ARK,
  STAGE_04_STELLAR_FURNACE,
]);
const stageLabels = Object.freeze(["ORBITAL WRECK", "CLOUD REFINERY", "LIVING ARK", "STELLAR FURNACE"]);
const query = new URLSearchParams(location.search);
const qaStageIndex = Object.freeze({ stage01: 0, stage02: 1, stage03: 2, stage04: 3 })[query.get("qa")] ?? null;
const qaSeeds = Object.freeze([20261022, 20261022, 20261023, 20261024]);
const selectedStage = () => stages[session.flow.stageIndex ?? 0];

const audio = createBrowserAudioAdapter();
const application = createGameApplication({
  stages,
  saveRepository: createSaveRepository(),
  audio,
  seed: qaStageIndex === null ? 20261022 : qaSeeds[qaStageIndex],
  minimumUnlockedStage: qaStageIndex ?? 0,
});
const session = application.session;
const savedSettings = application.getSettings();
const displaySettings = {
  reducedMotion: savedSettings.reducedMotion || matchMedia("(prefers-reduced-motion: reduce)").matches,
  highContrast: savedSettings.highContrast,
};
const qaEnabled = qaStageIndex !== null;
const qaDriver = qaEnabled ? createAutomaticPlaythrough({ stageIndex: qaStageIndex }) : null;
const clock = createFixedStepClock(qaEnabled ? { stepMs: 1000 / 240 } : undefined);
const input = createBrowserInputAdapter({ keyboardTarget: window, gameTarget: inputRoot });
const runtimeMonitor = createRuntimeMonitor();
let renderedScreenKey = "";
let audioLoadPromise = null;
let audioAssetWarning = null;

function syncRuntimeResources() {
  const resources = auditRuntimeResources(performance.getEntriesByType("resource"), location.origin);
  runtimeStatus.dataset.resourceCount = String(resources.resourceCount);
  runtimeStatus.dataset.encodedBytes = String(resources.encodedBytes);
  runtimeStatus.dataset.transferBytes = String(resources.transferBytes);
  runtimeStatus.dataset.externalOrigins = resources.externalOrigins.join(",");
  runtimeStatus.dataset.loadEventMs = String(Math.round(performance.getEntriesByType("navigation")[0]?.loadEventEnd ?? 0));
}

window.addEventListener("load", () => setTimeout(syncRuntimeResources, 0), { once: true });

const WARNING_MESSAGES = Object.freeze({
  "storage-unavailable": "保存領域を利用できません。このセッション内だけで継続します。",
  "storage-read-failed": "保存データを読めません。このセッション内だけで継続します。",
  "storage-write-failed": "保存できませんでした。このセッション内の変更は維持します。",
  "invalid-json": "破損した保存データを退避し、初期状態で開始しました。",
  "invalid-schema": "不正な保存データを退避し、初期状態で開始しました。",
  "future-version": "新しい版の保存データは読まず、初期状態で開始しました。",
  "unsupported-version": "未対応の保存データを退避し、初期状態で開始しました。",
  "migration-failed": "保存データを移行できず、初期状態で開始しました。",
  "audio-context-create-failed": "音声を開始できません。無音のままプレイできます。",
  "audio-context-resume-failed": "音声の再開を拒否されました。無音のままプレイできます。",
  "audio-source-load-failed": "一部の音源を読み込めません。利用可能な音だけで継続します。",
});

function syncWarning() {
  const status = application.getStatus();
  const warning = audioAssetWarning ?? status.audioWarning ?? status.saveWarning;
  warningStatus.hidden = warning === null;
  warningStatus.textContent = warning ? (WARNING_MESSAGES[warning] ?? `警告: ${warning}`) : "";
}

function ensureAudioAssets() {
  if (audioLoadPromise) return audioLoadPromise;
  audioLoadPromise = application.activateAudio().then(async ({ audible }) => {
    if (!audible) return [];
    const results = await loadBrowserAudioAssets(audio);
    if (results.some(({ loaded }) => !loaded)) audioAssetWarning = "audio-source-load-failed";
    if (session.flow.screen === "playing") audio.playBgm(selectedStage().audio.stageLayerAssetIds);
    syncRuntimeResources();
    syncWarning();
    return results;
  });
  return audioLoadPromise;
}

function screenDefinition() {
  if (session.flow.confirmation) {
    const restarting = session.flow.confirmation === "restart";
    return {
      kicker: "CONFIRMATION",
      title: restarting ? "この区間を再開始しますか？" : "タイトルへ戻りますか？",
      copy: restarting ? "現在の戦闘進行は失われ、同じseedで最初から始まります。" : "現在の戦闘進行は失われます。",
      actions: [["confirm", "実行", true], ["cancel", "キャンセル"]],
    };
  }
  const score = session.lastRun?.score ?? 0;
  const screens = {
    title: {
      kicker: "PHASE 07 / CONTENT BUILD",
      title: "SHOOT MATA v02",
      copy: "キャンペーンを開始するか、解放済みステージを選択します。",
      actions: [["start-campaign", "CAMPAIGN START", true], ["open-stage-select", "ステージ選択"]],
    },
    stageSelect: {
      kicker: "STAGE SELECT",
      title: "出撃先を選択",
      copy: "解放済みステージは単独で開始し、同じseedで再挑戦できます。",
      actions: [
        ...stages.slice(0, session.flow.maxUnlockedStage + 1)
          .map((stage, index) => [`start-stage-${index}`, stage.title, index === 0]),
        ["return-title", "タイトルへ戻る"],
      ],
    },
    tutorial: {
      kicker: "FIRST FLIGHT",
      title: "操作説明",
      copy: "矢印/WASDで移動、Z/Spaceで射撃、Pでポーズ。コアは取得順に3枠へ入り、先頭色が主武器になります。",
      actions: [["complete-tutorial", "次へ", true]],
    },
    stageIntro: {
      kicker: `ATTEMPT ${session.flow.attempt}`,
      title: selectedStage().title,
      copy: `seed ${session.seed}。同じ入力列なら同じ戦闘結果を再現します。`,
      actions: [["begin-stage", "出撃", true]],
    },
    paused: {
      kicker: "PAUSED",
      title: "一時停止",
      copy: "戦闘tickは停止しています。Pまたは再開で戻ります。",
      actions: [["resume", "再開", true], ["request-restart", "最初から"], ["request-title", "タイトルへ"]],
    },
    result: {
      kicker: "STAGE CLEAR",
      title: `SCORE ${score}`,
      copy: `敵 ${session.lastRun?.scoreBreakdown.enemy ?? 0} / コア ${session.lastRun?.scoreBreakdown.core ?? 0} / 連続撃破 ${session.lastRun?.scoreBreakdown.streak ?? 0} / 無被弾 ${session.lastRun?.scoreBreakdown.noHit ?? 0}`,
      actions: [
        ["retry", "同じseedで再挑戦", true],
        ...(session.flow.mode === "single"
          ? [["advance", "ステージ選択へ"]]
          : session.flow.stageIndex + 1 < stages.length
            ? [["advance", "次のステージへ"]]
            : [["open-stage-select", "ステージ選択へ"]]),
      ],
    },
    gameOver: {
      kicker: "PLAYER DEFEATED",
      title: "GAME OVER",
      copy: `SCORE ${score}。同じ条件で直ちに再挑戦できます。`,
      actions: [
        ["retry", "再挑戦", true],
        ...(session.flow.continuesRemaining > 0
          ? [["continue", `コンティニュー (${session.flow.continuesRemaining})`]]
          : []),
      ],
    },
  };
  return screens[session.flow.screen] ?? null;
}

function syncScreen() {
  const stage = selectedStage();
  const stageIndex = session.flow.stageIndex ?? 0;
  const stageName = stage.title.replace(/^STAGE [0-9]+ /, "");
  stageLabel.textContent = stageLabels[stageIndex];
  gameShell.setAttribute("aria-label", stage.title);
  canvas.setAttribute("aria-label", `${stageName}。矢印またはWASDで移動、ZまたはSpaceで射撃、Pでポーズ`);
  document.title = `shoot-mata v02 — ${stage.title}`;
  const definition = screenDefinition();
  const key = `${session.flow.screen}:${session.flow.confirmation}:${session.flow.attempt}:${session.lastRun?.score ?? 0}`;
  const playing = session.flow.screen === "playing";
  input.setGameplayActive(playing);
  inputRoot.hidden = !playing;
  screenPanel.hidden = definition === null;
  if (!definition || key === renderedScreenKey) return;
  renderedScreenKey = key;
  screenKicker.textContent = definition.kicker;
  screenTitle.textContent = definition.title;
  screenCopy.textContent = definition.copy;
  screenActions.replaceChildren(...definition.actions.map(([action, label, primary = false]) => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.action = action;
    button.dataset.primary = String(primary);
    button.textContent = label;
    return button;
  }));
}

function update() {
  const command = qaDriver ? qaDriver.nextCommand(session) : consumeInput(input.state);
  const wasTitle = session.flow.screen === "title";
  const wasStageSelect = session.flow.screen === "stageSelect";
  application.update(command);
  qaDriver?.observe(session);
  if ((wasTitle && command.confirm === true)
    || (wasStageSelect && Number.isInteger(command.stageIndex))) ensureAudioAssets();
  syncScreen();
  syncWarning();
  syncQaStatus();
}

function syncQaStatus() {
  if (!qaDriver) return;
  const status = qaDriver.status(session);
  qaStatus.hidden = false;
  qaStatus.dataset.screen = status.screen;
  qaStatus.dataset.attempt = String(status.attempt);
  qaStatus.dataset.tick = String(status.tick);
  qaStatus.dataset.completedAttempts = String(status.completedAttempts);
  qaStatus.dataset.replayMatches = String(status.replayMatches);
  qaStatus.dataset.failure = status.failure ?? "";
  qaStatus.dataset.milestones = status.milestones.join(",");
  qaStatus.textContent = status.failure
    ? `QA FAIL / ${status.failure}`
    : status.stopped
      ? `QA PASS / ${status.completedAttempts} RUNS / SAME SEED ${status.replayMatches ? "MATCH" : "MISMATCH"}`
      : `QA AUTO / ATTEMPT ${status.attempt} / ${status.screen.toUpperCase()} / TICK ${status.tick}`;
}

function createView() {
  const snapshot = getGameSessionSnapshot(session);
  return createStageViewModel({
    stage: selectedStage(),
    tick: snapshot.tick,
    score: snapshot.score,
    lives: snapshot.player.lives,
    coreQueue: snapshot.coreQueue,
    weapon: { label: snapshot.weapon.weaponLabel, level: snapshot.weapon.level },
    settings: displaySettings,
    boss: snapshot.boss,
    actors: snapshot.actors,
    projectiles: snapshot.projectiles,
    effects: snapshot.effects,
  });
}

screenActions.addEventListener("click", (event) => {
  const action = event.target.closest("[data-action]")?.dataset.action;
  if (!action) return;
  application.dispatch(action);
  if (action === "start-campaign" || action.startsWith("start-stage-")) ensureAudioAssets();
  syncScreen();
  syncWarning();
});

function syncSettingButtons() {
  for (const button of document.querySelectorAll("[data-setting]")) {
    button.setAttribute("aria-pressed", String(displaySettings[button.dataset.setting]));
  }
  app.dataset.highContrast = String(displaySettings.highContrast);
  const settings = application.getSettings();
  for (const inputElement of document.querySelectorAll("[data-volume]")) {
    inputElement.value = String(settings[inputElement.dataset.volume]);
  }
  for (const button of document.querySelectorAll("[data-audio-mute]")) {
    button.setAttribute("aria-pressed", String(settings[button.dataset.audioMute]));
  }
}

for (const button of document.querySelectorAll("[data-setting]")) {
  button.addEventListener("click", () => {
    const key = button.dataset.setting;
    displaySettings[key] = !displaySettings[key];
    application.updateSettings({ [key]: displaySettings[key] });
    syncSettingButtons();
    syncWarning();
  });
}

for (const range of document.querySelectorAll("[data-volume]")) {
  range.addEventListener("input", () => {
    application.updateSettings({ [range.dataset.volume]: Number(range.value) });
    syncWarning();
  });
}

for (const button of document.querySelectorAll("[data-audio-mute]")) {
  button.addEventListener("click", () => {
    const key = button.dataset.audioMute;
    application.updateSettings({ [key]: !application.getSettings()[key] });
    syncSettingButtons();
    syncWarning();
  });
}
syncSettingButtons();
syncScreen();
syncWarning();
syncQaStatus();

fullscreenButton.addEventListener("click", async () => {
  if (!app.requestFullscreen) {
    runtimeStatus.textContent = "フルスクリーン非対応（通常表示を継続）";
    return;
  }
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await app.requestFullscreen();
  } catch {
    runtimeStatus.textContent = "フルスクリーンを開始できません（通常表示を継続）";
  }
});

document.addEventListener("fullscreenchange", () => {
  fullscreenButton.textContent = document.fullscreenElement ? "通常表示" : "フルスクリーン";
});

document.addEventListener("visibilitychange", () => setClockSuspended(clock, document.hidden));

try {
  const assets = await loadCanvasAssets(GAME_ASSETS);
  canvasStatus.hidden = true;
  syncRuntimeResources();
  runtimeStatus.dataset.heapStartBytes = String(performance.memory?.usedJSHeapSize ?? 0);
  let lastAnnouncement = "";
  const frame = (time) => {
    const step = advanceFixedStep(clock, time, update);
    const runtimeSample = session.flow.screen === "playing"
      ? recordRuntimeFrame(runtimeMonitor, time, step.droppedDeltaMs)
      : (suspendRuntimeMonitor(runtimeMonitor), runtimeMonitor.completed);
    if (runtimeSample) {
      runtimeStatus.dataset.fps = runtimeSample.fps.toFixed(1);
      runtimeStatus.dataset.longFrames = String(runtimeSample.longFrames);
      runtimeStatus.dataset.maxFrameMs = runtimeSample.maxFrameMs.toFixed(1);
      runtimeStatus.dataset.droppedMs = runtimeSample.droppedMs.toFixed(1);
      runtimeStatus.dataset.heapEndBytes = String(performance.memory?.usedJSHeapSize ?? 0);
    }
    const view = createView();
    renderCanvasFrame(context, view, assets);
    const announcement = `${session.flow.screen}。${view.accessibleSummary}`;
    if (announcement !== lastAnnouncement && (session.flow.screen !== "playing" || view.tick % 300 === 0)) {
      accessibleState.textContent = announcement;
      lastAnnouncement = announcement;
    }
    runtimeStatus.textContent = session.flow.screen === "playing"
      ? `RUNNING / ${runtimeSample ? `${runtimeSample.fps.toFixed(1)} FPS / ` : ""}P: PAUSE`
      : session.flow.screen.toUpperCase();
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
} catch (error) {
  canvasStatus.textContent = "表示素材を読み込めませんでした。再読み込みしてください。";
  runtimeStatus.textContent = "ASSET ERROR";
  console.error(error);
}
