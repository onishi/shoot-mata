import "./style.css";
import {
  FLOW_MS,
  NODES,
  SWITCHES,
  advance,
  createGame,
  getNextNode,
  resetGame,
  selectSwitch,
  snapshot,
  startGame,
  togglePause,
  toggleSelectedSwitch,
} from "./model.js";

const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
const live = document.querySelector("#live");
let state = createGame();
let lastTime = performance.now();
let accumulator = 0;
let audioContext = null;
let pulseFrom = "root";
let pulseTo = "fork";

const COLORS = {
  bg: "#091713",
  soil: "#10231c",
  root: "#8eaa92",
  dim: "#355648",
  ink: "#e7f1df",
  muted: "#9ab0a3",
  lime: "#c8f39b",
  moon: "#ff8f82",
  rain: "#69d7d0",
  bell: "#ffd369",
  danger: "#b8685e",
};

const DISPLAY_NAMES = {
  fork: "FORK",
  graft: "GRAFT",
  crown: "CROWN",
  moon: "MOON FLOWER",
  rain: "RAIN FLOWER",
  bell: "BELL FLOWER",
  blight: "BLIGHT",
  receiver: "RECEIVER",
  returnA: "RETURN ROOT",
};

const EDGES = Object.entries(NODES).flatMap(([id, node]) => (node.next ?? []).map((to, index) => ({ from: id, to, index })));

function ensureAudio() {
  if (!audioContext) audioContext = new AudioContext();
  if (audioContext.state === "suspended") audioContext.resume();
}

function tone(frequency, duration = 0.08, type = "sine", gain = 0.035, delay = 0) {
  if (!audioContext) return;
  const start = audioContext.currentTime + delay;
  const osc = audioContext.createOscillator();
  const amp = audioContext.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, start);
  amp.gain.setValueAtTime(gain, start);
  amp.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(amp).connect(audioContext.destination);
  osc.start(start);
  osc.stop(start + duration);
}

function sound(event) {
  if (event.type === "switch") {
    tone(330, 0.08, "triangle"); tone(440, 0.1, "triangle", 0.03, 0.055);
  } else if (event.type === "bloom") {
    tone(392, 0.18, "sine"); tone(587, 0.22, "sine", 0.035, 0.06);
  } else if (event.type === "strike") {
    tone(150, 0.28, "sawtooth", 0.025); tone(92, 0.3, "triangle", 0.03, 0.08);
  } else if (event.type === "won") {
    tone(392, 0.35); tone(494, 0.35, "sine", 0.03, 0.1); tone(659, 0.5, "sine", 0.03, 0.2);
  } else if (event.type === "move") {
    tone(185, 0.045, "triangle", 0.018);
  }
}

function announce(message) {
  live.textContent = "";
  requestAnimationFrame(() => { live.textContent = message; });
}

function updateAccessibleName() {
  if (state.phase === "title") {
    canvas.setAttribute("aria-label", "SIGNAL GARDEN title. Press Enter to begin.");
    return;
  }
  const flowers = Object.values(state.blooms).filter(Boolean).length;
  const selected = SWITCHES[state.selectedSwitch];
  canvas.setAttribute("aria-label", `${state.phase}. Seed at ${state.node}. ${flowers} of 3 flowers open. ${state.lives} lives. ${selected} switch selected.`);
}

function handleKey(event) {
  const key = event.key.toLowerCase();
  if (["arrowleft", "arrowright", " ", "enter", "escape", "a", "d", "r"].includes(key)) event.preventDefault();
  ensureAudio();
  if (key === "enter") {
    if (startGame(state)) {
      accumulator = 0;
      pulseFrom = "root";
      pulseTo = "fork";
      announce("Garden started. Fork switch selected.");
    }
  } else if (key === "escape") {
    togglePause(state);
    announce(state.phase === "paused" ? "Paused." : "Resumed.");
  } else if (key === "r" && state.phase !== "title") {
    resetGame(state);
    accumulator = 0;
    pulseFrom = "root";
    pulseTo = "fork";
    announce("Garden reset.");
  } else if (key === "arrowleft" || key === "a") {
    if (selectSwitch(state, -1)) sound({ type: "move" });
  } else if (key === "arrowright" || key === "d") {
    if (selectSwitch(state, 1)) sound({ type: "move" });
  } else if (key === " ") {
    if (toggleSelectedSwitch(state)) {
      sound({ type: "switch" });
      const branch = SWITCHES[state.selectedSwitch];
      const destination = getNextNode(state, branch);
      announce(`${DISPLAY_NAMES[branch]} route changed to ${DISPLAY_NAMES[destination]}.`);
    }
  }
  updateAccessibleName();
}

