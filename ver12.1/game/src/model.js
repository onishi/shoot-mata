export const WIDTH = 9;
export const HEIGHT = 7;

const freezeLevel = (level) => Object.freeze({
  ...level,
  sigil: level.sigil ? Object.freeze(level.sigil) : null,
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
  pulseLimit: 6,
  sigil: { x: 6, y: 1, bonus: 3000 },
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
  pulseLimit: 7,
  sigil: { x: 4, y: 4, bonus: 3000 },
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
  pulseLimit: 7,
  sigil: { x: 1, y: 1, bonus: 3500 },
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
  pulseLimit: 8,
  sigil: { x: 6, y: 1, bonus: 4000 },
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
  pulseLimit: 10,
  sigil: { x: 3, y: 2, bonus: 5000 },
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
  pulseLimit: 11,
  sigil: { x: 1, y: 3, bonus: 6000 },
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
    continues: 0,
    outcome: null,
    polarity: "pull",
    player: { ...level.player },
    shards: level.shards.map((shard) => ({ ...shard, docked: false })),
    moves: 0,
    pulses: 0,
    lastEvent: "",
    pulseFrom: null,
    sigilLit: false,
    undoUsed: false,
    undoSnapshot: null,
    initials: ["A", "A", "A"],
    initialCursor: 0
  };
}

export function startGame(state) {
  if (state.phase === "ranking") return createGame(state.levelIndex);
  if (state.phase === "gameover") {
    return { ...state, phase: "initials", outcome: "over", initials: ["A", "A", "A"], initialCursor: 0 };
  }
  if (state.phase !== "attract" && state.phase !== "ready" && state.phase !== "continue_ready" && state.phase !== "won") return state;
  if (state.phase === "won" && state.levelIndex === LEVELS.length - 1) {
    return { ...state, phase: "initials", outcome: "complete", initials: ["A", "A", "A"], initialCursor: 0 };
  }
  const continuing = state.phase === "continue_ready";
  const advances = state.phase === "won" && state.levelIndex < LEVELS.length - 1;
  const nextIndex = advances ? state.levelIndex + 1 : state.levelIndex;
  const nextScore = continuing || (state.phase === "won" && !advances) ? state.chamberStartScore : state.score;
  const next = createGame(nextIndex);
  next.phase = "playing";
  next.credits = state.phase === "ready" || continuing ? Math.max(0, state.credits - 1) : state.credits;
  next.score = nextScore;
  next.chamberStartScore = nextScore;
  next.continues = state.continues + (continuing ? 1 : 0);
  if (nextIndex > state.levelIndex) next.lastEvent = LEVELS[nextIndex].lesson;
  if (continuing) next.lastEvent = "The forge burns again.";
  return next;
}

function editInitials(state, action) {
  if (state.phase !== "initials") return state;
  if (action === "left" || action === "right") {
    const offset = action === "left" ? -1 : 1;
    return { ...state, initialCursor: (state.initialCursor + offset + 3) % 3 };
  }
  if (action === "up" || action === "down") {
    const initials = [...state.initials];
    const code = initials[state.initialCursor].charCodeAt(0) - 65;
    const offset = action === "up" ? 1 : -1;
    initials[state.initialCursor] = String.fromCharCode(65 + (code + offset + 26) % 26);
    return { ...state, initials };
  }
  if (action === "flip") return { ...state, phase: "ranking" };
  return state;
}

