import { automaticCombatCommand } from "../browser/automatic-playthrough.mjs";
import { STAGE_01_ORBITAL_WRECK } from "../content/stages/stage-01-orbital-wreck.mjs";
import { STAGE_02_CLOUD_REFINERY } from "../content/stages/stage-02-cloud-refinery.mjs";
import { STAGE_03_LIVING_ARK } from "../content/stages/stage-03-living-ark.mjs";
import { STAGE_04_STELLAR_FURNACE } from "../content/stages/stage-04-stellar-furnace.mjs";
import { createStageSimulation, stepStageSimulation } from "./stage-simulation.mjs";

const STAGES = Object.freeze([
  STAGE_01_ORBITAL_WRECK,
  STAGE_02_CLOUD_REFINERY,
  STAGE_03_LIVING_ARK,
  STAGE_04_STELLAR_FURNACE,
]);
const AUDIT_SEEDS = Object.freeze([20261008, 20261015, 20261021]);

function contentPressure(stage, cumulativeMechanics) {
  const enemyTypes = new Map(stage.enemyTypes.map((enemy) => [enemy.id, enemy]));
  const enemyCount = stage.waves.reduce((total, wave) => total + wave.count, 0);
  const enemyHitPoints = stage.waves.reduce((total, wave) => (
    total + wave.count * enemyTypes.get(wave.enemyTypeId).hitPoints
  ), 0);
  const bossHitPoints = stage.boss.phases.reduce((total, phase) => total + phase.hitPoints, 0);
  const mechanics = new Set([
    ...stage.enemyTypes.map(({ behaviorId }) => `enemy:${behaviorId}`),
    ...stage.hazards.map(({ behaviorId }) => `hazard:${behaviorId}`),
    ...stage.boss.phases.map(({ behaviorId }) => `boss:${behaviorId}`),
  ]);
  for (const mechanic of mechanics) cumulativeMechanics.add(mechanic);
  return Object.freeze({
    durationTicks: stage.durationTicks,
    enemyCount,
    enemyHitPoints,
    bossHitPoints,
    totalHostileHitPoints: enemyHitPoints + bossHitPoints,
    stageMechanics: mechanics.size,
    cumulativeMechanics: cumulativeMechanics.size,
  });
}

function runStage(stage, seed) {
  const simulation = createStageSimulation(stage, { seed });
  let bossEnteredTick = null;
  let bossDefeatedTick = null;
  let coreLosses = 0;
  let lifeLosses = 0;
  const hitReasons = {};
  while (simulation.status === "playing") {
    stepStageSimulation(simulation, stage, automaticCombatCommand(simulation));
    for (const event of simulation.events) {
      if (event.type === "boss-entered") bossEnteredTick = event.tick;
      if (event.type === "boss-defeated") bossDefeatedTick = event.tick;
      if (event.type === "player-hit") {
        if (event.lostCore === null) lifeLosses += 1;
        else coreLosses += 1;
        hitReasons[event.reason] = (hitReasons[event.reason] ?? 0) + 1;
      }
    }
  }
  return Object.freeze({
    seed,
    status: simulation.status,
    clearTick: simulation.tick,
    score: simulation.score,
    hitsTaken: simulation.hitsTaken,
    coreLosses,
    lifeLosses,
    bossTicks: bossEnteredTick === null || bossDefeatedTick === null
      ? null : bossDefeatedTick - bossEnteredTick,
    hitReasons: Object.freeze(hitReasons),
  });
}

function isStrictlyIncreasing(values) {
  return values.slice(1).every((value, index) => value > values[index]);
}

function finalStageCoverage(stage) {
  const entries = new Set(stage.dropTables.flatMap(({ entries }) => entries.map(({ itemId }) => itemId)));
  const behaviors = new Set([
    ...stage.enemyTypes.map(({ behaviorId }) => behaviorId),
    ...stage.hazards.map(({ behaviorId }) => behaviorId),
    ...stage.boss.phases.map(({ behaviorId }) => behaviorId),
  ]);
  return Object.freeze({
    coreColors: ["core-red", "core-blue", "core-yellow"].filter((itemId) => entries.has(itemId)),
    requiredBehaviors: [
      "heat-armored", "solar-rammer", "omni-turret",
      "periodic-heatwave", "destruction-safe-zone",
      "boss-thermal-shell", "boss-overload-ram", "boss-omni-flare",
    ].filter((behaviorId) => behaviors.has(behaviorId)),
  });
}

export function auditStageDifficulty() {
  const cumulativeMechanics = new Set();
  const stages = STAGES.map((stage) => Object.freeze({
    stageId: stage.id,
    pressure: contentPressure(stage, cumulativeMechanics),
    runs: Object.freeze(AUDIT_SEEDS.map((seed) => runStage(stage, seed))),
  }));
  const violations = [];
  for (const stage of stages) {
    for (const run of stage.runs) {
      if (run.status !== "cleared") violations.push({ stageId: stage.stageId, seed: run.seed, status: run.status });
    }
  }
  for (const key of ["durationTicks", "enemyCount", "totalHostileHitPoints", "cumulativeMechanics"]) {
    if (!isStrictlyIncreasing(stages.map(({ pressure }) => pressure[key]))) {
      violations.push({ metric: key, reason: "not-strictly-increasing" });
    }
  }
  const finale = finalStageCoverage(STAGE_04_STELLAR_FURNACE);
  if (finale.coreColors.length !== 3 || finale.requiredBehaviors.length !== 8) {
    violations.push({ stageId: STAGE_04_STELLAR_FURNACE.id, reason: "finale-coverage-incomplete" });
  }
  return Object.freeze({
    seeds: AUDIT_SEEDS,
    inputPolicy: "automaticCombatCommand; same policy implementation with stage hazard branches",
    stages: Object.freeze(stages),
    finale,
    violations: Object.freeze(violations),
  });
}
