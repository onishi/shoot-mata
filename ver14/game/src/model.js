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
  [49, "gate", 0],
  [52, "lowCeiling", 0], [54.5, "tunnelSurvivor", -0.24, { layer: "deep", route: "DIVE TEAM" }],
  [57, "intake", 0.32], [59.5, "tunnelSurvivor", 0.24, { layer: "surface", route: "AIR POCKET" }],
  [62, "lowCeiling", 0], [64.5, "tunnelSurvivor", 0.18, { layer: "deep", route: "VALVE CREW" }],
  [67, "intake", -0.30], [69, "gate", 0.22],
  [71.5, "tunnelSurvivor", -0.25, { choice: "floodway", layer: "surface", route: "UPPER CREW" }],
  [71.5, "tunnelSurvivor", 0.25, { choice: "floodway", layer: "deep", route: "LOWER CREW" }],
  [76.2, "containerFall", -0.28, { tide: "low", warning: "HANGING STACK" }],
  [79.4, "containerFall", 0.30, { tide: "high", warning: "SUNKEN STACK" }],
  [82.6, "survivor", -0.18],
  [83.5, "containerFall", -0.34, { tide: "high", warning: "SUNKEN STACK" }],
  [86.7, "containerFall", 0.32, { tide: "low", warning: "HANGING STACK" }],
  [89.0, "containerFall", 0, { tide: "high", warning: "FINAL STACK" }]
];

export function routeProfile(time) {
  if (time >= 25 && time < 50) {
    const phase = (time - 25) / 25;
    return {
      center: Math.sin(phase * Math.PI * 2) * 0.27,
      halfWidth: 0.47 - Math.sin(phase * Math.PI) * 0.035,
      current: Math.sin(phase * Math.PI * 4 + 0.65) * 0.34
    };
  }
  if (time >= 50 && time < 75) {
    const phase = (time - 50) / 25;
    return {
      center: Math.sin(phase * Math.PI * 3) * 0.11,
      halfWidth: 0.54 - Math.sin(phase * Math.PI) * 0.025,
      current: Math.sin(phase * Math.PI * 2 + 2.4) * -0.12
    };
  }
  return { center: 0, halfWidth: 0.72, current: 0 };
}

