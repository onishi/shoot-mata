export const WIDTH = 960;
export const HEIGHT = 540;
export const STAGE_SECONDS = 94;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export const ROUTE_EVENTS = [
  [4, "survivor", -0.35], [7, "driftwood", 0.30], [10, "survivor", 0.28],
  [13, "gate", -0.18], [16, "driftwood", -0.48], [19, "survivor", 0.50],
  [22, "concrete", 0.05], [25, "survivor", -0.20], [28, "driftwood", 0.36],
  [31, "gate", 0.28], [34, "concrete", -0.34], [37, "survivor", 0.12],
  [40, "driftwood", -0.52], [43, "driftwood", 0.48], [46, "survivor", -0.40],
  [49, "gate", 0], [52, "concrete", 0.38], [55, "survivor", 0.22],
  [58, "driftwood", -0.22], [61, "survivor", -0.56], [64, "gate", 0.34],
  [67, "concrete", -0.12], [70, "driftwood", 0.50], [73, "survivor", 0.04],
  [76, "bargeLeft", -0.34], [79, "bargeRight", 0.34], [82, "survivor", -0.18],
  [85, "bargeLeft", -0.46], [87, "bargeRight", 0.46], [89, "gate", 0]
];

export function createGame() {
  return {
    mode: "title", time: 0, boatX: 0, boatV: 0, integrity: 3, rescued: 0,
    score: 0, combo: 0, surge: 1, surgeTime: 0, cooldown: 0, spawned: 0,
    entities: [], effects: [], shake: 0, section: 0, message: "", messageTime: 0
  };
}

export function startGame(state) {
  Object.assign(state, createGame(), { mode: "playing", message: "BREAK THE TIDE", messageTime: 2.2 });
  return state;
}

function spawnScheduled(state) {
  while (state.spawned < ROUTE_EVENTS.length && ROUTE_EVENTS[state.spawned][0] <= state.time) {
    const [time, type, x] = ROUTE_EVENTS[state.spawned++];
    state.entities.push({ id: state.spawned, type, x, z: 1, hit: false, born: time });
  }
}

function sectionFor(time) {
  if (time >= 75) return 3;
  if (time >= 50) return 2;
  if (time >= 25) return 1;
  return 0;
}

export function activateSurge(state) {
  if (state.mode !== "playing" || state.cooldown > 0 || state.surge < 0.34) return false;
  state.surge -= 0.34;
  state.surgeTime = 0.56;
  state.cooldown = 0.72;
  state.effects.push({ type: "surge", x: state.boatX, life: 0.58, max: 0.58 });
  return true;
}

function resolveEntity(state, entity) {
  const distance = Math.abs(entity.x - state.boatX);
  const protectedByWake = state.surgeTime > 0;
  if (entity.type === "survivor") {
    if (distance < (protectedByWake ? 0.31 : 0.12)) {
      state.rescued += 1;
      state.combo += 1;
      state.score += 1000 * state.combo;
      state.surge = clamp(state.surge + 0.22, 0, 1);
      state.message = state.combo > 1 ? `RESCUE CHAIN ×${state.combo}` : "RESCUE!";
      state.messageTime = 1.2;
      state.effects.push({ type: "rescue", x: entity.x, life: 0.75, max: 0.75 });
    } else {
      state.combo = 0;
      state.message = "SIGNAL LOST";
      state.messageTime = 0.8;
    }
  } else if (entity.type === "gate") {
    if (distance < 0.24) {
      state.score += 500;
      state.surge = clamp(state.surge + 0.3, 0, 1);
      state.message = "CURRENT GATE +CHARGE";
      state.messageTime = 1;
    }
  } else {
    const width = entity.type.startsWith("barge") ? 0.30 : 0.20;
    if (distance < width) {
      if (protectedByWake && entity.type === "driftwood") {
        state.score += 350;
        state.shake = 0.18;
        state.effects.push({ type: "break", x: entity.x, life: 0.55, max: 0.55 });
      } else {
        state.integrity -= 1;
        state.combo = 0;
        state.shake = 0.45;
        state.boatV += entity.x < state.boatX ? 0.75 : -0.75;
        state.message = "HULL HIT";
        state.messageTime = 1.1;
        state.effects.push({ type: "hit", x: state.boatX, life: 0.65, max: 0.65 });
      }
    } else if (distance < width + 0.10) {
      state.score += 150;
      state.surge = clamp(state.surge + 0.08, 0, 1);
    }
  }
  entity.hit = true;
}

export function updateGame(state, input, dt) {
  if (state.mode !== "playing") return state;
  dt = Math.min(dt, 0.05);
  state.time += dt;
  const steering = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  state.boatV += steering * 3.7 * dt;
  state.boatV *= Math.pow(0.08, dt);
  state.boatX = clamp(state.boatX + state.boatV * dt, -0.72, 0.72);
  if (Math.abs(state.boatX) >= 0.719) state.boatV *= -0.3;
  state.surgeTime = Math.max(0, state.surgeTime - dt);
  state.cooldown = Math.max(0, state.cooldown - dt);
  state.surge = clamp(state.surge + dt * 0.028, 0, 1);
  state.messageTime = Math.max(0, state.messageTime - dt);
  state.shake = Math.max(0, state.shake - dt);
  const nextSection = sectionFor(state.time);
  if (nextSection !== state.section) {
    state.section = nextSection;
    state.message = ["", "FLOODED ARCADE", "CROSSCURRENT", "BREAKWATER BARGE"][nextSection];
    state.messageTime = 2.2;
  }
  spawnScheduled(state);
  const pace = 0.28 + state.section * 0.018;
  for (const entity of state.entities) {
    entity.z -= dt * pace;
    if (!entity.hit && entity.z <= 0.10) resolveEntity(state, entity);
  }
  state.entities = state.entities.filter(entity => entity.z > -0.12);
  for (const effect of state.effects) effect.life -= dt;
  state.effects = state.effects.filter(effect => effect.life > 0);
  if (state.integrity <= 0) {
    state.mode = "gameover";
    state.message = "SWALLOWED BY THE SURGE";
  } else if (state.time >= STAGE_SECONDS) {
    state.mode = "cleared";
    state.score += state.integrity * 2000 + state.rescued * 500;
    state.message = "HARBOR LINE SECURED";
  }
  return state;
}
