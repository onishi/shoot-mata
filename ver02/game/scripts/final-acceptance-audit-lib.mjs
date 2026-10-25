import {
  REQUIRED_BROWSER_TARGETS,
  validateCompatibilityReport,
} from "../src/browser/compatibility-report.mjs";

const PHASE_10 = "P10";
const REAL_MOBILE_TARGETS = ["ios-safari-device", "android-chrome-device"];
const PHYSICAL_LOW_PERFORMANCE_TARGET = "physical-low-performance-device";
const DESKTOP_BROWSER_TARGETS = [
  "chrome-desktop",
  "edge-desktop",
  "firefox-desktop",
  "safari-desktop",
];
const REQUIRED_BROWSER_IDENTITIES = Object.freeze({
  "chrome-desktop": { browser: "Google Chrome", platformPattern: /^macOS \d/ },
  "edge-desktop": { browser: "Microsoft Edge", platformPattern: /^macOS \d/ },
  "firefox-desktop": { browser: "Mozilla Firefox", platformPattern: /^macOS \d/ },
  "safari-desktop": { browser: "Safari", platformPattern: /^macOS \d/ },
  "ios-safari-device": { browser: "Mobile Safari", platformPattern: /^(?:iOS|iPadOS) \d/ },
  "android-chrome-device": { browser: "Chrome for Android", platformPattern: /^Android \d/ },
});
const OBSERVED_BROWSER_VERSION_PATTERN = /^\d+(?:\.\d+)+(?:\s|$)/;
const DESKTOP_VIEWPORTS = ["1568x956", "390x844", "844x390"];
const PHYSICAL_MAX_FRAME_MS = 1_000;
const PHYSICAL_MAX_INPUT_LATENCY_MS = 100;
const PHYSICAL_MAX_HEAP_GROWTH_BYTES = 16 * 1024 * 1024;

function nonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isIsoCalendarDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value ?? "")) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function sameValues(actual, expected) {
  return Array.isArray(actual)
    && actual.length === expected.length
    && actual.every((value, index) => value === expected[index]);
}

function phaseIncludes(row, phase) {
  return row.finalVerification.split(",").map((value) => value.trim()).includes(phase);
}

function validateReleaseCandidateManifestIdentity(releaseCandidate, failures) {
  const manifest = releaseCandidate?.manifest;
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
    failures.push("release candidate manifest identity must be an object");
    return;
  }
  if (!/^[a-f0-9]{64}$/.test(manifest.sha256 ?? "")) {
    failures.push("release candidate manifest.sha256 must be a lowercase SHA-256 digest");
  }
  if (!Number.isInteger(manifest.fileCount) || manifest.fileCount <= 0) {
    failures.push("release candidate manifest.fileCount must be a positive integer");
  }
  if (!Number.isInteger(manifest.totalBytes) || manifest.totalBytes <= 0) {
    failures.push("release candidate manifest.totalBytes must be a positive integer");
  }
}

function validateBuildIdentity(target, releaseCandidate, failures) {
  const identity = target.evidence?.buildIdentity;
  const expectedManifest = releaseCandidate?.manifest;
  if (!identity || typeof identity !== "object" || Array.isArray(identity)) {
    failures.push(`${target.id}: pass requires structured buildIdentity`);
    return;
  }
  if (identity.buildId !== releaseCandidate?.buildId) {
    failures.push(`${target.id}: buildIdentity.buildId must exactly match the release candidate`);
  }
  for (const field of ["sha256", "fileCount", "totalBytes"]) {
    if (identity[field] !== expectedManifest?.[field]) {
      failures.push(`${target.id}: buildIdentity.${field} must exactly match the release candidate manifest`);
    }
  }
}

function validateBrowserIdentity(target, failures) {
  const expected = REQUIRED_BROWSER_IDENTITIES[target.id];
  if (!expected) return;
  if (target.browser !== expected.browser) {
    failures.push(`${target.id}: pass requires browser ${expected.browser}`);
  }
  if (!OBSERVED_BROWSER_VERSION_PATTERN.test(target.version ?? "")) {
    failures.push(`${target.id}: pass requires a numeric observed browser version`);
  }
  if (expected.platformPattern && !expected.platformPattern.test(target.platform ?? "")) {
    failures.push(`${target.id}: pass requires a matching target platform`);
  }
}