export function createGame() {
  return {
    mode: "title", time: 0, boatX: 0, boatV: 0, integrity: 3, rescued: 0,
    score: 0, combo: 0, surge: 1, surgeTime: 0, cooldown: 0, spawned: 0,
    entities: [], effects: [], shake: 0, section: 0, message: "", messageTime: 0,
    routeCenter: 0, routeHalfWidth: 0.72, crosscurrent: 0, routeChoices: [],
    depth: 0, depthV: 0, maxDepth: 0, surfacedAfterDive: false, underflowRescues: [],
    tideLevel: 0.5, tideTarget: "low", escortActive: false, escortX: 0,
    escortIntegrity: 3, containerClears: [], tideSwitches: 0
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
  if (entity.type === "survivor" || entity.type === "routeSurvivor" || entity.type === "tunnelSurvivor") {
    const layerReady = entity.type !== "tunnelSurvivor" || (entity.layer === "deep" ? state.depth >= 0.58 : state.depth <= 0.34);
    if (distance < (protectedByWake ? 0.31 : 0.12) && layerReady) {
      state.rescued += 1;
      state.combo += 1;
      state.score += 1000 * state.combo;
      state.surge = clamp(state.surge + 0.22, 0, 1);
      state.message = entity.type === "tunnelSurvivor" ? `${entity.route} RESCUED` : state.combo > 1 ? `RESCUE CHAIN ×${state.combo}` : "RESCUE!";
      state.messageTime = 1.2;
      state.effects.push({ type: "rescue", x: entity.x, targetX: state.boatX, life: 0.9, max: 0.9 });
      if (entity.type === "tunnelSurvivor") state.underflowRescues.push({ route: entity.route, layer: entity.layer, time: state.time });
      if (entity.choice) {
        state.routeChoices.push({ choice: entity.choice, route: entity.route, time: state.time });
        for (const alternative of state.entities) {
          if (alternative !== entity && alternative.choice === entity.choice && !alternative.hit) alternative.hit = true;
        }
        state.message = `${entity.route} ROUTE — RESCUE!`;
      }
    } else {
      state.combo = 0;
      state.message = entity.type === "tunnelSurvivor" && !layerReady ? (entity.layer === "deep" ? "DIVE TO REACH THEM" : "SURFACE TO REACH THEM") : "SIGNAL LOST";
      state.messageTime = 0.8;
    }
  } else if (entity.type === "gate") {
    if (distance < 0.24) {
      state.score += 500;
      state.surge = clamp(state.surge + 0.3, 0, 1);
      state.message = "CURRENT GATE +CHARGE";
      state.messageTime = 1;
    }
  } else if (entity.type === "lowCeiling" || entity.type === "intake") {
    const safe = entity.type === "lowCeiling" ? state.depth >= 0.58 : state.depth <= 0.38;
    if (safe) {
      state.score += 450;
      state.surge = clamp(state.surge + 0.10, 0, 1);
      state.message = entity.type === "lowCeiling" ? "DIVE CLEAR" : "SURFACE CLEAR";
      state.messageTime = 0.8;
    } else {
      state.integrity -= 1;
      state.combo = 0;
      state.shake = 0.45;
      state.message = entity.type === "lowCeiling" ? "CEILING STRIKE" : "INTAKE STRIKE";
      state.messageTime = 1.1;
      state.effects.push({ type: "hit", x: state.boatX, life: 0.65, max: 0.65 });
    }
  } else if (entity.type === "containerFall") {
    const tideReady = entity.tide === "high" ? state.tideLevel >= 0.62 : state.tideLevel <= 0.38;
    const formationReady = Math.abs(state.boatX - state.escortX) <= 0.38;
    if (tideReady && formationReady) {
      state.score += 900;
      state.surge = clamp(state.surge + 0.14, 0, 1);
      state.containerClears.push({ tide: entity.tide, time: state.time });
      state.message = `${entity.tide.toUpperCase()} WATER — CONVOY CLEAR`;
      state.effects.push({ type: "containerClear", x: entity.x, life: 0.75, max: 0.75 });
    } else {
      state.escortIntegrity -= 1;
      state.combo = 0;
      state.shake = 0.55;
      state.message = tideReady ? "FERRY OUT OF FORMATION" : `${entity.tide.toUpperCase()} WATER REQUIRED`;
      state.effects.push({ type: "escortHit", x: state.escortX, life: 0.75, max: 0.75 });
    }
    state.messageTime = 1.2;
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
  if (state.section === 2) {
    const depthForce = input.dive ? 3.4 : input.surface ? -4.2 : -1.25;
    state.depthV += depthForce * dt;
    state.depthV *= Math.pow(0.035, dt);
    state.depth = clamp(state.depth + state.depthV * dt, 0, 1);
    if (state.depth === 0 || state.depth === 1) state.depthV *= -0.12;
    state.maxDepth = Math.max(state.maxDepth, state.depth);
    if (state.maxDepth >= 0.65 && state.depth <= 0.32) state.surfacedAfterDive = true;
  } else {
    state.depth = Math.max(0, state.depth - dt * 2.4);
    state.depthV = 0;
  }
  if (state.section === 3) {
    const requestedTide = input.surface ? "high" : input.dive ? "low" : state.tideTarget;
    if (requestedTide !== state.tideTarget) state.tideSwitches += 1;
    state.tideTarget = requestedTide;
    const targetLevel = requestedTide === "high" ? 1 : 0;
    state.tideLevel += clamp(targetLevel - state.tideLevel, -dt * 0.78, dt * 0.78);
    state.escortX += clamp(state.boatX - state.escortX, -dt * 0.42, dt * 0.42);
  }
  state.surgeTime = Math.max(0, state.surgeTime - dt);
  state.cooldown = Math.max(0, state.cooldown - dt);
  state.surge = clamp(state.surge + dt * 0.028, 0, 1);
  state.messageTime = Math.max(0, state.messageTime - dt);
  state.shake = Math.max(0, state.shake - dt);
  const nextSection = sectionFor(state.time);
  if (nextSection !== state.section) {
    state.section = nextSection;
    state.message = ["", "FLOODED ARCADE", "UNDERFLOW — DIVE", "CONTAINER CONVOY"][nextSection];
    state.messageTime = 2.2;
    if (nextSection === 3) {
      state.escortActive = true;
      state.escortX = state.boatX;
      state.tideTarget = "low";
    }
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
  if (state.integrity <= 0 || state.escortIntegrity <= 0) {
    state.mode = "gameover";
    state.message = state.escortIntegrity <= 0 ? "RESCUE FERRY LOST" : "SWALLOWED BY THE SURGE";
  } else if (state.time >= STAGE_SECONDS) {
    state.mode = "cleared";
    state.score += state.integrity * 2000 + state.rescued * 500;
    state.message = "HARBOR LINE SECURED";
  }
  return state;
}
