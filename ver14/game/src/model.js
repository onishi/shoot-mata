export const WIDTH = 960;
export const HEIGHT = 540;
export const HARBOR_END = 180;
export const STREET_END = 205;
export const UNDERFLOW_END = 230;
export const CONVOY_END = 249;
export const STAGE_SECONDS = 276;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export const ROUTE_EVENTS = [
  [4, "survivor", -0.35], [8, "driftwood", 0.30], [12, "survivor", 0.28],
  [16, "gate", -0.18], [20, "driftwood", -0.48], [24, "survivor", 0.50],
  [28, "concrete", 0.05], [33, "survivor", -0.20], [38, "driftwood", 0.36],
  [43, "gate", 0.12], [48, "survivor", -0.50], [53, "concrete", 0.25],
  [58, "prioritySurvivor", -0.30, { choice: "pier-a", route: "FAMILY", passengers: 3 }],
  [58, "prioritySurvivor", 0.30, { choice: "pier-a", route: "DECKHAND", passengers: 1 }],
  [64, "driftwood", -0.40], [68, "gate", 0.28],
  [73, "forkBreak", -0.34, { choice: "channel-a", route: "BREAK" }],
  [73, "forkGate", 0.34, { choice: "channel-a", route: "BYPASS" }],
  [80, "survivor", 0.15], [85, "concrete", -0.35], [90, "driftwood", 0.42],
  [95, "prioritySurvivor", 0.32, { choice: "pier-b", route: "MEDICS", passengers: 2 }],
  [95, "prioritySurvivor", -0.32, { choice: "pier-b", route: "WATCHMAN", passengers: 1 }],
  [102, "gate", -0.25],
  [108, "forkBreak", 0.35, { choice: "channel-b", route: "BREAK" }],
  [108, "forkGate", -0.35, { choice: "channel-b", route: "BYPASS" }],
  [115, "survivor", -0.45], [120, "driftwood", 0.10],
  [126, "prioritySurvivor", -0.30, { choice: "pier-c", route: "CHILDREN", passengers: 4 }],
  [126, "prioritySurvivor", 0.30, { choice: "pier-c", route: "SKIPPER", passengers: 1 }],
  [133, "concrete", 0.40], [139, "gate", 0],
  [145, "forkBreak", -0.35, { choice: "channel-c", route: "BREAK" }],
  [145, "forkGate", 0.35, { choice: "channel-c", route: "BYPASS" }],
  [152, "survivor", 0.38], [157, "driftwood", -0.32], [163, "gate", 0.25],
  [169, "prioritySurvivor", 0.30, { choice: "pier-d", route: "EVAC TEAM", passengers: 3 }],
  [169, "prioritySurvivor", -0.30, { choice: "pier-d", route: "RADIO CREW", passengers: 2 }],
  [175, "concrete", -0.10],
  [187.5, "routeSurvivor", -0.28, { choice: "market", route: "MARKET" }],
  [187.5, "routeSurvivor", 0.28, { choice: "market", route: "ARCADE" }],
  [189, "concrete", -0.20], [192, "survivor", 0.12],
  [195, "driftwood", -0.52], [198, "driftwood", 0.48], [201, "survivor", -0.40],
  [201.8, "routeSurvivor", -0.26, { choice: "station", route: "CLINIC" }],
  [201.8, "routeSurvivor", 0.26, { choice: "station", route: "STATION" }],
  [204, "gate", 0],
  [207, "lowCeiling", 0], [209.5, "tunnelSurvivor", -0.24, { layer: "deep", route: "DIVE TEAM" }],
  [212, "intake", 0.32], [214.5, "tunnelSurvivor", 0.24, { layer: "surface", route: "AIR POCKET" }],
  [217, "lowCeiling", 0], [219.5, "tunnelSurvivor", 0.18, { layer: "deep", route: "VALVE CREW" }],
  [222, "intake", -0.30], [224, "gate", 0.22],
  [226.5, "tunnelSurvivor", -0.25, { choice: "floodway", layer: "surface", route: "UPPER CREW" }],
  [226.5, "tunnelSurvivor", 0.25, { choice: "floodway", layer: "deep", route: "LOWER CREW" }],
  [231.2, "containerFall", -0.28, { tide: "low", warning: "HANGING STACK" }],
  [234.4, "containerFall", 0.30, { tide: "high", warning: "SUNKEN STACK" }],
  [237.6, "survivor", -0.18],
  [238.5, "containerFall", -0.34, { tide: "high", warning: "SUNKEN STACK" }],
  [241.7, "containerFall", 0.32, { tide: "low", warning: "HANGING STACK" }],
  [244.0, "containerFall", 0, { tide: "high", warning: "FINAL STACK" }],
  [252.4, "wallGate", -0.54, { side: "left", control: "surface", warning: "LIFT WEST GATE" }],
  [257.0, "wallGate", 0.54, { side: "right", control: "dive", warning: "DROP EAST GATE" }],
  [261.6, "wallGate", -0.50, { side: "left", control: "dive", warning: "DROP WEST GATE" }],
  [266.2, "wallGate", 0.50, { side: "right", control: "surface", warning: "LIFT EAST GATE" }],
  [271.0, "wallGate", -0.46, { side: "left", control: "surface", warning: "FINAL FLOODLOCK" }]
];

