import "./style.css";
import {
  HEIGHT,
  LEVELS,
  WIDTH,
  advanceMoths,
  continueAfterWin,
  createGame,
  flashNeedleFor,
  levelFor,
  movePlayer,
  restart,
  start,
  togglePause,
  type Direction,
  type GameState,
  type Point,
} from "./model";
import { loadPreferences, savePreferences, type Preferences } from "./preferences";
import { loadProgress, recordWin, saveProgress, type CampaignProgress } from "./progress";

const canvas = document.querySelector<HTMLCanvasElement>("#game")!;
const live = document.querySelector<HTMLParagraphElement>("#live")!;
const ctx = canvas.getContext("2d")!;

let state = createGame();
let progress: CampaignProgress = loadProgress(localStorage, LEVELS.length);
let titleChoice: "continue" | "new" = progress.highestUnlocked > 0 ? "continue" : "new";
let preferences: Preferences = loadPreferences(localStorage, {
  volume: 0.75,
  reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
});
let settingsOpen = false;
let audio: AudioContext | null = null;
let lastMothStep = performance.now();
let pulse = 0;
const board = { x: 170, y: 94, cell: 31 };

function pixel(point: Point): Point {
  return { x: board.x + point.x * board.cell, y: board.y + point.y * board.cell };
}

function announce(message: string) {
  live.textContent = "";
  requestAnimationFrame(() => { live.textContent = message; });
}

function tone(frequency: number, duration: number, type: OscillatorType = "sine", gain = 0.05) {
  if (preferences.volume === 0) return;
  audio ??= new AudioContext();
  if (audio.state === "suspended") void audio.resume();
  const oscillator = audio.createOscillator();
  const volume = audio.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, audio.currentTime);
  volume.gain.setValueAtTime(gain * preferences.volume, audio.currentTime);
  volume.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + duration);
  oscillator.connect(volume).connect(audio.destination);
  oscillator.start();
  oscillator.stop(audio.currentTime + duration);
}

function playEvent(previous: GameState, next: GameState) {
  if (previous === next) return;
  if (next.lastEvent === "stitch") tone(420 + next.trail.length * 12, 0.06, "triangle", 0.035);
  if (next.lastEvent === "move") tone(180, 0.025, "square", 0.015);
  if (next.lastEvent === "blocked") tone(100, 0.05, "square", 0.02);
  if (next.lastEvent === "claim") {
    tone(330, 0.35, "sine", 0.05);
    setTimeout(() => tone(495, 0.32, "sine", 0.04), 70);
    pulse = 1;
  }
  if (next.lastEvent === "win") {
    [392, 494, 587].forEach((note, index) => setTimeout(() => tone(note, 0.5, "sine", 0.05), index * 90));
    pulse = 1;
  }
  if (next.lastEvent === "cut" && previous.spools !== next.spools) tone(78, 0.5, "sawtooth", 0.07);
}

function roundedRect(x: number, y: number, width: number, height: number, radius: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
}

function drawBackdrop(time: number) {
  const motionTime = preferences.reducedMotion ? 0 : time;
  const gradient = ctx.createRadialGradient(480, 235, 20, 480, 270, 570);
  gradient.addColorStop(0, "#242851");
  gradient.addColorStop(0.52, "#0b0e25");
  gradient.addColorStop(1, "#03040c");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.globalAlpha = 0.22;
  for (let index = 0; index < 46; index += 1) {
    const x = (index * 197 + 71) % 960;
    const y = (index * 89 + Math.sin(motionTime / 1700 + index) * 5 + 30) % 500;
    ctx.fillStyle = index % 5 === 0 ? "#f6d78c" : "#8297c7";
    ctx.fillRect(x, y, index % 7 === 0 ? 2 : 1, index % 7 === 0 ? 2 : 1);
  }
  ctx.globalAlpha = 1;
}

