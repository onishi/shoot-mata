import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { extractAcceptanceRows } from "../../scripts/acceptance-matrix-audit-lib.mjs";
import { auditFinalAcceptance, validatePhase10EnvironmentEvidence } from "../../scripts/final-acceptance-audit-lib.mjs";

const rootUrl = new URL("../../../", import.meta.url);
const readJson = async (path) => JSON.parse(await readFile(new URL(path, rootUrl), "utf8"));

async function checkedInInputs() {
  return {
    gate: await readJson("phases/phase-10/final-acceptance.json"),
    acceptanceRows: extractAcceptanceRows(await readFile(new URL("docs/02-acceptance-matrix.md", rootUrl), "utf8")),
    compatibility: await readJson("phases/phase-10/browser-compatibility.json"),
    releaseCandidate: await readJson("phases/phase-10/release-candidate.json"),
    evidenceRegistry: await readJson("phases/phase-10/acceptance-evidence.json"),
    expectedBuildId: "phase10-rc1-20261024",
  };
}

test("Phase 10 gate derives every current blocker and remains fail-closed", async () => {
  const result = auditFinalAcceptance(await checkedInInputs());
  assert.equal(result.valid, true, result.failures.join("\n"));
  assert.equal(result.phase10RequirementCount, 67);
  assert.deepEqual(result.nonPassingRequirementIds, [
    "UX-05",
    "UX-06",
    "INP-02",
    "INP-03",
    "INP-04",
    "TECH-04",
    "TECH-05",
  ]);
  assert.deepEqual(result.deferredRequirementIds, ["REL-04", "REL-05", "REL-06"]);
  assert.deepEqual(result.nonPassingBrowserTargetIds, [
    "safari-desktop",
    "ios-safari-device",
    "android-chrome-device",
  ]);
  assert.deepEqual(result.nonPassingRealMobileTargetIds, ["ios-safari-device", "android-chrome-device"]);
  assert.equal(result.physicalLowPerformancePassed, false);
  assert.equal(result.decision.accepted, false);
});

test("Phase 10 gate rejects a claimed pass while required environments remain missing", async () => {
  const inputs = await checkedInInputs();
  inputs.gate = structuredClone(inputs.gate);
  inputs.gate.decision.accepted = true;
  inputs.releaseCandidate = { ...inputs.releaseCandidate, accepted: true };
  inputs.evidenceRegistry = { ...inputs.evidenceRegistry, accepted: true };
  const result = auditFinalAcceptance(inputs);
  assert.equal(result.valid, false);
  assert.match(result.failures.join("\n"), /decision.accepted must be false/);
  assert.match(result.failures.join("\n"), /release candidate accepted must be false/);
  assert.match(result.failures.join("\n"), /evidence registry accepted must be false/);
});

test("Phase 10 gate rejects stale requirement and browser blocker snapshots", async () => {
  const inputs = await checkedInInputs();
  inputs.gate = structuredClone(inputs.gate);
  inputs.gate.acceptance.nonPassingRequirementIds = [];
  inputs.gate.acceptance.nonPassingBrowserTargetIds = [];
  const result = auditFinalAcceptance(inputs);
  assert.equal(result.valid, false);
  assert.match(result.failures.join("\n"), /nonPassingRequirementIds must exactly match/);
  assert.match(result.failures.join("\n"), /nonPassingBrowserTargetIds must exactly match/);
});

test("UX-05/06・INP-02〜04: real mobile pass requires both orientations and physical touch checks", async () => {
  const inputs = await checkedInInputs();
  const compatibility = structuredClone(inputs.compatibility);
  const target = compatibility.targets.find(({ id }) => id === "ios-safari-device");
  Object.assign(target, {
    status: "pass",
    version: "fixture-version",
    notes: "incomplete fixture",
    evidence: {
      viewports: ["390x844"],
      inputModes: ["touch"],
      orientations: ["portrait"],
      checks: {
        loaded: true,
        primaryFlow: true,
        pauseResume: true,
        noHorizontalOverflow: true,
        noConsoleErrors: true,
        noMissingResources: true,
        noExternalOrigins: true,
        retryFlow: true,
        multiTouch: true,
        noScrollConflict: true,
        touchTargetsAtLeast44CssPx: true,
        safeAreaVisible: true,
      },
    },
  });
  const result = validatePhase10EnvironmentEvidence(compatibility);
  assert.equal(result.valid, false);
  assert.match(result.failures.join("\n"), /landscape orientation evidence/);
});

