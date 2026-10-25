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

test("Phase 10 gate rejects evidence outside the release-candidate decision timeline", async () => {
  const inputs = await checkedInInputs();
  inputs.compatibility = structuredClone(inputs.compatibility);
  inputs.evidenceRegistry = structuredClone(inputs.evidenceRegistry);
  inputs.gate = structuredClone(inputs.gate);
  inputs.compatibility.recordedOn = "2026-10-23";
  inputs.evidenceRegistry.recordedOn = "2026-02-30";
  inputs.gate.recordedOn = "2026-10-24";
  const result = auditFinalAcceptance(inputs);
  assert.equal(result.valid, false);
  assert.match(result.failures.join("\n"), /compatibility recordedOn must not predate the release candidate/);
  assert.match(result.failures.join("\n"), /evidence registry recordedOn must be a valid YYYY-MM-DD calendar date/);
});

test("TECH-04: desktop pass requires both product input paths, three viewports, campaign, and RC identity", async () => {
  const inputs = await checkedInInputs();
  const compatibility = structuredClone(inputs.compatibility);
  const target = compatibility.targets.find(({ id }) => id === "safari-desktop");
  Object.assign(target, {
    status: "pass",
    version: "fixture-version",
    notes: "incomplete fixture",
    evidence: {
      viewports: ["1568x956"],
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
    },
  });
  const result = validatePhase10EnvironmentEvidence(compatibility, inputs.releaseCandidate);
  assert.equal(result.valid, false);
  assert.match(result.failures.join("\n"), /four-stage campaign result/);
  assert.match(result.failures.join("\n"), /structured buildIdentity/);
  assert.match(result.failures.join("\n"), /exactly 4 campaign runs/);
  assert.match(result.failures.join("\n"), /pointer-events input evidence/);
  assert.match(result.failures.join("\n"), /390x844 viewport evidence/);
  assert.match(result.failures.join("\n"), /844x390 viewport evidence/);
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
  const result = validatePhase10EnvironmentEvidence(compatibility, inputs.releaseCandidate);
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
  const result = validatePhase10EnvironmentEvidence(compatibility, inputs.releaseCandidate);
  assert.equal(result.valid, false);
  assert.match(result.failures.join("\n"), /device\.model is required/);
  assert.match(result.failures.join("\n"), /performance evidence is required/);
  assert.match(result.failures.join("\n"), /structured buildIdentity/);
});

