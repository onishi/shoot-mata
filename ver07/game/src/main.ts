import "./style.css";
import {
  commit,
  continueAfterWin,
  createGame,
  getLevel,
  isGateOpen,
  levels,
  move,
  restart,
  start,
  togglePause,
  type Action,
  type Direction,
  type GameState,
  type Point,
} from "./model";
import { loadPreferences, savePreferences, type Preferences } from "./preferences";

const canvasElement = document.querySelector<HTMLCanvasElement>("#game");
const liveElement = document.querySelector<HTMLParagraphElement>("#live");
if (!canvasElement || !liveElement) throw new Error("Game surface unavailable");
const canvas: HTMLCanvasElement = canvasElement;
const live: HTMLParagraphElement = liveElement;
const context = canvas.getContext("2d");
if (!context) throw new Error("Canvas 2D unavailable");

const ctx = context;
let state = createGame();
let preferences: Preferences = loadPreferences(localStorage);
let titleLevel = Math.min(preferences.unlockedLevel, levels.length - 1);
let titlePanel: "files" | "settings" = "files";
let settingIndex = 0;
let audio: AudioContext | null = null;
let flash = 0;
let bump = 0;
let lastTime = performance.now();

const tile = 58;
const boardX = 161;
const boardY = 112;

function pointToPixel(point: Point) {
  return { x: boardX + point.x * tile, y: boardY + point.y * tile };
}

function selectedLevel() {
  return getLevel(state);
}

function roundedRect(x: number, y: number, width: number, height: number, radius: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
}

function tone(frequency: number, duration: number, gain = 0.04, offset = 0) {
  if (preferences.volume === 0) return;
  audio ??= new AudioContext();
  const oscillator = audio.createOscillator();
  const volume = audio.createGain();
  oscillator.type = "triangle";
  oscillator.frequency.setValueAtTime(frequency, audio.currentTime + offset);
  volume.gain.setValueAtTime(gain * preferences.volume / 100, audio.currentTime + offset);
  volume.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + offset + duration);
  oscillator.connect(volume).connect(audio.destination);
  oscillator.start(audio.currentTime + offset);
  oscillator.stop(audio.currentTime + offset + duration);
}

function playEvent(previous: GameState, next: GameState) {
  if (next.lastEvent === previous.lastEvent && next === previous) return;
  if (next.lastEvent === "move") tone(180 + (next.turn % 3) * 18, 0.07, 0.025);
  if (next.lastEvent === "wait") tone(145, 0.11, 0.018);
  if (next.lastEvent === "blocked") { tone(92, 0.12, 0.035); bump = 1; }
  if (next.lastEvent === "commit") {
    tone(260, 0.22, 0.045);
    tone(390, 0.28, 0.035, 0.06);
    flash = 1;
  }
  if (next.lastEvent === "seal") {
    tone(440, 0.15, 0.04);
    tone(660, 0.22, 0.025, 0.07);
  }
  if (next.lastEvent === "won") {
    [330, 415, 494, 660].forEach((frequency, index) => tone(frequency, 0.45, 0.035, index * 0.08));
  }
}

function announce(message: string) {
  live.textContent = "";
  requestAnimationFrame(() => { live.textContent = message; });
}

function updateAria() {
  const room = selectedLevel();
  const descriptions: Record<GameState["screen"], string> = {
    title: titlePanel === "settings"
      ? `Settings. Volume ${preferences.volume} percent. High contrast ${preferences.highContrast ? "on" : "off"}. Reduced motion ${preferences.reduceMotion ? "on" : "off"}.`
      : `PALIMPSEST POST title. Selected ${levels[titleLevel].name}, file ${titleLevel + 1} of ${preferences.unlockedLevel + 1} unlocked. Press Enter to begin or S for settings.`,
    paused: `${room.name} paused. Press Escape to resume or R to restart.`,
    won: `${room.name} delivered. Press Enter to ${state.levelIndex < levels.length - 1 ? "open the next file" : "replay from file one"}.`,
    playing: `${room.name}. Turn ${state.turn}. ${state.hasLetter ? "Letter collected." : "Letter waiting."} ${isGateOpen(state) ? "Censorship gate open." : "Censorship gate closed."} ${state.ghosts.length} echoes filed. Current recording ${state.currentRecording.length} steps.`,
  };
  canvas.setAttribute("aria-label", descriptions[state.screen]);
  canvas.dataset.screen = state.screen;
  canvas.dataset.turn = String(state.turn);
  canvas.dataset.gate = isGateOpen(state) ? "open" : "closed";
  canvas.dataset.letter = state.hasLetter ? "held" : "waiting";
}

