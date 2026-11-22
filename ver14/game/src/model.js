export const WIDTH = 960;
export const HEIGHT = 540;
export const HARBOR_END = 180;
export const STREET_END = 360;
export const UNDERFLOW_END = 540;
export const CONVOY_END = 720;
export const BOSS_START = 900;
export const STAGE_SECONDS = 1020;

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
  [198, "driftwood", 0.48], [204, "survivor", -0.40], [210, "gate", 0.22],
  [218, "concrete", -0.34, { requiresRoute: "MARKET" }],
  [218, "driftwood", 0.34, { requiresRoute: "ARCADE" }],
  [225, "survivor", 0.22, { requiresRoute: "MARKET" }],
  [225, "survivor", -0.22, { requiresRoute: "ARCADE" }],
  [232, "driftwood", -0.42, { requiresRoute: "MARKET" }],
  [232, "concrete", 0.42, { requiresRoute: "ARCADE" }],
  [240, "gate", 0.28, { requiresRoute: "MARKET" }],
  [240, "gate", -0.28, { requiresRoute: "ARCADE" }],
  [248, "concrete", 0.08, { requiresRoute: "MARKET" }],
  [248, "driftwood", -0.08, { requiresRoute: "ARCADE" }],
  [256, "survivor", -0.34], [262, "driftwood", 0.36],
  [268, "routeSurvivor", -0.27, { choice: "station", route: "CLINIC" }],
  [268, "routeSurvivor", 0.27, { choice: "station", route: "STATION" }],
  [276, "gate", -0.30, { requiresRoute: "CLINIC" }],
  [276, "driftwood", 0.30, { requiresRoute: "STATION" }],
  [284, "concrete", 0.34, { requiresRoute: "CLINIC" }],
  [284, "concrete", -0.34, { requiresRoute: "STATION" }],
  [292, "survivor", -0.18, { requiresRoute: "CLINIC" }],
  [292, "survivor", 0.18, { requiresRoute: "STATION" }],
  [300, "driftwood", 0.38, { requiresRoute: "CLINIC" }],
  [300, "gate", -0.38, { requiresRoute: "STATION" }],
  [308, "concrete", -0.08, { requiresRoute: "CLINIC" }],
  [308, "driftwood", 0.08, { requiresRoute: "STATION" }],
  [316, "survivor", 0.32], [322, "gate", -0.20], [329, "driftwood", -0.36],
  [336, "survivor", -0.28, { requiresRoute: "CLINIC" }],
  [336, "survivor", 0.28, { requiresRoute: "STATION" }],
  [343, "concrete", 0.30], [350, "driftwood", -0.25], [357, "gate", 0],
  [362, "lowCeiling", 0], [364.5, "tunnelSurvivor", -0.24, { layer: "deep", route: "DIVE TEAM" }],
  [367, "intake", 0.32], [369.5, "tunnelSurvivor", 0.24, { layer: "surface", route: "AIR POCKET" }],
  [372, "lowCeiling", 0], [374.5, "tunnelSurvivor", 0.18, { layer: "deep", route: "VALVE CREW" }],
  [377, "intake", -0.30], [379, "gate", 0.22],
  [381.5, "tunnelSurvivor", -0.25, { choice: "floodway", layer: "surface", route: "UPPER CREW" }],
  [381.5, "tunnelSurvivor", 0.25, { choice: "floodway", layer: "deep", route: "LOWER CREW" }],
  [390, "tunnelValve", -0.30, { choice: "sluice-a", route: "DRAIN", warning: "DRAIN LOWER WORKS" }],
  [390, "tunnelValve", 0.30, { choice: "sluice-a", route: "FLOOD", warning: "FLOOD UPPER SPILLWAY" }],
  [400, "lowCeiling", -0.18, { requiresValveRoute: "DRAIN" }],
  [400, "intake", 0.18, { requiresValveRoute: "FLOOD" }],
  [408, "tunnelSurvivor", 0.28, { layer: "deep", route: "SUMP CREW", requiresValveRoute: "DRAIN" }],
  [408, "tunnelSurvivor", -0.28, { layer: "surface", route: "SPILLWAY CREW", requiresValveRoute: "FLOOD" }],
  [417, "intake", -0.30, { requiresValveRoute: "DRAIN" }],
  [417, "lowCeiling", 0.30, { requiresValveRoute: "FLOOD" }],
  [426, "gate", 0.24], [434, "tunnelSurvivor", -0.22, { layer: "surface", route: "GAUGE TEAM" }],
  [442, "lowCeiling", 0.18, { requiresValveRoute: "DRAIN" }],
  [442, "intake", -0.18, { requiresValveRoute: "FLOOD" }],
  [450, "tunnelValve", 0.30, { choice: "sluice-b", route: "RELIEF", warning: "OPEN RELIEF SHAFT" }],
  [450, "tunnelValve", -0.30, { choice: "sluice-b", route: "BYPASS", warning: "SEAL BYPASS SHAFT" }],
  [460, "tunnelSurvivor", -0.26, { layer: "surface", route: "RELIEF CREW", requiresValveRoute: "RELIEF" }],
  [460, "tunnelSurvivor", 0.26, { layer: "deep", route: "BYPASS CREW", requiresValveRoute: "BYPASS" }],
  [469, "intake", 0.28, { requiresValveRoute: "RELIEF" }],
  [469, "lowCeiling", -0.28, { requiresValveRoute: "BYPASS" }],
  [478, "gate", -0.20], [486, "lowCeiling", 0.26],
  [494, "tunnelSurvivor", 0.22, { layer: "deep", route: "TURBINE CREW" }],
  [502, "intake", -0.28], [510, "tunnelSurvivor", -0.22, { layer: "surface", route: "VENT CREW" }],
  [518, "lowCeiling", -0.24, { requiresValveRoute: "RELIEF" }],
  [518, "intake", 0.24, { requiresValveRoute: "BYPASS" }],
  [527, "gate", 0.18], [535, "tunnelSurvivor", 0, { layer: "surface", route: "OUTFLOW WATCH" }],
  [542, "containerFall", -0.28, { tide: "low", warning: "HANGING STACK" }],
  [552, "containerFall", 0.30, { tide: "high", warning: "SUNKEN STACK" }],
  [563, "containerFall", -0.12, { tide: "low", warning: "CRANE SHADOW" }],
  [574, "convoyPickup", -0.30, { choice: "manifest-a", route: "HOSPITAL", passengers: 4 }],
  [574, "convoyPickup", 0.30, { choice: "manifest-a", route: "ENGINEERS", passengers: 2 }],
  [586, "containerFall", 0.34, { tide: "high", warning: "FLOODED BERTH" }],
  [598, "convoyFork", -0.32, { choice: "basin-a", route: "SERVICE", tide: "low", warning: "LOW SERVICE CUT" }],
  [598, "convoyFork", 0.32, { choice: "basin-a", route: "LOCK", tide: "high", warning: "HIGH LOCK" }],
  [611, "containerFall", -0.30, { tide: "low", warning: "NARROW GANTRY", requiresConvoyRoute: "SERVICE" }],
  [611, "containerFall", 0.30, { tide: "high", warning: "LOCK DEBRIS", requiresConvoyRoute: "LOCK" }],
  [624, "containerFall", 0.18, { tide: "high", warning: "LOOSE TWISTLOCK" }],
  [638, "containerFall", -0.34, { tide: "low", warning: "DROPPED BOOM" }],
  [651, "convoyPickup", 0.30, { choice: "manifest-b", route: "SHELTER", passengers: 5 }],
  [651, "convoyPickup", -0.30, { choice: "manifest-b", route: "TUG CREW", passengers: 2 }],
  [663, "containerFall", 0.32, { tide: "high", warning: "SINKING APRON" }],
  [676, "convoyFork", 0.32, { choice: "basin-b", route: "CANAL", tide: "high", warning: "HIGH CANAL" }],
  [676, "convoyFork", -0.32, { choice: "basin-b", route: "DOCK", tide: "low", warning: "LOW DRYDOCK" }],
  [689, "containerFall", 0.28, { tide: "high", warning: "CANAL CRANE", requiresConvoyRoute: "CANAL" }],
  [689, "containerFall", -0.28, { tide: "low", warning: "DOCK BRIDGE", requiresConvoyRoute: "DOCK" }],
  [701, "containerFall", -0.24, { tide: "low", warning: "HANGING STACK" }],
  [713, "containerFall", 0.18, { tide: "high", warning: "FINAL STACK" }],
  [727, "wallGate", -0.54, { side: "left", control: "surface", warning: "LIFT WEST GATE" }],
  [739, "wallGate", 0.54, { side: "right", control: "dive", warning: "DROP EAST GATE" }],
  [751, "wallGate", -0.50, { side: "left", control: "dive", warning: "DROP WEST GATE" }],
  [764, "stormFork", -0.50, { choice: "wall-a", route: "PUMPS", side: "left", control: "surface", warning: "PRIME WEST PUMPS" }],
  [764, "stormFork", 0.50, { choice: "wall-a", route: "BEACONS", side: "right", control: "dive", warning: "LIGHT EAST BEACONS" }],
  [778, "wallGate", -0.50, { side: "left", control: "surface", warning: "PUMP SPILL GATE", requiresStormRoute: "PUMPS" }],
  [778, "wallGate", 0.50, { side: "right", control: "dive", warning: "BEACON CUT GATE", requiresStormRoute: "BEACONS" }],
  [791, "wallGate", 0.48, { side: "right", control: "surface", warning: "LIFT RELIEF GATE" }],
  [805, "wallGate", -0.48, { side: "left", control: "dive", warning: "DROP BREAKER GATE" }],
  [819, "stormFork", -0.48, { choice: "wall-b", route: "RELIEF", side: "left", control: "dive", warning: "OPEN RELIEF SHAFT" }],
  [819, "stormFork", 0.48, { choice: "wall-b", route: "LOCKS", side: "right", control: "surface", warning: "SEAL INNER LOCKS" }],
  [833, "wallGate", -0.48, { side: "left", control: "surface", warning: "RELIEF CREST", requiresStormRoute: "RELIEF" }],
  [833, "wallGate", 0.48, { side: "right", control: "dive", warning: "LOCK CREST", requiresStormRoute: "LOCKS" }],
  [847, "wallGate", 0.46, { side: "right", control: "dive", warning: "DROP SURGE BAFFLE" }],
  [861, "wallGate", -0.46, { side: "left", control: "surface", warning: "LIFT SHELTER CUT" }],
  [875, "wallGate", 0.44, { side: "right", control: "surface", warning: "FINAL FLOODLOCK" }],
  [891, "stormShelter", 0, { warning: "SAFE BASIN 95" }],
  [908, "bossAnchor", -0.34, { side: "left", warning: "CUT PORT ANCHOR" }],
  [922, "bossAnchor", 0.34, { side: "right", warning: "CUT STARBOARD ANCHOR" }],
  [946, "bossHull", -0.50, { side: "left", warning: "RIDE PORT ARMOR" }],
  [960, "bossHull", 0.50, { side: "right", warning: "RIDE STARBOARD ARMOR" }],
  [974, "bossHull", -0.48, { side: "left", warning: "BREACH ENGINE SEAM" }],
  [990, "bossDrain", -0.24, { layer: "deep", warning: "DIVE: OPEN LOWER DRAIN" }],
  [1000, "bossDrain", 0.24, { layer: "surface", warning: "SURFACE: VENT UPPER LINE" }],
  [1010, "bossCore", 0, { warning: "SURGE THE FLOOD CORE" }]
];