window.addEventListener("keydown", handleKey);
canvas.addEventListener("pointerdown", () => canvas.focus());

function pathEdge(from, to) {
  const a = NODES[from];
  const b = NODES[to];
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  if ((from === "returnB" && to === "returnC") || (from === "returnC" && to === "fork")) {
    const bend = from === "returnB" ? 250 : 150;
    ctx.bezierCurveTo(a.x, a.y, bend, a.y, b.x, b.y);
  } else if (from === "returnA" && to === "returnB") {
    ctx.bezierCurveTo(a.x, 625, 850, 625, b.x, b.y);
  } else {
    ctx.bezierCurveTo((a.x + b.x) / 2, a.y, (a.x + b.x) / 2, b.y, b.x, b.y);
  }
}

function edgeActive(edge) {
  const node = NODES[edge.from];
  if (node.switchIndex === undefined) return true;
  return state.switches[node.switchIndex] === edge.index;
}

function drawBackground(time) {
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const gradient = ctx.createRadialGradient(640, 340, 20, 640, 340, 620);
  gradient.addColorStop(0, "#173226");
  gradient.addColorStop(0.65, "#0b1d17");
  gradient.addColorStop(1, "#06100e");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#83a58a12";
  for (let i = 0; i < 70; i += 1) {
    const x = (i * 191) % 1280;
    const y = (i * 113) % 720;
    const radius = 1 + ((i * 7) % 3);
    ctx.beginPath(); ctx.arc(x, y, radius + Math.sin(time / 1400 + i) * 0.35, 0, Math.PI * 2); ctx.fill();
  }
}

