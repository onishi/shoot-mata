import { loadCanvasAssets, renderCanvasFrame } from "../src/browser/canvas-renderer.mjs";
import { createBrowserInputAdapter } from "../src/browser/input-adapter.mjs";
import { GAME_ASSETS } from "../src/content/asset-manifest.mjs";
import { PHASE05_TEST_STAGE } from "../src/content/stages/phase05-test-segment.mjs";
import { advanceFixedStep, createFixedStepClock, setClockSuspended } from "../src/core/fixed-step.mjs";
import { consumeInput } from "../src/core/input-state.mjs";
import { createStageViewModel } from "../src/ui/stage-view-model.mjs";

const app = document.querySelector("[data-app]");
const canvas = document.querySelector("[data-canvas]");
const canvasStatus = document.querySelector("[data-canvas-status]");
const runtimeStatus = document.querySelector("[data-runtime-status]");
const accessibleState = document.querySelector("[data-accessible-state]");
const inputRoot = document.querySelector("[data-input-root]");
const fullscreenButton = document.querySelector("[data-fullscreen]");
const context = canvas.getContext("2d", { alpha: false });

const state = {
  tick: 0,
  player: { x: 0.22, y: 0.5 },
  paused: false,
  settings: {
    reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
    highContrast: false,
  },
};
const clock = createFixedStepClock();
const input = createBrowserInputAdapter({ keyboardTarget: window, gameTarget: inputRoot });
input.setGameplayActive(true);

function update(stepSeconds) {
  const command = consumeInput(input.state);
  if (command.pause) state.paused = !state.paused;
  if (state.paused) return;
  const length = Math.hypot(command.moveX, command.moveY) || 1;
  state.player.x = Math.min(0.9, Math.max(0.08, state.player.x + ((command.moveX / length) * stepSeconds * 0.45)));
  state.player.y = Math.min(0.74, Math.max(0.26, state.player.y + ((command.moveY / length) * stepSeconds * 0.45)));
  state.tick = (state.tick + 1) % PHASE05_TEST_STAGE.durationTicks;
}

function createView() {
  return createStageViewModel({
    stage: PHASE05_TEST_STAGE,
    tick: state.tick,
    score: state.tick * 10,
    lives: 3,
    coreQueue: ["red", "blue", "yellow"],
    weapon: { label: "LANCE", level: 2 },
    settings: state.settings,
    boss: state.tick >= 900 ? { current: 1200 - state.tick, maximum: 300 } : null,
    actors: [
      { id: "player", assetId: "player-interceptor", x: state.player.x, y: state.player.y, width: 0.27, height: 0.27, tone: "player" },
      { id: "enemy", assetId: "enemy-stg01-01", x: 0.78, y: 0.46, width: 0.18, height: 0.25, tone: "enemy" },
      { id: "core-red", assetId: "core-red", x: 0.5, y: 0.4, width: 0.06, height: 0.1, tone: "core" },
      { id: "core-blue", assetId: "core-blue", x: 0.59, y: 0.55, width: 0.06, height: 0.1, tone: "core" },
      { id: "core-yellow", assetId: "core-yellow", x: 0.68, y: 0.36, width: 0.06, height: 0.1, tone: "core" },
    ],
  });
}

function syncSettingButtons() {
  for (const button of document.querySelectorAll("[data-setting]")) {
    button.setAttribute("aria-pressed", String(state.settings[button.dataset.setting]));
  }
  app.dataset.highContrast = String(state.settings.highContrast);
}

for (const button of document.querySelectorAll("[data-setting]")) {
  button.addEventListener("click", () => {
    const key = button.dataset.setting;
    state.settings[key] = !state.settings[key];
    syncSettingButtons();
  });
}
syncSettingButtons();

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
  runtimeStatus.textContent = "RUNNING / P: PAUSE";
  let lastAnnouncement = "";
  const frame = (time) => {
    advanceFixedStep(clock, time, update);
    const view = createView();
    renderCanvasFrame(context, view, assets);
    const announcement = `${state.paused ? "ポーズ中。" : ""}${view.accessibleSummary}`;
    if (announcement !== lastAnnouncement && (state.paused || view.tick % 300 === 0)) {
      accessibleState.textContent = announcement;
      lastAnnouncement = announcement;
    }
    runtimeStatus.textContent = state.paused ? "PAUSED / P: RESUME" : "RUNNING / P: PAUSE";
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
} catch (error) {
  canvasStatus.textContent = "表示素材を読み込めませんでした。再読み込みしてください。";
  runtimeStatus.textContent = "ASSET ERROR";
  console.error(error);
}
