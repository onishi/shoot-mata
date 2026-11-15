export const WIDTH = 960;
export const HEIGHT = 540;
export const STAGE_SECONDS = 94;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export const ROUTE_EVENTS = [
  [4, "survivor", -0.35], [7, "driftwood", 0.30], [10, "survivor", 0.28],
  [13, "gate", -0.18], [16, "driftwood", -0.48], [19, "survivor", 0.50],
  [22, "concrete", 0.05], [25, "survivor", -0.20], [28, "driftwood", 0.36],
  [31, "gate", 0.12],
  [32.5, "routeSurvivor", -0.28, { choice: "market", route: "MARKET" }],
  [32.5, "routeSurvivor", 0.28, { choice: "market", route: "ARCADE" }],
  [34, "concrete", -0.20], [37, "survivor", 0.12],
  [40, "driftwood", -0.52], [43, "driftwood", 0.48], [46, "survivor", -0.40],
  [46.8, "routeSurvivor", -0.26, { choice: "station", route: "CLINIC" }],
  [46.8, "routeSurvivor", 0.26, { choice: "station", route: "STATION" }],
  [49, "gate", 0], [52, "concrete", 0.38], [55, "survivor", 0.22],
  [58, "driftwood", -0.22], [61, "survivor", -0.56], [64, "gate", 0.34],
  [67, "concrete", -0.12], [70, "driftwood", 0.50], [73, "survivor", 0.04],
  [76, "bargeLeft", -0.34], [79, "bargeRight", 0.34], [82, "survivor", -0.18],
  [85, "bargeLeft", -0.46], [87, "bargeRight", 0.46], [89, "gate", 0]
];

export function routeProfile(time) {
  if (time < 25 || time >= 50) return { center: 0, halfWidth: 0.72, current: 0 };
  const phase = (time - 25) / 25;
  return {
    center: Math.sin(phase * Math.PI * 2) * 0.27,
    halfWidth: 0.47 - Math.sin(phase * Math.PI) * 0.035,
    current: Math.sin(phase * Math.PI * 4 + 0.65) * 0.34
  };
}

export function createGame() {
  return {
    mode: "title", time: 0, boatX: 0, boatV: 0, integrity: 3, rescued: 0,
    score: 0, combo: 0, surge: 1, surgeTime: 0, cooldown: 0, spawned: 0,
    entities: [], effects: [], shake: 0, section: 0, message: "", messageTime: 0,
    routeCenter: 0, routeHalfWidth: 0.72, crosscurrent: 0, routeChoices: []
  };
}

export function startGame(state) {
  Object.assign(state, createGame(), { mode: "playing", message: "BREAK THE TIDE", messageTime: 2.2 });
  return state;
}

function spawnScheduled(state) {
  while (state.spawned < ROUTE_EVENTS.length && ROUTE_EVENTS[state.spawned][0] <= state.time) {
    const [time, type, laneX, metadata = {}] = ROUTE_EVENTS[state.spawned++];
    const profile = routeProfile(time + 3.2);
    const x = clamp(profile.center + laneX, profile.center - profile.halfWidth * 0.82, profile.center + profile.halfWidth * 0.82);
    state.entities.push({ id: state.spawned, type, x, laneX, z: 1, hit: false, born: time, ...metadata });
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
  if (entity.type === "survivor" || entity.type === "routeSurvivor") {
    if (distance < (protectedByWake ? 0.31 : 0.12)) {
      state.rescued += 1;
      state.combo += 1;
      state.score += 1000 * state.combo;
      state.surge = clamp(state.surge + 0.22, 0, 1);
      state.message = state.combo > 1 ? `RESCUE CHAIN ×${state.combo}` : "RESCUE!";
      state.messageTime = 1.2;
      state.effects.push({ type: "rescue", x: entity.x, targetX: state.boatX, life: 0.9, max: 0.9 });
      if (entity.choice) {
        state.routeChoices.push({ choice: entity.choice, route: entity.route, time: state.time });
        for (const alternative of state.entities) {
          if (alternative !== entity && alternative.choice === entity.choice && !alternative.hit) alternative.hit = true;
        }
        state.message = `${entity.route} ROUTE — RESCUE!`;
      }
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
  const profile = routeProfile(state.time);
  state.routeCenter = profile.center;
  state.routeHalfWidth = profile.halfWidth;
  state.crosscurrent = profile.current;
  const steering = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  state.boatV += steering * 3.7 * dt;
  state.boatV += state.crosscurrent * dt;
  state.boatV *= Math.pow(0.08, dt);
  const leftEdge = state.routeCenter - state.routeHalfWidth;
  const rightEdge = state.routeCenter + state.routeHalfWidth;
  state.boatX = clamp(state.boatX + state.boatV * dt, leftEdge, rightEdge);
  if (state.boatX <= leftEdge + 0.001 || state.boatX >= rightEdge - 0.001) state.boatV *= -0.3;
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