function selectedRoute(routeChoices, choice) {
  if (typeof routeChoices === "string") return routeChoices;
  return routeChoices?.find(item => item.choice === choice)?.route ?? null;
}

export function routeProfile(time, routeChoices = []) {
  if (time >= HARBOR_END && time < STREET_END) {
    const elapsed = time - HARBOR_END;
    const district = selectedRoute(routeChoices, "market");
    const relay = selectedRoute(routeChoices, "station");
    if (elapsed < 32) {
      const phase = elapsed / 32;
      return {
        center: Math.sin(phase * Math.PI * 2) * 0.27,
        halfWidth: 0.47 - Math.sin(phase * Math.PI) * 0.035,
        current: Math.sin(phase * Math.PI * 4 + 0.65) * 0.34
      };
    }
    if (elapsed < 92) {
      const phase = (elapsed - 32) / 60;
      const market = district !== "ARCADE";
      return {
        center: (market ? -0.13 : 0.13) + Math.sin(phase * Math.PI * (market ? 5 : 2.5)) * (market ? 0.22 : 0.30),
        halfWidth: market ? 0.43 - Math.sin(phase * Math.PI * 3) * 0.035 : 0.51 - Math.sin(phase * Math.PI * 2) * 0.025,
        current: Math.sin(phase * Math.PI * (market ? 6 : 10) + 0.4) * (market ? 0.23 : 0.38)
      };
    }
    if (elapsed < 142) {
      const phase = (elapsed - 92) / 50;
      const clinic = relay !== "STATION";
      return {
        center: (clinic ? -0.10 : 0.10) + Math.sin(phase * Math.PI * (clinic ? 3 : 6)) * (clinic ? 0.18 : 0.25),
        halfWidth: clinic ? 0.45 : 0.50 - Math.sin(phase * Math.PI * 3) * 0.04,
        current: Math.sin(phase * Math.PI * (clinic ? 4 : 9) + 1.1) * (clinic ? 0.20 : 0.36)
      };
    }
    const phase = (elapsed - 142) / 38;
    return {
      center: Math.sin(phase * Math.PI * 3) * 0.16 * (relay === "STATION" ? -1 : 1),
      halfWidth: 0.48 + phase * 0.06,
      current: Math.sin(phase * Math.PI * 5) * 0.24 * (district === "ARCADE" ? -1 : 1)
    };
  }
  if (time >= STREET_END && time < UNDERFLOW_END) {
    const elapsed = time - STREET_END;
    const phase = elapsed / 180;
    const sluiceA = selectedRoute(routeChoices, "sluice-a");
    const sluiceB = selectedRoute(routeChoices, "sluice-b");
    const branchBias = sluiceA === "FLOOD" ? 1 : -1;
    const reliefBias = sluiceB === "BYPASS" ? -1 : 1;
    return {
      center: Math.sin(phase * Math.PI * 6) * 0.10 + (elapsed > 35 ? branchBias * 0.06 : 0) + (elapsed > 95 ? reliefBias * 0.04 : 0),
      halfWidth: 0.54 - Math.sin(phase * Math.PI * 3) * 0.035 - (sluiceA === "DRAIN" && elapsed > 35 && elapsed < 90 ? 0.045 : 0),
      current: Math.sin(phase * Math.PI * 9 + 2.4) * 0.13 + (elapsed > 35 ? branchBias * 0.06 : 0)
    };
  }
  if (time >= UNDERFLOW_END && time < CONVOY_END) {
    const elapsed = time - UNDERFLOW_END;
    const basinA = selectedRoute(routeChoices, "basin-a");
    const basinB = selectedRoute(routeChoices, "basin-b");
    const firstBias = basinA === "LOCK" ? 1 : basinA === "SERVICE" ? -1 : 0;
    const secondBias = basinB === "CANAL" ? 1 : basinB === "DOCK" ? -1 : 0;
    return {
      center: Math.sin(elapsed / 180 * Math.PI * 7) * 0.10 + (elapsed > 60 ? firstBias * 0.08 : 0) + (elapsed > 138 ? secondBias * 0.07 : 0),
      halfWidth: 0.60 - Math.sin(elapsed / 180 * Math.PI * 4) * 0.035 - (basinA === "SERVICE" && elapsed > 60 && elapsed < 105 ? 0.05 : 0),
      current: Math.sin(elapsed / 180 * Math.PI * 11 + 0.4) * 0.11 + (elapsed > 138 ? secondBias * 0.05 : 0)
    };
  }
  if (time >= BOSS_START) {
    const elapsed = time - BOSS_START;
    if (elapsed < 36) {
      return { center: Math.sin(elapsed / 36 * Math.PI) * 0.05, halfWidth: 0.66, current: Math.sin(elapsed * 0.42) * 0.08 };
    }
    if (elapsed < 78) {
      const phase = (elapsed - 36) / 42;
      return { center: Math.sin(phase * Math.PI * 3) * 0.12, halfWidth: 0.50, current: Math.sin(phase * Math.PI * 5) * 0.12 };
    }
    const phase = (elapsed - 78) / 42;
    return { center: Math.sin(phase * Math.PI * 4) * 0.08, halfWidth: 0.43, current: Math.sin(phase * Math.PI * 6) * 0.07 };
  }
  if (time >= CONVOY_END) {
    const elapsed = time - CONVOY_END;
    const phase = elapsed / 180;
    const wallA = selectedRoute(routeChoices, "wall-a");
    const wallB = selectedRoute(routeChoices, "wall-b");
    const firstBias = wallA === "BEACONS" ? 1 : wallA === "PUMPS" ? -1 : 0;
    const secondBias = wallB === "LOCKS" ? 1 : wallB === "RELIEF" ? -1 : 0;
    return {
      center: Math.sin(phase * Math.PI * 8) * 0.08 + (elapsed > 44 ? firstBias * 0.07 : 0) + (elapsed > 99 ? secondBias * 0.06 : 0),
      halfWidth: 0.54 - Math.sin(phase * Math.PI * 4) * 0.035 - (wallA === "PUMPS" && elapsed > 44 && elapsed < 98 ? 0.045 : 0),
      current: Math.sin(phase * Math.PI * 13) * 0.09 + (elapsed > 99 ? secondBias * 0.05 : 0)
    };
  }
  return { center: 0, halfWidth: 0.72, current: 0 };
}

