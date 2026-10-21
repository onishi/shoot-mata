import {
  CORE_TYPES,
  MODE_INFO,
  collectCore,
  createPowerState,
  getBuild,
} from "./model.mjs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const AUDIT_SEQUENCE_LENGTH = 6;

function enumerateCoreSequences(length, prefix = []) {
  if (length === 0) return [prefix];
  return CORE_TYPES.flatMap((core) => enumerateCoreSequences(length - 1, [...prefix, core]));
}

function runSequence(mode, sequence) {
  const state = createPowerState(mode);
  for (const core of sequence) collectCore(state, core);
  return { state, build: getBuild(state) };
}

function buildIdentity(build) {
  return JSON.stringify({
    weapon: build.weapon,
    level: build.level,
    supports: [...build.supports].sort(),
  });
}

function stateIdentity(build) {
  return JSON.stringify(build.slots);
}

function requirementChecks(mode) {
  const pushOut = runSequence(mode, ["red", "blue", "yellow", "red"]);
  const mixed = runSequence(mode, ["red", "blue", "yellow"]);

  const orderedThreeSlotQueue = JSON.stringify(pushOut.build.slots)
    === JSON.stringify(["blue", "yellow", "red"])
    && pushOut.build.weapon === "blue";

  const firstCoreAndDuplicateCount = CORE_TYPES.every((core) => {
    const triple = runSequence(mode, [core, core, core]).build;
    return triple.weapon === core && triple.level === 3;
  }) && (() => {
    const split = runSequence(mode, ["red", "blue", "red"]).build;
    return split.weapon === "red" && split.level === 2;
  })();

  const mixedSupportWithCost = mixed.build.weapon === "red"
    && JSON.stringify([...mixed.build.supports].sort()) === JSON.stringify(["blue", "yellow"])
    && pushOut.state.tradeoffs > 0;

  return {
    "CORE-02_ordered_three_slot_push_out": orderedThreeSlotQueue,
    "CORE-03_first_core_weapon_duplicate_level": firstCoreAndDuplicateCount,
    "CORE-04_mixed_support_with_tradeoff": mixedSupportWithCost,
  };
}

export function auditMechanic(mode, sequenceLength = AUDIT_SEQUENCE_LENGTH) {
  if (!MODE_INFO[mode]) throw new Error(`Unknown mode: ${mode}`);
  if (!Number.isInteger(sequenceLength) || sequenceLength < 1) {
    throw new Error("Sequence length must be a positive integer");
  }

  const sequences = enumerateCoreSequences(sequenceLength);
  const builds = new Set();
  const states = new Set();
  let tradeoffs = 0;
  let switches = 0;

  for (const sequence of sequences) {
    const result = runSequence(mode, sequence);
    builds.add(buildIdentity(result.build));
    states.add(stateIdentity(result.build));
    tradeoffs += result.state.tradeoffs;
    switches += result.state.switches;
  }

  const requirements = requirementChecks(mode);
  return {
    mode,
    label: MODE_INFO[mode].label,
    evaluatedSequences: sequences.length,
    sequenceLength,
    reachableCombatBuilds: builds.size,
    reachableInternalStates: states.size,
    meanTradeoffs: tradeoffs / sequences.length,
    meanWeaponSwitches: switches / sequences.length,
    requirements,
    passesRequiredMechanic: Object.values(requirements).every(Boolean),
  };
}

export function createObjectiveAudit(sequenceLength = AUDIT_SEQUENCE_LENGTH) {
  const candidates = Object.keys(MODE_INFO).map((mode) => auditMechanic(mode, sequenceLength));
  const passing = candidates.filter((candidate) => candidate.passesRequiredMechanic);
  return {
    method: "exhaustive-core-sequence-enumeration",
    sequenceLength,
    candidateCount: candidates.length,
    selectionRule: "CORE-02, CORE-03, CORE-04の全機械判定を満たす単一候補を採用する",
    selectedMode: passing.length === 1 ? passing[0].mode : null,
    candidates,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  process.stdout.write(`${JSON.stringify(createObjectiveAudit(), null, 2)}\n`);
}
