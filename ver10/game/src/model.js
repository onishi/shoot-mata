export const SWITCHES = ["fork", "graft", "crown"];
export const FLOW_MS = 800;

export const GARDENS = [
  { id: "one", name: "FIRST LIGHT", delayedSwitch: null, delayBeats: 0 },
  { id: "two", name: "SLEEPING CROWN", delayedSwitch: 2, delayBeats: 2 },
  { id: "three", name: "TURNING ROOT", delayedSwitch: 2, delayBeats: 2 },
];

const FIRST_LIGHT_NODES = {
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

const TURNING_ROOT_NODES = {
  root: { x: 86, y: 360, next: ["bud"] },
  bud: { x: 230, y: 360, next: ["crown"] },
  crown: { x: 390, y: 360, next: ["receiver", "returnA"], switchIndex: 2 },
  receiver: { x: 570, y: 175, receiver: true },
  returnA: { x: 565, y: 535, next: ["fork"] },
  fork: { x: 735, y: 535, next: ["moon", "rain"], switchIndex: 0 },
  moon: { x: 865, y: 395, next: ["graft"], bloom: "moon" },
  rain: { x: 865, y: 625, next: ["graft"], bloom: "rain" },
  graft: { x: 1010, y: 520, next: ["bell", "blight"], switchIndex: 1 },
  bell: { x: 1120, y: 335, next: ["crown"], bloom: "bell" },
  blight: { x: 1120, y: 625, hazard: true },
};

export function getGardenNodes(garden) {
  return garden === 2 ? TURNING_ROOT_NODES : FIRST_LIGHT_NODES;
}

function gardenState(garden, phase = "playing") {
  return {
    phase,
    garden,
    node: "root",
    previousNode: "root",
    switches: [0, 1, 0],
    pendingSwitches: [null, null, null],
    blooms: { moon: false, rain: false, bell: false },
    lives: 3,
    steps: 0,
    selectedSwitch: 0,
    lastEvent: "",
  };
}

export function createGame(garden = 0) {
  const safeGarden = Number.isInteger(garden) && garden >= 0 && garden < GARDENS.length ? garden : 0;
  return gardenState(safeGarden, "title");
}

export function startGame(state) {
  if (state.phase === "title") {
    Object.assign(state, gardenState(state.garden));
    return true;
  }
  if (state.phase === "won") {
    Object.assign(state, gardenState(0));
    return true;
  }
  if (state.phase === "gardenWon") {
    Object.assign(state, gardenState(state.garden + 1));
    return true;
  }
  if (state.phase === "lost") {
    Object.assign(state, gardenState(state.garden));
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
  Object.assign(state, gardenState(state.garden));
}

export function selectSwitch(state, delta) {
  if (state.phase !== "playing" && state.phase !== "paused") return false;
  state.selectedSwitch = (state.selectedSwitch + delta + SWITCHES.length) % SWITCHES.length;
  return true;
}

export function toggleSelectedSwitch(state) {
  if (state.phase !== "playing") return false;
  const index = state.selectedSwitch;
  const garden = GARDENS[state.garden];
  if (garden.delayedSwitch === index) {
    const requested = state.pendingSwitches[index]?.value ?? state.switches[index];
    const value = requested === 0 ? 1 : 0;
    state.pendingSwitches[index] = value === state.switches[index]
      ? null
      : { value, remaining: garden.delayBeats };
    state.lastEvent = state.pendingSwitches[index]
      ? `pending:${SWITCHES[index]}:${value}:${garden.delayBeats}`
      : `pending:${SWITCHES[index]}:cancelled`;
  } else {
    state.switches[index] = state.switches[index] === 0 ? 1 : 0;
    state.lastEvent = `switch:${SWITCHES[index]}:${state.switches[index]}`;
  }
  return true;
}

export function getNextNode(state, nodeId = state.node) {
  const node = getGardenNodes(state.garden)[nodeId];
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
  state.pendingSwitches = [null, null, null];
}

function advancePendingSwitches(state) {
  const committed = [];
  state.pendingSwitches.forEach((pending, index) => {
    if (!pending) return;
    pending.remaining -= 1;
    if (pending.remaining <= 0) {
      state.switches[index] = pending.value;
      state.pendingSwitches[index] = null;
      committed.push(index);
    }
  });
  return committed;
}

export function advance(state) {
  if (state.phase !== "playing") return { type: "idle" };
  const from = state.node;
  const destination = getNextNode(state, from);
  if (!destination) return { type: "idle" };
  state.previousNode = from;
  state.node = destination;
  state.steps += 1;
  const committed = advancePendingSwitches(state);

  const node = getGardenNodes(state.garden)[destination];
  if (node.bloom && !state.blooms[node.bloom]) {
    state.blooms[node.bloom] = true;
    state.lastEvent = `bloom:${node.bloom}`;
    return { type: "bloom", bloom: node.bloom, from, to: destination, committed };
  }
  if (node.hazard) {
    strike(state, "blight");
    return { type: "strike", reason: "blight", from, to: destination };
  }
  if (node.receiver) {
    if (allBloomed(state)) {
      const finalGarden = state.garden === GARDENS.length - 1;
      state.phase = finalGarden ? "won" : "gardenWon";
      state.lastEvent = finalGarden ? "won" : "gardenWon";
      return { type: finalGarden ? "won" : "gardenWon", from, to: destination, committed };
    }
    strike(state, "unripe");
    return { type: "strike", reason: "unripe", from, to: destination };
  }
  state.lastEvent = `move:${destination}`;
  return { type: "move", from, to: destination, committed };
}

export function snapshot(state) {
  return {
    phase: state.phase,
    garden: state.garden,
    node: state.node,
    switches: [...state.switches],
    pendingSwitches: state.pendingSwitches.map((pending) => pending ? { ...pending } : null),
    blooms: { ...state.blooms },
    lives: state.lives,
    steps: state.steps,
    selectedSwitch: state.selectedSwitch,
    next: getNextNode(state),
  };
}
