import "./style.css";
import { MAX_CHARGES, REED_BELT, STAGES, WORLD, type GameState, type StageId, createGame, emitRipple, tick } from "./model";
import { loadSettings, saveSettings, type Settings } from "./settings";

type Screen = "title" | "playing" | "paused" | "won" | "lost" | "settings";

function required<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Required UI is missing: ${selector}`);
  return element;
}

const canvas = required<HTMLCanvasElement>("#game");
const live = required<HTMLParagraphElement>("#live");
const screenState = required<HTMLSpanElement>("#screen-state");
const controls = required<HTMLSpanElement>("#controls");
const settingsPanel = required<HTMLElement>("#settings");
const volumeInput = required<HTMLInputElement>("#volume");
const volumeValue = required<HTMLOutputElement>("#volume-value");
const highContrastInput = required<HTMLInputElement>("#high-contrast");
const reducedMotionInput = required<HTMLInputElement>("#reduced-motion");
const closeSettingsButton = required<HTMLButtonElement>("#close-settings");
const saveState = required<HTMLParagraphElement>("#save-state");
const context = canvas.getContext("2d");
if (!context) throw new Error("Canvas 2D is unavailable");
const ctx: CanvasRenderingContext2D = context;

let screen: Screen = "title";
let returnScreen: "title" | "paused" = "title";
let currentStageId: StageId = "first-rain";
let game = createGame(currentStageId);
let previous = performance.now();
let accumulator = 0;
const keys = new Set<string>();
let audio: AudioContext | null = null;
let lastHealth = game.health;
let lastScore = game.score;
let lastCharges = game.charges;
let settings = loadSettings(localStorage);

const TAU = Math.PI * 2;
const palette = {
  ink: "#06131b",
  deep: "#082633",
  water: "#0d3944",
  waterLight: "#17505a",
  moon: "#f1edc6",
  mint: "#91d9c6",
  gold: "#d8b86a",
  coral: "#ff806e",
  pale: "#d9f2e6"
};

function announce(message: string): void {
  live.textContent = "";
  requestAnimationFrame(() => { live.textContent = message; });
}

function applySettings(): void {
  volumeInput.value = String(settings.volume);
  volumeValue.value = `${settings.volume}%`;
  highContrastInput.checked = settings.highContrast;
  reducedMotionInput.checked = settings.reducedMotion;
  document.body.classList.toggle("high-contrast", settings.highContrast);
}

function persistSettings(next: Settings): void {
  settings = next;
  applySettings();
  const saved = saveSettings(localStorage, settings);
  saveState.textContent = saved ? "Saved on this device." : "Storage unavailable. Settings remain for this session.";
}

function openSettings(): void {
  if (screen !== "title" && screen !== "paused") return;
  returnScreen = screen;
  screen = "settings";
  settingsPanel.hidden = false;
  applySettings();
  volumeInput.focus();
  announce("Settings opened. Sound volume, high contrast, and reduce motion are available.");
}

function closeSettings(): void {
  if (screen !== "settings") return;
  screen = returnScreen;
  settingsPanel.hidden = true;
  canvas.focus();
  announce(returnScreen === "title" ? "Settings closed. Press Enter to begin." : "Settings closed. Press Escape to resume.");
}

function tone(frequency: number, duration: number, type: OscillatorType = "sine", volume = 0.04): void {
  if (settings.volume === 0) return;
  audio ??= new AudioContext();
  if (audio.state === "suspended") void audio.resume();
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, audio.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(frequency * 1.35, audio.currentTime + duration);
  gain.gain.setValueAtTime(volume * settings.volume / 70, audio.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + duration);
  oscillator.connect(gain).connect(audio.destination);
  oscillator.start();
  oscillator.stop(audio.currentTime + duration);
}

function startGame(stageId: StageId = currentStageId): void {
  currentStageId = stageId;
  game = createGame(stageId);
  screen = "playing";
  lastHealth = game.health;
  lastScore = game.score;
  lastCharges = game.charges;
  accumulator = 0;
  const stage = STAGES[stageId];
  announce(`${stage.name}. ${stage.instruction}. Hold for ${stage.duration} seconds.`);
  canvas.focus();
  tone(330, 0.18, "sine", 0.025);
}

function updateStatus(): void {
  const stage = STAGES[game.stageId];
  canvas.dataset.gameState = screen;
  canvas.dataset.stage = game.stageId;
  canvas.dataset.health = String(game.health);
  canvas.dataset.charges = String(game.charges);
  canvas.dataset.score = String(game.score);
  canvas.dataset.highContrast = String(settings.highContrast);
  canvas.dataset.reducedMotion = String(settings.reducedMotion);
  screenState.textContent = screen.toUpperCase();
  controls.textContent = screen === "playing"
    ? `Bloom ${game.health}/3 · Ripples ${game.charges}/3 · ${Math.max(0, Math.ceil(stage.duration - game.time))}s`
    : screen === "title" ? "Enter: begin · S: settings · Arrows/WASD: glide · Space: ripple"
      : screen === "settings" ? "Adjust settings · Esc/S: return"
        : screen === "paused" ? "Escape: resume · S: settings · R: restart"
          : screen === "won" ? "Enter: continue · R: replay"
            : "Enter: retry · R: restart";
  canvas.setAttribute("aria-label", screen === "playing"
    ? `RIPPLEKEEP. ${stage.name}. Bloom ${game.health} of 3. ${game.charges} ripples. ${Math.max(0, Math.ceil(stage.duration - game.time))} seconds remain. ${game.motes.length} spores approaching.`
    : `RIPPLEKEEP. ${screen}.`);
}

function roundRect(x: number, y: number, width: number, height: number, radius: number): void {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
}

function text(value: string, x: number, y: number, size: number, color = palette.pale, align: CanvasTextAlign = "left", weight = 500): void {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px Inter, ui-sans-serif, system-ui, sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  ctx.fillText(value, x, y);
}

function drawBackdrop(time: number): void {
  const gradient = ctx.createRadialGradient(WORLD.cx, WORLD.cy, 40, WORLD.cx, WORLD.cy, 620);
  gradient.addColorStop(0, "#184955");
  gradient.addColorStop(0.54, "#092b37");
  gradient.addColorStop(1, "#031018");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.globalAlpha = 0.18;
  for (let i = 0; i < 38; i += 1) {
    const x = (i * 173 + 91) % canvas.width;
    const y = (i * 97 + 43) % canvas.height;
    const flicker = 0.6 + Math.sin(time * 0.001 + i) * 0.35;
    ctx.fillStyle = palette.moon;
    ctx.beginPath();
    ctx.arc(x, y, 0.7 + flicker, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

function drawPond(time: number): void {
  ctx.save();
  ctx.translate(WORLD.cx, WORLD.cy);
  const pondGradient = ctx.createRadialGradient(-70, -95, 15, 0, 0, WORLD.pondRadius);
  pondGradient.addColorStop(0, "#2a6067");
  pondGradient.addColorStop(0.55, palette.water);
  pondGradient.addColorStop(1, palette.deep);
  ctx.fillStyle = pondGradient;
  ctx.beginPath();
  ctx.arc(0, 0, WORLD.pondRadius, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "rgba(178, 226, 205, 0.22)";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.strokeStyle = "rgba(145, 217, 198, 0.13)";
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.arc(0, 0, 238, 0, TAU);
  ctx.stroke();

  for (let i = 0; i < 5; i += 1) {
    const offset = Math.sin(time * 0.00045 + i * 1.8) * 8;
    ctx.strokeStyle = `rgba(141, 211, 198, ${0.08 + i * 0.012})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(0, offset, 78 + i * 39, 18 + i * 12, -0.15, 0.16, Math.PI - 0.12);
    ctx.stroke();
  }
  ctx.restore();
}

