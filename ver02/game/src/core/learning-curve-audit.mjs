import { automaticCombatCommand } from "../browser/automatic-playthrough.mjs";
import { STAGE_01_ORBITAL_WRECK } from "../content/stages/stage-01-orbital-wreck.mjs";
import { STAGE_02_CLOUD_REFINERY } from "../content/stages/stage-02-cloud-refinery.mjs";
import { STAGE_03_LIVING_ARK } from "../content/stages/stage-03-living-ark.mjs";
import { STAGE_04_STELLAR_FURNACE } from "../content/stages/stage-04-stellar-furnace.mjs";
import {
  createStageSimulation,
  HAZARD_TELEGRAPH_TICKS,
  stepStageSimulation,
} from "./stage-simulation.mjs";

const STAGES = Object.freeze([
  STAGE_01_ORBITAL_WRECK,
  STAGE_02_CLOUD_REFINERY,
  STAGE_03_LIVING_ARK,
  STAGE_04_STELLAR_FURNACE,
]);
const AUDIT_SEEDS = Object.freeze([20261008, 20261015, 20261021]);
const MINIMUM_INTRODUCTION_GAP_TICKS = 90;

function sectionAt(stage, tick) {
  return stage.sections.find(({ startTick, endTick }) => tick >= startTick && tick < endTick)
    ?? stage.sections.at(-1);
}

function groupIntroductions(items) {
  const grouped = new Map();
  for (const item of items) {
    const group = grouped.get(item.startTick) ?? [];
    group.push(item);
    grouped.set(item.startTick, group);
  }
  return [...grouped.entries()]
    .sort(([left], [right]) => left - right)
    .map(([tick, entries]) => Object.freeze({ tick, entries: Object.freeze(entries) }));
}

function introductionPlan(stage) {
  const enemyTypes = new Map(stage.enemyTypes.map((enemy) => [enemy.id, enemy]));
  const firstEnemyWave = new Map();
  for (const wave of stage.waves) {
    const behaviorId = enemyTypes.get(wave.enemyTypeId).behaviorId;
    const current = firstEnemyWave.get(behaviorId);
    if (!current || wave.startTick < current.startTick) {
      firstEnemyWave.set(behaviorId, {
        kind: "enemy",
        behaviorId,
        startTick: wave.startTick,
        sectionId: wave.sectionId,
      });
    }
  }
  const enemies = groupIntroductions([...firstEnemyWave.values()]);
  const hazards = groupIntroductions(stage.hazards.map((hazard) => ({
    kind: "hazard",
    behaviorId: hazard.behaviorId,
    startTick: hazard.startTick,
    sectionId: hazard.sectionId,
  })));
  const all = [...enemies, ...hazards].sort((left, right) => left.tick - right.tick);
  return Object.freeze({ enemies: Object.freeze(enemies), hazards: Object.freeze(hazards), all: Object.freeze(all) });
}

function verticalBand(y) {
  if (y < 1 / 3) return "upper";
  if (y < 2 / 3) return "middle";
  return "lower";
}

function increment(record, key) {
  record[key] = (record[key] ?? 0) + 1;
}

function runStage(stage, seed) {
  const simulation = createStageSimulation(stage, { seed });
  const telegraphs = [];
  const hitsBySection = Object.fromEntries(stage.sections.map(({ id }) => [id, 0]));
  const hitsByVerticalBand = { upper: 0, middle: 0, lower: 0 };
  const weaponShots = {};
  const weaponBuilds = new Set();
  let exchanges = 0;
  while (simulation.status === "playing") {
    stepStageSimulation(simulation, stage, automaticCombatCommand(simulation));
    for (const event of simulation.events) {
      if (event.type === "hazard-telegraphed") {
        telegraphs.push({
          hazardId: event.hazardId,
          behaviorId: event.behaviorId,
          tick: event.tick,
          leadTicks: event.ticksUntilActive,
        });
      }
      if (event.type === "player-hit") {
        increment(hitsBySection, sectionAt(stage, event.tick).id);
        increment(hitsByVerticalBand, verticalBand(event.y));
      }
      if (event.type === "weapon-fired") increment(weaponShots, `${event.weapon}-lv${event.level}`);
      if (event.type === "core-loaded") {
        weaponBuilds.add(`${event.weapon ?? "unarmed"}-lv${event.level}`);
        if (event.ejected !== null) exchanges += 1;
      }
    }
  }
  return Object.freeze({
    seed,
    status: simulation.status,
    clearTick: simulation.tick,
    hitsTaken: simulation.hitsTaken,
    hitsBySection: Object.freeze(hitsBySection),
    hitsByVerticalBand: Object.freeze(hitsByVerticalBand),
    telegraphs: Object.freeze(telegraphs),
    weaponShots: Object.freeze(weaponShots),
    weaponBuilds: Object.freeze([...weaponBuilds].sort()),
    exchanges,
  });
}