function drawPaperNoise(time: number) {
  ctx.fillStyle = preferences.highContrast ? "#02050b" : "#10192b";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const gradient = ctx.createRadialGradient(470, 250, 40, 480, 270, 520);
  gradient.addColorStop(0, "rgba(70, 92, 117, .20)");
  gradient.addColorStop(0.55, "rgba(26, 40, 65, .08)");
  gradient.addColorStop(1, "rgba(1, 5, 12, .55)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "rgba(226, 211, 176, .035)";
  ctx.lineWidth = 1;
  for (let y = 22; y < canvas.height; y += 18) {
    ctx.beginPath();
    ctx.moveTo(0, y + Math.sin(time * 0.0003 + y) * 0.5);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
}

function drawTitle(time: number) {
  drawPaperNoise(time);
  ctx.save();
  ctx.translate(480, 248);
  ctx.rotate(-0.022);
  ctx.fillStyle = "rgba(0, 0, 0, .32)";
  roundedRect(-273, -113, 558, 226, 7);
  ctx.fill();
  ctx.fillStyle = "#e9e0c8";
  roundedRect(-280, -120, 558, 226, 7);
  ctx.fill();
  ctx.strokeStyle = "rgba(61, 54, 45, .22)";
  ctx.lineWidth = 1;
  for (let y = -85; y < 85; y += 27) {
    ctx.beginPath(); ctx.moveTo(-255, y); ctx.lineTo(253, y); ctx.stroke();
  }
  ctx.fillStyle = "#172238";
  ctx.textAlign = "center";
  ctx.font = "600 15px Georgia";
  ctx.letterSpacing = "6px";
  ctx.fillText("NIGHT RECORDS DIVISION", 0, -74);
  ctx.font = "700 52px Georgia";
  ctx.letterSpacing = "2px";
  ctx.fillText("PALIMPSEST POST", 0, -10);
  ctx.fillStyle = "#9e3e3e";
  ctx.font = "italic 17px Georgia";
  ctx.letterSpacing = "1px";
  ctx.fillText("Complete the work your past self left behind.", 0, 31);
  ctx.strokeStyle = "#a34743";
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(0, 68, 25, 0, Math.PI * 2); ctx.stroke();
  ctx.font = "700 12px Georgia";
  ctx.fillText("ENTER", 0, 72);
  ctx.restore();
  ctx.fillStyle = preferences.highContrast ? "#fff2bd" : "#dfcfaa";
  ctx.textAlign = "center";
  ctx.font = "15px Georgia";
  ctx.letterSpacing = "2px";
  ctx.fillText(`FILE ${String(titleLevel + 1).padStart(2, "0")}  ·  ${levels[titleLevel].name}`, 480, 404);
  ctx.fillStyle = "#54c7b4";
  ctx.font = "13px Georgia";
  ctx.fillText("← / →  SELECT FILE    ENTER  CLOCK IN", 480, 430 + Math.sin(time * 0.004) * 2);
  ctx.fillStyle = "rgba(223,207,170,.55)";
  ctx.font = "12px Georgia";
  ctx.letterSpacing = "1px";
  ctx.fillText(`${preferences.unlockedLevel + 1} OF ${levels.length} FILES OPEN    ·    S  SETTINGS`, 480, 458);
}

function drawSettings() {
  drawPaperNoise(0);
  ctx.fillStyle = "rgba(5, 8, 15, .72)"; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "rgba(19, 28, 45, .98)";
  roundedRect(205, 72, 550, 396, 8); ctx.fill();
  ctx.strokeStyle = "rgba(215,198,158,.38)"; ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = "#e5d7b7"; ctx.textAlign = "center";
  ctx.font = "700 13px Georgia"; ctx.letterSpacing = "5px"; ctx.fillText("NIGHT RECORDS DIVISION", 480, 116);
  ctx.font = "700 34px Georgia"; ctx.letterSpacing = "1px"; ctx.fillText("SHIFT SETTINGS", 480, 164);
  ctx.fillStyle = "#aeb9ba"; ctx.font = "15px Georgia"; ctx.letterSpacing = "0px";
  ctx.fillText("Stored automatically in this browser.", 480, 194);
  const rows = [
    ["DESK BELL VOLUME", `${preferences.volume}%`],
    ["HIGH CONTRAST INK", preferences.highContrast ? "ON" : "OFF"],
    ["REDUCED MOTION", preferences.reduceMotion ? "ON" : "OFF"],
  ];
  rows.forEach(([label, value], index) => {
    const y = 253 + index * 48;
    if (index === settingIndex) {
      ctx.fillStyle = "rgba(76, 198, 180, .16)";
      roundedRect(285, y - 25, 390, 36, 3); ctx.fill();
    }
    ctx.fillStyle = index === settingIndex ? "#66d9c6" : "#c9bea4";
    ctx.textAlign = "left"; ctx.font = "13px Georgia"; ctx.letterSpacing = "1px";
    ctx.fillText(label, 310, y);
    ctx.textAlign = "right"; ctx.fillText(value, 650, y);
  });
  ctx.fillStyle = "#d7c8a6"; ctx.textAlign = "center"; ctx.font = "13px Georgia"; ctx.letterSpacing = "1px";
  ctx.fillText("↑ / ↓  SELECT    ← / →  CHANGE    ESC  CLOSE", 480, 424);
}

function drawFloor() {
  ctx.fillStyle = "rgba(4, 8, 15, .50)";
  roundedRect(178, 128, 604, 272, 12);
  ctx.fill();
  for (const key of selectedLevel().floor) {
    const [x, y] = key.split(",").map(Number);
    const p = pointToPixel({ x, y });
    ctx.fillStyle = (x + y) % 2 ? "#d9d0b9" : "#e3dbc5";
    roundedRect(p.x + 3, p.y + 3, tile - 6, tile - 6, 3);
    ctx.fill();
    ctx.strokeStyle = "rgba(62, 61, 58, .20)";
    ctx.stroke();
    ctx.fillStyle = "rgba(38, 46, 56, .10)";
    ctx.fillRect(p.x + 10, p.y + 16, tile - 20, 1);
    ctx.fillRect(p.x + 10, p.y + 31, tile - 25, 1);
    if (selectedLevel().echoFloor.has(key)) {
      ctx.fillStyle = preferences.highContrast ? "rgba(45, 220, 205, .42)" : "rgba(50, 189, 176, .28)";
      roundedRect(p.x + 3, p.y + 3, tile - 6, tile - 6, 3);
      ctx.fill();
      ctx.strokeStyle = "#43c7b5";
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 4]);
      roundedRect(p.x + 8, p.y + 8, tile - 16, tile - 16, 3);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "#176b67";
      ctx.font = "700 10px Georgia";
      ctx.textAlign = "center";
      ctx.letterSpacing = "1px";
      ctx.fillText("COPY", p.x + tile / 2, p.y + tile / 2 + 4);
    }
  }
}

