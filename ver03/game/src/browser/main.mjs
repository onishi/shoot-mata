import { automaticInput, beginCampaign, beginStage, createGame, openStageSelect, snapshot, updateGame } from "../core/game.mjs";
import { createAudioSystem } from "./audio.mjs";
import { render } from "./renderer.mjs";

const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
const params = new URLSearchParams(location.search);
const autoplay = params.get("autoplay") === "1";
const speed = Math.max(1, Math.min(240, Number(params.get("speed")) || 1));
const keys = new Set();
const pressed = new Set();
const game = createGame();
game.unlockedStage = loadUnlockedStage();
let savedUnlockedStage = game.unlockedStage;
const savedAudio = loadAudioSettings();
const audio = createAudioSystem({ settings: savedAudio });
game.audioSettingsOpen = false;
game.audioSettingRow = 0;
game.audioSettings = audio.status().settings;
let previous = performance.now();
let accumulator = 0;
let frameMonitor = createFrameMonitor();

function createFrameMonitor() {
  return { active: false, skipNext: false, intervals: [], workTimes: [] };
}

function framePerformance() {
  const summarize = (values) => {
    const sorted = [...values].sort((a, b) => a - b);
    const percentile = (value) => sorted.length ? sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * value) - 1)] : 0;
    return {
      average: sorted.length ? sorted.reduce((sum, value) => sum + value, 0) / sorted.length : 0,
      p95: percentile(0.95),
      max: sorted.at(-1) ?? 0
    };
  };
  const intervals = summarize(frameMonitor.intervals);
  const work = summarize(frameMonitor.workTimes);
  const droppedFrames = frameMonitor.intervals.filter((interval) => interval > 25).length;
  return {
    samples: frameMonitor.workTimes.length,
    averageMs: intervals.average,
    p95Ms: intervals.p95,
    maxMs: intervals.max,
    droppedFrames,
    droppedRatio: frameMonitor.intervals.length ? droppedFrames / frameMonitor.intervals.length : 0,
    averageWorkMs: work.average,
    p95WorkMs: work.p95,
    maxWorkMs: work.max
  };
}

addEventListener("keydown", (event) => {
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(event.code)) event.preventDefault();
  if (game.screen === "title" && handleAudioSettingsKey(event.code)) return;
  if (event.code === "KeyT" && game.screen === "title") {
    void audio.activate(game);
    openStageSelect(game);
    return;
  }
  if (!keys.has(event.code)) pressed.add(event.code);
  keys.add(event.code);
  if (event.code === "Enter" && game.screen === "title") {
    void audio.activate(game);
    const showHowTo = localStorage.getItem("shoot-mata-v03-how-to-seen") !== "1";
    if (showHowTo) localStorage.setItem("shoot-mata-v03-how-to-seen", "1");
    beginCampaign(game, { showHowTo });
    pressed.delete("Enter");
  }
});
addEventListener("keyup", (event) => keys.delete(event.code));

