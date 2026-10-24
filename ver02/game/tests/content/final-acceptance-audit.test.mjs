import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { extractAcceptanceRows } from "../../scripts/acceptance-matrix-audit-lib.mjs";
import { auditFinalAcceptance } from "../../scripts/final-acceptance-audit-lib.mjs";

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
  assert.equal(result.nonPassingRequirementIds.length, 67);
  assert.deepEqual(result.deferredRequirementIds, ["REL-04", "REL-05", "REL-06"]);
  assert.deepEqual(result.nonPassingBrowserTargetIds, [
    "edge-desktop",
    "firefox-desktop",
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