export function routeProfile(time) {
  if (time >= HARBOR_END && time < STREET_END) {
    const phase = (time - HARBOR_END) / 25;
    return {
      center: Math.sin(phase * Math.PI * 2) * 0.27,
      halfWidth: 0.47 - Math.sin(phase * Math.PI) * 0.035,
      current: Math.sin(phase * Math.PI * 4 + 0.65) * 0.34
    };
  }
  if (time >= STREET_END && time < UNDERFLOW_END) {
    const phase = (time - STREET_END) / 25;
    return {
      center: Math.sin(phase * Math.PI * 3) * 0.11,
      halfWidth: 0.54 - Math.sin(phase * Math.PI) * 0.025,
      current: Math.sin(phase * Math.PI * 2 + 2.4) * -0.12
    };
  }
  if (time >= CONVOY_END) {
    const phase = (time - CONVOY_END) / 27;
    return {
      center: Math.sin(phase * Math.PI * 2.5) * 0.08,
      halfWidth: 0.60 - Math.sin(phase * Math.PI) * 0.035,
      current: Math.sin(phase * Math.PI * 5) * 0.09
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
    harborPriorities: [], harborRoutes: [],
    depth: 0, depthV: 0, maxDepth: 0, surfacedAfterDive: false, underflowRescues: [],
    tideLevel: 0.5, tideTarget: "low", escortActive: false, escortX: 0,
    escortIntegrity: 3, containerClears: [], tideSwitches: 0,
    stormLevel: 0, wallRideSide: null, wallRideTime: 0, wallGateClears: [], gateControl: null
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
  if (time >= CONVOY_END) return 4;
  if (time >= UNDERFLOW_END) return 3;
  if (time >= STREET_END) return 2;
  if (time >= HARBOR_END) return 1;
  return 0;
}

export function activateSurge(state) {
  if (state.mode !== "playing" || state.cooldown > 0 || state.surge < 0.34) return false;
  state.surge -= 0.34;
  state.surgeTime = 0.56;
  state.cooldown = 0.72;
  if (state.section === 4) {
    const leftDistance = Math.abs(state.boatX - (state.routeCenter - state.routeHalfWidth));
    const rightDistance = Math.abs(state.boatX - (state.routeCenter + state.routeHalfWidth));
    if (Math.min(leftDistance, rightDistance) <= 0.18) {
      state.wallRideSide = leftDistance < rightDistance ? "left" : "right";
      state.wallRideTime = 1.35;
    }
  }
  state.effects.push({ type: "surge", x: state.boatX, life: 0.58, max: 0.58 });
  return true;
}

function resolveEntity(state, entity) {
  const distance = Math.abs(entity.x - state.boatX);
  const protectedByWake = state.surgeTime > 0;
  if (entity.type === "survivor" || entity.type === "prioritySurvivor" || entity.type === "routeSurvivor" || entity.type === "tunnelSurvivor") {
    const layerReady = entity.type !== "tunnelSurvivor" || (entity.layer === "deep" ? state.depth >= 0.58 : state.depth <= 0.34);
    if (distance < (protectedByWake ? 0.31 : 0.12) && layerReady) {
      const passengers = entity.passengers ?? 1;
      state.rescued += passengers;
      state.combo += 1;
      state.score += 1000 * state.combo * passengers;
      state.surge = clamp(state.surge + 0.22, 0, 1);
      state.message = entity.type === "tunnelSurvivor" ? `${entity.route} RESCUED` : state.combo > 1 ? `RESCUE CHAIN ×${state.combo}` : "RESCUE!";
      state.messageTime = 1.2;
      state.effects.push({ type: "rescue", x: entity.x, targetX: state.boatX, life: 0.9, max: 0.9 });
      if (entity.type === "tunnelSurvivor") state.underflowRescues.push({ route: entity.route, layer: entity.layer, time: state.time });
      if (entity.type === "prioritySurvivor") state.harborPriorities.push({ route: entity.route, passengers, time: state.time });
      if (entity.choice) {
        if (entity.type !== "prioritySurvivor") state.routeChoices.push({ choice: entity.choice, route: entity.route, time: state.time });
        for (const alternative of state.entities) {
          if (alternative !== entity && alternative.choice === entity.choice && !alternative.hit) alternative.hit = true;
        }
        state.message = entity.type === "prioritySurvivor" ? `${entity.route} PRIORITY — ${passengers} SAVED` : `${entity.route} ROUTE — RESCUE!`;
      }
    } else {
      state.combo = 0;
      state.message = entity.type === "tunnelSurvivor" && !layerReady ? (entity.layer === "deep" ? "DIVE TO REACH THEM" : "SURFACE TO REACH THEM") : "SIGNAL LOST";
      state.messageTime = 0.8;
    }
  } else if (entity.type === "forkBreak" || entity.type === "forkGate") {
    const breakRoute = entity.type === "forkBreak";
    const routeReady = distance < 0.20 && (!breakRoute || protectedByWake);
    if (routeReady) {
      state.harborRoutes.push({ route: entity.route, time: state.time });
      state.score += breakRoute ? 1200 : 450;
      state.surge = clamp(state.surge + (breakRoute ? 0.08 : 0.28), 0, 1);
      state.message = breakRoute ? "DEBRIS LINE SHATTERED" : "SAFE CHANNEL — +CHARGE";
      state.messageTime = 1.2;
      state.effects.push({ type: breakRoute ? "break" : "gateOpen", x: entity.x, life: 0.7, max: 0.7 });
      for (const alternative of state.entities) {
        if (alternative !== entity && alternative.choice === entity.choice && !alternative.hit) alternative.hit = true;
      }
    } else if (distance < 0.20 && breakRoute) {
      state.integrity -= 1;
      state.combo = 0;
      state.shake = 0.45;
      state.message = "SURGE REQUIRED TO BREAK THROUGH";
      state.messageTime = 1.1;
      state.effects.push({ type: "hit", x: state.boatX, life: 0.65, max: 0.65 });
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
  } else if (entity.type === "wallGate") {
    const edge = state.routeCenter + (entity.side === "left" ? -state.routeHalfWidth : state.routeHalfWidth);
    const sideReady = Math.abs(state.boatX - edge) <= 0.17;
    const rideReady = state.wallRideSide === entity.side && state.wallRideTime > 0;
    const controlReady = state.gateControl === entity.control;
    if (sideReady && rideReady && controlReady) {
      state.wallGateClears.push({ side: entity.side, control: entity.control, time: state.time });
      state.score += 1200;
      state.surge = clamp(state.surge + 0.18, 0, 1);
      state.stormLevel = Math.max(0, state.stormLevel - 0.16);
      state.message = `${entity.side.toUpperCase()} FLOODGATE OPEN`;
      state.effects.push({ type: "gateOpen", x: entity.x, life: 0.9, max: 0.9 });
    } else {
      state.integrity -= 1;
      state.combo = 0;
      state.shake = 0.65;
      state.stormLevel = clamp(state.stormLevel + 0.18, 0, 1);
      state.message = !rideReady ? `SURGE-RIDE ${entity.side.toUpperCase()} WALL` : `${entity.control === "surface" ? "UP" : "DOWN"} LEVER REQUIRED`;
      state.effects.push({ type: "hit", x: state.boatX, life: 0.75, max: 0.75 });
    }
    state.messageTime = 1.3;
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
  if (state.section === 4) {
    state.gateControl = input.surface ? "surface" : input.dive ? "dive" : null;
    state.stormLevel = clamp(state.stormLevel + dt * 0.014, 0, 1);
    state.wallRideTime = Math.max(0, state.wallRideTime - dt);
    if (state.wallRideTime <= 0) state.wallRideSide = null;
  } else {
    state.gateControl = null;
    state.wallRideSide = null;
    state.wallRideTime = 0;
  }
  state.surgeTime = Math.max(0, state.surgeTime - dt);
  state.cooldown = Math.max(0, state.cooldown - dt);
  state.surge = clamp(state.surge + dt * 0.028, 0, 1);
  state.messageTime = Math.max(0, state.messageTime - dt);
  state.shake = Math.max(0, state.shake - dt);
  const nextSection = sectionFor(state.time);
  if (nextSection !== state.section) {
    state.section = nextSection;
    state.message = ["", "FLOODED ARCADE", "UNDERFLOW — DIVE", "CONTAINER CONVOY", "STORMWALL — RIDE THE FACE"][nextSection];
    state.messageTime = 2.2;
    if (nextSection === 3) {
      state.escortActive = true;
      state.escortX = state.boatX;
      state.tideTarget = "low";
    }
    if (nextSection === 4) state.escortActive = false;
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
    state.message = "STORMWALL SECURED";
  }
  return state;
}