export function createGame() {
  return {
    mode: "title", time: 0, boatX: 0, boatV: 0, integrity: 3, rescued: 0,
    score: 0, combo: 0, surge: 1, surgeTime: 0, cooldown: 0, spawned: 0,
    nearMisses: 0, nearMissChain: 0, bestNearMissChain: 0,
    harborRepairs: 0, trainingCue: null,
    entities: [], effects: [], shake: 0, section: 0, message: "", messageTime: 0,
    routeCenter: 0, routeHalfWidth: 0.72, crosscurrent: 0, routeChoices: [],
    harborPriorities: [], harborRoutes: [],
    depth: 0, depthV: 0, maxDepth: 0, surfacedAfterDive: false, underflowRescues: [], underflowValves: [], underflowWater: 0.5,
    tideLevel: 0.5, tideTarget: "low", escortActive: false, escortX: 0,
    escortIntegrity: 3, escortLoad: 0, escortPickups: [], convoyRoutes: [], escortRallyTime: 0,
    containerClears: [], tideSwitches: 0,
    stormLevel: 0, wallRideSide: null, wallRideTime: 0, wallGateClears: [], stormRoutes: [], gateControl: null,
    escortSecured: false,
    bossPhase: 0, bossAnchors: [], bossHullBreaches: [], bossDrains: [], bossDefeated: false,
    bossCollapseTime: 0, bossCollapseStage: -1
  };
}