function drawEdges(time) {
  for (const edge of EDGES) {
    const active = edgeActive(edge);
    pathEdge(edge.from, edge.to);
    ctx.lineCap = "round";
    ctx.strokeStyle = active ? "#547863" : "#243f34";
    ctx.lineWidth = active ? 11 : 5;
    ctx.stroke();
    pathEdge(edge.from, edge.to);
    ctx.strokeStyle = active ? "#b7d99a55" : "#6f8c7822";
    ctx.lineWidth = active ? 2 : 1;
    ctx.setLineDash(active ? [2, 13] : []);
    ctx.lineDashOffset = -time / 45;
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

function flower(x, y, color, open, petals = 6) {
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = open ? color : COLORS.dim;
  ctx.strokeStyle = open ? "#f0ffe1" : "#6e8978";
  ctx.lineWidth = 2;
  const reach = open ? 24 : 12;
  for (let i = 0; i < petals; i += 1) {
    ctx.save(); ctx.rotate((Math.PI * 2 * i) / petals); ctx.beginPath(); ctx.ellipse(reach, 0, 14, 7, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.restore();
  }
  ctx.fillStyle = open ? "#fff4b0" : "#809385";
  ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawNode(id, time) {
  const node = NODES[id];
  if (node.bloom) {
    const palette = { moon: COLORS.moon, rain: COLORS.rain, bell: COLORS.bell };
    flower(node.x, node.y, palette[node.bloom], state.blooms[node.bloom], node.bloom === "bell" ? 5 : 6);
    return;
  }
  if (node.hazard) {
    ctx.save(); ctx.translate(node.x, node.y); ctx.rotate(Math.PI / 4);
    ctx.fillStyle = "#341e1c"; ctx.strokeStyle = COLORS.danger; ctx.lineWidth = 3; ctx.fillRect(-18, -18, 36, 36); ctx.strokeRect(-18, -18, 36, 36);
    ctx.restore();
    return;
  }
  if (node.receiver) {
    ctx.strokeStyle = Object.values(state.blooms).every(Boolean) ? COLORS.lime : COLORS.muted;
    ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(node.x, node.y, 34, Math.PI * 0.18, Math.PI * 1.82); ctx.stroke();
    ctx.beginPath(); ctx.arc(node.x, node.y, 18, 0, Math.PI * 2); ctx.stroke();
    return;
  }
  const switchIndex = node.switchIndex;
  const selected = switchIndex === state.selectedSwitch;
  ctx.fillStyle = id === "root" ? "#d3ebbc" : "#1c3b30";
  ctx.strokeStyle = selected ? COLORS.lime : "#789584";
  ctx.lineWidth = selected ? 5 : 2;
  ctx.beginPath();
  for (let i = 0; i < 6; i += 1) {
    const angle = Math.PI / 3 * i - Math.PI / 6;
    const radius = selected ? 24 + Math.sin(time / 250) * 2 : 18;
    const x = node.x + Math.cos(angle) * radius;
    const y = node.y + Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath(); ctx.fill(); ctx.stroke();
  if (selected) { ctx.strokeStyle = "#c8f39b55"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(node.x, node.y, 34, 0, Math.PI * 2); ctx.stroke(); }
}

function drawPulse(progress) {
  const from = NODES[pulseFrom] ?? NODES[state.node];
  const to = NODES[pulseTo] ?? from;
  const t = Math.max(0, Math.min(1, progress));
  const smooth = t * t * (3 - 2 * t);
  const x = from.x + (to.x - from.x) * smooth;
  const y = from.y + (to.y - from.y) * smooth;
  ctx.shadowColor = COLORS.lime; ctx.shadowBlur = 25;
  ctx.fillStyle = "#efffc9"; ctx.beginPath(); ctx.arc(x, y, 10, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0; ctx.strokeStyle = COLORS.lime; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 17 + Math.sin(progress * Math.PI) * 4, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = "#efffc955"; ctx.beginPath(); ctx.arc(to.x, to.y, 5 + Math.sin(progress * Math.PI * 4) * 2, 0, Math.PI * 2); ctx.fill();
}

function label(text, x, y, color = COLORS.muted, align = "center", size = 14) {
  ctx.font = `600 ${size}px ui-sans-serif, system-ui`;
  ctx.textAlign = align; ctx.fillStyle = color; ctx.fillText(text, x, y);
}

function drawHud() {
  label("SIGNAL GARDEN / ONE", 44, 48, COLORS.ink, "left", 15);
  label(`LIVES  ${"● ".repeat(state.lives)}${"○ ".repeat(3 - state.lives)}`, 1236, 48, COLORS.ink, "right", 14);
  const bloomCount = Object.values(state.blooms).filter(Boolean).length;
  label(`FLOWERS  ${bloomCount} / 3`, 1236, 74, bloomCount === 3 ? COLORS.lime : COLORS.muted, "right", 13);
  label("← → SELECT BRANCH     SPACE SWITCH     ESC PAUSE     R RESET", 640, 688, COLORS.muted, "center", 13);
  label("MOON", NODES.moon.x, NODES.moon.y - 42, state.blooms.moon ? COLORS.moon : COLORS.muted, "center", 12);
  label("RAIN", NODES.rain.x, NODES.rain.y + 52, state.blooms.rain ? COLORS.rain : COLORS.muted, "center", 12);
  label("BELL", NODES.bell.x, NODES.bell.y - 42, state.blooms.bell ? COLORS.bell : COLORS.muted, "center", 12);
  label("BLIGHT", NODES.blight.x, NODES.blight.y + 48, COLORS.danger, "center", 12);
  label("RECEIVER", NODES.receiver.x, NODES.receiver.y - 48, COLORS.muted, "center", 12);
  label("RETURN ROOT", 805, 648, COLORS.muted, "center", 11);
  const selectedId = SWITCHES[state.selectedSwitch];
  const destination = getNextNode(state, selectedId);
  label(`${DISPLAY_NAMES[selectedId]}  →  ${DISPLAY_NAMES[destination]}`, 44, 82, COLORS.lime, "left", 14);
  if (destination === "blight") label("THIS BRANCH WITHERS", 44, 106, COLORS.danger, "left", 12);
  if (destination === "receiver" && bloomCount < 3) label("RECEIVER NEEDS THREE FLOWERS", 44, 106, COLORS.danger, "left", 12);
}

function panel(title, subtitle, lines, footer) {
  ctx.fillStyle = "#06110de8"; ctx.fillRect(0, 0, 1280, 720);
  ctx.strokeStyle = "#52715e"; ctx.lineWidth = 2; ctx.strokeRect(256, 120, 768, 480);
  label(title, 640, 236, COLORS.ink, "center", 42);
  label(subtitle, 640, 280, COLORS.lime, "center", 15);
  lines.forEach((line, index) => label(line, 640, 350 + index * 34, index === lines.length - 1 ? COLORS.muted : COLORS.ink, "center", 16));
  label(footer, 640, 548, COLORS.lime, "center", 14);
}

function render(time) {
  drawBackground(time);
  if (state.phase === "title") {
    ctx.strokeStyle = "#547863"; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(180, 410); ctx.bezierCurveTo(400, 280, 770, 520, 1100, 310); ctx.stroke();
    flower(350, 342, COLORS.moon, true); flower(650, 416, COLORS.rain, true); flower(920, 390, COLORS.bell, true, 5);
    panel("SIGNAL GARDEN", "STAY AHEAD OF THE LIGHT", ["A seed flows one branch every beat.", "Select a branch with ← →, switch its destination with SPACE.", "Open all three flowers, then send the seed to the receiver."], "PRESS ENTER TO CULTIVATE");
  } else {
    drawEdges(time);
    for (const id of Object.keys(NODES)) drawNode(id, time);
    if (state.phase === "playing" || state.phase === "paused") drawPulse(accumulator / FLOW_MS);
    drawHud();
    if (state.phase === "paused") panel("GARDEN HELD", "TIME IS ROOTED", ["Inspect the reserved bright branches.", "Space changes the selected branch after resuming."], "PRESS ENTER OR ESC TO RESUME");
    if (state.phase === "won") panel("FULL CHORUS", "THREE FLOWERS / ONE SIGNAL", ["The seed reached the receiver with every color.", `Route completed in ${state.steps} beats.`], "PRESS ENTER TO GROW AGAIN");
    if (state.phase === "lost") panel("ROOTS QUIET", "THE SIGNAL SPENT ITS LAST LIFE", ["Blight and an unripe receiver both break the route.", "Switch branches before the seed arrives."], "PRESS ENTER OR R TO TRY AGAIN");
  }
  window.__SIGNAL_GARDEN__ = snapshot(state);
  requestAnimationFrame(loop);
}

function loop(time) {
  const delta = Math.min(100, time - lastTime);
  lastTime = time;
  if (state.phase === "playing") {
    accumulator += delta;
    if (accumulator >= FLOW_MS) {
      accumulator -= FLOW_MS;
      pulseFrom = state.node;
      pulseTo = getNextNode(state) ?? state.node;
      const result = advance(state);
      sound(result);
      if (result.type === "bloom") announce(`${result.bloom} flower opened.`);
      if (result.type === "strike") announce(`Route failed: ${result.reason}. ${state.lives} lives remain.`);
      if (result.type === "won") announce("All three flowers open. Signal received. You won.");
      if (state.node === "root") { pulseFrom = "root"; pulseTo = "fork"; accumulator = 0; }
      else { pulseFrom = state.node; pulseTo = getNextNode(state) ?? state.node; }
      updateAccessibleName();
    }
  }
  render(time);
}

canvas.focus();
updateAccessibleName();
requestAnimationFrame((time) => { lastTime = time; render(time); });
