import "./style.css";
import {
  GARDENS,
  SWITCHES,
  advance,
  createGame,
  getGardenNodes,
  getNextNode,
  resetGame,
  selectSwitch,
  setHeldSwitch,
  snapshot,
  startGame,
  togglePause,
  toggleSelectedSwitch,
} from "./model.js";
import { loadSettings, nextVolume, saveSettings } from "./preferences.js";
import { loadProgress, saveProgress, unlockGarden } from "./progress.js";

const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
const live = document.querySelector("#live");
const volumeButton = document.querySelector("#volume");
const motionButton = document.querySelector("#motion");
let settings = loadSettings(localStorage);
let progress = loadProgress(localStorage);
let state = createGame(progress.latestGarden);
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
  quicken: "QUICKEN",
  calm: "CALM",
};

function nodes() {
  return getGardenNodes(state.garden);
}

function syncedSwitches() {
  return GARDENS[state.garden].syncedSwitches;
}

function heldSwitch() {
  return GARDENS[state.garden].heldSwitch;
}

function edges() {
  return Object.entries(nodes()).flatMap(([id, node]) => (node.next ?? []).map((to, index) => ({ from: id, to, index })));
}

function ensureAudio() {
  if (!audioContext) audioContext = new AudioContext();
  if (audioContext.state === "suspended") audioContext.resume();
}

function tone(frequency, duration = 0.08, type = "sine", gain = 0.035, delay = 0) {
  if (!audioContext || settings.volume === 0) return;
  const start = audioContext.currentTime + delay;
  const osc = audioContext.createOscillator();
  const amp = audioContext.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, start);
  amp.gain.setValueAtTime(gain * settings.volume, start);
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
  } else if (event.type === "won" || event.type === "gardenWon") {
    tone(392, 0.35); tone(494, 0.35, "sine", 0.03, 0.1); tone(659, 0.5, "sine", 0.03, 0.2);
  } else if (event.type === "move") {
    tone(185, 0.045, "triangle", 0.018);
  } else if (event.type === "tempo") {
    const notes = event.tempo === "quick" ? [294, 440] : [330, 220];
    tone(notes[0], 0.14, "triangle", 0.03); tone(notes[1], 0.2, "sine", 0.03, 0.08);
  }
}

function announce(message) {
  live.textContent = "";
  requestAnimationFrame(() => { live.textContent = message; });
}

function updateSettingsControls() {
  volumeButton.textContent = `SOUND ${Math.round(settings.volume * 100)}%`;
  volumeButton.setAttribute("aria-label", `Sound volume ${Math.round(settings.volume * 100)} percent. Press to change.`);
  motionButton.textContent = settings.reducedMotion ? "MOTION REDUCED" : "MOTION FULL";
  motionButton.setAttribute("aria-pressed", String(settings.reducedMotion));
  motionButton.setAttribute("aria-label", `${settings.reducedMotion ? "Reduced" : "Full"} motion. Press to toggle.`);
}

function changeVolume() {
  settings = saveSettings(localStorage, { ...settings, volume: nextVolume(settings.volume) });
  updateSettingsControls();
  announce(`Sound volume ${Math.round(settings.volume * 100)} percent.`);
}

function changeMotion() {
  settings = saveSettings(localStorage, { ...settings, reducedMotion: !settings.reducedMotion });
  updateSettingsControls();
  announce(settings.reducedMotion ? "Reduced motion on." : "Reduced motion off.");
}

function updateAccessibleName() {
  if (state.phase === "title") {
    canvas.setAttribute("aria-label", `SIGNAL GARDEN title. Garden ${state.garden + 1} ready. Press Enter to begin.`);
    return;
  }
  const flowers = Object.values(state.blooms).filter(Boolean).length;
  const selected = SWITCHES[state.selectedSwitch];
  const pending = state.pendingSwitches[state.selectedSwitch];
  const wait = pending ? ` Route change in ${pending.remaining} beats.` : "";
  const link = syncedSwitches().includes(state.selectedSwitch) ? " Fork and graft are linked." : "";
  const tempo = state.garden === 4 ? ` ${state.flowMs === GARDENS[4].initialFlowMs ? "Slow" : "Quick"} current.` : "";
  const held = heldSwitch() === state.selectedSwitch ? ` Hold switch ${state.heldActive ? "pressed" : "released"}.` : "";
  canvas.setAttribute("aria-label", `Garden ${state.garden + 1}. ${state.phase}. Seed at ${state.node}. ${flowers} of 3 flowers open. ${state.lives} lives.${tempo} ${selected} switch selected.${link}${held}${wait}`);
}