export function startGame(state) {
  Object.assign(state, createGame(), { mode: "playing", message: "BREAK THE TIDE", messageTime: 2.2 });
  return state;
}

function spawnScheduled(state) {
  while (state.spawned < ROUTE_EVENTS.length && ROUTE_EVENTS[state.spawned][0] <= state.time) {
    const [time, type, laneX, metadata = {}] = ROUTE_EVENTS[state.spawned++];
    if (metadata.requiresRoute && !state.routeChoices.some(choice => choice.route === metadata.requiresRoute)) continue;
    if (metadata.requiresValveRoute && !state.underflowValves.some(choice => choice.route === metadata.requiresValveRoute)) continue;
    if (metadata.requiresConvoyRoute && !state.convoyRoutes.some(choice => choice.route === metadata.requiresConvoyRoute)) continue;
    if (metadata.requiresStormRoute && !state.stormRoutes.some(choice => choice.route === metadata.requiresStormRoute)) continue;
    const profile = routeProfile(time + 3.2, state.routeChoices);
    const x = clamp(profile.center + laneX, profile.center - profile.halfWidth * 0.82, profile.center + profile.halfWidth * 0.82);
    state.entities.push({ id: state.spawned, type, x, laneX, z: 1, hit: false, born: time, ...metadata });
  }
}