test("TECH-05: physical low-performance pass requires device identity and measured five-minute performance", async () => {
  const inputs = await checkedInInputs();
  const compatibility = structuredClone(inputs.compatibility);
  const target = compatibility.targets.find(({ id }) => id === "physical-low-performance-device");
  Object.assign(target, {
    status: "pass",
    version: "fixture-version",
    notes: "incomplete fixture",
    evidence: {
      viewports: ["390x844"],
      inputModes: ["touch"],
      checks: {
        loaded: true,
        primaryFlow: true,
        pauseResume: true,
        noHorizontalOverflow: true,
        noConsoleErrors: true,
        noMissingResources: true,
        noExternalOrigins: true,
      },
    },
  });
  const result = validatePhase10EnvironmentEvidence(compatibility);
  assert.equal(result.valid, false);
  assert.match(result.failures.join("\n"), /device\.model is required/);
  assert.match(result.failures.join("\n"), /performance evidence is required/);
});

test("Phase 10 gate has a valid transition to accepted after every required condition passes", async () => {
  const inputs = await checkedInInputs();
  inputs.acceptanceRows = inputs.acceptanceRows.map((row) => (
    row.finalVerification.split(",").map((value) => value.trim()).includes("P10")
      ? { ...row, state: "合格" }
      : row
  ));
  inputs.compatibility = structuredClone(inputs.compatibility);
  inputs.compatibility.targets = inputs.compatibility.targets.map((target) => {
    const evidence = {
      viewports: ["fixture-viewport"],
      inputModes: ["fixture-input"],
      checks: {
        loaded: true,
        primaryFlow: true,
        pauseResume: true,
        noHorizontalOverflow: true,
        noConsoleErrors: true,
        noMissingResources: true,
        noExternalOrigins: true,
      },
    };
    if (["ios-safari-device", "android-chrome-device"].includes(target.id)) {
      evidence.inputModes = ["touch"];
      evidence.orientations = ["portrait", "landscape"];
      Object.assign(evidence.checks, {
        retryFlow: true,
        multiTouch: true,
        noScrollConflict: true,
        touchTargetsAtLeast44CssPx: true,
        safeAreaVisible: true,
      });
    }
    if (target.id === "physical-low-performance-device") {
      evidence.device = { model: "fixture", cpu: "fixture", gpu: "fixture", memoryMiB: 1024 };
      evidence.performance = {
        durationMs: 300_000,
        targetFps: 60,
        averageFps: 60,
        simulationDroppedRatio: 0,
        inputResponsive: true,
        noLongStall: true,
        progressSpeedStable: true,
        resourceTrendStable: true,
      };
    }
    return {
      ...target,
      status: "pass",
      version: target.version.startsWith("n/a") ? "fixture-version" : target.version,
      notes: "fixture pass evidence",
      evidence,
    };
  });
  inputs.releaseCandidate = { ...inputs.releaseCandidate, status: "accepted", accepted: true };
  inputs.evidenceRegistry = { ...inputs.evidenceRegistry, accepted: true };
  inputs.gate = structuredClone(inputs.gate);
  inputs.gate.acceptance.nonPassingRequirementIds = [];
  inputs.gate.acceptance.nonPassingBrowserTargetIds = [];
  inputs.gate.acceptance.nonPassingRealMobileTargetIds = [];
  inputs.gate.acceptance.physicalLowPerformancePassed = true;
  inputs.gate.decision = {
    allPhase10RequirementsPass: true,
    allRequiredBrowsersPass: true,
    bothRealMobileTargetsPass: true,
    physicalLowPerformancePass: true,
    noCriticalOrMajorDefects: true,
    accepted: true,
    reason: "fixture: every required condition passed",
  };

  const result = auditFinalAcceptance(inputs);
  assert.equal(result.valid, true, result.failures.join("\n"));
  assert.equal(result.nonPassingRequirementIds.length, 0);
  assert.equal(result.nonPassingBrowserTargetIds.length, 0);
  assert.equal(result.physicalLowPerformancePassed, true);
  assert.equal(result.decision.accepted, true);
});