function executionKey(execution, dimension) {
  return `${execution?.inputMode ?? ""}:${execution?.[dimension] ?? ""}`;
}

function validateCampaign(target, requiredExecutions, dimension, failures) {
  const campaign = target.evidence?.campaign;
  if (campaign?.stages !== 4) {
    failures.push(`${target.id}: pass requires a four-stage campaign result`);
  }
  if (!Number.isInteger(campaign?.runs) || campaign.runs !== requiredExecutions.length) {
    failures.push(`${target.id}: pass requires exactly ${requiredExecutions.length} campaign runs`);
  }
  if (!Array.isArray(campaign?.results)
    || campaign.results.length !== campaign?.runs
    || campaign.results.some((result) => !nonEmptyString(result))) {
    failures.push(`${target.id}: campaign.results must contain one non-empty result per run`);
  }
  if (!Array.isArray(campaign?.executions)
    || campaign.executions.length !== campaign?.runs) {
    failures.push(`${target.id}: campaign.executions must contain one structured execution per run`);
    return;
  }
  for (const [index, execution] of campaign.executions.entries()) {
    if (!execution || typeof execution !== "object" || Array.isArray(execution)) {
      failures.push(`${target.id}: campaign.executions[${index}] must be an object`);
      continue;
    }
    if (!nonEmptyString(execution.inputMode)) {
      failures.push(`${target.id}: campaign.executions[${index}].inputMode is required`);
    }
    if (!nonEmptyString(execution[dimension])) {
      failures.push(`${target.id}: campaign.executions[${index}].${dimension} is required`);
    }
    if (execution.stages !== 4) {
      failures.push(`${target.id}: campaign.executions[${index}].stages must be 4`);
    }
    if (execution.outcome !== "pass") {
      failures.push(`${target.id}: campaign.executions[${index}].outcome must be pass`);
    }
    if (!nonEmptyString(execution.result)) {
      failures.push(`${target.id}: campaign.executions[${index}].result is required`);
    } else if (execution.result !== campaign.results?.[index]) {
      failures.push(`${target.id}: campaign.executions[${index}].result must match campaign.results[${index}]`);
    }
  }
  const actualKeys = campaign.executions.map((execution) => executionKey(execution, dimension));
  for (const required of requiredExecutions) {
    const key = executionKey(required, dimension);
    if (actualKeys.filter((actual) => actual === key).length !== 1) {
      failures.push(`${target.id}: campaign executions must contain exactly one ${key} run`);
    }
  }
}

function validateDesktopRuntimeMeasurements(target, failures) {
  const evidence = target.evidence;
  if (evidence?.consoleWarningOrErrorCount !== 0) {
    failures.push(`${target.id}: pass requires consoleWarningOrErrorCount 0`);
  }
  if (evidence?.failedDeclaredResourceCount !== 0) {
    failures.push(`${target.id}: pass requires failedDeclaredResourceCount 0`);
  }
  if (!Array.isArray(evidence?.externalOrigins) || evidence.externalOrigins.length !== 0) {
    failures.push(`${target.id}: pass requires an empty externalOrigins array`);
  }
  for (const viewport of DESKTOP_VIEWPORTS) {
    const layout = evidence?.layout?.[viewport];
    if (layout?.horizontalOverflowPx !== 0 || layout?.verticalOverflowPx !== 0) {
      failures.push(`${target.id}: ${viewport} layout must record zero horizontal and vertical overflow`);
    }
  }
}

