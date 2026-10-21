import { loadCanvasAssets, renderCanvasFrame } from "../src/browser/canvas-renderer.mjs";
import { createBrowserInputAdapter } from "../src/browser/input-adapter.mjs";
import { GAME_ASSETS } from "../src/content/asset-manifest.mjs";
import { PHASE05_TEST_STAGE } from "../src/content/stages/phase05-test-segment.mjs";
import { advanceFixedStep, createFixedStepClock, setClockSuspended } from "../src/core/fixed-step.mjs";
import {
  createGameSession,
  dispatchGameAction,
  getGameSessionSnapshot,
  updateGameSession,
} from "../src/core/game-session.mjs";
import { consumeInput } from "../src/core/input-state.mjs";
import { createStageViewModel } from "../src/ui/stage-view-model.mjs";

const app = document.querySelector("[data-app]");
const canvas = document.querySelector("[data-canvas]");
const canvasStatus = document.querySelector("[data-canvas-status]");
const runtimeStatus = document.querySelector("[data-runtime-status]");
const accessibleState = document.querySelector("[data-accessible-state]");
const inputRoot = document.querySelector("[data-input-root]");
const fullscreenButton = document.querySelector("[data-fullscreen]");
const screenPanel = document.querySelector("[data-screen-panel]");
const screenKicker = document.querySelector("[data-screen-kicker]");
const screenTitle = document.querySelector("[data-screen-title]");
const screenCopy = document.querySelector("[data-screen-copy]");
const screenActions = document.querySelector("[data-screen-actions]");
const context = canvas.getContext("2d", { alpha: false });

const displaySettings = {
  reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
  highContrast: false,
};
const session = createGameSession({ seed: 20261022 });
const clock = createFixedStepClock();
const input = createBrowserInputAdapter({ keyboardTarget: window, gameTarget: inputRoot });
let renderedScreenKey = "";

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
      kicker: "PHASE 05 / PLAYABLE FOUNDATION",
      title: "SHOOT MATA v02",
      copy: "決定的な技術検証区間です。EnterまたはSTARTで開始します。",
      actions: [["start-campaign", "START", true]],
    },
    tutorial: {
      kicker: "FIRST FLIGHT",
      title: "操作説明",
      copy: "矢印/WASDで移動、Z/Spaceで射撃、Pでポーズ。コアは取得順に3枠へ入り、先頭色が主武器になります。",
      actions: [["complete-tutorial", "次へ", true]],
    },
    stageIntro: {
      kicker: `ATTEMPT ${session.flow.attempt}`,
      title: PHASE05_TEST_STAGE.title,
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
      actions: [["retry", "同じseedで再挑戦", true]],
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
  updateGameSession(session, PHASE05_TEST_STAGE, consumeInput(input.state));
  syncScreen();
}

function createView() {
  const snapshot = getGameSessionSnapshot(session);
  return createStageViewModel({
    stage: PHASE05_TEST_STAGE,
    tick: snapshot.tick,
    score: snapshot.score,
    lives: snapshot.player.lives,
    coreQueue: snapshot.coreQueue,
    weapon: { label: snapshot.weapon.weaponLabel, level: Math.max(1, snapshot.weapon.level) },
    settings: displaySettings,
    boss: snapshot.boss,
    actors: snapshot.actors,
  });
}

screenActions.addEventListener("click", (event) => {
  const action = event.target.closest("[data-action]")?.dataset.action;
  if (!action) return;
  dispatchGameAction(session, PHASE05_TEST_STAGE, action);
  syncScreen();
});

function syncSettingButtons() {
  for (const button of document.querySelectorAll("[data-setting]")) {
    button.setAttribute("aria-pressed", String(displaySettings[button.dataset.setting]));
  }
  app.dataset.highContrast = String(displaySettings.highContrast);
}

for (const button of document.querySelectorAll("[data-setting]")) {
  button.addEventListener("click", () => {
    const key = button.dataset.setting;
    displaySettings[key] = !displaySettings[key];
    syncSettingButtons();
  });
}
syncSettingButtons();
syncScreen();

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
  let lastAnnouncement = "";
  const frame = (time) => {
    advanceFixedStep(clock, time, update);
    const view = createView();
    renderCanvasFrame(context, view, assets);
    const announcement = `${session.flow.screen}。${view.accessibleSummary}`;
    if (announcement !== lastAnnouncement && (session.flow.screen !== "playing" || view.tick % 300 === 0)) {
      accessibleState.textContent = announcement;
      lastAnnouncement = announcement;
    }
    runtimeStatus.textContent = session.flow.screen === "playing"
      ? "RUNNING / P: PAUSE"
      : session.flow.screen.toUpperCase();
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
} catch (error) {
  canvasStatus.textContent = "表示素材を読み込めませんでした。再読み込みしてください。";
  runtimeStatus.textContent = "ASSET ERROR";
  console.error(error);
}
