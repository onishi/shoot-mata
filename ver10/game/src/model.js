export const SWITCHES = ["fork", "graft", "crown"];
export const FLOW_MS = 800;

export const NODES = {
  root: { x: 92, y: 360, next: ["fork"] },
  fork: { x: 250, y: 360, next: ["moon", "rain"], switchIndex: 0 },
  moon: { x: 405, y: 185, next: ["graft"], bloom: "moon" },
  rain: { x: 405, y: 535, next: ["graft"], bloom: "rain" },
  graft: { x: 570, y: 360, next: ["bell", "blight"], switchIndex: 1 },
  bell: { x: 735, y: 185, next: ["crown"], bloom: "bell" },
  blight: { x: 735, y: 535, hazard: true },
  crown: { x: 895, y: 360, next: ["receiver", "returnA"], switchIndex: 2 },
  receiver: { x: 1090, y: 205, receiver: true },
  returnA: { x: 1055, y: 545, next: ["returnB"] },
  returnB: { x: 555, y: 625, next: ["returnC"] },
  returnC: { x: 150, y: 565, next: ["fork"] },
};

export function createGame() {
  return {
    phase: "title",
    node: "root",
    previousNode: "root",
    switches: [0, 1, 0],
    blooms: { moon: false, rain: false, bell: false },
    lives: 3,
    steps: 0,
    selectedSwitch: 0,
    lastEvent: "",
  };
}

export function startGame(state) {
  if (state.phase === "title" || state.phase === "won" || state.phase === "lost") {
    Object.assign(state, createGame(), { phase: "playing" });
    return true;
  }
  if (state.phase === "paused") {
    state.phase = "playing";
    return true;
  }
  return false;
}

export function togglePause(state) {
  if (state.phase === "playing") state.phase = "paused";
  else if (state.phase === "paused") state.phase = "playing";
}

export function resetGame(state) {
  Object.assign(state, createGame(), { phase: "playing" });
}

export function selectSwitch(state, delta) {
  if (state.phase !== "playing" && state.phase !== "paused") return false;
  state.selectedSwitch = (state.selectedSwitch + delta + SWITCHES.length) % SWITCHES.length;
  return true;
}

export function toggleSelectedSwitch(state) {
  if (state.phase !== "playing") return false;
  const index = state.selectedSwitch;
  state.switches[index] = state.switches[index] === 0 ? 1 : 0;
  state.lastEvent = `switch:${SWITCHES[index]}:${state.switches[index]}`;
  return true;
}

export function getNextNode(state, nodeId = state.node) {
  const node = NODES[nodeId];
  if (!node?.next) return null;
  if (node.switchIndex !== undefined) return node.next[state.switches[node.switchIndex]];
  return node.next[0];
}

function allBloomed(state) {
  return Object.values(state.blooms).every(Boolean);
}

function strike(state, reason) {
  state.lives -= 1;
  state.lastEvent = `strike:${reason}`;
  if (state.lives <= 0) {
    state.phase = "lost";
    return;
  }
  state.node = "root";
  state.previousNode = "root";
  state.blooms = { moon: false, rain: false, bell: false };
  state.switches = [0, 1, 0];
}

export function advance(state) {
  if (state.phase !== "playing") return { type: "idle" };
  const from = state.node;
  const destination = getNextNode(state, from);
  if (!destination) return { type: "idle" };
  state.previousNode = from;
  state.node = destination;
  state.steps += 1;

  const node = NODES[destination];
  if (node.bloom && !state.blooms[node.bloom]) {
    state.blooms[node.bloom] = true;
    state.lastEvent = `bloom:${node.bloom}`;
    return { type: "bloom", bloom: node.bloom, from, to: destination };
  }
  if (node.hazard) {
    strike(state, "blight");
    return { type: "strike", reason: "blight", from, to: destination };
  }
  if (node.receiver) {
    if (allBloomed(state)) {
      state.phase = "won";
      state.lastEvent = "won";
      return { type: "won", from, to: destination };
    }
    strike(state, "unripe");
    return { type: "strike", reason: "unripe", from, to: destination };
  }
  state.lastEvent = `move:${destination}`;
  return { type: "move", from, to: destination };
}

export function snapshot(state) {
  return {
    phase: state.phase,
    node: state.node,
    switches: [...state.switches],
    blooms: { ...state.blooms },
    lives: state.lives,
    steps: state.steps,
    selectedSwitch: state.selectedSwitch,
    next: getNextNode(state),
  };
}
