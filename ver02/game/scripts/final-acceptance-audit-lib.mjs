import { REQUIRED_BROWSER_TARGETS, validateCompatibilityReport } from "../src/browser/compatibility-report.mjs";

const PHASE_10 = "P10";
const REAL_MOBILE_TARGETS = ["ios-safari-device", "android-chrome-device"];
const PHYSICAL_LOW_PERFORMANCE_TARGET = "physical-low-performance-device";

function nonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function sameValues(actual, expected) {
  return Array.isArray(actual)
    && actual.length === expected.length
    && actual.every((value, index) => value === expected[index]);
}

function phaseIncludes(row, phase) {
  return row.finalVerification.split(",").map((value) => value.trim()).includes(phase);
}

export function validatePhase10EnvironmentEvidence(compatibility) {
  const failures = [];
  const targets = Array.isArray(compatibility?.targets) ? compatibility.targets : [];

  for (const id of REAL_MOBILE_TARGETS) {
    const target = targets.find((candidate) => candidate.id === id);
    if (target?.status !== "pass") continue;
    const evidence = target.evidence;
    if (target.environment !== "real-device") failures.push(`${id}: pass requires environment real-device`);
    if (!evidence?.inputModes?.includes("touch")) failures.push(`${id}: pass requires touch input evidence`);
    for (const orientation of ["portrait", "landscape"]) {
      if (!evidence?.orientations?.includes(orientation)) {
        failures.push(`${id}: pass requires ${orientation} orientation evidence`);
      }
    }
    for (const check of [
      "retryFlow",
      "multiTouch",
      "noScrollConflict",
      "touchTargetsAtLeast44CssPx",
      "safeAreaVisible",
    ]) {
      if (evidence?.checks?.[check] !== true) failures.push(`${id}: ${check} must be true to pass`);
    }
  }

  const lowPerformance = targets.find(({ id }) => id === PHYSICAL_LOW_PERFORMANCE_TARGET);
  if (lowPerformance?.status === "pass") {
    const evidence = lowPerformance.evidence;
    if (lowPerformance.environment !== "real-device") {
      failures.push(`${PHYSICAL_LOW_PERFORMANCE_TARGET}: pass requires environment real-device`);
    }
    for (const field of ["model", "cpu", "gpu"]) {
      if (!nonEmptyString(evidence?.device?.[field])) {
        failures.push(`${PHYSICAL_LOW_PERFORMANCE_TARGET}: device.${field} is required to pass`);
      }
    }
    if (!Number.isInteger(evidence?.device?.memoryMiB) || evidence.device.memoryMiB <= 0) {
      failures.push(`${PHYSICAL_LOW_PERFORMANCE_TARGET}: device.memoryMiB must be a positive integer to pass`);
    }
    const performance = evidence?.performance;
    if (!performance || typeof performance !== "object" || Array.isArray(performance)) {
      failures.push(`${PHYSICAL_LOW_PERFORMANCE_TARGET}: performance evidence is required to pass`);
    } else {
      if (!Number.isFinite(performance.durationMs) || performance.durationMs < 300_000) {
        failures.push(`${PHYSICAL_LOW_PERFORMANCE_TARGET}: performance.durationMs must be at least 300000`);
      }
      if (!Number.isFinite(performance.targetFps) || performance.targetFps < 60) {
        failures.push(`${PHYSICAL_LOW_PERFORMANCE_TARGET}: performance.targetFps must be at least 60`);
      }
      if (!Number.isFinite(performance.averageFps) || performance.averageFps < performance.targetFps) {
        failures.push(`${PHYSICAL_LOW_PERFORMANCE_TARGET}: performance.averageFps must meet targetFps`);
      }
      if (!Number.isFinite(performance.simulationDroppedRatio)
        || performance.simulationDroppedRatio < 0
        || performance.simulationDroppedRatio > 0.01) {
        failures.push(`${PHYSICAL_LOW_PERFORMANCE_TARGET}: performance.simulationDroppedRatio must be between 0 and 0.01`);
      }
      for (const check of ["inputResponsive", "noLongStall", "progressSpeedStable", "resourceTrendStable"]) {
        if (performance[check] !== true) {
          failures.push(`${PHYSICAL_LOW_PERFORMANCE_TARGET}: performance.${check} must be true to pass`);
        }
      }
    }
  }

  return Object.freeze({ valid: failures.length === 0, failures: Object.freeze(failures) });
}

