import { writeFile } from "node:fs/promises";
import { activateSurge, createGame, missionTime, startGame, updateGame } from "../src/model.js";

const DT = 1 / 60;
const requiredTypes = new Set([
  "tunnelValve", "containerFall", "convoyFork", "wallGate", "stormFork",
  "stormShelter", "bossAnchor", "bossHull", "bossDrain", "bossCore"
]);
const rescueTypes = new Set(["survivor", "prioritySurvivor", "routeSurvivor", "tunnelSurvivor", "convoyPickup"]);
const chargeTypes = new Set(["gate", "forkGate"]);
const hazards = new Set(["concrete", "driftwood"]);

function activeEntities(state, range) {
  return state.entities
    .filter(entity => !entity.hit && entity.z > 0 && entity.z < range)
    .sort((a, b) => a.z - b.z);
}

function preferredAlternative(entities, strategy) {
  if (entities.length < 2 || !entities[0].choice) return entities[0];
  const siblings = entities.filter(entity => entity.choice === entities[0].choice && Math.abs(entity.z - entities[0].z) < 0.04);
  if (siblings.length < 2) return entities[0];
  if (strategy === "rescue") {
    const safeGate = siblings.find(entity => entity.type === "forkGate");
    return safeGate ?? siblings.sort((a, b) => (b.passengers ?? 0) - (a.passengers ?? 0))[0];
  }
  if (strategy === "direct") return siblings.sort((a, b) => Math.abs(a.x) - Math.abs(b.x))[0];
  return siblings.sort((a, b) => Math.abs(b.x) - Math.abs(a.x))[0];
}

function chooseEntity(state, strategy) {
  const range = strategy === "novice" ? 0.36 : 0.72;
  const entities = activeEntities(state, range);
  if (!entities.length) return null;
  // Policies may choose between simultaneous alternatives, but they may not
  // see through a nearer event. This keeps the audit honest: rescuing a later
  // signal cannot make the boat ignore concrete already under its bow.
  const nearest = entities[0];
  if (nearest.choice || requiredTypes.has(nearest.type) || rescueTypes.has(nearest.type)) {
    return preferredAlternative(entities, strategy);
  }
  return nearest;
}