function validateMobileRuntimeMeasurements(target, failures) {
  const evidence = target.evidence;
  if (evidence?.consoleWarningOrErrorCount !== 0) {
    failures.push(`${target.id}: pass requires consoleWarningOrErrorCount 0`);
  }
  if (evidence?.failedDeclaredResourceCount !== 0) {
    failures.push(`${target.id}: pass requires failedDeclaredResourceCount 0`);
  }
  if (!Array.isArray(evidence?.externalOrigins) || evidence.externalOrigins.length !== 0) {
    failures.push(`${target.id}: pass requires an empty externalOrigins array`);
  }
  for (const orientation of ["portrait", "landscape"]) {
    const layout = evidence?.layout?.[orientation];
    const width = layout?.viewportWidthCssPx;
    const height = layout?.viewportHeightCssPx;
    if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(height) || height <= 0) {
      failures.push(`${target.id}: ${orientation} layout must record positive CSS viewport dimensions`);
    } else if ((orientation === "portrait" && width >= height)
      || (orientation === "landscape" && width <= height)) {
      failures.push(`${target.id}: ${orientation} layout dimensions must match the orientation`);
    }
    if (layout?.horizontalOverflowPx !== 0 || layout?.verticalOverflowPx !== 0) {
      failures.push(`${target.id}: ${orientation} layout must record zero horizontal and vertical overflow`);
    }
  }
  const interaction = evidence?.interactionMeasurements;
  if (!Number.isInteger(interaction?.maximumSimultaneousTouches)
    || interaction.maximumSimultaneousTouches < 2) {
    failures.push(`${target.id}: maximumSimultaneousTouches must be at least 2`);
  }
  if (interaction?.scrollConflictCount !== 0) {
    failures.push(`${target.id}: scrollConflictCount must be 0`);
  }
  if (!Number.isFinite(interaction?.minimumTouchTargetCssPx)
    || interaction.minimumTouchTargetCssPx < 44) {
    failures.push(`${target.id}: minimumTouchTargetCssPx must be at least 44`);
  }
  if (interaction?.safeAreaViolationCount !== 0) {
    failures.push(`${target.id}: safeAreaViolationCount must be 0`);
  }
}

