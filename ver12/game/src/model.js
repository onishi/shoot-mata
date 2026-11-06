export const WIDTH = 9;
export const HEIGHT = 7;

export const LEVEL = Object.freeze({
  player: Object.freeze({ x: 4, y: 3 }),
  shards: Object.freeze([
    Object.freeze({ id: "cobalt", x: 2, y: 2 }),
    Object.freeze({ id: "ember", x: 6, y: 2 }),
    Object.freeze({ id: "pearl", x: 4, y: 5 })
  ]),
  sockets: Object.freeze([
    Object.freeze({ x: 1, y: 2 }),
    Object.freeze({ x: 7, y: 2 }),
    Object.freeze({ x: 3, y: 5 })
  ]),
  walls: Object.freeze([
    Object.freeze({ x: 3, y: 1 }), Object.freeze({ x: 5, y: 1 }),
    Object.freeze({ x: 3, y: 4 }), Object.freeze({ x: 6, y: 4 }),
    Object.freeze({ x: 5, y: 5 })
  ])
});

const key = ({ x, y }) => `${x},${y}`;
const same = (a, b) => a.x === b.x && a.y === b.y;

export function createGame() {
  return {
    phase: "title",
    polarity: "pull",
    player: { ...LEVEL.player },
    shards: LEVEL.shards.map((shard) => ({ ...shard, docked: false })),
    moves: 0,
    pulses: 0,
    lastEvent: "",
    pulseFrom: null
  };
}

export function startGame(state) {
  if (state.phase !== "title" && state.phase !== "won") return state;
  const next = createGame();
  next.phase = "playing";
  return next;
}

export function resetGame() {
  const state = createGame();
  state.phase = "playing";
  state.lastEvent = "The chamber rewinds.";
  return state;
}

export function togglePause(state) {
  if (state.phase === "playing") return { ...state, phase: "paused" };
  if (state.phase === "paused") return { ...state, phase: "playing" };
  return state;
}

export function movePlayer(state, dx, dy) {
  if (state.phase !== "playing") return state;
  const target = { x: state.player.x + dx, y: state.player.y + dy };
  const blocked = isWall(target) || state.shards.some((shard) => !shard.docked && same(shard, target));
  if (blocked) return { ...state, lastEvent: "The way is blocked." };
  return {
    ...state,
    player: target,
    moves: state.moves + 1,
    lastEvent: "",
    pulseFrom: null
  };
}

function desiredStep(shard, player, polarity) {
  const dx = player.x - shard.x;
  const dy = player.y - shard.y;
  let sx = 0;
  let sy = 0;
  if (Math.abs(dx) >= Math.abs(dy)) sx = Math.sign(dx);
  else sy = Math.sign(dy);
  if (polarity === "push") {
    sx *= -1;
    sy *= -1;
  }
  return { x: shard.x + sx, y: shard.y + sy };
}

export function flipPolarity(state) {
  if (state.phase !== "playing") return state;
  const polarity = state.polarity === "pull" ? "push" : "pull";
  const loose = state.shards.filter((shard) => !shard.docked);
  const occupied = new Set(state.shards.filter((shard) => shard.docked).map(key));
  const proposals = new Map();

  for (const shard of loose) {
    const target = desiredStep(shard, state.player, polarity);
    proposals.set(shard.id, target);
  }

  const targetCounts = new Map();
  for (const target of proposals.values()) {
    targetCounts.set(key(target), (targetCounts.get(key(target)) ?? 0) + 1);
  }

  const staying = new Set();
  for (const shard of loose) {
    const target = proposals.get(shard.id);
    if (isWall(target) || same(target, state.player) || occupied.has(key(target)) || targetCounts.get(key(target)) > 1) staying.add(shard.id);
  }

  let changed = true;
  while (changed) {
    changed = false;
    for (const shard of loose) {
      if (staying.has(shard.id)) continue;
      const target = proposals.get(shard.id);
      const blocker = loose.find((other) => other.id !== shard.id && same(other, target));
      if (blocker && staying.has(blocker.id)) {
        staying.add(shard.id);
        changed = true;
      }
    }
  }

  let dockedNow = 0;
  const shards = state.shards.map((shard) => {
    if (shard.docked || staying.has(shard.id)) return { ...shard };
    const target = proposals.get(shard.id);
    const docked = LEVEL.sockets.some((socket) => same(socket, target));
    if (docked) dockedNow += 1;
    return { ...shard, ...target, docked };
  });
  const allDocked = shards.every((shard) => shard.docked);
  const moved = loose.length - staying.size;
  return {
    ...state,
    phase: allDocked ? "won" : "playing",
    polarity,
    shards,
    pulses: state.pulses + 1,
    lastEvent: allDocked ? "The forge is whole." : dockedNow ? `${dockedNow} seed locked.` : moved ? "The seeds answer." : "The field meets resistance.",
    pulseFrom: { ...state.player }
  };
}

export function reduce(state, action) {
  if (action === "enter") return startGame(state);
  if (action === "reset") return resetGame();
  if (action === "pause") return togglePause(state);
  if (action === "flip") return flipPolarity(state);
  if (action === "left") return movePlayer(state, -1, 0);
  if (action === "right") return movePlayer(state, 1, 0);
  if (action === "up") return movePlayer(state, 0, -1);
  if (action === "down") return movePlayer(state, 0, 1);
  return state;
}

export function isWall(position) {
  return position.x <= 0 || position.x >= WIDTH - 1 || position.y <= 0 || position.y >= HEIGHT - 1 || LEVEL.walls.some((wall) => same(wall, position));
}

export function statusText(state) {
  const docked = state.shards.filter((shard) => shard.docked).length;
  if (state.phase === "title") return "Lodestar Forge title. Press Enter to enter the chamber.";
  if (state.phase === "paused") return `Paused. ${docked} of 3 seeds locked. Press Escape to resume.`;
  if (state.phase === "won") return `Forge complete. 3 of 3 seeds locked in ${state.pulses} polarity flips. Press Enter to replay.`;
  return `Chamber active. ${state.polarity} polarity. ${docked} of 3 seeds locked. Arrow keys move. Space flips polarity. R restarts. Escape pauses.`;
}
