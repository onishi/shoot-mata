import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const gateUrl = new URL("../../../phases/phase-09/beta-gate.json", import.meta.url);
const compatibilityUrl = new URL("../../../phases/phase-09/browser-compatibility.json", import.meta.url);
const performanceUrl = new URL("../../../phases/phase-09/performance-soak.json", import.meta.url);

test("Phase 09 gate: zero major defects does not hide missing acceptance evidence", async () => {
  const gate = JSON.parse(await readFile(gateUrl, "utf8"));
  const compatibility = JSON.parse(await readFile(compatibilityUrl, "utf8"));
  const performance = JSON.parse(await readFile(performanceUrl, "utf8"));

  assert.equal(gate.schemaVersion, 1);
  assert.deepEqual(gate.knownDefects.critical, []);
  assert.deepEqual(gate.knownDefects.major, []);
  assert.equal(gate.gateDecision.phase09Complete, true);
  assert.equal(gate.gateDecision.phase10MayStart, true);
  assert.equal(gate.gateDecision.phase10MayPass, false);

  const requiredTargets = compatibility.targets.filter(({ id }) => id !== "android-chrome-emulator");
  const requiredPasses = requiredTargets.filter(({ status }) => status === "pass");
  const realMobilePasses = requiredTargets.filter(({ environment, status }) => environment === "real-device" && status === "pass");
  assert.equal(requiredTargets.length, 6);
  assert.equal(requiredPasses.length, 1);
  assert.equal(realMobilePasses.length, 0);

  const blockers = gate.residualRisks.filter(({ phase10ExitRequired }) => phase10ExitRequired);
  assert.ok(blockers.length >= 4);
  assert.ok(blockers.some(({ id }) => id === "RISK-P09-01"));
  assert.ok(blockers.some(({ id }) => id === "RISK-P09-02"));
  assert.ok(blockers.some(({ id }) => id === "RISK-P09-03"));
  assert.equal(performance.environment.actualLowEndDeviceObserved, false);
  assert.equal(performance.passed, true);
  assert.notEqual(compatibility.buildId, gate.buildId);
  assert.equal(performance.buildId, gate.buildId);
});

test("Phase 09 gate: subjective quality remains explicitly unmeasured and non-gating", async () => {
  const gate = JSON.parse(await readFile(gateUrl, "utf8"));
  const subjective = gate.qualityTargets.find(({ id }) => id === "subjective-quality");
  const risk = gate.residualRisks.find(({ id }) => id === "RISK-P09-04");

  assert.equal(subjective.status, "unmeasured");
  assert.deepEqual(subjective.evidence, []);
  assert.equal(risk.classification, "unmeasured-quality");
  assert.equal(risk.phase10ExitRequired, false);
});
