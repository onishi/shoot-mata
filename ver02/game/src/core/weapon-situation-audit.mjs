import { STAGE_01_ORBITAL_WRECK } from "../content/stages/stage-01-orbital-wreck.mjs";
import { createStageSimulation, stepStageSimulation } from "./stage-simulation.mjs";

const WEAPONS = Object.freeze(["red", "blue", "yellow"]);
const AUDIT_SEED = 20261024;

function createTarget(id, { x, y, hitPoints, behaviorId }) {
  return {
    id,
    typeId: "weapon-audit-target",
    assetId: "enemy-stg01-collector",
    behaviorId,
    x,
    y,
    originY: y,
    hitPoints,
    maximumHitPoints: hitPoints,
    score: 0,
    collisionRadius: 0.02,
    dropItemId: "red",
    ageTicks: 0,
    attackTicks: 0,
    hitTicks: 0,
  };
}

function createAuditSimulation(weapon) {
  const simulation = createStageSimulation(STAGE_01_ORBITAL_WRECK, {
    seed: AUDIT_SEED,
    lives: 99,
    coreQueue: [weapon, weapon, weapon],
  });
  simulation.nextSpawnIndex = simulation.schedule.spawns.length;
  return simulation;
}

function summarize(simulation, destroyed, escaped, remainingHitPoints) {
  return Object.freeze({ ticks: simulation.tick, destroyed, escaped, remainingHitPoints });
}

function runDurableTarget(weapon) {
  const simulation = createAuditSimulation(weapon);
  simulation.boss = {
    id: "durable-target",
    assetId: "boss-stg01-warden",
    x: 0.82,
    y: 0.5,
    phaseIndex: 0,
    phases: [{
      id: "durable-target-phase",
      behaviorId: "boss-thermal-shell",
      hitPoints: 200,
      maximumHitPoints: 200,
    }],
    defeated: false,
    ageTicks: 0,
    attackTicks: 0,
    hitTicks: 0,
    phaseTicks: 0,
  };
  while (simulation.tick < 400 && !simulation.boss.defeated) {
    simulation.player.invulnerabilityTicks = 999;
    simulation.boss.ageTicks = -1;
    stepStageSimulation(simulation, STAGE_01_ORBITAL_WRECK, { fire: true });
  }
  return summarize(
    simulation,
    0,
    0,
    simulation.boss.defeated ? 0 : Math.max(0, simulation.boss.phases[0].hitPoints),
  );
}

function runEnemyScenario(weapon, targets, tickLimit) {
  const simulation = createAuditSimulation(weapon);
  simulation.enemies = targets;
  let destroyed = 0;
  let escaped = 0;
  while (simulation.tick < tickLimit && simulation.enemies.length > 0) {
    simulation.player.invulnerabilityTicks = 999;
    stepStageSimulation(simulation, STAGE_01_ORBITAL_WRECK, { fire: true });
    destroyed += simulation.events.filter(({ type }) => type === "enemy-destroyed").length;
    escaped += simulation.events.filter(({ type }) => type === "enemy-escaped").length;
  }
  return summarize(
    simulation,
    destroyed,
    escaped,
    simulation.enemies.reduce((total, enemy) => total + Math.max(0, enemy.hitPoints), 0),
  );
}

function runSwarm(weapon) {
  return runEnemyScenario(
    weapon,
    [0.45, 0.475, 0.5, 0.525, 0.55].map((y, index) => createTarget(`swarm-${index}`, {
      x: 0.82,
      y,
      hitPoints: 18,
      behaviorId: "drift-left",
    })),
    220,
  );
}

function runCoveredDeadAngle(weapon) {
  return runEnemyScenario(weapon, [createTarget("covered-dead-angle", {
    x: 0.82,
    y: 0.22,
    hitPoints: 60,
    behaviorId: "cover-turret",
  })], 220);
}

const SCENARIOS = Object.freeze([
  Object.freeze({
    id: "single-durable-target",
    expectedWinner: "red",
    description: "centered 200 HP target at long range",
    run: runDurableTarget,
  }),
  Object.freeze({
    id: "close-formation-swarm",
    expectedWinner: "blue",
    description: "five 18 HP targets spread across adjacent lanes",
    run: runSwarm,
  }),
  Object.freeze({
    id: "covered-dead-angle",
    expectedWinner: "yellow",
    description: "60 HP cover turret outside the direct firing lane",
    run: runCoveredDeadAngle,
  }),
]);

function rank([leftWeapon, left], [rightWeapon, right]) {
  return right.destroyed - left.destroyed
    || left.escaped - right.escaped
    || left.remainingHitPoints - right.remainingHitPoints
    || left.ticks - right.ticks
    || WEAPONS.indexOf(leftWeapon) - WEAPONS.indexOf(rightWeapon);
}

export function auditWeaponSituations() {
  const scenarios = SCENARIOS.map(({ id, expectedWinner, description, run }) => {
    const results = Object.fromEntries(WEAPONS.map((weapon) => [weapon, run(weapon)]));
    const winner = Object.entries(results).sort(rank)[0][0];
    return Object.freeze({ id, description, expectedWinner, winner, results: Object.freeze(results) });
  });
  return Object.freeze({
    seed: AUDIT_SEED,
    loadout: Object.freeze({ level: 3, cores: 3 }),
    input: Object.freeze({ moveX: 0, moveY: 0, fire: true }),
    scenarios: Object.freeze(scenarios),
    violations: Object.freeze(scenarios
      .filter(({ winner, expectedWinner }) => winner !== expectedWinner)
      .map(({ id, winner, expectedWinner }) => ({ id, winner, expectedWinner }))),
  });
}