function drawTitle(time: number) {
  drawBackdrop(time);
  ctx.textAlign = "center";
  ctx.fillStyle = "#b38a4f";
  ctx.font = "12px Georgia";
  ctx.letterSpacing = "5px";
  ctx.fillText("THE NIGHT-SKY ATELIER", 480, 117);
  ctx.fillStyle = "#f3dfaa";
  ctx.font = "700 72px Georgia";
  ctx.letterSpacing = "9px";
  ctx.fillText("DUSKLOOM", 480, 219);
  ctx.strokeStyle = "#b98d4b";
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(270, 248); ctx.lineTo(690, 248); ctx.stroke();
  ctx.fillStyle = "#aab6cd";
  ctx.font = "18px Georgia";
  ctx.letterSpacing = "1px";
  ctx.fillText("Leave the safe selvage. Stitch the torn dark closed.", 480, 290);
  const hasContinue = progress.highestUnlocked > 0;
  const shimmer = preferences.reducedMotion ? 0.8 : 0.65 + Math.sin(time / 420) * 0.22;
  ctx.font = "700 15px Georgia";
  ctx.letterSpacing = "2px";
  if (hasContinue) {
    const continueLabel = `CONTINUE — PANEL ${progress.highestUnlocked + 1}: ${LEVELS[progress.highestUnlocked].name}`;
    ctx.fillStyle = titleChoice === "continue" ? `rgba(242, 213, 138, ${shimmer})` : "#69758d";
    ctx.fillText(`${titleChoice === "continue" ? "◆" : "◇"}  ${continueLabel}`, 480, 352);
    ctx.fillStyle = titleChoice === "new" ? `rgba(242, 213, 138, ${shimmer})` : "#69758d";
    ctx.fillText(`${titleChoice === "new" ? "◆" : "◇"}  START AT PANEL I`, 480, 389);
    ctx.fillStyle = progress.completed ? "#c59a57" : "#77849e";
    ctx.font = "11px Georgia";
    ctx.letterSpacing = "1.4px";
    ctx.fillText(progress.completed ? "SAMPLER COMPLETE — ALL PANELS MENDED" : "UP / DOWN TO CHOOSE     ENTER TO BEGIN", 480, 426);
  } else {
    ctx.fillStyle = `rgba(242, 213, 138, ${shimmer})`;
    ctx.fillText("PRESS ENTER TO THREAD THE LOOM", 480, 365);
  }
  ctx.fillStyle = "#77849e";
  ctx.font = "12px Georgia";
  ctx.letterSpacing = "1.5px";
  ctx.fillText("ARROWS / WASD  MOVE     HOLD SPACE  STITCH     O  OPTIONS", 480, hasContinue ? 474 : 419);
}

function drawFrame() {
  ctx.fillStyle = "#201b20";
  roundedRect(board.x - 18, board.y - 18, WIDTH * board.cell + 36, HEIGHT * board.cell + 36, 10);
  ctx.fill();
  const brass = ctx.createLinearGradient(board.x, board.y, board.x + WIDTH * board.cell, board.y + HEIGHT * board.cell);
  brass.addColorStop(0, "#d0a45e"); brass.addColorStop(0.5, "#68482a"); brass.addColorStop(1, "#bd8d4a");
  ctx.strokeStyle = brass;
  ctx.lineWidth = 4;
  roundedRect(board.x - 14, board.y - 14, WIDTH * board.cell + 28, HEIGHT * board.cell + 28, 8);
  ctx.stroke();
  for (let x = 0; x <= WIDTH; x += 2) {
    ctx.fillStyle = "#d4ad68";
    ctx.fillRect(board.x + x * board.cell - 1, board.y - 14, 2, 7);
  }
}