function aggregateHits(runs, field) {
  const totals = {};
  for (const run of runs) {
    for (const [key, count] of Object.entries(run[field])) {
      totals[key] = (totals[key] ?? 0) + count;
    }
  }
  const total = Object.values(totals).reduce((sum, count) => sum + count, 0);
  const hotspot = Object.entries(totals).sort((left, right) => right[1] - left[1])[0] ?? [null, 0];
  return Object.freeze({
    total,
    counts: Object.freeze(totals),
    hotspot: Object.freeze({ key: hotspot[0], count: hotspot[1], share: total === 0 ? 0 : hotspot[1] / total }),
  });
}

export function auditLearningCurve() {
  const violations = [];
  const stages = STAGES.map((stage) => {
    const introductions = introductionPlan(stage);
    const runs = AUDIT_SEEDS.map((seed) => runStage(stage, seed));
    for (const groups of [introductions.enemies, introductions.hazards]) {
      for (let index = 0; index < groups.length; index += 1) {
        if (groups[index].entries.length > 2) {
          violations.push({ stageId: stage.id, tick: groups[index].tick, reason: "too-many-simultaneous-introductions" });
        }
        if (index > 0 && groups[index].tick - groups[index - 1].tick < MINIMUM_INTRODUCTION_GAP_TICKS) {
          violations.push({ stageId: stage.id, tick: groups[index].tick, reason: "introduction-gap-too-short" });
        }
      }
    }
    for (const run of runs) {
      if (run.status !== "cleared") violations.push({ stageId: stage.id, seed: run.seed, reason: "run-not-cleared" });
      for (const hazard of stage.hazards) {
        const warning = run.telegraphs.find(({ hazardId }) => hazardId === hazard.id);
        if (!warning || warning.tick !== hazard.startTick - HAZARD_TELEGRAPH_TICKS
          || warning.leadTicks !== HAZARD_TELEGRAPH_TICKS) {
          violations.push({ stageId: stage.id, seed: run.seed, hazardId: hazard.id, reason: "hazard-not-telegraphed" });
        }
      }
    }
    return Object.freeze({
      stageId: stage.id,
      introductions,
      runs: Object.freeze(runs),
      sectionHits: aggregateHits(runs, "hitsBySection"),
      verticalBandHits: aggregateHits(runs, "hitsByVerticalBand"),
    });
  });
  const finaleRuns = stages.at(-1).runs;
  const finaleWeapons = new Set(finaleRuns.flatMap(({ weaponShots }) => (
    Object.keys(weaponShots).map((key) => key.split("-lv")[0])
  )));
  const finale = Object.freeze({
    weaponsUsed: Object.freeze([...finaleWeapons].sort()),
    exchanges: finaleRuns.reduce((total, run) => total + run.exchanges, 0),
  });
  if (!["blue", "red", "yellow"].every((weapon) => finaleWeapons.has(weapon))) {
    violations.push({ stageId: STAGES.at(-1).id, reason: "finale-does-not-use-all-weapons" });
  }
  if (finale.exchanges === 0) {
    violations.push({ stageId: STAGES.at(-1).id, reason: "finale-has-no-reactor-exchange" });
  }
  return Object.freeze({
    seeds: AUDIT_SEEDS,
    thresholds: Object.freeze({
      telegraphTicks: HAZARD_TELEGRAPH_TICKS,
      minimumIntroductionGapTicks: MINIMUM_INTRODUCTION_GAP_TICKS,
      maximumSimultaneousIntroductions: 2,
    }),
    stages: Object.freeze(stages),
    finale,
    violations: Object.freeze(violations),
  });
}