function handleKey(event) {
  if (event.target instanceof HTMLButtonElement) return;
  const key = event.key.toLowerCase();
  if (["arrowleft", "arrowright", " ", "enter", "escape", "a", "d", "r", "m", "v"].includes(key)) event.preventDefault();
  if (key === "m") {
    changeVolume();
  } else if (key === "v") {
    changeMotion();
  } else if (key === "enter") {
    ensureAudio();
    if (startGame(state)) {
      accumulator = 0;
      pulseFrom = "root";
      pulseTo = getNextNode(state, "root") ?? "root";
      announce("Garden started. Fork switch selected.");
    }
  } else if (key === "escape") {
    togglePause(state);
    announce(state.phase === "paused" ? "Paused." : "Resumed.");
  } else if (key === "r" && state.phase !== "title") {
    resetGame(state);
    accumulator = 0;
    pulseFrom = "root";
    pulseTo = getNextNode(state, "root") ?? "root";
    announce("Garden reset.");
  } else if (key === "arrowleft" || key === "a") {
    if (selectSwitch(state, -1)) sound({ type: "move" });
  } else if (key === "arrowright" || key === "d") {
    if (selectSwitch(state, 1)) sound({ type: "move" });
  } else if (key === " ") {
    const changed = heldSwitch() === state.selectedSwitch
      ? !event.repeat && setHeldSwitch(state, true)
      : toggleSelectedSwitch(state);
    if (changed) {
      sound({ type: "switch" });
      const branch = SWITCHES[state.selectedSwitch];
      const pending = state.pendingSwitches[state.selectedSwitch];
      if (heldSwitch() === state.selectedSwitch) {
        announce(`${DISPLAY_NAMES[branch]} held toward ${DISPLAY_NAMES[getNextNode(state, branch)]}. Keep holding Space.`);
      } else if (syncedSwitches().includes(state.selectedSwitch)) {
        const routes = syncedSwitches().map((index) => {
          const id = SWITCHES[index];
          return `${DISPLAY_NAMES[id]} to ${DISPLAY_NAMES[getNextNode(state, id)]}`;
        });
        announce(`Linked routes changed. ${routes.join(". ")}.`);
      } else if (pending) {
        const destination = nodes()[branch].next[pending.value];
        announce(`${DISPLAY_NAMES[branch]} will change to ${DISPLAY_NAMES[destination]} in ${pending.remaining} beats.`);
      } else {
        const destination = getNextNode(state, branch);
        announce(`${DISPLAY_NAMES[branch]} route changed to ${DISPLAY_NAMES[destination]}.`);
      }
    }
  }
  updateAccessibleName();
}

window.addEventListener("keydown", handleKey);
window.addEventListener("keyup", (event) => {
  if (event.key !== " ") return;
  if (setHeldSwitch(state, false)) {
    sound({ type: "switch" });
    announce(`CROWN released toward ${DISPLAY_NAMES[getNextNode(state, "crown")]}.`);
    updateAccessibleName();
  }
});
canvas.addEventListener("pointerdown", () => canvas.focus());
volumeButton.addEventListener("click", changeVolume);
motionButton.addEventListener("click", changeMotion);

function pathEdge(from, to) {
  const a = nodes()[from];
  const b = nodes()[to];
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  if ((from === "returnB" && to === "returnC") || (from === "returnC" && to === "fork")) {
    const bend = from === "returnB" ? 250 : 150;
    ctx.bezierCurveTo(a.x, a.y, bend, a.y, b.x, b.y);
  } else if (from === "returnA" && to === "returnB") {
    ctx.bezierCurveTo(a.x, 625, 850, 625, b.x, b.y);
  } else if (state.garden === 2 && from === "bell" && to === "crown") {
    ctx.bezierCurveTo(980, 125, 560, 125, b.x, b.y);
  } else {
    ctx.bezierCurveTo((a.x + b.x) / 2, a.y, (a.x + b.x) / 2, b.y, b.x, b.y);
  }
}

