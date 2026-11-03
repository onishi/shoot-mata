export type Mode = "playing" | "won" | "lost";
export type StageId = "first-rain" | "shore-call" | "split-current" | "reed-gate" | "resonant-pool" | "moonwake" | "dew-crossing";
export type Vec = { x: number; y: number };
export type Input = { x: number; y: number };

export type Drift = "steady" | "swift" | "deep" | "heavy";

type Spawn = { at: number; angle: number; speed: number; radius?: number; drift?: Drift; targetTime?: number };

export type StageDefinition = {
  id: StageId;
  name: string;
  instruction: string;
  duration: number;
  spawns: readonly Spawn[];
  reeds?: boolean;
  resonance?: boolean;
  movingBloom?: boolean;
  rippleRange?: number;
};

export type Mote = Vec & {
  id: number;
  vx: number;
  vy: number;
  touched: boolean;
  drift: Drift;
  deflectedBy: number[];
  target: Vec;
};

export type Ripple = Vec & { id: number; radius: number; age: number };

export type GameState = {
  stageId: StageId;
  mode: Mode;
  time: number;
  health: number;
  charges: number;
  recharge: number;
  score: number;
  player: Vec;
  bloom: Vec;
  motes: Mote[];
  ripples: Ripple[];
  spawned: number;
  nextId: number;
};

export const WORLD = { width: 1280, height: 720, cx: 640, cy: 382, pondRadius: 272 } as const;
export const REED_BELT = { radius: 132, startAngle: -0.68, endAngle: 0.68 } as const;
export const STAGE_DURATION = 18;
export const MAX_CHARGES = 3;
const SHORE_RADIUS = 232;

const FIRST_RAIN_SPAWNS = [
  { at: 0.6, angle: -2.55, speed: 70 },
  { at: 2.15, angle: -0.62, speed: 76 },
  { at: 4.7, angle: 2.78, speed: 73 },
  { at: 7.1, angle: 0.32, speed: 82 },
  { at: 10.2, angle: -1.38, speed: 78 },
  { at: 13.1, angle: 1.86, speed: 86 }
] as const;

const SHORE_CALL_SPAWNS = [
  { at: 0.6, angle: -2.7, speed: 74 },
  { at: 0.6, angle: 0.44, speed: 74 },
  { at: 5.0, angle: -0.8, speed: 78 },
  { at: 5.0, angle: 2.34, speed: 78 },
  { at: 9.4, angle: -1.58, speed: 82 },
  { at: 9.4, angle: 1.56, speed: 82 },
  { at: 13.8, angle: -2.18, speed: 86 },
  { at: 13.8, angle: -0.61, speed: 86 },
  { at: 13.8, angle: 0.96, speed: 86 },
  { at: 13.8, angle: 2.53, speed: 86 }
] as const;

const SPLIT_CURRENT_SPAWNS = [
  { at: 0.6, angle: -2.78, speed: 132, drift: "swift" },
  { at: 0.6, angle: -2.36, speed: 132, drift: "swift" },
  { at: 0.6, angle: -1.94, speed: 132, drift: "swift" },
  { at: 0.6, angle: -0.34, speed: 50, radius: 500, drift: "deep" },
  { at: 0.6, angle: 0, speed: 50, radius: 500, drift: "deep" },
  { at: 0.6, angle: 0.34, speed: 50, radius: 500, drift: "deep" }
] as const;

const REED_GATE_SPAWNS = [
  { at: 0.7, angle: -0.34, speed: 72 },
  { at: 0.7, angle: 0, speed: 72 },
  { at: 0.7, angle: 0.34, speed: 72 },
  { at: 6.0, angle: -0.28, speed: 78 },
  { at: 6.0, angle: 0, speed: 78 },
  { at: 6.0, angle: 0.28, speed: 78 }
] as const;

const RESONANT_POOL_SPAWNS = [
  { at: 0.15, angle: -1.92, speed: 22, radius: 118, drift: "heavy" },
  { at: 0.15, angle: -1.57, speed: 22, radius: 118, drift: "heavy" },
  { at: 0.15, angle: -1.22, speed: 22, radius: 118, drift: "heavy" }
] as const;

const MOONWAKE_SPAWNS = [
  { at: 0.55, angle: -2.5, speed: 78, targetTime: 3.0, drift: "swift" },
  { at: 0.55, angle: 2.5, speed: 78, targetTime: 3.0, drift: "swift" },
  { at: 5.0, angle: -0.52, speed: 82, targetTime: 9.0 },
  { at: 5.0, angle: 0.52, speed: 82, targetTime: 9.0 },
  { at: 9.65, angle: -2.52, speed: 84, targetTime: 15.0 },
  { at: 9.65, angle: 2.52, speed: 84, targetTime: 15.0 }
] as const;