function controlsFor(state, strategy) {
  const entity = chooseEntity(state, strategy);
  let targetX = state.routeCenter;
  let vertical = 0;
  let wantsSurge = false;

  if (entity) {
    const breakable = entity.type === "driftwood" || entity.type === "forkBreak";
    const optionalRescue = rescueTypes.has(entity.type);
    const cannotBreak = breakable && state.surgeTime <= 0 && (state.cooldown > 0 || state.surge < 0.34);
    const shouldAvoid = (strategy === "direct" && (optionalRescue || breakable || hazards.has(entity.type))) ||
      (strategy === "skim" && optionalRescue) ||
      (strategy === "rescue" && hazards.has(entity.type) && !breakable) || cannotBreak;
    if (strategy === "skim" && hazards.has(entity.type) && entity.type !== "driftwood") {
      const right = entity.x + 0.265;
      const left = entity.x - 0.265;
      targetX = right < state.routeCenter + state.routeHalfWidth ? right : left;
    } else if (shouldAvoid) {
      targetX = entity.x > state.routeCenter ? state.routeCenter - state.routeHalfWidth * 0.58 : state.routeCenter + state.routeHalfWidth * 0.58;
    } else {
      targetX = entity.x;
    }

    if (entity.type === "lowCeiling" || entity.type === "tunnelValve" || (entity.type === "tunnelSurvivor" && entity.layer === "deep") || (entity.type === "bossDrain" && entity.layer === "deep")) vertical = 1;
    if (entity.type === "intake" || (entity.type === "tunnelSurvivor" && entity.layer === "surface") || (entity.type === "bossDrain" && entity.layer === "surface")) vertical = -1;
    if ((entity.type === "containerFall" || entity.type === "convoyFork") && entity.z < 0.70) vertical = entity.tide === "low" ? 1 : -1;
    if ((entity.type === "wallGate" || entity.type === "stormFork") && entity.z < 0.70) {
      vertical = entity.control === "dive" ? 1 : -1;
      targetX = state.routeCenter + (entity.side === "left" ? -state.routeHalfWidth : state.routeHalfWidth);
      wantsSurge = entity.z < 0.35 && Math.abs(state.boatX - targetX) < 0.17;
    }
    if (entity.type === "bossHull" && entity.z < 0.70) {
      targetX = state.routeCenter + (entity.side === "left" ? -state.routeHalfWidth : state.routeHalfWidth);
      wantsSurge = entity.z < 0.35 && Math.abs(state.boatX - targetX) < 0.17;
    }
    if ((entity.type === "bossAnchor" || entity.type === "bossCore") && entity.z < 0.25) wantsSurge = true;
    if (breakable && !shouldAvoid && entity.z < 0.25) wantsSurge = true;
    if (optionalRescue && strategy === "rescue" && entity.z < 0.25) wantsSurge = true;
    if ((state.section === 3 || state.section === 4) && entity.z < 0.38 && Math.abs(state.boatX - state.escortX) > 0.10) wantsSurge = true;
  }

  if (wantsSurge && state.cooldown <= 0 && state.surge >= 0.34) activateSurge(state);
  const desiredV = Math.max(-1.1, Math.min(1.1, (targetX - state.boatX) * (strategy === "novice" ? 1.7 : 2.7)));
  const deltaV = desiredV - state.boatV;
  const deadzone = strategy === "novice" ? 0.24 : 0.10;
  return {
    left: deltaV < -deadzone,
    right: deltaV > deadzone,
    dive: vertical > 0,
    surface: vertical < 0
  };
}

function summarize(name, state) {
  return {
    strategy: name,
    outcome: state.mode,
    time: Number(state.time.toFixed(3)),
    missionTime: Number(missionTime(state).toFixed(3)),
    shortcutSeconds: state.shortcutSeconds,
    shortcuts: state.shortcuts.map(item => `${item.route}:${item.seconds}`),
    integrity: state.integrity,
    harborRepairs: state.harborRepairs,
    escortIntegrity: state.escortIntegrity,
    rescued: state.rescued,
    score: state.score,
    nearMisses: state.nearMisses,
    bestNearMissChain: state.bestNearMissChain,
    harborPriorities: state.harborPriorities.map(item => item.route),
    harborRoutes: state.harborRoutes.map(item => item.route),
    routeChoices: state.routeChoices.map(item => `${item.choice}:${item.route}`),
    underflowRescues: state.underflowRescues.map(item => `${item.route}:${item.layer}`),
    escortLoad: state.escortLoad,
    containerClears: state.containerClears.length,
    wallGateClears: state.wallGateClears.length,
    escortSecured: state.escortSecured,
    boss: {
      anchors: state.bossAnchors.length,
      hullBreaches: state.bossHullBreaches.length,
      drains: state.bossDrains.length,
      defeated: state.bossDefeated
    }
  };
}

function runStrategy(name) {
  const state = startGame(createGame());
  let frames = 0;
  while (state.mode === "playing" && frames < 70000) {
    updateGame(state, controlsFor(state, name), DT);
    frames += 1;
  }
  return summarize(name, state);
}

const runs = ["novice", "rescue", "direct", "skim"].map(runStrategy);
const audit = {
  generatedBy: "deterministic 60 Hz product-input policy audit",
  caveat: "This compares repeatable policies in the production model; browser rendering and human first-play timing remain separate gates.",
  runs
};
await writeFile(new URL("../../docs/m4-strategy-audit.json", import.meta.url), `${JSON.stringify(audit, null, 2)}\n`);
console.log(JSON.stringify(audit, null, 2));