export function auditFinalAcceptance({
  gate,
  acceptanceRows,
  compatibility,
  releaseCandidate,
  evidenceRegistry,
  expectedBuildId,
}) {
  const failures = [];
  if (gate?.schemaVersion !== 1) failures.push("schemaVersion must be 1");
  if (gate?.buildId !== expectedBuildId) failures.push(`buildId must be ${expectedBuildId}`);
  if (!nonEmptyString(gate?.recordedOn)) failures.push("recordedOn is required");

  for (const [label, document] of [
    ["compatibility", compatibility],
    ["release candidate", releaseCandidate],
    ["evidence registry", evidenceRegistry],
  ]) {
    if (document?.buildId !== expectedBuildId) failures.push(`${label} buildId must be ${expectedBuildId}`);
  }

  const compatibilityResult = validateCompatibilityReport(compatibility);
  if (!compatibilityResult.valid) {
    failures.push(...compatibilityResult.failures.map((failure) => `compatibility: ${failure}`));
  }
  const environmentEvidenceResult = validatePhase10EnvironmentEvidence(compatibility);
  if (!environmentEvidenceResult.valid) {
    failures.push(...environmentEvidenceResult.failures.map((failure) => `phase 10 environment evidence: ${failure}`));
  }

  const phase10Rows = acceptanceRows.filter((row) => phaseIncludes(row, PHASE_10));
  const deferredRows = acceptanceRows.filter((row) => !phaseIncludes(row, PHASE_10));
  const nonPassingIds = phase10Rows.filter(({ state }) => state !== "合格").map(({ id }) => id);
  const deferredIds = deferredRows.map(({ id }) => id);
  const nonPassingBrowserIds = REQUIRED_BROWSER_TARGETS
    .filter((id) => compatibility.targets?.find((target) => target.id === id)?.status !== "pass");
  const realMobileIds = ["ios-safari-device", "android-chrome-device"];
  const nonPassingRealMobileIds = realMobileIds
    .filter((id) => compatibility.targets?.find((target) => target.id === id)?.status !== "pass");
  const lowPerformance = compatibility.targets?.find(({ id }) => id === "physical-low-performance-device");
  const lowPerformancePassed = lowPerformance?.status === "pass";

  const expected = {
    phase10RequirementCount: phase10Rows.length,
    deferredRequirementIds: deferredIds,
    nonPassingRequirementIds: nonPassingIds,
    nonPassingBrowserTargetIds: nonPassingBrowserIds,
    nonPassingRealMobileTargetIds: nonPassingRealMobileIds,
    physicalLowPerformancePassed: lowPerformancePassed,
  };

  if (gate?.acceptance?.phase10RequirementCount !== expected.phase10RequirementCount) {
    failures.push(`acceptance.phase10RequirementCount must be ${expected.phase10RequirementCount}`);
  }
  for (const key of [
    "deferredRequirementIds",
    "nonPassingRequirementIds",
    "nonPassingBrowserTargetIds",
    "nonPassingRealMobileTargetIds",
  ]) {
    if (!sameValues(gate?.acceptance?.[key], expected[key])) {
      failures.push(`acceptance.${key} must exactly match derived state`);
    }
  }
  if (gate?.acceptance?.physicalLowPerformancePassed !== expected.physicalLowPerformancePassed) {
    failures.push(`acceptance.physicalLowPerformancePassed must be ${expected.physicalLowPerformancePassed}`);
  }

  const critical = gate?.knownDefects?.critical;
  const major = gate?.knownDefects?.major;
  if (!Array.isArray(critical)) failures.push("knownDefects.critical must be an array");
  if (!Array.isArray(major)) failures.push("knownDefects.major must be an array");

  const allRequirementsPass = nonPassingIds.length === 0;
  const allBrowsersPass = nonPassingBrowserIds.length === 0;
  const allRealMobilePass = nonPassingRealMobileIds.length === 0;
  const noCriticalOrMajorDefects = Array.isArray(critical) && Array.isArray(major)
    && critical.length === 0 && major.length === 0;
  const accepted = allRequirementsPass
    && allBrowsersPass
    && allRealMobilePass
    && lowPerformancePassed
    && noCriticalOrMajorDefects;

  const expectedDecision = {
    allPhase10RequirementsPass: allRequirementsPass,
    allRequiredBrowsersPass: allBrowsersPass,
    bothRealMobileTargetsPass: allRealMobilePass,
    physicalLowPerformancePass: lowPerformancePassed,
    noCriticalOrMajorDefects,
    accepted,
  };
  for (const [key, value] of Object.entries(expectedDecision)) {
    if (gate?.decision?.[key] !== value) failures.push(`decision.${key} must be ${value}`);
  }

  if (releaseCandidate?.accepted !== accepted) failures.push(`release candidate accepted must be ${accepted}`);
  if (evidenceRegistry?.accepted !== accepted) failures.push(`evidence registry accepted must be ${accepted}`);
  if (!nonEmptyString(gate?.decision?.reason)) failures.push("decision.reason is required");

  return {
    valid: failures.length === 0,
    failures,
    ...expected,
    decision: expectedDecision,
  };
}
