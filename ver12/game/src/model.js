export const WIDTH = 9;
export const HEIGHT = 7;

const freezeLevel = (level) => Object.freeze({
  ...level,
  player: Object.freeze(level.player),
  shards: Object.freeze(level.shards.map(Object.freeze)),
  sockets: Object.freeze(level.sockets.map(Object.freeze)),
  walls: Object.freeze(level.walls.map(Object.freeze)),
  blocks: Object.freeze(level.blocks.map(Object.freeze)),
  poles: Object.freeze(level.poles.map(Object.freeze))
});

export const LEVELS = Object.freeze([freezeLevel({
  name: "First Mold",
  lesson: "One field moves every loose seed.",
  player: Object.freeze({ x: 4, y: 3 }),
  shards: [
    { id: "cobalt", x: 2, y: 2 },
    { id: "ember", x: 6, y: 2 },
    { id: "pearl", x: 4, y: 5 }
  ],
  sockets: [
    { x: 1, y: 2 },
    { x: 7, y: 2 },
    { x: 3, y: 5 }
  ],
  walls: [
    { x: 3, y: 1 }, { x: 5, y: 1 },
    { x: 3, y: 4 }, { x: 6, y: 4 },
    { x: 5, y: 5 }
  ],
  blocks: [],
  poles: []
}), freezeLevel({
  name: "Iron Brake",
  lesson: "Use fixed iron to hold one seed back.",
  player: { x: 4, y: 3 },
  shards: [
    { id: "cobalt", x: 2, y: 2 },
    { id: "ember", x: 6, y: 2 },
    { id: "pearl", x: 4, y: 5 }
  ],
  sockets: [
    { x: 1, y: 2 },
    { x: 6, y: 1 },
    { x: 5, y: 5 }
  ],
  walls: [
    { x: 3, y: 1 }, { x: 5, y: 1 },
    { x: 3, y: 4 }, { x: 6, y: 4 }
  ],
  blocks: [
    { x: 7, y: 2 }
  ],
  poles: []
}), freezeLevel({
  name: "Polar Veil",
  lesson: "Striped poles stop seeds on one axis, not the smith.",
  player: { x: 4, y: 3 },
  shards: [
    { id: "cobalt", x: 2, y: 2 },
    { id: "ember", x: 6, y: 2 },
    { id: "pearl", x: 4, y: 5 }
  ],
  sockets: [
    { x: 1, y: 2 },
    { x: 6, y: 1 },
    { x: 3, y: 5 }
  ],
  walls: [
    { x: 3, y: 1 }, { x: 5, y: 1 },
    { x: 3, y: 4 }, { x: 6, y: 3 }
  ],
  blocks: [
    { x: 7, y: 2 }
  ],
  poles: [
    { x: 5, y: 5, blocksAxis: "horizontal" }
  ]
}), freezeLevel({
  name: "Cold Lodestone",
  lesson: "Marked seeds answer only the matching field.",
  player: { x: 4, y: 3 },
  shards: [
    { id: "cobalt", x: 2, y: 2, respondsTo: "pull" },
    { id: "ember", x: 6, y: 2 },
    { id: "pearl", x: 6, y: 4 }
  ],
  sockets: [
    { x: 3, y: 3 },
    { x: 7, y: 2 },
    { x: 7, y: 4 }
  ],
  walls: [
    { x: 3, y: 1 }, { x: 5, y: 1 },
    { x: 2, y: 3 }, { x: 6, y: 3 },
    { x: 2, y: 5 }, { x: 6, y: 5 }
  ],
  blocks: [],
  poles: []
}), freezeLevel({
  name: "Tempered Relay",
  lesson: "Iron and striped poles relay the field between seeds.",
  player: { x: 4, y: 3 },
  shards: [
    { id: "cobalt", x: 2, y: 2, respondsTo: "pull" },
    { id: "ember", x: 6, y: 2 },
    { id: "pearl", x: 4, y: 5 }
  ],
  sockets: [
    { x: 3, y: 5 },
    { x: 5, y: 3 },
    { x: 1, y: 2 }
  ],
  walls: [
    { x: 3, y: 1 }, { x: 5, y: 1 },
    { x: 3, y: 4 }, { x: 6, y: 4 }
  ],
  blocks: [
    { x: 6, y: 3 }
  ],
  poles: [
    { x: 6, y: 1, blocksAxis: "vertical" }
  ]
}), freezeLevel({
  name: "Crown Crucible",
  lesson: "Opposed marks answer on alternating beats.",
  player: { x: 4, y: 3 },
  shards: [
    { id: "cobalt", x: 2, y: 2, respondsTo: "pull" },
    { id: "ember", x: 6, y: 2, respondsTo: "push" },
    { id: "pearl", x: 4, y: 5 }
  ],
  sockets: [
    { x: 3, y: 5 },
    { x: 3, y: 3 },
    { x: 3, y: 2 }
  ],
  walls: [
    { x: 3, y: 1 }, { x: 5, y: 1 },
    { x: 3, y: 4 }, { x: 6, y: 4 }
  ],
  blocks: [
    { x: 6, y: 3 }
  ],
  poles: [
    { x: 6, y: 1, blocksAxis: "vertical" }
  ]
})]);

export const LEVEL = LEVELS[0];

export function levelFor(state) {
  return LEVELS[state.levelIndex];
}

const key = ({ x, y }) => `${x},${y}`;
const same = (a, b) => a.x === b.x && a.y === b.y;

export function createGame(levelIndex = 0) {
  const level = LEVELS[levelIndex];
  return {
    phase: "attract",
    levelIndex,
    credits: 0,
    score: 0,
    chamberStartScore: 0,
    polarity: "pull",
    player: { ...level.player },
    shards: level.shards.map((shard) => ({ ...shard, docked: false })),
    moves: 0,
    pulses: 0,
    lastEvent: "",
    pulseFrom: null
  };
}