export function insertCoin(state) {
  if (state.phase === "attract") return { ...state, phase: "ready", credits: 1, lastEvent: "Credit accepted." };
  if (state.phase === "gameover") return { ...state, phase: "continue_ready", credits: 1, lastEvent: "Continue credit accepted." };
  return state;
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

function resolveFlip(state) {
  const polarity = state.polarity === "pull" ? "push" : "pull";
  const level = levelFor(state);
  const loose = state.shards.filter((shard) => !shard.docked);
  const responsive = loose.filter((shard) => !shard.respondsTo || shard.respondsTo === polarity);
  const occupied = new Set(state.shards.filter((shard) => shard.docked).map(key));
  const proposals = new Map();
  for (const shard of responsive) proposals.set(shard.id, desiredStep(shard, state.player, polarity));

  const targetCounts = new Map();
  for (const target of proposals.values()) targetCounts.set(key(target), (targetCounts.get(key(target)) ?? 0) + 1);

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
  return { polarity, level, loose, responsive, proposals, staying };
}

export function previewFlip(state) {
  if (state.phase !== "playing") return { polarity: state.polarity, outcomes: [] };
  const { polarity, level, loose, responsive, proposals, staying } = resolveFlip(state);
  return {
    polarity,
    outcomes: loose.map((shard) => {
      const responds = responsive.includes(shard);
      const proposed = responds ? proposals.get(shard.id) : { x: shard.x, y: shard.y };
      const moves = !staying.has(shard.id);
      const target = moves ? proposed : { x: shard.x, y: shard.y };
      const locks = moves && level.sockets.some((socket) => same(socket, proposed));
      const tempers = moves && !state.sigilLit && level.sigil && same(level.sigil, proposed);
      return {
        id: shard.id,
        from: { x: shard.x, y: shard.y },
        target: { ...target },
        result: locks ? "lock" : tempers ? "temper" : moves ? "move" : responds ? "blocked" : "rest"
      };
    })
  };
}

export function flipPolarity(state) {
  if (state.phase !== "playing") return state;
  const { polarity, level, loose, responsive, proposals, staying } = resolveFlip(state);

  let dockedNow = 0;
  let sigilLitNow = false;
  const shards = state.shards.map((shard) => {
    if (shard.docked || staying.has(shard.id)) return { ...shard };
    const target = proposals.get(shard.id);
    const docked = level.sockets.some((socket) => same(socket, target));
    if (docked) dockedNow += 1;
    if (!state.sigilLit && level.sigil && same(level.sigil, target)) sigilLitNow = true;
    return { ...shard, ...target, docked };
  });
  const allDocked = shards.every((shard) => shard.docked);
  const nextPulses = state.pulses + 1;
  const overheated = !allDocked && nextPulses >= level.pulseLimit;
  const moved = loose.length - staying.size;
  const resistedByPolarity = responsive.length < loose.length;
  const undoSnapshot = state.undoUsed ? null : {
    phase: state.phase,
    polarity: state.polarity,
    player: { ...state.player },
    shards: state.shards.map((shard) => ({ ...shard })),
    score: state.score,
    moves: state.moves,
    pulses: state.pulses,
    lastEvent: state.lastEvent,
    pulseFrom: state.pulseFrom ? { ...state.pulseFrom } : null,
    sigilLit: state.sigilLit
  };
  return {
    ...state,
    phase: allDocked ? "won" : overheated ? "gameover" : "playing",
    polarity,
    shards,
    score: state.score + dockedNow * 1000 + (sigilLitNow ? level.sigil.bonus : 0) + (allDocked ? 5000 + Math.max(0, 8 - (state.pulses + 1)) * 250 : 0),
    pulses: nextPulses,
    lastEvent: allDocked ? "The forge is whole." : overheated ? "The forge overheated." : sigilLitNow ? `Temper sigil struck! +${level.sigil.bonus}.` : dockedNow ? `${dockedNow} seed locked.` : moved ? "The seeds answer." : resistedByPolarity ? `The marked seed ignores ${polarity.toUpperCase()}.` : "The field meets resistance.",
    sigilLit: state.sigilLit || sigilLitNow,
    pulseFrom: { ...state.player },
    undoSnapshot
  };
}

export function undoLastFlip(state) {
  if (state.undoUsed || !state.undoSnapshot || !["playing", "won", "gameover"].includes(state.phase)) return state;
  return {
    ...state,
    ...state.undoSnapshot,
    player: { ...state.undoSnapshot.player },
    shards: state.undoSnapshot.shards.map((shard) => ({ ...shard })),
    pulseFrom: state.undoSnapshot.pulseFrom ? { ...state.undoSnapshot.pulseFrom } : null,
    phase: "playing",
    lastEvent: "Last field strike rewound.",
    undoUsed: true,
    undoSnapshot: null
  };
}

export function reduce(state, action) {
  if (state.phase === "initials") return editInitials(state, action);
  if (action === "coin") return insertCoin(state);
  if (action === "enter") return state.phase === "attract" ? state : startGame(state);
  if (action === "reset" && ["playing", "paused", "won"].includes(state.phase)) {
    const reset = resetGame(state.levelIndex, state.chamberStartScore, state.credits);
    reset.continues = state.continues;
    return reset;
  }
  if (action === "pause") return togglePause(state);
  if (action === "undo") return undoLastFlip(state);
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
  if (state.phase === "continue_ready") return `Continue credit ready in chamber ${state.levelIndex + 1}. Press Enter to restart the chamber.`;
  if (state.phase === "gameover") return `Game over in chamber ${state.levelIndex + 1}. Forge heat reached ${levelFor(state).pulseLimit}. Press C to continue or Enter to record your score.`;
  if (state.phase === "initials") return `Final score ${state.score}. Enter initials ${state.initials.join("")}. Letter ${state.initialCursor + 1} selected. Up and down change letter. Left and right select. Button 1 registers.`;
  if (state.phase === "ranking") return `Local top five ranking. Final score ${state.score}. Press Enter to return to attract mode.`;
  const chamber = state.levelIndex + 1;
  if (state.phase === "paused") return `Paused in chamber ${chamber}. Score ${state.score}. ${docked} of 3 seeds locked. Press Escape to resume.`;
  if (state.phase === "won") return `Chamber ${chamber} complete. Score ${state.score}. 3 of 3 seeds locked in ${state.pulses} polarity flips. Press Enter to ${state.levelIndex < LEVELS.length - 1 ? "continue" : "record your initials"}.`;
  const marked = state.shards.filter((shard) => shard.respondsTo && !shard.docked);
  const markedText = marked.map((shard) => ` ${shard.id} answers only ${shard.respondsTo}.`).join("");
  const sigilText = levelFor(state).sigil ? ` Temper sigil ${state.sigilLit ? "lit" : `unlit for ${levelFor(state).sigil.bonus} bonus points`}.` : "";
  const preview = previewFlip(state);
  const resultText = { lock: "lock", temper: "strike temper", move: "move", blocked: "stay blocked", rest: "rest" };
  const previewText = preview.outcomes.map((outcome) => `${outcome.id} will ${resultText[outcome.result]}`).join(", ");
  return `Chamber ${chamber} active. Score ${state.score}. Current field ${state.polarity}; next strike ${preview.polarity}. Preview: ${previewText}. ${docked} of 3 seeds locked.${sigilText}${markedText} One-step undo ${state.undoUsed ? "spent" : state.undoSnapshot ? "ready" : "waiting for a polarity flip"}. Arrow keys move. Space strikes the previewed field. U undoes the last flip once per chamber. R restarts. Escape pauses.`;
}