function edgeActive(edge) {
  const node = nodes()[edge.from];
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
  for (const edge of edges()) {
    const active = edgeActive(edge);
    const switchIndex = nodes()[edge.from].switchIndex;
    const pending = switchIndex === undefined ? null : state.pendingSwitches[switchIndex];
    const pendingTarget = pending?.value === edge.index;
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
    if (pendingTarget && !active) {
      pathEdge(edge.from, edge.to);
      ctx.strokeStyle = "#d9b7ff";
      ctx.lineWidth = 4;
      ctx.setLineDash([7, 12]);
      ctx.lineDashOffset = time / 55;
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
  if (syncedSwitches().length > 0) {
    const [first, second] = syncedSwitches().map((index) => nodes()[SWITCHES[index]]);
    ctx.beginPath();
    ctx.moveTo(first.x, first.y - 30);
    ctx.bezierCurveTo(first.x + 70, first.y - 115, second.x - 70, second.y - 115, second.x, second.y - 30);
    ctx.strokeStyle = "#69d7d088";
    ctx.lineWidth = 3;
    ctx.setLineDash([6, 9]);
    ctx.stroke();
    ctx.setLineDash([]);
    label("LINKED", (first.x + second.x) / 2, Math.min(first.y, second.y) - 92, COLORS.rain, "center", 11);
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
  const node = nodes()[id];
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
  if (node.tempo) {
    const quick = node.tempo === "quick";
    ctx.strokeStyle = quick ? COLORS.bell : COLORS.rain;
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(node.x, node.y, 24, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(node.x, node.y, quick ? 14 : 32, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = quick ? COLORS.bell : COLORS.rain;
    ctx.beginPath(); ctx.arc(node.x, node.y, 6, 0, Math.PI * 2); ctx.fill();
    return;
  }
  const switchIndex = node.switchIndex;
  const selectedGroup = syncedSwitches().includes(state.selectedSwitch) ? syncedSwitches() : [state.selectedSwitch];
  const selected = selectedGroup.includes(switchIndex);
  const linked = syncedSwitches().includes(switchIndex);
  const sleeping = GARDENS[state.garden].delayedSwitch === switchIndex;
  const held = heldSwitch() === switchIndex;
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
  if (linked) {
    ctx.strokeStyle = COLORS.rain;
    ctx.lineWidth = 2;
    ctx.setLineDash([3, 5]);
    ctx.beginPath(); ctx.arc(node.x, node.y, 29, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
  }
  if (sleeping) {
    ctx.strokeStyle = state.pendingSwitches[switchIndex] ? "#d9b7ff" : "#9c78bd";
    ctx.lineWidth = 3;
    ctx.setLineDash([5, 7]);
    ctx.beginPath(); ctx.arc(node.x, node.y, 29, -Math.PI / 2, Math.PI * 1.5); ctx.stroke();
    ctx.setLineDash([]);
  }
  if (held) {
    ctx.strokeStyle = state.heldActive ? COLORS.lime : COLORS.bell;
    ctx.lineWidth = state.heldActive ? 5 : 3;
    ctx.setLineDash(state.heldActive ? [] : [4, 6]);
    ctx.beginPath(); ctx.arc(node.x, node.y, 31, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
  }
}

function drawPulse(progress) {
  const from = nodes()[pulseFrom] ?? nodes()[state.node];
  const to = nodes()[pulseTo] ?? from;
  const pulseProgress = settings.reducedMotion ? 0 : progress;
  const t = Math.max(0, Math.min(1, pulseProgress));
  const smooth = t * t * (3 - 2 * t);
  const x = from.x + (to.x - from.x) * smooth;
  const y = from.y + (to.y - from.y) * smooth;
  ctx.shadowColor = COLORS.lime; ctx.shadowBlur = 25;
  ctx.fillStyle = "#efffc9"; ctx.beginPath(); ctx.arc(x, y, 10, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0; ctx.strokeStyle = COLORS.lime; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 17 + Math.sin(pulseProgress * Math.PI) * 4, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = "#efffc955"; ctx.beginPath(); ctx.arc(to.x, to.y, 5 + Math.sin(pulseProgress * Math.PI * 4) * 2, 0, Math.PI * 2); ctx.fill();
}

function label(text, x, y, color = COLORS.muted, align = "center", size = 14) {
  ctx.font = `600 ${size}px ui-sans-serif, system-ui`;
  ctx.textAlign = align; ctx.fillStyle = color; ctx.fillText(text, x, y);
}

function drawHud() {
  label(`SIGNAL GARDEN / ${["ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX"][state.garden]}`, 44, 48, COLORS.ink, "left", 15);
  label(`LIVES  ${"● ".repeat(state.lives)}${"○ ".repeat(3 - state.lives)}`, 1236, 48, COLORS.ink, "right", 14);
  const bloomCount = Object.values(state.blooms).filter(Boolean).length;
  label(`FLOWERS  ${bloomCount} / 3`, 1236, 74, bloomCount === 3 ? COLORS.lime : COLORS.muted, "right", 13);
  label(state.garden === 5 ? "← → SELECT BRANCH     HOLD SPACE TO BEND CROWN     ESC PAUSE     R RESET" : "← → SELECT BRANCH     SPACE SWITCH     ESC PAUSE     R RESET", 640, 688, COLORS.muted, "center", 13);
  label("MOON", nodes().moon.x, nodes().moon.y - 42, state.blooms.moon ? COLORS.moon : COLORS.muted, "center", 12);
  label("RAIN", nodes().rain.x, nodes().rain.y + 40, state.blooms.rain ? COLORS.rain : COLORS.muted, "center", 12);
  label("BELL", nodes().bell.x, nodes().bell.y - 42, state.blooms.bell ? COLORS.bell : COLORS.muted, "center", 12);
  label("BLIGHT", nodes().blight.x, nodes().blight.y + 40, COLORS.danger, "center", 12);
  label("RECEIVER", nodes().receiver.x, nodes().receiver.y - 48, COLORS.muted, "center", 12);
  label("RETURN ROOT", nodes().returnA.x, Math.min(670, nodes().returnA.y + 48), COLORS.muted, "center", 11);
  if (state.garden === 4) {
    label("QUICKEN", nodes().quicken.x, nodes().quicken.y - 42, COLORS.bell, "center", 11);
    label("CALM", nodes().calm.x, nodes().calm.y + 42, COLORS.rain, "center", 11);
    label(`${state.flowMs === GARDENS[4].initialFlowMs ? "SLOW CURRENT" : "QUICK CURRENT"}  ${state.flowMs}ms / BEAT`, 1236, 100, state.flowMs === GARDENS[4].initialFlowMs ? COLORS.rain : COLORS.bell, "right", 12);
  }
  const selectedId = SWITCHES[state.selectedSwitch];
  const destination = getNextNode(state, selectedId);
  const pending = state.pendingSwitches[state.selectedSwitch];
  const shownDestination = pending ? nodes()[selectedId].next[pending.value] : destination;
  if (heldSwitch() === state.selectedSwitch) {
    label(`${DISPLAY_NAMES[selectedId]}  ${state.heldActive ? "HELD" : "RELEASED"}  →  ${DISPLAY_NAMES[destination]}`, 44, 82, state.heldActive ? COLORS.lime : COLORS.bell, "left", 14);
  } else if (syncedSwitches().includes(state.selectedSwitch)) {
    const linkedRoutes = syncedSwitches().map((index) => {
      const id = SWITCHES[index];
      return `${DISPLAY_NAMES[id]} → ${DISPLAY_NAMES[getNextNode(state, id)]}`;
    });
    label(linkedRoutes.join("    +    "), 44, 82, COLORS.rain, "left", 14);
  } else if (pending) {
    label(`${DISPLAY_NAMES[selectedId]}  ⇢  ${DISPLAY_NAMES[shownDestination]}  /  ${pending.remaining} BEATS`, 44, 82, "#d9b7ff", "left", 14);
  } else {
    label(`${DISPLAY_NAMES[selectedId]}  →  ${DISPLAY_NAMES[destination]}`, 44, 82, COLORS.lime, "left", 14);
  }
  const linkedBlight = syncedSwitches().includes(state.selectedSwitch)
    && syncedSwitches().some((index) => getNextNode(state, SWITCHES[index]) === "blight");
  if (linkedBlight) label("LINKED GRAFT NOW WITHERS", 44, 106, COLORS.danger, "left", 12);
  else if (shownDestination === "blight") label("THIS BRANCH WITHERS", 44, 106, COLORS.danger, "left", 12);
  if (shownDestination === "receiver" && bloomCount < 3) label("RECEIVER NEEDS THREE FLOWERS", 44, 106, COLORS.danger, "left", 12);
  if ((state.garden === 1 || state.garden === 2) && state.selectedSwitch === 2 && !pending) label("SLEEPING CROWN CHANGES TWO BEATS LATER", 44, 106, "#caa8e8", "left", 12);
  if (syncedSwitches().includes(state.selectedSwitch) && !linkedBlight) label("FORK AND GRAFT TURN TOGETHER", 44, 106, COLORS.rain, "left", 12);
  if (state.garden === 4 && state.flowMs === GARDENS[4].initialFlowMs) label("SET THE ROUTE BEFORE QUICKEN", 44, 106, COLORS.rain, "left", 12);
  if (heldSwitch() === state.selectedSwitch) label(state.heldActive ? "KEEP HOLDING UNTIL THE SEED PASSES CROWN" : "HOLD SPACE TO BEND CROWN TOWARD RETURN ROOT", 44, 106, state.heldActive ? COLORS.lime : COLORS.bell, "left", 12);
}

function panel(title, subtitle, lines, footer) {
  ctx.fillStyle = "#06110de8"; ctx.fillRect(0, 0, 1280, 720);
  ctx.strokeStyle = "#52715e"; ctx.lineWidth = 2; ctx.strokeRect(256, 120, 768, 480);
  label(title, 640, 236, COLORS.ink, "center", 42);
  label(subtitle, 640, 280, COLORS.lime, "center", 15);
  lines.forEach((line, index) => label(line, 640, 350 + index * 34, index === lines.length - 1 ? COLORS.muted : COLORS.ink, "center", 16));
  label(footer, 640, 548, COLORS.lime, "center", 14);
}

function finale(time) {
  ctx.fillStyle = "#06110df2"; ctx.fillRect(0, 0, 1280, 720);
  const colors = [COLORS.moon, COLORS.rain, COLORS.bell];
  const points = [[390, 390], [640, 300], [890, 390]];
  ctx.lineWidth = 8;
  ctx.lineCap = "round";
  points.forEach(([x, y], index) => {
    ctx.beginPath(); ctx.moveTo(640, 570); ctx.bezierCurveTo(640, 480, x, 500, x, y); ctx.strokeStyle = `${colors[index]}88`; ctx.stroke();
    flower(x, y, colors[index], true, index === 2 ? 5 : 6);
  });
  const glow = 13 + Math.sin(time / 280) * 3;
  ctx.shadowColor = COLORS.lime; ctx.shadowBlur = 30; ctx.fillStyle = "#efffc9"; ctx.beginPath(); ctx.arc(640, 570, glow, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
  label("THE GARDEN ANSWERS", 640, 155, COLORS.ink, "center", 42);
  label("SIX CURRENTS / ONE LIVING SIGNAL", 640, 202, COLORS.lime, "center", 15);
  label("You stayed ahead of every branch, beat, and turning root.", 640, 650, COLORS.ink, "center", 16);
  label("PRESS ENTER TO GROW AGAIN", 640, 686, COLORS.lime, "center", 14);
}

function render(time) {
  const visualTime = settings.reducedMotion ? 0 : time;
  drawBackground(visualTime);
  if (state.phase === "title") {
    ctx.strokeStyle = "#547863"; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(180, 410); ctx.bezierCurveTo(400, 280, 770, 520, 1100, 310); ctx.stroke();
    flower(350, 342, COLORS.moon, true); flower(650, 416, COLORS.rain, true); flower(920, 390, COLORS.bell, true, 5);
    const resume = state.garden > 0 ? `Latest garden: ${GARDENS[state.garden].name}.` : "Open all three flowers, then send the seed to the receiver.";
    panel("SIGNAL GARDEN", "STAY AHEAD OF THE LIGHT", ["A seed flows one branch every beat.", "Select a branch with ← →, switch its destination with SPACE.", resume], state.garden > 0 ? `PRESS ENTER TO RESUME GARDEN ${state.garden + 1}` : "PRESS ENTER TO CULTIVATE");
  } else {
    drawEdges(visualTime);
    for (const id of Object.keys(nodes())) drawNode(id, visualTime);
    if (state.phase === "playing" || state.phase === "paused") drawPulse(accumulator / state.flowMs);
    drawHud();
    if (state.phase === "paused") panel("GARDEN HELD", "TIME IS ROOTED", ["Inspect the reserved bright branches.", "Space changes the selected branch after resuming."], "PRESS ENTER OR ESC TO RESUME");
    if (state.phase === "gardenWon" && state.garden === 0) panel("FIRST LIGHT ROOTED", "A DEEPER GARDEN STIRS", ["The next crown sleeps before it turns.", "Its dotted route becomes active two beats after SPACE."], "PRESS ENTER FOR GARDEN TWO");
    if (state.phase === "gardenWon" && state.garden === 1) panel("SLEEPING CROWN ROOTED", "THE CURRENT TURNS AROUND", ["The receiver now waits before the flower circuit.", "Reserve the sleeping crown before the signal arrives."], "PRESS ENTER FOR GARDEN THREE");
    if (state.phase === "gardenWon" && state.garden === 2) panel("TURNING ROOT COMPLETE", "TWO BRANCHES SHARE ONE PULSE", ["Fork and graft now turn together.", "Pass the fork, then restore the graft before the seed arrives."], "PRESS ENTER FOR GARDEN FOUR");
    if (state.phase === "gardenWon" && state.garden === 3) panel("TWIN CURRENT ROOTED", "THE VINE QUICKENS AHEAD", ["The gold gate shortens every following beat.", "Set distant branches while the current is still calm."], "PRESS ENTER FOR GARDEN FIVE");
    if (state.phase === "gardenWon" && state.garden === 4) panel("QUICKENING VINE ROOTED", "THE LAST CROWN NEEDS A STEADY HAND", ["Hold SPACE to bend the crown toward the return root.", "Release only after the seed has passed it."], "PRESS ENTER FOR GARDEN SIX");
    if (state.phase === "won") finale(visualTime);
    if (state.phase === "lost") panel("ROOTS QUIET", "THE SIGNAL SPENT ITS LAST LIFE", ["Blight and an unripe receiver both break the route.", "Switch branches before the seed arrives."], "PRESS ENTER OR R TO TRY AGAIN");
  }
  window.__SIGNAL_GARDEN__ = { ...snapshot(state), settings: { ...settings }, progress: { ...progress } };
  requestAnimationFrame(loop);
}

function loop(time) {
  const delta = Math.min(100, time - lastTime);
  lastTime = time;
  if (state.phase === "playing") {
    accumulator += delta;
    if (accumulator >= state.flowMs) {
      accumulator -= state.flowMs;
      pulseFrom = state.node;
      pulseTo = getNextNode(state) ?? state.node;
      const result = advance(state);
      sound(result);
      if (result.type === "bloom") announce(`${result.bloom} flower opened.`);
      if (result.type === "tempo") announce(result.tempo === "quick" ? "Current quickened. Beats are shorter." : "Current calmed. Beats are longer.");
      if (result.type === "strike") announce(`Route failed: ${result.reason}. ${state.lives} lives remain.`);
      if (result.type === "gardenWon") {
        progress = saveProgress(localStorage, unlockGarden(progress, state.garden + 1));
        announce(`Garden ${state.garden + 1} complete. Garden ${state.garden + 2} unlocked.`);
      }
      if (result.type === "won") announce("All three flowers open. Signal received. You won.");
      if (state.node === "root") { pulseFrom = "root"; pulseTo = getNextNode(state, "root") ?? "root"; accumulator = 0; }
      else { pulseFrom = state.node; pulseTo = getNextNode(state) ?? state.node; }
      updateAccessibleName();
    }
  }
  render(time);
}

canvas.focus();
updateSettingsControls();
updateAccessibleName();
requestAnimationFrame((time) => { lastTime = time; render(time); });