function sectionFor(time) {
  if (time >= BOSS_START) return 5;
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
  if (state.section === 3) {
    state.escortRallyTime = 1.5;
    state.message = "FERRY RALLY — HOLD FORMATION";
    state.messageTime = 1;
  }
  if (state.section === 4) {
    state.escortRallyTime = 1.5;
    const leftDistance = Math.abs(state.boatX - (state.routeCenter - state.routeHalfWidth));
    const rightDistance = Math.abs(state.boatX - (state.routeCenter + state.routeHalfWidth));
    if (Math.min(leftDistance, rightDistance) <= 0.18) {
      state.wallRideSide = leftDistance < rightDistance ? "left" : "right";
      state.wallRideTime = 1.35;
    }
  }
  if (state.section === 5 && state.bossPhase === 2) {
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
  } else if (entity.type === "tunnelValve") {
    if (distance < 0.18 && state.depth >= 0.58) {
      state.underflowValves.push({ choice: entity.choice, route: entity.route, time: state.time });
      state.routeChoices.push({ choice: entity.choice, route: entity.route, time: state.time });
      state.score += 1400;
      state.surge = clamp(state.surge + 0.22, 0, 1);
      state.message = `${entity.route} VALVE LOCKED`;
      state.messageTime = 1.4;
      state.effects.push({ type: "gateOpen", x: entity.x, life: 0.9, max: 0.9 });
      for (const alternative of state.entities) {
        if (alternative !== entity && alternative.choice === entity.choice && !alternative.hit) alternative.hit = true;
      }
    } else {
      state.message = state.depth < 0.58 ? "DIVE TO OPERATE VALVE" : "VALVE MISSED";
      state.messageTime = 1.1;
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
      if (state.time <= 90 && state.integrity < 3) {
        state.integrity += 1;
        state.harborRepairs += 1;
        state.message = "CURRENT GATE — HULL PATCH";
        state.effects.push({ type: "repair", x: entity.x, life: 0.8, max: 0.8 });
      } else {
        state.message = "CURRENT GATE +CHARGE";
      }
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
    const formationLimit = clamp(0.38 - state.escortLoad * 0.018 + (state.escortRallyTime > 0 ? 0.12 : 0), 0.22, 0.5);
    const formationReady = Math.abs(state.boatX - state.escortX) <= formationLimit;
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
  } else if (entity.type === "convoyPickup") {
    const formationReady = Math.abs(state.boatX - state.escortX) <= 0.30;
    if (distance < 0.18 && formationReady) {
      state.escortLoad += entity.passengers;
      state.rescued += entity.passengers;
      state.escortPickups.push({ route: entity.route, passengers: entity.passengers, time: state.time });
      state.score += entity.passengers * 1200;
      state.message = `${entity.route} ABOARD — LOAD ${state.escortLoad}`;
      state.effects.push({ type: "rescue", x: entity.x, targetX: state.escortX, life: 0.9, max: 0.9 });
      for (const alternative of state.entities) if (alternative !== entity && alternative.choice === entity.choice && !alternative.hit) alternative.hit = true;
    } else {
      state.message = formationReady ? "FERRY MISSED EVAC PIER" : "CLOSE FORMATION FOR TRANSFER";
    }
    state.messageTime = 1.2;
  } else if (entity.type === "convoyFork") {
    const tideReady = entity.tide === "high" ? state.tideLevel >= 0.62 : state.tideLevel <= 0.38;
    const formationReady = Math.abs(state.boatX - state.escortX) <= 0.30;
    if (distance < 0.20 && tideReady && formationReady) {
      state.convoyRoutes.push({ choice: entity.choice, route: entity.route, tide: entity.tide, time: state.time });
      state.routeChoices.push({ choice: entity.choice, route: entity.route, time: state.time });
      state.score += 1600;
      state.message = `${entity.route} ROUTE — CONVOY COMMITTED`;
      state.effects.push({ type: "gateOpen", x: entity.x, life: 0.9, max: 0.9 });
      for (const alternative of state.entities) if (alternative !== entity && alternative.choice === entity.choice && !alternative.hit) alternative.hit = true;
    } else {
      state.escortIntegrity -= 1;
      state.shake = 0.55;
      state.message = !tideReady ? `${entity.tide.toUpperCase()} WATER FOR ${entity.route}` : "FERRY OUT OF FORMATION";
    }
    state.messageTime = 1.2;
  } else if (entity.type === "wallGate" || entity.type === "stormFork") {
    const edge = state.routeCenter + (entity.side === "left" ? -state.routeHalfWidth : state.routeHalfWidth);
    const sideReady = Math.abs(state.boatX - edge) <= 0.17;
    const rideReady = state.wallRideSide === entity.side && state.wallRideTime > 0;
    const controlReady = state.gateControl === entity.control;
    if (sideReady && rideReady && controlReady) {
      state.wallGateClears.push({ side: entity.side, control: entity.control, time: state.time });
      if (entity.type === "stormFork") {
        state.stormRoutes.push({ choice: entity.choice, route: entity.route, side: entity.side, time: state.time });
        state.routeChoices.push({ choice: entity.choice, route: entity.route, time: state.time });
        for (const alternative of state.entities) if (alternative !== entity && alternative.choice === entity.choice && !alternative.hit) alternative.hit = true;
      }
      state.score += 1200;
      state.surge = clamp(state.surge + 0.18, 0, 1);
      state.stormLevel = Math.max(0, state.stormLevel - 0.16);
      state.message = entity.type === "stormFork" ? `${entity.route} SYSTEM COMMITTED` : `${entity.side.toUpperCase()} FLOODGATE OPEN`;
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
  } else if (entity.type === "stormShelter") {
    const formationReady = Math.abs(state.boatX - state.escortX) <= 0.24;
    const systemsReady = state.stormRoutes.length === 2 && state.wallGateClears.length >= 11;
    if (distance < 0.30 && formationReady && systemsReady) {
      state.escortSecured = true;
      state.score += 5000 + state.escortLoad * 500;
      state.stormLevel = Math.max(0, state.stormLevel - 0.35);
      state.message = `FERRY SAFE — ${state.escortLoad} EVACUEES ASHORE`;
      state.effects.push({ type: "gateOpen", x: entity.x, life: 1.2, max: 1.2 });
    } else {
      state.escortIntegrity -= 1;
      state.message = !systemsReady ? "WALL SYSTEMS INCOMPLETE" : "CLOSE FORMATION FOR SAFE BASIN";
      state.effects.push({ type: "escortHit", x: state.escortX, life: 0.75, max: 0.75 });
    }
    state.messageTime = 1.5;
  } else if (entity.type === "bossAnchor") {
    if (distance < 0.20 && protectedByWake) {
      state.bossAnchors.push({ side: entity.side, time: state.time });
      state.score += 2400;
      state.surge = clamp(state.surge + 0.28, 0, 1);
      state.message = `${entity.side.toUpperCase()} ANCHOR SEVERED`;
      state.effects.push({ type: "break", x: entity.x, life: 0.9, max: 0.9 });
    } else {
      state.integrity -= 1;
      state.message = protectedByWake ? "STRIKE THE ANCHOR" : "SURGE TO CUT THE CHAIN";
      state.effects.push({ type: "hit", x: state.boatX, life: 0.75, max: 0.75 });
    }
    state.messageTime = 1.3;
  } else if (entity.type === "bossHull") {
    const edge = state.routeCenter + (entity.side === "left" ? -state.routeHalfWidth : state.routeHalfWidth);
    const ready = Math.abs(state.boatX - edge) <= 0.17 && state.wallRideSide === entity.side && state.wallRideTime > 0;
    if (ready && state.bossAnchors.length === 2) {
      state.bossHullBreaches.push({ side: entity.side, time: state.time });
      state.score += 2600;
      state.surge = clamp(state.surge + 0.24, 0, 1);
      state.message = `${entity.side.toUpperCase()} ARMOR TORN OPEN`;
      state.effects.push({ type: "gateOpen", x: entity.x, life: 1, max: 1 });
    } else {
      state.integrity -= 1;
      state.message = state.bossAnchors.length < 2 ? "CUT BOTH ANCHORS FIRST" : `SURGE-RIDE ${entity.side.toUpperCase()} HULL`;
      state.effects.push({ type: "hit", x: state.boatX, life: 0.75, max: 0.75 });
    }
    state.messageTime = 1.3;
  } else if (entity.type === "bossDrain") {
    const layerReady = entity.layer === "deep" ? state.depth >= 0.58 : state.depth <= 0.34;
    if (distance < 0.18 && layerReady && state.bossHullBreaches.length === 3) {
      state.bossDrains.push({ layer: entity.layer, time: state.time });
      state.score += 2200;
      state.surge = clamp(state.surge + 0.30, 0, 1);
      state.message = `${entity.layer.toUpperCase()} DRAIN OPEN`;
      state.effects.push({ type: "gateOpen", x: entity.x, life: 0.9, max: 0.9 });
    } else {
      state.integrity -= 1;
      state.message = entity.layer === "deep" ? "DIVE INTO LOWER DRAIN" : "SURFACE INTO UPPER VENT";
      state.effects.push({ type: "hit", x: state.boatX, life: 0.75, max: 0.75 });
    }
    state.messageTime = 1.2;
  } else if (entity.type === "bossCore") {
    const ready = distance < 0.22 && protectedByWake && state.bossDrains.length === 2;
    if (ready) {
      state.bossDefeated = true;
      state.bossCollapseTime = 0;
      state.bossCollapseStage = 0;
      state.score += 10000;
      state.stormLevel = 0;
      state.message = "LEVIATHAN FLOOD CORE SHATTERED";
      state.effects.push({ type: "break", x: entity.x, life: 1.4, max: 1.4 });
    } else {
      state.integrity -= 1;
      state.message = state.bossDrains.length < 2 ? "OPEN BOTH INTERNAL DRAINS" : "SURGE THE EXPOSED CORE";
      state.effects.push({ type: "hit", x: state.boatX, life: 0.9, max: 0.9 });
    }
    state.messageTime = 1.8;
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
        state.nearMissChain = 0;
        state.shake = 0.45;
        state.boatV += entity.x < state.boatX ? 0.75 : -0.75;
        state.message = "HULL HIT";
        state.messageTime = 1.1;
        state.effects.push({ type: "hit", x: state.boatX, life: 0.65, max: 0.65 });
      }
    } else if (distance < width + 0.10) {
      state.nearMisses += 1;
      state.nearMissChain += 1;
      state.bestNearMissChain = Math.max(state.bestNearMissChain, state.nearMissChain);
      const multiplier = Math.min(5, state.nearMissChain);
      state.score += 500 * multiplier;
      state.surge = clamp(state.surge + 0.08 + multiplier * 0.01, 0, 1);
      state.message = `WAKE SKIM ×${multiplier}`;
      state.messageTime = 0.9;
      state.effects.push({ type: "nearMiss", x: entity.x, side: entity.x < state.boatX ? -1 : 1, life: 0.55, max: 0.55 });
    }
  }
  entity.hit = true;
}