function drawCell(x: number, y: number, time: number) {
  const motionTime = preferences.reducedMotion ? 0 : time;
  const index = y * WIDTH + x;
  const px = board.x + x * board.cell;
  const py = board.y + y * board.cell;
  if (state.cloth[index]) {
    const glow = 0.04 + ((x * 7 + y * 11) % 9) * 0.006;
    ctx.fillStyle = `rgba(62, 73, 116, ${0.54 + glow})`;
    ctx.fillRect(px, py, board.cell, board.cell);
    ctx.strokeStyle = "rgba(212, 190, 137, .13)";
    ctx.lineWidth = 0.7;
    ctx.beginPath(); ctx.moveTo(px, py + 8); ctx.lineTo(px + board.cell, py + 8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(px, py + 23); ctx.lineTo(px + board.cell, py + 23); ctx.stroke();
    if ((x * 13 + y * 17) % 11 === 0) {
      ctx.fillStyle = "#e9d291";
      ctx.globalAlpha = preferences.reducedMotion ? 0.58 : 0.5 + Math.sin(motionTime / 500 + index) * 0.18;
      ctx.beginPath(); ctx.arc(px + 16, py + 15, 1.5, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }
  } else {
    const drift = Math.sin(motionTime / 900 + x * 0.5 + y * 0.7) * 5;
    const gradient = ctx.createLinearGradient(px + drift, py, px + board.cell, py + board.cell);
    gradient.addColorStop(0, "#080b20"); gradient.addColorStop(1, "#161638");
    ctx.fillStyle = gradient;
    ctx.fillRect(px, py, board.cell, board.cell);
  }
}

function drawTrail() {
  if (state.trail.length === 0) return;
  const path = [state.anchor, ...state.trail];
  ctx.strokeStyle = "rgba(255, 242, 190, .22)";
  ctx.lineWidth = 9;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  path.forEach((point, index) => {
    const p = pixel(point);
    if (index === 0) ctx.moveTo(p.x + 15.5, p.y + 15.5);
    else ctx.lineTo(p.x + 15.5, p.y + 15.5);
  });
  ctx.stroke();
  ctx.strokeStyle = "#fff0bd";
  ctx.lineWidth = 2.5;
  ctx.stroke();
}

function drawFlashNeedle(time: number) {
  const needle = flashNeedleFor(state);
  if (!needle || needle.phase === "dormant") return;
  const x = board.x + needle.column * board.cell;
  const active = needle.phase === "active";
  ctx.save();
  ctx.fillStyle = active ? "rgba(255, 220, 125, .2)" : "rgba(114, 201, 224, .12)";
  ctx.fillRect(x, board.y, board.cell, HEIGHT * board.cell);
  ctx.strokeStyle = active ? "#fff1a8" : "#75c9df";
  ctx.lineWidth = active ? 3 : 1.5;
  ctx.setLineDash(active ? [] : [5, 5]);
  ctx.strokeRect(x + 2, board.y + 2, board.cell - 4, HEIGHT * board.cell - 4);
  ctx.setLineDash([]);
  if (active) {
    ctx.shadowColor = "#fff1a8";
    ctx.shadowBlur = 15;
    ctx.beginPath();
    const sway = preferences.reducedMotion ? 0 : Math.sin(time / 32) * 3;
    ctx.moveTo(x + 16, board.y);
    for (let y = 0; y <= HEIGHT * board.cell; y += 24) {
      ctx.lineTo(x + 16 + (y / 24 % 2 === 0 ? -7 : 7) + sway, board.y + y);
    }
    ctx.stroke();
  }
  ctx.restore();
}

function drawMoths(time: number) {
  for (const moth of state.moths) {
    const p = pixel(moth);
    const cx = p.x + 15.5;
    const cy = p.y + 15.5;
    const flap = preferences.reducedMotion ? 0 : Math.sin(time / 95) * 4;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(Math.atan2(moth.dy, moth.dx) + Math.PI / 2);
    ctx.shadowColor = "#f05a8a"; ctx.shadowBlur = 13;
    ctx.fillStyle = "#b82e62";
    ctx.beginPath(); ctx.ellipse(-7 - flap * 0.2, 0, 8 + flap, 5, -0.45, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(7 + flap * 0.2, 0, 8 + flap, 5, 0.45, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#f5b2b9"; ctx.fillRect(-1.5, -7, 3, 14);
    ctx.strokeStyle = "#f5b2b9"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-1, 6); ctx.lineTo(-5, 12); ctx.moveTo(1, 6); ctx.lineTo(5, 12); ctx.stroke();
    ctx.restore();
  }
}

function drawPlayer(time: number) {
  const p = pixel(state.player);
  const cx = p.x + 15.5;
  const cy = p.y + 15.5;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.shadowColor = "#ffe4a1"; ctx.shadowBlur = state.trail.length > 0 ? 16 : 8;
  ctx.fillStyle = "#f0c96e";
  ctx.rotate(Math.PI / 4 + (preferences.reducedMotion ? 0 : Math.sin(time / 240) * 0.04));
  ctx.fillRect(-7, -7, 14, 14);
  ctx.fillStyle = "#4a3150"; ctx.fillRect(-3, -3, 6, 6);
  ctx.restore();
}

function drawHud() {
  const level = levelFor(state);
  const needle = flashNeedleFor(state);
  ctx.textAlign = "left";
  ctx.fillStyle = "#c59a57";
  ctx.font = "11px Georgia"; ctx.letterSpacing = "2px";
  ctx.fillText("REPAIRED", 42, 117);
  ctx.fillStyle = "#f4dda1";
  ctx.font = "700 37px Georgia"; ctx.letterSpacing = "0px";
  ctx.fillText(`${state.repaired}%`, 42, 158);
  ctx.fillStyle = "#697793";
  ctx.fillRect(42, 172, 92, 4);
  ctx.fillStyle = "#dbb565";
  ctx.fillRect(42, 172, Math.min(92, 92 * state.repaired / level.goal), 4);
  ctx.fillStyle = "#8d9ab3";
  ctx.font = "10px Georgia"; ctx.letterSpacing = "1px";
  ctx.fillText(`GOAL ${level.goal}%`, 42, 192);

  ctx.fillStyle = "#c59a57";
  ctx.font = "10px Georgia"; ctx.letterSpacing = "1.4px";
  ctx.fillText(`PANEL ${state.levelIndex + 1} / ${LEVELS.length}`, 42, 215);

  ctx.fillStyle = "#c59a57";
  ctx.font = "11px Georgia"; ctx.letterSpacing = "2px";
  ctx.fillText("SPOOLS", 42, 246);
  for (let index = 0; index < 3; index += 1) {
    ctx.strokeStyle = index < state.spools ? "#f1d78f" : "#4f4351";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(58 + index * 31, 274, 10, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(51 + index * 31, 274); ctx.lineTo(65 + index * 31, 274); ctx.stroke();
  }
  ctx.fillStyle = state.trail.length > 0 ? "#fff0bd" : "#78859f";
  ctx.font = "700 11px Georgia"; ctx.letterSpacing = "1.5px";
  ctx.fillText(state.trail.length > 0 ? "THREAD" : "SAFE", 42, 333);
  ctx.fillText(state.trail.length > 0 ? "EXPOSED" : "SELVAGE", 42, 350);
  ctx.fillStyle = "#77839c";
  ctx.font = "10px Georgia"; ctx.letterSpacing = ".5px";
  ctx.fillText(state.trail.length > 0 ? `${state.trail.length} CELLS LOOSE` : "SPACE + MOVE", 42, 371);
  if (needle && needle.phase !== "dormant") {
    ctx.fillStyle = needle.phase === "active" ? "#fff1a8" : "#75c9df";
    ctx.font = "700 9px Georgia"; ctx.letterSpacing = ".8px";
    ctx.fillText(needle.phase === "active" ? "NEEDLE STRIKES" : `NEEDLE IN ${needle.ticksUntilStrike}`, 42, 400);
  }
}

function drawFooter() {
  ctx.fillStyle = "rgba(4, 6, 17, .78)";
  roundedRect(170, 500, 620, 27, 4); ctx.fill();
  ctx.textAlign = "center";
  ctx.fillStyle = "#8794aa";
  ctx.font = "10px Georgia"; ctx.letterSpacing = "1.2px";
  ctx.fillText("ARROWS / WASD  MOVE   SPACE  STITCH   ESC  PAUSE   O  OPTIONS   R  RESTART", 480, 518);
}

function drawOverlay(title: string, body: string, action: string) {
  ctx.fillStyle = "rgba(3, 4, 12, .82)";
  ctx.fillRect(board.x, board.y, WIDTH * board.cell, HEIGHT * board.cell);
  ctx.textAlign = "center";
  ctx.fillStyle = "#f2d58a";
  ctx.font = "700 34px Georgia"; ctx.letterSpacing = "5px";
  ctx.fillText(title, 480, 253);
  ctx.fillStyle = "#aab5ca";
  ctx.font = "14px Georgia"; ctx.letterSpacing = ".7px";
  ctx.fillText(body, 480, 289);
  ctx.fillStyle = "#d7b76f";
  ctx.font = "700 11px Georgia"; ctx.letterSpacing = "2px";
  ctx.fillText(action, 480, 333);
}

function drawSettings(time: number) {
  if (state.screen === "title") drawBackdrop(time); else drawGame(time);
  ctx.fillStyle = "rgba(3, 4, 12, .9)";
  ctx.fillRect(230, 74, 500, 392);
  ctx.strokeStyle = "#9d7542";
  ctx.lineWidth = 2;
  roundedRect(230, 74, 500, 392, 8);
  ctx.stroke();
  ctx.textAlign = "center";
  ctx.fillStyle = "#f2d58a";
  ctx.font = "700 32px Georgia";
  ctx.letterSpacing = "5px";
  ctx.fillText("LOOM OPTIONS", 480, 138);
  ctx.fillStyle = "#c59a57";
  ctx.font = "11px Georgia";
  ctx.letterSpacing = "2px";
  ctx.fillText("SOUND VOLUME", 480, 203);
  ctx.fillStyle = "#f4dda1";
  ctx.font = "700 28px Georgia";
  ctx.letterSpacing = "1px";
  ctx.fillText(`${Math.round(preferences.volume * 100)}%`, 480, 243);
  ctx.fillStyle = "#7f8da7";
  ctx.font = "11px Georgia";
  ctx.fillText("LEFT / RIGHT TO ADJUST", 480, 270);
  ctx.fillStyle = "#c59a57";
  ctx.letterSpacing = "2px";
  ctx.fillText("REDUCED MOTION", 480, 326);
  ctx.fillStyle = preferences.reducedMotion ? "#f4dda1" : "#8d9ab3";
  ctx.font = "700 21px Georgia";
  ctx.fillText(preferences.reducedMotion ? "ON" : "OFF", 480, 360);
  ctx.fillStyle = "#7f8da7";
  ctx.font = "11px Georgia";
  ctx.letterSpacing = "1px";
  ctx.fillText("M TO TOGGLE     ESC / O TO RETURN", 480, 417);
}

function drawGame(time: number) {
  drawBackdrop(time);
  drawFrame();
  for (let y = 0; y < HEIGHT; y += 1) for (let x = 0; x < WIDTH; x += 1) drawCell(x, y, time);
  drawTrail();
  drawFlashNeedle(time);
  drawMoths(time);
  drawPlayer(time);
  drawHud();
  drawFooter();
  if (state.screen === "paused") drawOverlay("LOOM AT REST", "The loose thread is held in time.", "ESC TO RESUME");
  if (state.screen === "won") {
    const finalPanel = state.levelIndex === LEVELS.length - 1;
    const nextPanel = LEVELS[state.levelIndex + 1];
    drawOverlay(
      finalPanel ? "SAMPLER MENDED" : "PANEL MENDED",
      finalPanel ? `All ${LEVELS.length} panels hold against the unravellers.` : `The next panel waits: ${nextPanel.name}.`,
      finalPanel ? "ENTER TO RETURN TO THE ATELIER" : `ENTER FOR PANEL ${state.levelIndex + 2}`,
    );
  }
  if (state.screen === "lost") drawOverlay("THREAD UNDONE", "The unraveller found every spool.", "ENTER TO RETRY");
  if (pulse > 0 && !preferences.reducedMotion) {
    ctx.fillStyle = `rgba(244, 216, 151, ${pulse * 0.16})`;
    ctx.fillRect(0, 0, 960, 540);
    pulse = Math.max(0, pulse - 0.035);
  }
}

function updateAria() {
  const needle = flashNeedleFor(state);
  const needleDescription = needle?.phase === "warning"
    ? ` Flash needle warns at column ${needle.column + 1}, striking in ${needle.ticksUntilStrike} ticks.`
    : needle?.phase === "active" ? ` Flash needle active at column ${needle.column + 1}.` : "";
  const description = settingsOpen
    ? `Options. Sound volume ${Math.round(preferences.volume * 100)} percent. Reduced motion ${preferences.reducedMotion ? "on" : "off"}.`
    : state.screen === "title"
    ? progress.highestUnlocked > 0
      ? `DUSKLOOM title. ${progress.completed ? "Sampler complete. " : ""}${titleChoice === "continue" ? `Continue at panel ${progress.highestUnlocked + 1} selected.` : "Start at panel one selected."} Use up and down to choose, then Enter.`
      : "DUSKLOOM title. Press Enter to begin."
    : `${state.screen}. Panel ${state.levelIndex + 1} of ${LEVELS.length}, ${levelFor(state).name}. ${state.repaired} percent repaired. ${state.spools} spools. ${state.trail.length} exposed thread cells.${needleDescription}`;
  canvas.setAttribute("aria-label", description);
  canvas.dataset.screen = settingsOpen ? "settings" : state.screen;
  canvas.dataset.repaired = String(state.repaired);
  canvas.dataset.spools = String(state.spools);
  canvas.dataset.trail = String(state.trail.length);
  canvas.dataset.level = String(state.levelIndex + 1);
  canvas.dataset.moths = String(state.moths.length);
  canvas.dataset.hazard = needle?.phase ?? "none";
  canvas.dataset.hazardColumn = needle ? String(needle.column + 1) : "0";
  canvas.dataset.volume = String(Math.round(preferences.volume * 100));
  canvas.dataset.reducedMotion = String(preferences.reducedMotion);
  canvas.dataset.highestUnlocked = String(progress.highestUnlocked + 1);
  canvas.dataset.campaignComplete = String(progress.completed);
  canvas.dataset.titleChoice = titleChoice;
}

function closeSettings() {
  settingsOpen = false;
  lastMothStep = performance.now();
  announce(state.screen === "title" ? "Options closed. Press Enter to begin." : "Options closed.");
}

const directions: Record<string, Direction | undefined> = {
  ArrowUp: "up", KeyW: "up", ArrowDown: "down", KeyS: "down", ArrowLeft: "left", KeyA: "left", ArrowRight: "right", KeyD: "right",
};

window.addEventListener("keydown", (event) => {
  const direction = directions[event.code];
  if (direction || ["Enter", "Escape", "Space", "KeyM", "KeyO", "KeyR"].includes(event.code)) event.preventDefault();
  const previous = state;
  if (settingsOpen) {
    if (event.code === "ArrowLeft" || event.code === "ArrowRight") {
      const delta = event.code === "ArrowRight" ? 0.25 : -0.25;
      preferences = { ...preferences, volume: Math.max(0, Math.min(1, preferences.volume + delta)) };
      savePreferences(localStorage, preferences);
      announce(`Sound volume ${Math.round(preferences.volume * 100)} percent.`);
      if (preferences.volume > 0) tone(330, 0.08, "sine", 0.04);
    } else if (event.code === "KeyM") {
      preferences = { ...preferences, reducedMotion: !preferences.reducedMotion };
      if (preferences.reducedMotion) pulse = 0;
      savePreferences(localStorage, preferences);
      announce(`Reduced motion ${preferences.reducedMotion ? "on" : "off"}.`);
    } else if (event.code === "Escape" || event.code === "KeyO") closeSettings();
  } else if (event.code === "KeyO" && ["title", "playing", "paused"].includes(state.screen)) {
    settingsOpen = true;
    announce("Options opened. Use left and right for sound volume, M for reduced motion, Escape to return.");
  } else if (state.screen === "title" && ["ArrowUp", "ArrowDown", "KeyW", "KeyS"].includes(event.code) && progress.highestUnlocked > 0) {
    titleChoice = titleChoice === "continue" ? "new" : "continue";
    announce(titleChoice === "continue" ? `Continue at panel ${progress.highestUnlocked + 1}.` : "Start at panel one.");
  } else if (state.screen === "title" && event.code === "Enter") {
    const levelIndex = titleChoice === "continue" ? progress.highestUnlocked : 0;
    state = start(state, levelIndex); lastMothStep = performance.now(); announce(`Panel ${state.levelIndex + 1}, ${levelFor(state).name}. Hold Space and move away from repaired cloth to stitch.`);
  } else if ((state.screen === "won" || state.screen === "lost") && event.code === "Enter") {
    if (state.screen === "won") {
      state = continueAfterWin(state);
      if (state.screen === "title") {
        titleChoice = "continue";
        announce("Sampler complete. Returned to the atelier.");
      } else {
        announce(`Panel ${state.levelIndex + 1}, ${levelFor(state).name}. ${state.moths.length} unravellers are moving.`);
      }
    } else {
      state = restart(state);
      announce(`Panel ${state.levelIndex + 1} restarted.`);
    }
    lastMothStep = performance.now();
  } else if (event.code === "KeyR" && state.screen !== "title") {
    state = restart(state); lastMothStep = performance.now(); announce(`Panel ${state.levelIndex + 1} restarted.`);
  } else if (event.code === "Escape") {
    state = togglePause(state); announce(state.screen === "paused" ? "Paused." : "Resumed.");
    if (state.screen === "playing") lastMothStep = performance.now();
  } else if (state.screen === "playing" && direction) {
    state = movePlayer(state, direction, event.shiftKey || event.getModifierState("Alt") || pressedSpace);
    if (state.lastEvent === "claim") announce(`${state.repaired} percent repaired.`);
    if (state.lastEvent === "win") {
      progress = recordWin(progress, state.levelIndex, LEVELS.length);
      saveProgress(localStorage, progress, LEVELS.length);
      announce(state.levelIndex === LEVELS.length - 1 ? "Sampler complete. Press Enter to return to the atelier." : "Night mended. Press Enter for the next panel.");
    }
  }
  playEvent(previous, state);
  updateAria();
  canvas.focus();
});

let pressedSpace = false;
window.addEventListener("keydown", (event) => { if (event.code === "Space") pressedSpace = true; });
window.addEventListener("keyup", (event) => { if (event.code === "Space") pressedSpace = false; });
window.addEventListener("blur", () => { pressedSpace = false; });

function frame(time: number) {
  if (!settingsOpen && state.screen === "playing" && time - lastMothStep >= 360) {
    const previous = state;
    const previousNeedle = flashNeedleFor(previous);
    state = advanceMoths(state);
    const needle = flashNeedleFor(state);
    lastMothStep = time;
    if (needle?.phase === "warning" && previousNeedle?.phase !== "warning") {
      tone(660, 0.1, "triangle", 0.035);
      announce(`Flash needle warning. Column ${needle.column + 1}, strike in ${needle.ticksUntilStrike} ticks.`);
    } else if (needle?.phase === "active" && previousNeedle?.phase !== "active") {
      tone(1180, 0.14, "sawtooth", 0.045);
    }
    if (state.lastEvent === "cut" && previous.spools !== state.spools) {
      announce(state.screen === "lost" ? "All spools lost." : `Thread cut. ${state.spools} spools remain.`);
      playEvent(previous, state);
    }
    updateAria();
  }
  if (settingsOpen) drawSettings(time);
  else if (state.screen === "title") drawTitle(time);
  else drawGame(time);
  requestAnimationFrame(frame);
}

updateAria();
canvas.focus();
requestAnimationFrame(frame);