function drawPlate(plate: Point, active: boolean, time: number) {
  const p = pointToPixel(plate);
  const cx = p.x + tile / 2;
  const cy = p.y + tile / 2;
  ctx.strokeStyle = active ? "#39b7a4" : "#a44743";
  ctx.lineWidth = active ? 4 : 3;
  ctx.beginPath(); ctx.arc(cx, cy, 18 + (active ? Math.sin(time * .006) : 0), 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(cx, cy, 9, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = active ? "rgba(50,189,167,.22)" : "rgba(164,71,67,.14)";
  ctx.beginPath(); ctx.arc(cx, cy, 22, 0, Math.PI * 2); ctx.fill();
}

function drawGate(open: boolean) {
  const p = pointToPixel(selectedLevel().gate);
  const x = p.x + tile / 2;
  ctx.strokeStyle = open ? "rgba(57,183,164,.38)" : "#913d3e";
  ctx.lineWidth = 5;
  ctx.setLineDash(open ? [5, 8] : []);
  for (let offset = -17; offset <= 17; offset += 11) {
    ctx.beginPath(); ctx.moveTo(x + offset, p.y + 6); ctx.lineTo(x + offset, p.y + tile - 6); ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.fillStyle = open ? "#54c7b4" : "#c36a62";
  ctx.fillRect(x - 22, p.y + 4, 44, 4);
}

function drawLetter() {
  if (state.hasLetter) return;
  const p = pointToPixel(selectedLevel().letter);
  ctx.save();
  ctx.translate(p.x + tile / 2, p.y + tile / 2);
  ctx.rotate(-0.09);
  ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.fillRect(-18, -11, 39, 27);
  ctx.fillStyle = "#fff4d5"; ctx.fillRect(-20, -14, 39, 27);
  ctx.strokeStyle = "#8d7756"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(-20, -14); ctx.lineTo(0, 2); ctx.lineTo(19, -14); ctx.stroke();
  ctx.fillStyle = "#c79a44"; ctx.beginPath(); ctx.arc(0, 4, 6, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawExit() {
  const p = pointToPixel(selectedLevel().exit);
  ctx.fillStyle = "rgba(12, 17, 28, .75)";
  roundedRect(p.x + 10, p.y + 15, tile - 20, 16, 4);
  ctx.fill();
  ctx.strokeStyle = "#b69252"; ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(p.x + 20, p.y + 38); ctx.lineTo(p.x + tile / 2, p.y + 46); ctx.lineTo(p.x + tile - 20, p.y + 38);
  ctx.stroke();
}

function drawClerk(point: Point, ghost: boolean, time: number) {
  const p = pointToPixel(point);
  const cx = p.x + tile / 2;
  const cy = p.y + tile / 2;
  ctx.save();
  ctx.translate(cx, cy + (ghost ? Math.sin(time * .006) * 1.4 : bump * 2));
  if (ghost) ctx.globalAlpha = .72;
  ctx.fillStyle = ghost ? "rgba(45, 194, 178, .18)" : "rgba(0,0,0,.22)";
  ctx.beginPath(); ctx.ellipse(2, 18, 20, 7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = ghost ? "#48c9b6" : "#f3ead2";
  ctx.strokeStyle = ghost ? "#a5f3e8" : "#8e7651";
  ctx.lineWidth = ghost ? 2 : 1.5;
  roundedRect(-16, -20, 32, 38, 4); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-16, -9); ctx.lineTo(0, 2); ctx.lineTo(16, -9); ctx.stroke();
  ctx.fillStyle = ghost ? "#173f43" : "#a13f3d";
  ctx.beginPath(); ctx.arc(0, 3, 5, 0, Math.PI * 2); ctx.fill();
  if (ghost) {
    ctx.strokeStyle = "rgba(89,223,205,.42)";
    ctx.strokeRect(-20, -24, 40, 46);
  }
  ctx.restore();
}

function drawHeader() {
  const room = selectedLevel();
  ctx.fillStyle = "#e6d8b7";
  ctx.font = "700 13px Georgia";
  ctx.letterSpacing = "4px";
  ctx.textAlign = "left";
  ctx.fillText(room.file, 60, 55);
  ctx.font = "700 28px Georgia";
  ctx.letterSpacing = "1px";
  ctx.fillText(room.name, 60, 88);
  ctx.fillStyle = "#aeb8ba";
  ctx.font = "13px Georgia";
  ctx.letterSpacing = ".5px";
  ctx.fillText(room.objective, 60, 112);
  ctx.textAlign = "right";
  ctx.fillStyle = "#e6d8b7";
  ctx.fillText(`CURRENT SHIFT  ${state.currentRecording.length} STEPS`, 900, 57);
  ctx.fillStyle = state.ghosts.length ? "#55c6b4" : "#77878d";
  ctx.fillText(state.ghosts.length ? `ECHOES FILED  ${state.ghosts.length}` : "NO ECHO FILED", 900, 82);
}

function drawFooter() {
  ctx.fillStyle = "rgba(6, 10, 18, .72)";
  roundedRect(46, 458, 868, 48, 5); ctx.fill();
  ctx.fillStyle = "#d8cba9";
  ctx.font = "13px Georgia"; ctx.textAlign = "left"; ctx.letterSpacing = "1px";
  ctx.fillText("ARROWS / WASD   MOVE", 62, 488);
  ctx.fillStyle = "#49bba9";
  ctx.fillText("SPACE   WAIT", 278, 488);
  ctx.fillText("ENTER   FILE ECHO + REWIND", 410, 488);
  ctx.fillStyle = "#9da9ab";
  ctx.fillText("ESC   PAUSE", 710, 488);
  ctx.fillText("R   RESTART", 820, 488);
}

function drawGame(time: number) {
  drawPaperNoise(time);
  drawHeader();
  drawFloor();
  const open = isGateOpen(state);
  if (open) {
    const b = pointToPixel(selectedLevel().gate);
    ctx.strokeStyle = "rgba(56,192,173,.55)"; ctx.lineWidth = 2; ctx.setLineDash([4, 5]);
    for (const plate of selectedLevel().plates) {
      const a = pointToPixel(plate);
      ctx.beginPath(); ctx.moveTo(a.x + tile / 2, a.y + tile / 2); ctx.lineTo(b.x + tile / 2, b.y + tile / 2); ctx.stroke();
    }
    ctx.setLineDash([]);
  }
  for (const [plateIndex, plate] of selectedLevel().plates.entries()) {
    const active = state.ghosts.some((ghost) => selectedLevel().plateMode === "transit"
      ? ghost.pulses[plateIndex]
      : ghost.position.x === plate.x && ghost.position.y === plate.y);
    drawPlate(plate, active, time);
  }
  drawGate(open);
  drawLetter();
  drawExit();
  for (const ghost of state.ghosts) drawClerk(ghost.position, true, time);
  drawClerk(state.player, false, time);
  if (state.hasLetter) {
    const p = pointToPixel(state.player);
    ctx.fillStyle = "#e6bd63"; ctx.beginPath(); ctx.arc(p.x + 44, p.y + 10, 5, 0, Math.PI * 2); ctx.fill();
  }
  drawFooter();
}

function overlay(title: string, body: string, instruction: string, color = "#e5d7b7") {
  ctx.fillStyle = "rgba(5, 8, 15, .76)"; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "rgba(19, 28, 45, .96)";
  roundedRect(250, 160, 460, 220, 8); ctx.fill();
  ctx.strokeStyle = "rgba(215,198,158,.32)"; ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = color; ctx.textAlign = "center";
  ctx.font = "700 13px Georgia"; ctx.letterSpacing = "5px"; ctx.fillText("NIGHT RECORDS DIVISION", 480, 205);
  ctx.font = "700 38px Georgia"; ctx.letterSpacing = "1px"; ctx.fillText(title, 480, 258);
  ctx.fillStyle = "#aeb9ba"; ctx.font = "16px Georgia"; ctx.letterSpacing = "0px"; ctx.fillText(body, 480, 295);
  ctx.fillStyle = "#d7c8a6"; ctx.font = "14px Georgia"; ctx.letterSpacing = "2px"; ctx.fillText(instruction, 480, 345);
}

function render(time: number) {
  const delta = Math.min(32, time - lastTime);
  lastTime = time;
  flash = Math.max(0, flash - delta * .0035);
  bump = Math.max(0, bump - delta * .01);
  const visualTime = preferences.reduceMotion ? 0 : time;
  if (state.screen === "title") {
    if (titlePanel === "settings") drawSettings();
    else drawTitle(visualTime);
  }
  else {
    drawGame(visualTime);
    if (state.screen === "paused") overlay("SHIFT SUSPENDED", "The archive will wait exactly where you left it.", "ESC  RESUME   ·   R  RESTART");
    if (state.screen === "won") {
      const room = selectedLevel();
      const instruction = state.levelIndex < levels.length - 1 ? "ENTER  OPEN NEXT FILE" : "ENTER  REPLAY FROM FILE 01";
      overlay("LETTER DELIVERED", room.winBody, instruction, "#55c6b4");
    }
  }
  if (flash > 0) {
    ctx.fillStyle = `rgba(70, 210, 190, ${flash * .16})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = `rgba(116, 239, 221, ${flash * .6})`; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0, 270); ctx.lineTo(canvas.width, 270); ctx.stroke();
  }
  requestAnimationFrame(render);
}

const directions: Record<string, Direction | undefined> = {
  ArrowUp: "up", KeyW: "up", ArrowDown: "down", KeyS: "down",
  ArrowLeft: "left", KeyA: "left", ArrowRight: "right", KeyD: "right",
};

window.addEventListener("keydown", (event) => {
  const direction = directions[event.code];
  const action: Action | undefined = direction ?? (event.code === "Space" ? "wait" : undefined);
  if (direction || ["Enter", "Escape", "Space", "KeyR", "KeyS"].includes(event.code)) event.preventDefault();
  const previous = state;
  if (state.screen === "title" && titlePanel === "settings") {
    if (event.code === "Escape" || event.code === "KeyS") {
      titlePanel = "files"; announce("Settings closed.");
    } else if (event.code === "ArrowUp" || event.code === "KeyW") {
      settingIndex = (settingIndex + 2) % 3;
    } else if (event.code === "ArrowDown") {
      settingIndex = (settingIndex + 1) % 3;
    } else if (["ArrowLeft", "KeyA", "ArrowRight", "KeyD", "Enter", "Space"].includes(event.code)) {
      if (settingIndex === 0) {
        const amount = event.code === "ArrowLeft" || event.code === "KeyA" ? -25 : 25;
        preferences.volume = Math.max(0, Math.min(100, preferences.volume + amount));
      } else if (settingIndex === 1) preferences.highContrast = !preferences.highContrast;
      else preferences.reduceMotion = !preferences.reduceMotion;
      savePreferences(localStorage, preferences);
      announce(`${settingIndex === 0 ? `Volume ${preferences.volume} percent` : settingIndex === 1 ? `High contrast ${preferences.highContrast ? "on" : "off"}` : `Reduced motion ${preferences.reduceMotion ? "on" : "off"}`}.`);
    }
  } else if (state.screen === "title" && event.code === "KeyS") {
    titlePanel = "settings"; announce("Settings opened. Use up and down to select, left and right to change.");
  } else if (state.screen === "title" && (event.code === "ArrowLeft" || event.code === "KeyA")) {
    titleLevel = Math.max(0, titleLevel - 1); announce(`${levels[titleLevel].name} selected.`);
  } else if (state.screen === "title" && (event.code === "ArrowRight" || event.code === "KeyD")) {
    titleLevel = Math.min(preferences.unlockedLevel, titleLevel + 1); announce(`${levels[titleLevel].name} selected.`);
  } else if (state.screen === "title" && event.code === "Enter") {
    state = start(state, titleLevel); announce(`${selectedLevel().name} started. Move to record steps, then press Enter to file an echo and rewind.`);
  } else if (state.screen === "won" && event.code === "Enter") {
    state = continueAfterWin(state); announce(`${selectedLevel().name} opened.`);
  } else if (event.code === "KeyR" && state.screen !== "title") {
    state = restart(state); announce(`${selectedLevel().name} restarted.`);
  } else if (event.code === "Escape") {
    state = togglePause(state); announce(state.screen === "paused" ? "Paused." : "Resumed.");
  } else if (state.screen === "playing" && event.code === "Enter") {
    state = commit(state);
    if (state !== previous) announce(`Echo ${state.ghosts.length} filed. Returned to intake. All echoes will replay together.`);
  } else if (state.screen === "playing" && action) {
    state = move(state, action);
    if (state.lastEvent === "wait") announce("One blank beat recorded.");
    if (state.lastEvent === "blocked") announce("Route blocked.");
    if (state.lastEvent === "seal") announce("Sealed letter collected.");
    if (state.lastEvent === "won") {
      const newlyUnlocked = Math.min(levels.length - 1, state.levelIndex + 1);
      if (newlyUnlocked > preferences.unlockedLevel) {
        preferences.unlockedLevel = newlyUnlocked;
        savePreferences(localStorage, preferences);
      }
      announce(`Letter delivered. ${selectedLevel().name} complete.${newlyUnlocked > state.levelIndex ? ` File ${newlyUnlocked + 1} unlocked.` : ""}`);
    }
  }
  playEvent(previous, state);
  updateAria();
  canvas.focus();
});

updateAria();
requestAnimationFrame(render);
