import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { summarizeCompatibilityReport, validateCompatibilityReport } from "../../src/browser/compatibility-report.mjs";

const PASS_EVIDENCE = Object.freeze({
  viewports: ["1440x900"],
  inputModes: ["keyboard"],
  checks: {
    loaded: true,
    primaryFlow: true,
    pauseResume: true,
    noHorizontalOverflow: true,
    noConsoleErrors: true,
    noMissingResources: true,
    noExternalOrigins: true,
  },
});

function reportWith(status = "unavailable") {
  const ids = ["chrome-desktop", "edge-desktop", "firefox-desktop", "safari-desktop", "ios-safari-device", "android-chrome-device"];
  return {
    schemaVersion: 1,
    buildId: "test-build",
    recordedOn: "2026-10-22",
    targets: ids.map((id) => ({
      id,
      browser: id,
      version: "n/a",
      platform: "test",
      environment: id.endsWith("device") ? "real-device" : "desktop",
      status,
      reason: status === "pass" ? undefined : "not available in test",
      notes: "fixture",
      evidence: status === "pass" ? PASS_EVIDENCE : undefined,
    })),
  };
}

test("TECH-04: every required browser and device target is explicit", () => {
  const report = reportWith();
  assert.deepEqual(validateCompatibilityReport(report), { valid: true, failures: [] });
  assert.deepEqual(summarizeCompatibilityReport(report), {
    targetCount: 6,
    pass: 0,
    fail: 0,
    "not-run": 0,
    unavailable: 6,
    requiredPass: 0,
    requiredCount: 6,
    realMobilePass: 0,
  });
});

test("TECH-04: an unobserved or incomplete target cannot be marked pass", () => {
  const report = reportWith();
  report.targets[0] = { ...report.targets[0], status: "pass", reason: undefined, evidence: { ...PASS_EVIDENCE, checks: { ...PASS_EVIDENCE.checks, noConsoleErrors: false } } };
  const result = validateCompatibilityReport(report);
  assert.equal(result.valid, false);
  assert.match(result.failures.join("\n"), /noConsoleErrors must be true to pass/);
});

test("TECH-04: emulator evidence is not counted as a real mobile device", () => {
  const report = reportWith();
  report.targets.push({
    id: "android-chrome-emulator",
    browser: "Chrome",
    version: "1",
    platform: "Android",
    environment: "emulator",
    status: "pass",
    notes: "supplemental",
    evidence: PASS_EVIDENCE,
  });
  assert.equal(summarizeCompatibilityReport(report).realMobilePass, 0);
});

test("TECH-04: checked-in Phase 05 evidence remains schema-valid", async () => {
  const path = resolve(process.cwd(), "../phases/phase-05/browser-compatibility.json");
  const report = JSON.parse(await readFile(path, "utf8"));
  const result = validateCompatibilityReport(report);
  assert.equal(result.valid, true, result.failures.join("\n"));
});

test("TECH-04/INP-02〜04: Phase 09 evidence records observed and unavailable targets without inference", async () => {
  const path = resolve(process.cwd(), "../phases/phase-09/browser-compatibility.json");
  const report = JSON.parse(await readFile(path, "utf8"));
  const result = validateCompatibilityReport(report);
  assert.equal(result.valid, true, result.failures.join("\n"));
  assert.deepEqual(summarizeCompatibilityReport(report), {
    targetCount: 7,
    pass: 1,
    fail: 0,
    "not-run": 1,
    unavailable: 5,
    requiredPass: 1,
    requiredCount: 6,
    realMobilePass: 0,
  });
});

test("TECH-04/05: Phase 10 RC evidence keeps unavailable browsers and physical devices as blockers", async () => {
  const path = resolve(process.cwd(), "../phases/phase-10/browser-compatibility.json");
  const report = JSON.parse(await readFile(path, "utf8"));
  const result = validateCompatibilityReport(report);
  assert.equal(result.valid, true, result.failures.join("\n"));
  assert.equal(report.buildId, "phase10-rc1-20261024");
  assert.deepEqual(summarizeCompatibilityReport(report), {
    targetCount: 7,
    pass: 1,
    fail: 0,
    "not-run": 1,
    unavailable: 5,
    requiredPass: 1,
    requiredCount: 6,
    realMobilePass: 0,
  });
  const lowPerformance = report.targets.find(({ id }) => id === "physical-low-performance-device");
  assert.equal(lowPerformance.status, "unavailable");
  assert.match(lowPerformance.notes, /物理端末の合格へ読み替えない/);
});