const DEW_CROSSING_SPAWNS = [
  { at: 0.55, angle: -2.52, speed: 78, targetTime: 3.0, drift: "swift" },
  { at: 0.55, angle: 2.52, speed: 78, targetTime: 3.0, drift: "swift" },
  { at: 4.65, angle: -0.5, speed: 80, targetTime: 8.0 },
  { at: 4.65, angle: 0.5, speed: 80, targetTime: 8.0 },
  { at: 9.55, angle: -2.5, speed: 82, targetTime: 13.0 },
  { at: 9.55, angle: 2.5, speed: 82, targetTime: 13.0 },
  { at: 14.55, angle: -0.5, speed: 84, targetTime: 18.0 },
  { at: 14.55, angle: -0.38, speed: 84, targetTime: 18.0 },
  { at: 14.55, angle: 0.5, speed: 84, targetTime: 18.0 }
] as const;

export const STAGES: Record<StageId, StageDefinition> = {
  "first-rain": {
    id: "first-rain",
    name: "FIRST RAIN",
    instruction: "Protect the moonbloom",
    duration: STAGE_DURATION,
    spawns: FIRST_RAIN_SPAWNS
  },
  "shore-call": {
    id: "shore-call",
    name: "SHORE CALL",
    instruction: "Return to the shore for dew",
    duration: 22,
    spawns: SHORE_CALL_SPAWNS
  },
  "split-current": {
    id: "split-current",
    name: "SPLIT CURRENT",
    instruction: "Swift spores arrive before deep drifters",
    duration: 12,
    spawns: SPLIT_CURRENT_SPAWNS
  },
  "reed-gate": {
    id: "reed-gate",
    name: "REED GATE",
    instruction: "Cross the reeds before casting",
    duration: 14,
    spawns: REED_GATE_SPAWNS,
    reeds: true
  },
  "resonant-pool": {
    id: "resonant-pool",
    name: "RESONANT POOL",
    instruction: "Overlap two ripples to move heavy spores",
    duration: 8,
    spawns: RESONANT_POOL_SPAWNS,
    resonance: true
  },
  moonwake: {
    id: "moonwake",
    name: "MOONWAKE",
    instruction: "Guard where the drifting bloom will arrive",
    duration: 16,
    spawns: MOONWAKE_SPAWNS,
    movingBloom: true,
    rippleRange: 132
  },
  "dew-crossing": {
    id: "dew-crossing",
    name: "DEW CROSSING",
    instruction: "Read the next wake, then cross for dew",
    duration: 20,
    spawns: DEW_CROSSING_SPAWNS,
    movingBloom: true,
    rippleRange: 148
  }
};

export function bloomPosition(stageId: StageId, time: number): Vec {
  if (!STAGES[stageId].movingBloom) return { x: WORLD.cx, y: WORLD.cy };
  return {
    x: WORLD.cx + Math.sin((time / 12) * Math.PI * 2) * 190,
    y: WORLD.cy + Math.sin((time / 6) * Math.PI * 2) * 18
  };
}

export function createGame(stageId: StageId = "first-rain"): GameState {
  return {
    stageId,
    mode: "playing",
    time: 0,
    health: 3,
    charges: MAX_CHARGES,
    recharge: 0,
    score: 0,
    player: { x: WORLD.cx, y: WORLD.cy + 76 },
    bloom: bloomPosition(stageId, 0),
    motes: [],
    ripples: [],
    spawned: 0,
    nextId: 1
  };
}

