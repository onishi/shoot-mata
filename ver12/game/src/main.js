import { HEIGHT, LEVELS, WIDTH, createGame, levelFor, reduce, startGame, statusText } from "./model.js";
import { loadPreferences, savePreferences } from "./preferences.js";
import { loadRankings, saveRanking } from "./rankings.js";
import { ForgeAudio } from "./audio.js";

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

let preferences = loadPreferences(localStorage, LEVELS.length);
let state = createGame(preferences.unlockedLevel);
let flash = 0;
let audio = null;
let settingsOpen = false;
let settingsRow = 0;
let demoState = startGame(createGame(0));
let demoCycleStartedAt = null;
let demoStep = 0;
let rankings = loadRankings(localStorage);
let recordedRanking = false;

const DEMO_TIMELINE = Object.freeze([
  { at: 0, action: null, label: "WATCH THE SMITH" },
  { at: 1200, action: "left", label: "1  MOVE THE LEVER" },
  { at: 2100, action: "right", label: "1  CHOOSE YOUR POSITION" },
  { at: 3100, action: "flip", label: "2  FLIP THE FIELD" },
  { at: 4700, action: null, label: "3  LOCK EVERY SEED" }
]);
const DEMO_CYCLE_MS = 6500;

function updateAttractDemo(time) {
  if (state.phase !== "attract") {
    demoCycleStartedAt = null;
    return;
  }
  if (demoCycleStartedAt === null || time - demoCycleStartedAt >= DEMO_CYCLE_MS) {
    demoState = startGame(createGame(0));
    demoCycleStartedAt = time;
    demoStep = 0;
  }
  const elapsed = time - demoCycleStartedAt;
  while (demoStep + 1 < DEMO_TIMELINE.length && elapsed >= DEMO_TIMELINE[demoStep + 1].at) {
    demoStep += 1;
    const action = DEMO_TIMELINE[demoStep].action;
    if (action) demoState = reduce(demoState, action);
  }
}

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
  const gradient = ctx.createRadialGradient(480, 700, 20, 480, 500, 650);
  gradient.addColorStop(0, "#4a261b");
  gradient.addColorStop(0.44, "#182027");
  gradient.addColorStop(1, COLORS.ink);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 960, 720);
  ctx.globalAlpha = 0.09;
  for (let i = 0; i < 26; i += 1) {
    const x = (i * 151 + time * 0.005 * (i % 3 + 1)) % 980 - 10;
    const y = 695 - ((i * 37 + time * 0.012) % 150);
    ctx.fillStyle = i % 2 ? COLORS.push : COLORS.brass;
    ctx.beginPath();
    ctx.arc(x, y, 1.5 + (i % 3), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawCabinetBands(cabinetState = state) {
  ctx.fillStyle = "#080b0e";
  ctx.fillRect(0, 0, 960, 88);
  ctx.fillRect(0, 632, 960, 88);
  ctx.strokeStyle = "#7c6240";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 87);
  ctx.lineTo(960, 87);
  ctx.moveTo(0, 633);
  ctx.lineTo(960, 633);
  ctx.stroke();
  text("LODESTAR FORGE", 36, 40, 20, COLORS.brass, "left", 800);
  text("MAGNETIC LOGIC · 1 PLAYER", 924, 40, 12, "#9f9889", "right", 700);
  text("LEVER  MOVE", 44, 676, 12, COLORS.pull, "left", 750);
  text("BUTTON 1  FLIP FIELD", 480, 676, 12, COLORS.push, "center", 750);
  const cabinetStatus = cabinetState.phase === "attract" ? "INSERT COIN  C"
    : cabinetState.phase === "ready" ? `CREDIT  ${cabinetState.credits}   ·   START  ENTER`
      : cabinetState.phase === "gameover" ? "CONTINUE?  C   ·   SCORE  ENTER"
        : cabinetState.phase === "continue_ready" ? `CREDIT  ${cabinetState.credits}   ·   CONTINUE  ENTER`
      : cabinetState.phase === "won" ? "CREDIT  0   ·   NEXT  ENTER"
        : cabinetState.phase === "initials" ? "LEVER  SELECT   ·   BUTTON 1  ENTER"
          : cabinetState.phase === "ranking" ? "LOCAL RECORDS   ·   ENTER  EXIT" : "CREDIT  0   ·   1 PLAYER";
  text(cabinetStatus, 916, 676, 12, COLORS.brass, "right", 750);
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

function drawSigil(sigil) {
  if (!sigil) return;
  const p = cellCenter(sigil);
  const lit = state.sigilLit;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = lit ? "#d8ab5e55" : "#261e17";
  ctx.strokeStyle = lit ? COLORS.brass : "#765a35";
  ctx.lineWidth = lit ? 4 : 2;
  ctx.fillRect(-17, -17, 34, 34);
  ctx.strokeRect(-17, -17, 34, 34);
  ctx.rotate(-Math.PI / 4);
  ctx.strokeStyle = lit ? COLORS.pale : COLORS.brass;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-11, 0);
  ctx.lineTo(11, 0);
  ctx.moveTo(0, -11);
  ctx.lineTo(0, 11);
  ctx.stroke();
  ctx.restore();
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

function drawBlock(block) {
  const x = BOARD_X + block.x * CELL + 5;
  const y = BOARD_Y + block.y * CELL + 5;
  roundedRect(x, y, CELL - 10, CELL - 10, 4);
  const g = ctx.createLinearGradient(x, y, x + CELL, y + CELL);
  g.addColorStop(0, "#9ba3a2");
  g.addColorStop(0.42, "#343d40");
  g.addColorStop(1, "#737c79");
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = COLORS.pull;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.strokeStyle = "#d3d5ca88";
  ctx.beginPath();
  ctx.moveTo(x + 12, y + 8);
  ctx.lineTo(x + 8, y + 20);
  ctx.lineTo(x + 16, y + 28);
  ctx.moveTo(x + 32, y + 14);
  ctx.lineTo(x + 38, y + 22);
  ctx.lineTo(x + 31, y + 36);
  ctx.stroke();
}

function drawPole(pole) {
  const p = cellCenter(pole);
  const horizontal = pole.blocksAxis === "horizontal";
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.strokeStyle = COLORS.pull;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, 20, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = COLORS.push;
  ctx.lineWidth = 4;
  for (const offset of [-9, 0, 9]) {
    ctx.beginPath();
    if (horizontal) {
      ctx.moveTo(-15, offset);
      ctx.lineTo(15, offset);
    } else {
      ctx.moveTo(offset, -15);
      ctx.lineTo(offset, 15);
    }
    ctx.stroke();
  }
  ctx.fillStyle = COLORS.pale;
  ctx.beginPath();
  ctx.arc(0, 0, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawField(time) {
  if (!state.pulseFrom || state.phase === "attract" || state.phase === "ready") return;
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
  if (shard.respondsTo) {
    ctx.rotate(-(shard.x * 0.4 + shard.y * 0.7) - (shard.docked ? 0 : Math.sin(time / 650) * 0.08));
    ctx.strokeStyle = COLORS.ink;
    ctx.lineWidth = 4;
    ctx.beginPath();
    if (shard.respondsTo === "pull") {
      ctx.moveTo(-9, -4);
      ctx.lineTo(-3, 0);
      ctx.lineTo(-9, 4);
      ctx.moveTo(9, -4);
      ctx.lineTo(3, 0);
      ctx.lineTo(9, 4);
    } else {
      ctx.moveTo(-3, -4);
      ctx.lineTo(-9, 0);
      ctx.lineTo(-3, 4);
      ctx.moveTo(3, -4);
      ctx.lineTo(9, 0);
      ctx.lineTo(3, 4);
    }
    ctx.stroke();
  }
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
  const level = levelFor(state);
  text("LODESTAR", 46, 56, 17, COLORS.brass, "left", 700);
  text("FORGE", 46, 81, 29, COLORS.pale, "left", 800);
  text(`CHAMBER ${String(state.levelIndex + 1).padStart(2, "0")}`, 46, 120, 11, "#8e938d", "left", 650);
  text(level.name.toUpperCase(), 46, 142, 10, COLORS.brass, "left", 650);
  const color = state.polarity === "pull" ? COLORS.pull : COLORS.push;
  text("FIELD", 46, 174, 11, "#8e938d", "left", 650);
  text(state.polarity.toUpperCase(), 46, 202, 24, color, "left", 800);
  text(state.polarity === "pull" ? "INWARD  «" : "OUTWARD  »", 46, 226, 11, color);
  if (level.sigil) text(`TEMPER  ${state.sigilLit ? "LIT" : `+${level.sigil.bonus}`}`, 46, 253, 10, state.sigilLit ? COLORS.pale : COLORS.brass, "left", 750);
  const docked = state.shards.filter((shard) => shard.docked).length;
  text("SEEDS LOCKED", 46, 287, 11, "#8e938d", "left", 650);
  text(`${docked} / 3`, 46, 318, 25, COLORS.brass, "left", 800);
  text("FORGE HEAT", 46, 369, 11, "#8e938d", "left", 650);
  text(`${String(state.pulses).padStart(2, "0")} / ${String(level.pulseLimit).padStart(2, "0")}`, 46, 398, 19, state.pulses >= level.pulseLimit - 1 ? COLORS.push : COLORS.pale, "left", 700);
  text(`UNDO  ${state.undoUsed ? "SPENT" : state.undoSnapshot ? "READY" : "STANDBY"}`, 46, 423, 9, state.undoUsed ? "#737a78" : COLORS.pull, "left", 700);
  text("SCORE", 46, 449, 11, "#8e938d", "left", 650);
  text(String(state.score).padStart(6, "0"), 46, 476, 20, COLORS.brass, "left", 750);
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
  text(title, 480, 196, title.length > 22 ? 29 : 35, COLORS.pale, "center", 800);
  text(body, 480, 252, 15, "#b9b4a7", "center", 500);
  const instructions = state.phase === "attract" || state.phase === "ready";
  const failed = state.phase === "gameover" || state.phase === "continue_ready";
  text(instructions ? "LEVER TO AIM" : failed ? `FORGE HEAT  ${state.pulses} / ${levelFor(state).pulseLimit}` : `POLARITY FLIPS  ${state.pulses}`, 480, 295, 12, color, "center", 700);
  text(instructions ? "BUTTON 1 FLIPS EVERY SEED" : failed ? (state.phase === "gameover" ? "CHAMBER LIMIT REACHED" : "CHAMBER WILL REWIND") : "ALL THREE SEEDS ARE LOCKED", 480, 319, 12, color, "center", 700);
  text(prompt, 480, 366, 13, COLORS.pale, "center", 700);
}

function drawAttractDemo() {
  roundedRect(22, 92, 180, 336, 7);
  ctx.fillStyle = "#080c10e8";
  ctx.fill();
  ctx.strokeStyle = COLORS.brass;
  ctx.lineWidth = 2;
  ctx.stroke();
  text("HOW TO PLAY", 112, 128, 17, COLORS.pale, "center", 800);
  text("AUTO DEMO", 112, 154, 10, COLORS.brass, "center", 700);

  const steps = ["1  MOVE", "2  FLIP", "3  LOCK 3"];
  steps.forEach((label, index) => {
    const active = index === 0 ? demoStep >= 1 : index === 1 ? demoStep >= 3 : demoStep >= 4;
    const y = 207 + index * 58;
    roundedRect(42, y - 19, 140, 38, 4);
    ctx.fillStyle = active ? (index === 1 ? "#5a3024" : "#173d3d") : "#121a20";
    ctx.fill();
    ctx.strokeStyle = active ? (index === 1 ? COLORS.push : COLORS.pull) : "#38434a";
    ctx.stroke();
    text(label, 112, y, 12, active ? COLORS.pale : "#737a78", "center", 750);
  });

  text(DEMO_TIMELINE[demoStep].label, 480, 508, 12, demoStep >= 3 ? COLORS.push : COLORS.pull, "center", 750);
  text("PRESS C TO INSERT COIN", 112, 390, 11, COLORS.brass, "center", 800);
}

function drawSettings() {
  ctx.fillStyle = "#05080bf2";
  ctx.fillRect(0, 0, 960, 540);
  ctx.strokeStyle = COLORS.pull;
  ctx.lineWidth = 2;
  roundedRect(244, 112, 472, 316, 8);
  ctx.fillStyle = "#11181ef5";
  ctx.fill();
  ctx.stroke();
  text("FORGE SETTINGS", 480, 166, 29, COLORS.pale, "center", 800);
  text("↑ ↓ SELECT   ·   ← → CHANGE", 480, 202, 11, "#8e938d", "center", 650);
  const rows = [
    { label: "SOUND", value: preferences.volume === 0 ? "MUTED" : `${Math.round(preferences.volume * 100)}%` },
    { label: "MOTION", value: preferences.reducedMotion ? "REDUCED" : "FULL" }
  ];
  rows.forEach((row, index) => {
    const y = 258 + index * 62;
    if (settingsRow === index) {
      roundedRect(294, y - 24, 372, 48, 5);
      ctx.fillStyle = "#203139";
      ctx.fill();
      ctx.strokeStyle = COLORS.brass;
      ctx.stroke();
    }
    text(row.label, 324, y, 13, settingsRow === index ? COLORS.brass : "#a39d90", "left", 700);
    text(`‹  ${row.value}  ›`, 636, y, 14, COLORS.pale, "right", 700);
  });
  text("M OR ESC TO CLOSE", 480, 390, 12, COLORS.pull, "center", 700);
}

function drawInitials() {
  ctx.fillStyle = "#05080bf2";
  ctx.fillRect(0, 0, 960, 540);
  text(state.outcome === "over" ? "GAME OVER" : "FORGE COMPLETE", 480, 116, 20, state.outcome === "over" ? COLORS.push : COLORS.brass, "center", 800);
  text("FINAL SCORE", 480, 158, 12, "#9f9889", "center", 700);
  text(String(state.score).padStart(6, "0"), 480, 198, 34, COLORS.pale, "center", 800);
  text("ENTER YOUR INITIALS", 480, 250, 15, COLORS.pull, "center", 750);
  state.initials.forEach((letter, index) => {
    const x = 398 + index * 82;
    roundedRect(x - 30, 286, 60, 72, 5);
    ctx.fillStyle = index === state.initialCursor ? "#263d40" : "#11181e";
    ctx.fill();
    ctx.strokeStyle = index === state.initialCursor ? COLORS.brass : "#465159";
    ctx.lineWidth = index === state.initialCursor ? 3 : 1;
    ctx.stroke();
    text(letter, x, 322, 34, COLORS.pale, "center", 800);
    if (index === state.initialCursor) text("▲  ▼", x, 380, 11, COLORS.brass, "center", 700);
  });
  text("← → SELECT   ·   ↑ ↓ LETTER", 480, 422, 11, "#a9a397", "center", 700);
  text("BUTTON 1  REGISTER", 480, 462, 13, COLORS.push, "center", 800);
}

function drawRanking() {
  ctx.fillStyle = "#05080bf2";
  ctx.fillRect(0, 0, 960, 540);
  text("MASTER FORGERS", 480, 92, 29, COLORS.brass, "center", 800);
  text("LOCAL TOP FIVE", 480, 127, 11, "#9f9889", "center", 700);
  const submitted = state.initials.join("");
  for (let index = 0; index < 5; index += 1) {
    const entry = rankings[index];
    const y = 181 + index * 55;
    const current = entry && entry.initials === submitted && entry.score === state.score;
    if (current) {
      roundedRect(320, y - 22, 320, 44, 5);
      ctx.fillStyle = "#26352f";
      ctx.fill();
      ctx.strokeStyle = COLORS.brass;
      ctx.stroke();
    }
    text(`${index + 1}`, 350, y, 14, current ? COLORS.brass : "#7e857f", "center", 750);
    text(entry?.initials ?? "---", 405, y, 17, entry ? COLORS.pale : "#596168", "left", 800);
    text(entry ? String(entry.score).padStart(6, "0") : "------", 610, y, 17, entry ? COLORS.brass : "#596168", "right", 750);
  }
  text("PRESS ENTER · RETURN TO ATTRACT", 480, 490, 12, COLORS.pull, "center", 750);
}

function render(time = 0) {
  updateAttractDemo(time);
  const liveState = state;
  const showingDemo = liveState.phase === "attract";
  if (showingDemo) state = demoState;
  const displayTime = preferences.reducedMotion ? 0 : time;
  const level = levelFor(state);
  flash = preferences.reducedMotion ? 0 : Math.max(0, flash - 0.035);
  drawBackdrop(displayTime);
  drawCabinetBands(liveState);
  ctx.save();
  ctx.translate(0, 90);
  drawBoard();
  for (const socket of level.sockets) drawSocket(socket, state.shards.some((shard) => shard.docked && shard.x === socket.x && shard.y === socket.y));
  drawSigil(level.sigil);
  for (const wall of level.walls) drawWall(wall);
  for (const block of level.blocks) drawBlock(block);
  for (const pole of level.poles) drawPole(pole);
  drawField(displayTime);
  for (const shard of state.shards) drawShard(shard, displayTime);
  drawPlayer();
  if (!showingDemo) drawHud();
  if (showingDemo) drawAttractDemo();
  state = liveState;
  if (state.phase === "ready") overlay("CREDIT 1", "Stand where the field should bend.", "PRESS ENTER TO START", COLORS.pull);
  if (state.phase === "gameover") overlay("FORGE OVERHEATED", "The field took too many polarity strikes.", "C TO CONTINUE  ·  ENTER TO RECORD SCORE", COLORS.push);
  if (state.phase === "continue_ready") overlay("CONTINUE READY", "The chamber and its score will rewind.", "PRESS ENTER TO RETURN TO THE FORGE", COLORS.pull);
  if (state.phase === "paused") overlay("FIELD SUSPENDED", "The chamber is holding its shape.", "ESC TO RESUME", COLORS.pull);
  if (state.phase === "won") {
    const final = state.levelIndex === LEVELS.length - 1;
    const titles = ["THE FIRST MOLD HOLDS", "THE IRON BRAKE HOLDS", "THE POLAR VEIL HOLDS", "THE COLD LODESTONE HOLDS", "THE TEMPERED RELAY HOLDS", "THE CROWN IS FORGED"];
    const bodies = [
      "Three wandering metals, one finished constellation.",
      "A fixed mass gave the field a rhythm.",
      "Iron and pole held two beats for the final strike.",
      "One cold seed woke only when the field drew inward.",
      "Iron and pole passed the final heat across three rhythms.",
      "Opposed lodestones ring. The forge answers as one."
    ];
    overlay(titles[state.levelIndex], bodies[state.levelIndex], final ? "PRESS ENTER · RECORD YOUR SCORE" : `PRESS ENTER FOR CHAMBER ${String(state.levelIndex + 2).padStart(2, "0")}`);
  }
  if (state.phase === "initials") drawInitials();
  if (state.phase === "ranking") drawRanking();
  if (settingsOpen) drawSettings();
  ctx.restore();
  canvas.dataset.phase = state.phase;
  canvas.dataset.chamber = String(state.levelIndex + 1);
  canvas.dataset.polarity = state.polarity;
  canvas.dataset.docked = String(state.shards.filter((shard) => shard.docked).length);
  canvas.dataset.credits = String(state.credits);
  canvas.dataset.score = String(state.score);
  canvas.dataset.sigilLit = String(state.sigilLit);
  canvas.dataset.undo = state.undoUsed ? "spent" : state.undoSnapshot ? "ready" : "standby";
  canvas.dataset.heatLimit = String(levelFor(state).pulseLimit);
  canvas.dataset.continues = String(state.continues);
  canvas.dataset.outcome = state.outcome ?? "none";
  canvas.dataset.volume = String(preferences.volume);
  canvas.dataset.reducedMotion = String(preferences.reducedMotion);
  canvas.dataset.demoStep = showingDemo ? String(demoStep) : "off";
  canvas.dataset.demoDocked = showingDemo ? String(demoState.shards.filter((shard) => shard.docked).length) : "off";
  canvas.dataset.initials = state.initials.join("");
  canvas.dataset.initialCursor = String(state.initialCursor);
  canvas.dataset.rankingCount = String(rankings.length);
  canvas.dataset.audioScene = audio?.scene ?? "uninitialized";
  canvas.dataset.audioCue = audio?.lastCue ?? "none";
  canvas.dataset.audioMuted = String(preferences.volume === 0);
  canvas.setAttribute("aria-label", settingsOpen
    ? `Settings. ${settingsRow === 0 ? "Sound" : "Motion"} selected. Sound ${Math.round(preferences.volume * 100)} percent. Motion ${preferences.reducedMotion ? "reduced" : "full"}. Up and down select. Left and right change. M or Escape closes.`
    : statusText(state));
  requestAnimationFrame(render);
}

function ensureAudio() {
  if (!audio) audio = new ForgeAudio(new AudioContext());
  audio.setVolume(preferences.volume);
  audio.resume();
}

const keyActions = {
  ArrowLeft: "left", KeyA: "left", ArrowRight: "right", KeyD: "right",
  ArrowUp: "up", KeyW: "up", ArrowDown: "down", KeyS: "down",
  Space: "flip", Enter: "enter", KeyC: "coin", Digit5: "coin", KeyU: "undo", KeyR: "reset", Escape: "pause"
};

function storePreferences(next) {
  preferences = savePreferences(localStorage, next, LEVELS.length);
  if (audio) audio.setVolume(preferences.volume);
}

function handleSettingsKey(event) {
  if (event.code === "KeyM" || event.code === "Escape") {
    settingsOpen = false;
    return true;
  }
  if (event.code === "ArrowUp" || event.code === "ArrowDown") {
    settingsRow = settingsRow === 0 ? 1 : 0;
    return true;
  }
  if (event.code !== "ArrowLeft" && event.code !== "ArrowRight" && event.code !== "Enter" && event.code !== "Space") return false;
  if (settingsRow === 0) {
    if (event.code !== "ArrowLeft" && event.code !== "ArrowRight") return true;
    const step = event.code === "ArrowLeft" ? -0.1 : 0.1;
    storePreferences({ ...preferences, volume: preferences.volume + step });
  } else {
    storePreferences({ ...preferences, reducedMotion: !preferences.reducedMotion });
  }
  return true;
}

window.addEventListener("keydown", (event) => {
  if (settingsOpen) {
    if (handleSettingsKey(event)) event.preventDefault();
    return;
  }
  if (event.code === "KeyM") {
    event.preventDefault();
    settingsOpen = true;
    return;
  }
  const action = keyActions[event.code] ?? keyActions[event.key];
  if (!action) return;
  event.preventDefault();
  ensureAudio();
  const previous = state;
  state = reduce(state, action);
  if (state === previous) return;
  if (state.phase === "ranking" && previous.phase === "initials" && !recordedRanking) {
    rankings = saveRanking(localStorage, rankings, state.initials.join(""), state.score);
    recordedRanking = true;
  }
  if (previous.phase === "ranking" && state.phase === "attract") recordedRanking = false;
  if (state.levelIndex > preferences.unlockedLevel) {
    storePreferences({ ...preferences, unlockedLevel: state.levelIndex });
  }
  if (state.phase === "ranking" && previous.phase === "initials") {
    audio.setScene("silent");
    audio.cue("ranking");
  } else if (state.phase === "attract" && previous.phase === "ranking") {
    audio.setScene("silent");
  } else if (action === "undo") {
    flash = 0;
    audio.setScene("play");
    audio.cue("blocked");
  } else if (action === "flip") {
    flash = 1;
    audio.cue(state.polarity === "pull" ? "pull" : "push");
    const newlyDocked = state.shards.filter((shard, i) => shard.docked && !previous.shards[i].docked).length;
    if (newlyDocked) audio.cue("dock", newlyDocked);
    if (state.sigilLit && !previous.sigilLit) audio.cue("sigil");
    if (state.phase === "won") {
      audio.setScene("silent");
      audio.cue(state.levelIndex === LEVELS.length - 1 ? "ending" : "chamber");
    } else if (state.phase === "gameover") {
      audio.setScene("silent");
      audio.cue("gameover");
    }
  } else if (action === "coin") {
    audio.cue("coin");
  } else if (action === "enter" && state.phase === "playing") {
    if (previous.phase === "ready" || previous.phase === "continue_ready") audio.cue("start");
    audio.setScene("play", previous.phase === "ready" || previous.phase === "continue_ready" ? 0.35 : 0);
  } else if (action === "pause") {
    audio.setScene(state.phase === "playing" ? "play" : "silent");
  } else if (["left", "right", "up", "down"].includes(action)) {
    audio.cue(state.player.x === previous.player.x && state.player.y === previous.player.y ? "blocked" : "move");
  }
});

canvas.addEventListener("pointerdown", () => canvas.focus());
canvas.setAttribute("aria-keyshortcuts", "C 5 Enter ArrowLeft ArrowRight ArrowUp ArrowDown Space U R Escape M");
requestAnimationFrame(render);
