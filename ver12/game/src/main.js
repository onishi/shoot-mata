import { HEIGHT, LEVEL, WIDTH, createGame, reduce, statusText } from "./model.js";

const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
const CELL = 56;
const BOARD_X = 228;
const BOARD_Y = 88;
const COLORS = {
  ink: "#0b1015",
  iron: "#172129",
  seam: "#31404a",
  brass: "#d8ab5e",
  pale: "#efe6d2",
  pull: "#50c8c4",
  push: "#ef884f",
  ember: "#d56845"
};

let state = createGame();
let flash = 0;
let audio = null;

function roundedRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function text(value, x, y, size, color = COLORS.pale, align = "left", weight = 500) {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px ui-sans-serif, system-ui, sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  ctx.fillText(value, x, y);
}

function cellCenter(position) {
  return { x: BOARD_X + (position.x + 0.5) * CELL, y: BOARD_Y + (position.y + 0.5) * CELL };
}

function drawBackdrop(time) {
  const gradient = ctx.createRadialGradient(480, 530, 20, 480, 440, 520);
  gradient.addColorStop(0, "#4a261b");
  gradient.addColorStop(0.44, "#182027");
  gradient.addColorStop(1, COLORS.ink);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 960, 540);
  ctx.globalAlpha = 0.09;
  for (let i = 0; i < 26; i += 1) {
    const x = (i * 151 + time * 0.005 * (i % 3 + 1)) % 980 - 10;
    const y = 515 - ((i * 37 + time * 0.012) % 105);
    ctx.fillStyle = i % 2 ? COLORS.push : COLORS.brass;
    ctx.beginPath();
    ctx.arc(x, y, 1.5 + (i % 3), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawBoard() {
  roundedRect(BOARD_X - 8, BOARD_Y - 8, WIDTH * CELL + 16, HEIGHT * CELL + 16, 10);
  ctx.fillStyle = "#0a0e12";
  ctx.fill();
  ctx.strokeStyle = "#7c6240";
  ctx.lineWidth = 2;
  ctx.stroke();
  for (let y = 0; y < HEIGHT; y += 1) {
    for (let x = 0; x < WIDTH; x += 1) {
      const odd = (x + y) % 2;
      ctx.fillStyle = odd ? "#172027" : "#1b252d";
      ctx.fillRect(BOARD_X + x * CELL + 1, BOARD_Y + y * CELL + 1, CELL - 2, CELL - 2);
      ctx.strokeStyle = COLORS.seam;
      ctx.lineWidth = 1;
      ctx.strokeRect(BOARD_X + x * CELL + 5, BOARD_Y + y * CELL + 5, CELL - 10, CELL - 10);
      ctx.fillStyle = "#070a0d66";
      ctx.beginPath();
      ctx.arc(BOARD_X + x * CELL + 9, BOARD_Y + y * CELL + 9, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(BOARD_X + (x + 1) * CELL - 9, BOARD_Y + (y + 1) * CELL - 9, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawSocket(socket, occupied) {
  const p = cellCenter(socket);
  ctx.strokeStyle = occupied ? COLORS.brass : "#a57c47";
  ctx.lineWidth = occupied ? 5 : 3;
  ctx.beginPath();
  ctx.arc(p.x, p.y, 20, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([3, 5]);
  ctx.beginPath();
  ctx.arc(p.x, p.y, 13, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = occupied ? "#d8ab5e44" : "#050709";
  ctx.beginPath();
  ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
  ctx.fill();
}

function drawWall(wall) {
  const x = BOARD_X + wall.x * CELL + 7;
  const y = BOARD_Y + wall.y * CELL + 7;
  roundedRect(x, y, CELL - 14, CELL - 14, 5);
  const g = ctx.createLinearGradient(x, y, x + CELL, y + CELL);
  g.addColorStop(0, "#4c5355");
  g.addColorStop(0.5, "#20272a");
  g.addColorStop(1, "#5d402f");
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = "#82664d";
  ctx.stroke();
}

function drawField(time) {
  if (!state.pulseFrom || state.phase === "title") return;
  const p = cellCenter(state.pulseFrom);
  const color = state.polarity === "pull" ? COLORS.pull : COLORS.push;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.2 + flash * 0.55;
  for (let i = 0; i < 5; i += 1) {
    const radius = 35 + i * 34 + Math.sin(time / 180 + i) * 3;
    ctx.beginPath();
    ctx.arc(p.x, p.y, radius, -2.75, -0.35);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(p.x, p.y, radius, 0.4, 2.7);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

const shardColors = { cobalt: "#5ac3ca", ember: "#df7957", pearl: "#d8cfba" };

function drawShard(shard, time) {
  const p = cellCenter(shard);
  const radius = shard.docked ? 15 : 17 + Math.sin(time / 260 + shard.x) * 1.2;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate((shard.x * 0.4 + shard.y * 0.7) + (shard.docked ? 0 : Math.sin(time / 650) * 0.08));
  ctx.fillStyle = shardColors[shard.id];
  ctx.strokeStyle = shard.docked ? COLORS.brass : "#f2e8d0";
  ctx.lineWidth = shard.docked ? 4 : 2;
  ctx.beginPath();
  for (let i = 0; i < 8; i += 1) {
    const angle = i * Math.PI / 4;
    const r = radius * (i % 2 ? 0.73 : 1);
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawPlayer() {
  const p = cellCenter(state.player);
  const color = state.polarity === "pull" ? COLORS.pull : COLORS.push;
  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(p.x - 19, p.y + 18);
  ctx.quadraticCurveTo(p.x, p.y + 5, p.x + 19, p.y + 18);
  ctx.stroke();
  ctx.fillStyle = "#262e31";
  ctx.beginPath();
  ctx.arc(p.x, p.y + 4, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.pale;
  ctx.beginPath();
  ctx.arc(p.x, p.y - 7, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#20272b";
  ctx.fillRect(p.x - 6, p.y - 10, 12, 5);
  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(p.x + 15, p.y + 8);
  ctx.lineTo(p.x + 25, p.y - 18);
  ctx.stroke();
  ctx.beginPath();
  if (state.polarity === "pull") {
    ctx.arc(p.x + 25, p.y - 19, 7, 0.2, Math.PI - 0.2);
  } else {
    ctx.moveTo(p.x + 18, p.y - 24);
    ctx.lineTo(p.x + 31, p.y - 14);
  }
  ctx.stroke();
}

function drawHud() {
  text("LODESTAR", 46, 56, 17, COLORS.brass, "left", 700);
  text("FORGE", 46, 81, 29, COLORS.pale, "left", 800);
  text("CHAMBER 01", 46, 120, 11, "#8e938d", "left", 650);
  const color = state.polarity === "pull" ? COLORS.pull : COLORS.push;
  text("FIELD", 46, 174, 11, "#8e938d", "left", 650);
  text(state.polarity.toUpperCase(), 46, 202, 24, color, "left", 800);
  text(state.polarity === "pull" ? "INWARD  «" : "OUTWARD  »", 46, 226, 11, color);
  const docked = state.shards.filter((shard) => shard.docked).length;
  text("SEEDS LOCKED", 46, 287, 11, "#8e938d", "left", 650);
  text(`${docked} / 3`, 46, 318, 25, COLORS.brass, "left", 800);
  text("FLIPS", 46, 369, 11, "#8e938d", "left", 650);
  text(String(state.pulses).padStart(2, "0"), 46, 398, 22, COLORS.pale, "left", 700);
  if (state.lastEvent) text(state.lastEvent.toUpperCase(), 480, 507, 12, state.lastEvent.includes("resistance") ? COLORS.push : COLORS.brass, "center", 650);
}

function overlay(title, body, prompt, color = COLORS.brass) {
  ctx.fillStyle = "#05080bdd";
  ctx.fillRect(0, 0, 960, 540);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  roundedRect(238, 126, 484, 288, 8);
  ctx.fillStyle = "#11181eed";
  ctx.fill();
  ctx.stroke();
  text(title, 480, 196, 35, COLORS.pale, "center", 800);
  text(body, 480, 252, 15, "#b9b4a7", "center", 500);
  text(state.phase === "title" ? "MOVE TO AIM" : `POLARITY FLIPS  ${state.pulses}`, 480, 295, 12, color, "center", 700);
  text(state.phase === "title" ? "SPACE TO FLIP THE WHOLE FIELD" : "ALL THREE SEEDS ARE LOCKED", 480, 319, 12, color, "center", 700);
  text(prompt, 480, 366, 13, COLORS.pale, "center", 700);
}

function render(time = 0) {
  flash = Math.max(0, flash - 0.035);
  drawBackdrop(time);
  drawBoard();
  for (const socket of LEVEL.sockets) drawSocket(socket, state.shards.some((shard) => shard.docked && shard.x === socket.x && shard.y === socket.y));
  for (const wall of LEVEL.walls) drawWall(wall);
  drawField(time);
  for (const shard of state.shards) drawShard(shard, time);
  drawPlayer();
  drawHud();
  if (state.phase === "title") overlay("LODESTAR FORGE", "Stand where the field should bend.", "PRESS ENTER TO IGNITE");
  if (state.phase === "paused") overlay("FIELD SUSPENDED", "The chamber is holding its shape.", "ESC TO RESUME", COLORS.pull);
  if (state.phase === "won") overlay("THE FIRST MOLD HOLDS", "Three wandering metals, one finished constellation.", "PRESS ENTER TO REFORGE");
  canvas.dataset.phase = state.phase;
  canvas.dataset.polarity = state.polarity;
  canvas.dataset.docked = String(state.shards.filter((shard) => shard.docked).length);
  canvas.setAttribute("aria-label", statusText(state));
  requestAnimationFrame(render);
}

function ensureAudio() {
  if (!audio) audio = new AudioContext();
  if (audio.state === "suspended") audio.resume();
}

function tone(frequency, delay = 0, duration = 0.08, volume = 0.035) {
  if (!audio) return;
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  oscillator.type = "triangle";
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(volume, audio.currentTime + delay);
  gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + delay + duration);
  oscillator.connect(gain).connect(audio.destination);
  oscillator.start(audio.currentTime + delay);
  oscillator.stop(audio.currentTime + delay + duration);
}

const keyActions = {
  ArrowLeft: "left", KeyA: "left", ArrowRight: "right", KeyD: "right",
  ArrowUp: "up", KeyW: "up", ArrowDown: "down", KeyS: "down",
  Space: "flip", Enter: "enter", KeyR: "reset", Escape: "pause"
};

window.addEventListener("keydown", (event) => {
  const action = keyActions[event.code] ?? keyActions[event.key];
  if (!action) return;
  event.preventDefault();
  ensureAudio();
  const previous = state;
  state = reduce(state, action);
  if (state === previous) return;
  if (action === "flip") {
    flash = 1;
    tone(state.polarity === "pull" ? 280 : 180);
    tone(state.polarity === "pull" ? 420 : 260, 0.05, 0.12);
    const newlyDocked = state.shards.filter((shard, i) => shard.docked && !previous.shards[i].docked).length;
    for (let i = 0; i < newlyDocked; i += 1) tone(520 + i * 90, 0.12 + i * 0.06, 0.2, 0.05);
    if (state.phase === "won") {
      tone(392, 0.2, 0.25, 0.05);
      tone(494, 0.29, 0.25, 0.05);
      tone(659, 0.38, 0.35, 0.05);
    }
  } else if (["left", "right", "up", "down"].includes(action)) {
    tone(state.player.x === previous.player.x && state.player.y === previous.player.y ? 95 : 135, 0, 0.04, 0.018);
  }
});

canvas.addEventListener("pointerdown", () => canvas.focus());
canvas.setAttribute("aria-keyshortcuts", "Enter ArrowLeft ArrowRight ArrowUp ArrowDown Space R Escape");
requestAnimationFrame(render);