test("TECH-05: a high-memory development machine cannot substitute for the physical low-performance target", async () => {
  const inputs = await checkedInInputs();
  const compatibility = structuredClone(inputs.compatibility);
  const target = compatibility.targets.find(({ id }) => id === "physical-low-performance-device");
  Object.assign(target, {
    status: "pass",
    version: "26.6.2",
    notes: "high-performance development machine fixture",
    evidence: {
      viewports: ["1568x956"],
      inputModes: ["keyboard"],
      buildIdentity: {
        buildId: inputs.releaseCandidate.buildId,
        sha256: inputs.releaseCandidate.manifest.sha256,
        fileCount: inputs.releaseCandidate.manifest.fileCount,
        totalBytes: inputs.releaseCandidate.manifest.totalBytes,
      },
      device: { model: "MacBook Pro", cpu: "M4 Pro", gpu: "M4 Pro", memoryMiB: 49_152 },
      performance: {
        durationMs: 300_000,
        targetFps: 60,
        averageFps: 120,
        simulationDroppedRatio: 0,
        maximumFrameMs: 16.7,
        maximumInputLatencyMs: 16.7,
        progressDriftRatio: 0,
        heapGrowthBytes: 0,
        resourceCountGrowth: 0,
        failedDeclaredResourceCount: 0,
        domNodeGrowth: 0,
        consoleWarningOrErrorCount: 0,
        externalOrigins: [],
        inputResponsive: true,
        noLongStall: true,
        progressSpeedStable: true,
        resourceTrendStable: true,
      },
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
  const result = validatePhase10EnvironmentEvidence(compatibility, inputs.releaseCandidate);
  assert.equal(result.valid, false);
  assert.match(result.failures.join("\n"), /device\.memoryMiB must be a positive integer no greater than 4096/);
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
      viewports: ["1568x956", "390x844", "844x390"],
      inputModes: ["keyboard", "pointer-events"],
      layout: {
        "1568x956": { horizontalOverflowPx: 0, verticalOverflowPx: 0 },
        "390x844": { horizontalOverflowPx: 0, verticalOverflowPx: 0 },
        "844x390": { horizontalOverflowPx: 0, verticalOverflowPx: 0 },
      },
      consoleWarningOrErrorCount: 0,
      failedDeclaredResourceCount: 0,
      externalOrigins: [],
      campaign: {
        stages: 4,
        runs: 4,
        results: ["fixture run 1", "fixture run 2", "fixture run 3", "fixture run 4"],
        executions: [
          { inputMode: "keyboard", viewport: "1568x956", stages: 4, outcome: "pass", result: "fixture run 1" },
          { inputMode: "pointer-events", viewport: "1568x956", stages: 4, outcome: "pass", result: "fixture run 2" },
          { inputMode: "pointer-events", viewport: "390x844", stages: 4, outcome: "pass", result: "fixture run 3" },
          { inputMode: "pointer-events", viewport: "844x390", stages: 4, outcome: "pass", result: "fixture run 4" },
        ],
      },
      buildIdentity: {
        buildId: inputs.releaseCandidate.buildId,
        sha256: inputs.releaseCandidate.manifest.sha256,
        fileCount: inputs.releaseCandidate.manifest.fileCount,
        totalBytes: inputs.releaseCandidate.manifest.totalBytes,
      },
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
      evidence.layout = {
        portrait: {
          viewportWidthCssPx: 390,
          viewportHeightCssPx: 844,
          horizontalOverflowPx: 0,
          verticalOverflowPx: 0,
        },
        landscape: {
          viewportWidthCssPx: 844,
          viewportHeightCssPx: 390,
          horizontalOverflowPx: 0,
          verticalOverflowPx: 0,
        },
      };
      evidence.interactionMeasurements = {
        maximumSimultaneousTouches: 2,
        scrollConflictCount: 0,
        minimumTouchTargetCssPx: 44,
        safeAreaViolationCount: 0,
      };
      evidence.campaign.runs = 2;
      evidence.campaign.results = ["fixture portrait run", "fixture landscape run"];
      evidence.campaign.executions = [
        { inputMode: "touch", orientation: "portrait", stages: 4, outcome: "pass", result: "fixture portrait run" },
        { inputMode: "touch", orientation: "landscape", stages: 4, outcome: "pass", result: "fixture landscape run" },
      ];
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
        maximumFrameMs: 16.7,
        maximumInputLatencyMs: 16.7,
        progressDriftRatio: 0,
        heapGrowthBytes: 0,
        resourceCountGrowth: 0,
        failedDeclaredResourceCount: 0,
        domNodeGrowth: 0,
        consoleWarningOrErrorCount: 0,
        externalOrigins: [],
        inputResponsive: true,
        noLongStall: true,
        progressSpeedStable: true,
        resourceTrendStable: true,
      };
    }
    return {
      ...target,
      status: "pass",
      version: target.version.startsWith("n/a") ? "26.6.1" : target.version,
      platform: target.id === "ios-safari-device"
        ? "iOS 26.6.1"
        : target.id === "android-chrome-device"
          ? "Android 16"
          : target.platform,
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

test("TECH-04: a build identity containing the RC name cannot substitute for exact manifest identity", async () => {
  const inputs = await checkedInInputs();
  const compatibility = structuredClone(inputs.compatibility);
  const target = compatibility.targets.find(({ id }) => id === "chrome-desktop");
  target.evidence.buildIdentity = {
    buildId: `not-${inputs.releaseCandidate.buildId}`,
    sha256: "0".repeat(64),
    fileCount: inputs.releaseCandidate.manifest.fileCount,
    totalBytes: inputs.releaseCandidate.manifest.totalBytes,
  };
  const result = validatePhase10EnvironmentEvidence(compatibility, inputs.releaseCandidate);
  assert.equal(result.valid, false);
  assert.match(result.failures.join("\n"), /buildIdentity\.buildId must exactly match/);
  assert.match(result.failures.join("\n"), /buildIdentity\.sha256 must exactly match/);
});

test("Phase 10 environment evidence rejects a malformed release-candidate manifest identity", async () => {
  const inputs = await checkedInInputs();
  const releaseCandidate = structuredClone(inputs.releaseCandidate);
  releaseCandidate.manifest = {
    ...releaseCandidate.manifest,
    sha256: "not-a-sha256",
    fileCount: "100",
    totalBytes: 0,
  };
  const compatibility = structuredClone(inputs.compatibility);
  for (const target of compatibility.targets.filter(({ status }) => status === "pass")) {
    target.evidence.buildIdentity = {
      buildId: releaseCandidate.buildId,
      sha256: releaseCandidate.manifest.sha256,
      fileCount: releaseCandidate.manifest.fileCount,
      totalBytes: releaseCandidate.manifest.totalBytes,
    };
  }

  const result = validatePhase10EnvironmentEvidence(compatibility, releaseCandidate);
  assert.equal(result.valid, false);
  const failures = result.failures.join("\n");
  assert.match(failures, /manifest\.sha256 must be a lowercase SHA-256 digest/);
  assert.match(failures, /manifest\.fileCount must be a positive integer/);
  assert.match(failures, /manifest\.totalBytes must be a positive integer/);
});

test("TECH-04: a pass cannot substitute another browser identity or an unobserved version", async () => {
  const inputs = await checkedInInputs();
  const compatibility = structuredClone(inputs.compatibility);
  const target = compatibility.targets.find(({ id }) => id === "chrome-desktop");
  target.browser = "Safari";
  target.version = "fixture-version";
  target.platform = "Android 16";

  const result = validatePhase10EnvironmentEvidence(compatibility, inputs.releaseCandidate);
  assert.equal(result.valid, false);
  assert.match(result.failures.join("\n"), /chrome-desktop: pass requires browser Google Chrome/);
  assert.match(result.failures.join("\n"), /chrome-desktop: pass requires a numeric observed browser version/);
  assert.match(result.failures.join("\n"), /chrome-desktop: pass requires a matching target platform/);
});

test("TECH-04: real mobile pass must match its operating-system target", async () => {
  const inputs = await checkedInInputs();
  const compatibility = structuredClone(inputs.compatibility);
  const source = compatibility.targets.find(({ id }) => id === "chrome-desktop");
  const target = compatibility.targets.find(({ id }) => id === "ios-safari-device");
  Object.assign(target, {
    browser: "Mobile Safari",
    version: "26.6",
    platform: "Android 16",
    environment: "real-device",
    status: "pass",
    notes: "wrong-platform fixture",
    evidence: structuredClone(source.evidence),
  });
  target.evidence.inputModes = ["touch"];
  target.evidence.orientations = ["portrait", "landscape"];
  target.evidence.campaign = {
    stages: 4,
    runs: 2,
    results: ["fixture portrait run", "fixture landscape run"],
    executions: [
      { inputMode: "touch", orientation: "portrait", stages: 4, outcome: "pass", result: "fixture portrait run" },
      { inputMode: "touch", orientation: "landscape", stages: 4, outcome: "pass", result: "fixture landscape run" },
    ],
  };
  target.evidence.layout = {
    portrait: { viewportWidthCssPx: 390, viewportHeightCssPx: 844, horizontalOverflowPx: 0, verticalOverflowPx: 0 },
    landscape: { viewportWidthCssPx: 844, viewportHeightCssPx: 390, horizontalOverflowPx: 0, verticalOverflowPx: 0 },
  };
  target.evidence.interactionMeasurements = {
    maximumSimultaneousTouches: 2,
    scrollConflictCount: 0,
    minimumTouchTargetCssPx: 44,
    safeAreaViolationCount: 0,
  };
  Object.assign(target.evidence.checks, {
    retryFlow: true,
    multiTouch: true,
    noScrollConflict: true,
    touchTargetsAtLeast44CssPx: true,
    safeAreaVisible: true,
  });

  const result = validatePhase10EnvironmentEvidence(compatibility, inputs.releaseCandidate);
  assert.equal(result.valid, false);
  assert.match(result.failures.join("\n"), /ios-safari-device: pass requires a matching target platform/);
});

test("TECH-04: duplicate campaign labels cannot substitute for required desktop execution coverage", async () => {
  const inputs = await checkedInInputs();
  const compatibility = structuredClone(inputs.compatibility);
  const target = compatibility.targets.find(({ id }) => id === "chrome-desktop");
  target.evidence.campaign.executions = target.evidence.campaign.executions.map((execution) => ({
    ...execution,
    inputMode: "pointer-events",
    viewport: "1568x956",
  }));
  const result = validatePhase10EnvironmentEvidence(compatibility, inputs.releaseCandidate);
  assert.equal(result.valid, false);
  assert.match(result.failures.join("\n"), /exactly one keyboard:1568x956 run/);
  assert.match(result.failures.join("\n"), /exactly one pointer-events:390x844 run/);
});

test("TECH-04: an extra arbitrary execution cannot be mixed into the required desktop coverage", async () => {
  const inputs = await checkedInInputs();
  const compatibility = structuredClone(inputs.compatibility);
  const target = compatibility.targets.find(({ id }) => id === "chrome-desktop");
  const extraResult = "1024x768: unrelated extra run";
  target.evidence.campaign.runs += 1;
  target.evidence.campaign.results.push(extraResult);
  target.evidence.campaign.executions.push({
    inputMode: "pointer-events",
    viewport: "1024x768",
    stages: 4,
    outcome: "pass",
    result: extraResult,
  });
  const result = validatePhase10EnvironmentEvidence(compatibility, inputs.releaseCandidate);
  assert.equal(result.valid, false);
  assert.match(result.failures.join("\n"), /exactly 4 campaign runs/);
});

test("TECH-04: structured execution result must match its recorded campaign result", async () => {
  const inputs = await checkedInInputs();
  const compatibility = structuredClone(inputs.compatibility);
  const target = compatibility.targets.find(({ id }) => id === "chrome-desktop");
  target.evidence.campaign.executions[0].result = "different result";
  const result = validatePhase10EnvironmentEvidence(compatibility, inputs.releaseCandidate);
  assert.equal(result.valid, false);
  assert.match(result.failures.join("\n"), /must match campaign\.results\[0\]/);
});

test("TECH-04: every structured campaign execution must explicitly pass", async () => {
  const inputs = await checkedInInputs();
  const compatibility = structuredClone(inputs.compatibility);
  const target = compatibility.targets.find(({ id }) => id === "chrome-desktop");
  target.evidence.campaign.executions[0].outcome = "fail";
  target.evidence.campaign.executions[0].result = target.evidence.campaign.results[0] = "fixture failed run";
  const result = validatePhase10EnvironmentEvidence(compatibility, inputs.releaseCandidate);
  assert.equal(result.valid, false);
  assert.match(result.failures.join("\n"), /executions\[0\]\.outcome must be pass/);
});

test("TECH-04: desktop pass checks must agree with concrete runtime measurements", async () => {
  const inputs = await checkedInInputs();
  const compatibility = structuredClone(inputs.compatibility);
  const target = compatibility.targets.find(({ id }) => id === "chrome-desktop");
  target.evidence.consoleWarningOrErrorCount = 1;
  target.evidence.failedDeclaredResourceCount = 1;
  target.evidence.externalOrigins = ["https://unexpected.example"];
  target.evidence.layout["390x844"].horizontalOverflowPx = 12;
  const result = validatePhase10EnvironmentEvidence(compatibility, inputs.releaseCandidate);
  assert.equal(result.valid, false);
  assert.match(result.failures.join("\n"), /consoleWarningOrErrorCount 0/);
  assert.match(result.failures.join("\n"), /failedDeclaredResourceCount 0/);
  assert.match(result.failures.join("\n"), /empty externalOrigins array/);
  assert.match(result.failures.join("\n"), /390x844 layout must record zero horizontal and vertical overflow/);
});

test("UX-05/06・INP-02〜04: two portrait executions cannot substitute for both mobile orientations", async () => {
  const inputs = await checkedInInputs();
  const compatibility = structuredClone(inputs.compatibility);
  const target = compatibility.targets.find(({ id }) => id === "ios-safari-device");
  Object.assign(target, {
    status: "pass",
    version: "fixture-version",
    notes: "duplicate portrait fixture",
    evidence: {
      viewports: ["390x844", "844x390"],
      inputModes: ["touch"],
      orientations: ["portrait", "landscape"],
      campaign: {
        stages: 4,
        runs: 2,
        results: ["fixture portrait run 1", "fixture portrait run 2"],
        executions: [
          { inputMode: "touch", orientation: "portrait", stages: 4, outcome: "pass", result: "fixture portrait run 1" },
          { inputMode: "touch", orientation: "portrait", stages: 4, outcome: "pass", result: "fixture portrait run 2" },
        ],
      },
      buildIdentity: {
        buildId: inputs.releaseCandidate.buildId,
        sha256: inputs.releaseCandidate.manifest.sha256,
        fileCount: inputs.releaseCandidate.manifest.fileCount,
        totalBytes: inputs.releaseCandidate.manifest.totalBytes,
      },
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
  const result = validatePhase10EnvironmentEvidence(compatibility, inputs.releaseCandidate);
  assert.equal(result.valid, false);
  assert.match(result.failures.join("\n"), /exactly one touch:landscape run/);
});

test("UX-05/06・INP-02〜04: mobile pass checks must agree with concrete runtime measurements", async () => {
  const inputs = await checkedInInputs();
  const compatibility = structuredClone(inputs.compatibility);
  const target = compatibility.targets.find(({ id }) => id === "ios-safari-device");
  Object.assign(target, {
    status: "pass",
    version: "fixture-version",
    notes: "contradictory runtime measurements fixture",
    evidence: {
      viewports: ["390x844", "844x390"],
      inputModes: ["touch"],
      orientations: ["portrait", "landscape"],
      consoleWarningOrErrorCount: 1,
      failedDeclaredResourceCount: 1,
      externalOrigins: ["https://unexpected.example"],
      layout: {
        portrait: {
          viewportWidthCssPx: 844,
          viewportHeightCssPx: 390,
          horizontalOverflowPx: 12,
          verticalOverflowPx: 0,
        },
        landscape: {
          viewportWidthCssPx: 390,
          viewportHeightCssPx: 844,
          horizontalOverflowPx: 0,
          verticalOverflowPx: 8,
        },
      },
      interactionMeasurements: {
        maximumSimultaneousTouches: 1,
        scrollConflictCount: 1,
        minimumTouchTargetCssPx: 43,
        safeAreaViolationCount: 1,
      },
      campaign: {
        stages: 4,
        runs: 2,
        results: ["fixture portrait run", "fixture landscape run"],
        executions: [
          { inputMode: "touch", orientation: "portrait", stages: 4, outcome: "pass", result: "fixture portrait run" },
          { inputMode: "touch", orientation: "landscape", stages: 4, outcome: "pass", result: "fixture landscape run" },
        ],
      },
      buildIdentity: {
        buildId: inputs.releaseCandidate.buildId,
        sha256: inputs.releaseCandidate.manifest.sha256,
        fileCount: inputs.releaseCandidate.manifest.fileCount,
        totalBytes: inputs.releaseCandidate.manifest.totalBytes,
      },
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
  const result = validatePhase10EnvironmentEvidence(compatibility, inputs.releaseCandidate);
  assert.equal(result.valid, false);
  const failures = result.failures.join("\n");
  assert.match(failures, /consoleWarningOrErrorCount 0/);
  assert.match(failures, /failedDeclaredResourceCount 0/);
  assert.match(failures, /empty externalOrigins array/);
  assert.match(failures, /portrait layout dimensions must match the orientation/);
  assert.match(failures, /landscape layout must record zero horizontal and vertical overflow/);
  assert.match(failures, /maximumSimultaneousTouches must be at least 2/);
  assert.match(failures, /scrollConflictCount must be 0/);
  assert.match(failures, /minimumTouchTargetCssPx must be at least 44/);
  assert.match(failures, /safeAreaViolationCount must be 0/);
});

test("UX-05/06・INP-02〜04: an extra mobile execution cannot obscure the two required orientations", async () => {
  const inputs = await checkedInInputs();
  const compatibility = structuredClone(inputs.compatibility);
  const target = compatibility.targets.find(({ id }) => id === "ios-safari-device");
  const results = ["fixture portrait run", "fixture landscape run", "fixture extra run"];
  Object.assign(target, {
    status: "pass",
    version: "fixture-version",
    notes: "extra execution fixture",
    evidence: {
      viewports: ["390x844", "844x390"],
      inputModes: ["touch"],
      orientations: ["portrait", "landscape"],
      campaign: {
        stages: 4,
        runs: 3,
        results,
        executions: [
          { inputMode: "touch", orientation: "portrait", stages: 4, outcome: "pass", result: results[0] },
          { inputMode: "touch", orientation: "landscape", stages: 4, outcome: "pass", result: results[1] },
          { inputMode: "touch", orientation: "square", stages: 4, outcome: "pass", result: results[2] },
        ],
      },
      buildIdentity: {
        buildId: inputs.releaseCandidate.buildId,
        sha256: inputs.releaseCandidate.manifest.sha256,
        fileCount: inputs.releaseCandidate.manifest.fileCount,
        totalBytes: inputs.releaseCandidate.manifest.totalBytes,
      },
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
  const result = validatePhase10EnvironmentEvidence(compatibility, inputs.releaseCandidate);
  assert.equal(result.valid, false);
  assert.match(result.failures.join("\n"), /exactly 2 campaign runs/);
});

test("TECH-05: physical low-performance pass checks must agree with concrete runtime measurements", async () => {
  const inputs = await checkedInInputs();
  const compatibility = structuredClone(inputs.compatibility);
  const target = compatibility.targets.find(({ id }) => id === "physical-low-performance-device");
  Object.assign(target, {
    status: "pass",
    version: "fixture-version",
    notes: "contradictory physical performance measurements fixture",
    evidence: {
      viewports: ["390x844"],
      inputModes: ["touch"],
      buildIdentity: {
        buildId: inputs.releaseCandidate.buildId,
        sha256: inputs.releaseCandidate.manifest.sha256,
        fileCount: inputs.releaseCandidate.manifest.fileCount,
        totalBytes: inputs.releaseCandidate.manifest.totalBytes,
      },
      device: { model: "fixture", cpu: "fixture", gpu: "fixture", memoryMiB: 1024 },
      performance: {
        durationMs: 300_000,
        targetFps: 60,
        averageFps: 60,
        simulationDroppedRatio: 0,
        maximumFrameMs: 1_001,
        maximumInputLatencyMs: 101,
        progressDriftRatio: 0.02,
        heapGrowthBytes: 16 * 1024 * 1024 + 1,
        resourceCountGrowth: 1,
        failedDeclaredResourceCount: 1,
        domNodeGrowth: 1,
        consoleWarningOrErrorCount: 1,
        externalOrigins: ["https://unexpected.example"],
        inputResponsive: true,
        noLongStall: true,
        progressSpeedStable: true,
        resourceTrendStable: true,
      },
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
  const result = validatePhase10EnvironmentEvidence(compatibility, inputs.releaseCandidate);
  assert.equal(result.valid, false);
  const failures = result.failures.join("\n");
  assert.match(failures, /maximumFrameMs must be between 0 and 1000/);
  assert.match(failures, /maximumInputLatencyMs must be between 0 and 100/);
  assert.match(failures, /progressDriftRatio must be between 0 and 0\.01/);
  assert.match(failures, /heapGrowthBytes must not exceed 16777216/);
  assert.match(failures, /resourceCountGrowth must be 0/);
  assert.match(failures, /failedDeclaredResourceCount must be 0/);
  assert.match(failures, /domNodeGrowth must be 0/);
  assert.match(failures, /consoleWarningOrErrorCount must be 0/);
  assert.match(failures, /externalOrigins must be an empty array/);
});