function loadAudioSettings() {
  try {
    const parsed = JSON.parse(localStorage.getItem("shoot-mata-v03-audio") ?? "null");
    return parsed && typeof parsed === "object" ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function saveAudioSettings(settings) {
  try { localStorage.setItem("shoot-mata-v03-audio", JSON.stringify(settings)); } catch { /* Storage is optional. */ }
}

function loadUnlockedStage() {
  const value = Number(localStorage.getItem("shoot-mata-v03-unlocked-stage"));
  return Number.isInteger(value) ? Math.max(1, Math.min(6, value)) : 1;
}

function saveUnlockedStage(value) {
  try { localStorage.setItem("shoot-mata-v03-unlocked-stage", String(value)); } catch { /* Storage is optional. */ }
}

function handleAudioSettingsKey(code) {
  if (!game.audioSettingsOpen && code !== "KeyS") return false;
  if (code === "KeyS" || code === "Escape" || code === "Enter") {
    game.audioSettingsOpen = !game.audioSettingsOpen;
    if (game.audioSettingsOpen) void audio.activate(game).then(() => audio.playUi());
    else audio.playUi();
    return true;
  }
  if (["ArrowUp", "ArrowDown"].includes(code)) {
    game.audioSettingRow = game.audioSettingRow === 0 ? 1 : 0;
    audio.playUi();
    return true;
  }
  if (["ArrowLeft", "ArrowRight"].includes(code)) {
    const key = game.audioSettingRow === 0 ? "bgmVolume" : "sfxVolume";
    const delta = code === "ArrowRight" ? 0.05 : -0.05;
    const settings = audio.setVolumes({ [key]: game.audioSettings[key] + delta });
    game.audioSettings = settings;
    saveAudioSettings(settings);
    audio.playUi();
    return true;
  }
  return true;
}

function keyboardInput() {
  return {
    up: keys.has("ArrowUp") || keys.has("KeyW"),
    down: keys.has("ArrowDown") || keys.has("KeyS"),
    left: keys.has("ArrowLeft") || keys.has("KeyA"),
    right: keys.has("ArrowRight") || keys.has("KeyD"),
    fire: keys.has("KeyZ") || keys.has("Space"),
    upPressed: pressed.has("ArrowUp") || pressed.has("KeyW"),
    downPressed: pressed.has("ArrowDown") || pressed.has("KeyS"),
    pausePressed: pressed.has("KeyP"),
    confirmPressed: pressed.has("Enter"),
    cancelPressed: pressed.has("Escape")
  };
}

function frame(now) {
  const frameStart = performance.now();
  let recordPerformance = false;
  const elapsed = Math.min(100, now - previous);
  previous = now;
  if (frameMonitor.active) {
    if (frameMonitor.skipNext) frameMonitor.skipNext = false;
    else {
      frameMonitor.intervals.push(elapsed);
      recordPerformance = true;
    }
  }
  accumulator += elapsed;
  const normalSteps = Math.min(5, Math.floor(accumulator / (1000 / 60)));
  if (normalSteps > 0) accumulator -= normalSteps * (1000 / 60);
  const steps = autoplay ? speed : normalSteps;
  const input = autoplay ? null : keyboardInput();
  for (let i = 0; i < steps; i += 1) {
    updateGame(game, autoplay ? automaticInput(game) : {
      ...input,
      upPressed: i === 0 && input.upPressed,
      downPressed: i === 0 && input.downPressed,
      pausePressed: i === 0 && input.pausePressed,
      confirmPressed: i === 0 && input.confirmPressed,
      cancelPressed: i === 0 && input.cancelPressed
    });
  }
  if (game.unlockedStage !== savedUnlockedStage) {
    saveUnlockedStage(game.unlockedStage);
    savedUnlockedStage = game.unlockedStage;
  }
  audio.sync(game);
  if (steps > 0) pressed.clear();
  render(ctx, game);
  if (recordPerformance) frameMonitor.workTimes.push(performance.now() - frameStart);
  requestAnimationFrame(frame);
}

window.__shootMata = {
  start: () => beginStage(game),
  state: () => ({ ...snapshot(game), audio: audio.status() }),
  setAudio(settings) {
    const next = audio.setVolumes(settings);
    game.audioSettings = next;
    saveAudioSettings(next);
    return next;
  },
  advance(ticks, useAutomaticInput = true) {
    for (let i = 0; i < ticks; i += 1) updateGame(game, useAutomaticInput ? automaticInput(game) : {});
    audio.sync(game);
    render(ctx, game);
    return { ...snapshot(game), audio: audio.status() };
  },
  startPerformanceMonitor() {
    frameMonitor = { active: true, skipNext: true, intervals: [], workTimes: [] };
  },
  stopPerformanceMonitor() {
    frameMonitor.active = false;
    return framePerformance();
  }
};

if (autoplay) beginStage(game);
render(ctx, game);
requestAnimationFrame(frame);