export function validatePhase10EnvironmentEvidence(compatibility, releaseCandidate) {
  const failures = [];
  const targets = Array.isArray(compatibility?.targets) ? compatibility.targets : [];

  validateReleaseCandidateManifestIdentity(releaseCandidate, failures);

  for (const id of REQUIRED_BROWSER_TARGETS) {
    const target = targets.find((candidate) => candidate.id === id);
    if (target?.status !== "pass") continue;
    validateBrowserIdentity(target, failures);
    if (DESKTOP_BROWSER_TARGETS.includes(id)) {
      validateCampaign(target, [
        { inputMode: "keyboard", viewport: "1568x956" },
        ...DESKTOP_VIEWPORTS.map((viewport) => ({ inputMode: "pointer-events", viewport })),
      ], "viewport", failures);
    } else {
      validateCampaign(target, [
        { inputMode: "touch", orientation: "portrait" },
        { inputMode: "touch", orientation: "landscape" },
      ], "orientation", failures);
    }
    validateBuildIdentity(target, releaseCandidate, failures);
  }

  for (const id of DESKTOP_BROWSER_TARGETS) {
    const target = targets.find((candidate) => candidate.id === id);
    if (target?.status !== "pass") continue;
    if (target.environment !== "desktop") failures.push(`${id}: pass requires environment desktop`);
    for (const inputMode of ["keyboard", "pointer-events"]) {
      if (!target.evidence?.inputModes?.includes(inputMode)) {
        failures.push(`${id}: pass requires ${inputMode} input evidence`);
      }
    }
    for (const viewport of DESKTOP_VIEWPORTS) {
      if (!target.evidence?.viewports?.includes(viewport)) {
        failures.push(`${id}: pass requires ${viewport} viewport evidence`);
      }
    }
    validateDesktopRuntimeMeasurements(target, failures);
  }

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
    validateMobileRuntimeMeasurements(target, failures);
  }

  const lowPerformance = targets.find(({ id }) => id === PHYSICAL_LOW_PERFORMANCE_TARGET);
  if (lowPerformance?.status === "pass") {
    const evidence = lowPerformance.evidence;
    validateBuildIdentity(lowPerformance, releaseCandidate, failures);
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
      if (!Number.isFinite(performance.maximumFrameMs)
        || performance.maximumFrameMs < 0
        || performance.maximumFrameMs > PHYSICAL_MAX_FRAME_MS) {
        failures.push(`${PHYSICAL_LOW_PERFORMANCE_TARGET}: performance.maximumFrameMs must be between 0 and ${PHYSICAL_MAX_FRAME_MS}`);
      }
      if (!Number.isFinite(performance.maximumInputLatencyMs)
        || performance.maximumInputLatencyMs < 0
        || performance.maximumInputLatencyMs > PHYSICAL_MAX_INPUT_LATENCY_MS) {
        failures.push(`${PHYSICAL_LOW_PERFORMANCE_TARGET}: performance.maximumInputLatencyMs must be between 0 and ${PHYSICAL_MAX_INPUT_LATENCY_MS}`);
      }
      if (!Number.isFinite(performance.progressDriftRatio)
        || performance.progressDriftRatio < 0
        || performance.progressDriftRatio > 0.01) {
        failures.push(`${PHYSICAL_LOW_PERFORMANCE_TARGET}: performance.progressDriftRatio must be between 0 and 0.01`);
      }
      if (!Number.isFinite(performance.heapGrowthBytes)
        || performance.heapGrowthBytes > PHYSICAL_MAX_HEAP_GROWTH_BYTES) {
        failures.push(`${PHYSICAL_LOW_PERFORMANCE_TARGET}: performance.heapGrowthBytes must not exceed ${PHYSICAL_MAX_HEAP_GROWTH_BYTES}`);
      }
      if (performance.resourceCountGrowth !== 0) {
        failures.push(`${PHYSICAL_LOW_PERFORMANCE_TARGET}: performance.resourceCountGrowth must be 0`);
      }
      if (performance.failedDeclaredResourceCount !== 0) {
        failures.push(`${PHYSICAL_LOW_PERFORMANCE_TARGET}: performance.failedDeclaredResourceCount must be 0`);
      }
      if (performance.domNodeGrowth !== 0) {
        failures.push(`${PHYSICAL_LOW_PERFORMANCE_TARGET}: performance.domNodeGrowth must be 0`);
      }
      if (performance.consoleWarningOrErrorCount !== 0) {
        failures.push(`${PHYSICAL_LOW_PERFORMANCE_TARGET}: performance.consoleWarningOrErrorCount must be 0`);
      }
      if (!Array.isArray(performance.externalOrigins) || performance.externalOrigins.length !== 0) {
        failures.push(`${PHYSICAL_LOW_PERFORMANCE_TARGET}: performance.externalOrigins must be an empty array`);
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
  if (!isIsoCalendarDate(gate?.recordedOn)) failures.push("recordedOn must be a valid YYYY-MM-DD calendar date");

  for (const [label, document] of [
    ["compatibility", compatibility],
    ["release candidate", releaseCandidate],
    ["evidence registry", evidenceRegistry],
  ]) {
    if (document?.buildId !== expectedBuildId) failures.push(`${label} buildId must be ${expectedBuildId}`);
  }

  const datedDocuments = [
    ["release candidate", releaseCandidate],
    ["compatibility", compatibility],
    ["evidence registry", evidenceRegistry],
  ];
  for (const [label, document] of datedDocuments) {
    if (!isIsoCalendarDate(document?.recordedOn)) {
      failures.push(`${label} recordedOn must be a valid YYYY-MM-DD calendar date`);
    }
  }
  if (isIsoCalendarDate(releaseCandidate?.recordedOn)) {
    for (const [label, document] of datedDocuments.slice(1)) {
      if (isIsoCalendarDate(document?.recordedOn)
        && document.recordedOn < releaseCandidate.recordedOn) {
        failures.push(`${label} recordedOn must not predate the release candidate`);
      }
    }
  }
  if (isIsoCalendarDate(gate?.recordedOn)) {
    for (const [label, document] of datedDocuments) {
      if (isIsoCalendarDate(document?.recordedOn) && document.recordedOn > gate.recordedOn) {
        failures.push(`${label} recordedOn must not postdate the final acceptance decision`);
      }
    }
  }

  const compatibilityResult = validateCompatibilityReport(compatibility);
  if (!compatibilityResult.valid) {
    failures.push(...compatibilityResult.failures.map((failure) => `compatibility: ${failure}`));
  }
  const environmentEvidenceResult = validatePhase10EnvironmentEvidence(compatibility, releaseCandidate);
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
