import { REQUIRED_BROWSER_TARGETS, validateCompatibilityReport } from "../src/browser/compatibility-report.mjs";

const PHASE_10 = "P10";

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