export function updateGame(state, input, dt) {
  if (state.mode !== "playing") return state;
  dt = Math.min(dt, 0.05);
  state.time += dt;
  const profile = routeProfile(state.time, state.routeChoices);
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
  if (state.section === 2 || (state.section === 5 && state.bossPhase === 3)) {
    const depthForce = input.dive ? 3.4 : input.surface ? -4.2 : -1.25;
    state.depthV += depthForce * dt;
    state.depthV *= Math.pow(0.035, dt);
    state.depth = clamp(state.depth + state.depthV * dt, 0, 1);
    if (state.depth === 0 || state.depth === 1) state.depthV *= -0.12;
    state.maxDepth = Math.max(state.maxDepth, state.depth);
    if (state.maxDepth >= 0.65 && state.depth <= 0.32) state.surfacedAfterDive = true;
    const sluiceA = state.underflowValves.find(choice => choice.choice === "sluice-a")?.route;
    const sluiceB = state.underflowValves.find(choice => choice.choice === "sluice-b")?.route;
    const waterTarget = (sluiceA === "FLOOD" ? 0.72 : sluiceA === "DRAIN" ? 0.28 : 0.5) + (sluiceB === "RELIEF" ? -0.12 : sluiceB === "BYPASS" ? 0.12 : 0);
    state.underflowWater += clamp(waterTarget - state.underflowWater, -dt * 0.18, dt * 0.18);
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
    const followRate = Math.max(0.20, 0.48 - state.escortLoad * 0.022) + (state.escortRallyTime > 0 ? 0.62 : 0);
    state.escortX += clamp(state.boatX - state.escortX, -dt * followRate, dt * followRate);
    state.escortRallyTime = Math.max(0, state.escortRallyTime - dt);
  }
  if (state.section === 4) {
    state.gateControl = input.surface ? "surface" : input.dive ? "dive" : null;
    state.stormLevel = clamp(state.stormLevel + dt * 0.006, 0, 1);
    const followRate = Math.max(0.18, 0.42 - state.escortLoad * 0.018) + (state.escortRallyTime > 0 ? 0.62 : 0);
    state.escortX += clamp(state.boatX - state.escortX, -dt * followRate, dt * followRate);
    state.escortRallyTime = Math.max(0, state.escortRallyTime - dt);
    state.wallRideTime = Math.max(0, state.wallRideTime - dt);
    if (state.wallRideTime <= 0) state.wallRideSide = null;
  } else if (!(state.section === 5 && state.bossPhase === 2)) {
    state.gateControl = null;
    state.wallRideSide = null;
    state.wallRideTime = 0;
  }
  if (state.section === 5) {
    const elapsed = state.time - BOSS_START;
    state.bossPhase = elapsed < 36 ? 1 : elapsed < 78 ? 2 : 3;
    if (state.bossPhase === 2) {
      state.wallRideTime = Math.max(0, state.wallRideTime - dt);
      if (state.wallRideTime <= 0) state.wallRideSide = null;
    }
  }
  state.surgeTime = Math.max(0, state.surgeTime - dt);
  state.cooldown = Math.max(0, state.cooldown - dt);
  state.surge = clamp(state.surge + dt * 0.028, 0, 1);
  state.messageTime = Math.max(0, state.messageTime - dt);
  state.shake = Math.max(0, state.shake - dt);
  const nextSection = sectionFor(state.time);
  if (nextSection !== state.section) {
    state.section = nextSection;
    state.message = ["", "FLOODED ARCADE", "UNDERFLOW — DIVE", "CONTAINER CONVOY", "STORMWALL — RIDE THE FACE", "LEVIATHAN BREAKER — CUT THE ANCHORS"][nextSection];
    state.messageTime = 2.2;
    if (nextSection === 3) {
      state.escortActive = true;
      state.escortX = state.boatX;
      state.tideTarget = "low";
    }
    if (nextSection === 4) {
      state.escortActive = true;
      state.escortX = state.boatX;
    }
  }
  spawnScheduled(state);
  const pace = 0.28 + Math.min(state.section, 4) * 0.018;
  for (const entity of state.entities) {
    entity.z -= dt * pace;
    if (!entity.hit && entity.z <= 0.10) resolveEntity(state, entity);
  }
  if (state.time <= 90) {
    const threat = state.entities
      .filter(entity => !entity.hit && (entity.type === "concrete" || entity.type === "driftwood") && entity.z >= 0.18 && entity.z <= 0.62)
      .sort((a, b) => a.z - b.z)[0];
    if (threat) {
      const leftRoom = threat.x - (state.routeCenter - state.routeHalfWidth);
      const rightRoom = state.routeCenter + state.routeHalfWidth - threat.x;
      state.trainingCue = {
        type: threat.type,
        direction: leftRoom > rightRoom ? "left" : "right",
        urgency: clamp((0.62 - threat.z) / 0.44, 0, 1)
      };
    } else {
      state.trainingCue = null;
    }
  } else {
    state.trainingCue = null;
  }
  state.entities = state.entities.filter(entity => entity.z > -0.12);
  for (const effect of state.effects) effect.life -= dt;
  state.effects = state.effects.filter(effect => effect.life > 0);
  if (state.bossDefeated) {
    state.bossCollapseTime += dt;
    const collapseStage = state.bossCollapseTime < 1.5 ? 0 : state.bossCollapseTime < 3.2 ? 1 : state.bossCollapseTime < 5.2 ? 2 : 3;
    if (collapseStage !== state.bossCollapseStage) {
      state.bossCollapseStage = collapseStage;
      state.message = ["LEVIATHAN FLOOD CORE SHATTERED", "FLOOD PRESSURE RELEASED", "BREAKER LOSING BUOYANCY", "RESCUE FERRY — BREAK AWAY"][collapseStage];
      state.messageTime = collapseStage === 3 ? 2.4 : 1.6;
      state.shake = collapseStage < 3 ? 0.34 : 0.12;
    }
  }
  if (state.integrity <= 0 || state.escortIntegrity <= 0) {
    state.mode = "gameover";
    state.message = state.escortIntegrity <= 0 ? "RESCUE FERRY LOST" : "SWALLOWED BY THE SURGE";
  } else if (state.time >= STAGE_SECONDS) {
    if (!state.escortSecured) {
      state.mode = "gameover";
      state.message = "SAFE BASIN MISSED";
      return state;
    }
    if (!state.bossDefeated) {
      state.mode = "gameover";
      state.message = "LEVIATHAN FLOOD CORE ACTIVE";
      return state;
    }
    if (state.bossCollapseTime < 6.8) return state;
    state.mode = "cleared";
    state.score += state.integrity * 2000 + state.rescued * 500;
    state.message = "LEVIATHAN BREAKER SUNK";
  }
  return state;
}
