export const REQUIRED_BROWSER_TARGETS = Object.freeze([
  "chrome-desktop",
  "edge-desktop",
  "firefox-desktop",
  "safari-desktop",
  "ios-safari-device",
  "android-chrome-device",
]);

const STATUSES = new Set(["pass", "fail", "not-run", "unavailable"]);
const ENVIRONMENTS = new Set(["desktop", "real-device", "emulator"]);
const REQUIRED_CHECKS = Object.freeze([
  "loaded",
  "primaryFlow",
  "pauseResume",
  "noHorizontalOverflow",
  "noConsoleErrors",
  "noMissingResources",
  "noExternalOrigins",
]);

function nonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function validatePassEvidence(target, failures) {
  const evidence = target.evidence;
  if (!evidence || typeof evidence !== "object" || Array.isArray(evidence)) {
    failures.push(`${target.id}: pass requires evidence`);
    return;
  }
  if (!Array.isArray(evidence.viewports) || evidence.viewports.length === 0
    || evidence.viewports.some((viewport) => !nonEmptyString(viewport))) {
    failures.push(`${target.id}: pass requires at least one named viewport`);
  }
  if (!Array.isArray(evidence.inputModes) || evidence.inputModes.length === 0
    || evidence.inputModes.some((mode) => !nonEmptyString(mode))) {
    failures.push(`${target.id}: pass requires at least one input mode`);
  }
  for (const check of REQUIRED_CHECKS) {
    if (evidence.checks?.[check] !== true) failures.push(`${target.id}: ${check} must be true to pass`);
  }
}

export function validateCompatibilityReport(report) {
  const failures = [];
  if (!report || typeof report !== "object" || Array.isArray(report)) {
    return Object.freeze({ valid: false, failures: ["report must be an object"] });
  }
  if (report.schemaVersion !== 1) failures.push("schemaVersion must be 1");
  if (!nonEmptyString(report.buildId)) failures.push("buildId is required");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(report.recordedOn ?? "")) failures.push("recordedOn must be YYYY-MM-DD");
  if (!Array.isArray(report.targets)) failures.push("targets must be an array");

  const targets = Array.isArray(report.targets) ? report.targets : [];
  const seen = new Set();
  for (const target of targets) {
    if (!target || typeof target !== "object" || Array.isArray(target)) {
      failures.push("each target must be an object");
      continue;
    }
    if (!nonEmptyString(target.id)) failures.push("target id is required");
    else if (seen.has(target.id)) failures.push(`${target.id}: duplicate target`);
    else seen.add(target.id);
    if (!nonEmptyString(target.browser)) failures.push(`${target.id}: browser is required`);
    if (!nonEmptyString(target.platform)) failures.push(`${target.id}: platform is required`);
    if (!ENVIRONMENTS.has(target.environment)) failures.push(`${target.id}: invalid environment`);
    if (!STATUSES.has(target.status)) failures.push(`${target.id}: invalid status`);
    if (!nonEmptyString(target.version)) failures.push(`${target.id}: version or explicit n/a is required`);
    if (!nonEmptyString(target.notes)) failures.push(`${target.id}: notes are required`);
    if (target.status === "pass") validatePassEvidence(target, failures);
    if (target.status !== "pass" && !nonEmptyString(target.reason)) {
      failures.push(`${target.id}: non-pass status requires a reason`);
    }
  }
  for (const id of REQUIRED_BROWSER_TARGETS) {
    if (!seen.has(id)) failures.push(`${id}: required target is missing`);
  }
  return Object.freeze({ valid: failures.length === 0, failures: Object.freeze(failures) });
}

export function summarizeCompatibilityReport(report) {
  const result = validateCompatibilityReport(report);
  if (!result.valid) throw new TypeError(result.failures.join("\n"));
  const counts = { pass: 0, fail: 0, "not-run": 0, unavailable: 0 };
  for (const target of report.targets) counts[target.status] += 1;
  return Object.freeze({
    targetCount: report.targets.length,
    ...counts,
    requiredPass: REQUIRED_BROWSER_TARGETS.filter((id) => report.targets.find((target) => target.id === id)?.status === "pass").length,
    requiredCount: REQUIRED_BROWSER_TARGETS.length,
    realMobilePass: report.targets.filter((target) => target.environment === "real-device" && target.status === "pass").length,
  });
}