function drawBloom(health: number, time: number): void {
  ctx.save();
  ctx.translate(WORLD.cx, WORLD.cy);
  const pulse = 1 + Math.sin(time * 0.0032) * 0.035;
  ctx.scale(pulse, pulse);
  ctx.shadowColor = health > 0 ? palette.moon : palette.coral;
  ctx.shadowBlur = 24;
  for (let i = 0; i < 6; i += 1) {
    ctx.save();
    ctx.rotate((i / 6) * TAU);
    ctx.fillStyle = i < health * 2 ? palette.moon : "#496168";
    ctx.beginPath();
    ctx.ellipse(0, -17, 7, 17, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
  ctx.shadowBlur = 12;
  ctx.fillStyle = palette.gold;
  ctx.beginPath();
  ctx.arc(0, 0, 8, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function drawPlayer(state: GameState): void {
  const { x, y } = state.player;
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = "rgba(216, 184, 106, 0.5)";
  ctx.lineWidth = 2;
  for (const side of [-1, 1]) {
    for (let i = -1; i <= 1; i += 1) {
      ctx.beginPath();
      ctx.moveTo(side * 4, i * 4);
      ctx.lineTo(side * 15, i * 9);
      ctx.lineTo(side * 20, i * 10 + 3);
      ctx.stroke();
    }
  }
  ctx.shadowColor = palette.gold;
  ctx.shadowBlur = 12;
  ctx.fillStyle = palette.gold;
  ctx.beginPath();
  ctx.ellipse(0, 0, 6, 13, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = palette.ink;
  ctx.beginPath();
  ctx.arc(0, -8, 2, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function drawMotes(state: GameState, time: number): void {
  for (const mote of state.motes) {
    const angle = Math.atan2(mote.vy, mote.vx);
    ctx.save();
    ctx.translate(mote.x, mote.y);
    ctx.rotate(angle);
    if (!mote.touched && mote.drift === "swift") {
      ctx.strokeStyle = "rgba(255, 174, 116, 0.48)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-8, 0);
      ctx.lineTo(-31, 0);
      ctx.stroke();
    }
    if (!mote.touched && mote.drift === "deep") {
      ctx.strokeStyle = "rgba(177, 152, 235, 0.58)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 14 + Math.sin(time * 0.004 + mote.id) * 2, 0, TAU);
      ctx.stroke();
    }
    ctx.shadowColor = palette.coral;
    ctx.shadowBlur = mote.touched ? 5 : 15;
    ctx.fillStyle = mote.touched ? "#9ad8c4" : mote.drift === "deep" ? "#b198eb" : mote.drift === "swift" ? "#ffae74" : palette.coral;
    const wobble = Math.sin(time * 0.008 + mote.id) * 2;
    ctx.beginPath();
    const length = mote.drift === "swift" ? 14 : mote.drift === "deep" ? 8 : 10;
    const height = mote.drift === "deep" ? 10 : 8;
    ctx.moveTo(length + wobble, 0);
    ctx.quadraticCurveTo(0, -height, -9, 0);
    ctx.quadraticCurveTo(0, height, length + wobble, 0);
    ctx.fill();
    ctx.fillStyle = palette.moon;
    ctx.beginPath();
    ctx.arc(-1, 0, 2.3, 0, TAU);
    ctx.fill();
    ctx.restore();

    if (!mote.touched) {
      ctx.strokeStyle = "rgba(255, 128, 110, 0.15)";
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 8]);
      ctx.beginPath();
      ctx.moveTo(mote.x, mote.y);
      ctx.lineTo(WORLD.cx, WORLD.cy);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
}

function drawRipples(state: GameState): void {
  for (const ripple of state.ripples) {
    const alpha = Math.max(0, 1 - ripple.radius / 360);
    ctx.save();
    ctx.translate(ripple.x, ripple.y);
    ctx.strokeStyle = `rgba(180, 239, 220, ${alpha * 0.9})`;
    ctx.shadowColor = palette.mint;
    ctx.shadowBlur = 12;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, ripple.radius, -0.15, Math.PI * 1.68);
    ctx.stroke();
    ctx.strokeStyle = `rgba(216, 238, 196, ${alpha * 0.45})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, ripple.radius + 7, 0.48, Math.PI * 1.94);
    ctx.stroke();
    ctx.restore();
  }
}

function drawReeds(time: number): void {
  ctx.save();
  ctx.lineCap = "round";
  for (let index = 0; index < 15; index += 1) {
    const t = index / 14;
    const angle = REED_BELT.startAngle + (REED_BELT.endAngle - REED_BELT.startAngle) * t;
    const rootX = WORLD.cx + Math.cos(angle) * REED_BELT.radius;
    const rootY = WORLD.cy + Math.sin(angle) * REED_BELT.radius;
    const sway = settings.reducedMotion ? 0 : Math.sin(time * 0.0015 + index * 0.7) * 4;
    const height = 34 + (index % 4) * 7;
    const nx = Math.cos(angle);
    const ny = Math.sin(angle);
    ctx.strokeStyle = index % 2 === 0 ? "#8ca66c" : "#628b68";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(rootX - nx * 7, rootY - ny * 7);
    ctx.quadraticCurveTo(rootX + sway, rootY - height * 0.55, rootX + sway * 1.4, rootY - height);
    ctx.stroke();
    ctx.fillStyle = "rgba(187, 207, 126, 0.82)";
    ctx.beginPath();
    ctx.ellipse(rootX + sway * 1.4, rootY - height - 4, 3.5, 9, -0.18 + sway * 0.015, 0, TAU);
    ctx.fill();
  }
  ctx.strokeStyle = "rgba(210, 230, 151, 0.32)";
  ctx.lineWidth = 3;
  ctx.setLineDash([4, 9]);
  ctx.beginPath();
  ctx.arc(WORLD.cx, WORLD.cy, REED_BELT.radius, REED_BELT.startAngle, REED_BELT.endAngle);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

function drawHud(state: GameState): void {
  const stage = STAGES[state.stageId];
  roundRect(42, 34, 430, 92, 16);
  ctx.fillStyle = "rgba(3, 16, 23, 0.78)";
  ctx.fill();
  ctx.strokeStyle = "rgba(164, 221, 207, 0.18)";
  ctx.stroke();
  text(stage.name, 66, 62, 14, palette.gold, "left", 800);
  text(stage.instruction, 66, 91, stage.id === "first-rain" ? 20 : 17, palette.pale, "left", 650);
  text(`${Math.max(0, Math.ceil(stage.duration - state.time))}s`, 446, 78, 30, palette.moon, "right", 750);

  roundRect(894, 34, 344, 92, 16);
  ctx.fillStyle = "rgba(3, 16, 23, 0.78)";
  ctx.fill();
  ctx.stroke();
  text("BLOOM", 918, 61, 12, "#9dbbb4", "left", 800);
  text(`${state.health} / 3`, 918, 91, 22, palette.moon, "left", 700);
  text("RIPPLES", 1074, 61, 12, "#9dbbb4", "left", 800);
  for (let i = 0; i < MAX_CHARGES; i += 1) {
    ctx.fillStyle = i < state.charges ? palette.mint : "#34535a";
    ctx.beginPath();
    ctx.moveTo(1084 + i * 38, 78);
    ctx.quadraticCurveTo(1072 + i * 38, 94, 1084 + i * 38, 102);
    ctx.quadraticCurveTo(1096 + i * 38, 94, 1084 + i * 38, 78);
    ctx.fill();
  }

  text("ARROWS / WASD  glide", 52, 684, 14, "#9dbbb4", "left", 650);
  text("SPACE  cast ripple", 274, 684, 14, palette.mint, "left", 650);
  const footer = state.stageId === "shore-call"
    ? "Follow the pale shore ring to gather dew"
    : state.stageId === "split-current"
      ? "Bright swift · violet deep: save a ripple for later"
      : state.stageId === "reed-gate"
        ? "Reeds break waves · glide beyond them before casting"
        : "Shorewater restores spent ripples";
  text(footer, 1228, 684, 14, state.stageId === "first-rain" ? "#9dbbb4" : palette.mint, "right", 550);

  if (state.charges < MAX_CHARGES && Math.hypot(state.player.x - WORLD.cx, state.player.y - WORLD.cy) >= 232) {
    const progress = Math.min(1, state.recharge / 0.85);
    ctx.strokeStyle = "rgba(145, 217, 198, 0.28)";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(state.player.x, state.player.y, 26, -Math.PI / 2, -Math.PI / 2 + TAU * progress);
    ctx.stroke();
  }
}

function overlay(title: string, subtitle: string, action: string, accent = palette.moon): void {
  ctx.fillStyle = "rgba(2, 10, 15, 0.68)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  roundRect(330, 202, 620, 316, 24);
  ctx.fillStyle = "rgba(7, 28, 37, 0.96)";
  ctx.fill();
  ctx.strokeStyle = "rgba(181, 229, 211, 0.26)";
  ctx.lineWidth = 1;
  ctx.stroke();
  text(title, WORLD.cx, 289, 54, accent, "center", 800);
  text(subtitle, WORLD.cx, 357, 20, palette.pale, "center", 500);
  roundRect(474, 419, 332, 58, 29);
  ctx.fillStyle = "rgba(145, 217, 198, 0.12)";
  ctx.fill();
  ctx.strokeStyle = "rgba(145, 217, 198, 0.52)";
  ctx.stroke();
  text(action, WORLD.cx, 448, 16, palette.mint, "center", 800);
}

function drawTitle(time: number): void {
  drawBackdrop(time);
  drawPond(time);
  drawBloom(3, time);
  for (let i = 0; i < 3; i += 1) {
    ctx.strokeStyle = `rgba(145, 217, 198, ${0.23 - i * 0.045})`;
    ctx.lineWidth = 2 - i * 0.4;
    ctx.beginPath();
    ctx.arc(WORLD.cx, WORLD.cy, 78 + i * 58 + Math.sin(time * 0.001 + i) * 6, 0.12 + i * 0.4, Math.PI * 1.72 + i * 0.2);
    ctx.stroke();
  }
  text("RIPPLEKEEP", WORLD.cx, 190, 70, palette.moon, "center", 850);
  text("DEFEND THE QUIET CENTER", WORLD.cx, 247, 15, palette.gold, "center", 800);
  text("Cast a ripple now. Meet danger a moment later.", WORLD.cx, 506, 20, palette.pale, "center", 500);
  roundRect(492, 556, 296, 58, 29);
  ctx.fillStyle = "rgba(145, 217, 198, 0.12)";
  ctx.fill();
  ctx.strokeStyle = "rgba(145, 217, 198, 0.55)";
  ctx.stroke();
  text("ENTER  BEGIN FIRST RAIN", WORLD.cx, 585, 15, palette.mint, "center", 800);
  text("ARROWS / WASD  glide     SPACE  ripple     ESC  pause     S  settings", WORLD.cx, 670, 14, "#8caea8", "center", 600);
}

function render(time: number): void {
  const displayTime = settings.reducedMotion ? 0 : time;
  const visibleScreen = screen === "settings" ? returnScreen : screen;
  if (visibleScreen === "title") {
    drawTitle(displayTime);
    updateStatus();
    return;
  }
  drawBackdrop(displayTime);
  drawPond(displayTime);
  drawMotes(game, displayTime);
  drawRipples(game);
  if (STAGES[game.stageId].reeds) drawReeds(displayTime);
  drawBloom(game.health, displayTime);
  drawPlayer(game);
  drawHud(game);
  if (visibleScreen === "paused") overlay("WATER HELD", "The pond waits without advancing.", "ESC  RETURN · S  SETTINGS");
  if (screen === "won") {
    const action = game.stageId === "first-rain" ? "ENTER  FOLLOW THE SHORE"
      : game.stageId === "shore-call" ? "ENTER  READ THE CURRENT"
        : game.stageId === "split-current" ? "ENTER  CROSS THE REEDS"
          : "ENTER  PLAY AGAIN";
    overlay(`${STAGES[game.stageId].name} HELD`, `${game.score} spores returned to the dark water.`, action, palette.mint);
  }
  if (screen === "lost") overlay("THE BLOOM FOLDS", "Place the ripple where its edge will meet the next spore.", "ENTER  TRY AGAIN", palette.coral);
  updateStatus();
}

function frame(now: number): void {
  const elapsed = Math.min(0.1, (now - previous) / 1000);
  previous = now;
  if (screen === "playing") {
    accumulator += elapsed;
    const input = {
      x: (keys.has("arrowright") || keys.has("d") ? 1 : 0) - (keys.has("arrowleft") || keys.has("a") ? 1 : 0),
      y: (keys.has("arrowdown") || keys.has("s") ? 1 : 0) - (keys.has("arrowup") || keys.has("w") ? 1 : 0)
    };
    while (accumulator >= 1 / 60) {
      game = tick(game, input, 1 / 60);
      accumulator -= 1 / 60;
    }
    if (game.health < lastHealth) {
      lastHealth = game.health;
      tone(92, 0.28, "sawtooth", 0.035);
      announce(`The bloom was struck. ${game.health} petals remain.`);
    }
    if (game.score > lastScore) {
      lastScore = game.score;
      tone(520, 0.12, "sine", 0.025);
    }
    if (game.charges > lastCharges) {
      tone(720, 0.18, "sine", 0.025);
      announce(`Dew gathered. ${game.charges} ripples ready.`);
    }
    lastCharges = game.charges;
    if (game.mode === "won") {
      screen = "won";
      const next = game.stageId === "first-rain" ? "Press Enter to follow the shore."
        : game.stageId === "shore-call" ? "Press Enter to read the split current."
          : game.stageId === "split-current" ? "Press Enter to cross the reed gate."
            : "All four waters held. Press Enter to play this stage again.";
      announce(`${STAGES[game.stageId].name} held. ${next}`);
      [392, 494, 659].forEach((frequency, index) => setTimeout(() => tone(frequency, 0.32, "sine", 0.025), index * 130));
    } else if (game.mode === "lost") {
      screen = "lost";
      announce("The bloom folds. Press Enter to try again.");
    }
  }
  render(now);
  requestAnimationFrame(frame);
}

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  if (screen === "settings") {
    if (key === "escape" || key === "s") {
      event.preventDefault();
      closeSettings();
    }
    return;
  }
  if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(key)) event.preventDefault();
  if (event.repeat && (key === " " || key === "enter" || key === "escape" || key === "r")) return;
  if (key === "s" && (screen === "title" || screen === "paused")) {
    event.preventDefault();
    openSettings();
    return;
  }
  if (key === "enter" && (screen === "title" || screen === "won" || screen === "lost")) {
    const nextStage = screen === "title" ? "first-rain"
      : screen === "won" && currentStageId === "first-rain" ? "shore-call"
        : screen === "won" && currentStageId === "shore-call" ? "split-current"
          : screen === "won" && currentStageId === "split-current" ? "reed-gate"
          : currentStageId;
    startGame(nextStage);
    return;
  }
  if (key === "escape" && (screen === "playing" || screen === "paused")) {
    screen = screen === "playing" ? "paused" : "playing";
    announce(screen === "paused" ? "Paused." : "Play resumed.");
    return;
  }
  if (key === "r" && screen !== "title") {
    startGame();
    return;
  }
  if (key === " " && screen === "playing") {
    const before = game.charges;
    game = emitRipple(game);
    if (game.charges < before) {
      tone(240, 0.16, "sine", 0.03);
      announce(`${game.charges} ripples remain.`);
    } else {
      tone(110, 0.08, "triangle", 0.015);
    }
    return;
  }
  keys.add(key);
});

window.addEventListener("keyup", (event) => keys.delete(event.key.toLowerCase()));
window.addEventListener("blur", () => keys.clear());
canvas.addEventListener("pointerdown", () => canvas.focus());

volumeInput.addEventListener("input", () => {
  persistSettings({ ...settings, volume: Number(volumeInput.value) });
});
highContrastInput.addEventListener("change", () => {
  persistSettings({ ...settings, highContrast: highContrastInput.checked });
});
reducedMotionInput.addEventListener("change", () => {
  persistSettings({ ...settings, reducedMotion: reducedMotionInput.checked });
});
closeSettingsButton.addEventListener("click", closeSettings);

applySettings();

requestAnimationFrame((now) => {
  previous = now;
  requestAnimationFrame(frame);
});