function distance(x: number, y: number, cx: number = WORLD.cx, cy: number = WORLD.cy): number {
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

function spawnMote(state: GameState, stage: StageDefinition, spawn: Spawn): Mote {
  const radius = spawn.radius ?? WORLD.pondRadius + 34;
  const x = WORLD.cx + Math.cos(spawn.angle) * radius;
  const y = WORLD.cy + Math.sin(spawn.angle) * radius;
  const target = bloomPosition(stage.id, spawn.targetTime ?? spawn.at);
  const dx = target.x - x;
  const dy = target.y - y;
  const length = Math.hypot(dx, dy) || 1;
  const speed = spawn.targetTime ? length / Math.max(0.1, spawn.targetTime - spawn.at) : spawn.speed;
  return {
    id: state.nextId,
    x,
    y,
    vx: (dx / length) * speed,
    vy: (dy / length) * speed,
    touched: false,
    drift: spawn.drift ?? "steady",
    deflectedBy: [],
    target
  };
}

function angleWithin(angle: number, start: number, end: number): boolean {
  const normalized = Math.atan2(Math.sin(angle), Math.cos(angle));
  return normalized >= start && normalized <= end;
}

/** Returns true when the segment from a ripple origin to a mote crosses the reed arc. */
export function reedsBlock(ripple: Vec, target: Vec): boolean {
  const ox = ripple.x - WORLD.cx;
  const oy = ripple.y - WORLD.cy;
  const tx = target.x - WORLD.cx;
  const ty = target.y - WORLD.cy;
  const dx = tx - ox;
  const dy = ty - oy;
  const a = dx * dx + dy * dy;
  const b = 2 * (ox * dx + oy * dy);
  const c = ox * ox + oy * oy - REED_BELT.radius * REED_BELT.radius;
  const discriminant = b * b - 4 * a * c;
  if (a === 0 || discriminant < 0) return false;
  const root = Math.sqrt(discriminant);
  for (const t of [(-b - root) / (2 * a), (-b + root) / (2 * a)]) {
    if (t <= 0 || t >= 1) continue;
    const x = ox + dx * t;
    const y = oy + dy * t;
    if (angleWithin(Math.atan2(y, x), REED_BELT.startAngle, REED_BELT.endAngle)) return true;
  }
  return false;
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
  const stage = STAGES[state.stageId];
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
  const bloom = bloomPosition(state.stageId, nextTime);
  while (spawned < stage.spawns.length && stage.spawns[spawned].at <= nextTime) {
    const mote = spawnMote({ ...state, nextId }, stage, stage.spawns[spawned]);
    motes.push(mote);
    nextId += 1;
    spawned += 1;
  }

  const ripples = state.ripples
    .map((ripple) => ({ ...ripple, radius: ripple.radius + 318 * dt, age: ripple.age + dt }))
    .filter((ripple) => ripple.radius < (stage.rippleRange ?? 330));

  let health = state.health;
  let score = state.score;
  const survivors: Mote[] = [];
  for (const mote of motes) {
    mote.x += mote.vx * dt;
    mote.y += mote.vy * dt;
    const reachingRipples = ripples.filter((ripple) => {
      if (mote.deflectedBy.includes(ripple.id)) return false;
      if (stage.reeds && reedsBlock(ripple, mote)) return false;
      const d = Math.hypot(mote.x - ripple.x, mote.y - ripple.y);
      return mote.drift === "heavy" ? d <= ripple.radius : Math.abs(d - ripple.radius) <= 12;
    });
    if (mote.drift === "heavy") {
      if (stage.resonance && reachingRipples.length >= 2) {
        const origin = reachingRipples.slice(0, 2).reduce((sum, ripple) => ({ x: sum.x + ripple.x / 2, y: sum.y + ripple.y / 2 }), { x: 0, y: 0 });
        const dx = mote.x - origin.x;
        const dy = mote.y - origin.y;
        const d = Math.hypot(dx, dy) || 1;
        mote.deflectedBy.push(...reachingRipples.map((ripple) => ripple.id));
        mote.touched = true;
        mote.vx = (dx / d) * 238;
        mote.vy = (dy / d) * 238;
      }
    } else {
      const ripple = reachingRipples[0];
      if (ripple) {
        const dx = mote.x - ripple.x;
        const dy = mote.y - ripple.y;
        const d = Math.hypot(dx, dy) || 1;
        mote.deflectedBy.push(ripple.id);
        mote.touched = true;
        mote.vx = (dx / d) * 238;
        mote.vy = (dy / d) * 238;
      }
    }
    const bloomDistance = distance(mote.x, mote.y, bloom.x, bloom.y);
    const centerDistance = distance(mote.x, mote.y);
    if (bloomDistance <= 34) {
      health -= 1;
    } else if (mote.touched && centerDistance > WORLD.pondRadius + 44) {
      score += 1;
    } else {
      survivors.push(mote);
    }
  }

  const time = nextTime;
  const mode: Mode = health <= 0 ? "lost" : time >= stage.duration ? "won" : "playing";
  return { ...state, mode, time, health: Math.max(0, health), charges, recharge, score, player, bloom, motes: survivors, ripples, spawned, nextId };
}

export function simulate(
  seconds: number,
  strategy: (state: GameState) => { input: Input; pulse: boolean },
  stageId: StageId = "first-rain"
): GameState {
  let state = createGame(stageId);
  const steps = Math.ceil(seconds * 60);
  for (let i = 0; i < steps && state.mode === "playing"; i += 1) {
    const action = strategy(state);
    if (action.pulse) state = emitRipple(state);
    state = tick(state, action.input, 1 / 60);
  }
  return state;
}
