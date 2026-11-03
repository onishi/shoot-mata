export type Mode = "playing" | "won" | "lost";
export type Vec = { x: number; y: number };
export type Input = { x: number; y: number };

export type Mote = Vec & {
  id: number;
  vx: number;
  vy: number;
  touched: boolean;
  deflectedBy: number[];
};

export type Ripple = Vec & { id: number; radius: number; age: number };

export type GameState = {
  mode: Mode;
  time: number;
  health: number;
  charges: number;
  recharge: number;
  score: number;
  player: Vec;
  motes: Mote[];
  ripples: Ripple[];
  spawned: number;
  nextId: number;
};

export const WORLD = { width: 1280, height: 720, cx: 640, cy: 382, pondRadius: 272 } as const;
export const STAGE_DURATION = 18;
export const MAX_CHARGES = 3;
const SHORE_RADIUS = 232;

const SPAWNS = [
  { at: 0.6, angle: -2.55, speed: 70 },
  { at: 2.15, angle: -0.62, speed: 76 },
  { at: 4.7, angle: 2.78, speed: 73 },
  { at: 7.1, angle: 0.32, speed: 82 },
  { at: 10.2, angle: -1.38, speed: 78 },
  { at: 13.1, angle: 1.86, speed: 86 }
] as const;

export function createGame(): GameState {
  return {
    mode: "playing",
    time: 0,
    health: 3,
    charges: MAX_CHARGES,
    recharge: 0,
    score: 0,
    player: { x: WORLD.cx, y: WORLD.cy + 76 },
    motes: [],
    ripples: [],
    spawned: 0,
    nextId: 1
  };
}

function distance(x: number, y: number, cx = WORLD.cx, cy = WORLD.cy): number {
  return Math.hypot(x - cx, y - cy);
}

function clampPlayer(player: Vec): Vec {
  const dx = player.x - WORLD.cx;
  const dy = player.y - WORLD.cy;
  const d = Math.hypot(dx, dy);
  const limit = WORLD.pondRadius - 16;
  if (d <= limit) return player;
  return { x: WORLD.cx + (dx / d) * limit, y: WORLD.cy + (dy / d) * limit };
}

function spawnMote(state: GameState, index: number): Mote {
  const spawn = SPAWNS[index];
  const radius = WORLD.pondRadius + 34;
  const x = WORLD.cx + Math.cos(spawn.angle) * radius;
  const y = WORLD.cy + Math.sin(spawn.angle) * radius;
  return {
    id: state.nextId,
    x,
    y,
    vx: -Math.cos(spawn.angle) * spawn.speed,
    vy: -Math.sin(spawn.angle) * spawn.speed,
    touched: false,
    deflectedBy: []
  };
}

export function emitRipple(state: GameState): GameState {
  if (state.mode !== "playing" || state.charges <= 0) return state;
  return {
    ...state,
    charges: state.charges - 1,
    recharge: 0,
    nextId: state.nextId + 1,
    ripples: [...state.ripples, { id: state.nextId, x: state.player.x, y: state.player.y, radius: 8, age: 0 }]
  };
}

export function tick(state: GameState, input: Input, dt: number): GameState {
  if (state.mode !== "playing") return state;
  const length = Math.hypot(input.x, input.y) || 1;
  const speed = 188;
  const player = clampPlayer({
    x: state.player.x + (input.x / length) * speed * dt,
    y: state.player.y + (input.y / length) * speed * dt
  });

  let charges = state.charges;
  let recharge = state.recharge;
  if (distance(player.x, player.y) >= SHORE_RADIUS && charges < MAX_CHARGES) {
    recharge += dt;
    if (recharge >= 0.85) {
      charges += 1;
      recharge -= 0.85;
    }
  } else if (distance(player.x, player.y) < SHORE_RADIUS - 12) {
    recharge = 0;
  }

  let spawned = state.spawned;
  let nextId = state.nextId;
  const motes = state.motes.map((mote) => ({ ...mote, deflectedBy: [...mote.deflectedBy] }));
  const nextTime = state.time + dt;
  while (spawned < SPAWNS.length && SPAWNS[spawned].at <= nextTime) {
    const mote = spawnMote({ ...state, nextId }, spawned);
    motes.push(mote);
    nextId += 1;
    spawned += 1;
  }

  const ripples = state.ripples
    .map((ripple) => ({ ...ripple, radius: ripple.radius + 318 * dt, age: ripple.age + dt }))
    .filter((ripple) => ripple.radius < 330);

  let health = state.health;
  let score = state.score;
  const survivors: Mote[] = [];
  for (const mote of motes) {
    mote.x += mote.vx * dt;
    mote.y += mote.vy * dt;
    for (const ripple of ripples) {
      if (mote.deflectedBy.includes(ripple.id)) continue;
      const dx = mote.x - ripple.x;
      const dy = mote.y - ripple.y;
      const d = Math.hypot(dx, dy) || 1;
      if (Math.abs(d - ripple.radius) <= 12) {
        mote.deflectedBy.push(ripple.id);
        mote.touched = true;
        mote.vx = (dx / d) * 238;
        mote.vy = (dy / d) * 238;
      }
    }
    const centerDistance = distance(mote.x, mote.y);
    if (centerDistance <= 34) {
      health -= 1;
    } else if (mote.touched && centerDistance > WORLD.pondRadius + 44) {
      score += 1;
    } else {
      survivors.push(mote);
    }
  }

  const time = nextTime;
  const mode: Mode = health <= 0 ? "lost" : time >= STAGE_DURATION ? "won" : "playing";
  return { ...state, mode, time, health: Math.max(0, health), charges, recharge, score, player, motes: survivors, ripples, spawned, nextId };
}

export function simulate(seconds: number, strategy: (state: GameState) => { input: Input; pulse: boolean }): GameState {
  let state = createGame();
  const steps = Math.ceil(seconds * 60);
  for (let i = 0; i < steps && state.mode === "playing"; i += 1) {
    const action = strategy(state);
    if (action.pulse) state = emitRipple(state);
    state = tick(state, action.input, 1 / 60);
  }
  return state;
}
