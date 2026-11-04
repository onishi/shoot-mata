import "./style.css";
import {
  HEIGHT,
  WIDTH,
  WIN_PERCENT,
  advanceMoths,
  createGame,
  movePlayer,
  restart,
  start,
  togglePause,
  type Direction,
  type GameState,
  type Point,
} from "./model";

const canvas = document.querySelector<HTMLCanvasElement>("#game")!;
const live = document.querySelector<HTMLParagraphElement>("#live")!;
const ctx = canvas.getContext("2d")!;

let state = createGame();
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
  audio ??= new AudioContext();
  if (audio.state === "suspended") void audio.resume();
  const oscillator = audio.createOscillator();
  const volume = audio.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, audio.currentTime);
  volume.gain.setValueAtTime(gain, audio.currentTime);
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
  const gradient = ctx.createRadialGradient(480, 235, 20, 480, 270, 570);
  gradient.addColorStop(0, "#242851");
  gradient.addColorStop(0.52, "#0b0e25");
  gradient.addColorStop(1, "#03040c");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.globalAlpha = 0.22;
  for (let index = 0; index < 46; index += 1) {
    const x = (index * 197 + 71) % 960;
    const y = (index * 89 + Math.sin(time / 1700 + index) * 5 + 30) % 500;
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
  const shimmer = 0.65 + Math.sin(time / 420) * 0.22;
  ctx.fillStyle = `rgba(242, 213, 138, ${shimmer})`;
  ctx.font = "700 15px Georgia";
  ctx.letterSpacing = "2px";
  ctx.fillText("PRESS ENTER TO THREAD THE LOOM", 480, 365);
  ctx.fillStyle = "#77849e";
  ctx.font = "12px Georgia";
  ctx.letterSpacing = "1.5px";
  ctx.fillText("ARROWS / WASD  MOVE     HOLD SPACE  STITCH", 480, 419);
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
      ctx.globalAlpha = 0.5 + Math.sin(time / 500 + index) * 0.18;
      ctx.beginPath(); ctx.arc(px + 16, py + 15, 1.5, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }
  } else {
    const drift = Math.sin(time / 900 + x * 0.5 + y * 0.7) * 5;
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

function drawMoths(time: number) {
  for (const moth of state.moths) {
    const p = pixel(moth);
    const cx = p.x + 15.5;
    const cy = p.y + 15.5;
    const flap = Math.sin(time / 95) * 4;
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
  ctx.rotate(Math.PI / 4 + Math.sin(time / 240) * 0.04);
  ctx.fillRect(-7, -7, 14, 14);
  ctx.fillStyle = "#4a3150"; ctx.fillRect(-3, -3, 6, 6);
  ctx.restore();
}

function drawHud() {
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
  ctx.fillRect(42, 172, Math.min(92, 92 * state.repaired / WIN_PERCENT), 4);
  ctx.fillStyle = "#8d9ab3";
  ctx.font = "10px Georgia"; ctx.letterSpacing = "1px";
  ctx.fillText(`GOAL ${WIN_PERCENT}%`, 42, 192);

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
  ctx.fillText(state.trail.length > 0 ? "THREAD EXPOSED" : "ON SAFE CLOTH", 42, 333);
  ctx.fillStyle = "#77839c";
  ctx.font = "10px Georgia"; ctx.letterSpacing = ".5px";
  ctx.fillText(state.trail.length > 0 ? `${state.trail.length} CELLS LOOSE` : "HOLD SPACE TO LEAVE", 42, 353);
}

function drawFooter() {
  ctx.fillStyle = "rgba(4, 6, 17, .78)";
  roundedRect(170, 500, 620, 27, 4); ctx.fill();
  ctx.textAlign = "center";
  ctx.fillStyle = "#8794aa";
  ctx.font = "10px Georgia"; ctx.letterSpacing = "1.2px";
  ctx.fillText("ARROWS / WASD  MOVE     HOLD SPACE  STITCH     ESC  PAUSE     R  RESTART", 480, 518);
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

function drawGame(time: number) {
  drawBackdrop(time);
  drawFrame();
  for (let y = 0; y < HEIGHT; y += 1) for (let x = 0; x < WIDTH; x += 1) drawCell(x, y, time);
  drawTrail();
  drawMoths(time);
  drawPlayer(time);
  drawHud();
  drawFooter();
  if (state.screen === "paused") drawOverlay("LOOM AT REST", "The loose thread is held in time.", "ESC TO RESUME");
  if (state.screen === "won") drawOverlay("NIGHT MENDED", `${state.repaired}% of the sky holds its weave.`, "ENTER TO WEAVE AGAIN");
  if (state.screen === "lost") drawOverlay("THREAD UNDONE", "The unraveller found every spool.", "ENTER TO RETRY");
  if (pulse > 0) {
    ctx.fillStyle = `rgba(244, 216, 151, ${pulse * 0.16})`;
    ctx.fillRect(0, 0, 960, 540);
    pulse = Math.max(0, pulse - 0.035);
  }
}

function updateAria() {
  const description = state.screen === "title"
    ? "DUSKLOOM title. Press Enter to begin."
    : `${state.screen}. ${state.repaired} percent repaired. ${state.spools} spools. ${state.trail.length} exposed thread cells.`;
  canvas.setAttribute("aria-label", description);
  canvas.dataset.screen = state.screen;
  canvas.dataset.repaired = String(state.repaired);
  canvas.dataset.spools = String(state.spools);
  canvas.dataset.trail = String(state.trail.length);
}

const directions: Record<string, Direction | undefined> = {
  ArrowUp: "up", KeyW: "up", ArrowDown: "down", KeyS: "down", ArrowLeft: "left", KeyA: "left", ArrowRight: "right", KeyD: "right",
};

window.addEventListener("keydown", (event) => {
  const direction = directions[event.code];
  if (direction || ["Enter", "Escape", "Space", "KeyR"].includes(event.code)) event.preventDefault();
  const previous = state;
  if (state.screen === "title" && event.code === "Enter") {
    state = start(state); announce("Loom started. Hold Space and move away from the repaired edge to stitch.");
  } else if ((state.screen === "won" || state.screen === "lost") && event.code === "Enter") {
    state = restart(); announce("Fresh loom started.");
  } else if (event.code === "KeyR" && state.screen !== "title") {
    state = restart(); announce("Loom restarted.");
  } else if (event.code === "Escape") {
    state = togglePause(state); announce(state.screen === "paused" ? "Paused." : "Resumed.");
  } else if (state.screen === "playing" && direction) {
    state = movePlayer(state, direction, event.shiftKey || event.getModifierState("Alt") || pressedSpace);
    if (state.lastEvent === "claim") announce(`${state.repaired} percent repaired.`);
    if (state.lastEvent === "win") announce("Night mended. Press Enter to weave again.");
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
  if (state.screen === "playing" && time - lastMothStep >= 360) {
    const previous = state;
    state = advanceMoths(state);
    lastMothStep = time;
    if (state.lastEvent === "cut" && previous.spools !== state.spools) {
      announce(state.screen === "lost" ? "All spools lost." : `Thread cut. ${state.spools} spools remain.`);
      playEvent(previous, state);
      updateAria();
    }
  }
  if (state.screen === "title") drawTitle(time); else drawGame(time);
  requestAnimationFrame(frame);
}

updateAria();
canvas.focus();
requestAnimationFrame(frame);