export function startGame(state) {
  if (state.phase !== "attract" && state.phase !== "ready" && state.phase !== "won") return state;
  const advances = state.phase === "won" && state.levelIndex < LEVELS.length - 1;
  const nextIndex = advances ? state.levelIndex + 1 : state.levelIndex;
  const nextScore = state.phase === "won" && !advances ? state.chamberStartScore : state.score;
  const next = createGame(nextIndex);
  next.phase = "playing";
  next.credits = state.phase === "ready" ? Math.max(0, state.credits - 1) : state.credits;
  next.score = nextScore;
  next.chamberStartScore = nextScore;
  if (nextIndex > state.levelIndex) next.lastEvent = LEVELS[nextIndex].lesson;
  return next;
}

export function insertCoin(state) {
  if (state.phase !== "attract") return state;
  return { ...state, phase: "ready", credits: 1, lastEvent: "Credit accepted." };
}

export function resetGame(levelIndex = 0, score = 0, credits = 1) {
  const state = createGame(levelIndex);
  state.phase = "playing";
  state.credits = credits;
  state.score = score;
  state.chamberStartScore = score;
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
  const blocked = isWall(target, levelFor(state)) || state.shards.some((shard) => !shard.docked && same(shard, target));
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

function isPoleBlocked(shard, target, level) {
  const axis = target.x === shard.x ? "vertical" : "horizontal";
  return level.poles.some((pole) => same(pole, target) && pole.blocksAxis === axis);
}

export function flipPolarity(state) {
  if (state.phase !== "playing") return state;
  const polarity = state.polarity === "pull" ? "push" : "pull";
  const level = levelFor(state);
  const loose = state.shards.filter((shard) => !shard.docked);
  const responsive = loose.filter((shard) => !shard.respondsTo || shard.respondsTo === polarity);
  const occupied = new Set(state.shards.filter((shard) => shard.docked).map(key));
  const proposals = new Map();

  for (const shard of responsive) {
    const target = desiredStep(shard, state.player, polarity);
    proposals.set(shard.id, target);
  }

  const targetCounts = new Map();
  for (const target of proposals.values()) {
    targetCounts.set(key(target), (targetCounts.get(key(target)) ?? 0) + 1);
  }

  const staying = new Set(loose.filter((shard) => !responsive.includes(shard)).map((shard) => shard.id));
  for (const shard of responsive) {
    const target = proposals.get(shard.id);
    if (isWall(target, level) || isPoleBlocked(shard, target, level) || same(target, state.player) || occupied.has(key(target)) || targetCounts.get(key(target)) > 1) staying.add(shard.id);
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
    const docked = level.sockets.some((socket) => same(socket, target));
    if (docked) dockedNow += 1;
    return { ...shard, ...target, docked };
  });
  const allDocked = shards.every((shard) => shard.docked);
  const moved = loose.length - staying.size;
  const resistedByPolarity = responsive.length < loose.length;
  return {
    ...state,
    phase: allDocked ? "won" : "playing",
    polarity,
    shards,
    score: state.score + dockedNow * 1000 + (allDocked ? 5000 + Math.max(0, 8 - (state.pulses + 1)) * 250 : 0),
    pulses: state.pulses + 1,
    lastEvent: allDocked ? "The forge is whole." : dockedNow ? `${dockedNow} seed locked.` : moved ? "The seeds answer." : resistedByPolarity ? `The marked seed ignores ${polarity.toUpperCase()}.` : "The field meets resistance.",
    pulseFrom: { ...state.player }
  };
}

export function reduce(state, action) {
  if (action === "coin") return insertCoin(state);
  if (action === "enter") return state.phase === "attract" ? state : startGame(state);
  if (action === "reset") return resetGame(state.levelIndex, state.chamberStartScore, state.credits);
  if (action === "pause") return togglePause(state);
  if (action === "flip") return flipPolarity(state);
  if (action === "left") return movePlayer(state, -1, 0);
  if (action === "right") return movePlayer(state, 1, 0);
  if (action === "up") return movePlayer(state, 0, -1);
  if (action === "down") return movePlayer(state, 0, 1);
  return state;
}

export function isWall(position, level = LEVEL) {
  return position.x <= 0 || position.x >= WIDTH - 1 || position.y <= 0 || position.y >= HEIGHT - 1 || level.walls.some((wall) => same(wall, position)) || level.blocks.some((block) => same(block, position));
}

export function statusText(state) {
  const docked = state.shards.filter((shard) => shard.docked).length;
  if (state.phase === "attract") return "Lodestar Forge attract mode. Move with the lever and flip the whole field with button 1. Press C to insert coin.";
  if (state.phase === "ready") return "One credit. Press Enter to start Lodestar Forge.";
  const chamber = state.levelIndex + 1;
  if (state.phase === "paused") return `Paused in chamber ${chamber}. Score ${state.score}. ${docked} of 3 seeds locked. Press Escape to resume.`;
  if (state.phase === "won") return `Chamber ${chamber} complete. Score ${state.score}. 3 of 3 seeds locked in ${state.pulses} polarity flips. Press Enter to ${state.levelIndex < LEVELS.length - 1 ? "continue" : "reforge the final crucible"}.`;
  const marked = state.shards.filter((shard) => shard.respondsTo && !shard.docked);
  const markedText = marked.map((shard) => ` ${shard.id} answers only ${shard.respondsTo}.`).join("");
  return `Chamber ${chamber} active. Score ${state.score}. ${state.polarity} polarity. ${docked} of 3 seeds locked.${markedText} Arrow keys move. Space flips polarity. R restarts. Escape pauses.`;
}
